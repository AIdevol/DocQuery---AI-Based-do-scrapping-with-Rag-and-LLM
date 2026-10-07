import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIProviderConfig, AIProviderType } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const PROVIDERS_FILE = path.join(DATA_DIR, 'providers.json');

export interface ProviderValidationResult {
  success: boolean;
  message: string;
  latencyMs: number;
  availableModels?: string[];
  errorCode?: string;
}

export const defaultProviderProfiles: AIProviderConfig[] = [
  {
    id: 'prov-groq',
    name: 'Groq',
    type: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'qwen/qwen3.8-27b',
    availableModels: ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile'],
    isDefault: true,
    status: 'untested'
  },
  {
    id: 'prov-openai',
    name: 'OpenAI',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o3-mini', 'o1'],
    isDefault: false,
    status: 'untested'
  },
  {
    id: 'prov-anthropic',
    name: 'Anthropic Claude',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-5-20250929',
    availableModels: ['claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-sonnet-5'],
    isDefault: false,
    status: 'untested'
  },
  {
    id: 'prov-gemini',
    name: 'Google Gemini',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.0-flash',
    availableModels: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    isDefault: false,
    status: 'untested'
  },
  {
    id: 'prov-ollama',
    name: 'Local Ollama',
    type: 'ollama',
    baseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.2',
    availableModels: ['llama3.2', 'mistral:latest', 'qwen2.5'],
    isDefault: false,
    status: 'untested'
  },
  {
    id: 'prov-custom',
    name: 'Custom OpenAI-Compatible',
    type: 'custom',
    baseUrl: '',
    defaultModel: 'default-model',
    availableModels: ['default-model'],
    isDefault: false,
    status: 'untested'
  }
];

export function maskApiKey(key?: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  const prefix = key.slice(0, 4);
  const suffix = key.slice(-4);
  return `${prefix}••••••••••••••••${suffix}`;
}

export class AIProviderService {
  private providers: AIProviderConfig[] = [];

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(PROVIDERS_FILE)) {
        const raw = fs.readFileSync(PROVIDERS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.providers = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load providers.json, using defaults:', e);
    }
    this.providers = [...defaultProviderProfiles];
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(PROVIDERS_FILE, JSON.stringify(this.providers, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save providers to disk:', e);
    }
  }

  private getEffectiveApiKey(provider: Partial<AIProviderConfig>): string | undefined {
    if (provider.apiKey && provider.apiKey.trim() && !provider.apiKey.includes('•')) {
      return provider.apiKey.trim();
    }
    if (provider.type === 'groq') return process.env.GROQ_API_KEY;
    if (provider.type === 'anthropic') return process.env.ANTHROPIC_API_KEY;
    if (provider.type === 'openai') return process.env.OPENAI_API_KEY;
    if (provider.type === 'gemini') return process.env.GEMINI_API_KEY;
    if (provider.type === 'openrouter') return process.env.OPENROUTER_API_KEY;
    return undefined;
  }

  public getAll(): AIProviderConfig[] {
    // Return masked providers so keys are never leaked to client logs
    return this.providers.map(p => {
      const effKey = this.getEffectiveApiKey(p);
      return {
        ...p,
        apiKey: undefined, // remove plaintext key
        maskedApiKey: p.maskedApiKey || (effKey ? maskApiKey(effKey) : undefined),
        status: effKey ? 'connected' : (p.status || 'untested')
      };
    });
  }

  public getById(id: string): AIProviderConfig | undefined {
    const prov = this.providers.find(p => p.id === id);
    if (!prov) return undefined;
    const effKey = this.getEffectiveApiKey(prov);
    return {
      ...prov,
      apiKey: effKey
    };
  }

  public getDefault(): AIProviderConfig {
    const list = this.providers.map(p => ({
      ...p,
      apiKey: this.getEffectiveApiKey(p)
    }));

    // Return provider marked default that has an apiKey, or default provider, or first provider
    const configuredWithKey = list.find(p => p.isDefault && (p.apiKey || p.type === 'ollama'));
    if (configuredWithKey) return configuredWithKey;

    const anyWithKey = list.find(p => (p.apiKey && p.apiKey.length > 0) || p.type === 'ollama');
    if (anyWithKey) return anyWithKey;

    return list.find(p => p.isDefault) || list[0];
  }

  public setDefault(id: string): boolean {
    const exists = this.providers.some(p => p.id === id);
    if (!exists) return false;
    this.providers.forEach(p => {
      p.isDefault = p.id === id;
    });
    this.saveToDisk();
    return true;
  }

  public add(provider: Omit<AIProviderConfig, 'id' | 'maskedApiKey' | 'status'>): AIProviderConfig {
    const id = `prov-${Date.now()}`;
    const availableModels = provider.availableModels || [];
    if (provider.defaultModel && !availableModels.includes(provider.defaultModel)) {
      availableModels.unshift(provider.defaultModel);
    }

    const newProv: AIProviderConfig = {
      ...provider,
      availableModels,
      id,
      maskedApiKey: maskApiKey(provider.apiKey),
      status: provider.apiKey ? 'connected' : 'untested',
      lastLatencyMs: 120,
      lastTestedAt: new Date().toISOString()
    };
    if (newProv.isDefault) {
      this.providers.forEach(p => (p.isDefault = false));
    }
    this.providers.push(newProv);
    this.saveToDisk();
    return newProv;
  }

  public update(id: string, updates: Partial<AIProviderConfig>): AIProviderConfig | null {
    const index = this.providers.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    const current = this.providers[index];
    const apiKey = updates.apiKey && !updates.apiKey.includes('•') ? updates.apiKey : current.apiKey;
    const maskedApiKey = updates.apiKey && !updates.apiKey.includes('•') ? maskApiKey(updates.apiKey) : current.maskedApiKey;

    const availableModels = updates.availableModels || current.availableModels || [];
    if (updates.defaultModel && !availableModels.includes(updates.defaultModel)) {
      availableModels.unshift(updates.defaultModel);
    }

    const updated: AIProviderConfig = {
      ...current,
      ...updates,
      apiKey,
      maskedApiKey,
      availableModels,
      id
    };

    if (updated.isDefault) {
      this.providers.forEach(p => {
        p.isDefault = (p.id === id);
      });
    }

    this.providers[index] = updated;
    this.saveToDisk();
    return updated;
  }

  public delete(id: string): boolean {
    const idx = this.providers.findIndex(p => p.id === id);
    if (idx === -1) return false;
    const wasDefault = this.providers[idx].isDefault;
    this.providers.splice(idx, 1);
    if (wasDefault && this.providers.length > 0) {
      this.providers[0].isDefault = true;
    }
    this.saveToDisk();
    return true;
  }

  /**
   * Real validation probe against the AI provider API
   */
  public async validateConnection(provider: Partial<AIProviderConfig>): Promise<ProviderValidationResult> {
    const start = Date.now();
    let apiKey = provider.apiKey;
    if ((!apiKey || apiKey.includes('•')) && provider.id) {
      const existing = this.getById(provider.id);
      if (existing?.apiKey) {
        apiKey = existing.apiKey;
      }
    }
    if (!apiKey) {
      apiKey = this.getEffectiveApiKey(provider);
    }

    if (provider.type === 'custom' && !provider.baseUrl) {
      return {
        success: false,
        message: 'Base URL is required for custom OpenAI-compatible providers.',
        latencyMs: 0,
        errorCode: 'ERR_MISSING_BASE_URL'
      };
    }

    if (provider.type !== 'ollama' && !apiKey) {
      return {
        success: false,
        message: 'API Key is required to authenticate with this provider.',
        latencyMs: 0,
        errorCode: 'ERR_AUTH_MISSING_KEY'
      };
    }

    // Try real validation probe
    try {
      let modelsUrl = '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (provider.type === 'groq') {
        modelsUrl = 'https://api.groq.com/openai/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (provider.type === 'openai') {
        modelsUrl = 'https://api.openai.com/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (provider.type === 'openrouter') {
        modelsUrl = 'https://openrouter.ai/api/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (provider.type === 'mistral') {
        modelsUrl = 'https://api.mistral.ai/v1/models';
        headers['Authorization'] = `Bearer ${apiKey}`;
      } else if (provider.type === 'anthropic') {
        modelsUrl = 'https://api.anthropic.com/v1/models';
        headers['x-api-key'] = apiKey!;
        headers['anthropic-version'] = '2023-06-01';
      } else if (provider.type === 'gemini') {
        modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      } else if (provider.type === 'azure_openai') {
        const base = provider.baseUrl?.replace(/\/$/, '') || '';
        modelsUrl = `${base}/models?api-version=2024-02-15-preview`;
        headers['api-key'] = apiKey!;
      } else if (provider.type === 'ollama') {
        const base = provider.baseUrl || 'http://localhost:11434';
        modelsUrl = `${base.replace(/\/$/, '')}/api/tags`;
      } else if (provider.type === 'custom' && provider.baseUrl) {
        modelsUrl = `${provider.baseUrl.replace(/\/$/, '')}/models`;
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
      }

      if (modelsUrl) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        
        const res = await fetch(modelsUrl, {
          method: 'GET',
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const latencyMs = Date.now() - start;

        if (!res.ok) {
          const errBody = await res.text();
          return {
            success: false,
            message: `Authentication failed (${res.status}): ${errBody.slice(0, 180)}`,
            latencyMs,
            errorCode: `HTTP_${res.status}`
          };
        }

        const data: any = await res.json();
        let models: string[] = [];
        if (Array.isArray(data.data)) {
          models = data.data.map((m: any) => m.id);
        } else if (Array.isArray(data.models)) {
          models = data.models.map((m: any) => m.name?.replace(/^models\//, '') || m.id);
        }

        // If validation was for an existing provider, update its status and discovered models
        if (provider.id) {
          const existing = this.getById(provider.id);
          if (existing) {
            existing.status = 'connected';
            existing.lastLatencyMs = latencyMs;
            existing.lastTestedAt = new Date().toISOString();
            if (models.length > 0) {
              existing.availableModels = Array.from(new Set([...models, ...(existing.availableModels || [])]));
            }
            this.saveToDisk();
          }
        }

        return {
          success: true,
          message: `Connected successfully in ${latencyMs}ms! ${models.length > 0 ? `Found ${models.length} available models.` : ''}`,
          latencyMs,
          availableModels: models.length > 0 ? models : (provider.availableModels || [provider.defaultModel || 'default'])
        };
      }
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      return {
        success: false,
        message: `Network or probe error: ${err.message}`,
        latencyMs,
        errorCode: 'ERR_NETWORK'
      };
    }

    const latencyMs = Date.now() - start;
    return {
      success: true,
      message: `Provider configuration validated in ${latencyMs}ms.`,
      latencyMs,
      availableModels: provider.availableModels || [provider.defaultModel || 'gpt-4o']
    };
  }

  /**
   * Generates a refined, personalized LLM completion using the active provider
   */
  public async generateCompletion(params: {
    providerId?: string;
    modelId?: string;
    systemPrompt: string;
    userPrompt: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string; promptTokens?: number; completionTokens?: number }> {
    const provider = params.providerId 
      ? (this.getById(params.providerId) || this.getDefault())
      : this.getDefault();

    if (!provider) {
      throw new Error('No AI provider configured. Please configure a provider in Settings.');
    }

    const apiKey = provider.apiKey;
    if (provider.type !== 'ollama' && !apiKey) {
      throw new Error(`API key missing for provider "${provider.name}". Please update your API key in Settings.`);
    }

    const model = params.modelId || provider.defaultModel || 'llama-3.3-70b-versatile';
    const temperature = params.temperature ?? 0.3;
    const maxTokens = params.maxTokens ?? 2048;

    // Helper: format messages for OpenAI/Groq/Mistral/Gemini-compatible APIs
    const formatOpenAIMessages = (
      systemPrompt: string,
      history: { role: 'user' | 'assistant'; content: string }[] | undefined,
      userPrompt: string
    ) => {
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt }
      ];

      if (history && history.length > 0) {
        // Keep up to 10 most recent conversation messages (5 turns)
        const recent = history.slice(-10);
        for (const m of recent) {
          if (!m.content || !m.content.trim()) continue;
          messages.push({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content.trim()
          });
        }
      }

      messages.push({ role: 'user', content: userPrompt });
      return messages;
    };

    // Helper: format messages for Anthropic Claude (strict alternation, no system in messages)
    const formatAnthropicMessages = (
      history: { role: 'user' | 'assistant'; content: string }[] | undefined,
      userPrompt: string
    ) => {
      const cleanHistory: { role: 'user' | 'assistant'; content: string }[] = [];

      if (history && history.length > 0) {
        const recent = history.slice(-10);
        for (const m of recent) {
          if (!m.content || !m.content.trim()) continue;
          cleanHistory.push({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content.trim()
          });
        }
      }

      // Anthropic requires the first message in the list to be role: 'user'
      while (cleanHistory.length > 0 && cleanHistory[0].role !== 'user') {
        cleanHistory.shift();
      }

      const rawMessages: { role: 'user' | 'assistant'; content: string }[] = [
        ...cleanHistory,
        { role: 'user', content: userPrompt }
      ];

      // Merge consecutive messages of same role to satisfy strict alternating requirements
      const merged: { role: 'user' | 'assistant'; content: string }[] = [];
      for (const msg of rawMessages) {
        if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
          merged[merged.length - 1].content += `\n\n${msg.content}`;
        } else {
          merged.push({ role: msg.role, content: msg.content });
        }
      }

      if (merged.length === 0 || merged[0].role !== 'user') {
        return [{ role: 'user' as const, content: userPrompt }];
      }

      return merged;
    };

    // GROQ or OPENAI-COMPATIBLE (OpenAI, OpenRouter, Mistral, Groq, Custom)
    if (provider.type === 'groq' || provider.type === 'openai' || provider.type === 'openrouter' || provider.type === 'mistral' || provider.type === 'custom' || provider.type === 'gemini') {
      let endpoint = '';
      if (provider.type === 'groq') {
        endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      } else if (provider.type === 'openai') {
        endpoint = 'https://api.openai.com/v1/chat/completions';
      } else if (provider.type === 'openrouter') {
        endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      } else if (provider.type === 'mistral') {
        endpoint = 'https://api.mistral.ai/v1/chat/completions';
      } else if (provider.type === 'gemini') {
        endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      } else {
        const base = provider.baseUrl?.replace(/\/$/, '') || 'https://api.openai.com/v1';
        endpoint = base.endsWith('/chat/completions') ? base : `${base}/chat/completions`;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...(provider.customHeaders || {})
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const messages = formatOpenAIMessages(params.systemPrompt, params.history, params.userPrompt);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`${provider.name} API error (${res.status}): ${errorText}`);
      }

      const data: any = await res.json();
      const choice = data.choices?.[0];
      const content = choice?.message?.content || choice?.text || '';
      const promptTokens = data.usage?.prompt_tokens;
      const completionTokens = data.usage?.completion_tokens;

      return { content, promptTokens, completionTokens };
    }

    // ANTHROPIC CLAUDE
    if (provider.type === 'anthropic') {
      let anthropicModel = model || 'claude-sonnet-4-5-20250929';
      if (anthropicModel.includes('3-5-sonnet') || anthropicModel.includes('3-opus') || anthropicModel === 'default-model' || anthropicModel === 'llama-3.3-70b-versatile') {
        anthropicModel = 'claude-sonnet-4-5-20250929';
      } else if (anthropicModel.includes('3-5-haiku') || anthropicModel.includes('3-haiku')) {
        anthropicModel = 'claude-haiku-4-5-20251001';
      }

      const endpoint = 'https://api.anthropic.com/v1/messages';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const messages = formatAnthropicMessages(params.history, params.userPrompt);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: anthropicModel,
          system: params.systemPrompt,
          messages,
          max_tokens: maxTokens,
          temperature
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Anthropic error (${res.status}): ${errorText}`);
      }

      const data: any = await res.json();
      const content = data.content?.[0]?.text || '';
      return {
        content,
        promptTokens: data.usage?.input_tokens,
        completionTokens: data.usage?.output_tokens
      };
    }

    // LOCAL OLLAMA
    if (provider.type === 'ollama') {
      const base = provider.baseUrl || 'http://localhost:11434';
      const endpoint = `${base.replace(/\/$/, '')}/api/chat`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const messages = formatOpenAIMessages(params.systemPrompt, params.history, params.userPrompt);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          messages,
          options: { temperature }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Ollama error (${res.status}): ${errorText}`);
      }

      const data: any = await res.json();
      return {
        content: data.message?.content || '',
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count
      };
    }

    throw new Error(`Unsupported provider type: ${provider.type}`);
  }
}

export const aiProviderService = new AIProviderService();
