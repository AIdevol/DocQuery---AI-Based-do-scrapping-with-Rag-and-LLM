import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { fileProcessorService } from './services/fileProcessor.js';
import { queryRouterService } from './services/queryRouter.js';
import { aiProviderService, maskApiKey } from './services/aiProvider.js';
import { analyticsEngine } from './services/analyticsEngine.js';
import { semanticLayer } from './services/semanticLayer.js';
import {
  ChatSession,
  ModelConfiguration,
  EmbeddingConfiguration,
  StorageConfiguration,
  ProcessingConfiguration,
  PromptConfiguration,
  DEFAULT_RAG_SYSTEM_PROMPT
} from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Memory storage for file uploads
const upload = multer({
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// App State: Settings
let modelConfig: ModelConfiguration = {
  temperature: 0.2,
  maxOutputTokens: 2048,
  contextStrategy: 'auto_compact',
  topKRetrieval: 5,
  rerankingEnabled: true,
  timeoutMs: 30000,
  retryCount: 3
};

let embeddingConfig: EmbeddingConfiguration = {
  providerId: 'prov-openai',
  modelName: 'text-embedding-3-small',
  dimension: 1536,
  batchSize: 64
};

let storageConfig: StorageConfiguration = {
  provider: 'local',
  localStorageDir: './storage/documents',
  bucket: '',
  region: 'ap-south-1'
};

let processingConfig: ProcessingConfiguration = {
  chunkSize: 512,
  chunkOverlap: 64,
  topKRetrieval: 5,
  rerankingEnabled: true,
  ocrEnabled: true,
  maxFileSizeMB: 100,
  processingTimeoutSeconds: 60,
  enableAutoDataTypeInference: true,
  askFieldMetadataOnUpload: true
};

let promptConfig: PromptConfiguration = {
  systemPrompt: DEFAULT_RAG_SYSTEM_PROMPT,
  customInstructions: '',
  enableCustomPrompt: false,
  enableCustomInstructions: true
};

// Clean chat history sessions
let chatSessions: ChatSession[] = [];

// Routes

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'docuquery-api', timestamp: new Date().toISOString() });
});

// 2. Files endpoints
app.get('/api/files', (_req, res) => {
  res.json(fileProcessorService.getAllFiles());
});

app.get('/api/files/:id', (req, res) => {
  const file = fileProcessorService.getFileById(req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.json(file);
});

app.post('/api/files/upload', upload.any(), async (req, res) => {
  try {
    const rawFiles = (req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
    if (!rawFiles || rawFiles.length === 0) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const processedList = await Promise.all(
      rawFiles.map(f =>
        fileProcessorService.processUploadedFile({
          originalName: f.originalname,
          size: f.size,
          mimeType: f.mimetype,
          buffer: f.buffer
        })
      )
    );

    if (processedList.length === 1) {
      return res.status(201).json({
        ...processedList[0],
        files: processedList
      });
    }

    res.status(201).json(processedList);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'File processing failed' });
  }
});

app.patch('/api/files/:id/rename', (req, res) => {
  const { newName } = req.body;
  if (!newName) return res.status(400).json({ error: 'newName is required' });
  const updated = fileProcessorService.renameFile(req.params.id, newName);
  if (!updated) return res.status(404).json({ error: 'File not found' });
  res.json(updated);
});

app.delete('/api/files/:id', (req, res) => {
  const success = fileProcessorService.deleteFile(req.params.id);
  if (!success) return res.status(404).json({ error: 'File not found' });
  res.json({ message: 'File deleted successfully', id: req.params.id });
});

app.patch('/api/files/:id/fields', (req, res) => {
  const { columns } = req.body;
  if (!Array.isArray(columns)) {
    return res.status(400).json({ error: 'columns array is required' });
  }
  const updated = fileProcessorService.updateFieldDefinitions(req.params.id, columns);
  if (!updated) return res.status(404).json({ error: 'File or schema not found' });
  res.json(updated);
});

// Section 2: Data Dictionary endpoint
app.get('/api/files/:id/dictionary', (req, res) => {
  const file = fileProcessorService.getFileById(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found' });
  if (!file.schema) return res.status(400).json({ error: 'File has no tabular schema' });

  if (!file.dataDictionary) {
    fileProcessorService.normalizeStoredFile(file);
  }

  res.json(file.dataDictionary || {
    fileId: file.id,
    fileName: file.name,
    rowCount: file.schema.rowCount,
    columnCount: file.schema.columnCount,
    columns: {}
  });
});

// Section 4 & 9: Deterministic Query Execution endpoint
app.post('/api/files/:id/query', (req, res) => {
  try {
    const file = fileProcessorService.getFileById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    const { query, question } = req.body;

    let targetQuery = query;
    if (!targetQuery && question) {
      targetQuery = semanticLayer.parseQuestionToStructuredQuery(question, file);
    }

    if (!targetQuery) {
      return res.status(400).json({ error: 'Valid query or analytical question is required' });
    }

    const result = analyticsEngine.executeStructuredQuery(file.id, targetQuery);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Execution error' });
  }
});

app.post('/api/files/:id/suggest-fields', async (req, res) => {
  try {
    const file = fileProcessorService.getFileById(req.params.id);
    if (!file || !file.schema) {
      return res.status(404).json({ error: 'Tabular file or schema not found' });
    }

    const columnsSummary = file.schema.columns.map(c => ({
      name: c.name,
      type: c.type,
      sampleValues: c.sampleValues
    }));

    const systemPrompt = `You are a Senior Data Analyst and Schema Architect.
Your task is to examine tabular column names, detected data types, and sample values, and recommend:
1. "purpose": A concise, clear definition of what this field represents.
2. "usageGuidance": Practical guidance on where and how to use this field in analytics, calculations, or filters.
3. "role": One of: "metric", "dimension", "primary_key", "date", "filter", "ignore".

Respond with valid JSON ONLY matching this exact structure:
{
  "columns": [
    {
      "name": "<column_name>",
      "purpose": "<what is the use/definition>",
      "usageGuidance": "<where and how to use in calculations/queries>",
      "role": "<metric|dimension|primary_key|date|filter|ignore>"
    }
  ]
}`;

    const userPrompt = `File: "${file.name}"
Columns to analyze:
${JSON.stringify(columnsSummary, null, 2)}

Provide intelligent suggestions for what each field is and how it should be used.`;

    const aiRes = await aiProviderService.generateCompletion({
      systemPrompt,
      userPrompt
    });

    let jsonStr = aiRes.content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const parsed = JSON.parse(jsonStr);
    res.json(parsed);
  } catch (err: any) {
    console.warn('AI Field suggestion error, using fallback:', err.message);
    const file = fileProcessorService.getFileById(req.params.id);
    if (!file || !file.schema) return res.status(500).json({ error: 'Could not generate suggestions' });
    
    const fallbackColumns = file.schema.columns.map(c => {
      const isNum = c.type === 'numeric';
      const isDate = c.type === 'date';
      const isId = c.name.toLowerCase().includes('id') || c.name.toLowerCase().includes('code');
      return {
        name: c.name,
        purpose: isId ? `Unique identifier for ${c.name}` : (isNum ? `Numeric metric for ${c.name.replace(/_/g, ' ')}` : `Categorical attribute representing ${c.name.replace(/_/g, ' ')}`),
        usageGuidance: isNum ? `Use for aggregations, sums, and averages across dimensions` : (isDate ? `Use as time axis for trends and date filtering` : `Use for grouping, segmenting, and filtering`),
        role: isId ? 'primary_key' : (isNum ? 'metric' : (isDate ? 'date' : 'dimension'))
      };
    });
    res.json({ columns: fallbackColumns });
  }
});

// 3. Chat & Q&A
app.post('/api/chat', async (req, res) => {
  try {
    const {
      question,
      fileIds,
      providerId,
      modelId,
      sessionId,
      history,
      customInstructions,
      systemPrompt
    } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Determine session and previous history turns
    let session = sessionId ? chatSessions.find(s => s.id === sessionId) : undefined;
    
    // Auto-create session if sessionId passed but not yet recorded
    if (!session && sessionId) {
      session = {
        id: sessionId,
        title: question.slice(0, 45) + (question.length > 45 ? '...' : ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        fileIds: Array.isArray(fileIds) ? fileIds : [],
        messages: [],
        providerId,
        modelId
      };
      chatSessions.unshift(session);
    }

    // Resolve conversation history: prefer passed history array, fallback to stored session messages
    let conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    if (Array.isArray(history) && history.length > 0) {
      conversationHistory = history;
    } else if (session && session.messages.length > 0) {
      conversationHistory = session.messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    }

    // Resolve custom instructions and system prompt: prioritize request body, fallback to server settings
    const resolvedCustomInstructions = customInstructions !== undefined
      ? customInstructions
      : (promptConfig.enableCustomInstructions ? promptConfig.customInstructions : undefined);

    const resolvedSystemPrompt = systemPrompt !== undefined
      ? systemPrompt
      : (promptConfig.enableCustomPrompt ? promptConfig.systemPrompt : undefined);

    const assistantMessage = await queryRouterService.executeQuery({
      question,
      fileIds: Array.isArray(fileIds) ? fileIds : [],
      providerId,
      modelId,
      history: conversationHistory,
      customInstructions: resolvedCustomInstructions,
      systemPrompt: resolvedSystemPrompt
    });

    // Record both turns to session
    if (session) {
      session.messages.push({
        id: `msg-u-${Date.now()}`,
        role: 'user',
        content: question,
        timestamp: new Date().toISOString()
      });
      session.messages.push(assistantMessage);
      session.updatedAt = new Date().toISOString();
      if (Array.isArray(fileIds) && fileIds.length > 0) {
        session.fileIds = Array.from(new Set([...session.fileIds, ...fileIds]));
      }
    }

    res.json(assistantMessage);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Query execution failed' });
  }
});

// 4. Chat History
app.get('/api/chat/history', (_req, res) => {
  res.json(chatSessions);
});

app.post('/api/chat/history', (req, res) => {
  const { title, fileIds, providerId, modelId } = req.body;
  const newSession: ChatSession = {
    id: `session-${Date.now()}`,
    title: title || 'New Conversation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileIds: fileIds || [],
    messages: [],
    providerId: providerId || 'prov-openai',
    modelId: modelId || 'gpt-4o'
  };
  chatSessions.unshift(newSession);
  res.status(201).json(newSession);
});

app.patch('/api/chat/history/:id', (req, res) => {
  const session = chatSessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (req.body.title) session.title = req.body.title;
  session.updatedAt = new Date().toISOString();
  res.json(session);
});

app.delete('/api/chat/history/:id', (req, res) => {
  chatSessions = chatSessions.filter(s => s.id !== req.params.id);
  res.json({ message: 'Session deleted' });
});

// 5. Providers Management
app.get('/api/providers', (_req, res) => {
  res.json(aiProviderService.getAll());
});

app.post('/api/providers', (req, res) => {
  try {
    const created = aiProviderService.add(req.body);
    res.status(201).json({
      ...created,
      apiKey: undefined,
      maskedApiKey: created.maskedApiKey || maskApiKey(created.apiKey)
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/providers/:id', (req, res) => {
  const updated = aiProviderService.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Provider not found' });
  res.json({
    ...updated,
    apiKey: undefined,
    maskedApiKey: updated.maskedApiKey || maskApiKey(updated.apiKey)
  });
});

app.delete('/api/providers/:id', (req, res) => {
  const success = aiProviderService.delete(req.params.id);
  if (!success) return res.status(404).json({ error: 'Provider not found' });
  res.json({ message: 'Provider removed' });
});

app.post('/api/providers/:id/default', (req, res) => {
  const success = aiProviderService.setDefault(req.params.id);
  if (!success) return res.status(404).json({ error: 'Provider not found' });
  res.json({ message: 'Default provider updated' });
});

app.post('/api/providers/validate', async (req, res) => {
  const result = await aiProviderService.validateConnection(req.body);
  res.json(result);
});

// 6. Settings
app.get('/api/settings', (_req, res) => {
  res.json({
    model: modelConfig,
    embedding: embeddingConfig,
    storage: storageConfig,
    processing: processingConfig,
    prompt: promptConfig
  });
});

app.put('/api/settings', (req, res) => {
  if (req.body.model) modelConfig = { ...modelConfig, ...req.body.model };
  if (req.body.embedding) embeddingConfig = { ...embeddingConfig, ...req.body.embedding };
  if (req.body.storage) storageConfig = { ...storageConfig, ...req.body.storage };
  if (req.body.processing) processingConfig = { ...processingConfig, ...req.body.processing };
  if (req.body.prompt) promptConfig = { ...promptConfig, ...req.body.prompt };
  res.json({
    model: modelConfig,
    embedding: embeddingConfig,
    storage: storageConfig,
    processing: processingConfig,
    prompt: promptConfig
  });
});

// Serve static frontend assets if built
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Universal File Q&A Server running on http://localhost:${PORT} and http://0.0.0.0:${PORT}`);
});

