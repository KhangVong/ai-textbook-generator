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
      // Instead of returning a single stream, we create a custom ReadableStream 
      // that chains multiple Agent streams together.
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Helper to write raw text to the stream
            const writeText = (text: string) => {
              controller.enqueue(encoder.encode(text));
            };

            // ---------------------------------------------------------
            // Agent 3: The Writer
            // ---------------------------------------------------------
            const googleApiKey = req.headers.get('X-Google-Key');
            const googleCx = req.headers.get('X-Google-Cx');
            const hasSearchConfig = !!(googleApiKey && googleCx);

            const writerSystem = `You are the Chief Writer for a textbook.
CRITICAL REQUIREMENTS:
1. Use extensive Markdown formatting (bolding, quotes, lists, tables).
2. Use LaTeX for ALL mathematical equations ($$ for block, $ for inline).
3. Include mermaid.js diagrams where helpful (\`\`\`mermaid ... \`\`\`).
4. STRICT MERMAID SYNTAX RULES:
   - Do NOT output version strings (e.g., no "mermaid version 11.15.0").
   - EVERY node label MUST be enclosed in double quotes. Example: A["Start Process"] --> B["End (Process)"].
   - Node IDs (the text before the bracket) MUST be simple alphanumeric strings without spaces or special characters (e.g., use Node1, NodeA, etc.).
   - Ensure the diagram syntax is flawless. Do not hallucinate invalid node connections.
5. DO NOT start your content by repeating the section title as a heading (e.g. # Title). The title is already displayed in the UI. Start directly with the core content.
6. Context of the full outline: ${JSON.stringify(currentOutline)}
7. You are writing content for the node: "${prompt}".`;

            let fullDraft = '';

            if (!hasSearchConfig) {
              // Standard streaming (No Fact Checking)
              writeText('[STATUS]Agent 3: 👨‍💻 主笔正在撰写内容...[/STATUS]\n');
              const writerResult = await streamText({
                model: openai.chat(modelName),
                system: writerSystem,
                prompt: `Write the full markdown content for the section: ${prompt}`,
              });

              for await (const textPart of writerResult.textStream) {
                fullDraft += textPart;
                writeText(textPart);
              }
            } else {
              // Advanced Pipeline: Writer (Background) -> Fact Checker (Search + Stream)
              writeText('[STATUS]Agent 3: 👨‍💻 主笔正在后台撰写初稿 (为确保案例真实，请稍候)...[/STATUS]\n');
              
              const writerResult = await generateText({
                model: openai.chat(modelName),
                system: writerSystem,
                prompt: `Write the full markdown content for the section: ${prompt}`,
              });
              
              fullDraft = writerResult.text;

              writeText('[STATUS]Agent 4: 🔍 搜索智能体正在联网核查初稿中的案例...[/STATUS]\n');

              const searchWeb: any = {
                description: 'Search Google for factual verification of examples or claims.',
                parameters: z.object({ query: z.string() }),
                execute: async ({ query }: { query: string }) => {
                  try {
                    const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    if (data.items && data.items.length > 0) {
                      return data.items.slice(0, 3).map((item: any) => ({
                        title: item.title,
                        snippet: item.snippet,
                      }));
                    }
                    return 'No search results found.';
                  } catch (e: any) {
                    return `Search failed: ${e.message}`;
                  }
                }
              };

              const factCheckerSystem = `You are a strict Fact Checker and Editor.
You have been provided with a textbook draft. Your job is to verify any examples, anecdotes, or factual claims in the draft.
If you find examples that seem fictional, hallucinated, or inaccurate, use the 'searchWeb' tool to find real-world examples to replace them.
Rewrite the draft incorporating the factual examples. Preserve the original markdown formatting, mermaid diagrams, and LaTeX equations.
STRICT MERMAID SYNTAX RULES:
- If you touch or generate mermaid diagrams, you must follow strict syntax.
- Do NOT output version strings (e.g., no "mermaid version 11.15.0").
- EVERY node label MUST be enclosed in double quotes. Example: A["Start Process"] --> B["End (Process)"].
- Node IDs MUST be simple alphanumeric strings without spaces.
Do NOT output any metadata or comments. Output ONLY the final, polished, and factual markdown text.`;

              const factCheckerResult = await streamText({
                model: openai.chat(modelName),
                system: factCheckerSystem,
                prompt: `Here is the draft. Verify it, modify it if necessary, and output the final version:\n\n${fullDraft}`,
                tools: { searchWeb: searchWeb as any },
                maxSteps: 3, // Allow the agent to search up to 2 times before answering
              } as any);

              for await (const textPart of factCheckerResult.textStream) {
                // Ensure we capture the final text for Assessor Agent
                fullDraft += textPart; 
                writeText(textPart);
              }
            }

            // ---------------------------------------------------------
            // Agent 5: The Assessor (Optional)
            // ---------------------------------------------------------
            const enableQuizzes = req.headers.get('X-Enable-Quizzes') === 'true';
            
            if (enableQuizzes) {
              writeText('[STATUS]Agent 5: 📝 测试专家正在生成随堂测验...[/STATUS]\n');
              writeText(`\n\n---\n\n`); // separator for quizzes
              
              const assessorSystem = `You are the Assessor Agent.
Based on the draft, generate 3 multiple-choice or short-answer questions to test the reader's knowledge.
Format them nicely using Markdown blockquotes or bold text. Provide the answers at the very end in a collapsible detail block if possible, or just clearly separated.`;

              const assessorResult = await streamText({
                model: openai.chat(modelName),
                system: assessorSystem,
                prompt: `Draft:\n\n${fullDraft}\n\nGenerate the Knowledge Check now.`,
              });

              for await (const textPart of assessorResult.textStream) {
                writeText(textPart);
              }
            }

            // Final clear status instruction for frontend
            writeText('[STATUS][/STATUS]');
            controller.close();
          } catch (err: any) {
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
