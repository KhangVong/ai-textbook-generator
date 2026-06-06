import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, prompt, currentOutline, task } = body;
    
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
        prompt: "Say OK",
      });
      return NextResponse.json({ success: true, text: result.text });
    }

    if (type === 'generate_outline') {
      const systemPrompt = `You are an expert curriculum designer and AI professor. 
Based on the user's request, create a highly structured, comprehensive textbook outline.
The outline should be deeply nested (level 1 = chapters, level 2 = sections, level 3 = sub-sections, etc.).
Ensure each node has a unique 'id' (a short descriptive string without spaces, like 'chap1-intro').
Return ONLY a valid JSON object matching this structure: { "outline": [ ... ] }. Do not include any markdown formatting, backticks, or explanation.`;
      
      const result = await streamText({
        model: openai.chat(modelName),
        system: systemPrompt,
        prompt: prompt,
      });
      return new Response(result.textStream);
    } 
    
    if (type === 'router') {
      const result = await generateText({
        model: openai.chat(modelName),
        system: `You are the Manager/Router Agent for a textbook generator.
Your job is to break down the topic into a sequence of 3 to 6 logical sub-modules.
You delegate to specialists:
- 'prose': For writing text, introductions, explanations, or transitions.
- 'math': For rigorous mathematical definitions, theorems, or LaTeX proofs.
- 'chart': For generating a JSON object to visualize data via Recharts (e.g., line charts, bar charts).
- 'diagram': For generating a mermaid.js flowchart.
CRITICAL: You MUST output a valid JSON object with a single root key "tasks", which is an array of objects. Each object must have "agentType" (one of the 4 strings) and "instruction". Do not output markdown backticks.`,
        prompt: `Topic: "${prompt}"\nContext: ${JSON.stringify(currentOutline)}`,
        temperature: 0.1,
      });

      let planObj;
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        const text = jsonMatch ? jsonMatch[0] : result.text.replace(/```json/g, '').replace(/```/g, '').trim();
        planObj = JSON.parse(text);
      } catch (e) {
        throw new Error("Router failed to output valid JSON: " + result.text);
      }
      return NextResponse.json(planObj);
    }

    if (type === 'expert') {
      let systemPrompt = '';
      if (task.agentType === 'prose') {
        systemPrompt = "You are the Prose Writer Agent. Write beautiful, engaging textbook paragraphs based on the instruction. DO NOT use complex LaTeX block math, and DO NOT write code or mermaid. Use standard markdown formatting. Start directly with the content, no meta-commentary.";
      } else if (task.agentType === 'math') {
        systemPrompt = "You are the Math Expert Agent. Write strictly accurate mathematical definitions, proofs, and equations. Use LaTeX for all math ($$ for blocks, $ for inline). CRITICAL: Never output mixed repetitive symbols like 'a,b∈Za, b \\in \\mathbb{Z}'. Use clean, singular LaTeX. Start directly with the content, no meta-commentary.";
      } else if (task.agentType === 'chart') {
        systemPrompt = "You are the Charting Data Agent. Output ONLY a valid JSON object wrapped in a ```chart block. The JSON must match this structure: { \"title\": \"Chart Title\", \"type\": \"line\" | \"bar\", \"xAxisKey\": \"name\", \"data\": [ { \"name\": \"Item 1\", \"value\": 10 }, ... ] }. Do not output any explanation text.";
      } else if (task.agentType === 'diagram') {
        systemPrompt = "You are the Diagram Agent. Write a valid Mermaid.js diagram based on the instruction. The output MUST be strictly wrapped in a ```mermaid block. No other explanation text allowed.";
      }

      const result = await streamText({
        model: openai.chat(modelName),
        system: systemPrompt,
        prompt: task.instruction,
        temperature: 0.1,
      });
      return result.toTextStreamResponse();
    }

    return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 });

  } catch (error: any) {
    console.error('API Chat Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
