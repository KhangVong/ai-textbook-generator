import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const openai = createOpenAI({ baseURL: 'https://api.deepseek.com/v1/', apiKey: 'dummy' });

async function run() {
  try {
    await generateObject({ 
      model: openai('deepseek-v4-pro'), 
      prompt: 'hi',
      schema: z.object({ msg: z.string() })
    });
    console.log("SUCCESS");
  } catch (e) {
    console.log("STATUS:", e.statusCode || e.status);
    console.log("MESSAGE:", e.message);
  }
}
run();
