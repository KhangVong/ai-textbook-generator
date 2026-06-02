import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const profileSchema = z.object({
  targetAudience: z.string().describe("The specific demographic or skill level this book is written for, e.g., 'High school students', 'Senior Software Engineers'."),
  tone: z.string().describe("The reading tone and style, e.g., 'Academic and rigorous', 'Casual and humorous', 'Socratic and questioning'."),
  prerequisites: z.string().describe("Required prior knowledge, e.g., 'Basic Calculus', 'None'.")
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKey = req.headers.get('X-OpenAI-Key');
    const baseURL = req.headers.get('X-Base-URL') || 'https://api.openai.com/v1';
    const modelName = req.headers.get('X-Model-Name') || 'gpt-4o';

    const isCustomUrl = baseURL && !baseURL.includes('api.openai.com');
    if (!apiKey && !isCustomUrl) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 401 });
    }

    const openai = createOpenAI({
      apiKey: apiKey || 'dummy-key',
      baseURL: baseURL,
    });

    const systemPrompt = `You are a Senior Educational Product Manager (The Profiler). 
A user wants to create a textbook or course based on the following request: "${prompt}".
Your job is to analyze this request and deduce the optimal educational profile for this book.
Fill out the target audience, tone, and prerequisites based on your expert pedagogical analysis.`;

    const { object } = await generateObject({
      model: openai.chat(modelName),
      schema: profileSchema,
      system: systemPrompt,
      prompt: "Generate the book metadata profile."
    });

    return NextResponse.json(object);
  } catch (error: any) {
    console.error('Profiler Agent Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
