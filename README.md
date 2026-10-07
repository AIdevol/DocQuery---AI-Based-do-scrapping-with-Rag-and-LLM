# Universal File Q&A AI Workspace (DocuQuery AI)

A modern, production-grade, SaaS-style Universal File Q&A Workspace. Users can upload any file (CSV, XLSX, XLS, PDF, DOCX, TXT, JSON, Markdown, PPTX, Images) and ask completely arbitrary natural-language questions. The system automatically classifies intent, determines the correct execution strategy (tabular aggregations, dataframe filtering, semantic retrieval, cross-file synthesis, contract analysis), and delivers answers with auditable evidence, sources, and automatic visualizations.

---

## 🌟 Key Features

1. **Universal Multi-Format Ingestion**:
   - **Structured Data**: CSV, XLSX, XLS, JSON
   - **Unstructured Documents**: PDF, DOCX, TXT, Markdown, PPTX
   - **Visuals / Scans**: Images (PNG, JPG, TIFF) with OCR metadata extraction

2. **5-Step Visual Processing Pipeline**:
   - **Uploading**: File integrity check & mime validation
   - **Parsing**: Content extraction & tabular/text segmentation
   - **Analyzing Structure**: Column type inference (numeric, date, categorical), section and heading detection
   - **Indexing**: Optimized columnar store and hybrid semantic/BM25 vector search
   - **Ready**: Immediate availability for conversational Q&A

3. **Intelligent Intent-Routed Q&A Architecture**:
   - Users ask arbitrary questions without choosing question types or templates.
   - Behind the scenes, the engine dynamically selects:
     - **Tabular Filtering / Counts**: (e.g. *"How many customers are from Delhi?"*)
     - **Aggregations & Rankings**: (e.g. *"Which product generated the highest revenue?"*)
     - **Comparative Analysis**: (e.g. *"Compare January and February sales."*)
     - **Document Summarization**: (e.g. *"What are the main conclusions from this report?"*)
     - **Cross-File Synthesis**: (e.g. *"Why did revenue decline in Q2?"*)
     - **Contract & Clause Analysis**: (e.g. *"According to the contract, what are the termination conditions?"*)
     - **Data Integrity & Outliers**: (e.g. *"Are there any duplicate records?"*, *"Find unusual patterns in this data."*)

4. **Context Window Protection & Large File Handling**:
   - Never sends whole large files (20MB CSV, 100MB workbooks, 500MB documents) into LLM prompts.
   - Minimizes context to only necessary matched rows or sections.
   - Displays real-time context token usage (e.g. `3,240 / 32,000 tokens`).

5. **Auditable Evidence & Auto-Visualizations**:
   - Every answer exposes an expandable **Sources & Evidence** drawer with exact file names, row ranges (`Rows: 1,024–3,505`), sheet names, page numbers, and auditable mathematical formulas.
   - Automatically renders interactive **Bar Charts**, **Line Charts**, and **Donut Charts** (via Recharts) when structured quantitative data is involved.

6. **Comprehensive AI Provider Abstraction**:
   - Supports: **OpenAI**, **Anthropic Claude**, **Google Gemini**, **Azure OpenAI**, **OpenRouter**, **Groq**, **Mistral**, **Cohere**, **Ollama**, and **Custom OpenAI-Compatible** endpoints.
   - Dynamic form configuration with live connection latency testing (`Test Connection`).
   - Independent **Embedding Engine** configuration (separate from chat generation).
   - Strict API Key security: keys are masked (`sk-••••••••1234`) and never exposed in browser logs.

---

## 🏗️ Architecture

```
[ Frontend: React 18 + TypeScript + Tailwind CSS + Recharts ]
                            │
                            ▼ REST API / Multipart
[ Backend: Node.js + Express + TypeScript ]
  ├── File Processor (5-Stage Pipeline, Schema & Type Inference)
  ├── Columnar & Chunk Indexer (Tabular Store + Hybrid Vector Index)
  ├── Query Router & Intent Classifier (SQL/Aggregation, Semantic Search, Cross-File Join)
  └── AI Provider Abstraction Layer (OpenAI, Anthropic, Gemini, Ollama, Custom vLLM)
```

---

## 🚀 Quick Start

### 1. Run the Full Application (Client + Server)

From the project root:

```bash
# Start backend server (port 3001)
npm --prefix server run start

# In another terminal or for dev:
npm --prefix client run dev
```

Open your browser at:
- **Application URL**: `http://localhost:3001` (Unified full-stack app)
- **Client Dev Server**: `http://localhost:5173`

---

## 📁 Preloaded Datasets Included Out of the Box

1. **`sales_2026.csv`** (24.8 MB, 18,450 records):
   - Multi-regional enterprise software sales across Delhi, Mumbai, Bengaluru, Chennai.
2. **`customers.xlsx`** (8.5 MB, 13,480 accounts):
   - Customer tiers, lifetime spend, order frequencies, and churn risk scores.
3. **`q2_financial_report.pdf`** (14.2 MB, 24 pages):
   - Quarterly operational commentary, supply chain bottlenecks, and variance drivers.
4. **`master_service_agreement.docx`** (2.3 MB, 18 pages):
   - Enterprise contract with termination conditions (Clause 11), liability caps, and indemnification.

