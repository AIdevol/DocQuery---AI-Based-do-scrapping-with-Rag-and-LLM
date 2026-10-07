import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileText,
  FileCode,
  Image as ImageIcon,
  Search,
  MessageSquare,
  Eye,
  Trash2,
  Edit2,
  ArrowUpDown,
  Plus,
  SlidersHorizontal
} from 'lucide-react';
import { StoredFile, FileType } from '../../types/index.js';

interface FilesListViewProps {
  files: StoredFile[];
  onSelectFile: (file: StoredFile) => void;
  onStartChatWithFile: (file: StoredFile) => void;
  onRenameFile: (file: StoredFile) => void;
  onDeleteFile: (fileId: string) => void;
  onUploadClick: () => void;
  onConfigureFields?: (file: StoredFile) => void;
}

export const FilesListView: React.FC<FilesListViewProps> = ({
  files,
  onSelectFile,
  onStartChatWithFile,
  onRenameFile,
  onDeleteFile,
  onUploadClick,
  onConfigureFields
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<'name' | 'size' | 'date'>('date');
  const [sortAsc, setSortAsc] = useState(false);

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

  const filteredFiles = files
    .filter((f) => {
      if (filterType === 'tabular') {
        return ['csv', 'xlsx', 'xls'].includes(f.type);
      }
      if (filterType === 'docs') {
        return ['pdf', 'docx', 'txt', 'md'].includes(f.type);
      }
      if (filterType === 'images') {
        return f.type === 'image';
      }
      return true;
    })
    .filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'size') cmp = a.size - b.size;
      else cmp = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
      return sortAsc ? cmp : -cmp;
    });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6 animate-fadeIn">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Workspace Files
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your indexed datasets, spreadsheets, and document archives.
          </p>
        </div>

        <button
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Upload New File
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All Files ({files.length})
          </button>
          <button
            onClick={() => setFilterType('tabular')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'tabular'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Tabular / Sheets
          </button>
          <button
            onClick={() => setFilterType('docs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'docs'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => setFilterType('images')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterType === 'images'
                ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Images / OCR
          </button>
        </div>

        {/* Search Field */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by file name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
      </div>

      {/* Files Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4">
                <button
                  onClick={() => {
                    setSortField('name');
                    setSortAsc(!sortAsc);
                  }}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                >
                  File Name
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">
                <button
                  onClick={() => {
                    setSortField('size');
                    setSortAsc(!sortAsc);
                  }}
                  className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                >
                  Size
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="py-3 px-4">Representation / Schema</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  No files matching the specified criteria.
                </td>
              </tr>
            ) : (
              filteredFiles.map((file) => (
                <tr
                  key={file.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  onClick={() => onSelectFile(file)}
                >
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                        {getFileIcon(file.type)}
                      </div>
                      <span className="group-hover:text-teal-600 transition-colors">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono uppercase text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {file.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {file.schema ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        {file.schema.columnCount} cols • {file.schema.rowCount.toLocaleString()} rows
                      </span>
                    ) : file.documentStats ? (
                      <span className="text-blue-700 dark:text-blue-400 font-medium">
                        {file.documentStats.pages} pages • {file.documentStats.sectionsCount} sections
                      </span>
                    ) : (
                      <span className="text-slate-400">OCR / Text chunks</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                      Ready
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onStartChatWithFile(file)}
                        className="p-1.5 rounded-lg text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 transition-colors"
                        title="Start Chat with this file"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      {file.schema && (
                        <button
                          onClick={() => onConfigureFields?.(file)}
                          className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                          title="Configure Field Definitions & Usage Rules"
                        >
                          <SlidersHorizontal className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onSelectFile(file)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="View File Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRenameFile(file)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Rename file"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteFile(file.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
