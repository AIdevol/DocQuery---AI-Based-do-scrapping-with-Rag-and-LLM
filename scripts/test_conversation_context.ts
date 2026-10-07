import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { semanticLayer } from '../server/src/services/semanticLayer.js';
import { trainingCatalogService } from '../server/src/services/trainingCatalogService.js';
import { analyticsEngine } from '../server/src/services/analyticsEngine.js';
import { queryRouterService } from '../server/src/services/queryRouter.js';

async function testConversationContext() {
  const files = fileProcessorService.getAllFiles();
  const file = files.find(f => f.name.includes('All Leads')) || files[0];
  if (!file) {
    console.error('No file found!');
    return;
  }

  console.log(`Testing with file: ${file.name} (Rows: ${file.schema?.rowCount})`);

  // Turn 1: "How many leads have Partner Name available?"
  const q1 = "How many leads have Partner Name available?";
  console.log(`\n--- Turn 1: "${q1}" ---`);
  const sq1 = semanticLayer.parseQuestionToStructuredQuery(q1, file);
  console.log('SQ1:', JSON.stringify(sq1));
  if (sq1) {
    const res1 = analyticsEngine.executeStructuredQuery(file.id, sq1);
    console.log('Result 1:', res1.primaryMetric);
    console.log('Filters 1:', res1.appliedFilterDescription);
  }

  // Turn 2: "Which category has the highest number of records?"
  const history: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: q1 },
    { role: 'assistant', content: '28,310 (Leads with Partner Name Available)' }
  ];

  const q2 = "Which category has the highest number of records?";
  console.log(`\n--- Turn 2: "${q2}" ---`);
  
  // Safeguards check:
  const sg = trainingCatalogService.checkSafeguards(q2, file);
  console.log('Safeguards check:', sg);

  // Conversational resolution check:
  const sq2Context = semanticLayer.resolveConversationalContext(q2, file, history);
  console.log('resolveConversationalContext SQ2:', sq2Context);

  console.log('matchColumn for q2:', semanticLayer.matchColumn(q2, file));
  const sq2 = semanticLayer.parseQuestionToStructuredQuery(q2, file, history);
  console.log('parseQuestionToStructuredQuery SQ2:', sq2);

  // Turn 2: executeQuery on Turn 2
  console.log('\n--- queryRouterService.executeQuery on Turn 2 ---');
  const chatRes = await queryRouterService.executeQuery({
    question: q2,
    fileIds: [file.id],
    history
  });
  console.log('chatRes 2 Content:\n', chatRes.content);

  // Turn 3: User clarifies: "Which Lead Type has the highest number of records?"
  const q3 = "Which Lead Type has the highest number of records?";
  console.log(`\n--- Turn 3: "${q3}" ---`);
  const chatRes3 = await queryRouterService.executeQuery({
    question: q3,
    fileIds: [file.id],
    history: [
      { role: 'user', content: q1 },
      { role: 'assistant', content: '28,310 (Leads with Partner Name Available)' },
      { role: 'user', content: q2 },
      { role: 'assistant', content: chatRes.content }
    ]
  });
  console.log('chatRes 3 Content:\n', chatRes3.content);
}

testConversationContext().catch(console.error);
