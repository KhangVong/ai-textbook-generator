import { NextResponse } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateText } from 'ai';

export const runtime = 'edge';
export const maxDuration = 60;

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
Return ONLY a valid JSON object matching this exact structure:
{
  "outline": [
    {
      "id": "string",
      "title": "string",
      "children": [ ... ]
    }
  ]
}
Do not include any markdown formatting, backticks, or explanation. Ensure all array elements are properly wrapped in curly braces.`;
      
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          
          // Heartbeat every 5 seconds to bypass Vercel Edge Initial Byte Timeout
          const interval = setInterval(() => {
            controller.enqueue(encoder.encode(" "));
          }, 5000);

          try {
            const res = await fetch(`${baseURL}/chat/completions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey || 'dummy'}`
              },
              body: JSON.stringify({
                model: modelName,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: prompt }
                ],
                temperature: 0.1,
                stream: false, // Turn off proxy streaming to guarantee valid JSON
                max_tokens: 8000,
                response_format: { type: "json_object" }
              })
            });

            clearInterval(interval);

            if (!res.ok) {
              const err = await res.text();
              controller.enqueue(encoder.encode(`{"error": "API Error: ${err.replace(/"/g, '\\"')}"}`));
              controller.close();
              return;
            }

            const data = await res.json();
            const content = data.choices[0].message.content;
            
            controller.enqueue(encoder.encode(content));
            controller.close();
          } catch (err: any) {
            clearInterval(interval);
            controller.enqueue(encoder.encode(`{"error": "Exception: ${err.message}"}`));
            controller.close();
          }
        }
      });

      return new Response(stream, { 
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        } 
      });
    }
    if (type === 'generate_chapter') {
      const { targetAudience, tone, outlineContext } = body;
      
      const systemPrompt = `You are a master Textbook Writer Agent. Your job is to write a ${tone || 'comprehensive and rigorous'} textbook chapter on the requested topic.
The target audience for this textbook is: ${targetAudience || 'undergraduate level'}. Please adjust your depth of explanation, vocabulary, and mathematical rigor accordingly.

To give you context, here is the full framework/outline of the textbook:
<textbook_outline>
${JSON.stringify(outlineContext, null, 2)}
</textbook_outline>
Please ensure your current chapter fits seamlessly into this overall structure without repeating information from other chapters unnecessarily.

Your writing must follow these strict guidelines:
1. Write both intuitive explanations (prose) and rigorous mathematics.
2. For all inline math, you MUST use $...$ (e.g., $n > 1$, $p \\mid ab$). Never use \\( ... \\).
3. For all block math, you MUST use $$...$$ (e.g., $$ n = p_1 \\cdots p_k $$). Never use \\[ ... \\].
4. Do NOT output QED symbols (such as \\square, \\blacksquare, \\qed, \\QED, □, or ∎) or any other end-of-proof markers (including boxed symbols) at the end of proofs. Finish them naturally with a clear summary or concluding sentence.
5. Do NOT output mixed repetitive symbols like 'a,b∈Za, b \\in \\mathbb{Z}'. Use clean, singular LaTeX.
6. Write naturally, starting directly with the chapter header and content. Do not include meta-commentary like "Sure, here is the text".
7. Strongly adhere to the requested tone and style. Do not drift into casual language if the tone is formal, or overly dense language if the tone is conversational.

You have access to two tools to make the textbook visually rich:
- \`generate_diagram\`: Use this to generate a Mermaid.js flowchart if a process or structure warrants visualization.
- \`generate_chart\`: Use this to generate a Python Matplotlib chart to plot a mathematical function or geometric figure. DO NOT use this for statistical data charts (bar/line/pie charts).

Guidelines for using tools:
- Call them at the exact position in the text where the diagram or chart should be displayed.
- After calling a tool, the orchestrator will insert the generated code block and reply to you. You can then continue writing from where you left off.
- Do not duplicate the code block in your regular text output; calling the tool is sufficient.
`;

      const result = await streamText({
        model: openai.chat(modelName),
        system: systemPrompt,
        prompt: `Please write a comprehensive textbook chapter for the topic: "${prompt}"`,
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

