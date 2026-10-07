import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';

const file = fileProcessorService.getAllFiles()[0];

const sequence = [
  'How many policies were sold in May?',
  'what about august?',
  'and in august?',
  'group by agent',
  'by agent',
  'which agent sold the most?',
  'how many leads are from Texas?',
  'what about Arizona?'
];

for (const q of sequence) {
  const sq = semanticLayer.parseQuestionToStructuredQuery(q, file);
  console.log(`Q: "${q}" -> sq:`, sq ? JSON.stringify(sq) : 'NULL');
}
