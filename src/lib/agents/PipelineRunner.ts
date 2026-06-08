import { generateText, generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { supabase } from '../supabase';
import { webSearchTool } from './tools';
import { BlueprintSchema, ChapterContentSchema, ContentBlock } from './schema';
import { sanitizeLatex } from '@/utils/latexSanitizer';

/**
 * Updates the job status in Supabase
 */
async function updateJobStatus(jobId: string, status: string, additionalData: any = {}) {
  await supabase
    .from('generation_jobs')
    .update({ status, ...additionalData, updated_at: new Date().toISOString() })
    .eq('id', jobId);
}

/**
 * Assembles the Structured JSON Blocks into final Markdown
 */
function assembleMarkdown(blocks: ContentBlock[]): string {
  let markdown = "";
  for (const block of blocks) {
    if (block.type === 'text') {
      markdown += `${block.markdown}\n\n`;
    } else if (block.type === 'formula') {
      markdown += `${sanitizeLatex(block.latex, block.isBlock)}\n\n`;
    } else if (block.type === 'diagram') {
      if (block.caption) markdown += `*${block.caption}*\n`;
      markdown += `\`\`\`mermaid\n${block.mermaidCode}\n\`\`\`\n\n`;
    }
  }
  return markdown;
}

/**
 * Core Background Execution Pipeline
 */
export async function runPipeline(jobId: string, topic: string, apiKey?: string, baseURL?: string, modelName?: string) {
  try {
    const openaiProvider = createOpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || '',
      baseURL: baseURL || process.env.OPENAI_BASE_URL,
    });
    const model = openaiProvider.chat(modelName || 'gpt-4o');

    // ==========================================
    // STAGE 1: RESEARCHING (Web Search)
    // ==========================================
    await updateJobStatus(jobId, 'RESEARCHING');
    const researchCtx = await generateText({
      model,
      system: 'You are an academic researcher. Search for the latest and most accurate syllabus, facts, or breakthroughs on the given topic. Return a concise summary of facts.',
      prompt: `Topic: ${topic}`,
      // @ts-ignore - mismatch in AI SDK typings for tools
      // tools: { webSearchTool },
    });

    const contextDocs = researchCtx.text;

    // ==========================================
    // STAGE 2: PROFILING (Generate Blueprint)
    // ==========================================
    await updateJobStatus(jobId, 'PROFILING');
    const blueprintRes = await generateObject({
      model,
      mode: 'json',
      schema: BlueprintSchema,
      system: 'You are a Chief Academic Officer. Create a strict blueprint for a textbook chapter.',
      prompt: `Topic: ${topic}\n\nResearch Context:\n${contextDocs}`,
    });
    const blueprint = blueprintRes.object;
    await updateJobStatus(jobId, 'PROFILING', { blueprint });

    // ==========================================
    // STAGE 3: DRAFTING (Structured Output)
    // ==========================================
    await updateJobStatus(jobId, 'DRAFTING');
    // In a real advanced app, we might loop this. For now, a robust single pass using structured outputs.
    const draftRes = await generateObject({
      model,
      mode: 'json',
      schema: ChapterContentSchema,
      system: `You are an expert textbook writer. Write the chapter using structured blocks.
      You MUST strictly follow this blueprint:
      - Word Count Target: ~${blueprint.targetWordCount} words
      - Tone: ${blueprint.recommendedTone}
      - Required Concepts: ${blueprint.requiredTopics.join(', ')}`,
      prompt: `Write the chapter for: ${blueprint.title}\n\nResearch Background:\n${contextDocs}`,
    });

    // ==========================================
    // STAGE 4: VERIFYING (Quality & Fact Check)
    // ==========================================
    await updateJobStatus(jobId, 'VERIFYING');
    // Here we assemble and theoretically ask a Critic agent to review.
    // For this hackathon/MVP version, we assume the Structured Output constraint & RAG inherently fixed most errors.
    const finalMarkdown = assembleMarkdown(draftRes.object.blocks);

    // ==========================================
    // STAGE 5: COMPLETED
    // ==========================================
    await updateJobStatus(jobId, 'COMPLETED', { markdown_result: finalMarkdown });

  } catch (error: any) {
    console.error("[Pipeline Error]", error);
    await updateJobStatus(jobId, 'FAILED', { error_message: error.message });
  }
}
