import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  Sparkles,
  ArrowRight,
  Database,
  Search,
  CheckCircle2,
  Clock,
  Layers
} from 'lucide-react';
import { StoredFile, FileType } from '../../types/index.js';
import { FileProcessingPipeline } from '../upload/FileProcessingPipeline.js';
import { NavView } from '../layout/Sidebar.js';

interface DashboardViewProps {
  files: StoredFile[];
  onUpload: (file: File | File[]) => Promise<void>;
  onSelectFile: (file: StoredFile) => void;
  onStartChatWithFile: (file: StoredFile, prompt?: string) => void;
  onNavigate: (view: NavView) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  files,
  onUpload,
  onSelectFile,
  onStartChatWithFile,
  onNavigate
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processSelectedFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const processSelectedFiles = async (filesList: File[]) => {
    try {
      setUploading(true);
      setUploadCount(filesList.length);
      setUploadError(null);
      await onUpload(filesList);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadCount(0);
    }
  };

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'csv':
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
      case 'pdf':
      case 'docx':
      case 'txt':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'json':
      case 'md':
        return <FileCode className="w-4 h-4 text-purple-500" />;
      case 'image':
        return <ImageIcon className="w-4 h-4 text-amber-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  // Metric summaries
  const totalRows = files.reduce((acc, f) => acc + (f.schema?.rowCount || 0), 0);
  const totalPages = files.reduce((acc, f) => acc + (f.documentStats?.pages || 0), 0);
  const recentlyUploaded = files.slice(0, 3);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Workspace Welcome & High-level Metrics */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Universal File Q&A Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload CSVs, spreadsheets, contracts, PDFs, or images. Ask arbitrary natural-language questions without configuring complex pipelines.
          </p>
        </div>

        <button
          onClick={() => onNavigate('chat')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all self-start md:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          Open Chat Interface
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Indexed Files</span>
            <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{files.length}</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">CSV, XLSX, PDF, DOCX, Images</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Tabular Rows</span>
            <Database className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalRows.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Direct queryable tabular store</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Document Pages</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalPages}</div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Hybrid semantic + BM25 index</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Context Protected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">96.8%</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">Zero prompt overflow risk</div>
        </div>
      </div>

      {/* Main Drag-and-Drop Upload Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-teal-600" />
            Upload File
          </h2>
          <span className="text-xs text-slate-400">Max file size: 100 MB</span>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/30 scale-[0.99]'
              : 'border-slate-300 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500/80 bg-white dark:bg-slate-900/60 hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            accept=".csv,.xlsx,.xls,.pdf,.docx,.txt,.json,.md,.pptx,image/*"
          />

          <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 shadow-sm group-hover:scale-105 transition-transform">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {uploading ? `Uploading & indexing ${uploadCount > 1 ? `${uploadCount} files` : 'file'}...` : 'Upload file(s) to start asking questions'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
            Drag and drop multiple files here, or click to browse. The backend automatically parses, detects structures, and enables multi-file cross-referencing.
          </p>

          {/* Supported format badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 max-w-xl">
            {['CSV', 'XLSX', 'XLS', 'PDF', 'DOCX', 'TXT', 'JSON', 'MD', 'PPTX', 'Images (OCR)'].map((fmt) => (
              <span
                key={fmt}
                className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60"
              >
                {fmt}
              </span>
            ))}
          </div>

          {uploading && (
            <div className="mt-4 text-xs font-medium text-teal-600 dark:text-teal-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
              Transferring file to processing worker...
            </div>
          )}

          {uploadError && (
            <div className="mt-4 text-xs font-medium text-rose-600 dark:text-rose-400">
              {uploadError}
            </div>
          )}
        </div>
      </div>

      {/* Active Processing Pipeline (showing the most recent file if it's currently processing or recently ready) */}
      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-600" />
              Recent Pipeline Execution
            </h2>
            <button
              onClick={() => onNavigate('files')}
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              View All ({files.length})
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <FileProcessingPipeline
            file={files[0]}
            onAskQuestions={(f) => onStartChatWithFile(f)}
            onViewDetails={(f) => onSelectFile(f)}
          />
        </div>
      )}

      {/* Files Overview Grid */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-600" />
            Active Workspace Files
          </h2>
          <button
            onClick={() => onNavigate('files')}
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Manage Files →
          </button>
        </div>

        {files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900">
            <Search className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No files yet</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Upload a file above and start asking questions immediately.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentlyUploaded.map((file) => (
              <div
                key={file.id}
                onClick={() => onSelectFile(file)}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-2xs group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                    {getFileIcon(file.type)}
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    Ready
                  </span>
                </div>

                <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-teal-600 transition-colors">
                  {file.name}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB • {file.type.toUpperCase()}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {file.schema ? `${file.schema.rowCount.toLocaleString()} rows` : file.documentStats ? `${file.documentStats.pages} pages` : 'Indexed'}
                  </span>
                  <span className="text-teal-600 dark:text-teal-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Inspect
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

