import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';

async function run() {
  while (fileProcessorService.getAllFiles().length === 0) {
    await new Promise(r => setTimeout(r, 100));
  }
  const file = fileProcessorService.getAllFiles()[0];
  console.log('File:', file.name, file.id);

  // Test August with date_range
  const res1 = analyticsEngine.executeStructuredQuery(file.id, {
    operation: 'group_count',
    dimension: 'Agent Sold',
    measure: 'count',
    filters: [
      { column: 'Sold', operator: 'eq', value: 'Issued' },
      { column: 'Date Sold', operator: 'date_range', value: { start: '2026-08-01', end: '2026-08-31' } }
    ]
  });
  console.log('August date_range (start: 2026-08-01, end: 2026-08-31):', res1.primaryMetric, 'Validation:', res1.validation);

  // Test August with month name contains 'Aug'
  const res2 = analyticsEngine.executeStructuredQuery(file.id, {
    operation: 'group_count',
    dimension: 'Agent Sold',
    measure: 'count',
    filters: [
      { column: 'Sold', operator: 'eq', value: 'Issued' },
      { column: 'Date Sold', operator: 'contains', value: 'Aug' }
    ]
  });
  console.log('August contains Aug:', res2.primaryMetric, 'Validation:', res2.validation);

  // Check sample Date Sold values
  const rows = fileProcessorService.getFullDataset(file.id);
  console.log('Total rows:', rows.length);
  const sampleDates = rows.map(r => r['Date Sold']).filter(Boolean).slice(0, 15);
  console.log('Sample dates:', sampleDates);

  for (const sd of sampleDates.slice(0, 5)) {
    console.log(sd, '--> parseDateToIso:', analyticsEngine.parseDateToIso(sd));
  }

  // Count months in Date Sold
  const months: Record<string, { total: number; issued: number; flatCancel: number }> = {};
  for (const r of rows) {
    const ds = String(r['Date Sold'] || '').trim();
    if (!ds) continue;
    const sold = String(r['Sold'] || '').trim().toLowerCase();
    const d = new Date(ds);
    let mKey = 'invalid';
    if (!isNaN(d.getTime())) {
      mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    if (!months[mKey]) months[mKey] = { total: 0, issued: 0, flatCancel: 0 };
    months[mKey].total++;
    if (sold === 'issued') months[mKey].issued++;
    if (sold === 'flat cancel') months[mKey].flatCancel++;
  }
  console.log('Month summary in Date Sold:', months);
}

run().catch(console.error);
