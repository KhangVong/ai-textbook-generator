import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

const openai = createOpenAI({ baseURL: 'https://api.deepseek.com/v1', apiKey: 'dummy' });

async function run() {
  try {
    await generateText({ model: openai('deepseek-v4-pro'), prompt: 'hi' });
    console.log("SUCCESS");
  } catch (e) {
    console.log("STATUS:", e.statusCode || e.status);
    console.log("MESSAGE:", e.message);
  }
}
run();
