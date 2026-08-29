import { translateNewspaper } from './src/services/newspaper.service';
import { config } from './src/config';

async function run() {
  console.log('API Key exists?', !!config.openai.apiKey);
  const sampleNewspaper = {
    title: 'Family Times',
    sections: [
      { title: 'Top Story', content: 'A quiet day in the family.' }
    ]
  };

  try {
    const result = await translateNewspaper(sampleNewspaper, 'es');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
