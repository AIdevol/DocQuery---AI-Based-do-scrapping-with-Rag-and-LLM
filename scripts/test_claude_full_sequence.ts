import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { queryRouterService } from '../server/src/services/queryRouter.js';

async function testClaudeSequence() {
  const file = fileProcessorService.getAllFiles()[0];
  console.log(`Loaded file: ${file.name}`);

  const history: { role: 'user' | 'assistant'; content: string }[] = [];

  const conversation = [
    'How many policies were sold in May, grouped by agent?',
    'what about august?',
    'who sold the most?'
  ];

  for (let i = 0; i < conversation.length; i++) {
    const q = conversation[i];
    console.log(`\n======================================================`);
    console.log(`TURN ${i + 1} (CLAUDE): "${q}"`);
    console.log(`======================================================`);

    const result = await queryRouterService.executeQuery({
      question: q,
      fileIds: [file.id],
      providerId: 'prov-anthropic',
      modelId: 'claude-sonnet-4-5-20250929',
      history: [...history]
    });

    console.log(`Primary Metric:`, result.analyticalResult?.primaryMetric);
    console.log(`Applied Filter:`, result.analyticalResult?.appliedFilterDescription);
    console.log(`Content Preview:\n`, result.content.slice(0, 300));

    history.push({ role: 'user', content: q });
    history.push({ role: 'assistant', content: result.content });
  }
}

testClaudeSequence().catch(console.error);

