import React from 'react';
import {
  FolderKanban,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { StoredFile } from '../../types/index.js';

interface CollectionsViewProps {
  files: StoredFile[];
  onStartChatWithFiles: (files: StoredFile[]) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  files,
  onStartChatWithFiles
}) => {
  const tabularFiles = files.filter(f => ['csv', 'xlsx', 'xls', 'json'].includes(f.type));
  const docFiles = files.filter(f => ['pdf', 'docx', 'txt', 'md', 'pptx'].includes(f.type));

  const collections = [
    {
      id: 'col-all',
      title: 'All Active Documents',
      description: 'Synchronized cross-file analysis across all uploaded workspace assets.',
      matchedFiles: files,
      color: 'from-teal-500 to-emerald-600'
    },
    ...(tabularFiles.length > 0 ? [{
      id: 'col-tabular',
      title: 'Spreadsheets & Structured Data',
      description: 'Tabular datasets, records, columns, and metric aggregations.',
      matchedFiles: tabularFiles,
      color: 'from-blue-500 to-indigo-600'
    }] : []),
    ...(docFiles.length > 0 ? [{
      id: 'col-docs',
      title: 'Documents & Reports',
      description: 'Full-text reports, executive briefs, and textual documentation.',
      matchedFiles: docFiles,
      color: 'from-purple-500 to-pink-600'
    }] : [])
  ];

  if (files.length === 0) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6 animate-fadeIn text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center mx-auto mb-4 border border-teal-200 dark:border-teal-800/40">
          <FolderKanban className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">No collections yet</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Upload files to group them into intelligent collections for synchronized multi-file querying and synthesis.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-teal-600" />
            Curated Collections
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Group related files for synchronized multi-file querying and synthesis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {collections.map((col) => {
          const matchedFiles = col.matchedFiles;

          return (
            <div
              key={col.id}
              className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${col.color} text-white flex items-center justify-center mb-4 shadow-sm`}>
                  <FolderKanban className="w-5 h-5" />
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                  {col.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {col.description}
                </p>

                <div className="mt-4 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Included Files ({matchedFiles.length})
                  </div>
                  {matchedFiles.slice(0, 5).map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {f.type === 'csv' || f.type === 'xlsx' ? (
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                      )}
                      <span className="truncate">{f.name}</span>
                    </div>
                  ))}
                  {matchedFiles.length > 5 && (
                    <div className="text-[11px] text-slate-400 italic pl-1">
                      + {matchedFiles.length - 5} more files
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <button
                  onClick={() => onStartChatWithFiles(matchedFiles)}
                  disabled={matchedFiles.length === 0}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Ask Collection
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
