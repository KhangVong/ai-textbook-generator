import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateObject, generateText } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

// Use edge runtime to bypass Vercel's 10-second serverless function timeout
export const runtime = 'edge';

// Outline Generation Schema
const outlineSchema = z.object({
  outline: z.array(z.object({
    id: z.string(),
    title: z.string(),
    level: z.number(),
    children: z.array(z.any()), // recursive self is tricky in Zod without lazy eval, using any for deep nesting in simple schema
  }))
});

export async function POST(req: Request) {
  try {
    const { prompt, type, currentOutline, nodeId } = await req.json();
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

    if (type === 'test_connection') {
      const result = await generateText({
        model: openai.chat(modelName),
        prompt: 'Say OK',
        maxTokens: 5,
      });
      return NextResponse.json({ success: true, text: result.text.trim() });
    }

    if (type === 'generate_outline') {
      const systemPrompt = `You are an expert curriculum designer and AI professor. 
Based on the user's request, create a highly structured, comprehensive textbook outline.
The outline should be deeply nested (level 1 = chapters, level 2 = sections, level 3 = sub-sections, etc.).
Ensure each node has a unique 'id' (a short descriptive string without spaces, like 'chap1-intro').
Return ONLY a valid JSON object matching this structure: { "outline": [ ... ] }. Do not include any markdown formatting, backticks, or explanation.`;

      const result = await generateText({
        model: openai.chat(modelName),
        system: systemPrompt,
        prompt: prompt,
      });

      try {
        let jsonStr = result.text.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        
        const parsed = JSON.parse(jsonStr);
        // We do not strictly enforce validation failure if DeepSeek adds extra fields, but we parse it.
        return NextResponse.json(parsed);
      } catch (e: any) {
        console.error('JSON Parse Error:', e);
        throw new Error('Failed to parse outline from AI response. Please try again.');
      }
    } 
    
    if (type === 'generate_content') {
      const systemPrompt = `You are an expert textbook author writing for a premium Notion-style reading experience.
Write comprehensive, deeply engaging, and educational content for the requested textbook section.
CRITICAL REQUIREMENTS:
1. Use extensive Markdown formatting (bolding, quotes, lists, tables) to make it highly readable.
2. Use LaTeX for ALL mathematical equations. Use $$ for block equations and $ for inline equations.
3. Include mermaid.js diagrams where helpful (use \`\`\`mermaid ... \`\`\` blocks).
4. Do NOT output raw JSON. Output pure Markdown.
Context of the full outline: ${JSON.stringify(currentOutline)}
You are writing content for the node with title: "${prompt}".`;

      const result = await streamText({
        model: openai.chat(modelName),
        system: systemPrompt,
        prompt: `Please write the full markdown content for the section: ${prompt}`,
      });

      return result.toTextStreamResponse();
    }

    return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 });

  } catch (error: any) {
    console.error('API Chat Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
