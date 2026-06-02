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
            // Agent 3: The Writer
            // ---------------------------------------------------------
            const writerSystem = `You are the Chief Writer for a textbook.
CRITICAL REQUIREMENTS:
1. Use extensive Markdown formatting (bolding, quotes, lists, tables).
2. Use LaTeX for ALL mathematical equations ($$ for block, $ for inline).
3. Include mermaid.js diagrams where helpful (\`\`\`mermaid ... \`\`\`).
4. MERMAID SYNTAX RULE: You MUST quote all node labels containing spaces or special characters like parentheses. Example: A["Node Label (Extra Info)"] --> B["Another Node"]. Do NOT use unquoted parentheses or brackets inside node labels.
5. DO NOT start your content by repeating the section title as a heading (e.g. # Title). The title is already displayed in the UI. Start directly with the core content.
6. Context of the full outline: ${JSON.stringify(currentOutline)}
7. You are writing content for the node: "${prompt}".`;

            const writerResult = await streamText({
              model: openai.chat(modelName),
              system: writerSystem,
              prompt: `Write the full markdown content for the section: ${prompt}`,
            });

            let fullDraft = '';
            for await (const textPart of writerResult.textStream) {
              fullDraft += textPart;
              writeText(textPart);
            }

            // ---------------------------------------------------------
            // Agent 4: The Critic (Runs in background, output hidden)
            // ---------------------------------------------------------
            const criticSystem = `You are a Senior Editor and Critic. 
Review the provided textbook draft. 
If it is excellent, just say "APPROVAL: This draft is excellent." and provide 1-2 minor suggestions.
If it lacks depth, analogies, or clarity, provide a harsh but constructive critique.
Be extremely concise.`;

            const criticResult = await streamText({
              model: openai.chat(modelName),
              system: criticSystem,
              prompt: `Review this draft:\n\n${fullDraft}`,
            });

            let fullCritique = '';
            for await (const textPart of criticResult.textStream) {
              fullCritique += textPart;
              // NOT writing to stream so it's hidden from user
            }

            // ---------------------------------------------------------
            // Agent 5: The Assessor (Optional)
            // ---------------------------------------------------------
            const enableQuizzes = req.headers.get('X-Enable-Quizzes') === 'true';
            
            if (enableQuizzes) {
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
