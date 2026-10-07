import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { StructuredFilter, StructuredQuery } from '../server/src/types/index.js';

const file = fileProcessorService.getAllFiles()[0];
const columns = file.schema!.columns;

function resolveConversationalContext(
  question: string,
  history?: { role: 'user' | 'assistant'; content: string }[]
): StructuredQuery | null {
  if (!history || history.length === 0 || !file.schema || !file.schema.columns) {
    return null;
  }

  const qLower = question.toLowerCase().trim();

  // Standalone questions with explicit broad intent should NEVER inherit prior filters
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
    return null;
  }

  // Find the most recent user turn that was an analytical query
  const userTurns = history.filter(m => m.role === 'user' && m.content && m.content.trim() !== question.trim());
  if (userTurns.length === 0) return null;

  const lastUserTurn = userTurns[userTurns.length - 1].content;
  const prevSQ = semanticLayer.parseQuestionToStructuredQuery(lastUserTurn, file);
  if (!prevSQ) return null;

  // Check if current question is a follow-up/continuation
  const MONTH_NAMES_LIST = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
  const hasMonth = MONTH_NAMES_LIST.some(m => new RegExp(`\\b${m}\\b`, 'i').test(qLower));

  const isEllipticalPrefix = /^(what about|how about|and in|and for|and what about|what of|in|for|and)\b/i.test(qLower);
  const isGroupDirective = /^(by|grouped by|per|group by|breakdown by)\b/i.test(qLower);
  const isSuperlative = /^(who|which agent|which one|which state|which source|which dealer|which)\s+(has|sold|is|had|the most|highest|top)\b/i.test(qLower) || qLower.includes('who sold the most') || qLower.includes('which agent sold the most');
  const isSubsetCount = /^how many (are|of those|for|in)\b/i.test(qLower) || /^out of those\b/i.test(qLower);

  const isContinuation = isEllipticalPrefix || isGroupDirective || isSuperlative || isSubsetCount || (hasMonth && !qLower.includes('lead'));
  if (!isContinuation) return null;

  // Clone previous filters to avoid mutating
  const baseFilters: StructuredFilter[] = prevSQ.filters ? JSON.parse(JSON.stringify(prevSQ.filters)) : [];

  // Case 1: Month/Date continuation (e.g. "what about august?", "and in june?", "august?")
  if (hasMonth) {
    // Find new date filters using semanticLayer helper
    const newFilters = (semanticLayer as any).extractFilters(qLower, columns);
    const newDateFilter = newFilters.find((f: any) => f.operator === 'date_range' || f.operator === 'contains');
    if (newDateFilter) {
      // If previous query had a Date Sold filter or Sold status filter, keep Date Sold
      const targetDateCol = baseFilters.find(f => f.column.toLowerCase().includes('date') || f.column.toLowerCase().includes('time'))?.column
        || columns.find(c => c.name.toLowerCase() === 'date sold')?.name
        || newDateFilter.column;
      newDateFilter.column = targetDateCol;

      // Replace any date filters in baseFilters with newDateFilter
      const nonDateFilters = baseFilters.filter(f => !f.column.toLowerCase().includes('date') && !f.column.toLowerCase().includes('time'));
      
      // Ensure Sold == 'Issued' is preserved if prevSQ was about policies sold
      const hadSoldFilter = baseFilters.some(f => f.column.toLowerCase() === 'sold');
      const isSoldPrev = hadSoldFilter || prevSQ.operation === 'group_count' || prevSQ.dimension === 'Agent Sold';
      if (isSoldPrev && !nonDateFilters.some(f => f.column.toLowerCase() === 'sold')) {
        const soldCol = columns.find(c => c.name.toLowerCase() === 'sold');
        if (soldCol) nonDateFilters.push({ column: soldCol.name, operator: 'eq', value: 'Issued' });
      }

      const combinedFilters = [...nonDateFilters, newDateFilter];

      // If prevSQ was group_count (e.g. by agent), keep group_count by that same dimension!
      if (prevSQ.operation === 'group_count' && prevSQ.dimension) {
        return {
          operation: 'group_count',
          dimension: prevSQ.dimension,
          measure: prevSQ.measure || 'count',
          sort: prevSQ.sort || 'desc',
          limit: prevSQ.limit,
          include_missing: prevSQ.include_missing ?? true,
          filters: combinedFilters
        };
      }

      return {
        operation: 'total_records',
        filters: combinedFilters
      };
    }
  }

  // Case 2: Grouping change (e.g. "by agent", "group by state", "per dealer")
  if (isGroupDirective || qLower.startsWith('by ') || qLower.startsWith('group by ')) {
    const groupMatch = qLower.match(/(?:group(?:ed)?\s+by|\bby\s+|\bper\s+|\beach\s+)([a-z\s]+?)(?:\?|$|\bin\b|\bfor\b|\bduring\b)/i);
    let targetDim: string | undefined = undefined;
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

  // Case 3: Superlative (e.g. "which agent sold the most?", "who sold the most?", "which is highest?")
  if (isSuperlative) {
    let targetDim = prevSQ.dimension;
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

  // Case 4: Subset filter (e.g. "how many in Texas?", "what about Arizona?", "how many are personal?")
  const newFilters = (semanticLayer as any).extractFilters(qLower, columns);
  if (newFilters.length > 0) {
    // Replace existing filter on same column if present, else append
    const updatedFilters = [...baseFilters];
    for (const nf of newFilters) {
      const idx = updatedFilters.findIndex(f => f.column.toLowerCase() === nf.column.toLowerCase());
      if (idx !== -1) {
        updatedFilters[idx] = nf;
      } else {
        updatedFilters.push(nf);
      }
    }
    return {
      operation: 'total_records',
      filters: updatedFilters
    };
  }

  return null;
}

// Test sequence
const testFlow = [
  { q: 'How many policies were sold in May, grouped by agent?' },
  { q: 'what about august?' },
  { q: 'who sold the most?' },
  { q: 'by state' },
  { q: 'how many in Texas?' },
  { q: 'How many total leads are there?' },
  { q: 'Which Lead Source has the most leads?' }
];

const mockHistory: { role: 'user' | 'assistant'; content: string }[] = [];

for (const step of testFlow) {
  let sq = resolveConversationalContext(step.q, mockHistory);
  if (!sq) {
    sq = semanticLayer.parseQuestionToStructuredQuery(step.q, file);
  }
  console.log(`\n========================================`);
  console.log(`Q: "${step.q}"`);
  console.log(`StructuredQuery:`, JSON.stringify(sq, null, 2));

  mockHistory.push({ role: 'user', content: step.q });
  mockHistory.push({ role: 'assistant', content: `Answered ${step.q}` });
}
