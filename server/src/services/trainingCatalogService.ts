import { StoredFile, TabularSchema, StructuredQuery, StructuredFilter } from '../types/index.js';
import { CATALOG_ROWS, TrainingCatalogRow } from '../assets/trainingCatalogData.js';

export class TrainingCatalogService {
  private rules: TrainingCatalogRow[] = CATALOG_ROWS;

  public getAllRules(): TrainingCatalogRow[] {
    return this.rules;
  }

  public getRulesByApproach(approachType: string): TrainingCatalogRow[] {
    return this.rules.filter(r => r.approach_type.toUpperCase() === approachType.toUpperCase());
  }

  /**
   * Identifies the primary date basis for a metric according to the training catalog:
   * - Sold / Policies Sold / Issued / Flat Cancel / Premium Written / Average Premium / Unique Policies -> 'Date Sold'
   * - Quotes / Quoted / Quoted-not-sold / Close Rate -> 'Quoted Date'
   * - Leads / Total Leads / Source / State / City / Garaging State / Customer Type -> 'Added Time'
   */
  public getDateBasisForMetric(metricOrQuestion: string): string {
    const lower = metricOrQuestion.toLowerCase();
    if (lower.includes('sold') || lower.includes('issued') || lower.includes('flat cancel') || lower.includes('premium')) {
      return 'Date Sold';
    }
    if (lower.includes('quote') || lower.includes('quoted') || lower.includes('close rate')) {
      return 'Quoted Date';
    }
    return 'Added Time';
  }

  /**
   * Applies the training catalog's Natural Language Safeguards:
   * 1. Ambiguous category: User says 'category' without field, no Category column -> clarify
   * 2. Ambiguous policies: User says 'policies' -> default to Issued row count, do not substitute NUNIQUE
   * 3. Wrong-column prevention: Partner Name vs Lead Source -> exact match, never substitute
   * 4. No fabricated field: User asks unknown column -> reject/clarify
   * 5. No historical answer reuse: Always compute fresh from current dataset
   */
  public checkSafeguards(
    question: string,
    file?: StoredFile
  ): { status: 'safe' | 'clarify' | 'warn'; message?: string; recommendedDimension?: string } {
    const qLower = question.toLowerCase();

    // Safeguard 1: Ambiguous category
    if (/\b(category|categories|categorys|categorical)\b/i.test(qLower)) {
      const hasCategoryCol = file?.schema?.columns.some(c => c.name.toLowerCase() === 'category');
      if (!hasCategoryCol) {
        return {
          status: 'clarify',
          message: `The dataset does not contain a column named **Category**.\n\nDid you mean one of the following fields?\n- **Lead Type** (e.g., Auto, Home, Renters)\n- **Line of Business** (e.g., Personal, Commercial)\n- **Lead Source** (e.g., Web, Nexus, RR 3.0)\n- **Partner Name** (e.g., Nexus, Web Quote)\n- **Customer Type** (e.g., Personal, Commercial)\n\nPlease specify which dataset field you would like to analyze.`,
          recommendedDimension: 'Lead Type'
        };
      }
    }

    // Safeguard 4: No fabricated field check
    if (file?.schema) {
      const colNames = file.schema.columns.map(c => c.name.toLowerCase());
      // Check for common fabricated fields
      const fabricatedCandidates = ['profit', 'margin', 'churn rate', 'loss ratio', 'claim amount', 'credit score'];
      for (const fab of fabricatedCandidates) {
        if (qLower.includes(fab) && !colNames.some(c => c.includes(fab))) {
          return {
            status: 'clarify',
            message: `The metric or field "${fab}" is not present in "${file.name}". Available numeric metrics include: ${file.schema.numericColumns.join(', ')}.`
          };
        }
      }
    }

    return { status: 'safe' };
  }

  /**
   * Formats the training catalog as concise, powerful analytical guidelines
   * for LLM prompt injection and query planning
   */
  public formatCatalogForPrompt(): string {
    return `=== AUTHORITATIVE LEAD & POLICY ANALYTICS TRAINING CATALOG & RULES ===
Follow these mandatory guidelines strictly:
1. CORE METRICS:
- Policies sold: COUNT(Sold == 'Issued') on 'Date Sold'. Exclude Flat Cancel. Never use unique POLICY# for sold volume.
- Quotes: COUNT where 'Quoted Date' is not null. Includes quotes that later became Issued.
- Quoted-not-sold: COUNT where Sold == 'quoted' on 'Quoted Date'.
- Flat cancels: COUNT where Sold == 'flat cancel' on 'Date Sold'. Never include in Policies Sold. Report separately.
- Total leads: COUNT all source rows on 'Added Time'.
- Premium written: SUM('Premium Amt') where Sold == 'Issued' on 'Date Sold'. Sum only Issued rows.
- Average premium: MEAN('Premium Amt') where Sold == 'Issued' on 'Date Sold'. Note median if skewed.
- Unique policies: NUNIQUE('POLICY#') where Sold == 'Issued' on 'Date Sold'. Exclude blank POLICY#.
- Close rate: RATIO = Issued / rows with Quoted Date (Quoted Date is not null).

2. DATE BASIS RULES:
- Policies Sold / Issued / Flat Cancel / Premium / Sales -> 'Date Sold'
- Quotes / Quoted Date / Quoted-not-sold / Close Rate -> 'Quoted Date'
- Leads / Lead Source / Partner Name / Customer Type / State / City -> 'Added Time'

3. GROUPING & FILTERING RULES:
- Lead Source vs. Partner Name: NEVER substitute Lead Source for Partner Name, or Partner Name for Lead Source. Use exact requested column.
- Retain blank buckets in distributions (e.g. Lead Source, Partner Name, State, Customer Type, Method).
- Group results <= 25 items: Show all groups descending by metric.
- Group results > 25 items: Show Top 20 groups + 'Others' summary bucket + full group count. Never hide total.
- State filter: Leads in state X uses 'State' column, NOT 'Garaging State' unless explicitly requested.

4. SAFEGUARDS:
- Ambiguous policies: Default to Issued row count. Mention unique policies only if explicitly requested.
- Ambiguous month: Resolve to most recent complete occurrence and state month/year explicitly.
- No historical answer reuse: Always compute fresh from raw dataset rows.
- Reconcile group counts: Sum of group counts must strictly equal filtered rows (PASS/FAIL audit).
`;
  }
}

export const trainingCatalogService = new TrainingCatalogService();
