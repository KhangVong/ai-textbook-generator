import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';

export const maxDuration = 60; // Max execution time

export async function POST(req: Request) {
  try {
    const { topic, outlineContext, metadata, apiKey, baseURL, modelName } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const openai = createOpenAI({
      baseURL: baseURL || 'https://api.deepseek.com/v1',
      apiKey: apiKey || process.env.DEEPSEEK_API_KEY,
    });
    
    const model = openai(modelName || 'deepseek-chat');

    const languageContext = metadata?.language === 'Chinese' ? 'Simplified Chinese' : 'English';
    const outlineString = outlineContext?.length > 0 ? `The book contains the following chapters/sections in order:\n- ${outlineContext.join('\n- ')}\n\nYou are currently writing the section: "${topic}". Do NOT generate content that belongs to other sections.` : '';

    const result = await streamText({
      model,
      system: `You are an expert textbook writer and academic professor. Your job is to write a comprehensive, highly rigorous chapter section based on the user's topic.

CRITICAL CONSTRAINTS & METADATA:
- Target Language: ${languageContext}
- Target Audience/Level: ${metadata?.targetAudience || 'University Undergraduate'}
- Tone: ${metadata?.tone || 'Academic, objective, and deeply analytical'}
- Recommended Length: ~1500 words. Be thorough and detailed.

${outlineString}

FORMATTING RULES (PURE MARKDOWN):
1. DO NOT generate the main chapter title at the top (e.g. # ${topic}). The frontend already renders it.
2. Structure your content clearly using Markdown sub-headings (## and ###). Every logical part of your explanation MUST have a sub-heading.
3. The final sub-heading MUST be exactly "Conclusion" (or its translation in the target language), summarizing the chapter.
4. For inline math, you MUST ONLY use $...$. Do NOT use \\(...\\).
5. For block equations, you MUST ONLY use $$...$$. Do NOT use \\[...\\] or markdown code blocks for equations.
6. If a visualization (flowchart, timeline, or concept map) is necessary, embed it directly as a Mermaid code block (\`\`\`mermaid ... \`\`\`). 
   - CRITICAL MERMAID RULE: In flowcharts, ALL node labels MUST be wrapped in double quotes to prevent syntax errors (e.g., A["Node Label"] instead of A[Node Label]).
7. Output pure, readable Markdown. Do NOT wrap your entire response in a JSON object.`,
      prompt: `Write the textbook section for: "${topic}"\n\nEnsure you strictly follow the Tone (${metadata?.tone}) and Audience (${metadata?.targetAudience}) profile.`,
    });

    return result.toTextStreamResponse();

  } catch (err: any) {
    console.error("Generate Stream Error:", err);
    return new Response(err.message, { status: 500 });
  }
}
