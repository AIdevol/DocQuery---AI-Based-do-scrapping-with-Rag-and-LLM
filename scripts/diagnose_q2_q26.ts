import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';

const qs = [
  { id: 2, q: 'How many columns are in the CSV file?', cloud: '49', docu: '36' },
  { id: 8, q: 'What percentage of non-blank Lead Sources are RR 3.0?', cloud: '91.82%', docu: '100%' },
  { id: 9, q: 'What percentage of non-blank Lead Sources are Lead Partner?', cloud: '7.87%', docu: '2772 / 100%' },
  { id: 15, q: 'How many leads have Partner Code 14A?', cloud: '24', docu: '41' },
  { id: 16, q: 'How many leads have Partner Code YW8?', cloud: '20', docu: '11' },
  { id: 17, q: 'How many leads have Partner Code E52?', cloud: '18', docu: '10' },
  { id: 20, q: 'How many unique Partner Names are present?', cloud: '33', docu: '31' },
  { id: 22, q: 'How many leads belong to Web Quote?', cloud: '8,082', docu: '8518' },
  { id: 23, q: 'How many leads belong to All Other?', cloud: '4,905', docu: '4906' },
  { id: 25, q: 'How many leads belong to RightSure / Retail / Walk In?', cloud: '3,940', docu: '3491' },
  { id: 26, q: 'How many leads belong to HTQMain?', cloud: '3,122', docu: '3295' }
];

async function run() {
  const file = fileProcessorService.getAllFiles()[0];
  console.log('File:', file.name, 'columns in schema:', file.schema?.columns.length);

  for (const item of qs) {
    console.log(`\n--- Q${item.id}: ${item.q} ---`);
    console.log(`Expected: ${item.cloud} | Benchmark DocuQuery: ${item.docu}`);
    const sq = semanticLayer.parseQuestionToStructuredQuery(item.q, file);
    console.log(`SQ: op=${sq?.operation}, dim=${sq?.dimension}, filters=${JSON.stringify(sq?.filters)}`);
    if (sq) {
      const res = analyticsEngine.executeStructuredQuery(file.id, sq);
      console.log(`Executed val:`, res.primaryMetric?.value, `formula:`, res.calculationFormula);
    }
  }
}

run().catch(console.error);
