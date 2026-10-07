import React, { useState } from 'react';
import {
  Cpu,
  Sliders,
  Sparkles,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Check,
  Zap,
  Layers,
  Loader2,
  Eye,
  EyeOff,
  Star,
  Key,
  RotateCcw,
  Copy,
  Terminal,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  Globe,
  Server,
  RefreshCw
} from 'lucide-react';
import {
  AIProviderConfig,
  AIProviderType,
  AppSettings,
  PromptConfiguration,
  DEFAULT_RAG_SYSTEM_PROMPT
} from '../../types/index.js';
import {
  getBackendServerUrl,
  setBackendServerUrl,
  clearBackendServerUrl,
  getCustomBackendUrl,
  getEnvBackendUrl,
  api
} from '../../services/api.js';

interface SettingsViewProps {
  providers: AIProviderConfig[];
  onAddProvider: (p: Partial<AIProviderConfig>) => Promise<void>;
  onUpdateProvider: (id: string, p: Partial<AIProviderConfig>) => Promise<void>;
  onDeleteProvider: (id: string) => Promise<void>;
  onSetDefaultProvider: (id: string) => Promise<void>;
  onValidateProvider: (p: Partial<AIProviderConfig>) => Promise<{ success: boolean; message: string; latencyMs: number; availableModels?: string[] }>;
  settings: AppSettings;
  onUpdateSettings: (s: Partial<AppSettings>) => Promise<void>;
  initialTab?: 'providers' | 'model' | 'prompt' | 'embedding' | 'storage' | 'processing' | 'server';
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  providers,
  onAddProvider,
  onUpdateProvider,
  onDeleteProvider,
  onSetDefaultProvider,
  onValidateProvider,
  settings,
  onUpdateSettings,
  initialTab
}) => {
  const [activeTab, setActiveTab] = useState<'providers' | 'model' | 'prompt' | 'embedding' | 'storage' | 'processing' | 'server'>(
    initialTab || 'providers'
  );

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  // Backend Server URL Configuration State
  const [backendUrlInput, setBackendUrlInput] = useState<string>(getBackendServerUrl());
  const [serverTesting, setServerTesting] = useState(false);
  const [serverTestResult, setServerTestResult] = useState<{ success: boolean; latencyMs: number; message: string } | null>(null);
  const [serverSavedSuccess, setServerSavedSuccess] = useState(false);
  
  // Add / Edit Provider Modal State
  const [editingProvider, setEditingProvider] = useState<AIProviderConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formType, setFormType] = useState<AIProviderType>('anthropic');
  const [formName, setFormName] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [showApiKeyPlaintext, setShowApiKeyPlaintext] = useState(false);
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formOrg, setFormOrg] = useState('');
  const [formHeaders, setFormHeaders] = useState('');
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([]);
  
  // Testing state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs: number; availableModels?: string[] } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local copy of configurations for sliders/inputs
  const [localModel, setLocalModel] = useState(settings.model);
  const [localEmbedding, setLocalEmbedding] = useState(settings.embedding);
  const [localStorageConfig, setLocalStorageConfig] = useState(settings.storage);
  const [localProcessing, setLocalProcessing] = useState(settings.processing);
  const [localPrompt, setLocalPrompt] = useState<PromptConfiguration>(
    settings.prompt || {
      systemPrompt: DEFAULT_RAG_SYSTEM_PROMPT,
      customInstructions: '',
      enableCustomPrompt: false,
      enableCustomInstructions: true
    }
  );
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [processingView, setProcessingView] = useState<'recommended' | 'advanced'>('recommended');

  const providerTypeOptions: {
    id: AIProviderType;
    label: string;
    defaultBaseUrl?: string;
    defaultModel: string;
    suggestedModels: string[];
  }[] = [
    {
      id: 'anthropic',
      label: 'Anthropic Claude',
      defaultBaseUrl: 'https://api.anthropic.com',
      defaultModel: 'claude-sonnet-4-5-20250929',
      suggestedModels: ['claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-sonnet-5']
    },
    {
      id: 'openai',
      label: 'OpenAI',
      defaultBaseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
      suggestedModels: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o1', 'gpt-4-turbo']
    },
    {
      id: 'groq',
      label: 'Groq',
      defaultBaseUrl: 'https://api.groq.com/openai/v1',
      defaultModel: 'llama-3.3-70b-versatile',
      suggestedModels: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b']
    },
    {
      id: 'gemini',
      label: 'Google Gemini',
      defaultBaseUrl: 'https://generativelanguage.googleapis.com',
      defaultModel: 'gemini-2.0-flash',
      suggestedModels: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
    },
    {
      id: 'openrouter',
      label: 'OpenRouter',
      defaultBaseUrl: 'https://openrouter.ai/api/v1',
      defaultModel: 'anthropic/claude-3.5-sonnet',
      suggestedModels: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct']
    },
    {
      id: 'mistral',
      label: 'Mistral AI',
      defaultBaseUrl: 'https://api.mistral.ai/v1',
      defaultModel: 'mistral-large-latest',
      suggestedModels: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest']
    },
    {
      id: 'ollama',
      label: 'Ollama (Local)',
      defaultBaseUrl: 'http://localhost:11434',
      defaultModel: 'llama3.2',
      suggestedModels: ['llama3.2', 'mistral:latest', 'qwen2.5', 'llama3.1:8b']
    },
    {
      id: 'azure_openai',
      label: 'Azure OpenAI',
      defaultBaseUrl: 'https://your-resource.openai.azure.com',
      defaultModel: 'gpt-4o',
      suggestedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4']
    },
    {
      id: 'custom',
      label: 'Custom / OpenAI-Compatible API',
      defaultBaseUrl: 'https://your-api-endpoint.com/v1',
      defaultModel: 'default-model',
      suggestedModels: ['default-model', 'deepseek-chat', 'qwen-2.5-72b']
    }
  ];

  const handleOpenAdd = () => {
    setIsAddingNew(true);
    setEditingProvider(null);
    setFormType('anthropic');
    setFormName('Anthropic Claude');
    setFormApiKey('');
    setFormBaseUrl('https://api.anthropic.com');
    setFormModel('claude-sonnet-4-5-20250929');
    setFormIsDefault(true);
    setFormOrg('');
    setFormHeaders('');
    setTestResult(null);
    setDiscoveredModels(['claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001']);
    setShowApiKeyPlaintext(false);
  };

  const handleOpenEdit = (prov: AIProviderConfig) => {
    setEditingProvider(prov);
    setIsAddingNew(false);
    setFormType(prov.type);
    setFormName(prov.name);
    setFormApiKey(''); // keep blank unless replacing
    setFormBaseUrl(prov.baseUrl || '');
    setFormModel(prov.defaultModel);
    setFormIsDefault(prov.isDefault || false);
    setFormOrg(prov.organization || '');
    setFormHeaders(prov.customHeaders ? JSON.stringify(prov.customHeaders) : '');
    setTestResult(null);
    setDiscoveredModels(prov.availableModels || []);
    setShowApiKeyPlaintext(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onValidateProvider({
        id: editingProvider?.id,
        type: formType,
        apiKey: formApiKey.trim() ? formApiKey.trim() : undefined,
        baseUrl: formBaseUrl.trim() ? formBaseUrl.trim() : undefined,
        defaultModel: formModel.trim() ? formModel.trim() : undefined
      });
      setTestResult(res);
      if (res.availableModels && Array.isArray(res.availableModels) && res.availableModels.length > 0) {
        setDiscoveredModels(res.availableModels);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed',
        latencyMs: 0
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveProvider = async () => {
    let customHeadersObj: Record<string, string> | undefined = undefined;
    if (formHeaders) {
      try {
        customHeadersObj = JSON.parse(formHeaders);
      } catch (e) {
        alert('Invalid JSON in custom headers');
        return;
      }
    }

    const trimmedModel = formModel.trim() || 'default-model';
    const currentAvailable = editingProvider?.availableModels || [];
    const mergedModels = Array.from(new Set([
      trimmedModel,
      ...discoveredModels,
      ...currentAvailable
    ]));

    const payload: Partial<AIProviderConfig> = {
      name: formName.trim() || 'AI Provider',
      type: formType,
      baseUrl: formBaseUrl ? formBaseUrl.trim() : undefined,
      defaultModel: trimmedModel,
      availableModels: mergedModels,
      organization: formOrg ? formOrg.trim() : undefined,
      customHeaders: customHeadersObj,
      isDefault: formIsDefault
    };

    if (formApiKey && formApiKey.trim()) {
      payload.apiKey = formApiKey.trim();
    }

    if (isAddingNew) {
      await onAddProvider(payload);
    } else if (editingProvider) {
      await onUpdateProvider(editingProvider.id, payload);
      if (formIsDefault && !editingProvider.isDefault) {
        await onSetDefaultProvider(editingProvider.id);
      }
    }

    setIsAddingNew(false);
    setEditingProvider(null);
  };

  const handleSaveSettings = async () => {
    await onUpdateSettings({
      model: localModel,
      embedding: localEmbedding,
      storage: localStorageConfig,
      processing: localProcessing,
      prompt: localPrompt
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Workspace Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure multi-provider AI routing, prompt instructions & RAG base template, embedding, storage, and indexing.
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          {saveSuccess ? <Check className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4" />}
          <span>{saveSuccess ? 'Saved Successfully!' : 'Save All Preferences'}</span>
        </button>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'providers', label: 'AI Providers & Profiles', icon: Cpu },
          { id: 'model', label: 'Model Configuration', icon: Sliders },
          { id: 'prompt', label: 'Prompt & Instructions', icon: Terminal },
          { id: 'embedding', label: 'Embedding Engine', icon: Sparkles },
          { id: 'storage', label: 'File Storage', icon: HardDrive },
          { id: 'processing', label: 'Processing & Indexing', icon: Layers },
          { id: 'server', label: 'Backend & Netlify', icon: Globe }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
                isActive
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.id === 'prompt' && (localPrompt.enableCustomInstructions || localPrompt.enableCustomPrompt) && (
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: AI PROVIDERS & PROFILES */}
      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Configured AI Providers
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect multiple cloud, local, or self-hosted LLM endpoints. Keys are encrypted and masked.
              </p>
            </div>

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium shadow-2xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Provider
            </button>
          </div>

          {/* Active Default LLM Quick Card */}
          {(() => {
            const activeProv = providers.find(p => p.isDefault) || providers[0];
            return (
              <div className="p-5 rounded-2xl border-2 border-teal-500/50 bg-gradient-to-r from-teal-50/60 via-emerald-50/30 to-white dark:from-teal-950/40 dark:via-slate-900 dark:to-slate-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                        Active Workspace LLM
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Default
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {activeProv ? activeProv.name : 'No Provider Configured'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      <span>Model: <strong className="text-teal-700 dark:text-teal-300">{activeProv?.defaultModel || 'Not set'}</strong></span>
                      <span>•</span>
                      {activeProv?.maskedApiKey ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-sans font-medium flex items-center gap-1">
                          <Key className="w-3 h-3" /> Key saved ({activeProv.maskedApiKey})
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-sans font-medium">⚠️ API key required</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeProv && activeProv.availableModels && activeProv.availableModels.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                      <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Model:</label>
                      <select
                        value={activeProv.defaultModel}
                        onChange={async (e) => {
                          const newModel = e.target.value;
                          await onUpdateProvider(activeProv.id, { defaultModel: newModel });
                        }}
                        className="bg-transparent text-xs font-mono font-semibold text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
                      >
                        {activeProv.availableModels.map(m => (
                          <option key={m} value={m} className="dark:bg-slate-900">{m}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    onClick={() => activeProv && handleOpenEdit(activeProv)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Configure / Change Key
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Provider Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providers.map((p) => (
              <div
                key={p.id}
                className={`p-5 rounded-2xl border transition-all bg-white dark:bg-slate-900 shadow-2xs ${
                  p.isDefault
                    ? 'border-teal-500 dark:border-teal-500 ring-2 ring-teal-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {p.name}
                    </span>
                    {p.isDefault ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-teal-600 text-white flex items-center gap-1 shadow-2xs">
                        <Check className="w-3 h-3" />
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => onSetDefaultProvider(p.id)}
                        className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-slate-300 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-950 text-slate-600 dark:text-slate-300 hover:text-teal-600 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Set this provider as workspace default"
                      >
                        <Star className="w-3 h-3 text-slate-400" />
                        Set Default
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {p.lastLatencyMs ? (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/60">
                        {p.lastLatencyMs}ms
                      </span>
                    ) : null}
                    <span className={`w-2 h-2 rounded-full ${p.apiKey || p.maskedApiKey || p.type === 'ollama' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Model:</span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={p.defaultModel}
                        onChange={async (e) => {
                          const newModel = e.target.value;
                          await onUpdateProvider(p.id, { defaultModel: newModel });
                        }}
                        className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-slate-100 max-w-[210px] cursor-pointer"
                      >
                        {p.availableModels?.map((m) => (
                          <option key={m} value={m} className="dark:bg-slate-900">{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">API Key:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {p.maskedApiKey ? (
                        <span className="text-slate-700 dark:text-slate-300 font-mono">{p.maskedApiKey}</span>
                      ) : (
                        p.type === 'ollama' ? 'Local (No key needed)' : <span className="text-amber-600 dark:text-amber-400 font-sans font-medium">⚠️ Missing Key</span>
                      )}
                    </span>
                  </div>

                  {p.baseUrl && (
                    <div className="truncate text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                      Base: {p.baseUrl}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    {!p.isDefault ? (
                      <button
                        onClick={() => onSetDefaultProvider(p.id)}
                        className="text-teal-600 dark:text-teal-400 hover:underline text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        Use as Default
                      </button>
                    ) : (
                      <span className="text-teal-600 dark:text-teal-400 text-[11px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Active Provider
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      title="Edit model or API key"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    {providers.length > 1 && (
                      <button
                        onClick={() => onDeleteProvider(p.id)}
                        className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-500 hover:text-rose-700 transition-colors"
                        title="Remove provider"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add / Edit Drawer / Modal */}
          {(isAddingNew || editingProvider) && (
            <div className="p-6 rounded-2xl border-2 border-teal-500/80 bg-white dark:bg-slate-900 shadow-xl space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-teal-600" />
                  {isAddingNew ? 'Add AI Provider Profile' : `Configure Provider: ${editingProvider?.name}`}
                </h3>
                <button
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingProvider(null);
                  }}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Provider Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      const t = e.target.value as AIProviderType;
                      setFormType(t);
                      const opt = providerTypeOptions.find(o => o.id === t);
                      if (opt) {
                        setFormBaseUrl(opt.defaultBaseUrl || '');
                        setFormModel(opt.defaultModel);
                        setDiscoveredModels(opt.suggestedModels || []);
                      }
                    }}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    {providerTypeOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Anthropic Claude, Production GPT-4o"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-600 dark:text-slate-300 font-semibold">
                      API Key
                    </label>
                    {editingProvider?.maskedApiKey && !formApiKey && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                        ✓ Saved ({editingProvider.maskedApiKey})
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKeyPlaintext ? "text" : "password"}
                      value={formApiKey}
                      onChange={(e) => setFormApiKey(e.target.value)}
                      placeholder={editingProvider?.maskedApiKey ? "Leave blank to keep saved key, or enter new key" : "Enter API Key (sk-...)"}
                      className="w-full p-2 pr-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKeyPlaintext(!showApiKeyPlaintext)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showApiKeyPlaintext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {editingProvider?.maskedApiKey ? 'Leave blank to preserve your current key, or paste a new key to update.' : 'Paste your API key here.'}
                  </p>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Default Model Name
                  </label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder="Type or click any model below"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                  {/* Suggested model chips */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-slate-400">Suggestions:</span>
                    {(() => {
                      const currentOpt = providerTypeOptions.find(o => o.id === formType);
                      const modelList = Array.from(new Set([
                        ...(discoveredModels.length > 0 ? discoveredModels : []),
                        ...(currentOpt?.suggestedModels || [])
                      ]));
                      return modelList.slice(0, 5).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setFormModel(m)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                            formModel === m
                              ? 'border-teal-500 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:border-teal-400 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {m}
                        </button>
                      ));
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Base URL (Endpoint)
                  </label>
                  <input
                    type="text"
                    value={formBaseUrl}
                    onChange={(e) => setFormBaseUrl(e.target.value)}
                    placeholder="https://api.anthropic.com or https://api.openai.com/v1"
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Organization / Project ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={formOrg}
                    onChange={(e) => setFormOrg(e.target.value)}
                    placeholder="org-..."
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                {/* Set As Default Checkbox */}
                <div className="flex items-center gap-2 pt-1 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="formIsDefault"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="formIsDefault" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-teal-600" />
                    <span>Set as Active Default Provider for all workspace queries</span>
                  </label>
                </div>
              </div>

              {/* Custom headers for custom openai compatible */}
              {(formType === 'custom' || formType === 'azure_openai') && (
                <div className="text-xs">
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    Custom Headers (JSON format)
                  </label>
                  <input
                    type="text"
                    value={formHeaders}
                    onChange={(e) => setFormHeaders(e.target.value)}
                    placeholder='{"X-Gateway": "Enterprise", "api-key": "..."}'
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              )}

              {/* Live Test Feedback Banner */}
              {testResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                  testResult.success
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                    : 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.latencyMs > 0 && (
                    <span className="font-mono text-[11px] font-bold shrink-0 ml-2">
                      {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-500" />}
                  <span>{isTesting ? 'Testing connection...' : 'Test Connection'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingNew(false);
                      setEditingProvider(null);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveProvider}
                    className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    Save & Apply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MODEL CONFIGURATION */}
      {activeTab === 'model' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Model & Generation Strategy
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select your active LLM, specify default models, and fine-tune token budget and temperature.
            </p>
          </div>

          {/* Active Provider & Model Section */}
          <div className="p-6 rounded-2xl border border-teal-400/80 dark:border-teal-700/80 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-teal-600" />
                Active LLM Provider & Default Model
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select which AI engine and generation model answers all natural-language queries across your files.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Default Provider
                </label>
                <select
                  value={providers.find(p => p.isDefault)?.id || providers[0]?.id || ''}
                  onChange={async (e) => {
                    const id = e.target.value;
                    if (id) await onSetDefaultProvider(id);
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold cursor-pointer"
                >
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type}) {p.isDefault ? '✓ Default' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Default Generation Model
                </label>
                {(() => {
                  const def = providers.find(p => p.isDefault) || providers[0];
                  return (
                    <div className="flex items-center gap-2">
                      <select
                        value={def?.defaultModel || ''}
                        onChange={async (e) => {
                          if (def) {
                            await onUpdateProvider(def.id, { defaultModel: e.target.value });
                          }
                        }}
                        className="flex-1 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs font-semibold cursor-pointer"
                      >
                        {def?.availableModels?.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => def && handleOpenEdit(def)}
                        className="px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs whitespace-nowrap cursor-pointer"
                      >
                        Custom Model / Key
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-slate-800 dark:text-slate-200">
                <span>Temperature</span>
                <span className="font-mono text-teal-600">{localModel.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={localModel.temperature}
                onChange={(e) => setLocalModel({ ...localModel, temperature: parseFloat(e.target.value) })}
                className="w-full accent-teal-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">Lower values ensure deterministic analytical calculations.</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1 text-slate-800 dark:text-slate-200">
                <span>Maximum Output Tokens</span>
                <span className="font-mono text-teal-600">{localModel.maxOutputTokens}</span>
              </div>
              <input
                type="range"
                min="512"
                max="8192"
                step="256"
                value={localModel.maxOutputTokens}
                onChange={(e) => setLocalModel({ ...localModel, maxOutputTokens: parseInt(e.target.value) })}
                className="w-full accent-teal-600"
              />
              <p className="text-[11px] text-slate-400 mt-1">Caps response generation to avoid unnecessary token usage.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-800 dark:text-slate-200">
                Context Strategy
              </label>
              <select
                value={localModel.contextStrategy}
                onChange={(e) => setLocalModel({ ...localModel, contextStrategy: e.target.value as any })}
                className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="auto_compact">Auto-Compact (Recommended: send only matched rows/sections)</option>
                <option value="strict_minimal">Strict Minimal (Aggressive compression)</option>
                <option value="full_relevance">Full Relevance (Top-K uncompressed)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-800 dark:text-slate-200">
                Request Timeout
              </label>
              <select
                value={localModel.timeoutMs}
                onChange={(e) => setLocalModel({ ...localModel, timeoutMs: parseInt(e.target.value) })}
                className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={15000}>15 seconds</option>
                <option value={30000}>30 seconds (Standard)</option>
                <option value={60000}>60 seconds</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PROMPT & INSTRUCTIONS */}
      {activeTab === 'prompt' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              Prompt Instructions & RAG Base Template
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize how the LLM reasons, formats replies, and prioritizes rules. View and modify the server's live RAG prompt template directly in the box below.
            </p>
          </div>

          {/* SECTION 1: USER PERSONALIZED INSTRUCTIONS */}
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Personalized Instructions for your LLM
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Supply custom directives, persona, tone, formatting constraints, or domain rules that the model must strictly follow.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer self-start sm:self-auto bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={localPrompt.enableCustomInstructions}
                  onChange={(e) => setLocalPrompt({ ...localPrompt, enableCustomInstructions: e.target.checked })}
                  className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                />
                <span>Enable Custom Instructions</span>
              </label>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Quick Presets (Click to apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  {
                    name: '💼 Executive Summary',
                    text: 'Provide a concise, high-level executive summary first. Focus on top key findings, numerical ROI/revenue impact, and actionable business takeaways. Avoid long winded explanations.'
                  },
                  {
                    name: '📊 Data Analyst',
                    text: 'Act as a Senior Data Analyst. Structure findings using clear markdown tables with bold headers. Highlight statistical distributions, anomalies, percentages, and year-over-year trends.'
                  },
                  {
                    name: '⚡ Direct Bullet Points',
                    text: 'Answer directly in structured bullet points only. Never include polite conversational filler, preamble, or generic summaries. Highlight primary metrics in bold.'
                  },
                  {
                    name: '⚖️ Financial & Risk Auditor',
                    text: 'Examine all numbers with strict compliance and auditing standards. Flag negative variances, potential data integrity gaps, and outliers in bold.'
                  },
                  {
                    name: '👨‍💻 Developer / Technical',
                    text: 'Provide exact technical answers. Include code snippets, SQL queries, formulas, or JSON schemas where relevant. Explain underlying data models with technical precision.'
                  }
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setLocalPrompt({
                        ...localPrompt,
                        customInstructions: preset.text,
                        enableCustomInstructions: true
                      });
                    }}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:border-teal-300 dark:hover:border-teal-700 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition-all cursor-pointer font-medium"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom instructions textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Custom Requirements & Prompt Directives
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {localPrompt.customInstructions.length} characters
                  </span>
                  {localPrompt.customInstructions && (
                    <button
                      type="button"
                      onClick={() => setLocalPrompt({ ...localPrompt, customInstructions: '' })}
                      className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <textarea
                rows={4}
                value={localPrompt.customInstructions}
                onChange={(e) => setLocalPrompt({ ...localPrompt, customInstructions: e.target.value })}
                placeholder="E.g., You are an AI financial auditor. Always format comparisons in markdown tables. Explain key drivers behind changes. If revenue decreased, highlight in bold."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                These instructions will be appended to every prompt sent to the LLM. You can also quickly toggle or edit them inside the chat view.
              </p>
            </div>
          </div>

          {/* SECTION 2: SERVER RAG BASE SYSTEM PROMPT (EDITABLE BOX) */}
          <div className="p-6 rounded-2xl border border-teal-500/60 dark:border-teal-600/60 bg-white dark:bg-slate-900 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Server RAG Base System Prompt Template
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  The exact base instructions given to the LLM alongside retrieved file context.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={localPrompt.enableCustomPrompt}
                    onChange={(e) => setLocalPrompt({ ...localPrompt, enableCustomPrompt: e.target.checked })}
                    className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                  />
                  <span>Use Custom RAG Base Prompt</span>
                </label>
              </div>
            </div>

            {/* Status Information Alert */}
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              localPrompt.enableCustomPrompt
                ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300'
                : 'border-teal-200 dark:border-teal-900/60 bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-300'
            }`}>
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
              <div className="space-y-1">
                <span className="font-semibold">
                  {localPrompt.enableCustomPrompt
                    ? 'Custom Prompt is Active'
                    : 'Default Server RAG Prompt is Active'}
                </span>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {localPrompt.enableCustomPrompt
                    ? 'The server will use your modified prompt below as the primary instructions for answering questions across all attached files.'
                    : 'The server is currently using its built-in default prompt. If you want to modify it, make edits in the box below and check "Use Custom RAG Base Prompt". If unchecked, the default works automatically.'}
                </p>
              </div>
            </div>

            {/* The Prompt Editor Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  System Prompt Template (Server RAG Base)
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {localPrompt.systemPrompt.length} characters
                </span>
              </div>

              <textarea
                rows={11}
                value={localPrompt.systemPrompt}
                onChange={(e) => {
                  setLocalPrompt({
                    ...localPrompt,
                    systemPrompt: e.target.value,
                    enableCustomPrompt: true
                  });
                }}
                className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 text-emerald-400 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all selection:bg-teal-700 selection:text-white"
                spellCheck={false}
              />
            </div>

            {/* Prompt Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLocalPrompt({
                      ...localPrompt,
                      systemPrompt: DEFAULT_RAG_SYSTEM_PROMPT,
                      enableCustomPrompt: false
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Reset prompt back to server original default"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset to Server Default</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(localPrompt.systemPrompt);
                    setCopiedPrompt(true);
                    setTimeout(() => setCopiedPrompt(false), 2000);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copiedPrompt ? 'Copied!' : 'Copy Prompt'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showPromptPreview ? 'Hide Full Live Preview' : 'Preview Combined Prompt'}</span>
                {showPromptPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* SECTION 3: LIVE PREVIEW COLLAPSIBLE */}
            {showPromptPreview && (
              <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-500" />
                    Combined Prompt Preamble Sent to Model
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    Before File Context
                  </span>
                </div>
                <pre className="text-[11px] font-mono whitespace-pre-wrap bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 max-h-56 overflow-y-auto leading-relaxed">
                  {(localPrompt.enableCustomPrompt && localPrompt.systemPrompt.trim()
                    ? localPrompt.systemPrompt.trim()
                    : DEFAULT_RAG_SYSTEM_PROMPT)}
                  {localPrompt.enableCustomInstructions && localPrompt.customInstructions.trim() && (
                    `\n\n=== USER CUSTOM INSTRUCTIONS & PERSONALIZED REQUIREMENTS ===\n${localPrompt.customInstructions.trim()}\n(CRITICAL: You MUST strictly prioritize and adhere to the user's custom instructions, formatting directives, persona, and constraints above.)`
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: EMBEDDING ENGINE */}
      {activeTab === 'embedding' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Independent Embedding Engine
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The embedding provider is decoupled from generation models to optimize indexing costs and performance.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Embedding Model
                </label>
                <select
                  value={localEmbedding.modelName}
                  onChange={(e) => setLocalEmbedding({ ...localEmbedding, modelName: e.target.value })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                >
                  <option value="text-embedding-3-small">OpenAI: text-embedding-3-small (1536 dim)</option>
                  <option value="text-embedding-3-large">OpenAI: text-embedding-3-large (3072 dim)</option>
                  <option value="voyage-3">Voyage AI: voyage-3 (1024 dim)</option>
                  <option value="bge-m3">Local: BAAI/bge-m3 (Dense + Sparse)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Batch Chunk Size
                </label>
                <input
                  type="number"
                  value={localEmbedding.batchSize}
                  onChange={(e) => setLocalEmbedding({ ...localEmbedding, batchSize: parseInt(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FILE STORAGE CONFIGURATION */}
      {activeTab === 'storage' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Storage Engine & Object Lake
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Raw files are stored in object storage while indexes and schemas are maintained in SQLite/DuckDB.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Storage Provider
                </label>
                <select
                  value={localStorageConfig.provider}
                  onChange={(e) => setLocalStorageConfig({ ...localStorageConfig, provider: e.target.value as any })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="local">Local Filesystem Storage (Server Disk)</option>
                  <option value="s3">S3-Compatible (MinIO, Cloudflare R2, Wasabi)</option>
                  <option value="aws_s3">Amazon AWS S3</option>
                  <option value="custom_object">Custom Object Gateway</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Bucket Name
                </label>
                <input
                  type="text"
                  value={localStorageConfig.bucket || ''}
                  onChange={(e) => setLocalStorageConfig({ ...localStorageConfig, bucket: e.target.value })}
                  placeholder="company-document-lakehouse"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Region
                </label>
                <input
                  type="text"
                  value={localStorageConfig.region || ''}
                  onChange={(e) => setLocalStorageConfig({ ...localStorageConfig, region: e.target.value })}
                  placeholder="ap-south-1"
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Access Key ID
                </label>
                <input
                  type="text"
                  value={localStorageConfig.accessKeyId || ''}
                  onChange={(e) => setLocalStorageConfig({ ...localStorageConfig, accessKeyId: e.target.value })}
                  placeholder="AKIA..."
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PROCESSING & INDEXING SETTINGS */}
      {activeTab === 'processing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                File Processing & Chunking Parameters
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tune parsing thresholds, OCR extraction, and tabular schema inference rules.
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => setProcessingView('recommended')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  processingView === 'recommended'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                Recommended
              </button>
              <button
                onClick={() => setProcessingView('advanced')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  processingView === 'advanced'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                Advanced
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Document Chunk Size (Tokens)
                </label>
                <input
                  type="number"
                  value={localProcessing.chunkSize}
                  onChange={(e) => setLocalProcessing({ ...localProcessing, chunkSize: parseInt(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10px] text-slate-400">Standard recommendation: 512 tokens</span>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Chunk Overlap (Tokens)
                </label>
                <input
                  type="number"
                  value={localProcessing.chunkOverlap}
                  onChange={(e) => setLocalProcessing({ ...localProcessing, chunkOverlap: parseInt(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <span className="text-[10px] text-slate-400">Preserves cross-boundary semantic continuity</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">OCR Text Extraction</div>
                  <div className="text-[11px] text-slate-400">Extracts embedded text from scanned invoices & images</div>
                </div>
                <input
                  type="checkbox"
                  checked={localProcessing.ocrEnabled}
                  onChange={(e) => setLocalProcessing({ ...localProcessing, ocrEnabled: e.target.checked })}
                  className="w-4 h-4 accent-teal-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">Auto Data Type Inference</div>
                  <div className="text-[11px] text-slate-400">Detects numeric, date, and categorical columns</div>
                </div>
                <input
                  type="checkbox"
                  checked={localProcessing.enableAutoDataTypeInference}
                  onChange={(e) => setLocalProcessing({ ...localProcessing, enableAutoDataTypeInference: e.target.checked })}
                  className="w-4 h-4 accent-teal-600 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 sm:col-span-2">
                <div>
                  <div className="font-semibold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                    <span>Prompt for Field Definitions on CSV/Excel Upload</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 font-bold uppercase">
                      Recommended
                    </span>
                  </div>
                  <div className="text-[11px] text-teal-700 dark:text-teal-300 mt-0.5">
                    Automatically opens the asking window after scraping CSV or Excel files so you can specify what each field is used for and where to use it in queries.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={localProcessing.askFieldMetadataOnUpload !== false}
                  onChange={(e) => {
                    const next = { ...localProcessing, askFieldMetadataOnUpload: e.target.checked };
                    setLocalProcessing(next);
                    localStorage.setItem('docuquery_ask_fields_upload', JSON.stringify(e.target.checked));
                  }}
                  className="w-4 h-4 accent-teal-600 rounded"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: BACKEND SERVER & NETLIFY DEPLOYMENT */}
      {activeTab === 'server' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              Permanent Backend & Netlify Deployment Setup
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Fix the backend URL permanently so your live Netlify frontend never loses connection.
            </p>
          </div>

          {/* Why URL Changes Alert Banner */}
          <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
            <div className="font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Why does the Backend URL keep changing?</span>
            </div>
            <p className="leading-relaxed text-slate-700 dark:text-slate-300">
              When running locally with quick tunnels (like default <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 font-mono">ngrok</code> or <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 font-mono">trycloudflare</code>), a new random URL is generated every time the tunnel restarts. To make your Netlify site permanently stable, choose one of the permanent solutions below.
            </p>
          </div>

          {/* Active Backend Connection Card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Target Backend API Endpoint</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      {getCustomBackendUrl()
                        ? 'Browser Override'
                        : getEnvBackendUrl()
                        ? 'Netlify Env (VITE_API_URL)'
                        : 'Same-Origin Proxy (/api)'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Active Base:{' '}
                    <strong className="text-teal-700 dark:text-teal-300 font-semibold">
                      {getBackendServerUrl() ? `${getBackendServerUrl()}/api` : '/api (Same Origin / Netlify Proxy)'}
                    </strong>
                  </div>
                </div>
              </div>

              {serverSavedSuccess && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-fadeIn">
                  <Check className="w-4 h-4" /> Server URL Saved!
                </span>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Custom Backend Server URL
                </label>
                {getCustomBackendUrl() && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    (Saved in your browser localStorage)
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={backendUrlInput}
                  onChange={(e) => setBackendUrlInput(e.target.value)}
                  placeholder="e.g. https://your-server.onrender.com or https://your-name.ngrok-free.app"
                  className="flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={async () => {
                    setServerTesting(true);
                    setServerTestResult(null);
                    const res = await api.testBackendConnection(backendUrlInput);
                    setServerTestResult(res);
                    setServerTesting(false);
                  }}
                  disabled={serverTesting}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {serverTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Test Connection</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBackendServerUrl(backendUrlInput);
                    setServerSavedSuccess(true);
                    setTimeout(() => setServerSavedSuccess(false), 2500);
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  Save URL
                </button>
              </div>

              {/* Quick Presets & Clear Override */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Actions:</span>
                <button
                  type="button"
                  onClick={() => {
                    const ngrokUrl = 'https://crinkliest-mirna-loftier.ngrok-free.dev';
                    setBackendUrlInput(ngrokUrl);
                    setBackendServerUrl(ngrokUrl);
                    setServerSavedSuccess(true);
                    setTimeout(() => setServerSavedSuccess(false), 2500);
                  }}
                  className="px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-semibold transition-colors cursor-pointer border border-teal-200 dark:border-teal-800"
                >
                  ⚡ Use Live Ngrok (crinkliest-mirna-loftier.ngrok-free.dev)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearBackendServerUrl();
                    setBackendUrlInput(getEnvBackendUrl() || '');
                    setServerSavedSuccess(true);
                    setTimeout(() => setServerSavedSuccess(false), 2500);
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                >
                  Reset / Clear Browser Override
                </button>
                {getEnvBackendUrl() && (
                  <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                    (Netlify env default is <code className="font-mono text-teal-600 dark:text-teal-400">{getEnvBackendUrl()}</code>)
                  </span>
                )}
              </div>

              {/* Test Result Callout */}
              {serverTestResult && (
                <div className={`mt-3 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  serverTestResult.success
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                    : 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
                }`}>
                  {serverTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{serverTestResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Step-by-Step Permanent Solutions Walkthrough */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Option 1: Render (Recommended Cloud Backend) */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
                  <Server className="w-4 h-4 shrink-0" />
                  <span>Option 1: Render (100% Free 24/7)</span>
                </div>
                <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full inline-block">
                  RECOMMENDED PERMANENT FIX
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Deploy the Node backend to <strong>Render.com</strong> once. It runs in the cloud 24/7 (no laptop needed) and gives a fixed permanent HTTPS URL that never changes!
                </p>
                <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <li>Push your code to GitHub.</li>
                  <li>In <a href="https://render.com" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline font-semibold">Render.com</a>, click <strong>New Web Service</strong> & connect your repo.</li>
                  <li>Build Command: <code className="font-mono text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">npm run build:server</code></li>
                  <li>Start Command: <code className="font-mono text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">npm start</code></li>
                  <li>Copy your permanent Render URL (e.g. <code className="font-mono text-teal-600 text-[11px]">https://your-app.onrender.com</code>).</li>
                </ol>
              </div>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                Then set this URL in Netlify Environment Variables.
              </div>
            </div>

            {/* Option 2: Free Static Ngrok Domain (For Local Dev) */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
                  <Terminal className="w-4 h-4 shrink-0" />
                  <span>Option 2: Ngrok Static Domain</span>
                </div>
                <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full inline-block">
                  PERMANENT FOR LOCAL BACKEND
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Ngrok gives <strong>1 free static domain</strong> to every free account so your URL never changes even when restarting your Mac!
                </p>
                <ol className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <li>Visit <a href="https://dashboard.ngrok.com/cloud-edge/domains" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline font-semibold">dashboard.ngrok.com</a> and claim your free domain.</li>
                  <li>Copy your static domain (e.g. <code className="font-mono text-[11px] text-teal-600">my-app.ngrok-free.app</code>).</li>
                  <li>In your terminal or <code className="font-mono text-[11px]">.env</code>: set <code className="font-mono text-[11px]">NGROK_DOMAIN=my-app.ngrok-free.app</code>.</li>
                  <li>Run <code className="font-mono text-[11px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">./start.sh</code>. It connects to the exact same static domain every time!</li>
                </ol>
              </div>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                Your backend URL will stay permanent across restarts.
              </div>
            </div>

            {/* Option 3: Netlify Configuration */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>Option 3: Netlify Setup</span>
                </div>
                <div className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-full inline-block">
                  LINKING NETLIFY TO BACKEND
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  How to link your Netlify site to your permanent backend URL:
                </p>
                <div className="text-xs text-slate-700 dark:text-slate-300 space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 leading-relaxed">
                  <div>
                    <strong>Method A (Netlify Env Var):</strong>
                    <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                      In Netlify Site Settings &rarr; <em>Environment variables</em>, add:
                      <code className="block mt-1 font-mono text-[10px] p-1.5 bg-slate-200 dark:bg-slate-700 rounded text-teal-700 dark:text-teal-300">
                        VITE_API_URL=https://your-backend.onrender.com
                      </code>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                    <strong>Method B (Netlify API Proxy):</strong>
                    <div className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                      Uncomment the redirect in <code className="font-mono text-[10px]">netlify.toml</code> to proxy <code className="font-mono text-[10px]">/api/*</code> directly with zero CORS.
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                Deploy with Netlify Drop or connected Git repo.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
