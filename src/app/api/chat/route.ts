import { NextResponse } from 'next/server';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { streamText } from 'ai'; // Keep it for generate_outline if we want, but actually we can just use langchain for everything.

// We will keep 'generate_outline' using the ai sdk for simplicity or switch to langchain?
// Let's keep `streamText` from `ai` for `generate_outline` because the frontend expects a normal text stream there.
// For `generate_content`, we use LangGraph yielding NDJSON.

export const runtime = 'edge';

// Define the state for LangGraph
const AgentState = Annotation.Root({
  prompt: Annotation<string>(),
  currentOutline: Annotation<any>(),
  plan: Annotation<{agentType: string, instruction: string}[]>({
    reducer: (x, y) => y,
    default: () => []
  }),
  currentTaskIndex: Annotation<number>({
    reducer: (x, y) => y,
    default: () => 0
  }),
  // Not explicitly accumulating generatedContent in state because we stream tokens directly to frontend,
  // but it's good practice for LangGraph to maintain it.
  generatedContent: Annotation<string>({
    reducer: (x, y) => x + y,
    default: () => ""
  })
});

// Create LangGraph nodes
async function routerNode(state: typeof AgentState.State, config: any) {
  const llm = new ChatOpenAI({
    modelName: config.configurable.modelName,
    configuration: { baseURL: config.configurable.baseURL },
    apiKey: config.configurable.apiKey,
    modelKwargs: { response_format: { type: "json_object" } }
  });

  const res = await llm.invoke([
    ["system", `You are the Manager/Router Agent for a textbook generator.
Your job is to break down the topic into a sequence of 3 to 6 logical sub-modules.
You do NOT write the content yourself. You delegate to specialists.
Choose from these expert types:
- 'prose': For writing text, introductions, explanations, or transitions.
- 'math': For rigorous mathematical definitions, theorems, or LaTeX proofs.
- 'matplotlib': For generating a python matplotlib chart to visualize data.
- 'diagram': For generating a mermaid.js flowchart.
CRITICAL: You MUST output a valid JSON object with a single root key "tasks", which is an array of objects. Each object must have "agentType" (one of the 4 strings) and "instruction". Do not output markdown backticks.`],
    ["human", `Topic: "${state.prompt}"\nContext: ${JSON.stringify(state.currentOutline)}`]
  ]);

  let planObj;
  try {
    planObj = JSON.parse(res.content as string);
  } catch(e) {
    throw new Error("Router failed to output valid JSON: " + res.content);
  }

  return { plan: planObj.tasks || [], currentTaskIndex: 0 };
}

async function proseNode(state: typeof AgentState.State, config: any) {
  const llm = new ChatOpenAI({
    modelName: config.configurable.modelName,
    configuration: { baseURL: config.configurable.baseURL },
    apiKey: config.configurable.apiKey,
  });
  const task = state.plan[state.currentTaskIndex];
  const res = await llm.invoke([
    ["system", "You are the Prose Writer Agent. Write beautiful, engaging textbook paragraphs based on the instruction. DO NOT use complex LaTeX block math, and DO NOT write code or mermaid. Use standard markdown formatting. Start directly with the content, no meta-commentary."],
    ["human", task.instruction]
  ]);
  return { generatedContent: (res.content as string) + "\n\n", currentTaskIndex: state.currentTaskIndex + 1 };
}

async function mathNode(state: typeof AgentState.State, config: any) {
  const llm = new ChatOpenAI({
    modelName: config.configurable.modelName,
    configuration: { baseURL: config.configurable.baseURL },
    apiKey: config.configurable.apiKey,
    temperature: 0.1
  });
  const task = state.plan[state.currentTaskIndex];
  const res = await llm.invoke([
    ["system", `You are the Math Expert Agent. Write strictly accurate mathematical definitions, proofs, and equations. Use LaTeX for all math ($$ for blocks, $ for inline). CRITICAL: Never output mixed repetitive symbols like "a,b∈Za, b \\in \\mathbb{Z}a,b∈Z". Use clean, singular LaTeX. Start directly with the content, no meta-commentary.`],
    ["human", task.instruction]
  ]);
  return { generatedContent: (res.content as string) + "\n\n", currentTaskIndex: state.currentTaskIndex + 1 };
}

async function matplotlibNode(state: typeof AgentState.State, config: any) {
  const llm = new ChatOpenAI({
    modelName: config.configurable.modelName,
    configuration: { baseURL: config.configurable.baseURL },
    apiKey: config.configurable.apiKey,
    temperature: 0.1
  });
  const task = state.plan[state.currentTaskIndex];
  const res = await llm.invoke([
    ["system", `You are the Matplotlib Charting Agent. Write a COMPLETE Python script using matplotlib to visualize the given concept. The output MUST be strictly wrapped in a \`\`\`python-chart block. Do not use plt.show(). Do not include your own base64 encoding script. Just write standard matplotlib code (e.g., plt.plot(), plt.title(), etc.) and the sandbox will handle the rest. No other explanation text allowed.`],
    ["human", task.instruction]
  ]);
  return { generatedContent: (res.content as string) + "\n\n", currentTaskIndex: state.currentTaskIndex + 1 };
}

async function diagramNode(state: typeof AgentState.State, config: any) {
  const llm = new ChatOpenAI({
    modelName: config.configurable.modelName,
    configuration: { baseURL: config.configurable.baseURL },
    apiKey: config.configurable.apiKey,
    temperature: 0.1
  });
  const task = state.plan[state.currentTaskIndex];
  const res = await llm.invoke([
    ["system", `You are the Diagram Agent. Write a valid Mermaid.js diagram based on the instruction. The output MUST be strictly wrapped in a \`\`\`mermaid block. No other explanation text allowed.`],
    ["human", task.instruction]
  ]);
  return { generatedContent: (res.content as string) + "\n\n", currentTaskIndex: state.currentTaskIndex + 1 };
}

// Router logic
function routeNext(state: typeof AgentState.State) {
  if (state.currentTaskIndex >= state.plan.length) {
    return END;
  }
  const nextTask = state.plan[state.currentTaskIndex];
  return nextTask.agentType as any; // 'prose', 'math', 'matplotlib', 'diagram'
}

// Build graph
const workflow = new StateGraph(AgentState)
  .addNode("router", routerNode)
  .addNode("prose", proseNode)
  .addNode("math", mathNode)
  .addNode("matplotlib", matplotlibNode)
  .addNode("diagram", diagramNode)
  .addEdge(START, "router")
  .addConditionalEdges("router", routeNext)
  .addConditionalEdges("prose", routeNext)
  .addConditionalEdges("math", routeNext)
  .addConditionalEdges("matplotlib", routeNext)
  .addConditionalEdges("diagram", routeNext);

const app = workflow.compile();

export async function POST(req: Request) {
  try {
    const { prompt, type, currentOutline } = await req.json();
    const apiKey = req.headers.get('X-OpenAI-Key');
    const baseURL = req.headers.get('X-Base-URL') || 'https://api.openai.com/v1';
    const modelName = req.headers.get('X-Model-Name') || 'gpt-4o';

    const isCustomUrl = baseURL && !baseURL.includes('api.openai.com');
    if (!apiKey && !isCustomUrl) {
      return NextResponse.json({ error: 'API Key is missing' }, { status: 401 });
    }

    if (type === 'test_connection') {
      const llm = new ChatOpenAI({
        modelName,
        configuration: { baseURL },
        apiKey: apiKey || 'dummy-key',
      });
      const res = await llm.invoke("Say OK");
      return NextResponse.json({ success: true, text: res.content });
    }

    if (type === 'generate_outline') {
      // Still using ai SDK for simple text streaming of the outline
      const { createOpenAI } = await import('@ai-sdk/openai');
      const openai = createOpenAI({
        apiKey: apiKey || 'dummy-key',
        baseURL: baseURL,
      });
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
      const stream = await app.streamEvents({
        prompt,
        currentOutline
      }, {
        version: "v2",
        configurable: { modelName, baseURL, apiKey: apiKey || 'dummy-key' }
      });

      const readableStream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          const send = (data: any) => {
            controller.enqueue(encoder.encode(JSON.stringify(data) + "\\n"));
          };

          try {
            for await (const event of stream) {
              if (event.event === "on_chain_start") {
                if (event.name === "routerNode") send({ type: "status", data: "👑 主理人正在拆解子任务..." });
                if (event.name === "proseNode") send({ type: "status", data: "✍️ 散文写作专家正在撰写段落..." });
                if (event.name === "mathNode") send({ type: "status", data: "🧮 数学推导专家正在严谨排版..." });
                if (event.name === "matplotlibNode") send({ type: "status", data: "📊 可视化专家正在编写 Python 图表脚本..." });
                if (event.name === "diagramNode") send({ type: "status", data: "🗺️ 拓扑绘图专家正在构建 Mermaid..." });
              } 
              else if (event.event === "on_chat_model_stream") {
                // event.data.chunk is an AIMessageChunk
                const chunkContent = event.data?.chunk?.content;
                if (chunkContent) {
                  send({ type: "chunk", data: chunkContent });
                }
              }
              else if (event.event === "on_chain_end") {
                // We inject a double newline after each expert finishes
                if (["proseNode", "mathNode", "matplotlibNode", "diagramNode"].includes(event.name)) {
                  send({ type: "chunk", data: "\\n\\n" });
                }
              }
            }
            send({ type: "done" });
            controller.close();
          } catch (err: any) {
            console.error("LangGraph Pipeline Error:", err);
            send({ type: "error", data: err.message || String(err) });
            controller.close();
          }
        }
      });

      return new Response(readableStream, {
        headers: { 'Content-Type': 'application/x-ndjson' },
      });
    }

    return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 });

  } catch (error: any) {
    console.error('API Chat Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
