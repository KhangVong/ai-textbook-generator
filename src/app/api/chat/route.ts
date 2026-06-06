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
      });
      return NextResponse.json({ success: true, text: result.text.trim() });
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

      return result.toTextStreamResponse();
    } 
    
    if (type === 'generate_content') {
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const writeText = (text: string) => {
              controller.enqueue(encoder.encode(text));
            };

            // 1. Router Agent
            writeText('[STATUS]👑 主理人正在拆解子任务...[/STATUS]\n');
            const routerSystem = `You are the Manager/Router Agent for a textbook generator.
Your job is to break down the topic into a sequence of 3 to 6 logical sub-modules.
You do NOT write the content yourself. You delegate to specialists.
Choose from these expert types:
- 'prose': For writing text, introductions, explanations, or transitions.
- 'math': For rigorous mathematical definitions, theorems, or LaTeX proofs.
- 'matplotlib': For generating a python matplotlib chart to visualize data or concepts.
- 'diagram': For generating a mermaid.js flowchart or state machine.

Return ONLY a valid JSON object exactly matching this structure, with no markdown code blocks, backticks, or extra text:
{
  "tasks": [
    {
      "agentType": "prose",
      "instruction": "Highly specific instruction for the expert."
    }
  ]
}`;

            const planResult = await generateText({
              model: openai.chat(modelName),
              system: routerSystem,
              prompt: `Topic to break down: "${prompt}"\n\nOutline context: ${JSON.stringify(currentOutline)}`
            });

            let planText = planResult.text.trim();
            if (planText.startsWith('\`\`\`json')) planText = planText.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '');
            else if (planText.startsWith('\`\`\`')) planText = planText.replace(/^\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '');

            let plan: { tasks: { agentType: string, instruction: string }[] };
            try {
              plan = JSON.parse(planText);
              if (!plan.tasks || !Array.isArray(plan.tasks)) throw new Error("Invalid schema");
            } catch (e) {
              console.error("Failed to parse plan JSON:", planText);
              // Fallback plan if JSON fails
              plan = {
                tasks: [
                  { agentType: 'prose', instruction: `Write a clear and engaging overview for the section: ${prompt}` },
                  { agentType: 'math', instruction: `Provide any relevant mathematical definitions or rigor for: ${prompt}` }
                ]
              };
            }

            // 2. Iterate and Dispatch (Map-Reduce execution)
            for (let i = 0; i < plan.tasks.length; i++) {
              const task = plan.tasks[i];
              
              if (task.agentType === 'prose') {
                writeText('[STATUS]✍️ 散文写作专家正在撰写段落...[/STATUS]\n');
                const proseSystem = `You are the Prose Writer Agent. 
Write beautiful, engaging textbook paragraphs based on the instruction.
DO NOT use complex LaTeX block math, and DO NOT write code or mermaid. Use standard markdown formatting.
Start directly with the content, no meta-commentary.`;
                const result = await streamText({
                  model: openai.chat(modelName),
                  system: proseSystem,
                  prompt: task.instruction,
                });
                for await (const textPart of result.textStream) { writeText(textPart); }
                writeText('\n\n');
              } 
              else if (task.agentType === 'math') {
                writeText('[STATUS]🧮 数学推导专家正在严谨排版...[/STATUS]\n');
                const mathSystem = `You are the Math Expert Agent.
Write strictly accurate mathematical definitions, proofs, and equations.
Use LaTeX for all math ($$ for blocks, $ for inline). 
CRITICAL: Never output mixed repetitive symbols like "a,b∈Za, b \\in \\mathbb{Z}a,b∈Z". Use clean, singular LaTeX.
Start directly with the content, no meta-commentary.`;
                const result = await streamText({
                  model: openai.chat(modelName),
                  system: mathSystem,
                  prompt: task.instruction,
                  temperature: 0.1, // low temp for math precision
                });
                for await (const textPart of result.textStream) { writeText(textPart); }
                writeText('\n\n');
              }
              else if (task.agentType === 'matplotlib') {
                writeText('[STATUS]📊 可视化专家正在编写 Python 图表脚本...[/STATUS]\n');
                const chartSystem = `You are the Matplotlib Charting Agent.
Write a COMPLETE Python script using matplotlib to visualize the given concept.
The output MUST be strictly wrapped in a \`\`\`python-chart block.
Do not use plt.show(). Do not include your own base64 encoding script. Just write standard matplotlib code (e.g., plt.plot(), plt.title(), etc.) and the sandbox will handle the rest.
No other explanation text allowed.`;
                const result = await streamText({
                  model: openai.chat(modelName),
                  system: chartSystem,
                  prompt: task.instruction,
                  temperature: 0.1,
                });
                for await (const textPart of result.textStream) { writeText(textPart); }
                writeText('\n\n');
              }
              else if (task.agentType === 'diagram') {
                writeText('[STATUS]🗺️ 拓扑绘图专家正在构建 Mermaid...[/STATUS]\n');
                const diagramSystem = `You are the Diagram Agent.
Write a valid Mermaid.js diagram based on the instruction.
The output MUST be strictly wrapped in a \`\`\`mermaid block.
No other explanation text allowed.`;
                const result = await streamText({
                  model: openai.chat(modelName),
                  system: diagramSystem,
                  prompt: task.instruction,
                  temperature: 0.1,
                });
                for await (const textPart of result.textStream) { writeText(textPart); }
                writeText('\n\n');
              }
            }

            writeText('[STATUS][/STATUS]');
            controller.close();
          } catch (err: any) {
            console.error("Agent Pipeline Error:", err);
            controller.error(err);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 });

  } catch (error: any) {
    console.error('API Chat Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
