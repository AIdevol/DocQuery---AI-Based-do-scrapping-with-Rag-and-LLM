import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { queryRouterService } from '../server/src/services/queryRouter.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';

async function main() {
  const files = fileProcessorService.getAllFiles();
  const file = files[0];
  if (!file) {
    console.error('No files found!');
    // process.exit(1);
  }
  console.log(`Using file: ${file.name}, total records: ${file.stats?.rowCount || 'N/A'}`);

  const testCases = [
    {
      name: 'Turn 1: Policies sold in May grouped by agent',
      question: 'How many policies were sold in May, grouped by agent?',
      history: []
    },
    {
      name: 'Turn 2: Follow-up what about august?',
      question: 'what about august?',
      history: [
        { role: 'user', content: 'How many policies were sold in May, grouped by agent?' },
        { role: 'assistant', content: 'In May 2026, 903 policies were sold.' }
      ]
    },
    {
      name: 'Turn 3: Follow-up who sold the most?',
      question: 'who sold the most?',
      history: [
        { role: 'user', content: 'How many policies were sold in May, grouped by agent?' },
        { role: 'assistant', content: 'In May 2026, 903 policies were sold.' },
        { role: 'user', content: 'what about august?' },
        { role: 'assistant', content: 'In August 2026, 1,220 policies were sold.' }
      ]
    },
    {
      name: 'Turn 4: Follow-up by state',
      question: 'by state',
      history: [
        { role: 'user', content: 'How many policies were sold in May, grouped by agent?' },
        { role: 'assistant', content: 'In May 2026, 903 policies were sold.' },
        { role: 'user', content: 'what about august?' },
        { role: 'assistant', content: 'In August 2026, 1,220 policies were sold.' }
      ]
    },
    {
      name: 'Turn 5: Follow-up how many in Texas?',
      question: 'how many in Texas?',
      history: [
        { role: 'user', content: 'How many policies were sold in May, grouped by agent?' },
        { role: 'assistant', content: 'In May 2026, 903 policies were sold.' },
        { role: 'user', content: 'what about august?' },
        { role: 'assistant', content: 'In August 2026, 1,220 policies were sold.' },
        { role: 'user', content: 'by state' },
        { role: 'assistant', content: 'Policies sold by state in August 2026.' }
      ]
    },
    {
      name: 'Turn 6: Standalone total leads (MUST NOT inherit August/Issued)',
      question: 'How many total leads are there?',
      history: [
        { role: 'user', content: 'how many in Texas?' },
        { role: 'assistant', content: 'In Texas, 269 policies were sold.' }
      ]
    },
    {
      name: 'Turn 7: Standalone Which Lead Source has the most leads?',
      question: 'Which Lead Source has the most leads?',
      history: [
        { role: 'user', content: 'How many total leads are there?' },
        { role: 'assistant', content: 'There are 31,803 total leads.' }
      ]
    },
    {
      name: 'Turn 8: Standalone Blank Sales Rep count',
      question: 'How many Sales Rep fields are blank?',
      history: [
        { role: 'user', content: 'Which Lead Source has the most leads?' },
        { role: 'assistant', content: 'Nexus has the most leads.' }
      ]
    },
    {
      name: 'Turn 9: RR 3.0 Leads',
      question: 'How many leads from RR 3.0?',
      history: []
    },
    {
      name: 'Turn 10: Policies sold by month (virtual Month grouping)',
      question: 'How many policies sold by month?',
      history: []
    }
  ];

  console.log('\n--- EXECUTING DETERMINISTIC TESTS ---');
  for (const tc of testCases) {
    console.log(`\n======================================================`);
    console.log(`TEST: ${tc.name}`);
    console.log(`Question: "${tc.question}"`);
    const sq = semanticLayer.parseQuestionToStructuredQuery(tc.question, file, tc.history as any);
    console.log(`Structured Query Operation:`, sq?.operation);
    console.log(`Structured Query Dimension:`, sq?.dimension);
    console.log(`Structured Query Filters:`, JSON.stringify(sq?.filters));

    if (!sq) {
      console.error(`FAILED to parse structured query for: "${tc.question}"`);
      continue;
    }

    const res = analyticsEngine.executeStructuredQuery(file.id, sq);
    console.log(`Primary Metric:`, res.primaryMetric);
    console.log(`Applied Filter:`, res.appliedFilterDescription);
    console.log(`Eliminated Details:`, res.eliminatedDetails);
    console.log(`Validation:`, res.validation.reconciliationStatus, `(filtered: ${res.validation.filterCount}, sum: ${res.validation.groupSum})`);
    if (res.data && res.data.length > 0) {
      console.log(`First 3 data rows:`, res.data.slice(0, 3));
    }
  }
}

main().catch(console.error);

