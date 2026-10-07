import { StoredFile, StructuredQuery, StructuredFilter, IntermediateOperation } from '../types/index.js';
import { aiProviderService } from './aiProvider.js';
import { trainingCatalogService } from './trainingCatalogService.js';

export interface ColumnMatch {
  columnName: string;
  confidence: number;
  matchedTerm: string;
}

export class SemanticLayerService {
  /**
   * Section 8: Core baseline business synonym mappings
   */
  private baseSynonyms: Record<string, string[]> = {
    source: [
      'lead source',
      'source',
      'origin',
      'lead origin',
      'where leads came from',
      'where are leads coming from',
      'channel',
      'acquisition',
      'source distribution',
      'lead-source mix',
      'marketing source'
    ],
    month: [
      'month',
      'months',
      'monthly',
      'by month',
      'month-wise',
      'month wise',
      'month breakdown',
      'per month',
      'each month'
    ],
    lead_type: [
      'lead type',
      'type of lead',
      'lead category',
      'category of lead',
      'product type',
      'insurance type'
    ],
    line_of_biz: [
      'line of business',
      'lines of business',
      'line of biz',
      'business line',
      'lob'
    ],
    state: [
      'state',
      'customer state',
      'location',
      'geographic state',
      'garaging state',
      'state-wise',
      'state distribution',
      'region'
    ],
    dealers: [
      'dealer',
      'dealers',
      'dealership',
      'dealerships',
      'car dealer',
      'auto dealer'
    ],
    sales_reps: [
      'sales rep',
      'sales reps',
      'sales representative',
      'sales representatives',
      'rep',
      'reps'
    ],
    ins_company: [
      'insurance company',
      'insurance companies',
      'ins company',
      'carrier',
      'carriers',
      'insurance carrier',
      'insurance carriers'
    ],
    payment_method: [
      'payment method',
      'payment methods',
      'method of payment',
      'payment type',
      'payment types',
      'payment',
      'pymt'
    ],
    method: [
      'method values',
      'method value',
      'method',
      'methods',
      'signature method',
      'signing method'
    ],
    customer_type: [
      'customer type',
      'customer types',
      'client type',
      'client types',
      'personal or commercial',
      'account type'
    ],
    sold_status: [
      'sold',
      'sold status',
      'policy status',
      'quote status',
      'sale status',
      'status'
    ],
    agent_sold: [
      'agent sold',
      'agent',
      'agents',
      'by agent',
      'grouped by agent',
      'per agent',
      'each agent',
      'sold by',
      'selling agent',
      'closer'
    ],
    agent_quoted: [
      'agent quoted',
      'quoted by',
      'quoting agent'
    ],
    premium: [
      'premium',
      'premium amt',
      'premium amount',
      'revenue',
      'sales amount',
      'price',
      'total premium',
      'cost',
      'quoted amount'
    ],
    down_payment: [
      'down pymt',
      'down payment',
      'initial payment',
      'deposit'
    ],
    policy_number: [
      'policy#',
      'policy number',
      'policy id'
    ],
    vehicle_vin: [
      'vehicle vin',
      'vin',
      'vins',
      'vin number',
      'vin numbers'
    ],
    vehicle_make: [
      'vehicle make',
      'car make',
      'manufacturer',
      'make',
      'makes'
    ],
    vehicle_year: [
      'vehicle year',
      'car year',
      'year of vehicle',
      'model year'
    ],
    phone: [
      'phone number',
      'phone',
      'telephone',
      'mobile number',
      'contact number'
    ],
    alt_phone: [
      'alternative phone number',
      'alternative phone',
      'alt phone',
      'alt phone number',
      'secondary phone'
    ],
    email: [
      'email',
      'email address',
      'emails'
    ],
    garaging_zip: [
      'garaging zip',
      'zip code',
      'zipcode',
      'zip',
      'postal code'
    ],
    city: [
      'city',
      'cities',
      'town',
      'municipality'
    ],
    date_of_birth: [
      'date of birth',
      'dob',
      'birth date',
      'birthday'
    ],
    date_sold: [
      'date sold',
      'sold date',
      'sale date'
    ],
    effective_date: [
      'effective date',
      'policy effective date'
    ],
    lead_id: [
      'lead id',
      'lead ids',
      'lead identifier'
    ],
    quote_id: [
      'quote id',
      'quote ids',
      'quote identifier'
    ],
    notes: [
      'notes',
      'note'
    ],
    home_agent: [
      'home agent assigned',
      'home agent',
      'assigned agent',
      'assigned agents'
    ],
    partner_name: [
      'partner name',
      'partner names',
      'partner'
    ],
    partner_code: [
      'partner code',
      'partner codes',
      'partner code nexus'
    ],
    first_name: [
      'first name',
      'first names'
    ],
    last_name: [
      'last name',
      'last names'
    ],
    added_time: [
      'added time',
      'created time',
      'added date'
    ],
    modified_time: [
      'modified time',
      'updated time',
      'modified date'
    ],
    id_col: [
      'id'
    ],
    modified_user: [
      'modified user',
      'user'
    ]
  };

  /**
   * Preferred target column names for specific concept keys
   */
  private conceptToColumnTargets: Record<string, string[]> = {
    source: ['lead source', 'source'],
    lead_type: ['lead type'],
    line_of_biz: ['line of biz', 'line of business'],
    state: ['state', 'garaging state'],
    dealers: ['dealers', 'dealer'],
    sales_reps: ['sales reps', 'sales rep'],
    ins_company: ['ins company', 'insurance company'],
    payment_method: ['pymt', 'payment method', 'payment type', 'payment'],
    method: ['method'],
    customer_type: ['customer type'],
    sold_status: ['sold', 'status'],
    agent_sold: ['agent sold', 'agent'],
    agent_quoted: ['agent quoted'],
    premium: ['premium amt', 'premium amount'],
    down_payment: ['down pymt', 'down payment'],
    policy_number: ['policy#', 'policy number'],
    vehicle_vin: ['vehicle vin', 'vin'],
    vehicle_make: ['vehicle make'],
    vehicle_year: ['vehicle year'],
    phone: ['phone'],
    alt_phone: ['alternative phone number', 'alt phone'],
    email: ['email'],
    garaging_zip: ['garaging zip'],
    city: ['city'],
    date_of_birth: ['date of birth'],
    date_sold: ['date sold'],
    effective_date: ['effective date'],
    lead_id: ['lead id'],
    quote_id: ['quote id'],
    notes: ['notes'],
    home_agent: ['home agent assigned'],
    partner_name: ['partner name'],
    partner_code: ['partner code nexus (agent 3)', 'partner code'],
    first_name: ['first name'],
    last_name: ['last name'],
    added_time: ['added time'],
    modified_time: ['modified time'],
    id_col: ['id'],
    modified_user: ['modified user']
  };

  /**
   * Dynamically resolves the best matching column for a given user phrase
   */
  public matchColumn(queryText: string, file: StoredFile): ColumnMatch | null {
    if (!file.schema || !file.schema.columns || file.schema.columns.length === 0) {
      return null;
    }

    const qLower = queryText.toLowerCase();
    const columns = file.schema.columns;

    // 0. High priority check: "agent sold = agent" rule (user explicit rule: "agent" / "by agent" -> "Agent Sold")
    if (/\b(agents?|by\s+agents?|grouped?\s+by\s+agents?|each\s+agents?|per\s+agents?)\b/i.test(qLower) && !qLower.includes('sales rep') && !qLower.includes('agent quoted')) {
      const agSoldCol = columns.find(c => c.name.toLowerCase() === 'agent sold');
      if (agSoldCol) {
        return { columnName: agSoldCol.name, confidence: 1.0, matchedTerm: 'agent' };
      }
    }

    // 1. Direct exact or whole-word match in column names (highest priority, longest match first)
    const sortedCols = [...columns].sort((a, b) => b.name.length - a.name.length);
    for (const col of sortedCols) {
      const cName = col.name.toLowerCase();
      // If query is about "policies sold", the word "sold" is a metric/status condition, NOT the grouping dimension
      if (cName === 'sold' && (qLower.includes('policies sold') || qLower.includes('polices sold') || qLower.includes('sold policies') || qLower.includes('were sold') || qLower.includes('number of policies sold')) && !qLower.includes('sold status') && !qLower.includes('status breakdown')) {
        continue;
      }
      // If query is about "payment method" or "payment type", do not match column "Method" directly (it refers to payment / pymt)
      if (cName === 'method' && (qLower.includes('payment method') || qLower.includes('payment type') || qLower.includes('method of payment'))) {
        continue;
      }
      const stem = cName.endsWith('s') ? cName.slice(0, -1) : cName;
      const regex = new RegExp(`\\b${stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'i');
      if (regex.test(qLower)) {
        return { columnName: col.name, confidence: 1.0, matchedTerm: col.name };
      }
    }

    // 2. Collect all candidate synonyms (Data Dictionary + Built-in Synonyms)
    interface CandidateSynonym {
      colName: string;
      term: string;
      confidence: number;
    }
    const candidates: CandidateSynonym[] = [];

    const GENERIC_SYNONYM_STOP_WORDS = new Set([
      'lead', 'leads', 'data', 'file', 'files', 'number', 'numbers', 'record', 'records',
      'value', 'values', 'item', 'items', 'row', 'rows', 'count', 'total', 'amount',
      'category', 'categories', 'categorys', 'field', 'fields', 'column', 'columns'
    ]);

    // Add data dictionary synonyms
    if (file.dataDictionary) {
      for (const [colName, dictCol] of Object.entries(file.dataDictionary.columns)) {
        if (dictCol.synonyms) {
          for (const syn of dictCol.synonyms) {
            const synLower = syn.toLowerCase().trim();
            if (GENERIC_SYNONYM_STOP_WORDS.has(synLower)) continue;
            candidates.push({ colName, term: syn, confidence: 0.95 });
          }
        }
      }
    }

    // Add built-in business synonyms
    for (const [conceptKey, terms] of Object.entries(this.baseSynonyms)) {
      let targetColName: string | undefined = undefined;
      if (this.conceptToColumnTargets[conceptKey]) {
        const targets = this.conceptToColumnTargets[conceptKey];
        // 1. Prefer exact column name match first
        let preferredCol = columns.find(col => {
          const cLower = col.name.toLowerCase();
          return targets.some(tgt => cLower === tgt);
        });
        // 2. Substring match if no exact match (avoid matching down payment for payment)
        if (!preferredCol) {
          preferredCol = columns.find(col => {
            const cLower = col.name.toLowerCase();
            return targets.some(tgt => {
              if (tgt === 'pymt' && cLower.includes('down')) return false;
              return cLower.includes(tgt);
            });
          });
        }
        if (preferredCol) targetColName = preferredCol.name;
      }
      if (!targetColName) {
        const found = columns.find(col => {
          const cLower = col.name.toLowerCase();
          return cLower.includes(conceptKey.replace(/_/g, ' ')) || terms.some(t => cLower.includes(t));
        });
        if (found) targetColName = found.name;
      }

      if (targetColName) {
        for (const term of terms) {
          const termLower = term.toLowerCase().trim();
          if (GENERIC_SYNONYM_STOP_WORDS.has(termLower)) continue;
          candidates.push({ colName: targetColName, term, confidence: 0.95 });
        }
      }
    }

    // Sort candidate synonyms by length descending (longest phrase match first!)
    candidates.sort((a, b) => b.term.length - a.term.length);

    const PREPOSITIONS = new Set(['in', 'at', 'on', 'of', 'to', 'for', 'by', 'as', 'is', 'an', 'a', 'or', 'and', 'if', 'the', 'it', 'up', 'so', 'we', 'my']);

    for (const cand of candidates) {
      const termLower = cand.term.toLowerCase().trim();
      if (PREPOSITIONS.has(termLower) || termLower.length < 3) {
        continue;
      }
      let regex: RegExp;
      if (termLower.length <= 3) {
        regex = new RegExp(`\\b${termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      } else {
        const tStem = termLower.endsWith('s') && !termLower.endsWith('ss') && !termLower.endsWith('us')
          ? termLower.slice(0, -1)
          : termLower;
        regex = new RegExp(`\\b${tStem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:s|es)?\\b`, 'i');
      }
      if (regex.test(qLower)) {
        return { columnName: cand.colName, confidence: cand.confidence, matchedTerm: cand.term };
      }
    }

    // 4. Token-level partial match (excluding common dataset noise words)
    const STOP_MATCH_WORDS = new Set([
      'lead', 'leads', 'file', 'files', 'data', 'many', 'much', 'total', 'count',
      'unique', 'different', 'what', 'which', 'where', 'show', 'list', 'each', 'from',
      'with', 'have', 'were', 'been', 'there', 'number', 'give', 'tell',
      'category', 'categories', 'categorys', 'categorical', 'field', 'fields', 'column', 'columns', 'dimension', 'dimensions'
    ]);
    const words = qLower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !STOP_MATCH_WORDS.has(w));
    for (const w of words) {
      const col = columns.find(c => c.name.toLowerCase().includes(w));
      if (col) {
        return { columnName: col.name, confidence: 0.75, matchedTerm: w };
      }
    }

    return null;
  }

  /**
   * Finds the best numeric column for aggregation (e.g. Premium Amt, Down Pymt)
   */
  public matchNumericColumn(queryText: string, file: StoredFile): string | undefined {
    if (!file.schema) return undefined;
    const qLower = queryText.toLowerCase();
    const numCols = file.schema.columns.filter(c => c.type === 'numeric');
    if (numCols.length === 0) return undefined;

    // Check specific terms
    if (qLower.includes('premium')) {
      const prem = numCols.find(c => c.name.toLowerCase().includes('premium'));
      if (prem) return prem.name;
    }
    if (qLower.includes('down') || qLower.includes('deposit')) {
      const dp = numCols.find(c => c.name.toLowerCase().includes('down'));
      if (dp) return dp.name;
    }
    if (qLower.includes('payment') || qLower.includes('pymt')) {
      const pymt = numCols.find(c => c.name.toLowerCase().includes('pymt') || c.name.toLowerCase().includes('payment'));
      if (pymt) return pymt.name;
    }
    if (qLower.includes('year')) {
      const yr = numCols.find(c => c.name.toLowerCase().includes('year'));
      if (yr) return yr.name;
    }

    // Match any numeric column name directly mentioned
    for (const c of numCols) {
      if (qLower.includes(c.name.toLowerCase())) return c.name;
    }

    return numCols[0].name;
  }

  /**
   * Resolves conversational follow-up questions using prior conversation turns.
   * Enables seamless questions like: "what about august?", "by agent", "who sold the most?", "how many in Texas?"
   */
  public resolveConversationalContext(
    question: string,
    file: StoredFile,
    history?: { role: 'user' | 'assistant'; content: string }[]
  ): StructuredQuery | null {
    if (!history || history.length === 0 || !file.schema || !file.schema.columns) {
      return null;
    }

    const qLower = question.toLowerCase().trim();
    const columns = file.schema.columns;

    // Strict Continuation Check: A new question MUST NOT inherit prior filters/columns
    // unless the user explicitly uses reference/continuation phrases.
    const hasExplicitReferenceToken = /\b(among\s+those|out\s+of\s+those|of\s+those|for\s+those|for\s+the\s+same|break\s+(?:that\s+)?down|breakdown\s+that|now\s+group\s+(?:those\s+)?by|now\s+slice\s+by|from\s+those)\b/i.test(qLower);

    const isPureGroupDirective = /^(by|grouped\s+by|group\s+by|per|breakdown\s+by)\s+[a-z\s]+$/i.test(qLower.trim());

    const MONTH_NAMES_LIST = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
    const hasMonth = MONTH_NAMES_LIST.some(m => new RegExp(`\\b${m}\\b`, 'i').test(qLower));
    const isDateEllipsis = hasMonth && /^(what\s+about|how\s+about|and\s+in|and\s+for|in|for|and)\s+(?:in\s+|for\s+)?[a-z]+(\s+202\d)?\??$/i.test(qLower.trim());

    const US_STATES_LIST = ['arizona', 'california', 'texas', 'florida', 'nevada', 'georgia', 'ohio', 'michigan', 'illinois', 'pennsylvania', 'new york', 'colorado'];
    const hasState = US_STATES_LIST.some(s => new RegExp(`\\b${s}\\b`, 'i').test(qLower));
    const isStateEllipsis = hasState && /^(what\s+about|how\s+about|and\s+in|and\s+for|in|for|and)\s+(?:in\s+|for\s+)?[a-z\s]+\??$/i.test(qLower.trim());

    const isContinuation = hasExplicitReferenceToken || isPureGroupDirective || isDateEllipsis || isStateEllipsis;
    if (!isContinuation) {
      return null;
    }

    // Find prior user turns
    const userTurns = history.filter(m => m.role === 'user' && m.content && m.content.trim() !== question.trim());
    if (userTurns.length === 0) return null;

    // Reconstruct the active query state by traversing the user turns in this conversation thread
    let activeSQ: StructuredQuery | null = null;
    const historyChain: { role: 'user' | 'assistant'; content: string }[] = [];
    for (const turn of userTurns) {
      const sq = this.parseQuestionToStructuredQuery(turn.content, file, historyChain);
      if (sq) {
        activeSQ = sq;
      }
      historyChain.push(turn);
    }

    if (!activeSQ) return null;
    const prevSQ = activeSQ;

    // Clone previous filters to avoid mutating
    const baseFilters: StructuredFilter[] = prevSQ.filters ? JSON.parse(JSON.stringify(prevSQ.filters)) : [];

    // Case 1: Month/Date continuation (e.g. "what about august?", "and in june?", "august?")
    if (isDateEllipsis && hasMonth) {
      const newFilters = this.extractFilters(qLower, columns);
      const newDateFilter = newFilters.find(f => f.operator === 'date_range' || f.operator === 'contains');
      if (newDateFilter) {
        const hadSoldFilter = baseFilters.some(f => f.column.toLowerCase() === 'sold');
        const isSoldPrev = hadSoldFilter || prevSQ.dimension === 'Agent Sold' || (prevSQ.metricColumn && prevSQ.metricColumn.toLowerCase().includes('premium'));
        const defaultDateCol = isSoldPrev
          ? columns.find(c => c.name.toLowerCase() === 'date sold')?.name
          : (columns.find(c => c.name.toLowerCase() === 'added time')?.name || columns.find(c => c.name.toLowerCase() === 'date sold')?.name);
        const targetDateCol = baseFilters.find(f => f.column.toLowerCase().includes('date') || f.column.toLowerCase().includes('time'))?.column
          || defaultDateCol
          || newDateFilter.column;
        newDateFilter.column = targetDateCol;

        const nonDateFilters = baseFilters.filter(f => !f.column.toLowerCase().includes('date') && !f.column.toLowerCase().includes('time'));
        
        // Ensure Sold == 'Issued' is preserved if prevSQ was about policies sold
        if (isSoldPrev && !nonDateFilters.some(f => f.column.toLowerCase() === 'sold')) {
          const soldCol = columns.find(c => c.name.toLowerCase() === 'sold');
          if (soldCol) nonDateFilters.push({ column: soldCol.name, operator: 'eq', value: 'Issued' });
        }

        const combinedFilters = [...nonDateFilters, newDateFilter];

        // If prevSQ was group_count or top_category (e.g. by agent), keep group_count by that same dimension!
        if ((prevSQ.operation === 'group_count' || prevSQ.operation === 'top_category') && prevSQ.dimension) {
          return {
            operation: prevSQ.operation,
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

    // Case 1b: State continuation (e.g. "what about texas?", "and in florida?")
    if (isStateEllipsis && hasState) {
      const newFilters = this.extractFilters(qLower, columns);
      const newStateFilter = newFilters.find(f => f.column.toLowerCase().includes('state'));
      if (newStateFilter) {
        const nonStateFilters = baseFilters.filter(f => !f.column.toLowerCase().includes('state'));
        const combinedFilters = [...nonStateFilters, newStateFilter];
        return {
          operation: prevSQ.operation === 'group_count' && prevSQ.dimension ? prevSQ.operation : 'total_records',
          dimension: prevSQ.dimension,
          measure: prevSQ.measure || 'count',
          sort: prevSQ.sort || 'desc',
          limit: prevSQ.limit,
          include_missing: prevSQ.include_missing ?? true,
          filters: combinedFilters
        };
      }
    }

    // Case 2: Grouping directive or breakdown continuation (e.g. "by agent", "now group those by state", "break that down by lead type")
    if (isPureGroupDirective || /^(now\s+group\s+(?:those\s+)?by|break\s+(?:that\s+)?down\s+by|now\s+slice\s+by)\b/i.test(qLower)) {
      const groupMatch = qLower.match(/(?:group(?:ed)?\s+by|\bby\s+|\bper\s+|\beach\s+|down\s+by\s+)([a-z\s]+?)(?:\?|$|\bin\b|\bfor\b|\bduring\b)/i);
      let targetDim: string | undefined = undefined;
      if (groupMatch) {
        const grpTarget = groupMatch[1].trim();
        if (/\b(months?|monthly|month-wise)\b/i.test(grpTarget)) {
          targetDim = 'Month';
        } else if (/\b(agents?|agent sold)\b/i.test(grpTarget) && !grpTarget.includes('quoted') && !grpTarget.includes('sales rep')) {
          const agCol = columns.find(c => c.name.toLowerCase() === 'agent sold');
          if (agCol) targetDim = agCol.name;
        } else if (/\b(sold\s+(day|date)|date\s+sold)\b/i.test(grpTarget)) {
          const dsCol = columns.find(c => c.name.toLowerCase() === 'date sold');
          if (dsCol) targetDim = dsCol.name;
        } else {
          const grpMatchedCol = this.matchColumn(grpTarget, file);
          if (grpMatchedCol) targetDim = grpMatchedCol.columnName;
        }
      }
      if (!targetDim) {
        if (/\b(by month|grouped by month|per month|each month|month wise|month-wise|monthly)\b/i.test(qLower)) {
          targetDim = 'Month';
        } else {
          const matched = this.matchColumn(qLower, file);
          if (matched) targetDim = matched.columnName;
        }
      }

      if (targetDim) {
        // Ensure Sold == 'Issued' is preserved if prevSQ was about policies sold
        const hadSoldFilter = baseFilters.some(f => f.column.toLowerCase() === 'sold');
        const isSoldPrev = hadSoldFilter || prevSQ.operation === 'group_count' || prevSQ.dimension === 'Agent Sold' || targetDim === 'Agent Sold';
        if (isSoldPrev && !baseFilters.some(f => f.column.toLowerCase() === 'sold')) {
          const soldCol = columns.find(c => c.name.toLowerCase() === 'sold');
          if (soldCol) baseFilters.push({ column: soldCol.name, operator: 'eq', value: 'Issued' });
        }

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

    // Case 3: Explicit subset filter with reference token (e.g. "among those, how many are Auto?", "of those, how many in Texas?")
    if (hasExplicitReferenceToken) {
      const newFilters = this.extractFilters(qLower, columns);
      if (newFilters.length > 0) {
        const updatedFilters = [...baseFilters];
        for (const nf of newFilters) {
          const idx = updatedFilters.findIndex(f => f.column.toLowerCase() === nf.column.toLowerCase());
          if (idx !== -1) {
            updatedFilters[idx] = nf;
          } else {
            updatedFilters.push(nf);
          }
        }

        // Ensure Sold == 'Issued' is preserved if prevSQ was about policies sold
        const hadSoldFilter = baseFilters.some(f => f.column.toLowerCase() === 'sold');
        if (hadSoldFilter && !updatedFilters.some(f => f.column.toLowerCase() === 'sold')) {
          const soldCol = columns.find(c => c.name.toLowerCase() === 'sold');
          if (soldCol) updatedFilters.push({ column: soldCol.name, operator: 'eq', value: 'Issued' });
        }

        return {
          operation: 'total_records',
          filters: updatedFilters
        };
      }
    }

    return null;
  }

  /**
   * Section 3: Understand the user's question and map into Intermediate Structured Query
   */
  public parseQuestionToStructuredQuery(
    question: string,
    file: StoredFile,
    history?: { role: 'user' | 'assistant'; content: string }[]
  ): StructuredQuery | null {
    if (!file.schema || !file.schema.columns || file.schema.columns.length === 0) {
      return null;
    }

    // Step 0: Check conversational context resolution for multi-turn chat follow-ups
    if (history && history.length > 0) {
      const contextSQ = this.resolveConversationalContext(question, file, history);
      if (contextSQ) {
        return contextSQ;
      }
    }

    const qLower = question.toLowerCase();
    const columns = file.schema.columns;

    // Broad Narrative / Executive Summary Check
    const isBroadNarrative =
      qLower.includes('executive summary') ||
      qLower.includes('summarize this') ||
      qLower.includes('summary of the') ||
      qLower.includes('summary of this') ||
      qLower.includes('key takeaways') ||
      qLower.includes('business takeaways') ||
      qLower.includes('main takeaways') ||
      qLower.includes('business insights') ||
      qLower.includes('explain the data') ||
      qLower.includes('explain this data') ||
      (qLower.includes('summary') && !qLower.includes('schema') && !qLower.includes('columns') && !qLower.includes('count'));

    if (isBroadNarrative) {
      return null;
    }

    // 1. Schema Overview & Column Profile Check
    // e.g., "what columns are in this file?", "list all fields", "show columns", "schema", "what is this file about"
    if (
      qLower.includes('what columns') ||
      qLower.includes('list columns') ||
      qLower.includes('show columns') ||
      qLower.includes('all columns') ||
      qLower.includes('what fields') ||
      qLower.includes('list fields') ||
      qLower.includes('show fields') ||
      qLower.includes('show schema') ||
      qLower.includes('file structure') ||
      qLower.includes('dataset overview') ||
      qLower.includes('what is this file about') ||
      qLower.includes('describe this file') ||
      qLower.includes('describe the dataset')
    ) {
      return {
        operation: 'schema_overview'
      };
    }

    // 2. Data Quality & Missing Value Audit Check
    // e.g., "are there missing values?", "how many null values?", "which columns have missing data?", "data completeness"
    if (
      qLower.includes('missing value') ||
      qLower.includes('missing values') ||
      qLower.includes('null value') ||
      qLower.includes('null values') ||
      qLower.includes('unpopulated') ||
      qLower.includes('data quality') ||
      qLower.includes('missing data') ||
      qLower.includes('empty fields') ||
      qLower.includes('which columns have null') ||
      qLower.includes('are there any missing') ||
      qLower.includes('data vs. blank') ||
      qLower.includes('data vs blank')
    ) {
      const matched = this.matchColumn(question, file);
      if (matched && (qLower.includes('in ') || qLower.includes('for '))) {
        // Specific column missing count
        return {
          operation: 'group_count',
          dimension: matched.columnName,
          include_missing: true
        };
      }
      return {
        operation: 'missing_audit'
      };
    }

    // 3. Row Search / Filter Rows Check
    // e.g., "show me leads from Texas", "list 5 Auto leads", "find lead with ID 123", "sample records"
    if (
      (qLower.includes('show me leads') ||
        qLower.includes('list leads') ||
        qLower.includes('find lead') ||
        qLower.includes('sample leads') ||
        qLower.includes('show sample') ||
        qLower.includes('show rows') ||
        qLower.includes('find quote') ||
        qLower.includes('search leads')) &&
      !qLower.includes('how many') &&
      !qLower.includes('count') &&
      !qLower.includes('most')
    ) {
      const filters = this.extractFilters(qLower, columns);
      return {
        operation: 'filter_rows',
        filters: filters.length > 0 ? filters : undefined,
        limit: 10
      };
    }

    const isExcludingBlank = qLower.includes('excluding blank') || qLower.includes('excluding null') || qLower.includes('excluding missing');
    const isUniqueQuery = qLower.includes('unique') || qLower.includes('distinct') || qLower.includes('how many different');

    // 3a00. Unique count check (e.g. "How many unique states are listed, excluding blanks?", "unique Sales Rep Name values")
    if (isUniqueQuery) {
      const cleanDimText = question
        .replace(/how many unique/gi, '')
        .replace(/how many distinct/gi, '')
        .replace(/how many different/gi, '')
        .replace(/unique/gi, '')
        .replace(/distinct/gi, '')
        .replace(/values are there/gi, '')
        .replace(/values are listed/gi, '')
        .replace(/are there/gi, '')
        .replace(/are listed/gi, '')
        .replace(/in the dataset\??/gi, '')
        .replace(/excluding blanks\??/gi, '')
        .replace(/excluding blank\??/gi, '')
        .trim();
      const matched = this.matchColumn(cleanDimText, file) || this.matchColumn(question, file);
      if (matched) {
        return {
          operation: 'unique_count',
          dimension: matched.columnName,
          include_missing: false
        };
      }
    }

    // 3a0. Blank / Missing / Null field check (e.g. "How many Sales Rep fields are blank?", "how many are missing", "unpopulated", "empty")
    const isBlankCheck = 
      !isExcludingBlank &&
      !isUniqueQuery &&
      (qLower.includes('blank') || 
       qLower.includes('missing') || 
       qLower.includes('unpopulated') || 
       qLower.includes('is null') || 
       qLower.includes('are null') || 
       qLower.includes('empty'));

    if (
      (qLower.includes('how many') || qLower.includes('count of') || qLower.includes('number of')) &&
      isBlankCheck &&
      !qLower.includes('missing value audit') &&
      !qLower.includes('audit all')
    ) {
      const matched = this.matchColumn(question, file);
      if (matched) {
        return {
          operation: 'total_records',
          filters: [{ column: matched.columnName, operator: 'is_null', value: true }]
        };
      }
    }

    // Check if the query has specific categorical or entity value filters (e.g. Partner Name = 'Nexus', State = 'Texas', Lead Type = 'Auto')
    const valueFilters = this.extractFilters(qLower, columns);

    // 3a. Availability / Populated / Non-null check (e.g. "how many leads have a Phone Number available?", "is Vehicle Make available?")
    // ONLY applies when NO specific equality/value filters were requested (e.g. NOT "have Partner Name as Nexus")
    if (
      valueFilters.length === 0 &&
      !qLower.includes(' as ') &&
      !qLower.includes(' equal ') &&
      !qLower.includes(' = ') &&
      (
        qLower.includes('available') ||
        qLower.includes('is populated') ||
        (/\b(how many|count of|number of)\s+leads?\s+(have|has)\s+(an?\s+)?/i.test(qLower) &&
          !qLower.includes('sold status') && !qLower.includes('both') && !qLower.includes(' but ') && !qLower.includes('same')) ||
        (/\b(how many\s+leads?\s+are\s+listed\s+with\s+an?\s+)/i.test(qLower)) ||
        (qLower.includes('how many leads have notes')) ||
        (qLower.includes('how many leads have a lead id')) ||
        (qLower.includes('how many leads have an id'))
      )
    ) {
      const matched = this.matchColumn(question, file);
      if (matched) {
        return {
          operation: 'total_records',
          filters: [{ column: matched.columnName, operator: 'not_null', value: true }]
        };
      }
    }

    // 3a1. Multi-attribute presence check: "have both X and Y"
    const bothMatch = qLower.match(/have both\s+([a-z\s]+?)\s+and\s+([a-z\s]+?)(?:\?|$)/i);
    if (bothMatch) {
      const col1 = this.matchColumn(bothMatch[1].trim(), file);
      const col2 = this.matchColumn(bothMatch[2].trim(), file);
      if (col1 && col2) {
        return {
          operation: 'total_records',
          filters: [
            { column: col1.columnName, operator: 'not_null', value: true },
            { column: col2.columnName, operator: 'not_null', value: true }
          ]
        };
      }
    }

    // 3a2. Multi-attribute presence check: "have X but no Y"
    const butNoMatch = qLower.match(/have\s+([a-z\s]+?)\s+but\s+no(?:t)?\s+([a-z\s]+?)(?:\?|$)/i);
    if (butNoMatch) {
      const col1 = this.matchColumn(butNoMatch[1].trim(), file);
      const col2 = this.matchColumn(butNoMatch[2].trim(), file);
      if (col1 && col2) {
        return {
          operation: 'total_records',
          filters: [
            { column: col1.columnName, operator: 'not_null', value: true },
            { column: col2.columnName, operator: 'is_null', value: true }
          ]
        };
      }
    }

    // 3a3. Duplicate check: e.g. "how many duplicate VINs are there?", "how many duplicate Policy Numbers", "how many leads have the same VIN"
    if (qLower.includes('duplicate') || qLower.includes('same vin') || qLower.includes('same policy')) {
      let targetColText = question;
      if (qLower.includes('same vin') || qLower.includes('duplicate vin')) targetColText = 'VIN';
      else if (qLower.includes('same policy') || qLower.includes('duplicate policy')) targetColText = 'POLICY#';
      else if (qLower.includes('duplicate lead id')) targetColText = 'Lead ID';
      const matched = this.matchColumn(targetColText, file);
      if (matched) {
        return {
          operation: 'duplicate_count',
          dimension: matched.columnName
        };
      }
    }

    // 3a4. 17-character VIN & invalid VIN
    if (qLower.includes('17-character vin') || qLower.includes('17 character vin')) {
      const vinCol = columns.find(c => c.name.toLowerCase() === 'vehicle vin');
      if (vinCol) {
        return {
          operation: 'total_records',
          filters: [{ column: vinCol.name, operator: 'length_eq', value: 17 }]
        };
      }
    }

    if (qLower.includes('invalid vin')) {
      const vinCol = columns.find(c => c.name.toLowerCase() === 'vehicle vin');
      if (vinCol) {
        return {
          operation: 'total_records',
          filters: [{ column: vinCol.name, operator: 'length_neq', value: 17 }]
        };
      }
    }

    // 3a5. Agent relationships
    if (qLower.includes('same agent sold and home agent') || qLower.includes('same home agent and agent sold')) {
      const asCol = columns.find(c => c.name.toLowerCase() === 'agent sold');
      const haCol = columns.find(c => c.name.toLowerCase() === 'home agent assigned');
      if (asCol && haCol) {
        return {
          operation: 'total_records',
          filters: [{ column: asCol.name, operator: 'col_eq', value: haCol.name }]
        };
      }
    }

    if (qLower.includes('same agent quoted and agent sold') || qLower.includes('same agent sold and agent quoted')) {
      const aqCol = columns.find(c => c.name.toLowerCase() === 'agent quoted');
      const asCol = columns.find(c => c.name.toLowerCase() === 'agent sold');
      if (aqCol && asCol) {
        return {
          operation: 'total_records',
          filters: [{ column: aqCol.name, operator: 'col_eq', value: asCol.name }]
        };
      }
    }

    if (qLower.includes('agent quoted but no agent sold')) {
      const aqCol = columns.find(c => c.name.toLowerCase() === 'agent quoted');
      const asCol = columns.find(c => c.name.toLowerCase() === 'agent sold');
      if (aqCol && asCol) {
        return {
          operation: 'total_records',
          filters: [
            { column: aqCol.name, operator: 'not_null', value: true },
            { column: asCol.name, operator: 'is_null', value: true }
          ]
        };
      }
    }

    if (qLower.includes('agent sold but no agent quoted')) {
      const asCol = columns.find(c => c.name.toLowerCase() === 'agent sold');
      const aqCol = columns.find(c => c.name.toLowerCase() === 'agent quoted');
      if (asCol && aqCol) {
        return {
          operation: 'total_records',
          filters: [
            { column: asCol.name, operator: 'not_null', value: true },
            { column: aqCol.name, operator: 'is_null', value: true }
          ]
        };
      }
    }

    // 3a6. Date comparison
    if (qLower.includes('same added and modified date') || qLower.includes('same added and modified time')) {
      const atCol = columns.find(c => c.name.toLowerCase() === 'added time');
      const mtCol = columns.find(c => c.name.toLowerCase() === 'modified time');
      if (atCol && mtCol) {
        return {
          operation: 'total_records',
          filters: [{ column: atCol.name, operator: 'date_eq_col', value: mtCol.name }]
        };
      }
    }

    if (qLower.includes('added today') || qLower.includes('modified today')) {
      return {
        operation: 'total_records',
        filters: [{ column: 'Added Time', operator: 'eq', value: '__NONE_TODAY__' }]
      };
    }

    // 3a7. Complete records check
    if (qLower.includes('complete record') || qLower.includes('complete records')) {
      return {
        operation: 'total_records',
        filters: [{ column: 'ID', operator: 'eq', value: '__NONE_COMPLETE__' }]
      };
    }

    // 3a8. Specific count questions: Dealer records, Sales Reps, Cities, percentage Quoted
    if (qLower === 'how many dealer records are there?' || qLower.includes('dealer records are there')) {
      const dCol = columns.find(c => c.name.toLowerCase() === 'dealers');
      if (dCol) {
        return {
          operation: 'total_records',
          filters: [{ column: dCol.name, operator: 'not_null', value: true }]
        };
      }
    }

    if (qLower === 'how many sales reps are there?' || qLower.includes('how many sales reps are there')) {
      const srCol = columns.find(c => c.name.toLowerCase() === 'sales reps');
      if (srCol) {
        return {
          operation: 'unique_count',
          dimension: srCol.name,
          include_missing: false
        };
      }
    }

    if (qLower === 'how many cities are listed?' || qLower.includes('how many cities are listed')) {
      const cityCol = columns.find(c => c.name.toLowerCase() === 'city');
      if (cityCol) {
        return {
          operation: 'unique_count',
          dimension: cityCol.name,
          include_missing: false
        };
      }
    }

    // Percentage queries (e.g. "What percentage of all records have Sold = Yes?", "What percentage of records have a blank State?")
    if (qLower.includes('percentage of') || qLower.startsWith('what percentage')) {
      if (qLower.includes('percentage of leads are quoted') || qLower.includes('what percentage of leads are quoted')) {
        const soldCol = columns.find(c => c.name.toLowerCase() === 'sold');
        if (soldCol) {
          return {
            operation: 'group_count',
            dimension: soldCol.name,
            include_missing: true
          };
        }
      }
      if (qLower.includes('blank') || qLower.includes('missing') || qLower.includes('null') || qLower.includes('unpopulated')) {
        const matched = this.matchColumn(question, file);
        if (matched) {
          return {
            operation: 'total_records',
            measure: 'percentage',
            filters: [{ column: matched.columnName, operator: 'is_null', value: true }]
          };
        }
      }
      const filters = this.extractFilters(qLower, columns);
      if (filters.length > 0) {
        return {
          operation: 'total_records',
          measure: 'percentage',
          filters
        };
      }
    }

    // 3a9. Comparison queries (e.g. "How many Auto vs. Home leads are there?")
    const vsMatch = qLower.match(/how many\s+([a-z0-9\.\s]+?)\s+vs\.?\s+([a-z0-9\.\s]+?)\s+(leads?|policies|vehicles|customers)?/i);
    if (vsMatch) {
      const term1 = vsMatch[1].trim();
      const term2 = vsMatch[2].trim();
      let targetCol: { name: string } | undefined;
      let val1 = term1;
      let val2 = term2;

      if (/\b(auto|home|renters|motorcycle)\b/i.test(term1) && /\b(auto|home|renters|motorcycle)\b/i.test(term2)) {
        targetCol = columns.find(c => c.name.toLowerCase() === 'lead type');
        val1 = term1.toLowerCase() === 'auto' ? 'Auto' : term1.toLowerCase() === 'home' ? 'Home' : term1;
        val2 = term2.toLowerCase() === 'auto' ? 'Auto' : term2.toLowerCase() === 'home' ? 'Home' : term2;
      } else if (/\b(quoted|sold|issued)\b/i.test(term1) && /\b(quoted|sold|issued)\b/i.test(term2)) {
        targetCol = columns.find(c => c.name.toLowerCase() === 'sold');
        val1 = term1.toLowerCase() === 'quoted' ? 'Quoted' : 'Issued';
        val2 = term2.toLowerCase() === 'quoted' ? 'Quoted' : 'Issued';
      } else if (/\b(nexus|rr 3\.0)\b/i.test(term1) || /\b(nexus|rr 3\.0)\b/i.test(term2)) {
        targetCol = columns.find(c => c.name.toLowerCase() === 'lead source');
        val1 = /rr/i.test(term1) ? 'RR 3.0' : 'Nexus';
        val2 = /rr/i.test(term2) ? 'RR 3.0' : 'Nexus';
      } else if (/\b(arizona|texas|california|florida)\b/i.test(term1)) {
        targetCol = columns.find(c => c.name.toLowerCase() === 'state');
        val1 = term1.charAt(0).toUpperCase() + term1.slice(1);
        val2 = term2.charAt(0).toUpperCase() + term2.slice(1);
      } else if (/\b(progressive|travelers|geico)\b/i.test(term1)) {
        targetCol = columns.find(c => c.name.toLowerCase() === 'ins company');
        val1 = term1.charAt(0).toUpperCase() + term1.slice(1);
        val2 = term2.charAt(0).toUpperCase() + term2.slice(1);
      } else if (/\b(202\d)\b/.test(term1) && /\b(202\d)\b/.test(term2)) {
        targetCol = columns.find(c => c.name.toLowerCase() === 'vehicle year');
      } else if (/\b(personal|business|commercial)\b/i.test(term1)) {
        targetCol = columns.find(c => c.name.toLowerCase() === 'customer type');
        val1 = 'Personal';
        val2 = 'Commercial';
      }

      if (targetCol) {
        return {
          operation: 'compare_groups',
          dimension: targetCol.name,
          compareValues: [val1, val2]
        };
      }
    }

    // 3a10. Close rate check (e.g., "What is the close rate?", "What is our close rate?", "Agent close rate", "Lead Type sold rate")
    if (
      qLower.includes('close rate') ||
      qLower.includes('closing rate') ||
      qLower.includes('sold rate') ||
      qLower.includes('conversion rate') ||
      qLower.includes('quote to sold') ||
      qLower.includes('issued rate')
    ) {
      const dim = qLower.includes('agent')
        ? (columns.find(c => c.name.toLowerCase() === 'agent quoted')?.name || 'Agent Quoted')
        : (qLower.includes('lead type')
          ? (columns.find(c => c.name.toLowerCase() === 'lead type')?.name || 'Lead Type')
          : undefined);
      return {
        operation: 'close_rate',
        dimension: dim,
        filters: this.extractFilters(qLower, columns)
      };
    }

    // 3a11. Quotes count check (Catalog: Quotes = COUNT where Quoted Date is not null)
    if (
      qLower.includes('how many quotes') ||
      qLower.includes('count of quotes') ||
      qLower.includes('total quotes') ||
      qLower === 'quotes'
    ) {
      const qdCol = columns.find(c => c.name.toLowerCase().includes('quoted date') || c.name.toLowerCase().includes('quote date'));
      if (qdCol) {
        const filters = this.extractFilters(qLower, columns);
        return {
          operation: 'total_records',
          filters: filters.length > 0 ? filters : [{ column: qdCol.name, operator: 'not_null', value: true }]
        };
      }
    }

    // 3a12. Quoted-not-sold check (Catalog: normalized(Sold) == 'quoted')
    if (qLower.includes('quoted-not-sold') || qLower.includes('quoted but not sold') || qLower.includes('quoted not sold')) {
      const soldCol = columns.find(c => c.name.toLowerCase() === 'sold');
      if (soldCol) {
        return {
          operation: 'total_records',
          filters: [{ column: soldCol.name, operator: 'eq', value: 'Quoted' }]
        };
      }
    }

    // 3a12b. Date Boundary check (earliest / latest Quote Date, Date Sold, etc.)
    if (
      qLower.includes('earliest quote date') ||
      qLower.includes('latest quote date') ||
      qLower.includes('earliest date sold') ||
      qLower.includes('latest date sold') ||
      ((qLower.includes('earliest') || qLower.includes('latest') || qLower.includes('first date') || qLower.includes('last date')) &&
        (qLower.includes('date') || qLower.includes('time')))
    ) {
      const isEarliest = qLower.includes('earliest') || qLower.includes('first');
      const dateCol = qLower.includes('sold')
        ? columns.find(c => c.name.toLowerCase().includes('sold') && (c.type === 'date' || c.name.toLowerCase().includes('date')))
        : columns.find(c => c.name.toLowerCase().includes('quote') && (c.type === 'date' || c.name.toLowerCase().includes('date')));
      const targetCol = dateCol || columns.find(c => c.type === 'date' || c.name.toLowerCase().includes('date'));
      if (targetCol) {
        return {
          operation: 'aggregate',
          dimension: targetCol.name,
          metricColumn: targetCol.name,
          measure: isEarliest ? 'min' : 'max'
        };
      }
    }

    // 3a13. Premium total / sum check (e.g. "What is the total Premium Amt across all records...", "total Premium Amt for Sold = Yes")
    if (
      !qLower.includes('which') &&
      (qLower.includes('total premium') ||
      qLower.includes('sum of premium') ||
      qLower.includes('premium written') ||
      (qLower.includes('total') && qLower.includes('premium amt')))
    ) {
      const premCol = columns.find(c => c.name.toLowerCase().includes('premium'));
      if (premCol) {
        const filters = this.extractFilters(qLower, columns);
        const hasExplicitSold = filters.some(f => f.column.toLowerCase() === 'sold');
        const defaultIssued = qLower.includes('premium written') && !hasExplicitSold;
        const soldCol = columns.find(c => c.name.toLowerCase() === 'sold');
        return {
          operation: 'aggregate',
          metricColumn: premCol.name,
          measure: 'sum',
          filters: filters.length > 0
            ? filters
            : (defaultIssued && soldCol ? [{ column: soldCol.name, operator: 'eq', value: 'Issued' }] : undefined)
        };
      }
    }

    // 3a13b. Down Payment total / sum check (e.g. "total Down Pymt across all nonblank Down Pymt records")
    if (
      !qLower.includes('which') &&
      (qLower.includes('total down pymt') ||
      qLower.includes('total down payment') ||
      qLower.includes('sum of down pymt') ||
      qLower.includes('sum of down payment'))
    ) {
      const dpCol = columns.find(c => c.name.toLowerCase().includes('down'));
      if (dpCol) {
        const filters = this.extractFilters(qLower, columns);
        return {
          operation: 'aggregate',
          metricColumn: dpCol.name,
          measure: 'sum',
          filters: filters.length > 0 ? filters : undefined
        };
      }
    }

    // 3a14. Average premium check
    if (
      qLower.includes('average premium') ||
      qLower.includes('avg premium') ||
      qLower.includes('mean premium')
    ) {
      const premCol = columns.find(c => c.name.toLowerCase().includes('premium'));
      if (premCol) {
        const filters = this.extractFilters(qLower, columns);
        const hasExplicitSold = filters.some(f => f.column.toLowerCase() === 'sold');
        const defaultIssued = (qLower.includes('average premium for issued') || qLower.includes('average premium written')) && !hasExplicitSold;
        const soldCol = columns.find(c => c.name.toLowerCase() === 'sold');
        return {
          operation: 'aggregate',
          metricColumn: premCol.name,
          measure: 'avg',
          filters: filters.length > 0
            ? filters
            : (defaultIssued && soldCol ? [{ column: soldCol.name, operator: 'eq', value: 'Issued' }] : undefined)
        };
      }
    }

    // 3a14c. Average Down Payment check
    if (
      qLower.includes('average down pymt') ||
      qLower.includes('average down payment') ||
      qLower.includes('avg down pymt') ||
      qLower.includes('avg down payment')
    ) {
      const dpCol = columns.find(c => c.name.toLowerCase().includes('down'));
      if (dpCol) {
        const filters = this.extractFilters(qLower, columns);
        return {
          operation: 'aggregate',
          metricColumn: dpCol.name,
          measure: 'avg',
          filters: filters.length > 0 ? filters : undefined
        };
      }
    }

    // 3a14d. Min / Max on Numeric Columns
    if (
      qLower.includes('minimum premium') ||
      qLower.includes('min premium') ||
      qLower.includes('lowest premium') ||
      qLower.includes('maximum premium') ||
      qLower.includes('max premium') ||
      qLower.includes('highest premium') ||
      qLower.includes('minimum down pymt') ||
      qLower.includes('min down pymt') ||
      qLower.includes('minimum down payment') ||
      qLower.includes('min down payment') ||
      qLower.includes('maximum down pymt') ||
      qLower.includes('max down pymt') ||
      qLower.includes('maximum down payment') ||
      qLower.includes('max down payment')
    ) {
      const isMin = qLower.includes('minimum') || qLower.includes('min') || qLower.includes('lowest');
      const numCol = this.matchNumericColumn(question, file);
      if (numCol) {
        const filters = this.extractFilters(qLower, columns);
        return {
          operation: 'aggregate',
          metricColumn: numCol,
          measure: isMin ? 'min' : 'max',
          filters: filters.length > 0 ? filters : undefined
        };
      }
    }

    // 3a14e. Top Dimension by Metric Sum (e.g. "Which state has the highest total Premium Amt?", "Which dealer has the highest total...")
    if (
      (qLower.includes('which') || qLower.includes('what')) &&
      (qLower.includes('highest total') || qLower.includes('highest premium') || qLower.includes('most premium') || qLower.includes('highest down'))
    ) {
      const metricCol = this.matchNumericColumn(question, file);
      if (metricCol) {
        const cleanDimText = question
          .replace(/which\s+/gi, '')
          .replace(/what\s+/gi, '')
          .replace(/has the highest total\s+/gi, '')
          .replace(/has the highest\s+/gi, '')
          .replace(/has the most\s+/gi, '')
          .replace(/highest total\s+/gi, '')
          .replace(/total premium amt\??/gi, '')
          .replace(/premium amt\??/gi, '')
          .replace(/premium\??/gi, '')
          .replace(/down pymt\??/gi, '')
          .replace(/down payment\??/gi, '')
          .trim();
        const matchedDim = this.matchColumn(cleanDimText, file);
        if (matchedDim && matchedDim.columnName.toLowerCase() !== metricCol.toLowerCase()) {
          return {
            operation: 'top_category',
            dimension: matchedDim.columnName,
            metricColumn: metricCol,
            measure: 'sum',
            limit: 1,
            sort: 'desc',
            include_missing: false
          };
        }
      }
    }

    // 3a15. Unique policies check (Catalog: NUNIQUE(POLICY#) where Sold == 'Issued')
    if (
      qLower === 'how many unique policies are there?' ||
      qLower === 'how many unique policies?' ||
      qLower === 'unique policies' ||
      qLower.includes('unique policies') ||
      qLower.includes('distinct policies')
    ) {
      const polCol = columns.find(c => c.name.toLowerCase().includes('policy'));
      const soldCol = columns.find(c => c.name.toLowerCase() === 'sold');
      if (polCol && soldCol) {
        return {
          operation: 'unique_count',
          dimension: polCol.name,
          filters: [{ column: soldCol.name, operator: 'eq', value: 'Issued' }],
          include_missing: false
        };
      }
    }

    // 3b. 2D Cross-tabulation check (e.g., "what is the Sold status breakdown by Lead Source?")
    const crossTabMatch = qLower.match(/(?:what is the\s+)?(.+?)\s+breakdown by\s+(.+?)(?:\?|$)/i);
    if (crossTabMatch) {
      const dim1Term = crossTabMatch[1].trim();
      const dim2Term = crossTabMatch[2].trim();
      const col1 = this.matchColumn(dim1Term, file);
      const col2 = this.matchColumn(dim2Term, file);
      if (col1 && col2) {
        return {
          operation: 'cross_tab',
          dimension: col1.columnName,
          secondaryDimension: col2.columnName,
          include_missing: false
        };
      }
    }

    // 3c. Out of total leads breakdown (e.g., "Out of the total leads, how many are Issued, Quoted, Called, and Flat Cancel?")
    if (
      qLower.includes('issued, quoted, called') ||
      (qLower.includes('out of the total leads') && qLower.includes('how many are'))
    ) {
      const statusCol = columns.find(c => c.name.toLowerCase() === 'sold');
      if (statusCol) {
        return {
          operation: 'group_count',
          dimension: statusCol.name,
          include_missing: true
        };
      }
    }

    // 3d. Distinct / Unique Count for "How many total [Dimensions] are there?" (e.g. Lead Types, States, Sales Reps, Dealers, etc.)
    const totalDimMatch = qLower.match(/how many total\s+([a-z\s]+?)\s+are there/i);
    if (totalDimMatch) {
      const targetDimText = totalDimMatch[1].trim();
      if (
        !targetDimText.includes('lead') &&
        !targetDimText.includes('record') &&
        !targetDimText.includes('row')
      ) {
        const matchedDim = this.matchColumn(targetDimText, file);
        if (matchedDim) {
          return {
            operation: 'unique_count',
            dimension: matchedDim.columnName,
            include_missing: false
          };
        }
      }
    }

    // 3e. Filtered Top Category (e.g., "Which Lead Source has the most Issued leads?", "Which State has the most Quoted leads?")
    if (
      (qLower.includes('most') || qLower.includes('highest')) &&
      (qLower.includes('issued') || (qLower.includes('quoted') && !qLower.includes('agent quoted') && !qLower.includes('quote date'))) &&
      qLower.includes('which')
    ) {
      const statusVal = qLower.includes('issued') ? 'Issued' : 'Quoted';
      const statusCol = columns.find(c => c.name.toLowerCase() === 'sold');
      const matched = this.matchColumn(question, file);
      if (matched && statusCol) {
        return {
          operation: 'top_category',
          dimension: matched.columnName,
          limit: 1,
          sort: 'desc',
          include_missing: false,
          filters: [{ column: statusCol.name, operator: 'eq', value: statusVal }]
        };
      }
    }

    // Detect operation intent
    let operation: IntermediateOperation = 'group_count';
    let sort: 'desc' | 'asc' = 'desc';
    let limit: number | undefined = undefined;
    let measure: StructuredQuery['measure'] = 'count';
    let includeMissing = true;

    // 4. Total records check (e.g., "how many leads are there?", "how many Auto leads in Texas...", "total count", "policies sold in July", "sales in May")
    const isPoliciesSoldTotalIntent =
      /\b(polic(y|ies|es)\s+sold|sold\s+polic(y|ies|es)|policies issued|number of polic(y|ies|es) sold)\b/i.test(qLower) ||
      (/\bsales\b/i.test(qLower) && !qLower.includes('sales rep')) ||
      (/\bsold\b/i.test(qLower) && (qLower.includes('in ') || qLower.includes('during ') || /\b202\d\b/.test(qLower)));

    if (
      ((qLower.startsWith('how many') ||
        qLower.includes('how many') ||
        qLower.includes('total leads') ||
        qLower.includes('total count') ||
        qLower.includes('count of') ||
        isPoliciesSoldTotalIntent) &&
      !qLower.includes('each') &&
      !/\bby\s+(agent|lead\s+type|state|city|carrier|lead\s+source|source|partner|month|method|lob|line\s+of\s+business|customer\s+type|garaging\s+state|status|year|date|category)\b/i.test(qLower) &&
      !qLower.includes('per ') &&
      !qLower.includes('which') &&
      !qLower.includes('unique') &&
      !qLower.includes('distinct') &&
      !qLower.includes('average') &&
      !qLower.includes('breakdown'))
    ) {
      const filters = this.extractFilters(qLower, columns);
      return {
        operation: 'total_records',
        filters: filters.length > 0 ? filters : undefined
      };
    }

    // 5. Unique count check (e.g., "how many unique lead sources?", "number of distinct states")
    if (qLower.includes('unique') || qLower.includes('distinct') || qLower.includes('how many different')) {
      operation = 'unique_count';
      includeMissing = false;
      const matched = this.matchColumn(question, file);
      if (matched) {
        return {
          operation: 'unique_count',
          dimension: matched.columnName,
          include_missing: false
        };
      }
    }

    // 6. Top / Maximum category (e.g., "which lead source has the most leads?", "highest number of leads")
    if (
      qLower.includes('most') ||
      qLower.includes('highest') ||
      qLower.includes('top') ||
      qLower.includes('maximum') ||
      qLower.includes('largest')
    ) {
      const isSingleTop =
        qLower.includes('which') ||
        qLower.includes('what is the top') ||
        qLower.includes('the most') ||
        qLower.includes('the highest');
      if (isSingleTop) {
        operation = 'top_category';
        limit = 1;
        includeMissing = false;
      } else {
        operation = 'group_count';
        limit = 5;
      }
      sort = 'desc';
    }

    // 7. Bottom / Minimum category (e.g., "which source has the least leads?", "lowest number", "fewest leads")
    if (
      qLower.includes('least') ||
      qLower.includes('lowest') ||
      qLower.includes('minimum') ||
      qLower.includes('bottom') ||
      qLower.includes('smallest') ||
      qLower.includes('fewest')
    ) {
      operation = 'bottom_category';
      sort = 'asc';
      limit = 1;
      includeMissing = false;
    }

    // 8. Numeric Aggregations (sum, average, total revenue, min, max)
    let metricColumn: string | undefined = undefined;
    if (qLower.includes('average') || qLower.includes('avg') || qLower.includes('mean')) {
      operation = 'aggregate';
      measure = 'avg';
      metricColumn = this.matchNumericColumn(question, file);
    } else if (
      qLower.includes('total premium') ||
      qLower.includes('sum of') ||
      qLower.includes('total revenue') ||
      qLower.includes('total payment') ||
      qLower.includes('sum premium')
    ) {
      operation = 'aggregate';
      measure = 'sum';
      metricColumn = this.matchNumericColumn(question, file);
    } else if (qLower.includes('max premium') || qLower.includes('highest premium') || qLower.includes('maximum premium')) {
      operation = 'aggregate';
      measure = 'max';
      metricColumn = this.matchNumericColumn(question, file);
    } else if (qLower.includes('min premium') || qLower.includes('lowest premium') || qLower.includes('minimum premium')) {
      operation = 'aggregate';
      measure = 'min';
      metricColumn = this.matchNumericColumn(question, file);
    }

    // Resolve target dimension column
    let dimension: string | undefined = undefined;

    // Check explicit grouping phrase first: "group by <target>", "grouped by <target>", "by <target>", "each <target>", "per <target>"
    const groupMatch = qLower.match(/(?:group(?:ed)?\s+by|\bby\s+|\bper\s+|\beach\s+)([a-z\s]+?)(?:\?|$|\bin\b|\bfor\b|\bduring\b)/i);
    if (groupMatch) {
      const grpTarget = groupMatch[1].trim();
      if (/\b(months?|monthly|month-wise)\b/i.test(grpTarget)) {
        dimension = 'Month';
      } else if (/\b(agents?|agent sold)\b/i.test(grpTarget) && !grpTarget.includes('quoted') && !grpTarget.includes('sales rep')) {
        const agCol = columns.find(c => c.name.toLowerCase() === 'agent sold');
        if (agCol) dimension = agCol.name;
      } else if (/\b(sold\s+(day|date)|date\s+sold)\b/i.test(grpTarget)) {
        const dsCol = columns.find(c => c.name.toLowerCase() === 'date sold');
        if (dsCol) dimension = dsCol.name;
      } else {
        const grpMatchedCol = this.matchColumn(grpTarget, file);
        if (grpMatchedCol) dimension = grpMatchedCol.columnName;
      }
    }

    if (!dimension) {
      if (/\b(by month|grouped by month|per month|each month|month wise|month-wise|monthly)\b/i.test(qLower)) {
        dimension = 'Month';
      } else {
        const matchedCol = this.matchColumn(question, file);
        dimension = matchedCol ? matchedCol.columnName : undefined;
      }
    }

    // Fallback: If no column detected but question asks about breakdown or distribution
    if (!dimension) {
      if (qLower.includes('source')) {
        dimension = columns.find(c => c.name.toLowerCase().includes('source'))?.name;
      } else if (qLower.includes('type')) {
        dimension = columns.find(c => c.name.toLowerCase().includes('type'))?.name;
      } else if (qLower.includes('state')) {
        dimension = columns.find(c => c.name.toLowerCase().includes('state'))?.name;
      }
    }

    // Extract any filters (e.g. State = 'Arizona', Lead Type = 'Auto', Lead Source = 'Web')
    const filters = this.extractFilters(qLower, columns);

    // If no dimension, no metric column, and no filters were resolved, do not force a synthetic group_count
    if (!dimension && !metricColumn && filters.length === 0) {
      return null;
    }

    return {
      operation,
      dimension,
      metricColumn,
      measure,
      sort,
      limit,
      include_missing: includeMissing,
      filters: filters.length > 0 ? filters : undefined
    };
  }

  /**
   * LLM-Powered Query Planner: When natural language question contains complex
   * multi-condition filters or conversational phrasing, asks the LLM to translate it
   * into a verified StructuredQuery JSON object.
   */
  public async planQueryWithLLM(
    question: string,
    file: StoredFile,
    providerId?: string,
    modelId?: string,
    history?: { role: 'user' | 'assistant'; content: string }[]
  ): Promise<StructuredQuery | null> {
    if (!file.schema || !file.schema.columns || file.schema.columns.length === 0) {
      return null;
    }

    const qLower = question.toLowerCase();
    if (
      qLower.includes('executive summary') ||
      qLower.includes('summarize this') ||
      qLower.includes('summary of the') ||
      qLower.includes('summary of this') ||
      qLower.includes('key takeaways') ||
      qLower.includes('business takeaways') ||
      qLower.includes('business insights') ||
      qLower.includes('explain the data')
    ) {
      return null;
    }

    const cols = file.schema.columns.map(c => ({
      name: c.name,
      type: c.type,
      sampleValues: c.sampleValues?.slice(0, 4)
    }));

    const systemPrompt = `You are a Text-to-Structured-Query data analyst planner for file "${file.name}".
Translate the user question into a JSON StructuredQuery based strictly on the available columns.

AVAILABLE COLUMNS IN DATASET:
${JSON.stringify(cols, null, 2)}

SUPPORTED OPERATIONS:
- "total_records": count total matching rows
- "group_count": breakdown of counts by a categorical dimension
- "unique_count": count of distinct values in a column
- "top_category": find the highest category by volume
- "bottom_category": find the lowest category by volume
- "aggregate": measure ("sum", "avg", "min", "max") of a numeric column
- "filter_rows": retrieve specific sample rows matching filter criteria
- "missing_audit": audit missing/null values across columns
- "schema_overview": overview of columns, types, and schema

CRITICAL RULES:
1. ONLY use column names that EXACTLY match one of the available column names above. For month-wise breakdown or grouping by month, set dimension: "Month".
2. Return ONLY a single raw JSON object matching the schema below. No markdown or explanation.
3. If the question asks for a count with filters (e.g. "Auto leads in Texas"), use "total_records" with filters.
4. If the question asks for breakdown or "each" or "by", use "group_count" with "dimension".
5. For date comparisons, "gte", "lte", "gt", "lt", "contains" are supported (e.g. "2026-07-01" or "Jul-2026").
6. CRITICAL SOLD/ISSUED RULE: "POLICIES SOLD", "POLICIES ISSUED", "SALES", "SOLD POLICIES", "NUMBER OF POLICIES SOLD" means ONLY: Sold column == "Issued". NEVER include "Flat Cancel", "Quoted", "Called", blank/null. Always include filter { "column": "Sold", "operator": "eq", "value": "Issued" } when counting sold policies or sales.
7. DATE BASIS: Sold/Issued/Sales/Premium -> "Date Sold"; Quotes/Quoted -> "Quoted Date"; Leads/Source/State -> "Added Time".
8. DISAMBIGUATION: NEVER substitute "Lead Source" for "Partner Name", or "Partner Name" for "Lead Source".
9. CLOSE RATE: Use operation "close_rate".
10. NO CONTEXT-BASED COLUMN INFERENCE: A new user question MUST NOT inherit the analytical column/dimension or filters from the previous question unless the user explicitly refers to it with continuation words (e.g. "among those", "break that down by", "what about June?"). If the requested column (e.g. "Category") does not exist in AVAILABLE COLUMNS, DO NOT guess or substitute with a previous column.

${trainingCatalogService.formatCatalogForPrompt()}

JSON RESPONSE SCHEMA:
{
  "operation": "total_records" | "group_count" | "unique_count" | "top_category" | "bottom_category" | "aggregate" | "filter_rows" | "missing_audit" | "schema_overview",
  "dimension": string (optional),
  "metricColumn": string (optional),
  "measure": "count" | "sum" | "avg" | "min" | "max" (optional),
  "filters": [
    { "column": string, "operator": "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains" | "is_null", "value": any }
  ] (optional)
}

Respond with valid JSON ONLY.`;

    let userPrompt = `USER QUESTION: "${question}"`;
    if (history && history.length > 0) {
      const qLower = question.toLowerCase();
      const hasExplicitReferenceToken = /\b(among\s+those|out\s+of\s+those|of\s+those|for\s+those|for\s+the\s+same|break\s+(?:that\s+)?down|breakdown\s+that|now\s+group\s+(?:those\s+)?by|now\s+slice\s+by|from\s+those)\b/i.test(qLower);
      const isPureGroupDirective = /^(by|grouped\s+by|group\s+by|per|breakdown\s+by)\s+[a-z\s]+$/i.test(qLower.trim());
      const MONTH_NAMES_LIST = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
      const hasMonth = MONTH_NAMES_LIST.some(m => new RegExp(`\\b${m}\\b`, 'i').test(qLower));
      const isDateEllipsis = hasMonth && /^(what\s+about|how\s+about|and\s+in|and\s+for|in|for|and)\s+[a-z]+(\s+202\d)?\??$/i.test(qLower.trim());

      if (hasExplicitReferenceToken || isPureGroupDirective || isDateEllipsis) {
        const recentUser = history
          .filter(m => m.role === 'user' && m.content && m.content.trim() !== question.trim())
          .slice(-3)
          .map(m => `Prior Question: "${m.content.trim()}"`)
          .join('\n');
        if (recentUser) {
          userPrompt = `CONVERSATION CONTEXT (Prior questions asked by user):\n${recentUser}\n\nCURRENT QUESTION: "${question}"\n(This question is an explicit continuation. Resolve it in the context of the prior question while adhering to all columns and rules above.)`;
        }
      }
    }

    try {
      const res = await aiProviderService.generateCompletion({
        providerId,
        modelId,
        systemPrompt,
        userPrompt,
        temperature: 0.1
      });

      if (!res.content) return null;
      let rawJson = res.content.trim();
      const match = rawJson.match(/\{[\s\S]*\}/);
      if (match) rawJson = match[0];

      const parsed: StructuredQuery = JSON.parse(rawJson);

      // Validate that parsed columns exist in the real file schema
      const validNames = new Set(file.schema.columns.map(c => c.name.toLowerCase()));

      if (parsed.dimension && parsed.dimension.toLowerCase() !== 'month' && !validNames.has(parsed.dimension.toLowerCase())) {
        const closest = file.schema.columns.find(c => c.name.toLowerCase().includes(parsed.dimension!.toLowerCase()));
        parsed.dimension = closest ? closest.name : undefined;
      } else if (parsed.dimension && parsed.dimension.toLowerCase() === 'month') {
        parsed.dimension = 'Month';
      }

      if (parsed.metricColumn && !validNames.has(parsed.metricColumn.toLowerCase())) {
        const closest = file.schema.columns.find(c => c.name.toLowerCase().includes(parsed.metricColumn!.toLowerCase()));
        parsed.metricColumn = closest ? closest.name : undefined;
      }

      if (parsed.filters && Array.isArray(parsed.filters)) {
        parsed.filters = parsed.filters.filter(f => {
          if (!f.column) return false;
          const found = file.schema?.columns.find(c => c.name.toLowerCase() === f.column.toLowerCase());
          if (found) {
            f.column = found.name;
            return true;
          }
          return false;
        });
      }

      return parsed;
    } catch (err) {
      console.warn('LLM query planning error:', err);
      return null;
    }
  }

  /**
   * Helper: Extracts filters from the natural language query dynamically across all columns
   */
  private extractFilters(
    rawQLower: string,
    columns: { name: string; type?: string; sampleValues?: any[] }[]
  ): StructuredFilter[] {
    const filters: StructuredFilter[] = [];

    // Normalize attached month-years (e.g. "feb2026" -> "feb 2026", "2026feb" -> "2026 feb")
    const qLower = rawQLower
      .replace(/([a-z]+)(202\d)/gi, '$1 $2')
      .replace(/(202\d)([a-z]+)/gi, '$1 $2');

    // 1. Payment Method / Pymt filter check (checked before State to avoid "Co Esig" matching "CO")
    const pymtCol = columns.find(c => c.name.toLowerCase() === 'pymt' || (c.name.toLowerCase().includes('payment') && !c.name.toLowerCase().includes('down')));
    const methodCol = columns.find(c => c.name.toLowerCase() === 'method');

    if (/\bcc\b/i.test(qLower) || qLower.includes('credit card')) {
      const targetCol = pymtCol || methodCol;
      if (targetCol) {
        filters.push({ column: targetCol.name, operator: 'eq', value: 'CC' });
      }
    } else if (qLower.includes('co esig') || qLower.includes('co-esig') || qLower.includes('coesig')) {
      const targetCol = methodCol || pymtCol;
      if (targetCol) {
        filters.push({ column: targetCol.name, operator: 'eq', value: 'Co Esig' });
      }
    } else if (qLower.includes('zoho sign') || qLower.includes('zohosign') || qLower.includes('zoho')) {
      const targetCol = methodCol || pymtCol;
      if (targetCol) {
        filters.push({ column: targetCol.name, operator: 'eq', value: 'ZOHO SIGN' });
      }
    } else if (qLower.includes('in person') || qLower.includes('in-person')) {
      const targetCol = methodCol || pymtCol;
      if (targetCol) {
        filters.push({ column: targetCol.name, operator: 'eq', value: 'In Person' });
      }
    } else if (qLower.includes('mail') && !qLower.includes('email') && !qLower.includes('gmail')) {
      const targetCol = methodCol || pymtCol;
      if (targetCol) {
        filters.push({ column: targetCol.name, operator: 'eq', value: 'Mail' });
      }
    }

    // 2. State filter check
    const stateCol = columns.find(c => c.name.toLowerCase() === 'state' || c.name.toLowerCase().includes('state'));
    if (stateCol) {
      if (qLower.includes('state populated') || qLower.includes('state is populated')) {
        filters.push({ column: stateCol.name, operator: 'not_null', value: true });
      } else {
        const US_STATES: Record<string, string> = {
          arizona: 'Arizona',
          az: 'AZ',
          california: 'California',
          ca: 'CA',
          texas: 'Texas',
          tx: 'TX',
          florida: 'Florida',
          fl: 'FL',
          nevada: 'Nevada',
          nv: 'NV',
          georgia: 'Georgia',
          ga: 'GA',
          ohio: 'Ohio',
          oh: 'OH',
          michigan: 'Michigan',
          mi: 'MI',
          illinois: 'Illinois',
          il: 'IL',
          pennsylvania: 'Pennsylvania',
          pa: 'PA',
          'new york': 'New York',
          ny: 'NY',
          'north carolina': 'North Carolina',
          nc: 'NC',
          colorado: 'Colorado',
          co: 'CO'
        };

        for (const [sKey, sVal] of Object.entries(US_STATES)) {
          if (sKey === 'co' && (qLower.includes('co esig') || qLower.includes('company') || qLower.includes('corp'))) {
            continue;
          }
          const regex = new RegExp(`\\b${sKey}\\b`, 'i');
          if (regex.test(qLower)) {
            filters.push({
              column: stateCol.name,
              operator: 'eq',
              value: sVal
            });
            break;
          }
        }
      }
    }

    // 3. Customer Type filter check
    const custTypeCol = columns.find(c => c.name.toLowerCase() === 'customer type');
    if (custTypeCol) {
      if (qLower.includes('personal')) {
        filters.push({ column: custTypeCol.name, operator: 'eq', value: 'Personal' });
      } else if (
        qLower.includes('commercial customer') ||
        (qLower.includes('commercial') && !qLower.includes('line of business') && !qLower.includes('lead type') && !qLower.includes('commercial auto'))
      ) {
        filters.push({ column: custTypeCol.name, operator: 'eq', value: 'Commercial' });
      }
    }

    // 4. Line of Business filter check
    const lobCol = columns.find(c => c.name.toLowerCase() === 'line of biz' || c.name.toLowerCase().includes('line of business'));
    if (lobCol) {
      if (/\bantique auto\b/i.test(qLower)) {
        filters.push({ column: lobCol.name, operator: 'eq', value: 'Antique Auto' });
      } else if (/\bcommercial auto\b/i.test(qLower)) {
        filters.push({ column: lobCol.name, operator: 'eq', value: 'Commercial Auto' });
      } else if (/\bboat\b/i.test(qLower)) {
        filters.push({ column: lobCol.name, operator: 'eq', value: 'Boat' });
      } else if (/\bbonds?\b/i.test(qLower)) {
        filters.push({ column: lobCol.name, operator: 'eq', value: 'Bonds' });
      } else if (/\b(dwelling fire)\b/i.test(qLower)) {
        filters.push({ column: lobCol.name, operator: 'eq', value: 'Dwelling Fire' });
      } else if (/\bmc\b/i.test(qLower) || qLower.includes('mc leads')) {
        filters.push({ column: lobCol.name, operator: 'eq', value: 'MC' });
      } else if (qLower.includes('white glove')) {
        filters.push({ column: lobCol.name, operator: 'eq', value: 'White Glove' });
      } else if (qLower.includes('preferred auto')) {
        filters.push({ column: lobCol.name, operator: 'eq', value: 'Preferred Auto' });
      } else if (/\b(auto|car|automobile)\b/i.test(qLower) && !qLower.includes('dealer')) {
        filters.push({ column: lobCol.name, operator: 'eq', value: 'Auto' });
      } else if (qLower.includes('line of business') || qLower.includes('line of biz')) {
        if (qLower.includes('auto')) {
          filters.push({ column: lobCol.name, operator: 'eq', value: 'Auto' });
        } else if (qLower.includes('home')) {
          filters.push({ column: lobCol.name, operator: 'eq', value: 'Home' });
        } else if (qLower.includes('renters')) {
          filters.push({ column: lobCol.name, operator: 'eq', value: 'Renters' });
        } else if (qLower.includes('commercial')) {
          filters.push({ column: lobCol.name, operator: 'eq', value: 'Commercial' });
        }
      }
    }

    // 5. Insurance Company / Carrier filter check
    const insCol = columns.find(c => c.name.toLowerCase() === 'ins company' || c.name.toLowerCase().includes('insurance company'));
    if (insCol) {
      if (qLower.includes('progressive')) {
        filters.push({ column: insCol.name, operator: 'eq', value: 'Progressive' });
      } else if (qLower.includes('travelers') || qLower.includes('traveler')) {
        filters.push({ column: insCol.name, operator: 'contains', value: 'Travelers' });
      } else if (qLower.includes('geico')) {
        filters.push({ column: insCol.name, operator: 'eq', value: 'GEICO' });
      } else if (qLower.includes('root')) {
        filters.push({ column: insCol.name, operator: 'eq', value: 'Root' });
      } else if (qLower.includes('gainsco')) {
        filters.push({ column: insCol.name, operator: 'eq', value: 'Gainsco' });
      } else if (qLower.includes('assurance america')) {
        filters.push({ column: insCol.name, operator: 'eq', value: 'Assurance America' });
      }
    }

    // 6. Agent Sold filter check
    const agentSoldCol = columns.find(c => c.name.toLowerCase() === 'agent sold');
    if (agentSoldCol) {
      const AGENTS = ['francisco', 'marissa', 'amalia', 'jose', 'jailen clark', 'marcelino', 'yvonne', 'justin', 'lauro acuna'];
      for (const ag of AGENTS) {
        const regex = new RegExp(`\\b${ag}\\b`, 'i');
        if (regex.test(qLower)) {
          const capAg = ag.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          filters.push({ column: agentSoldCol.name, operator: 'eq', value: capAg });
          break;
        }
      }
    }

    // 7. Lead Type filter check (only if not already filtered by Line of Biz)
    const typeCol = columns.find(
      c => c.name.toLowerCase() === 'lead type' || (c.name.toLowerCase().includes('lead type') && !c.name.toLowerCase().includes('payment'))
    );
    if (typeCol && !filters.some(f => f.column === lobCol?.name) && !qLower.includes('line of business') && !qLower.includes('customer type')) {
      const TYPES = ['auto', 'home', 'renters', 'motorcycle', 'commercial', 'mh'];
      for (const t of TYPES) {
        const regex = new RegExp(`\\b${t}\\b`, 'i');
        if (regex.test(qLower)) {
          filters.push({
            column: typeCol.name,
            operator: 'eq',
            value: t === 'mh' ? 'MH' : t.charAt(0).toUpperCase() + t.slice(1)
          });
          break;
        }
      }
    }

    // 7b. Vehicle Make filter check
    const makeCol = columns.find(c => c.name.toLowerCase() === 'vehicle make');
    if (makeCol) {
      const MAKES: Record<string, string> = {
        toyota: 'TOYOTA',
        honda: 'HONDA',
        ford: 'FORD',
        chevrolet: 'CHEVROLET',
        chevy: 'CHEVROLET',
        hyundai: 'HYUNDAI',
        nissan: 'NISSAN',
        kia: 'KIA',
        jeep: 'JEEP',
        dodge: 'DODGE',
        gmc: 'GMC',
        ram: 'RAM',
        subaru: 'SUBARU',
        bmw: 'BMW',
        mercedes: 'MERCEDES',
        volkswagen: 'VOLKSWAGEN',
        lexus: 'LEXUS',
        audi: 'AUDI',
        mazda: 'MAZDA'
      };
      for (const [mKey, mVal] of Object.entries(MAKES)) {
        const regex = new RegExp(`\\b${mKey}\\b`, 'i');
        if (regex.test(qLower)) {
          filters.push({ column: makeCol.name, operator: 'contains', value: mVal });
          break;
        }
      }
    }

    // 8. Lead Source filter check (excluding 'dealer' which refers to the Dealers column)
    const sourceCol = columns.find(c => c.name.toLowerCase().includes('lead source') || c.name.toLowerCase().includes('source'));
    if (sourceCol) {
      if (/rr\s*3\.0/i.test(qLower)) {
        filters.push({
          column: sourceCol.name,
          operator: 'eq',
          value: 'RR 3.0'
        });
      } else if (/\blead\s+partner\b/i.test(qLower)) {
        filters.push({
          column: sourceCol.name,
          operator: 'eq',
          value: 'Lead Partner'
        });
      } else {
        const SOURCES = ['web', 'nexus', 'direct', 'shipper'];
        for (const s of SOURCES) {
          const regex = new RegExp(`\\b${s}\\b`, 'i');
          if (regex.test(qLower)) {
            // Disambiguation: if question references partner/partner name/partner code without explicitly specifying source/from nexus,
            // 'nexus' refers to Partner Name, not Lead Source
            if (s === 'nexus' && (qLower.includes('partner') || qLower.includes('partner name') || qLower.includes('partner code')) && !qLower.includes('from nexus') && !qLower.includes('source nexus')) {
              continue;
            }
            filters.push({
              column: sourceCol.name,
              operator: 'eq',
              value: s.charAt(0).toUpperCase() + s.slice(1)
            });
            break;
          }
        }
      }
    }

    // 8b. Partner Name filter check
    const partnerCol = columns.find(c => c.name.toLowerCase() === 'partner name');
    if (partnerCol) {
      if (qLower.includes('all other') || qLower.includes('allother')) {
        filters.push({ column: partnerCol.name, operator: 'eq', value: 'All Other' });
      } else if (qLower.includes('web quote') || qLower.includes('webquote')) {
        filters.push({ column: partnerCol.name, operator: 'eq', value: 'Web Quote' });
      } else if (qLower.includes('drivetime') || qLower.includes('drive time')) {
        filters.push({ column: partnerCol.name, operator: 'eq', value: 'DriveTime' });
      } else if (qLower.includes('partner name as nexus') || (qLower.includes('partner') && qLower.includes('nexus')) || qLower.includes('as nexus')) {
        filters.push({ column: partnerCol.name, operator: 'eq', value: 'Nexus' });
      }
    }

    // 9. Date / Temporal / Month filter check
    const dateCols = columns.filter(c => c.type === 'date' || c.name.toLowerCase().includes('date') || c.name.toLowerCase().includes('time'));
    let hasDateFilter = false;

    if (dateCols.length > 0) {
      const dsCol = dateCols.find(c => c.name.toLowerCase().includes('sold'));
      const qdCol = dateCols.find(c => c.name.toLowerCase().includes('quoted') || c.name.toLowerCase().includes('quote'));
      const effCol = dateCols.find(c => c.name.toLowerCase().includes('effective'));
      const addCol = dateCols.find(c => c.name.toLowerCase().includes('added') || c.name.toLowerCase().includes('created'));

      let targetDateCol = addCol || dsCol || dateCols[0];
      if (qLower.includes('effective') && effCol) {
        targetDateCol = effCol;
      } else if ((qLower.includes('quoted date') || qLower.includes('quote date')) && qdCol) {
        targetDateCol = qdCol;
      } else if ((qLower.includes('sold date') || qLower.includes('date sold')) && dsCol) {
        targetDateCol = dsCol;
      } else if ((qLower.includes('added time') || qLower.includes('added date') || qLower.includes('created time')) && addCol) {
        targetDateCol = addCol;
      } else {
        const canonicalBasis = trainingCatalogService.getDateBasisForMetric(qLower);
        const matchedBasisCol = dateCols.find(c => c.name.toLowerCase() === canonicalBasis.toLowerCase());
        if (matchedBasisCol) {
          targetDateCol = matchedBasisCol;
        } else if (canonicalBasis === 'Date Sold' && dsCol) {
          targetDateCol = dsCol;
        } else if (canonicalBasis === 'Quoted Date' && qdCol) {
          targetDateCol = qdCol;
        } else if (canonicalBasis === 'Added Time' && addCol) {
          targetDateCol = addCol;
        }
      }

      const MONTH_SPECS = [
        { name: 'January', pattern: /\b(january|jan)\b/i, token: 'Jan' },
        { name: 'February', pattern: /\b(february|feb)\b/i, token: 'Feb' },
        { name: 'March', pattern: /\b(march|mar)\b/i, token: 'Mar' },
        { name: 'April', pattern: /\b(april|apr)\b/i, token: 'Apr' },
        { name: 'May', pattern: /\bmay\b/i, token: 'May' },
        { name: 'June', pattern: /\b(june|jun)\b/i, token: 'Jun' },
        { name: 'July', pattern: /\b(july|jul)\b/i, token: 'Jul' },
        { name: 'August', pattern: /\b(august|aug)\b/i, token: 'Aug' },
        { name: 'September', pattern: /\b(september|sep|sept)\b/i, token: 'Sep' },
        { name: 'October', pattern: /\b(october|oct)\b/i, token: 'Oct' },
        { name: 'November', pattern: /\b(november|nov)\b/i, token: 'Nov' },
        { name: 'December', pattern: /\b(december|dec)\b/i, token: 'Dec' }
      ];

      const detectedMonths: { name: string; token: string }[] = [];
      for (const m of MONTH_SPECS) {
        if (m.pattern.test(qLower)) {
          detectedMonths.push(m);
        }
      }

      const yearMatch = qLower.match(/\b(19\d\d|20\d\d)\b/);
      const detectedYear = yearMatch ? yearMatch[1] : undefined;

      const MONTH_NUM_MAP: Record<string, { num: string; nextNum: string; nextYrDelta: number }> = {
        jan: { num: '01', nextNum: '02', nextYrDelta: 0 },
        feb: { num: '02', nextNum: '03', nextYrDelta: 0 },
        mar: { num: '03', nextNum: '04', nextYrDelta: 0 },
        apr: { num: '04', nextNum: '05', nextYrDelta: 0 },
        may: { num: '05', nextNum: '06', nextYrDelta: 0 },
        jun: { num: '06', nextNum: '07', nextYrDelta: 0 },
        jul: { num: '07', nextNum: '08', nextYrDelta: 0 },
        aug: { num: '08', nextNum: '09', nextYrDelta: 0 },
        sep: { num: '09', nextNum: '10', nextYrDelta: 0 },
        oct: { num: '10', nextNum: '11', nextYrDelta: 0 },
        nov: { num: '11', nextNum: '12', nextYrDelta: 0 },
        dec: { num: '12', nextNum: '01', nextYrDelta: 1 }
      };

      if (detectedMonths.length > 0) {
        hasDateFilter = true;
        if (detectedMonths.length === 1) {
          const m = detectedMonths[0];
          const mInfo = MONTH_NUM_MAP[m.token.toLowerCase()];
          const yr = detectedYear || '2026';
          if (mInfo) {
            const startYr = parseInt(yr, 10);
            const endYr = startYr + mInfo.nextYrDelta;
            filters.push({
              column: targetDateCol.name,
              operator: 'date_range',
              value: {
                month: m.name,
                monthToken: m.token,
                year: yr,
                start: `${startYr}-${mInfo.num}-01`,
                endExclusive: `${endYr}-${mInfo.nextNum}-01`
              }
            });
          } else {
            const filterVal = detectedYear ? `${m.token}-${detectedYear}` : m.token;
            filters.push({
              column: targetDateCol.name,
              operator: 'contains',
              value: filterVal
            });
          }
        } else {
          const filterVals = detectedMonths.map(m => detectedYear ? `${m.token}-${detectedYear}` : m.token);
          filters.push({
            column: targetDateCol.name,
            operator: 'contains',
            value: filterVals
          });
        }
      } else if (detectedYear) {
        hasDateFilter = true;
        const isVehicleYearQuery = qLower.includes('vehicle') || qLower.includes('car');
        const vehYearCol = columns.find(c => c.name.toLowerCase() === 'vehicle year');
        if (isVehicleYearQuery && vehYearCol) {
          filters.push({
            column: vehYearCol.name,
            operator: 'contains',
            value: detectedYear
          });
        } else {
          if ((qLower.includes('quote') || qLower.includes('quotes')) && qdCol) {
            targetDateCol = qdCol;
          } else if ((qLower.includes('sold') || qLower.includes('policy') || qLower.includes('policies')) && dsCol) {
            targetDateCol = dsCol;
          }
          filters.push({
            column: targetDateCol.name,
            operator: 'contains',
            value: detectedYear
          });
        }
      }
    }

    // 10. Status filter check on Sold column
    const statusCol = columns.find(c => c.name.toLowerCase() === 'sold' || c.name.toLowerCase().includes('status'));
    if (statusCol) {
      if (
        qLower.includes('either sold = yes or sold = issued') ||
        qLower.includes('either yes or issued') ||
        (qLower.includes('yes') && qLower.includes('issued') && (qLower.includes('either') || qLower.includes(' or ')))
      ) {
        filters.push({ column: statusCol.name, operator: 'in', value: ['Yes', 'Issued'] });
      } else if (/\bsold\s*(?:=|==|is)\s*yes\b/i.test(qLower) || /\bhave sold = yes\b/i.test(qLower)) {
        filters.push({ column: statusCol.name, operator: 'eq', value: 'Yes' });
      } else if (/\bsold\s*(?:=|==|is)\s*no\b/i.test(qLower) || /\bhave sold = no\b/i.test(qLower)) {
        filters.push({ column: statusCol.name, operator: 'eq', value: 'No' });
      } else if (/\bsold\s*(?:=|==|is)\s*cancelled\b/i.test(qLower) || /\bhave sold = cancelled\b/i.test(qLower)) {
        filters.push({ column: statusCol.name, operator: 'eq', value: 'Cancelled' });
      } else if (/\bsold\s*(?:=|==|is)\s*quoted\b/i.test(qLower) || /\bhave sold = quoted\b/i.test(qLower)) {
        filters.push({ column: statusCol.name, operator: 'eq', value: 'Quoted' });
      } else if (/\bsold\s*(?:=|==|is)\s*issued\b/i.test(qLower) || /\bhave sold = issued\b/i.test(qLower)) {
        filters.push({ column: statusCol.name, operator: 'eq', value: 'Issued' });
      } else if (qLower.includes('flat cancel')) {
        filters.push({ column: statusCol.name, operator: 'eq', value: 'Flat Cancel' });
      } else if (qLower.includes('cancelled')) {
        filters.push({ column: statusCol.name, operator: 'eq', value: 'Cancelled' });
      } else if (qLower.includes('quoted') && !hasDateFilter && !qLower.includes('agent quoted') && !qLower.includes('quoted date') && !qLower.includes('quote date')) {
        filters.push({ column: statusCol.name, operator: 'eq', value: 'Quoted' });
      } else if (qLower.includes('called')) {
        filters.push({ column: statusCol.name, operator: 'eq', value: 'Called' });
      } else if (qLower.includes('have a sold status') || qLower.includes('have sold status')) {
        filters.push({ column: statusCol.name, operator: 'in', value: ['Issued', 'Sold'] });
      } else if (
        !qLower.includes('have a date sold') &&
        !qLower.includes('have date sold') &&
        (qLower.includes('issued') ||
        /\b(polic(y|ies|es)\s+sold|sold\s+polic(y|ies|es)|polic(y|ies|es)\s+issued|number of polic(y|ies|es) sold)\b/i.test(qLower) ||
        (/\bsales\b/i.test(qLower) && !qLower.includes('sales rep')) ||
        (/\bsold\b/i.test(qLower) && (hasDateFilter || /\b(by|in|from|during|each)\b/i.test(qLower)) && !qLower.includes('agent sold') && !qLower.includes('date sold')) ||
        /\b(how many (polic(y|ies|es) )?sold)\b/i.test(qLower) ||
        (/\b(sell|sold)\b/i.test(qLower) && /\b(polic(y|ies|es))\b/i.test(qLower) && !qLower.includes('date sold')) ||
        qLower.includes('leads are sold') ||
        qLower.includes('leads sold') ||
        qLower.includes('policies sold') ||
        qLower.includes('sold policies') ||
        qLower.includes('how many sold'))
      ) {
        filters.push({ column: statusCol.name, operator: 'eq', value: 'Issued' });
      }
    }

    // 11. Numeric threshold filter (e.g. "premium > 1000", "over 1000", "under 500")
    let numCol: { name: string; type?: string } | undefined;
    if (qLower.includes('premium')) {
      numCol = columns.find(c => c.name.toLowerCase().includes('premium'));
    } else if (qLower.includes('down') || qLower.includes('deposit')) {
      numCol = columns.find(c => c.name.toLowerCase().includes('down'));
    } else if (qLower.includes('payment') || qLower.includes('pymt')) {
      numCol = columns.find(c => c.name.toLowerCase().includes('pymt') || c.name.toLowerCase().includes('payment'));
    } else if (qLower.includes('year')) {
      numCol = columns.find(c => c.name.toLowerCase().includes('year'));
    }
    if (!numCol) {
      numCol = columns.find(c => c.type === 'numeric');
    }

    if (numCol) {
      const gtMatch = qLower.match(/(?:>|greater than|over|more than|above)\s*\$?(\d+(?:,\d+)*(?:\.\d+)?)/i);
      if (gtMatch) {
        filters.push({
          column: numCol.name,
          operator: 'gt',
          value: parseFloat(gtMatch[1].replace(/,/g, ''))
        });
      }
      const ltMatch = qLower.match(/(?:<|less than|under|below)\s*\$?(\d+(?:,\d+)*(?:\.\d+)?)/i);
      if (ltMatch) {
        filters.push({
          column: numCol.name,
          operator: 'lt',
          value: parseFloat(ltMatch[1].replace(/,/g, ''))
        });
      }
    }

    return filters;
  }
}

export const semanticLayer = new SemanticLayerService();
