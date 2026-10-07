import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  ArrowLeft,
  Sparkles,
  Download,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  Hash,
  Layers,
  FileCheck,
  SlidersHorizontal,
  Search,
  ExternalLink,
  Key
} from 'lucide-react';
import { StoredFile, FileType } from '../../types/index.js';

interface FileDetailViewProps {
  file: StoredFile;
  onBack: () => void;
  onStartChat: (file: StoredFile) => void;
  onRename: (file: StoredFile) => void;
  onDelete: (fileId: string) => void;
  onConfigureFields?: (file: StoredFile) => void;
}

export const FileDetailView: React.FC<FileDetailViewProps> = ({
  file,
  onBack,
  onStartChat,
  onRename,
  onDelete,
  onConfigureFields
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schema' | 'sample' | 'pipeline'>('overview');
  const [sampleSearch, setSampleSearch] = useState('');

  const getFileIcon = (type: FileType) => {
    switch (type) {
      case 'csv':
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="w-6 h-6 text-emerald-500" />;
      case 'pdf':
      case 'docx':
      case 'txt':
        return <FileText className="w-6 h-6 text-blue-500" />;
      case 'json':
      case 'md':
        return <FileCode className="w-6 h-6 text-purple-500" />;
      case 'image':
        return <ImageIcon className="w-6 h-6 text-amber-500" />;
      default:
        return <FileText className="w-6 h-6 text-slate-500" />;
    }
  };

  const handleDownload = () => {
    // Generate synthetic file payload for download
    let content = '';
    if (file.schema) {
      const headers = file.schema.columns.map(c => c.name).join(',');
      const rows = file.schema.sampleRows.map(r => Object.values(r).join(',')).join('\n');
      content = `${headers}\n${rows}`;
    } else if (file.documentStats) {
      content = file.documentStats.sections.map(s => `## ${s.heading}\n\n${s.text}`).join('\n\n');
    } else {
      content = file.ocrText || 'File extracted representation';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Back button & Primary Action Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Files
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onRename(file)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Rename
          </button>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button
            onClick={() => onDelete(file.id)}
            className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          {file.schema && (
            <button
              onClick={() => onConfigureFields?.(file)}
              className="px-3 py-1.5 rounded-lg border border-teal-500/30 bg-teal-50 dark:bg-teal-950/40 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors flex items-center gap-1.5"
              title="Configure what each field means and how to use it"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
              Configure Fields
            </button>
          )}
          <button
            onClick={() => onStartChat(file)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Start Chat
          </button>
        </div>
      </div>

      {/* File Header Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              {getFileIcon(file.type)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {file.name}
                </h1>
                <span className="font-mono uppercase text-xs px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  {file.type}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  Ready to Query
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(file.uploadDate).toLocaleDateString()} at {new Date(file.uploadDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px] text-slate-400">{file.mimeType}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex items-center gap-3">
            {file.schema && (
              <>
                <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Rows</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {file.schema.rowCount.toLocaleString()}
                  </div>
                </div>
                <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Columns</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {file.schema.columnCount}
                  </div>
                </div>
              </>
            )}
            {file.documentStats && (
              <>
                <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Pages</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {file.documentStats.pages}
                  </div>
                </div>
                <div className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                  <div className="text-xs text-slate-400">Sections</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">
                    {file.documentStats.sectionsCount}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-teal-500 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Overview & Structure
        </button>
        {file.schema && (
          <>
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'schema'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Columns & Schema ({file.schema.columnCount})
            </button>
            <button
              onClick={() => setActiveTab('sample')}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === 'sample'
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Sample Records
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* If Tabular */}
          {file.schema && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-emerald-500" />
                    Numeric Metrics
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                    {file.schema.columns.filter(c => c.type === 'numeric').length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {file.schema.columns.filter(c => c.type === 'numeric').map((c) => (
                    <span key={c.name} className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      {c.name}
                    </span>
                  ))}
                  {file.schema.columns.filter(c => c.type === 'numeric').length === 0 && (
                    <span className="text-xs text-slate-400 italic">No numeric metrics</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Date / Time Fields
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">
                    {file.schema.columns.filter(c => c.type === 'date').length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {file.schema.columns.filter(c => c.type === 'date').map((c) => (
                    <span key={c.name} className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                      {c.name}
                    </span>
                  ))}
                  {file.schema.columns.filter(c => c.type === 'date').length === 0 && (
                    <span className="text-xs text-slate-400 italic">No date fields</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-purple-500" />
                    Keys & Identifiers
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold">
                    {file.schema.columns.filter(c => c.role === 'primary_key').length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {file.schema.columns.filter(c => c.role === 'primary_key').map((c) => (
                    <span key={c.name} className="font-mono text-[11px] px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                      {c.name}
                    </span>
                  ))}
                  {file.schema.columns.filter(c => c.role === 'primary_key').length === 0 && (
                    <span className="text-xs text-slate-400 italic">No identifier columns</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-500" />
                    Dimensions & Status
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    {file.schema.columns.filter(c => c.type === 'categorical' && c.role !== 'primary_key').length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {file.schema.columns.filter(c => c.type === 'categorical' && c.role !== 'primary_key').map((c) => (
                    <span key={c.name} className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Document Section Inspector (if PDF / DOCX) */}
          {file.documentStats && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600" />
                Structural Sections & Headings ({file.documentStats.sections.length} extracted)
              </h3>
              <div className="space-y-3">
                {file.documentStats.sections.map((sec) => (
                  <div
                    key={sec.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      <span>{sec.heading}</span>
                      {sec.pageNumber && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          Page {sec.pageNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {sec.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OCR Inspector if Image */}
          {file.ocrText && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-500" />
                OCR Text Extraction
              </h3>
              <pre className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {file.ocrText}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tab: Schema */}
      {activeTab === 'schema' && file.schema && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Detected Schema & User-Defined Field Rules
              </h3>
              <p className="text-xs text-slate-500">
                Definitions and calculation guidance provided for the AI to follow in queries and reports.
              </p>
            </div>
            {onConfigureFields && (
              <button
                onClick={() => onConfigureFields(file)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all self-start sm:self-auto cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Edit Field Definitions
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold uppercase text-slate-500">
                    <th className="py-3 px-4">Column Name</th>
                    <th className="py-3 px-4">Role & Type</th>
                    <th className="py-3 px-4">1. What is the use (Meaning)</th>
                    <th className="py-3 px-4">2. Where & How to use (Rules)</th>
                    <th className="py-3 px-4">Sample Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {file.schema.columns.map((col) => (
                    <tr key={col.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {col.name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-medium font-mono uppercase ${
                            col.type === 'numeric'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : col.type === 'date'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {col.type}
                          </span>
                          {col.role && (
                            <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
                              {col.role}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                        {col.purpose ? (
                          <span className="font-medium text-teal-700 dark:text-teal-300">{col.purpose}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not defined yet</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                        {col.usageGuidance ? (
                          <span className="text-slate-700 dark:text-slate-300">{col.usageGuidance}</span>
                        ) : (
                          <span className="text-slate-400 italic">Default aggregations</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {col.sampleValues.slice(0, 3).join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Sample Rows */}
      {activeTab === 'sample' && file.schema && (() => {
        const filteredSampleRows = file.schema.sampleRows.filter(row => {
          if (!sampleSearch.trim()) return true;
          const q = sampleSearch.toLowerCase();
          return Object.values(row).some(v => String(v).toLowerCase().includes(q));
        });

        const renderCellContent = (val: any, colType?: string) => {
          if (val === undefined || val === null || val === '') {
            return <span className="text-slate-300 dark:text-slate-600 italic">-</span>;
          }
          const str = String(val);
          if (str.startsWith('http://') || str.startsWith('https://')) {
            return (
              <a
                href={str}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline max-w-xs truncate"
                title={str}
              >
                <span className="truncate">{str.replace(/^https?:\/\//, '')}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            );
          }
          if (colType === 'numeric' && typeof val === 'number') {
            return <span className="font-semibold text-emerald-700 dark:text-emerald-400">{val.toLocaleString()}</span>;
          }
          if (colType === 'date') {
            return <span className="font-medium text-blue-700 dark:text-blue-300">{str}</span>;
          }
          return <span>{str}</span>;
        };

        return (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing <strong className="text-slate-900 dark:text-white">{filteredSampleRows.length}</strong> sample records of{' '}
                <strong className="text-slate-900 dark:text-white">{file.schema.rowCount.toLocaleString()}</strong> total dataset records
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sampleSearch}
                  onChange={(e) => setSampleSearch(e.target.value)}
                  placeholder="Filter sample records..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-[11px] font-semibold uppercase text-slate-500">
                    {file.schema.columns.map((col) => (
                      <th key={col.name} className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {col.type === 'date' && <Calendar className="w-3 h-3 text-blue-500" />}
                          {col.type === 'numeric' && <Hash className="w-3 h-3 text-emerald-500" />}
                          {col.role === 'primary_key' && <Key className="w-3 h-3 text-purple-500" />}
                          <span>{col.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSampleRows.length === 0 ? (
                    <tr>
                      <td colSpan={file.schema.columns.length} className="py-8 text-center text-slate-400">
                        No sample records matching "{sampleSearch}".
                      </td>
                    </tr>
                  ) : (
                    filteredSampleRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-mono">
                        {file.schema?.columns.map((col) => (
                          <td key={col.name} className="py-2.5 px-4 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {renderCellContent(row[col.name], col.type)}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
