import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';

const test = async () => {
  const openaiProvider = createOpenAI({
    apiKey: 'sk-1c92c6d5afe1421ab07147f41128ac6c',
    baseURL: 'https://api.deepseek.com',
    compatibility: 'compatible'
  });
  
  const model = openaiProvider.chat('deepseek-chat');

  try {
    const res = await generateObject({
      model,
      schema: z.object({
        targetWordCount: z.number(),
        recommendedTone: z.string()
      }),
      prompt: 'Topic: Cosmology',
    });
    
    console.log('Success:', res.object);
  } catch(e) {
    console.error('Error:', e.message);
  }
};
test();
