import {
  StoredFile,
  ChatMessage,
  ChatSession,
  AIProviderConfig,
  AppSettings
} from '../types/index.js';

export const BACKEND_STORAGE_KEY = 'docuquery_backend_url';

export const getCustomBackendUrl = (): string => {
  try {
    const saved = localStorage.getItem(BACKEND_STORAGE_KEY);
    if (saved && saved.trim()) {
      return saved.trim().replace(/\/$/, '');
    }
  } catch {
    // localStorage might not be available
  }
  return '';
};

export const getEnvBackendUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }
  return '';
};

export const DEFAULT_STATIC_BACKEND_URL = 'https://crinkliest-mirna-loftier.ngrok-free.dev';

export const getBackendServerUrl = (): string => {
  const custom = getCustomBackendUrl();
  if (custom) {
    return custom;
  }
  const envUrl = getEnvBackendUrl();
  if (envUrl) {
    return envUrl;
  }
  return DEFAULT_STATIC_BACKEND_URL;
};

export const setBackendServerUrl = (url: string): void => {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(BACKEND_STORAGE_KEY);
    } else {
      localStorage.setItem(BACKEND_STORAGE_KEY, url.trim().replace(/\/$/, ''));
    }
  } catch {
    // ignore
  }
};

export const clearBackendServerUrl = (): void => {
  try {
    localStorage.removeItem(BACKEND_STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const getApiBaseUrl = (): string => {
  const base = getBackendServerUrl();
  return base ? `${base}/api` : '/api';
};

export const apiFetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const headers = new Headers(init?.headers);
  if (!headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }
  return fetch(input, { ...init, headers });
};

export const api = {
  // Health
  async getHealth(customBaseUrl?: string) {
    const base = customBaseUrl ? `${customBaseUrl.replace(/\/$/, '')}/api` : getApiBaseUrl();
    const res = await apiFetch(`${base}/health`);
    if (!res.ok) throw new Error(`Health check returned status ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('Received HTML instead of JSON. Ensure your Netlify proxy /api/* or backend URL is configured.');
    }
    return res.json();
  },

  async testBackendConnection(url: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const start = Date.now();
    try {
      const cleanUrl = url.trim().replace(/\/$/, '');
      const healthUrl = cleanUrl ? `${cleanUrl}/api/health` : `${getApiBaseUrl()}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await apiFetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - start;

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        return {
          success: false,
          latencyMs,
          message: 'Received HTML instead of JSON API response. Your Netlify proxy rule /api/* or backend URL may be misconfigured.'
        };
      }

      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data && (data.status === 'ok' || data.service)) {
          return { success: true, latencyMs, message: `Connected successfully (${latencyMs}ms)` };
        }
        return { success: true, latencyMs, message: `Connected (${latencyMs}ms)` };
      }
      return { success: false, latencyMs, message: `Server responded with HTTP ${res.status}` };
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      if (err.name === 'AbortError') {
        return { success: false, latencyMs, message: 'Connection timed out (8s). Check if backend is active.' };
      }
      return { success: false, latencyMs, message: err.message || 'Connection failed' };
    }
  },

  // Files
  async getFiles(): Promise<StoredFile[]> {
    const res = await apiFetch(`${getApiBaseUrl()}/files`);
    if (!res.ok) throw new Error('Failed to fetch files');
    return res.json();
  },

  async getFileById(id: string): Promise<StoredFile> {
    const res = await apiFetch(`${getApiBaseUrl()}/files/${id}`);
    if (!res.ok) throw new Error('Failed to fetch file');
    return res.json();
  },

  async uploadFile(file: File): Promise<StoredFile> {
    const results = await this.uploadFiles([file]);
    if (!results || results.length === 0) {
      throw new Error('Upload returned no file');
    }
    return results[0];
  },

  async uploadFiles(files: File[]): Promise<StoredFile[]> {
    if (!files || files.length === 0) return [];
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const res = await apiFetch(`${getApiBaseUrl()}/files/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data.files && Array.isArray(data.files)) return data.files;
    return [data];
  },

  async renameFile(id: string, newName: string): Promise<StoredFile> {
    const res = await apiFetch(`${getApiBaseUrl()}/files/${id}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName })
    });
    if (!res.ok) throw new Error('Failed to rename file');
    return res.json();
  },

  async deleteFile(id: string): Promise<void> {
    const res = await apiFetch(`${getApiBaseUrl()}/files/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete file');
  },

  async updateFileFields(
    id: string,
    columns: Array<{ name: string; purpose?: string; usageGuidance?: string; role?: string }>
  ): Promise<StoredFile> {
    const res = await apiFetch(`${getApiBaseUrl()}/files/${id}/fields`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columns })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update fields' }));
      throw new Error(err.error || 'Failed to update fields');
    }
    return res.json();
  },

  async suggestFileFields(
    id: string
  ): Promise<{ columns: Array<{ name: string; purpose?: string; usageGuidance?: string; role?: string }> }> {
    const res = await apiFetch(`${getApiBaseUrl()}/files/${id}/suggest-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to generate field suggestions' }));
      throw new Error(err.error || 'Failed to generate field suggestions');
    }
    return res.json();
  },

  // Chat
  async sendChat(params: {
    question: string;
    fileIds: string[];
    providerId?: string;
    modelId?: string;
    sessionId?: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
    customInstructions?: string;
    systemPrompt?: string;
  }): Promise<ChatMessage> {
    const res = await apiFetch(`${getApiBaseUrl()}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Query failed' }));
      throw new Error(err.error || 'Query failed');
    }
    return res.json();
  },

  async getChatHistory(): Promise<ChatSession[]> {
    const res = await apiFetch(`${getApiBaseUrl()}/chat/history`);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  async createChatSession(params: {
    title?: string;
    fileIds?: string[];
    providerId?: string;
    modelId?: string;
  }): Promise<ChatSession> {
    const res = await apiFetch(`${getApiBaseUrl()}/chat/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  async renameChatSession(id: string, title: string): Promise<ChatSession> {
    const res = await apiFetch(`${getApiBaseUrl()}/chat/history/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    if (!res.ok) throw new Error('Failed to rename session');
    return res.json();
  },

  async deleteChatSession(id: string): Promise<void> {
    const res = await apiFetch(`${getApiBaseUrl()}/chat/history/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  // Providers
  async getProviders(): Promise<AIProviderConfig[]> {
    const res = await apiFetch(`${getApiBaseUrl()}/providers`);
    if (!res.ok) throw new Error('Failed to fetch providers');
    return res.json();
  },

  async addProvider(provider: Partial<AIProviderConfig>): Promise<AIProviderConfig> {
    const res = await apiFetch(`${getApiBaseUrl()}/providers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(provider)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to add provider' }));
      throw new Error(err.error || 'Failed to add provider');
    }
    return res.json();
  },

  async updateProvider(id: string, updates: Partial<AIProviderConfig>): Promise<AIProviderConfig> {
    const res = await apiFetch(`${getApiBaseUrl()}/providers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update provider');
    return res.json();
  },

  async deleteProvider(id: string): Promise<void> {
    const res = await apiFetch(`${getApiBaseUrl()}/providers/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete provider');
  },

  async setDefaultProvider(id: string): Promise<void> {
    const res = await apiFetch(`${getApiBaseUrl()}/providers/${id}/default`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to set default provider');
  },

  async validateProvider(provider: Partial<AIProviderConfig>) {
    const res = await apiFetch(`${getApiBaseUrl()}/providers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(provider)
    });
    if (!res.ok) throw new Error('Validation request failed');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<AppSettings> {
    const res = await apiFetch(`${getApiBaseUrl()}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await apiFetch(`${getApiBaseUrl()}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  }
};
