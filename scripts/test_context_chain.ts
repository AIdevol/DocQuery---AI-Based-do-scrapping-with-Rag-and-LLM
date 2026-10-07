import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { StructuredFilter, StructuredQuery } from '../server/src/types/index.js';

const file = fileProcessorService.getAllFiles()[0];
const columns = file.schema!.columns;

const MONTH_NAMES_LIST = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];

function isFollowUp(q: string): boolean {
  const qLower = q.toLowerCase().trim();
  if (
    qLower.startsWith('how many total leads') ||
    qLower.includes('how many total leads') ||
    qLower.includes('total count of leads') ||
    qLower.includes('unique lead source') ||
    qLower.includes('unique state') ||
    qLower.includes('unique customer type') ||
    qLower.includes('total lead types') ||
    qLower.includes('schema') ||
    qLower.includes('columns') ||
    qLower.includes('missing value')
  ) {
    return false;
  }
  const hasMonth = MONTH_NAMES_LIST.some(m => new RegExp(`\\b${m}\\b`, 'i').test(qLower));
  const isEllipticalPrefix = /^(what about|how about|and in|and for|and what about|what of|in|for|and)\b/i.test(qLower);
  const isGroupDirective = /^(by|grouped by|per|group by|breakdown by)\b/i.test(qLower);
  const isSuperlative = /^(who|which agent|which one|which state|which source|which dealer|which)\s+(has|sold|is|had|the most|highest|top)\b/i.test(qLower) || qLower.includes('who sold the most') || qLower.includes('which agent sold the most');
  const isSubsetCount = /^how many (are|of those|for|in)\b/i.test(qLower) || /^out of those\b/i.test(qLower);

  return isEllipticalPrefix || isGroupDirective || isSuperlative || isSubsetCount || (hasMonth && !qLower.includes('lead') && !qLower.includes('how many total'));
}

function applyFollowUp(question: string, baseSQ: StructuredQuery): StructuredQuery | null {
  const qLower = question.toLowerCase().trim();
  const baseFilters: StructuredFilter[] = baseSQ.filters ? JSON.parse(JSON.stringify(baseSQ.filters)) : [];
  const hasMonth = MONTH_NAMES_LIST.some(m => new RegExp(`\\b${m}\\b`, 'i').test(qLower));
  const isSuperlative = /^(who|which agent|which one|which state|which source|which dealer|which)\s+(has|sold|is|had|the most|highest|top)\b/i.test(qLower) || qLower.includes('who sold the most') || qLower.includes('which agent sold the most');
  const isGroupDirective = /^(by|grouped by|per|group by|breakdown by)\b/i.test(qLower);

  // Month change
  if (hasMonth) {
    const newFilters = (semanticLayer as any).extractFilters(qLower, columns);
    const newDateFilter = newFilters.find((f: any) => f.operator === 'date_range' || f.operator === 'contains');
    if (newDateFilter) {
      const targetDateCol = baseFilters.find(f => f.column.toLowerCase().includes('date') || f.column.toLowerCase().includes('time'))?.column
        || columns.find(c => c.name.toLowerCase() === 'date sold')?.name
        || newDateFilter.column;
      newDateFilter.column = targetDateCol;

      const nonDateFilters = baseFilters.filter(f => !f.column.toLowerCase().includes('date') && !f.column.toLowerCase().includes('time'));
      const hadSoldFilter = baseFilters.some(f => f.column.toLowerCase() === 'sold');
      const isSoldPrev = hadSoldFilter || baseSQ.dimension === 'Agent Sold';
      if (isSoldPrev && !nonDateFilters.some(f => f.column.toLowerCase() === 'sold')) {
        const soldCol = columns.find(c => c.name.toLowerCase() === 'sold');
        if (soldCol) nonDateFilters.push({ column: soldCol.name, operator: 'eq', value: 'Issued' });
      }

      const combined = [...nonDateFilters, newDateFilter];
      if (baseSQ.operation === 'group_count' && baseSQ.dimension) {
        return {
          operation: 'group_count',
          dimension: baseSQ.dimension,
          measure: baseSQ.measure || 'count',
          sort: baseSQ.sort || 'desc',
          limit: baseSQ.limit,
          include_missing: baseSQ.include_missing ?? true,
          filters: combined
        };
      }
      return { operation: 'total_records', filters: combined };
    }
  }

  // Superlative
  if (isSuperlative) {
    let targetDim = baseSQ.dimension;
    if (qLower.includes('agent') || qLower.includes('who')) {
      const agCol = columns.find(c => c.name.toLowerCase() === 'agent sold');
      if (agCol) targetDim = agCol.name;
    } else {
      const matched = semanticLayer.matchColumn(qLower, file);
      if (matched) targetDim = matched.columnName;
    }
    if (targetDim) {
      return {
        operation: 'top_category',
        dimension: targetDim,
        measure: 'count',
        sort: 'desc',
        limit: 1,
        include_missing: false,
        filters: baseFilters.length > 0 ? baseFilters : undefined
      };
    }
  }

  // Group change
  if (isGroupDirective || qLower.startsWith('by ') || qLower.startsWith('group by ')) {
    let targetDim: string | undefined = undefined;
    const groupMatch = qLower.match(/(?:group(?:ed)?\s+by|\bby\s+|\bper\s+|\beach\s+)([a-z\s]+?)(?:\?|$|\bin\b|\bfor\b|\bduring\b)/i);
    if (groupMatch) {
      const grpTarget = groupMatch[1].trim();
      if (/\b(agents?|agent sold)\b/i.test(grpTarget) && !grpTarget.includes('quoted') && !grpTarget.includes('sales rep')) {
        const agCol = columns.find(c => c.name.toLowerCase() === 'agent sold');
        if (agCol) targetDim = agCol.name;
      } else {
        const grpMatchedCol = semanticLayer.matchColumn(grpTarget, file);
        if (grpMatchedCol) targetDim = grpMatchedCol.columnName;
      }
    }
    if (!targetDim) {
      const matched = semanticLayer.matchColumn(qLower, file);
      if (matched) targetDim = matched.columnName;
    }
    if (targetDim) {
      return {
        operation: 'group_count',
        dimension: targetDim,
        measure: 'count',
        sort: 'desc',
        include_missing: true,
        filters: baseFilters.length > 0 ? baseFilters : undefined
      };
    }
  }

  return null;
}

// Test chaining
const testSequence = [
  'How many policies were sold in May, grouped by agent?',
  'what about august?',
  'who sold the most?'
];

let currentSQ: StructuredQuery | null = null;

for (let i = 0; i < testSequence.length; i++) {
  const q = testSequence[i];
  if (i === 0 || !isFollowUp(q) || !currentSQ) {
    currentSQ = semanticLayer.parseQuestionToStructuredQuery(q, file);
  } else {
    currentSQ = applyFollowUp(q, currentSQ) || semanticLayer.parseQuestionToStructuredQuery(q, file);
  }
  console.log(`\nTURN ${i + 1}: "${q}"`);
  console.log('SQ:', JSON.stringify(currentSQ, null, 2));
}
