import { fileProcessorService } from '../server/src/services/fileProcessor.js';
import { queryRouterService } from '../server/src/services/queryRouter.js';
import { aiProviderService } from '../server/src/services/aiProvider.js';

const files = fileProcessorService.getAllFiles();
const file = files[0];

console.log('Default AI provider:', aiProviderService.getDefault()?.name, aiProviderService.getDefault()?.defaultModel);

async function run() {
  const history: { role: 'user' | 'assistant'; content: string }[] = [];

  const turns = [
    'how many polices sold in may and august',
    'how many policies sold in july',
    'How many total leads are there?'
  ];

  for (let i = 0; i < turns.length; i++) {
    const q = turns[i];
    console.log(`\n==============================================`);
    console.log(`TURN ${i + 1}: "${q}"`);
    console.log(`History length: ${history.length}`);
    console.log(`==============================================`);

    const result = await queryRouterService.executeQuery({
      question: q,
      fileIds: [file.id],
      history: [...history]
    });

    console.log(`\n--- RESULT CONTENT (First 300 chars) ---`);
    console.log(result.content.slice(0, 300));
    console.log(`\nPrimary metric in analyticalResult:`, result.analyticalResult?.primaryMetric);

    // Add to history
    history.push({ role: 'user', content: q });
    history.push({ role: 'assistant', content: result.content });
  }
}

run().catch(console.error);
