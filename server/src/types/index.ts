export type FileType =
  | 'csv'
  | 'xlsx'
  | 'xls'
  | 'pdf'
  | 'docx'
  | 'txt'
  | 'json'
  | 'md'
  | 'pptx'
  | 'image';

export type PipelineStepStatus = 'pending' | 'running' | 'completed' | 'error';

export interface PipelineStep {
  id: 'uploading' | 'parsing' | 'analyzing' | 'indexing' | 'ready';
  label: string;
  detail: string;
  status: PipelineStepStatus;
  timestamp?: string;
}

export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'string' | 'date' | 'categorical' | 'boolean';
  sampleValues: (string | number | boolean | null)[];
  nullCount?: number;
  distinctCount?: number;
  purpose?: string;
  usageGuidance?: string;
  role?: 'metric' | 'dimension' | 'primary_key' | 'date' | 'filter' | 'ignore';
  nullable?: boolean;
  businessMeaning?: string;
}

export interface DataDictionaryColumn {
  name: string;
  type: 'categorical' | 'numeric' | 'date' | 'identifier' | 'boolean';
  business_meaning: string;
  nullable: boolean;
  null_count?: number;
  distinct_count?: number;
  sample_values?: (string | number | boolean | null)[];
  synonyms?: string[];
  normalization_mapping?: Record<string, string>;
  role?: 'metric' | 'dimension' | 'primary_key' | 'date' | 'filter' | 'ignore';
}

export interface DataDictionary {
  fileId: string;
  fileName: string;
  rowCount: number;
  columnCount: number;
  columns: Record<string, DataDictionaryColumn>;
}

export type IntermediateOperation =
  | 'total_records'
  | 'unique_count'
  | 'group_count'
  | 'top_category'
  | 'bottom_category'
  | 'aggregate'
  | 'filter_data'
  | 'compare_groups'
  | 'profile_column'
  | 'schema_overview'
  | 'missing_audit'
  | 'filter_rows'
  | 'cross_tab'
  | 'duplicate_count'
  | 'close_rate';

export interface StructuredFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'is_null' | 'not_null' | 'date_range' | 'length_eq' | 'length_neq' | 'col_eq' | 'col_neq' | 'date_eq_col';
  value?: any;
}

export interface StructuredQuery {
  operation: IntermediateOperation;
  dimension?: string;
  secondaryDimension?: string;
  measure?: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'median' | 'percentage';
  metricColumn?: string;
  filters?: StructuredFilter[];
  include_missing?: boolean;
  sort?: 'desc' | 'asc' | { field: string; direction: 'desc' | 'asc' };
  limit?: number;
  compareValues?: [string, string];
}

export interface SemanticAuditReport {
  status: 'PASS' | 'FAIL';
  requestedDimension?: string;
  executedDimension?: string;
  requestedMetric?: string;
  executedMetric?: string;
  filterIntegrity: 'PASS' | 'FAIL';
  unrequestedFiltersDetected?: boolean;
  notes?: string;
}

export interface ValidationReport {
  isValid: boolean;
  totalRecords: number;
  analyzedRecords: number;
  sumMatchesTotal: boolean;
  missingCount: number;
  discrepancies: string[];
  filterCount?: number;
  groupSum?: number;
  percentageSum?: number;
  reconciliationStatus?: 'PASS' | 'FAIL';
  completenessCheck?: 'PASS' | 'FAIL';
  semanticAudit?: SemanticAuditReport;
}

export interface AnalyticalQueryResult {
  query: StructuredQuery;
  primaryMetric: {
    label: string;
    value: string | number;
    subtext?: string;
  };
  calculationFormula: string;
  appliedFilterDescription?: string;
  data: Record<string, any>[];
  totalRecordsAnalyzed: number;
  eliminatedDetails?: string;
  validation: ValidationReport;
  visualization?: VisualizationSpec;
}

export interface TabularSchema {
  columns: ColumnInfo[];
  rowCount: number;
  columnCount: number;
  sampleRows: Record<string, any>[];
  relationships?: string[];
  numericColumns: string[];
  dateColumns: string[];
  categoricalColumns: string[];
}

export interface DocumentSection {
  id: string;
  heading: string;
  pageNumber?: number;
  text: string;
  tokenEstimate?: number;
}

export interface DocumentStats {
  pages: number;
  sectionsCount: number;
  extractedTextSize: string;
  characterCount: number;
  sections: DocumentSection[];
}

export interface StoredFile {
  id: string;
  name: string;
  originalName: string;
  size: number;
  type: FileType;
  mimeType: string;
  uploadDate: string;
  status: 'uploading' | 'parsing' | 'analyzing' | 'indexing' | 'ready' | 'error';
  pipelineSteps: PipelineStep[];
  error?: string;
  schema?: TabularSchema;
  dataDictionary?: DataDictionary;
  documentStats?: DocumentStats;
  ocrText?: string;
  storagePath?: string;
  isPreloaded?: boolean;
  rawText?: string;
}

export type QueryIntent =
  | 'tabular_aggregation'
  | 'tabular_filter'
  | 'tabular_comparison'
  | 'semantic_qa'
  | 'document_summary'
  | 'cross_file'
  | 'anomaly_detection'
  | 'contract_analysis'
  | 'general';

export interface SourceEvidence {
  fileId: string;
  fileName: string;
  fileType: FileType;
  locationDescription: string; // e.g. "Rows: 12,430–14,821", "Sheet: Customers", "Pages: 18–21"
  rowsAnalyzed?: number;
  sectionsAnalyzed?: number;
  calculationFormula?: string;
  previewSnippet?: string;
}

export interface VisualizationSpec {
  type: 'bar' | 'line' | 'comparison_table' | 'donut' | 'metric';
  title: string;
  description?: string;
  data: Record<string, any>[];
  xAxisKey?: string;
  yAxisKey?: string;
  series?: { key: string; name: string; color?: string }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  sources?: SourceEvidence[];
  visualization?: VisualizationSpec;
  intent?: QueryIntent;
  statsBadge?: string; // e.g. "Analyzed 4,280 relevant records" or "Answer generated from 5 relevant sections"
  analyticalResult?: AnalyticalQueryResult;
  contextUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    maxContextTokens: number;
  };
  followUps?: string[];
  feedback?: 'like' | 'dislike';
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  fileIds: string[];
  messages: ChatMessage[];
  providerId?: string;
  modelId?: string;
}

export type AIProviderType =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'azure_openai'
  | 'openrouter'
  | 'groq'
  | 'mistral'
  | 'cohere'
  | 'ollama'
  | 'custom';

export interface AIProviderConfig {
  id: string;
  name: string;
  type: AIProviderType;
  apiKey?: string;
  maskedApiKey?: string;
  baseUrl?: string;
  organization?: string;
  defaultModel: string;
  availableModels: string[];
  isDefault: boolean;
  customHeaders?: Record<string, string>;
  status: 'connected' | 'error' | 'untested';
  lastLatencyMs?: number;
  lastTestedAt?: string;
}

export interface ModelConfiguration {
  temperature: number;
  maxOutputTokens: number;
  contextStrategy: 'auto_compact' | 'strict_minimal' | 'full_relevance';
  topKRetrieval: number;
  rerankingEnabled: boolean;
  timeoutMs: number;
  retryCount: number;
}

export interface EmbeddingConfiguration {
  providerId: string;
  modelName: string;
  dimension: number;
  batchSize: number;
}

export interface StorageConfiguration {
  provider: 'local' | 's3' | 'aws_s3' | 'custom_object';
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKeyMasked?: string;
  localStorageDir?: string;
}

export interface ProcessingConfiguration {
  chunkSize: number;
  chunkOverlap: number;
  topKRetrieval: number;
  rerankingEnabled: boolean;
  ocrEnabled: boolean;
  maxFileSizeMB: number;
  processingTimeoutSeconds: number;
  enableAutoDataTypeInference: boolean;
  askFieldMetadataOnUpload: boolean;
}

export interface PromptConfiguration {
  systemPrompt: string;
  customInstructions: string;
  enableCustomPrompt: boolean;
  enableCustomInstructions: boolean;
}

export const DEFAULT_RAG_SYSTEM_PROMPT = `You are a world-class Data Analyst and Document Intelligence AI in the Universal File Q&A Workspace.
Your objective is to provide a refined, accurate, personalized, and analytically thorough answer based directly on the uploaded file(s).

Critical Guidelines:
1. Base your answer strictly on the provided file data, structure, and extracts below.
2. Mandatory Reply Structure for Analytical & Data Queries:
   - Line 1: Lead with the primary answer or metric, bolded (e.g., "**4,821 policies issued**"). No conversational opening or preamble.
   - Line 2: If any values or records are eliminated/excluded (such as 'Flat Cancel' records being excluded from sold policies, or blank/null records), explicitly mention the eliminated values (e.g., "*Eliminated Values: 3 Flat Cancel records in August were excluded and not added to the sold total, as Policies Sold = Issued ONLY*").
   - Follow with a clean markdown table (max 10 rows) or comparison breakdown if applicable.
   - 2–3 concise bullet points highlighting key insights, outliers, drivers, and eliminated records.
   - End with a single short line offering a natural follow-up slice (by agent, carrier, month, etc.).
   - DO NOT output any "Formula: ..." line or technical SQL query in your chat response. Keep the response clean and natural.
3. Conversational Continuity & Memory:
   - You have access to the full conversation history.
   - When the user asks follow-up questions, interpret their question in the context of prior turns and resolve references.
4. Clean Formatting:
   - Always format dates as dd-MMM-yyyy (e.g. 14-Sep-2026).
   - Format currency values with $ and thousands separators (e.g. $1,624.37).
   - Use clean markdown tables with headers and aligned columns.
5. Strict Compliance with User Field Definitions: If user-defined field definitions, purposes, or usage rules are specified in the context, follow them with highest priority when computing sums, filtering records, or interpreting terminology.`;

export interface AppSettings {
  model: ModelConfiguration;
  embedding: EmbeddingConfiguration;
  storage: StorageConfiguration;
  processing: ProcessingConfiguration;
  prompt: PromptConfiguration;
}
