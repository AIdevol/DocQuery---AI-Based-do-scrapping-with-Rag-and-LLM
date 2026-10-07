import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Sparkles,
  Check,
  X,
  Hash,
  Calendar,
  Layers,
  Key,
  Filter,
  EyeOff,
  Search,
  Loader2,
  Info
} from 'lucide-react';
import { StoredFile, ColumnInfo } from '../../types/index.js';
import { api } from '../../services/api.js';

interface FieldDefinitionModalProps {
  file: StoredFile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFile: StoredFile) => void;
  askOnUpload: boolean;
  onToggleAskOnUpload: (enabled: boolean) => void;
}

interface EditableField {
  name: string;
  type: ColumnInfo['type'];
  sampleValues: (string | number | boolean | null)[];
  purpose: string;
  usageGuidance: string;
  role: 'metric' | 'dimension' | 'primary_key' | 'date' | 'filter' | 'ignore';
}

export const FieldDefinitionModal: React.FC<FieldDefinitionModalProps> = ({
  file,
  isOpen,
  onClose,
  onSave,
  askOnUpload,
  onToggleAskOnUpload
}) => {
  const [fields, setFields] = useState<EditableField[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (file && file.schema && file.schema.columns) {
      setFields(
        file.schema.columns.map((col) => {
          let defaultRole: EditableField['role'] = 'dimension';
          if (col.role) {
            defaultRole = col.role;
          } else if (col.type === 'numeric') {
            defaultRole = 'metric';
          } else if (col.type === 'date') {
            defaultRole = 'date';
          } else if (
            col.name.toLowerCase().includes('id') ||
            col.name.toLowerCase().includes('code') ||
            col.name.toLowerCase() === 'key'
          ) {
            defaultRole = 'primary_key';
          }

          return {
            name: col.name,
            type: col.type,
            sampleValues: col.sampleValues || [],
            purpose: col.purpose || '',
            usageGuidance: col.usageGuidance || '',
            role: defaultRole
          };
        })
      );
      setSuggestionMessage(null);
    }
  }, [file]);

  if (!isOpen || !file || !file.schema) return null;

  const handleFieldChange = (
    index: number,
    key: 'purpose' | 'usageGuidance' | 'role',
    value: string
  ) => {
    setFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleAutoSuggest = async () => {
    try {
      setIsSuggesting(true);
      setSuggestionMessage(null);
      const res = await api.suggestFileFields(file.id);
      if (res && res.columns && Array.isArray(res.columns)) {
        setFields((prev) =>
          prev.map((col) => {
            const match = res.columns.find(
              (c) => c.name.toLowerCase() === col.name.toLowerCase()
            );
            if (match) {
              return {
                ...col,
                purpose: match.purpose || col.purpose,
                usageGuidance: match.usageGuidance || col.usageGuidance,
                role: (match.role as any) || col.role
              };
            }
            return col;
          })
        );
        setSuggestionMessage('✨ AI suggestions generated! You can review or customize them below.');
      }
    } catch (err: any) {
      setSuggestionMessage('Could not generate AI suggestions. You can manually enter field rules.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const columnsPayload = fields.map((f) => ({
        name: f.name,
        purpose: f.purpose,
        usageGuidance: f.usageGuidance,
        role: f.role
      }));

      const updatedFile = await api.updateFileFields(file.id, columnsPayload);
      onSave(updatedFile);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save field definitions');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredFields = fields.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleIcon = (role: EditableField['role']) => {
    switch (role) {
      case 'metric':
        return <Hash className="w-3.5 h-3.5 text-emerald-500" />;
      case 'date':
        return <Calendar className="w-3.5 h-3.5 text-blue-500" />;
      case 'primary_key':
        return <Key className="w-3.5 h-3.5 text-amber-500" />;
      case 'filter':
        return <Filter className="w-3.5 h-3.5 text-indigo-500" />;
      case 'ignore':
        return <EyeOff className="w-3.5 h-3.5 text-slate-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-purple-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mt-0.5">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Field Definitions & Usage Rules
                </h2>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                  Scraped & Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tell the AI what each column means and how to use it in calculations, reports, and queries for{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">{file.name}</span>{' '}
                ({file.schema.rowCount.toLocaleString()} rows, {file.schema.columnCount} columns).
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoSuggest}
              disabled={isSuggesting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-linear-to-r from-teal-500/10 to-indigo-500/10 hover:from-teal-500/20 hover:to-indigo-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 transition-all cursor-pointer disabled:opacity-50"
              title="Automatically generate recommended definitions and rules using Claude"
            >
              {isSuggesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  ✨ Auto-Suggest with AI
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Suggestion Toast / Banner */}
        {suggestionMessage && (
          <div className="px-6 py-2.5 bg-teal-50 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-900/60 text-xs text-teal-800 dark:text-teal-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>{suggestionMessage}</span>
          </div>
        )}

        {/* Filter bar if many fields */}
        {fields.length > 4 && (
          <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search columns or roles..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              Showing {filteredFields.length} of {fields.length} columns
            </div>
          </div>
        )}

        {/* Field List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 divide-y divide-slate-100 dark:divide-slate-800/80">
          {filteredFields.map((field) => {
            const originalIndex = fields.findIndex((f) => f.name === field.name);
            return (
              <div key={field.name} className="pt-4 first:pt-0 space-y-3">
                {/* Field Header */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                      {field.name}
                    </span>
                    <span
                      className={`font-mono text-[11px] uppercase font-semibold px-2 py-0.5 rounded ${
                        field.type === 'numeric'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : field.type === 'date'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                          : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                      }`}
                    >
                      {field.type}
                    </span>
                    {field.sampleValues && field.sampleValues.length > 0 && (
                      <span className="text-[11px] text-slate-400 max-w-sm truncate">
                        Samples: {field.sampleValues.filter(v => v !== '' && v !== null).slice(0, 3).map(String).join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Role Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-400">Role:</span>
                    <div className="relative">
                      <select
                        value={field.role}
                        onChange={(e) =>
                          handleFieldChange(originalIndex, 'role', e.target.value)
                        }
                        className="pl-2 pr-7 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-500 cursor-pointer"
                      >
                        <option value="metric">Metric (Sum / Measure)</option>
                        <option value="dimension">Dimension (Category / Group)</option>
                        <option value="primary_key">Primary Key / ID</option>
                        <option value="date">Date / Time</option>
                        <option value="filter">Filter / Status</option>
                        <option value="ignore">Ignore / Skip</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                        {getRoleIcon(field.role)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2 Explicit Asking Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pl-1">
                  {/* Question 1 */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span className="text-teal-600 dark:text-teal-400 font-bold">1.</span>
                      <span>What is the use of this field? (Meaning / Definition)</span>
                    </label>
                    <input
                      type="text"
                      value={field.purpose}
                      onChange={(e) =>
                        handleFieldChange(originalIndex, 'purpose', e.target.value)
                      }
                      placeholder={`e.g., Description or business meaning of ${field.name}...`}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>

                  {/* Question 2 */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">2.</span>
                      <span>Where and how to use this field? (Calculations & Rules)</span>
                    </label>
                    <input
                      type="text"
                      value={field.usageGuidance}
                      onChange={(e) =>
                        handleFieldChange(originalIndex, 'usageGuidance', e.target.value)
                      }
                      placeholder={`e.g., Use as primary metric for totals; sum over time; filter criteria...`}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={askOnUpload}
              onChange={(e) => onToggleAskOnUpload(e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500"
            />
            <span>Always ask for field definitions when uploading CSV or Excel files</span>
          </label>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Skip for Now
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-linear-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 shadow-md shadow-teal-500/20 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Field Rules...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save & Apply Field Rules
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
