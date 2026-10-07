import React from 'react';
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { StoredFile, FileType } from '../../types/index.js';

interface FileProcessingPipelineProps {
  file: StoredFile;
  onAskQuestions?: (file: StoredFile) => void;
  onViewDetails?: (file: StoredFile) => void;
}

export const FileProcessingPipeline: React.FC<FileProcessingPipelineProps> = ({
  file,
  onAskQuestions,
  onViewDetails
}) => {
  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'csv':
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'pdf':
      case 'docx':
      case 'txt':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'json':
      case 'md':
        return <FileCode className="w-5 h-5 text-purple-500" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-amber-500" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  const isComplete = file.status === 'ready';
  const isError = file.status === 'error';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 shadow-xs transition-all">
      {/* File Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
            {getFileIcon(file.type)}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              {file.name}
              <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {file.type}
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {(file.size / (1024 * 1024)).toFixed(2)} MB • Uploaded {new Date(file.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Status indicator badge */}
        <div>
          {isComplete ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ✓ Ready to ask questions
            </span>
          ) : isError ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              Processing failed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
              Processing pipeline...
            </span>
          )}
        </div>
      </div>

      {/* 5-Step Pipeline Grid */}
      <div className="py-4">
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 flex items-center justify-between">
          <span>Processing Pipeline</span>
          <span className="text-[11px] text-teal-600 dark:text-teal-400">
            {isComplete ? 'All 5 stages completed' : 'Optimizing structure & embeddings'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {file.pipelineSteps.map((step, idx) => {
            const isStepCompleted = step.status === 'completed';
            const isStepRunning = step.status === 'running';
            const isStepError = step.status === 'error';

            return (
              <div
                key={step.id}
                className={`p-3 rounded-lg border transition-all ${
                  isStepCompleted
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                    : isStepRunning
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30 shadow-xs'
                    : isStepError
                    ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Stage {idx + 1}
                  </span>
                  {isStepCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : isStepRunning ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  ) : isStepError ? (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                  )}
                </div>

                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {step.label}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-snug">
                  {step.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer */}
      {isComplete && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {file.schema ? (
              <span>Structured: {file.schema.columnCount} columns detected • {file.schema.rowCount.toLocaleString()} rows ready for instant SQL querying</span>
            ) : file.documentStats ? (
              <span>Document: {file.documentStats.pages} pages • {file.documentStats.sectionsCount} sections indexed in hybrid vector space</span>
            ) : (
              <span>Indexed and ready for natural-language Q&A</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onViewDetails && (
              <button
                onClick={() => onViewDetails(file)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                View Details
              </button>
            )}
            {onAskQuestions && (
              <button
                onClick={() => onAskQuestions(file)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask Questions
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

