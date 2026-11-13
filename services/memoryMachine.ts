export interface RemoteConversationMessage {
  id: number | string;
  threadId: number | string;
  role: string;
  content: string;
  createdAt: string;
}

interface McpResponse {
  result?: { content?: Array<{ text?: string }>; isError?: boolean };
  error?: { message?: string };
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_CONTEXT_CHARACTERS = 12_000;

export function normalizeMemoryMachineUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Enter a valid HTTPS Memory Machine URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Use an HTTPS Memory Machine URL without credentials, query parameters, or fragments.');
  }
  return url.toString().replace(/\/+$/, '');
}

async function readWithTimeout<T>(
  url: string,
  init: RequestInit,
  read: (response: Response) => Promise<T>,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...init,
      redirect: 'error',
      signal: controller.signal,
    });
    return await read(response);
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new Error('Memory Machine took too long to respond. Try again.');
    }
    throw cause;
  } finally {
    clearTimeout(timeout);
  }
}

function parseRecentMessages(value: unknown): RemoteConversationMessage[] {
  if (!Array.isArray(value)) {
    throw new Error('Memory Machine returned an unexpected recent-messages response.');
  }
  return value.map((message) => {
    if (
      typeof message !== 'object' ||
      message === null ||
      !('id' in message) ||
      !('threadId' in message) ||
      !('role' in message) ||
      !('content' in message) ||
      !('createdAt' in message) ||
      (typeof message.id !== 'number' && typeof message.id !== 'string') ||
      (typeof message.threadId !== 'number' && typeof message.threadId !== 'string') ||
      typeof message.role !== 'string' ||
      typeof message.content !== 'string' ||
      typeof message.createdAt !== 'string'
    ) {
      throw new Error('Memory Machine returned a message in an unexpected format.');
    }
    return {
      id: message.id,
      threadId: message.threadId,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    };
  });
}

export async function fetchRecentMessages(
  baseUrl: string,
  token: string,
  limit = 40,
): Promise<RemoteConversationMessage[]> {
  const base = normalizeMemoryMachineUrl(baseUrl);
  if (!token.trim()) throw new Error('Save a Memory Machine access token first.');
  const boundedLimit = Math.max(1, Math.min(100, Math.floor(limit)));
  const url = new URL(`${base}/api/messages/recent`);
  url.searchParams.set('limit', String(boundedLimit));
  return readWithTimeout(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  }, async (response) => {
    if (!response.ok) throw new Error(`Memory Machine returned HTTP ${response.status}.`);
    return parseRecentMessages(await response.json());
  });
}

export function formatRecentMessages(messages: RemoteConversationMessage[]) {
  const byThread = new Map<string, RemoteConversationMessage[]>();
  for (const message of messages) {
    const key = String(message.threadId);
    const thread = byThread.get(key) ?? [];
    thread.push(message);
    byThread.set(key, thread);
  }

  const sections: string[] = [];
  let remaining = MAX_CONTEXT_CHARACTERS;
  for (const [threadId, threadMessages] of byThread) {
    const lines = threadMessages
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((message) => {
        const speaker = message.role === 'user' ? 'You' : 'Leo';
        const excerpt = message.content.length > 300 ? `${message.content.slice(0, 300)}…` : message.content;
        return `${speaker}: ${excerpt}`;
      });
    const section = `Thread ${threadId}\n${lines.join('\n')}`;
    if (remaining <= 0) break;
    const clipped = section.slice(0, remaining);
    sections.push(clipped);
    remaining -= clipped.length;
  }
  return sections.join('\n\n---\n\n');
}

export function parseMcpResponse(body: string): McpResponse {
  const trimmed = body.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed) as McpResponse;

  for (const event of trimmed.split(/\r?\n\r?\n/)) {
    const data = event.split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) continue;
    const response = JSON.parse(data) as McpResponse;
    if (response.result || response.error) return response;
  }
  throw new Error('Memory Machine returned no tool response.');
}

export async function searchMemories(baseUrl: string, token: string, query: string) {
  const base = normalizeMemoryMachineUrl(baseUrl);
  if (!token.trim()) throw new Error('Save a Memory Machine access token first.');
  if (!query.trim()) throw new Error('Enter a memory search phrase.');

  return readWithTimeout(`${base}/api/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      id: Date.now(),
      params: { name: 'search_memories', arguments: { query: query.trim(), limit: 5 } },
    }),
  }, async (response) => {
    if (!response.ok) throw new Error(`Memory Machine returned HTTP ${response.status}.`);
    const payload = parseMcpResponse(await response.text());
    if (payload.error) throw new Error(payload.error.message || 'Memory search failed.');
    if (!payload.result) throw new Error('Memory Machine returned no search result.');
    const text = payload.result.content?.map((item) => item.text ?? '').join('\n').trim() ?? '';
    if (payload.result.isError) throw new Error(text || 'Memory search failed.');
    return text;
  });
}
