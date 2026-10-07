import React, { useState } from 'react';
import {
  History,
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  Calendar,
  ArrowRight,
  Download,
  Cpu
} from 'lucide-react';
import { ChatSession, StoredFile } from '../../types/index.js';

interface ChatHistoryViewProps {
  sessions: ChatSession[];
  files: StoredFile[];
  onOpenSession: (session: ChatSession) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  onStartNewChat: () => void;
}

export const ChatHistoryView: React.FC<ChatHistoryViewProps> = ({
  sessions,
  files,
  onOpenSession,
  onRenameSession,
  onDeleteSession,
  onStartNewChat
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = sessions.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStartRename = (session: ChatSession) => {
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleExportSession = (session: ChatSession) => {
    const data = JSON.stringify(session, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${session.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <History className="w-6 h-6 text-teal-600" />
            Recent Questions & Chat History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review past analytical threads, auditable calculations, and cross-file summaries.
          </p>
        </div>

        <button
          onClick={onStartNewChat}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto"
        >
          <MessageSquare className="w-4 h-4" />
          Start New Conversation
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search through past questions or answer contents..."
          className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 shadow-2xs"
        />
      </div>

      {/* Sessions List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <History className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No chat sessions found</h4>
            <p className="text-xs text-slate-400 mt-1">Ask any question in Chat to start recording your queries.</p>
          </div>
        ) : (
          filtered.map((session) => {
            const sessionFiles = files.filter(f => session.fileIds.includes(f.id));
            const lastMsg = session.messages[session.messages.length - 1];

            return (
              <div
                key={session.id}
                onClick={() => onOpenSession(session)}
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs transition-all cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-3">
                    {editingId === session.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(session.id)}
                          className="px-2 py-1 text-sm font-bold border rounded bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveRename(session.id)}
                          className="px-2 py-1 text-xs bg-teal-600 text-white rounded font-medium"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                        {session.title}
                      </h3>
                    )}

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {session.messages.length} messages
                    </span>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleStartRename(session)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleExportSession(session)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Export conversation as JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteSession(session.id)}
                      className="p-1.5 rounded text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Last message preview */}
                {lastMsg && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 my-2 font-mono">
                    {lastMsg.content.slice(0, 180)}...
                  </p>
                )}

                {/* Session footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {new Date(session.updatedAt).toLocaleDateString()} at {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {session.modelId && (
                      <span className="flex items-center gap-1 font-mono text-[10px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded">
                        <Cpu className="w-3 h-3" />
                        {session.modelId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {sessionFiles.map((sf) => (
                      <span key={sf.id} className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                        {sf.name}
                      </span>
                    ))}
                    <ArrowRight className="w-3.5 h-3.5 text-teal-500 group-hover:translate-x-1 transition-transform ml-1" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
