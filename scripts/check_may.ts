import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';

const file = fileProcessorService.getAllFiles()[0];
const q = 'How many policies sold in May group by agent?';
const sq = semanticLayer.parseQuestionToStructuredQuery(q, file);
console.log('StructuredQuery:', JSON.stringify(sq, null, 2));

const res = analyticsEngine.executeStructuredQuery(file.id, sq!);
console.log('Primary Metric:', res.primaryMetric);
console.log('Validation:', res.validation);
console.log('Top 5 Data:', res.data.slice(0, 5));
