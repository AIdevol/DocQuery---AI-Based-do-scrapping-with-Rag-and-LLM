import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Paperclip,
  X,
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  Plus,
  Trash2,
  Cpu,
  Loader2,
  Upload,
  UploadCloud,
  Layers,
  ChevronDown,
  Check,
  SlidersHorizontal,
  RotateCcw,
  Copy,
  Terminal,
  Info
} from 'lucide-react';
import {
  ChatMessage,
  StoredFile,
  FileType,
  AIProviderConfig,
  PromptConfiguration,
  DEFAULT_RAG_SYSTEM_PROMPT
} from '../../types/index.js';
import { AnswerCard } from './AnswerCard.js';

interface UniversalChatViewProps {
  files: StoredFile[];
  activeFileIds: string[];
  onToggleFileContext: (fileId: string) => void;
  onSelectAllFiles: () => void;
  onClearFilesContext: () => void;
  messages: ChatMessage[];
  onSendMessage: (question: string) => Promise<void>;
  isLoading: boolean;
  activeProvider?: AIProviderConfig;
  providers?: AIProviderConfig[];
  onSelectDefaultProvider?: (id: string) => Promise<void>;
  onSelectFileDetail: (file: StoredFile) => void;
  onClearChat: () => void;
  onUploadFile?: (file: File | File[]) => Promise<void>;
  onConfigureFields?: (file: StoredFile) => void;
  promptSettings?: PromptConfiguration;
  onUpdatePromptSettings?: (p: Partial<PromptConfiguration>) => Promise<void>;
}

export const UniversalChatView: React.FC<UniversalChatViewProps> = ({
  files,
  activeFileIds,
  onToggleFileContext,
  onSelectAllFiles,
  onClearFilesContext,
  messages,
  onSendMessage,
  isLoading,
  activeProvider,
  providers,
  onSelectDefaultProvider,
  onSelectFileDetail,
  onClearChat,
  onUploadFile,
  onConfigureFields,
  promptSettings,
  onUpdatePromptSettings
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  // Prompt & Instructions Modal State
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [modalTab, setModalTab] = useState<'instructions' | 'rag_prompt'>('instructions');
  const [tempInstructions, setTempInstructions] = useState(promptSettings?.customInstructions || '');
  const [tempEnableInstructions, setTempEnableInstructions] = useState(promptSettings?.enableCustomInstructions ?? true);
  const [tempSystemPrompt, setTempSystemPrompt] = useState(promptSettings?.systemPrompt || DEFAULT_RAG_SYSTEM_PROMPT);
  const [tempEnableCustomPrompt, setTempEnableCustomPrompt] = useState(promptSettings?.enableCustomPrompt ?? false);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [copiedRagPrompt, setCopiedRagPrompt] = useState(false);

  useEffect(() => {
    if (promptSettings) {
      setTempInstructions(promptSettings.customInstructions);
      setTempEnableInstructions(promptSettings.enableCustomInstructions);
      setTempSystemPrompt(promptSettings.systemPrompt || DEFAULT_RAG_SYSTEM_PROMPT);
      setTempEnableCustomPrompt(promptSettings.enableCustomPrompt);
    }
  }, [promptSettings]);

  const handleSavePromptModal = async () => {
    if (!onUpdatePromptSettings) return;
    setIsSavingPrompt(true);
    try {
      await onUpdatePromptSettings({
        customInstructions: tempInstructions,
        enableCustomInstructions: tempEnableInstructions,
        systemPrompt: tempSystemPrompt,
        enableCustomPrompt: tempEnableCustomPrompt
      });
      setShowPromptModal(false);
    } catch (err) {
      console.error('Failed to update prompt settings', err);
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query || isLoading) return;

    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputQuery(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onUploadFile) {
      const selectedFiles = Array.from(e.target.files);
      try {
        setIsUploading(true);
        await onUploadFile(selectedFiles);
      } catch (err) {
        console.error('Upload failed', err);
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleChatDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFiles(true);
  };

  const handleChatDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFiles(false);
  };

  const handleChatDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadFile) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      try {
        setIsUploading(true);
        await onUploadFile(droppedFiles);
      } catch (err) {
        console.error('Drop upload failed', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'csv':
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />;
      case 'pdf':
      case 'docx':
      case 'txt':
        return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case 'json':
      case 'md':
        return <FileCode className="w-3.5 h-3.5 text-purple-500" />;
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const activeFiles = files.filter(f => activeFileIds.includes(f.id));

  return (
    <div
      onDragOver={handleChatDragOver}
      onDragLeave={handleChatDragLeave}
      onDrop={handleChatDrop}
      className="relative flex flex-col h-full flex-1 min-h-0 bg-slate-50/40 dark:bg-slate-950"
    >
      {/* Sleek Drag & Drop Overlay */}
      {isDraggingFiles && (
        <div className="absolute inset-0 z-50 bg-teal-600/10 backdrop-blur-xs border-2 border-dashed border-teal-500 rounded-2xl m-3 flex flex-col items-center justify-center pointer-events-none transition-all">
          <UploadCloud className="w-12 h-12 text-teal-600 dark:text-teal-400 animate-bounce mb-2" />
          <p className="text-sm font-semibold text-teal-950 dark:text-teal-100">Drop files to attach to this chat</p>
          <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">Multi-file upload supported (CSV, Excel, PDF, Word, Images, JSON)</p>
        </div>
      )}

      {/* Hidden File Input for direct attach */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        accept=".csv,.xlsx,.xls,.pdf,.docx,.txt,.json,.md,.pptx,image/*"
      />

      {/* Clean, Simple Top Bar */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
        {/* Active File Context Chip(s) */}
        <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-[70vw] sm:max-w-none">
          {activeFiles.length === 0 ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-teal-600 transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attach File(s)</span>
            </button>
          ) : (
            <>
              {activeFiles.length > 1 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-2xs shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Multi-File Active ({activeFiles.length})</span>
                </div>
              )}
              {activeFiles.map((f) => (
                <div
                  key={f.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-xs font-medium text-teal-800 dark:text-teal-200 shadow-2xs shrink-0"
                >
                  {getFileIcon(f.type)}
                  <span
                    onClick={() => onSelectFileDetail(f)}
                    className="cursor-pointer hover:underline truncate max-w-[150px]"
                  >
                    {f.name}
                  </span>
                  {f.schema && onConfigureFields && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfigureFields(f);
                      }}
                      className="text-teal-600 hover:text-teal-900 dark:hover:text-teal-100 transition-colors p-0.5 rounded hover:bg-teal-100/60 dark:hover:bg-teal-900/60"
                      title="Configure Field Definitions & Usage Rules"
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => onToggleFileContext(f.id)}
                    className="text-teal-500 hover:text-teal-800 dark:hover:text-teal-100 transition-colors"
                    title="Remove from context"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-teal-600 transition-colors shrink-0"
                title="Attach more files"
              >
                <Plus className="w-3 h-3" />
                <span>Attach More</span>
              </button>
            </>
          )}

          {/* Add / switch file dropdown if files exist in workspace */}
          {files.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowFilePicker(!showFilePicker)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 transition-colors"
                title="Select from workspace files"
              >
                <Plus className="w-3 h-3" />
                <span>Files ({files.length})</span>
              </button>

              {showFilePicker && (
                <div className="absolute left-0 mt-2 w-64 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg z-30 animate-fadeIn">
                  <div className="flex items-center justify-between pb-1.5 px-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                    <span>Active Context</span>
                    <div className="flex items-center gap-2">
                      <button onClick={onSelectAllFiles} className="text-teal-600 hover:underline">All</button>
                      <button onClick={onClearFilesContext} className="text-slate-400 hover:underline">Clear</button>
                    </div>
                  </div>

                  <div className="mt-1 max-h-48 overflow-y-auto space-y-0.5">
                    {files.map((file) => {
                      const isSelected = activeFileIds.includes(file.id);
                      return (
                        <div
                          key={file.id}
                          onClick={() => onToggleFileContext(file.id)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-medium'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {getFileIcon(file.type)}
                            <span className="truncate">{file.name}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-teal-600 focus:ring-0"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {isUploading && (
            <span className="inline-flex items-center gap-1.5 text-xs text-teal-600 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Processing file...
            </span>
          )}
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Prompt & Instructions Quick Access */}
          <button
            onClick={() => setShowPromptModal(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
              (promptSettings?.enableCustomInstructions && promptSettings.customInstructions.trim()) || promptSettings?.enableCustomPrompt
                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title="Custom Instructions & Server RAG Prompt"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline">Instructions</span>
            {((promptSettings?.enableCustomInstructions && promptSettings.customInstructions.trim()) || promptSettings?.enableCustomPrompt) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          {messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Provider selector pill */}
          <div className="relative">
            <button
              onClick={() => setShowProviderDropdown(!showProviderDropdown)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-mono text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Change active AI Provider"
            >
              <Cpu className="w-3 h-3 text-teal-500" />
              <span className="font-semibold">{activeProvider?.name || 'AI'}</span>
              <span className="text-slate-400 hidden sm:inline">({activeProvider?.defaultModel || 'auto'})</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showProviderDropdown && (
              <div className="absolute right-0 mt-2 w-64 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-30 animate-fadeIn">
                <div className="text-[11px] font-semibold text-slate-400 px-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  Select AI Provider
                </div>
                <div className="mt-1 space-y-0.5 max-h-52 overflow-y-auto">
                  {(providers || []).map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectDefaultProvider?.(p.id);
                        setShowProviderDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        p.id === activeProvider?.id
                          ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="text-left truncate">
                        <div className="font-semibold truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{p.defaultModel}</div>
                      </div>
                      {p.id === activeProvider?.id && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0 ml-1" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 min-h-0">
        {messages.length === 0 ? (
          <div className="max-w-md mx-auto py-12 sm:py-20 text-center space-y-5 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Universal File Q&A
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Upload any file and ask arbitrary questions. The engine automatically analyzes structure, runs calculations, or extracts answers.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                Upload a File to Begin
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div key={msg.id}>
                {msg.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-xl px-4 py-2.5 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm leading-relaxed whitespace-pre-wrap font-normal">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 sm:gap-4 py-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <AnswerCard
                        message={msg}
                        onRegenerate={() => onSendMessage(msg.content)}
                        onSelectSource={(fId) => {
                          const f = files.find(file => file.id === fId);
                          if (f) onSelectFileDetail(f);
                        }}
                        onSelectFollowUp={(q) => onSendMessage(q)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-3 sm:gap-4 py-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-600 dark:bg-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1.5 py-2.5 px-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Clean Chat Input Box */}
      <div className="p-2.5 sm:p-4 border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 p-1.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
            {/* Direct File Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              title="Attach files (multi-file supported)"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder={
                isUploading
                  ? "Uploading & indexing files..."
                  : activeFiles.length > 1
                  ? `Ask anything across all ${activeFiles.length} attached files...`
                  : activeFiles.length === 1
                  ? `Ask anything about ${activeFiles[0].name}...`
                  : "Attach file(s) or ask any question about your data..."
              }
              className="flex-1 max-h-32 resize-none bg-transparent px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden leading-relaxed"
            />

            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="p-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-xs transition-all cursor-pointer"
              title="Send"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="mt-1.5 hidden sm:flex items-center justify-between text-[11px] text-slate-400 px-2">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">Shift+Enter</kbd> for newline</span>
          </div>
        </form>
      </div>

      {/* Prompt & Instructions Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    LLM Instructions & Server RAG Prompt
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Personalize your LLM reply rules or customize the live server RAG template.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Switcher */}
            <div className="px-4 sm:px-5 pt-3 border-b border-slate-100 dark:border-slate-800 flex gap-2">
              <button
                onClick={() => setModalTab('instructions')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  modalTab === 'instructions'
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Personalized Instructions</span>
              </button>
              <button
                onClick={() => setModalTab('rag_prompt')}
                className={`pb-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  modalTab === 'rag_prompt'
                    ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Server RAG Prompt Template</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {modalTab === 'instructions' ? (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Give the AI directives for this chat (role, formatting, rules, tone).
                    </span>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempEnableInstructions}
                        onChange={(e) => setTempEnableInstructions(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  {/* Presets */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Quick Presets
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { name: '💼 Executive', text: 'Provide a concise, high-level executive summary first. Focus on top key findings, numerical ROI/revenue impact, and actionable business takeaways.' },
                        { name: '📊 Data Analyst', text: 'Act as a Senior Data Analyst. Structure findings using clear markdown tables with bold headers. Highlight statistical distributions, anomalies, and percentages.' },
                        { name: '⚡ Bullet Points', text: 'Answer directly in structured bullet points only. Never include conversational filler or preamble. Highlight primary metrics in bold.' },
                        { name: '⚖️ Auditor', text: 'Examine all numbers with strict compliance and auditing standards. Flag negative variances and potential data integrity gaps.' },
                        { name: '👨‍💻 Developer', text: 'Provide exact technical answers. Include code snippets, SQL queries, or JSON schemas where relevant.' }
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setTempInstructions(preset.text);
                            setTempEnableInstructions(true);
                          }}
                          className="px-2 py-0.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Instructions / Requirements
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">{tempInstructions.length} chars</span>
                        {tempInstructions && (
                          <button
                            type="button"
                            onClick={() => setTempInstructions('')}
                            className="text-[11px] text-slate-400 hover:text-rose-500"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      rows={5}
                      value={tempInstructions}
                      onChange={(e) => setTempInstructions(e.target.value)}
                      placeholder="e.g. Always format answers in bullet points. Highlight amounts in bold. If data has dates, show chronologically."
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs leading-relaxed focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      View or modify the server's live RAG prompt template.
                    </span>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tempEnableCustomPrompt}
                        onChange={(e) => setTempEnableCustomPrompt(e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                      />
                      <span>Use Custom Prompt</span>
                    </label>
                  </div>

                  <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    tempEnableCustomPrompt
                      ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300'
                      : 'border-teal-200 dark:border-teal-900/60 bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-300'
                  }`}>
                    <Info className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
                    <span className="text-[11px]">
                      {tempEnableCustomPrompt
                        ? 'Custom Prompt is active for all subsequent questions.'
                        : 'Default Server RAG Prompt is active. Modify and toggle custom prompt to override.'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Live RAG Base Prompt Box
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">{tempSystemPrompt.length} chars</span>
                    </div>
                    <textarea
                      rows={8}
                      value={tempSystemPrompt}
                      onChange={(e) => {
                        setTempSystemPrompt(e.target.value);
                        setTempEnableCustomPrompt(true);
                      }}
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 text-emerald-400 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      spellCheck={false}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setTempSystemPrompt(DEFAULT_RAG_SYSTEM_PROMPT);
                        setTempEnableCustomPrompt(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset to Server Default</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(tempSystemPrompt);
                        setCopiedRagPrompt(true);
                        setTimeout(() => setCopiedRagPrompt(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedRagPrompt ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedRagPrompt ? 'Copied!' : 'Copy Prompt'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="px-3.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePromptModal}
                disabled={isSavingPrompt}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingPrompt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save & Apply to Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
