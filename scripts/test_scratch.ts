import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { StructuredFilter, StructuredQuery, StoredFile } from '../server/src/types/index.js';

const file = fileProcessorService.getAllFiles()[0];
const columns = file.schema!.columns;

console.log('Columns count:', columns.length);
