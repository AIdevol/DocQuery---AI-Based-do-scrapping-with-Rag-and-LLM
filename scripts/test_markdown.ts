import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';
import { formatAnalyticalMarkdown } from '../server/src/services/queryRouter.js';

const file = fileProcessorService.getAllFiles()[0];

const queries = [
  'how many polices sold in may and august',
  'how many policies sold in july',
  'How many policies sold in May group by agent?',
  'How many total leads are there?'
];

for (const q of queries) {
  const sq = semanticLayer.parseQuestionToStructuredQuery(q, file)!;
  const res = analyticsEngine.executeStructuredQuery(file.id, sq);
  const md = formatAnalyticalMarkdown(res, file, q);
  console.log(`\n========================================`);
  console.log(`QUERY: "${q}"`);
  console.log(`========================================`);
  console.log(md);
}
