import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';

const file = fileProcessorService.getAllFiles()[0];
const allRows = fileProcessorService.getFullDataset(file.id);

console.log('Total rows:', allRows.length);

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const counts: Record<string, { total: number; issued: number; flatCancel: number }> = {};

for (const m of months) {
  counts[m] = { total: 0, issued: 0, flatCancel: 0 };
}

for (const r of allRows) {
  const ds = String(r['Date Sold'] || '');
  const sold = String(r['Sold'] || '').trim().toLowerCase();
  for (const m of months) {
    if (ds.toLowerCase().includes(m.toLowerCase())) {
      counts[m].total++;
      if (sold === 'issued') counts[m].issued++;
      if (sold === 'flat cancel') counts[m].flatCancel++;
    }
  }
}

console.log('Month counts:');
console.table(counts);
