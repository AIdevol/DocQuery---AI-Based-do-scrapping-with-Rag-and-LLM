import React, { useState, useEffect } from 'react';
import { Sidebar, NavView } from './components/layout/Sidebar.js';
import { TopNav } from './components/layout/TopNav.js';
import { DashboardView } from './components/dashboard/DashboardView.js';
import { FilesListView } from './components/files/FilesListView.js';
import { FileDetailView } from './components/files/FileDetailView.js';
import { UniversalChatView } from './components/chat/UniversalChatView.js';
import { SettingsView } from './components/settings/SettingsView.js';
import { ChatHistoryView } from './components/history/ChatHistoryView.js';
import { CollectionsView } from './components/collections/CollectionsView.js';
import { FieldDefinitionModal } from './components/files/FieldDefinitionModal.js';
import { api } from './services/api.js';
import {
  StoredFile,
  ChatMessage,
  ChatSession,
  AIProviderConfig,
  AppSettings,
  DEFAULT_RAG_SYSTEM_PROMPT
} from './types/index.js';

export const App: React.FC = () => {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Navigation & Active View
  const [currentView, setCurrentView] = useState<NavView>('chat');
  const [selectedFile, setSelectedFile] = useState<StoredFile | null>(null);

  // Backend Connectivity & Settings Tab State
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'providers' | 'model' | 'prompt' | 'embedding' | 'storage' | 'processing' | 'server'>('providers');

  // App Data State
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [providers, setProviders] = useState<AIProviderConfig[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeFileIds, setActiveFileIds] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Field Definition / Asking Window state
  const [annotatingFile, setAnnotatingFile] = useState<StoredFile | null>(null);
  const [pendingAnnotateId, setPendingAnnotateId] = useState<string | null>(null);
  const [askFieldMetadataOnUpload, setAskFieldMetadataOnUpload] = useState<boolean>(() => {
    const saved = localStorage.getItem('docuquery_ask_fields_upload');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const handleToggleAskOnUpload = (enabled: boolean) => {
    setAskFieldMetadataOnUpload(enabled);
    localStorage.setItem('docuquery_ask_fields_upload', JSON.stringify(enabled));
    setSettings(prev => ({
      ...prev,
      processing: {
        ...prev.processing,
        askFieldMetadataOnUpload: enabled
      }
    }));
  };

  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    model: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      contextStrategy: 'auto_compact',
      topKRetrieval: 5,
      rerankingEnabled: true,
      timeoutMs: 30000,
      retryCount: 3
    },
    embedding: {
      providerId: 'prov-openai',
      modelName: 'text-embedding-3-small',
      dimension: 1536,
      batchSize: 64
    },
    storage: {
      provider: 'local',
      localStorageDir: './storage/documents',
      bucket: 'company-file-lakehouse-prod',
      region: 'ap-south-1'
    },
    processing: {
      chunkSize: 512,
      chunkOverlap: 64,
      topKRetrieval: 5,
      rerankingEnabled: true,
      ocrEnabled: true,
      maxFileSizeMB: 100,
      processingTimeoutSeconds: 60,
      enableAutoDataTypeInference: true,
      askFieldMetadataOnUpload: true
    },
    prompt: {
      systemPrompt: DEFAULT_RAG_SYSTEM_PROMPT,
      customInstructions: '',
      enableCustomPrompt: false,
      enableCustomInstructions: true
    }
  });

  // Sync Dark Mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Initial Data Fetching
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      // Proactively test backend connection
      try {
        await api.getHealth();
        setBackendConnected(true);
      } catch (e) {
        console.warn('Backend server is unreachable or returned invalid response', e);
        setBackendConnected(false);
      }

      const [filesData, provsData, sessionsData, settingsData] = await Promise.all([
        api.getFiles().catch(() => []),
        api.getProviders().catch(() => []),
        api.getChatHistory().catch(() => []),
        api.getSettings().catch(() => null)
      ]);

      setFiles(filesData);
      setProviders(provsData);
      setChatSessions(sessionsData);
      if (settingsData) setSettings(settingsData);

      // Default active files to the first two files
      if (filesData.length > 0) {
        setActiveFileIds([filesData[0].id]);
      }
    } catch (err) {
      console.error('Failed to load initial workspace data', err);
      setBackendConnected(false);
    }
  };

  // Poll processing files until ready
  useEffect(() => {
    const hasUnfinished = files.some(f => f.status !== 'ready' && f.status !== 'error');
    if (!hasUnfinished && !pendingAnnotateId) return;

    const interval = setInterval(async () => {
      try {
        const updatedFiles = await api.getFiles();
        setFiles(updatedFiles);
        if (selectedFile) {
          const fresh = updatedFiles.find(f => f.id === selectedFile.id);
          if (fresh) setSelectedFile(fresh);
        }

        if (pendingAnnotateId) {
          const freshTabular = updatedFiles.find(f => f.id === pendingAnnotateId);
          if (freshTabular && freshTabular.status === 'ready' && freshTabular.schema && freshTabular.schema.columns.length > 0) {
            setAnnotatingFile(freshTabular);
            setPendingAnnotateId(null);
          }
        }
      } catch (e) {
        // ignore polling errors
      }
    }, 800);

    return () => clearInterval(interval);
  }, [files, selectedFile, pendingAnnotateId]);

  // Handlers
  const handleUpload = async (fileOrFiles: File | File[]) => {
    const filesToUpload = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
    if (filesToUpload.length === 0) return;
    const newFiles = await api.uploadFiles(filesToUpload);
    setFiles(prev => [...newFiles, ...prev]);
    // Automatically include uploaded files in active query context
    setActiveFileIds(prev => {
      const newIds = newFiles.map(f => f.id);
      const combined = [...newIds, ...prev];
      return Array.from(new Set(combined));
    });

    // If CSV or Excel uploaded and option enabled, open asking window immediately!
    if (askFieldMetadataOnUpload) {
      const tabular = newFiles.find(f => ['csv', 'xlsx', 'xls'].includes(f.type));
      if (tabular) {
        if (tabular.schema && tabular.schema.columns.length > 0) {
          setAnnotatingFile(tabular);
        } else {
          setPendingAnnotateId(tabular.id);
        }
      }
    }
  };

  const handleSaveFieldDefinitions = (updatedFile: StoredFile) => {
    setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
    if (selectedFile?.id === updatedFile.id) {
      setSelectedFile(updatedFile);
    }
  };

  const handleSelectFile = (file: StoredFile) => {
    setSelectedFile(file);
    setCurrentView('file-detail');
  };

  const handleStartChatWithFile = (file: StoredFile, prompt?: string) => {
    setActiveFileIds([file.id]);
    setCurrentView('chat');
    if (prompt) {
      handleSendMessage(prompt, [file.id]);
    }
  };

  const handleStartChatWithFiles = (targetFiles: StoredFile[]) => {
    setActiveFileIds(targetFiles.map(f => f.id));
    setCurrentView('chat');
  };

  const handleToggleFileContext = (fileId: string) => {
    setActiveFileIds(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const handleSelectAllFiles = () => {
    setActiveFileIds(files.map(f => f.id));
  };

  const handleClearFilesContext = () => {
    setActiveFileIds([]);
  };

  const handleSendMessage = async (question: string, overrideFileIds?: string[]) => {
    const targetIds = overrideFileIds || (activeFileIds.length > 0 ? activeFileIds : files.map(f => f.id));
    const activeProv = providers.find(p => p.isDefault) || providers[0];

    // Maintain or generate sessionId so turns are grouped in chat session
    const currentSessionId = activeSessionId || `session-${Date.now()}`;
    if (!activeSessionId) {
      setActiveSessionId(currentSessionId);
    }

    const userMsg: ChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString()
    };

    // Extract prior conversational history from current chatMessages
    const history = chatMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const assistantMsg = await api.sendChat({
        question,
        fileIds: targetIds,
        providerId: activeProv?.id,
        modelId: activeProv?.defaultModel,
        sessionId: currentSessionId,
        history,
        customInstructions: settings.prompt?.enableCustomInstructions ? settings.prompt.customInstructions : undefined,
        systemPrompt: settings.prompt?.enableCustomPrompt ? settings.prompt.systemPrompt : undefined
      });

      setChatMessages(prev => [...prev, assistantMsg]);

      // Keep chat history sessions synchronized
      api.getChatHistory().then(freshSessions => {
        setChatSessions(freshSessions);
      }).catch(() => {});
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Query execution encountered an issue**\n\n${err.message || 'Unable to process question at this time. Please check your AI provider configuration.'}`,
          timestamp: new Date().toISOString(),
          statsBadge: 'Execution error'
        }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRenameFile = async (file: StoredFile) => {
    const newName = prompt('Enter new file name:', file.name);
    if (!newName || newName === file.name) return;
    try {
      const updated = await api.renameFile(file.id, newName);
      setFiles(prev => prev.map(f => f.id === file.id ? updated : f));
      if (selectedFile?.id === file.id) setSelectedFile(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to rename');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to remove this file from your workspace?')) return;
    try {
      await api.deleteFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setActiveFileIds(prev => prev.filter(id => id !== fileId));
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
        setCurrentView('files');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  // Provider actions
  const handleAddProvider = async (p: Partial<AIProviderConfig>) => {
    await api.addProvider(p);
    const freshProviders = await api.getProviders();
    setProviders(freshProviders);
  };

  const handleUpdateProvider = async (id: string, p: Partial<AIProviderConfig>) => {
    await api.updateProvider(id, p);
    const freshProviders = await api.getProviders();
    setProviders(freshProviders);
  };

  const handleDeleteProvider = async (id: string) => {
    await api.deleteProvider(id);
    const freshProviders = await api.getProviders();
    setProviders(freshProviders);
  };

  const handleSetDefaultProvider = async (id: string) => {
    await api.setDefaultProvider(id);
    const freshProviders = await api.getProviders();
    setProviders(freshProviders);
  };

  const handleValidateProvider = async (p: Partial<AIProviderConfig>) => {
    return api.validateProvider(p);
  };

  const handleUpdateSettings = async (s: Partial<AppSettings>) => {
    const updated = await api.updateSettings(s);
    setSettings(updated);
  };

  // Chat session actions
  const handleOpenSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setActiveFileIds(session.fileIds);
    setChatMessages(session.messages);
    setCurrentView('chat');
  };

  const handleRenameSession = async (id: string, newTitle: string) => {
    const updated = await api.renameChatSession(id, newTitle);
    setChatSessions(prev => prev.map(s => s.id === id ? updated : s));
  };

  const handleDeleteSession = async (id: string) => {
    await api.deleteChatSession(id);
    setChatSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setChatMessages([]);
    }
  };

  const handleStartNewChat = () => {
    setActiveSessionId(null);
    setChatMessages([]);
    setCurrentView('chat');
  };

  const activeProvider = providers.find(p => p.isDefault) || providers[0];

  return (
    <div className="flex h-screen h-dvh bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* SaaS Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          if (view !== 'file-detail') setSelectedFile(null);
          setCurrentView(view);
          setIsMobileNavOpen(false);
        }}
        filesCount={files.length}
        activeChatSessionsCount={chatSessions.length}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode(!darkMode)}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav
          activeProvider={activeProvider}
          onOpenSettings={(view) => {
            setSettingsInitialTab('providers');
            setCurrentView(view);
            setIsMobileNavOpen(false);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          backendConnected={backendConnected}
          onOpenServerSettings={() => {
            setSettingsInitialTab('server');
            setCurrentView('settings');
            setIsMobileNavOpen(false);
          }}
        />

        <main className="flex-1 overflow-y-auto min-h-0">
          {currentView === 'dashboard' && (
            <DashboardView
              files={files}
              onUpload={handleUpload}
              onSelectFile={handleSelectFile}
              onStartChatWithFile={handleStartChatWithFile}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'files' && (
            <FilesListView
              files={files}
              onSelectFile={handleSelectFile}
              onStartChatWithFile={handleStartChatWithFile}
              onRenameFile={handleRenameFile}
              onDeleteFile={handleDeleteFile}
              onUploadClick={() => setCurrentView('dashboard')}
              onConfigureFields={(file) => setAnnotatingFile(file)}
            />
          )}

          {currentView === 'file-detail' && selectedFile && (
            <FileDetailView
              file={selectedFile}
              onBack={() => setCurrentView('files')}
              onStartChat={handleStartChatWithFile}
              onRename={handleRenameFile}
              onDelete={handleDeleteFile}
              onConfigureFields={(file) => setAnnotatingFile(file)}
            />
          )}

          {currentView === 'chat' && (
            <UniversalChatView
              files={files}
              activeFileIds={activeFileIds}
              onToggleFileContext={handleToggleFileContext}
              onSelectAllFiles={handleSelectAllFiles}
              onClearFilesContext={handleClearFilesContext}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
              activeProvider={activeProvider}
              providers={providers}
              onSelectDefaultProvider={handleSetDefaultProvider}
              onSelectFileDetail={handleSelectFile}
              onClearChat={() => {
                setChatMessages([]);
                setActiveSessionId(null);
              }}
              onUploadFile={handleUpload}
              onConfigureFields={(file) => setAnnotatingFile(file)}
              promptSettings={settings.prompt}
              onUpdatePromptSettings={(p) => handleUpdateSettings({ prompt: { ...settings.prompt, ...p } })}
            />
          )}

          {currentView === 'history' && (
            <ChatHistoryView
              sessions={chatSessions}
              files={files}
              onOpenSession={handleOpenSession}
              onRenameSession={handleRenameSession}
              onDeleteSession={handleDeleteSession}
              onStartNewChat={handleStartNewChat}
            />
          )}

          {currentView === 'collections' && (
            <CollectionsView
              files={files}
              onStartChatWithFiles={handleStartChatWithFiles}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              providers={providers}
              onAddProvider={handleAddProvider}
              onUpdateProvider={handleUpdateProvider}
              onDeleteProvider={handleDeleteProvider}
              onSetDefaultProvider={handleSetDefaultProvider}
              onValidateProvider={handleValidateProvider}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              initialTab={settingsInitialTab}
            />
          )}
        </main>
      </div>

      {/* Field Definition & Usage Rules Modal ("Asking Window") */}
      {annotatingFile && (
        <FieldDefinitionModal
          file={annotatingFile}
          isOpen={true}
          onClose={() => setAnnotatingFile(null)}
          onSave={handleSaveFieldDefinitions}
          askOnUpload={askFieldMetadataOnUpload}
          onToggleAskOnUpload={handleToggleAskOnUpload}
        />
      )}
    </div>
  );
};

