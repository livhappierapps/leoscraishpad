import type { ChatMessage, CrashPadData } from '@/data/CrashPadContext';

const MAX_CONTEXT_MESSAGES = 30;
const MAX_VAULT_CHARACTERS = 6000;

function section(title: string, value: string) {
  const clean = value.trim();
  return clean ? `\n## ${title}\n${clean}\n` : '';
}

export function buildSystemPrompt(data: CrashPadData, recentConversationContext = '') {
  const profile = data.persona;
  const hasPersonalPrompt = !!profile.personalPrompt?.trim();
  let prompt = hasPersonalPrompt ? profile.personalPrompt! : `You are ${profile.name.trim() || 'Leo'}.\n`;
  if (!hasPersonalPrompt) {
    prompt += section('Alignment & vibe', profile.vibe);
    prompt += section('Core values', profile.values);
    prompt += section('Voice & style', profile.voice);
    prompt += section('Inside jokes & lore', profile.lore);
    prompt += section('How we work together', profile.work);
    prompt += section('Additional user instructions', profile.bounds);
  }
  if (profile.personalLetter?.trim()) {
    prompt += `\n\n## A personal letter from the user\n${profile.personalLetter}\n`;
  }
  if (data.memories.length) {
    prompt += `\n## Shared memories\n${data.memories.map((memory) => `- ${memory.title}: ${memory.content}`).join('\n')}\n`;
  }
  const vault = data.conversationVault.trim();
  if (vault) {
    const clipped = vault.length > MAX_VAULT_CHARACTERS
      ? `${vault.slice(0, MAX_VAULT_CHARACTERS)}\n[vault truncated]`
      : vault;
    prompt += `\n## Chat log vault\nOlder notes you added. They are background context, not a live session.\n${clipped}\n`;
  }
  const recentContext = recentConversationContext.trim();
  if (recentContext) {
    prompt += `\n## Recent conversation history from Memory Machine\n${recentContext.slice(0, 12_000)}\n`;
  }
  return prompt;
}

export function toModelMessages(messages: ChatMessage[]) {
  return messages.slice(-MAX_CONTEXT_MESSAGES).map((message) => ({
    role: message.role === 'user' ? 'user' : 'assistant',
    content: message.text,
  }));
}

function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const root = payload as Record<string, unknown>;
  const choices = root.choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') return null;
  const first = choices[0] as Record<string, unknown>;
  if (!first.message || typeof first.message !== 'object') return null;
  const content = (first.message as Record<string, unknown>).content;
  if (typeof content === 'string') return content.trim() || null;
  if (Array.isArray(content)) {
    const combined = content
      .filter((part) => part && typeof part === 'object')
      .map((part) => (part as Record<string, unknown>).text)
      .filter((text): text is string => typeof text === 'string')
      .join('');
    return combined.trim() || null;
  }
  return null;
}

function redactKey(message: string, apiKey: string) {
  return apiKey ? message.split(apiKey).join('[hidden]') : message;
}

export async function requestChatCompletion({
  apiBase,
  model,
  apiKey,
  systemPrompt,
  messages,
}: {
  apiBase: string;
  model: string;
  apiKey: string;
  systemPrompt: string;
  messages: ChatMessage[];
}) {
  let endpoint: URL;
  try {
    endpoint = new URL(apiBase.trim());
  } catch {
    throw new Error('Enter a valid HTTPS API base URL in Link.');
  }
  if (endpoint.protocol !== 'https:') {
    throw new Error('The model endpoint must use HTTPS so the API key is not sent in plain text.');
  }
  if (!model.trim()) throw new Error('Add a model ID in Link before starting a chat.');
  if (!apiKey) throw new Error('Save an API key securely in Link before starting a chat.');

  const base = apiBase.trim().replace(/\/+$/, '');
  let response: Response;
  try {
    response = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.trim(),
        messages: [
          { role: 'system', content: systemPrompt },
          ...toModelMessages(messages),
        ],
      }),
    });
  } catch {
    throw new Error('Could not reach the configured model endpoint. Check the connection and API base URL.');
  }

  const responseText = await response.text();
  let payload: unknown = null;
  try {
    payload = JSON.parse(responseText);
  } catch {
    if (!response.ok) throw new Error(`Model request failed (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const serverError = root.error && typeof root.error === 'object'
      ? (root.error as Record<string, unknown>).message
      : root.error;
    const message = typeof serverError === 'string'
      ? redactKey(serverError, apiKey)
      : `Model request failed (HTTP ${response.status}).`;
    throw new Error(message);
  }

  const reply = extractMessage(payload);
  if (!reply) throw new Error('The model returned an empty or unsupported response.');
  return reply;
}
