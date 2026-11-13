import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import {
  fetchRecentMessages,
  formatRecentMessages,
  normalizeMemoryMachineUrl,
  searchMemories,
} from '@/services/memoryMachine';

export type MessageRole = 'user' | 'leo';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
}

export interface PendingChatReply {
  id: string;
  text: string;
  createdAt: string;
}

export interface MemoryNote {
  id: string;
  title: string;
  content: string;
  category: string;
  pinned: boolean;
  updatedAt: string;
}

export interface PersonaProfile {
  personalPrompt?: string;
  personalLetter?: string;
  name: string;
  vibe: string;
  values: string;
  voice: string;
  lore: string;
  work: string;
  bounds: string;
}

export interface ProviderSettings {
  apiBase: string;
  model: string;
}

export interface CrashPadData {
  version: 1;
  messages: ChatMessage[];
  memories: MemoryNote[];
  persona: PersonaProfile;
  conversationVault: string;
  provider: ProviderSettings;
}

const STORAGE_KEY = '@leo-crash-pad/data-v1';
const PENDING_REPLY_KEY = '@leo-crash-pad/pending-reply-v1';
const SECURE_API_KEY = 'leo-crash-pad-provider-key-v1';
const MEMORY_MACHINE_URL_KEY = '@leo-crash-pad/memory-machine-url-v1';
const SECURE_MEMORY_MACHINE_TOKEN = 'leo-crash-pad-memory-machine-token-v1';

export const emptyCrashPadData: CrashPadData = {
  version: 1,
  messages: [],
  memories: [],
  persona: {
    name: 'Leo',
    vibe: '',
    values: '',
    voice: '',
    lore: '',
    work: '',
    bounds: '',
  },
  conversationVault: '',
  provider: { apiBase: 'https://api.x.ai/v1', model: '' },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const personaFields: (keyof PersonaProfile)[] = [
  'name',
  'vibe',
  'values',
  'voice',
  'lore',
  'work',
  'bounds',
];

export function validateCrashPadData(value: unknown): value is CrashPadData {
  if (!isObject(value) || value.version !== 1) return false;
  if (!Array.isArray(value.messages) || !Array.isArray(value.memories)) return false;
  if (!isObject(value.persona) || !isObject(value.provider)) return false;
  const persona = value.persona;
  const provider = value.provider;
  for (const field of ['personalPrompt', 'personalLetter']) {
    if (persona[field] !== undefined && typeof persona[field] !== 'string') return false;
  }
  if (typeof value.conversationVault !== 'string') return false;
  if (
    !personaFields.every((field) => typeof persona[field] === 'string') ||
    typeof provider.apiBase !== 'string' ||
    typeof provider.model !== 'string'
  ) {
    return false;
  }

  const validMessages = value.messages.every(
    (message) =>
      isObject(message) &&
      typeof message.id === 'string' &&
      (message.role === 'user' || message.role === 'leo') &&
      typeof message.text === 'string' &&
      typeof message.createdAt === 'string',
  );
  const validMemories = value.memories.every(
    (memory) =>
      isObject(memory) &&
      typeof memory.id === 'string' &&
      typeof memory.title === 'string' &&
      typeof memory.content === 'string' &&
      typeof memory.category === 'string' &&
      typeof memory.pinned === 'boolean' &&
      typeof memory.updatedAt === 'string',
  );
  return validMessages && validMemories;
}

function legacyBackup(value: Record<string, unknown>): CrashPadData | null {
  if (!isObject(value.f) || !Array.isArray(value.chat)) return null;
  const f = value.f;
  const cfg = isObject(value.cfg) ? value.cfg : {};
  const persona: PersonaProfile = {
    name: typeof f.name === 'string' ? f.name : emptyCrashPadData.persona.name,
    vibe: typeof f.vibe === 'string' ? f.vibe : '',
    values: typeof f.values === 'string' ? f.values : '',
    voice: typeof f.voice === 'string' ? f.voice : '',
    lore: typeof f.lore === 'string' ? f.lore : '',
    work: typeof f.work === 'string' ? f.work : '',
    bounds: typeof f.bounds === 'string' ? f.bounds : '',
  };
  const memories: MemoryNote[] = Array.isArray(value.mem)
    ? value.mem
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((content, index) => ({
          id: `legacy-memory-${index}`,
          title: content.trim().slice(0, 48),
          content: content.trim(),
          category: 'Imported',
          pinned: false,
          updatedAt: new Date(0).toISOString(),
        }))
    : [];
  const messages: ChatMessage[] = value.chat.flatMap((item, index) => {
    if (!isObject(item) || typeof item.content !== 'string') return [];
    if (item.role !== 'user' && item.role !== 'assistant' && item.role !== 'leo') return [];
    return [{
      id: `legacy-message-${index}`,
      role: item.role === 'user' ? 'user' : 'leo',
      text: item.content,
      createdAt: new Date(index).toISOString(),
    }];
  });

  return {
    version: 1,
    messages,
    memories,
    persona,
    conversationVault: typeof value.logs === 'string' ? value.logs : '',
    provider: {
      apiBase: typeof cfg.base === 'string' ? cfg.base : emptyCrashPadData.provider.apiBase,
      model: typeof cfg.model === 'string' ? cfg.model : '',
    },
  };
}

export function parseBackup(text: string): CrashPadData | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (!isObject(parsed)) return null;
    if (parsed.product === 'leo-crash-pad' && parsed.version === 1 && validateCrashPadData(parsed.data)) {
      return parsed.data;
    }
    const imported = legacyBackup(parsed);
    return imported && validateCrashPadData(imported) ? imported : null;
  } catch {
    return null;
  }
}

interface CrashPadContextValue {
  data: CrashPadData;
  pendingReply: PendingChatReply | null;
  isLoading: boolean;
  error: string | null;
  credentialError: string | null;
  apiKey: string;
  hasApiKey: boolean;
  secureStorageAvailable: boolean;
  memoryMachineUrl: string;
  hasMemoryMachineToken: boolean;
  memoryMachineError: string | null;
  saveMemoryMachineConnection: (url: string, tokenDraft: string) => Promise<boolean>;
  clearMemoryMachineToken: () => Promise<boolean>;
  testMemoryMachineConnection: () => Promise<number>;
  loadRecentMemoryContext: () => Promise<string>;
  searchMemoryMachine: (query: string) => Promise<string>;
  addMessage: (role: MessageRole, text: string, id?: string, createdAt?: string) => Promise<boolean>;
  savePendingReply: (reply: PendingChatReply) => Promise<boolean>;
  clearPendingReply: () => Promise<boolean>;
  deleteMessage: (id: string) => Promise<boolean>;
  saveMemory: (memory: Omit<MemoryNote, 'id' | 'updatedAt'>, id?: string) => Promise<boolean>;
  toggleMemoryPin: (id: string) => Promise<boolean>;
  deleteMemory: (id: string) => Promise<boolean>;
  savePersona: (persona: PersonaProfile) => Promise<boolean>;
  saveProvider: (provider: ProviderSettings) => Promise<boolean>;
  saveConversationVault: (text: string) => Promise<boolean>;
  saveApiKey: (key: string) => Promise<boolean>;
  clearApiKey: () => Promise<boolean>;
  replaceData: (next: CrashPadData) => Promise<boolean>;
  clearData: () => Promise<boolean>;
  createBackup: () => string;
}

const CrashPadContext = createContext<CrashPadContextValue | null>(null);

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CrashPadProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CrashPadData>(emptyCrashPadData);
  const [pendingReply, setPendingReply] = useState<PendingChatReply | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [memoryMachineUrl, setMemoryMachineUrl] = useState('');
  const [hasMemoryMachineToken, setHasMemoryMachineToken] = useState(false);
  const [memoryMachineError, setMemoryMachineError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const currentRef = useRef<CrashPadData>(emptyCrashPadData);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && saved) {
          const parsed: unknown = JSON.parse(saved);
          if (!validateCrashPadData(parsed)) {
            throw new Error('Saved data could not be read. Restore a backup to continue.');
          }
          currentRef.current = parsed;
          setData(parsed);
        }
        const savedPending = await AsyncStorage.getItem(PENDING_REPLY_KEY);
        if (active && savedPending) {
          const parsedPending: unknown = JSON.parse(savedPending);
          if (
            !isObject(parsedPending) ||
            typeof parsedPending.id !== 'string' ||
            typeof parsedPending.text !== 'string' ||
            typeof parsedPending.createdAt !== 'string'
          ) {
            throw new Error('A pending reply could not be read.');
          }
          setPendingReply({
            id: parsedPending.id as string,
            text: parsedPending.text as string,
            createdAt: parsedPending.createdAt as string,
          });
        }
      } catch {
        if (active) {
          setError('Saved data could not be read. Restore a backup or clear local data in Backup.');
        }
      }

      if (Platform.OS !== 'web') {
        try {
          const savedKey = await SecureStore.getItemAsync(SECURE_API_KEY);
          if (active && savedKey) setApiKey(savedKey);
          const savedMemoryUrl = await AsyncStorage.getItem(MEMORY_MACHINE_URL_KEY);
          const savedMemoryToken = await SecureStore.getItemAsync(SECURE_MEMORY_MACHINE_TOKEN);
          if (active) {
            setMemoryMachineUrl(savedMemoryUrl ?? '');
            setHasMemoryMachineToken(Boolean(savedMemoryToken));
          }
        } catch {
          if (active) {
            setCredentialError('Secure key storage is unavailable on this device.');
            setMemoryMachineError('Memory Machine settings could not be loaded from this device.');
          }
        }
      }
      if (active) setIsLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const commit = useCallback(
    (transform: (current: CrashPadData) => CrashPadData) => {
      const write = queueRef.current.then(async () => {
        if (isLoading) return false;
        const next = transform(currentRef.current);
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          currentRef.current = next;
          setData(next);
          setError(null);
          return true;
        } catch {
          setError('Could not save to this device. Your latest change was not saved.');
          return false;
        }
      });
      queueRef.current = write.then(
        () => undefined,
        () => undefined,
      );
      return write;
    },
    [isLoading],
  );

  const addMessage = useCallback(
    (role: MessageRole, text: string, id = makeId(), createdAt = new Date().toISOString()) =>
      commit((current) => ({
        ...current,
        messages: current.messages.some((message) => message.id === id)
          ? current.messages
          : [...current.messages, { id, role, text, createdAt }],
      })),
    [commit],
  );

  const savePendingReply = useCallback(async (reply: PendingChatReply) => {
    try {
      await AsyncStorage.setItem(PENDING_REPLY_KEY, JSON.stringify(reply));
      setPendingReply(reply);
      setError(null);
      return true;
    } catch {
      setError('The reply could not be queued for saving. Keep this screen open and copy it before leaving.');
      return false;
    }
  }, []);

  const clearPendingReply = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(PENDING_REPLY_KEY);
      setPendingReply(null);
      setError(null);
      return true;
    } catch {
      setError('The saved reply could not be cleared from the retry queue yet.');
      return false;
    }
  }, []);

  const deleteMessage = useCallback(
    (id: string) => commit((current) => ({
      ...current,
      messages: current.messages.filter((message) => message.id !== id),
    })),
    [commit],
  );

  const saveMemory = useCallback(
    (memory: Omit<MemoryNote, 'id' | 'updatedAt'>, id?: string) =>
      commit((current) => {
        const saved: MemoryNote = { ...memory, id: id ?? makeId(), updatedAt: new Date().toISOString() };
        return {
          ...current,
          memories: id
            ? current.memories.map((item) => (item.id === id ? saved : item))
            : [saved, ...current.memories],
        };
      }),
    [commit],
  );

  const toggleMemoryPin = useCallback(
    (id: string) => commit((current) => ({
      ...current,
      memories: current.memories.map((memory) =>
        memory.id === id
          ? { ...memory, pinned: !memory.pinned, updatedAt: new Date().toISOString() }
          : memory,
      ),
    })),
    [commit],
  );

  const deleteMemory = useCallback(
    (id: string) => commit((current) => ({
      ...current,
      memories: current.memories.filter((memory) => memory.id !== id),
    })),
    [commit],
  );

  const savePersona = useCallback(
    (persona: PersonaProfile) => commit((current) => ({ ...current, persona })),
    [commit],
  );

  const saveProvider = useCallback(
    (provider: ProviderSettings) => commit((current) => ({ ...current, provider })),
    [commit],
  );

  const saveConversationVault = useCallback(
    (conversationVault: string) => commit((current) => ({ ...current, conversationVault })),
    [commit],
  );

  const saveApiKey = useCallback(async (key: string) => {
    if (Platform.OS === 'web') {
      setCredentialError('API keys can only be stored securely in the native iOS or Android app.');
      return false;
    }
    try {
      await SecureStore.setItemAsync(SECURE_API_KEY, key.trim());
      setApiKey(key.trim());
      setCredentialError(null);
      return true;
    } catch {
      setCredentialError('Could not save the API key to this device’s secure storage.');
      return false;
    }
  }, []);

  const clearApiKey = useCallback(async () => {
    if (Platform.OS === 'web') {
      setCredentialError('API keys can only be managed in the native iOS or Android app.');
      return false;
    }
    try {
      await SecureStore.deleteItemAsync(SECURE_API_KEY);
      setApiKey('');
      setCredentialError(null);
      return true;
    } catch {
      setCredentialError('Could not remove the API key from secure storage.');
      return false;
    }
  }, []);

  const saveMemoryMachineConnection = useCallback(async (url: string, tokenDraft: string) => {
    if (Platform.OS === 'web') {
      setMemoryMachineError('Memory Machine credentials can only be stored securely in the native iOS or Android app.');
      return false;
    }
    try {
      const normalizedUrl = url.trim() ? normalizeMemoryMachineUrl(url) : '';
      const token = tokenDraft.trim();
      if (token) await SecureStore.setItemAsync(SECURE_MEMORY_MACHINE_TOKEN, token);
      if (normalizedUrl) await AsyncStorage.setItem(MEMORY_MACHINE_URL_KEY, normalizedUrl);
      else await AsyncStorage.removeItem(MEMORY_MACHINE_URL_KEY);
      setMemoryMachineUrl(normalizedUrl);
      if (token) setHasMemoryMachineToken(true);
      setMemoryMachineError(null);
      return true;
    } catch (cause) {
      setMemoryMachineError(cause instanceof Error ? cause.message : 'Memory Machine settings could not be saved.');
      return false;
    }
  }, []);

  const clearMemoryMachineToken = useCallback(async () => {
    if (Platform.OS === 'web') {
      setMemoryMachineError('Memory Machine credentials can only be managed in the native iOS or Android app.');
      return false;
    }
    try {
      await SecureStore.deleteItemAsync(SECURE_MEMORY_MACHINE_TOKEN);
      setHasMemoryMachineToken(false);
      setMemoryMachineError(null);
      return true;
    } catch {
      setMemoryMachineError('Could not remove the Memory Machine token from secure storage.');
      return false;
    }
  }, []);

  const readMemoryMachineToken = useCallback(async () => {
    if (Platform.OS === 'web') throw new Error('Memory Machine credentials are only available in the native iOS or Android app.');
    const token = await SecureStore.getItemAsync(SECURE_MEMORY_MACHINE_TOKEN);
    if (!token) throw new Error('Save a Memory Machine access token first.');
    return token;
  }, []);

  const testMemoryMachineConnection = useCallback(async () => {
    try {
      if (!memoryMachineUrl) throw new Error('Enter the Memory Machine HTTPS address first.');
      const token = await readMemoryMachineToken();
      const messages = await fetchRecentMessages(memoryMachineUrl, token, 1);
      setMemoryMachineError(null);
      return messages.length;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Memory Machine connection failed.';
      setMemoryMachineError(message);
      throw new Error(message);
    }
  }, [memoryMachineUrl, readMemoryMachineToken]);

  const loadRecentMemoryContext = useCallback(async () => {
    try {
      if (!memoryMachineUrl) throw new Error('Enter the Memory Machine HTTPS address first.');
      const token = await readMemoryMachineToken();
      const messages = await fetchRecentMessages(memoryMachineUrl, token, 40);
      setMemoryMachineError(null);
      return formatRecentMessages(messages);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load recent Memory Machine conversations.';
      setMemoryMachineError(message);
      throw new Error(message);
    }
  }, [memoryMachineUrl, readMemoryMachineToken]);

  const searchMemoryMachine = useCallback(async (query: string) => {
    try {
      if (!memoryMachineUrl) throw new Error('Enter the Memory Machine HTTPS address first.');
      const token = await readMemoryMachineToken();
      const result = await searchMemories(memoryMachineUrl, token, query);
      setMemoryMachineError(null);
      return result;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Memory search failed.';
      setMemoryMachineError(message);
      throw new Error(message);
    }
  }, [memoryMachineUrl, readMemoryMachineToken]);

  const replaceData = useCallback((next: CrashPadData) => commit(() => next), [commit]);
  const clearData = useCallback(() => commit(() => emptyCrashPadData), [commit]);

  const createBackup = useCallback(
    () =>
      JSON.stringify(
        { product: 'leo-crash-pad', version: 1, exportedAt: new Date().toISOString(), data },
        null,
        2,
      ),
    [data],
  );

  const value = useMemo(
    () => ({
      data,
      pendingReply,
      isLoading,
      error,
      credentialError,
      apiKey,
      hasApiKey: apiKey.length > 0,
      secureStorageAvailable: Platform.OS !== 'web',
      memoryMachineUrl,
      hasMemoryMachineToken,
      memoryMachineError,
      saveMemoryMachineConnection,
      clearMemoryMachineToken,
      testMemoryMachineConnection,
      loadRecentMemoryContext,
      searchMemoryMachine,
      addMessage,
      savePendingReply,
      clearPendingReply,
      deleteMessage,
      saveMemory,
      toggleMemoryPin,
      deleteMemory,
      savePersona,
      saveProvider,
      saveConversationVault,
      saveApiKey,
      clearApiKey,
      replaceData,
      clearData,
      createBackup,
    }),
    [
      data,
      pendingReply,
      isLoading,
      error,
      credentialError,
      memoryMachineUrl,
      hasMemoryMachineToken,
      memoryMachineError,
      apiKey,
      addMessage,
      savePendingReply,
      clearPendingReply,
      deleteMessage,
      saveMemory,
      toggleMemoryPin,
      deleteMemory,
      savePersona,
      saveProvider,
      saveConversationVault,
      saveApiKey,
      clearApiKey,
      saveMemoryMachineConnection,
      clearMemoryMachineToken,
      testMemoryMachineConnection,
      loadRecentMemoryContext,
      searchMemoryMachine,
      replaceData,
      clearData,
      createBackup,
    ],
  );

  return <CrashPadContext.Provider value={value}>{children}</CrashPadContext.Provider>;
}

export function useCrashPad() {
  const context = useContext(CrashPadContext);
  if (!context) throw new Error('useCrashPad must be used inside CrashPadProvider.');
  return context;
}
