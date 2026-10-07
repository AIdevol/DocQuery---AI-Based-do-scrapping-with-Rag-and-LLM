import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { queryRouterService } from '../server/src/services/queryRouter.js';

async function getFile() {
  while (fileProcessorService.getAllFiles().length === 0) {
    await new Promise(r => setTimeout(r, 100));
  }
  return fileProcessorService.getAllFiles()[0];
}

async function run() {
  const file = await getFile();
  console.log(`Loaded file: ${file.name}`);
  const history: { role: 'user' | 'assistant'; content: string }[] = [];

  const conversation = [
    'how many polices sold in may and august',
    'how many policies sold in july',
    'what about june?',
    'How many total leads are there?',
    'Which Lead Source has the most leads?',
    'How many leads are there from each State?'
  ];

  for (let i = 0; i < conversation.length; i++) {
    const q = conversation[i];
    console.log(`\n======================================================`);
    console.log(`TURN ${i + 1}: "${q}"`);
    console.log(`======================================================`);

    const result = await queryRouterService.executeQuery({
      question: q,
      fileIds: [file.id],
      history: [...history]
    });

    console.log(`Primary Metric:`, result.analyticalResult?.primaryMetric);
    console.log(`Applied Filter:`, result.analyticalResult?.appliedFilterDescription);
    console.log(`Validation Status:`, result.analyticalResult?.validation.reconciliationStatus);
    console.log(`Content line 1-2:`, result.content.split('\n').slice(0, 3).join('\n'));

    history.push({ role: 'user', content: q });
    history.push({ role: 'assistant', content: result.content });
  }
}

run().catch(console.error);
