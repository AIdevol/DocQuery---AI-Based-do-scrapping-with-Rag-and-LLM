import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';

const file = fileProcessorService.getAllFiles()[0];
const matched = semanticLayer.matchColumn('and in august?', file);
console.log('Match for "and in august?":', matched);
