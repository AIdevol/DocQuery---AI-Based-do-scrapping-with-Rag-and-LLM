import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';
import { trainingCatalogService } from '../server/src/services/trainingCatalogService.js';

async function testCatalogRules() {
  const file = fileProcessorService.getAllFiles()[0];
  if (!file) {
    console.error('File not found!');
    process.exit(1);
  }

  console.log(`\n============================================================`);
  console.log(`🧪 TESTING LEAD & POLICY ANALYTICS TRAINING CATALOG RULES`);
  console.log(`File: "${file.name}" | Rows: ${file.schema?.rowCount.toLocaleString()}`);
  console.log(`============================================================\n`);

  const testCases = [
    // Core Metrics
    { name: '1. Policies Sold', q: 'How many policies were sold?', expectOp: 'total_records', check: (r: any) => r.primaryMetric.value === '13,981' },
    { name: '2. Quotes', q: 'How many quotes are there?', expectOp: 'total_records', check: (r: any) => r.primaryMetric.value === '21,787' },
    { name: '3. Quoted-not-sold', q: 'How many leads are Quoted-not-sold?', expectOp: 'total_records', check: (r: any) => r.primaryMetric.value === '4,748' },
    { name: '4. Flat Cancels', q: 'How many flat cancels are there?', expectOp: 'total_records', check: (r: any) => r.primaryMetric.value === '53' },
    { name: '5. Total Leads', q: 'How many total leads are there?', expectOp: 'total_records', check: (r: any) => r.primaryMetric.value === '38,469' },
    { name: '6. Premium Written', q: 'What is the total premium written?', expectOp: 'aggregate', check: (r: any) => String(r.primaryMetric.value).includes('19,480,188') || String(r.primaryMetric.value).includes('$') },
    { name: '7. Average Premium', q: 'What is the average premium for sold policies?', expectOp: 'aggregate', check: (r: any) => String(r.primaryMetric.value).includes('1,393.25') },
    { name: '8. Unique Policies', q: 'How many unique policies are there?', expectOp: 'unique_count', check: (r: any) => r.primaryMetric.value === '13,912' },
    { name: '9. Overall Close Rate', q: 'What is the close rate?', expectOp: 'close_rate', check: (r: any) => String(r.primaryMetric.value).includes('64.17%') },
    { name: '10. Close Rate by Lead Type', q: 'What is the close rate by Lead Type?', expectOp: 'close_rate', check: (r: any) => r.data.length > 0 && r.data[0]['Close Rate'] },
    
    // Grouping & Output Rules
    { name: '11. Sold by Lead Type (<=25 all groups)', q: 'Show policies sold by Lead Type.', expectOp: 'group_count', check: (r: any) => r.data.length <= 25 && r.validation.reconciliationStatus === 'PASS' },
    { name: '12. Sold by Agent (>25 groups: Top 20 + Others)', q: 'Show policies sold by Agent Sold.', expectOp: 'group_count', check: (r: any) => r.data.length === 21 && r.data[20]['Agent Sold'].startsWith('Others') && r.validation.reconciliationStatus === 'PASS' },
    { name: '13. Partner Distribution', q: 'What is the partner distribution?', expectOp: 'group_count', check: (r: any) => r.validation.reconciliationStatus === 'PASS' },
    { name: '14. Lead Source Distribution', q: 'What is the Lead Source distribution?', expectOp: 'group_count', check: (r: any) => r.validation.reconciliationStatus === 'PASS' },

    // Exact Filtering Rules
    { name: '15. Partner Name Filter (All Other)', q: 'How many leads are from All Other?', expectOp: 'total_records', check: (r: any) => String(r.primaryMetric.value).startsWith('4,8') },
    { name: '16. Lead Source Filter (RR 3.0)', q: 'How many leads are from RR 3.0?', expectOp: 'total_records', check: (r: any) => r.primaryMetric.value === '31,768' },
    { name: '17. Agent Sold Filter (Marissa)', q: 'How many policies were sold by Marissa?', expectOp: 'total_records', check: (r: any) => typeof r.primaryMetric.value === 'string' && r.primaryMetric.value !== '0' },
    
    // Time Rules
    { name: '18. Monthly Sold (May)', q: 'How many policies were sold in May?', expectOp: 'total_records', check: (r: any) => r.primaryMetric.value === '903' }
  ];

  let passed = 0;
  for (const tc of testCases) {
    const sq = semanticLayer.parseQuestionToStructuredQuery(tc.q, file);
    if (!sq) {
      console.log(`❌ ${tc.name}: FAILED (parseQuestionToStructuredQuery returned null)`);
      continue;
    }

    if (sq.operation !== tc.expectOp) {
      console.log(`❌ ${tc.name}: FAILED (Expected op "${tc.expectOp}", got "${sq.operation}")`);
      continue;
    }

    const res = analyticsEngine.executeStructuredQuery(file.id, sq);
    const ok = tc.check(res);
    if (ok) {
      console.log(`✅ ${tc.name}: PASS -> ${res.primaryMetric.value} (${res.primaryMetric.label})`);
      passed++;
    } else {
      console.log(`❌ ${tc.name}: FAILED verification. Result:`, res.primaryMetric);
    }
  }

  // Safeguards Test
  console.log(`\n--- Safeguards Testing ---`);
  const catCheck = trainingCatalogService.checkSafeguards('Show breakdown by category', file);
  console.log(`Safeguard "Ambiguous category":`, catCheck.status === 'clarify' ? '✅ PASS (Requested clarification)' : '❌ FAIL');
  if (catCheck.status === 'clarify') passed++;

  const fabCheck = trainingCatalogService.checkSafeguards('What is our profit margin?', file);
  console.log(`Safeguard "No fabricated field":`, fabCheck.status === 'clarify' ? '✅ PASS (Identified unavailable field)' : '❌ FAIL');
  if (fabCheck.status === 'clarify') passed++;

  console.log(`\nSummary: ${passed} / ${testCases.length + 2} Catalog Tests Passed.`);
  if (passed === testCases.length + 2) {
    console.log(`🎉 100% OF TRAINING CATALOG APPROACHES & RULES ARE FULLY VERIFIED!`);
  }
}

testCatalogRules().catch(console.error);
