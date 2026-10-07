import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';
import { CATALOG_ROWS, TrainingCatalogRow } from './export_training_catalog.js';
import { StructuredQuery } from '../server/src/types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SYSTEM_PROMPT = `You are a Text-to-Data-Analysis Agent. Your task is to translate user natural-language questions about a dataset into an intermediate structured analytical query JSON.
Do not calculate numbers yourself. Output valid JSON representing the exact analytical operation.
Format:
{
  "operation": "group_count|unique_count|total_records|top_category|bottom_category|aggregate|compare_groups|cross_tab|duplicate_count|missing_audit",
  "dimension": "<column_name>",
  "secondaryDimension": "<column_name>",
  "measure": "count|sum|avg|min|max|median",
  "metricColumn": "<numeric_column>",
  "filters": [{"column": "<name>", "operator": "eq|neq|gt|lt|not_null|is_null|contains|date_range", "value": "<val>"}],
  "include_missing": true|false,
  "sort": "desc|asc",
  "limit": <number>,
  "compareValues": ["<val1>", "<val2>"]
}`;

interface TrainingExample {
  messages: [
    { role: 'system'; content: string },
    { role: 'user'; content: string },
    { role: 'assistant'; content: string }
  ];
  metadata: {
    rule_intent: string;
    approach_type: string;
    question: string;
    target_query: StructuredQuery;
    ground_truth_primary_metric: {
      label: string;
      value: string | number;
      subtext?: string;
    };
    records_analyzed: number;
  };
}

export function buildTrainingDataset() {
  const file = fileProcessorService.getAllFiles()[0];
  if (!file) {
    throw new Error('No files found in storage. Ensure All Leads (8).csv is loaded.');
  }

  console.log(`Building catalog-trained dataset using file: "${file.name}" (${file.schema?.rowCount} rows)`);

  const examples: TrainingExample[] = [];

  // Question phrasing generators for catalog rows
  for (const rule of CATALOG_ROWS) {
    const questionsAndQueries: { q: string; query: StructuredQuery }[] = [];

    switch (rule.intent) {
      case "Policies sold":
        questionsAndQueries.push(
          { q: "How many policies were sold?", query: { operation: "total_records", filters: [{ column: "Sold", operator: "eq", value: "Issued" }] } },
          { q: "What is the total number of policies sold / issued?", query: { operation: "total_records", filters: [{ column: "Sold", operator: "eq", value: "Issued" }] } },
          { q: "Count of issued policies.", query: { operation: "total_records", filters: [{ column: "Sold", operator: "eq", value: "Issued" }] } }
        );
        break;

      case "Quotes":
        questionsAndQueries.push(
          { q: "How many quotes are there?", query: { operation: "total_records", filters: [{ column: "Quoted Date", operator: "not_null" }] } },
          { q: "How many leads have a Quoted Date?", query: { operation: "total_records", filters: [{ column: "Quoted Date", operator: "not_null" }] } },
          { q: "Total quotes count.", query: { operation: "total_records", filters: [{ column: "Quoted Date", operator: "not_null" }] } }
        );
        break;

      case "Quoted-not-sold":
        questionsAndQueries.push(
          { q: "How many leads are Quoted-not-sold?", query: { operation: "total_records", filters: [{ column: "Sold", operator: "eq", value: "Quoted" }] } },
          { q: "Count of leads that are quoted but not issued.", query: { operation: "total_records", filters: [{ column: "Sold", operator: "eq", value: "Quoted" }] } }
        );
        break;

      case "Flat cancels":
        questionsAndQueries.push(
          { q: "How many flat cancels are there?", query: { operation: "total_records", filters: [{ column: "Sold", operator: "eq", value: "Flat Cancel" }] } },
          { q: "Count of Flat Cancel records.", query: { operation: "total_records", filters: [{ column: "Sold", operator: "eq", value: "Flat Cancel" }] } }
        );
        break;

      case "Leads":
        questionsAndQueries.push(
          { q: "How many total leads are there?", query: { operation: "total_records" } },
          { q: "Total number of leads.", query: { operation: "total_records" } },
          { q: "Count all source rows in the dataset.", query: { operation: "total_records" } }
        );
        break;

      case "Premium written":
        questionsAndQueries.push(
          { q: "What is the total premium written?", query: { operation: "aggregate", metricColumn: "Premium Amt", measure: "sum", filters: [{ column: "Sold", operator: "eq", value: "Issued" }] } },
          { q: "Total premium written for issued policies.", query: { operation: "aggregate", metricColumn: "Premium Amt", measure: "sum", filters: [{ column: "Sold", operator: "eq", value: "Issued" }] } }
        );
        break;

      case "Average premium":
        questionsAndQueries.push(
          { q: "What is the average premium for sold policies?", query: { operation: "aggregate", metricColumn: "Premium Amt", measure: "avg", filters: [{ column: "Sold", operator: "eq", value: "Issued" }] } },
          { q: "Average premium written on issued leads.", query: { operation: "aggregate", metricColumn: "Premium Amt", measure: "avg", filters: [{ column: "Sold", operator: "eq", value: "Issued" }] } }
        );
        break;

      case "Unique policies":
        questionsAndQueries.push(
          { q: "How many unique policies are there?", query: { operation: "unique_count", dimension: "POLICY#", filters: [{ column: "Sold", operator: "eq", value: "Issued" }] } },
          { q: "Count distinct policy numbers among issued rows.", query: { operation: "unique_count", dimension: "POLICY#", filters: [{ column: "Sold", operator: "eq", value: "Issued" }] } }
        );
        break;

      case "Sold by Lead Type":
        questionsAndQueries.push(
          { q: "Show policies sold by Lead Type.", query: { operation: "group_count", dimension: "Lead Type", filters: [{ column: "Sold", operator: "eq", value: "Issued" }], sort: "desc", include_missing: true } },
          { q: "Breakdown of sold policies by Lead Type.", query: { operation: "group_count", dimension: "Lead Type", filters: [{ column: "Sold", operator: "eq", value: "Issued" }], sort: "desc", include_missing: true } }
        );
        break;

      case "Sold by Agent":
        questionsAndQueries.push(
          { q: "Show policies sold by Agent Sold.", query: { operation: "group_count", dimension: "Agent Sold", filters: [{ column: "Sold", operator: "eq", value: "Issued" }], sort: "desc", include_missing: true } },
          { q: "Breakdown of sales grouped by Agent Sold.", query: { operation: "group_count", dimension: "Agent Sold", filters: [{ column: "Sold", operator: "eq", value: "Issued" }], sort: "desc", include_missing: true } }
        );
        break;

      case "Quoted by Agent":
        questionsAndQueries.push(
          { q: "Show quotes by Agent Quoted.", query: { operation: "group_count", dimension: "Agent Quoted", filters: [{ column: "Quoted Date", operator: "not_null" }], sort: "desc", include_missing: true } },
          { q: "Quotes breakdown grouped by Agent Quoted.", query: { operation: "group_count", dimension: "Agent Quoted", filters: [{ column: "Quoted Date", operator: "not_null" }], sort: "desc", include_missing: true } }
        );
        break;

      case "Lead Source distribution":
        questionsAndQueries.push(
          { q: "What is the Lead Source distribution?", query: { operation: "group_count", dimension: "Lead Source", sort: "desc", include_missing: true } },
          { q: "Break down leads by Lead Source.", query: { operation: "group_count", dimension: "Lead Source", sort: "desc", include_missing: true } }
        );
        break;

      case "Partner distribution":
        questionsAndQueries.push(
          { q: "What is the partner distribution?", query: { operation: "group_count", dimension: "Partner Name", sort: "desc", include_missing: true } },
          { q: "Break down leads by Partner Name.", query: { operation: "group_count", dimension: "Partner Name", sort: "desc", include_missing: true } }
        );
        break;

      case "Carrier distribution":
        questionsAndQueries.push(
          { q: "Show issued policies by carrier.", query: { operation: "group_count", dimension: "Ins Company", filters: [{ column: "Sold", operator: "eq", value: "Issued" }], sort: "desc", include_missing: true } },
          { q: "Carrier distribution for issued policies.", query: { operation: "group_count", dimension: "Ins Company", filters: [{ column: "Sold", operator: "eq", value: "Issued" }], sort: "desc", include_missing: true } }
        );
        break;

      case "Line of business":
        questionsAndQueries.push(
          { q: "Show issued policies by Line of Business.", query: { operation: "group_count", dimension: "Line of Biz", filters: [{ column: "Sold", operator: "eq", value: "Issued" }], sort: "desc", include_missing: true } }
        );
        break;

      case "Lead Type distribution":
        questionsAndQueries.push(
          { q: "Show records by Lead Type.", query: { operation: "group_count", dimension: "Lead Type", sort: "desc", include_missing: true } },
          { q: "Distribution of leads across Lead Type.", query: { operation: "group_count", dimension: "Lead Type", sort: "desc", include_missing: true } }
        );
        break;

      case "State distribution":
        questionsAndQueries.push(
          { q: "Show leads by State.", query: { operation: "group_count", dimension: "State", sort: "desc", include_missing: true } },
          { q: "State-wise breakdown of leads.", query: { operation: "group_count", dimension: "State", sort: "desc", include_missing: true } }
        );
        break;

      case "Garaging State":
        questionsAndQueries.push(
          { q: "Show leads by Garaging State.", query: { operation: "group_count", dimension: "Garaging State", sort: "desc", include_missing: true } }
        );
        break;

      case "City distribution":
        questionsAndQueries.push(
          { q: "Show leads by City.", query: { operation: "group_count", dimension: "City", sort: "desc", include_missing: true } }
        );
        break;

      case "Method distribution":
        questionsAndQueries.push(
          { q: "Show issued policies by Method.", query: { operation: "group_count", dimension: "Method", filters: [{ column: "Sold", operator: "eq", value: "Issued" }], sort: "desc", include_missing: true } }
        );
        break;

      case "Customer Type":
        questionsAndQueries.push(
          { q: "Show leads by Customer Type.", query: { operation: "group_count", dimension: "Customer Type", sort: "desc", include_missing: true } }
        );
        break;

      case "Partner Name filter":
        questionsAndQueries.push(
          { q: "How many leads are from Web Quote?", query: { operation: "total_records", filters: [{ column: "Partner Name", operator: "eq", value: "Web Quote" }] } },
          { q: "How many leads are from All Other?", query: { operation: "total_records", filters: [{ column: "Partner Name", operator: "eq", value: "All Other" }] } }
        );
        break;

      case "Lead Source filter":
        questionsAndQueries.push(
          { q: "How many leads are from Nexus?", query: { operation: "total_records", filters: [{ column: "Lead Source", operator: "eq", value: "Nexus" }] } },
          { q: "How many leads are from RR 3.0?", query: { operation: "total_records", filters: [{ column: "Lead Source", operator: "eq", value: "RR 3.0" }] } }
        );
        break;

      case "Agent Sold filter":
        questionsAndQueries.push(
          { q: "How many policies were sold by Marissa?", query: { operation: "total_records", filters: [{ column: "Agent Sold", operator: "eq", value: "Marissa" }, { column: "Sold", operator: "eq", value: "Issued" }] } }
        );
        break;

      case "Agent Quoted filter":
        questionsAndQueries.push(
          { q: "How many quotes were completed by Daisy Hernandez?", query: { operation: "total_records", filters: [{ column: "Agent Quoted", operator: "eq", value: "Daisy Hernandez" }, { column: "Quoted Date", operator: "not_null" }] } }
        );
        break;

      case "Carrier filter":
        questionsAndQueries.push(
          { q: "How many Progressive policies are Issued?", query: { operation: "total_records", filters: [{ column: "Ins Company", operator: "eq", value: "Progressive" }, { column: "Sold", operator: "eq", value: "Issued" }] } }
        );
        break;

      case "Lead Type filter":
        questionsAndQueries.push(
          { q: "How many Auto leads are there?", query: { operation: "total_records", filters: [{ column: "Lead Type", operator: "eq", value: "Auto" }] } },
          { q: "How many Home leads are there?", query: { operation: "total_records", filters: [{ column: "Lead Type", operator: "eq", value: "Home" }] } }
        );
        break;

      case "State filter":
        questionsAndQueries.push(
          { q: "How many leads are from Arizona?", query: { operation: "total_records", filters: [{ column: "State", operator: "eq", value: "Arizona" }] } },
          { q: "How many leads are from Texas?", query: { operation: "total_records", filters: [{ column: "State", operator: "eq", value: "Texas" }] } }
        );
        break;

      case "Monthly sold":
        questionsAndQueries.push(
          { q: "How many policies were sold in May?", query: { operation: "total_records", filters: [{ column: "Sold", operator: "eq", value: "Issued" }, { column: "Date Sold", operator: "contains", value: "May" }] } },
          { q: "How many policies were sold in June?", query: { operation: "total_records", filters: [{ column: "Sold", operator: "eq", value: "Issued" }, { column: "Date Sold", operator: "contains", value: "Jun" }] } }
        );
        break;

      case "Top Agent Sold":
        questionsAndQueries.push(
          { q: "Which agent sold the most policies?", query: { operation: "top_category", dimension: "Agent Sold", filters: [{ column: "Sold", operator: "eq", value: "Issued" }], limit: 1 } }
        );
        break;

      case "Top Lead Type":
        questionsAndQueries.push(
          { q: "Which is the most common Lead Type?", query: { operation: "top_category", dimension: "Lead Type", limit: 1 } }
        );
        break;

      case "Top Lead Source":
        questionsAndQueries.push(
          { q: "Which is the most common Lead Source?", query: { operation: "top_category", dimension: "Lead Source", limit: 1 } }
        );
        break;

      case "Top carrier":
        questionsAndQueries.push(
          { q: "Which carrier has the most issued policies?", query: { operation: "top_category", dimension: "Ins Company", filters: [{ column: "Sold", operator: "eq", value: "Issued" }], limit: 1 } }
        );
        break;

      case "Top partner":
        questionsAndQueries.push(
          { q: "Which partner has the most leads?", query: { operation: "top_category", dimension: "Partner Name", limit: 1 } }
        );
        break;

      case "Top city":
        questionsAndQueries.push(
          { q: "Which city has the most leads?", query: { operation: "top_category", dimension: "City", limit: 1 } }
        );
        break;

      case "Lead Type x Sold":
        questionsAndQueries.push(
          { q: "Show cross-tab of Lead Type by Sold status.", query: { operation: "cross_tab", dimension: "Sold", secondaryDimension: "Lead Type" } }
        );
        break;

      case "Carrier x Lead Type":
        questionsAndQueries.push(
          { q: "Show Carrier by Lead Type cross-tabulation.", query: { operation: "cross_tab", dimension: "Ins Company", secondaryDimension: "Lead Type" } }
        );
        break;

      case "Missing Sold":
        questionsAndQueries.push(
          { q: "How many Sold fields are blank?", query: { operation: "total_records", filters: [{ column: "Sold", operator: "is_null" }] } }
        );
        break;

      case "Missing Policy Number":
        questionsAndQueries.push(
          { q: "How many Issued leads have a blank Policy Number?", query: { operation: "total_records", filters: [{ column: "Sold", operator: "eq", value: "Issued" }, { column: "POLICY#", operator: "is_null" }] } }
        );
        break;

      case "Duplicate policy numbers":
        questionsAndQueries.push(
          { q: "How many duplicate Policy Numbers are there?", query: { operation: "duplicate_count", dimension: "POLICY#" } }
        );
        break;

      case "Duplicate Lead IDs":
        questionsAndQueries.push(
          { q: "How many duplicate Lead IDs are there?", query: { operation: "duplicate_count", dimension: "ID" } }
        );
        break;

      default:
        // Generic fallback query if not custom mapped
        break;
    }

    for (const item of questionsAndQueries) {
      try {
        const queryRes = analyticsEngine.executeStructuredQuery(file.id, item.query);
        const assistantJson = JSON.stringify(item.query, null, 2);

        examples.push({
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: item.q },
            { role: 'assistant', content: assistantJson }
          ],
          metadata: {
            rule_intent: rule.intent,
            approach_type: rule.approach_type,
            question: item.q,
            target_query: item.query,
            ground_truth_primary_metric: queryRes.primaryMetric,
            records_analyzed: queryRes.totalRecordsAnalyzed
          }
        });
      } catch (err: any) {
        console.warn(`Error generating training sample for "${item.q}":`, err.message);
      }
    }
  }

  console.log(`Generated ${examples.length} catalog-grounded training samples.`);

  // Shuffle and split 80% train / 20% eval
  const shuffled = [...examples].sort(() => Math.random() - 0.5);
  const splitIdx = Math.floor(shuffled.length * 0.8);
  const trainSplit = shuffled.slice(0, splitIdx);
  const evalSplit = shuffled.slice(splitIdx);

  const trainPath = path.resolve(__dirname, '../storage/training/dataset_train.jsonl');
  const evalPath = path.resolve(__dirname, '../storage/training/dataset_eval.jsonl');

  fs.writeFileSync(trainPath, trainSplit.map(ex => JSON.stringify(ex)).join('\n') + '\n', 'utf-8');
  fs.writeFileSync(evalPath, evalSplit.map(ex => JSON.stringify(ex)).join('\n') + '\n', 'utf-8');

  console.log(`Updated ${trainPath} (${trainSplit.length} examples)`);
  console.log(`Updated ${evalPath} (${evalSplit.length} examples)`);
}

buildTrainingDataset();
