import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';

const questions = [
  "How many total leads are there?",
  "What are the Lead Sources?",
  "How many leads are from Nexus?",
  "How many leads are from RR 3.0?",
  "How many Partner Codes are available?",
  "How many Partner Codes are blank?",
  "What are the Partner Names?",
  "How many leads have Partner Name as Nexus?",
  "What are the Lead Types?",
  "How many Auto leads are there?",
  "How many Home leads are there?",
  "How many Renters leads are there?",
  "How many leads have a blank Lead Type?",
  "How many Dealer records are there?",
  "How many Sales Reps are there?",
  "How many Sales Rep fields are blank?",
  "Which is the most common Lead Source?",
  "Which is the most common Lead Type?",
  "How many leads are from All Other?",
  "How many leads are from Web Quote?",
  "How many First Names are blank?",
  "How many Last Names are blank?",
  "How many unique First Names are there?",
  "What are the Customer Types?",
  "How many Personal customers are there?",
  "How many Customer Type fields are blank?",
  "How many leads have an Email?",
  "How many Email fields are blank?",
  "How many leads have a Phone Number?",
  "How many Phone fields are blank?",
  "How many leads are in each State?",
  "How many leads are from Arizona?",
  "How many leads are from Texas?",
  "How many leads have a Vehicle Year?",
  "How many Vehicle Year fields are blank?",
  "How many 2025 vehicles are there?",
  "How many 2026 vehicles are there?",
  "How many Toyota vehicles are there?",
  "How many Honda vehicles are there?",
  "How many leads have a VIN?",
  "How many VIN fields are blank?",
  "How many unique VINs are there?",
  "How many leads are Quoted?",
  "How many leads are Sold?",
  "How many leads are Issued?",
  "What Insurance Companies are listed?",
  "How many Progressive leads are there?",
  "What Payment Methods are used?",
  "How many leads use CC payment?",
  "How many leads use Co Esig?",
  "What is the total Premium Amount?",
  "What is the average Premium Amount?",
  "How many leads have a Policy Number?",
  "How many Policy Number fields are blank?",
  "What are the Lines of Business?",
  "How many Auto leads have a VIN?",
  "How many leads were added in September 2026?",
  "How many Nexus Auto leads are there?",
  "How many leads have both Email and Phone?",
  "How many Auto vs. Home leads are there?"
];

async function runBenchmark() {
  const file = fileProcessorService.getAllFiles()[0];
  console.log(`Analyzing: ${file.name}`);
  console.log(`Available columns:`, file.schema?.columns.map(c => c.name));

  const results: { q: string; op: string; dim?: string; val?: any; pass: boolean }[] = [];

  for (const q of questions) {
    const sq = semanticLayer.parseQuestionToStructuredQuery(q, file);
    if (!sq) {
      results.push({ q, op: 'FAILED_PARSE', pass: false });
      continue;
    }
    const res = analyticsEngine.executeStructuredQuery(file.id, sq);
    results.push({
      q,
      op: sq.operation,
      dim: sq.dimension,
      val: res.primaryMetric.value,
      pass: true
    });
  }

  console.log('\n--- RESULTS SUMMARY ---');
  for (const r of results) {
    if (!r.pass) {
      console.log(`❌ FAIL: "${r.q}" -> Could not parse`);
    } else {
      console.log(`✅ OK: "${r.q}" -> [${r.op}${r.dim ? ' on ' + r.dim : ''}] = ${r.val}`);
    }
  }
}

runBenchmark().catch(console.error);
