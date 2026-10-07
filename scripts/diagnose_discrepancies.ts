import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';

const questionsToDiagnose = [
  { id: 2, q: "How many columns are in the CSV file?", cloud: "49", docu: "36" },
  { id: 8, q: "What percentage of non-blank Lead Sources are RR 3.0?", cloud: "91.82%", docu: "100%" },
  { id: 9, q: "What percentage of non-blank Lead Sources are Lead Partner?", cloud: "7.87%", docu: "2772 / 100%" },
  { id: 15, q: "How many leads have Partner Code 14A?", cloud: "24", docu: "41" },
  { id: 16, q: "How many leads have Partner Code YW8?", cloud: "20", docu: "11" },
  { id: 17, q: "How many leads have Partner Code E52?", cloud: "18", docu: "10" },
  { id: 20, q: "How many unique Partner Names are present?", cloud: "33", docu: "31" },
  { id: 22, q: "How many leads belong to Web Quote?", cloud: "8,082", docu: "8518" },
  { id: 23, q: "How many leads belong to All Other?", cloud: "4,905", docu: "4906" },
  { id: 25, q: "How many leads belong to RightSure / Retail / Walk In?", cloud: "3,940", docu: "3491" },
  { id: 26, q: "How many leads belong to HTQMain?", cloud: "3,122", docu: "3295" },
  { id: 29, q: "How many unique Lead Types are present?", cloud: "8", docu: "7" },
  { id: 30, q: "How many Auto leads are there?", cloud: "31,698", docu: "31757" },
  { id: 32, q: "How many Combo-auto leads are there?", cloud: "145", docu: "31757" },
  { id: 33, q: "How many Combo-home leads are there?", cloud: "145", docu: "1829" },
  { id: 37, q: "What percentage of non-blank Lead Types are Auto?", cloud: "93.39%", docu: "99.81%" },
  { id: 38, q: "How many leads have Lead Type = AUTO in uppercase?", cloud: "59", docu: "31,757" },
  { id: 41, q: "How many unique Sales Rep values are present?", cloud: "1,134", docu: "1099" },
  { id: 42, q: "How many leads have Agent Quoted populated?", cloud: "22,167", docu: "4822" },
  { id: 44, q: "Which Agent Quoted has the highest number of leads?", cloud: "Francisco — 2,627", docu: "Iram  - 472" },
  { id: 45, q: "How many leads were quoted by Amalia?", cloud: "2,278", docu: "0" },
  { id: 46, q: "How many leads were quoted by Marissa?", cloud: "2,263", docu: "0" },
  { id: 49, q: "How many unique Insurance Companies are present?", cloud: "113", docu: "104" },
  { id: 57, q: "How many leads were sold by Marissa?", cloud: "1,607", docu: "1589" },
  { id: 58, q: "How many leads were sold by Amalia?", cloud: "1,412", docu: "1405" },
  { id: 59, q: "How many leads have a Sold status?", cloud: "19,260", docu: "14181" },
  { id: 65, q: "What percentage of non-blank Sold statuses are Issued?", cloud: "73.63%", docu: "100%" },
  { id: 66, q: "What percentage of non-blank Sold statuses are Quoted?", cloud: "25.04%", docu: "4,822" },
  { id: 73, q: "How many leads use Ezlynx as Method?", cloud: "4", docu: "36,499" },
  { id: 74, q: "What percentage of non-blank Methods are Co Esig?", cloud: "76.98%", docu: "9,833 / 100%" },
  { id: 81, q: "How many leads are in Tennessee?", cloud: "1,880", docu: "1,191" },
  { id: 98, q: "What is the average Premium Amount?", cloud: "$1,644.16", docu: "$972.69" },
  { id: 100, q: "What is the average Premium Amount for Issued leads?", cloud: "$1,393.13", docu: "$1,393.03" }
];

async function run() {
  const file = fileProcessorService.getAllFiles()[0];
  console.log(`Loaded file: ${file.name}, total rows: ${file.schema?.rowCount}`);
  console.log(`Columns count: ${file.schema?.columns.length}`);

  for (const item of questionsToDiagnose) {
    console.log(`\n========================================`);
    console.log(`Q${item.id}: "${item.q}"`);
    console.log(`Cloud Expected: ${item.cloud} | DocuQuery Benchmark: ${item.docu}`);
    const sq = semanticLayer.parseQuestionToStructuredQuery(item.q, file);
    if (!sq) {
      console.log(`Parse failed: null`);
      continue;
    }
    console.log(`Parsed SQ: op=${sq.operation}, dim=${sq.dimension}, metric=${sq.metricColumn}, filters=${JSON.stringify(sq.filters)}`);
    const res = analyticsEngine.executeStructuredQuery(file.id, sq);
    console.log(`Executed: PrimaryMetric=${JSON.stringify(res.primaryMetric?.value)}, Formula=${res.calculationFormula}`);
  }
}

run().catch(console.error);
