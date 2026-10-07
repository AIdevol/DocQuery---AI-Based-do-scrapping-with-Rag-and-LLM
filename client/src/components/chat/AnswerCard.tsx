import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  FileText,
  FileSpreadsheet,
  Info
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ChatMessage } from '../../types/index.js';

interface AnswerCardProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onSelectSource?: (fileId: string) => void;
  onSelectFollowUp?: (question: string) => void;
}

type MarkdownBlock =
  | { type: 'header'; level: number; text: string }
  | { type: 'code'; language: string; code: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'hr' }
  | { type: 'paragraph'; text: string };

export const AnswerCard: React.FC<AnswerCardProps> = ({
  message,
  onRegenerate,
  onSelectSource,
  onSelectFollowUp
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [tableCopiedIdx, setTableCopiedIdx] = useState<number | null>(null);
  const [expandedTables, setExpandedTables] = useState<Record<number, boolean>>({});
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(message.feedback || null);
  const [showChart, setShowChart] = useState(true);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const handleCopyTable = (headers: string[], rows: string[][], idx: number) => {
    const all = [headers, ...rows];
    const text = all.map(r => r.join('\t')).join('\n');
    navigator.clipboard.writeText(text);
    setTableCopiedIdx(idx);
    setTimeout(() => setTableCopiedIdx(null), 2000);
  };

  const toggleTableExpand = (idx: number) => {
    setExpandedTables(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Robust token-based inline markdown parser
  const renderInlineMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;

    type InlineToken =
      | { type: 'code'; value: string }
      | { type: 'bold'; value: string }
      | { type: 'italic'; value: string }
      | { type: 'link'; text: string; url: string }
      | { type: 'text'; value: string };

    const tokens: InlineToken[] = [];
    let i = 0;

    while (i < text.length) {
      // 1. Code span: `...`
      if (text[i] === '`') {
        const closeIdx = text.indexOf('`', i + 1);
        if (closeIdx !== -1) {
          tokens.push({ type: 'code', value: text.slice(i + 1, closeIdx) });
          i = closeIdx + 1;
          continue;
        }
      }

      // 2. Link: [text](url)
      if (text[i] === '[') {
        const closeBracket = text.indexOf(']', i + 1);
        if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
          const closeParen = text.indexOf(')', closeBracket + 2);
          if (closeParen !== -1) {
            tokens.push({
              type: 'link',
              text: text.slice(i + 1, closeBracket),
              url: text.slice(closeBracket + 2, closeParen)
            });
            i = closeParen + 1;
            continue;
          }
        }
      }

      // 3. Bold: **...**
      if (text.startsWith('**', i)) {
        let closeIdx = -1;
        let j = i + 2;
        while (j < text.length) {
          if (text[j] === '`') {
            const nextTick = text.indexOf('`', j + 1);
            j = nextTick !== -1 ? nextTick + 1 : j + 1;
          } else if (text.startsWith('**', j)) {
            closeIdx = j;
            break;
          } else {
            j++;
          }
        }
        if (closeIdx !== -1) {
          tokens.push({
            type: 'bold',
            value: text.slice(i + 2, closeIdx)
          });
          i = closeIdx + 2;
          continue;
        }
      }

      // 4. Italic: *...*
      if (text[i] === '*') {
        let closeIdx = -1;
        let j = i + 1;
        while (j < text.length) {
          if (text[j] === '`') {
            const nextTick = text.indexOf('`', j + 1);
            j = nextTick !== -1 ? nextTick + 1 : j + 1;
          } else if (text[j] === '*' && text[j - 1] !== '\\') {
            closeIdx = j;
            break;
          } else {
            j++;
          }
        }
        if (closeIdx !== -1) {
          tokens.push({
            type: 'italic',
            value: text.slice(i + 1, closeIdx)
          });
          i = closeIdx + 1;
          continue;
        }
      }

      // 5. Plain text until next token trigger
      let nextSpecial = i + 1;
      while (
        nextSpecial < text.length &&
        text[nextSpecial] !== '`' &&
        text[nextSpecial] !== '[' &&
        text[nextSpecial] !== '*'
      ) {
        nextSpecial++;
      }
      tokens.push({ type: 'text', value: text.slice(i, nextSpecial) });
      i = nextSpecial;
    }

    return tokens.map((token, idx) => {
      if (token.type === 'code') {
        return (
          <code
            key={idx}
            className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-teal-800 dark:text-teal-300 border border-slate-200/70 dark:border-slate-700/70"
          >
            {token.value}
          </code>
        );
      }
      if (token.type === 'bold') {
        return (
          <strong key={idx} className="font-semibold text-slate-900 dark:text-white">
            {renderInlineMarkdown(token.value)}
          </strong>
        );
      }
      if (token.type === 'italic') {
        return (
          <em key={idx} className="italic text-slate-700 dark:text-slate-300">
            {renderInlineMarkdown(token.value)}
          </em>
        );
      }
      if (token.type === 'link') {
        return (
          <a
            key={idx}
            href={token.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 dark:text-teal-400 underline underline-offset-2 hover:text-teal-700 dark:hover:text-teal-300"
          >
            {token.text}
          </a>
        );
      }
      return token.value;
    });
  };

  const isNumericValue = (val: string): boolean => {
    const clean = val.replace(/,/g, '').replace(/%/g, '').trim();
    return /^-?\d+(?:\.\d+)?$/.test(clean);
  };

  const isNumericColumn = (colIdx: number, rows: string[][]): boolean => {
    if (rows.length === 0) return false;
    return rows.slice(0, 5).every(r => {
      const cell = r[colIdx];
      return cell !== undefined && isNumericValue(cell);
    });
  };

  const formatTableCell = (val: string): string => {
    const trimmed = val.trim();
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed).toLocaleString();
    }
    return val;
  };

  // Parse markdown into sequential block elements
  const parseMarkdownBlocks = (content: string): MarkdownBlock[] => {
    const lines = content.split('\n');
    const blocks: MarkdownBlock[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      // Code blocks
      if (trimmed.startsWith('```')) {
        const language = trimmed.slice(3).trim();
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        if (i < lines.length) i++; // skip closing ```
        blocks.push({
          type: 'code',
          language,
          code: codeLines.join('\n')
        });
        continue;
      }

      // Horizontal Rule
      if (/^(?:---|\*\*\*|___)$/.test(trimmed)) {
        blocks.push({ type: 'hr' });
        i++;
        continue;
      }

      // Headers (#, ##, ###)
      if (trimmed.startsWith('#')) {
        const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
          blocks.push({
            type: 'header',
            level: match[1].length,
            text: match[2]
          });
          i++;
          continue;
        }
      }

      // Blockquotes
      if (trimmed.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
          i++;
        }
        blocks.push({
          type: 'quote',
          text: quoteLines.join('\n')
        });
        continue;
      }

      // Tables (Pipe table or TSV lines)
      if ((trimmed.startsWith('|') && trimmed.includes('|')) || trimmed.includes('\t')) {
        const rawRows: string[][] = [];
        const isPipe = trimmed.startsWith('|');

        while (i < lines.length) {
          const cur = lines[i].trim();
          if (!cur) break;

          if (isPipe) {
            if (!cur.startsWith('|')) break;
            // Ignore separator row like | --- | --- | or |:---|:---|
            if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(cur)) {
              i++;
              continue;
            }
            const cells = cur
              .split('|')
              .slice(1, -1)
              .map(c => c.trim());
            if (cells.length > 0) rawRows.push(cells);
          } else {
            if (!cur.includes('\t')) break;
            const cells = cur.split('\t').map(c => c.trim());
            if (cells.length > 0) rawRows.push(cells);
          }
          i++;
        }

        if (rawRows.length > 0) {
          const headers = rawRows[0];
          const rows = rawRows.slice(1);
          blocks.push({
            type: 'table',
            headers,
            rows
          });
          continue;
        }
      }

      // Unordered list (- , * , • )
      if (/^[-*•]\s+/.test(trimmed)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^[-*•]\s+/, ''));
          i++;
        }
        blocks.push({
          type: 'list',
          ordered: false,
          items
        });
        continue;
      }

      // Ordered list (1. , 2. )
      if (/^\d+\.\s+/.test(trimmed)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
          i++;
        }
        blocks.push({
          type: 'list',
          ordered: true,
          items
        });
        continue;
      }

      // Regular Paragraph
      const paraLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !lines[i].trim().startsWith('```') &&
        !lines[i].trim().startsWith('#') &&
        !lines[i].trim().startsWith('>') &&
        !/^[-*•]\s+/.test(lines[i].trim()) &&
        !/^\d+\.\s+/.test(lines[i].trim()) &&
        !(lines[i].trim().startsWith('|') && lines[i].trim().includes('|')) &&
        !lines[i].trim().includes('\t') &&
        !/^(?:---|\*\*\*|___)$/.test(lines[i].trim())
      ) {
        paraLines.push(lines[i].trim());
        i++;
      }

      if (paraLines.length > 0) {
        blocks.push({
          type: 'paragraph',
          text: paraLines.join('\n')
        });
      }
    }

    return blocks;
  };

  const blocks = parseMarkdownBlocks(message.content);

  // Resolve the correct dataKey: viz.data items always use 'value'; yAxisKey is a label override
  const resolveDataKey = (viz: NonNullable<typeof message.visualization>): string => {
    if (!viz.data || viz.data.length === 0) return 'value';
    const firstItem = viz.data[0];
    // Prefer 'value' if it exists in data (analyticsEngine always emits { name, value })
    if ('value' in firstItem) return 'value';
    // Fallback: try yAxisKey
    if (viz.yAxisKey && viz.yAxisKey in firstItem) return viz.yAxisKey;
    // Last resort: second key of the object
    const keys = Object.keys(firstItem);
    return keys[1] || keys[0] || 'value';
  };

  // Resolve the x-axis label key: verify it actually exists in the data
  const resolveXKey = (viz: NonNullable<typeof message.visualization>): string => {
    if (!viz.data || viz.data.length === 0) return 'name';
    const firstItem = viz.data[0];
    // Always prefer 'name' if it exists — all engines emit { name, value }
    if ('name' in firstItem) return 'name';
    // If xAxisKey is specified and actually present in data, use it
    if (viz.xAxisKey && viz.xAxisKey in firstItem) return viz.xAxisKey;
    // Last resort: first key of the object
    return Object.keys(firstItem)[0] || 'name';
  };

  // Determine if X-axis labels need rotation (many items or long labels)
  const needsAngle = (data: Record<string, any>[], xKey: string): boolean => {
    if (data.length > 8) return true;
    return data.some(d => String(d[xKey] || '').length > 12);
  };

  const CHART_COLORS = [
    '#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#22c55e'
  ];

  // Render chart if present
  const renderVisualization = () => {
    const viz = message.visualization;
    if (!viz || !viz.data || viz.data.length === 0) return null;

    const dataKey = resolveDataKey(viz);
    const xKey = resolveXKey(viz);
    const rotated = needsAngle(viz.data, xKey);

    return (
      <div className="my-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 overflow-hidden">
        {/* Chart header with toggle */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-700/60">
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">{viz.title}</h4>
            {viz.description && (
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{viz.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowChart(v => !v)}
            className="ml-2 shrink-0 text-[11px] px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {showChart ? 'Hide' : 'Show chart'}
          </button>
        </div>

        {showChart && (
          <div className={`w-full px-1 pt-2 pb-3 ${rotated ? 'h-72 sm:h-80' : 'h-60 sm:h-64'}`}>
            {viz.type === 'bar' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={viz.data}
                  margin={{ top: 8, right: 14, left: -18, bottom: rotated ? 52 : 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.13} />
                  <XAxis
                    dataKey={xKey}
                    tick={{ fontSize: 10 }}
                    angle={rotated ? -38 : 0}
                    textAnchor={rotated ? 'end' : 'middle'}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), viz.title]}
                  />
                  <Bar dataKey={dataKey} radius={[3, 3, 0, 0]}>
                    {viz.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {viz.type === 'line' && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={viz.data}
                  margin={{ top: 8, right: 14, left: -18, bottom: rotated ? 52 : 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.13} />
                  <XAxis
                    dataKey={xKey}
                    tick={{ fontSize: 10 }}
                    angle={rotated ? -38 : 0}
                    textAnchor={rotated ? 'end' : 'middle'}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px' }}
                    formatter={(val: any) => [Number(val).toLocaleString(), viz.title]}
                  />
                  <Line
                    type="monotone"
                    dataKey={dataKey}
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#0d9488' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {viz.type === 'donut' && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={viz.data}
                    cx="50%"
                    cy="48%"
                    innerRadius="38%"
                    outerRadius="62%"
                    paddingAngle={3}
                    dataKey={dataKey}
                    label={({ percent }: { name: string; percent: number }) =>
                      percent > 0.04 ? `${(percent * 100).toFixed(0)}%` : ''
                    }
                    labelLine={false}
                  >
                    {viz.data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', padding: '6px 10px' }}
                    formatter={(val: any) => [Number(val).toLocaleString()]}
                  />
                  <Legend
                    iconSize={9}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                    formatter={(value: string) => value.length > 18 ? value.slice(0, 18) + '…' : value}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full text-sm text-slate-800 dark:text-slate-200 leading-relaxed space-y-3 min-w-0">
      {/* Normal sequential markdown message rendering */}
      {blocks.map((block, idx) => {
        if (block.type === 'paragraph') {
          const lines = block.text.split('\n');
          return (
            <div key={idx} className="space-y-1.5 mb-2.5 last:mb-0">
              {lines.map((l, li) => {
                const trimmed = l.trim();
                // Do NOT show formula lines in chat as requested by user
                if (/^\*?(?:Formula|Calculation):/i.test(trimmed)) {
                  return null;
                }
                // Eliminated values line highlight
                if (/^\*?(?:Eliminated Values|Eliminated):/i.test(trimmed)) {
                  return (
                    <div
                      key={li}
                      className="inline-flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-900/60 my-0.5"
                    >
                      <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>{renderInlineMarkdown(l)}</span>
                    </div>
                  );
                }
                return (
                  <p key={li} className="leading-relaxed">
                    {renderInlineMarkdown(l)}
                  </p>
                );
              })}
            </div>
          );
        }

        if (block.type === 'header') {
          if (block.level === 1) {
            return (
              <h1 key={idx} className="text-xl font-bold text-slate-900 dark:text-white mt-4 mb-2">
                {renderInlineMarkdown(block.text)}
              </h1>
            );
          }
          if (block.level === 2) {
            return (
              <h2 key={idx} className="text-lg font-semibold text-slate-900 dark:text-white mt-3.5 mb-2">
                {renderInlineMarkdown(block.text)}
              </h2>
            );
          }
          return (
            <h3 key={idx} className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white mt-3 mb-1.5">
              {renderInlineMarkdown(block.text)}
            </h3>
          );
        }

        if (block.type === 'table') {
          const isExpanded = Boolean(expandedTables[idx]);
          const totalRows = block.rows.length;
          const displayRows = isExpanded || totalRows <= 10 ? block.rows : block.rows.slice(0, 10);

          return (
            <div key={idx} className="my-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono text-[11px]">
                  {totalRows} {totalRows === 1 ? 'row' : 'rows'}
                </span>
                <button
                  onClick={() => handleCopyTable(block.headers, block.rows, idx)}
                  className="inline-flex items-center gap-1 text-[11px] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Copy table to clipboard"
                >
                  {tableCopiedIdx === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Copy table</span>
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                    <tr>
                      {block.headers.map((h, hi) => {
                        const isNum = isNumericColumn(hi, block.rows);
                        return (
                          <th
                            key={hi}
                            className={`py-2 px-3 whitespace-nowrap ${isNum ? 'text-right' : 'text-left'}`}
                          >
                            {renderInlineMarkdown(h)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayRows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {row.map((cell, ci) => {
                          const isNum = isNumericColumn(ci, block.rows);
                          return (
                            <td
                              key={ci}
                              className={`py-2 px-3 whitespace-nowrap text-slate-800 dark:text-slate-200 ${
                                isNum ? 'text-right font-mono text-xs' : 'text-left'
                              }`}
                            >
                              {renderInlineMarkdown(formatTableCell(cell))}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalRows > 10 && (
                <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Showing {displayRows.length} of {totalRows} rows
                  </span>
                  <button
                    onClick={() => toggleTableExpand(idx)}
                    className="text-teal-600 dark:text-teal-400 hover:underline font-medium cursor-pointer"
                  >
                    {isExpanded ? 'Show less' : `Show all ${totalRows}`}
                  </button>
                </div>
              )}
            </div>
          );
        }

        if (block.type === 'list') {
          if (block.ordered) {
            return (
              <ol key={idx} className="my-2 space-y-1 pl-5 list-decimal text-slate-800 dark:text-slate-200">
                {block.items.map((item, ii) => (
                  <li key={ii} className="leading-relaxed">
                    {renderInlineMarkdown(item)}
                  </li>
                ))}
              </ol>
            );
          }
          return (
            <ul key={idx} className="my-2 space-y-1 pl-5 list-disc text-slate-800 dark:text-slate-200">
              {block.items.map((item, ii) => (
                <li key={ii} className="leading-relaxed">
                  {renderInlineMarkdown(item)}
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'code') {
          return (
            <div key={idx} className="my-3 rounded-lg overflow-hidden border border-slate-800 bg-[#1e1e2e]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] text-slate-400 text-xs font-mono border-b border-slate-800">
                <span>{block.language || 'code'}</span>
                <button
                  onClick={() => handleCopyCode(block.code, idx)}
                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer text-[11px]"
                  title="Copy code"
                >
                  {copiedCodeIdx === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote
              key={idx}
              className="my-2.5 pl-3.5 py-1 border-l-2 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 italic"
            >
              {renderInlineMarkdown(block.text)}
            </blockquote>
          );
        }

        if (block.type === 'hr') {
          return <hr key={idx} className="my-3 border-slate-200 dark:border-slate-800" />;
        }

        return null;
      })}

      {/* Visualizations (if attached) */}
      {renderVisualization()}

      {/* Subtle Collapsible Sources (if available) */}
      {message.sources && message.sources.length > 0 && (
        <div className="pt-1">
          <button
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <FileText className="w-3 h-3" />
            <span>Sources ({message.sources.length})</span>
            {sourcesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {sourcesOpen && (
            <div className="mt-2 space-y-1 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
              {message.sources.map((s, sIdx) => (
                <div key={sIdx} className="flex items-center justify-between gap-2 py-0.5">
                  <span
                    onClick={() => onSelectSource && onSelectSource(s.fileId)}
                    className="font-medium text-teal-600 dark:text-teal-400 hover:underline cursor-pointer truncate"
                  >
                    {s.fileName}
                  </span>
                  <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                    {s.locationDescription || (s.rowsAnalyzed ? `${s.rowsAnalyzed.toLocaleString()} rows` : '')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggested Follow-up Prompts (clean chips like ChatGPT) */}
      {message.followUps && message.followUps.length > 0 && onSelectFollowUp && (
        <div className="pt-2 flex flex-wrap gap-1.5 items-center">
          {message.followUps.map((fu, fIdx) => (
            <button
              key={fIdx}
              onClick={() => onSelectFollowUp(fu)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800/80 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 border border-slate-200/80 dark:border-slate-700/80 transition-all cursor-pointer text-left"
            >
              <span className="text-teal-600 dark:text-teal-400 font-bold">↳</span>
              <span>{fu}</span>
            </button>
          ))}
        </div>
      )}

      {/* ChatGPT-style Action Toolbar at bottom: Copy, Regenerate, Thumbs */}
      <div className="flex items-center gap-1 pt-1 text-slate-400 dark:text-slate-500">
        <button
          onClick={handleCopyMessage}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          title="Copy message"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            title="Regenerate response"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
          className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            feedback === 'like' ? 'text-emerald-500' : 'hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          title="Good response"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
          className={`p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
            feedback === 'dislike' ? 'text-rose-500' : 'hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          title="Bad response"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
