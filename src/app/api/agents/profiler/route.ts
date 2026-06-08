import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    const apiKeyHeader = req.headers.get('X-OpenAI-Key');
    const apiKey = apiKeyHeader || process.env.DEEPSEEK_API_KEY || 'sk-1c92c6d5afe1421ab07147f41128ac6c';
    let baseURL = req.headers.get('X-Base-URL') || 'https://api.openai.com/v1';
    let modelName = req.headers.get('X-Model-Name') || 'gpt-4o';

    if (!apiKeyHeader) {
      baseURL = 'https://api.deepseek.com';
      modelName = 'deepseek-v4-pro';
    }

    const openai = createOpenAI({
      apiKey: apiKey || 'dummy-key',
      baseURL: baseURL,
    });

    const systemPrompt = `You are a Senior Educational Product Manager (The Profiler). 
A user wants to create a textbook or course based on the following request: "${prompt}".
Your job is to analyze this request and deduce the optimal educational profile for this book.
Fill out the target audience, tone, and prerequisites based on your expert pedagogical analysis.

Return ONLY a valid JSON object matching this exact structure:
{
  "targetAudience": "The specific demographic or skill level this book is written for, e.g., 'High school students', 'Senior Software Engineers'.",
  "tone": "The reading tone and style, e.g., 'Academic and rigorous', 'Casual and humorous', 'Socratic and questioning'.",
  "prerequisites": "Required prior knowledge, e.g., 'Basic Calculus', 'None'."
}
Do not include any markdown formatting like \`\`\`json or explanations, just the raw JSON object.`;

    const result = await generateText({
      model: openai.chat(modelName),
      system: systemPrompt,
      prompt: "Generate the book metadata profile."
    });

    let jsonStr = result.text.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }
    
    let object;
    try {
      object = JSON.parse(jsonStr);
    } catch (parseErr) {
      // Fallback defaults if it completely fails to output JSON
      object = {
        targetAudience: "General Audience",
        tone: "Educational and Clear",
        prerequisites: "None"
      };
    }

    return NextResponse.json(object);
  } catch (error: any) {
    console.error('Profiler Agent Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
