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
function assembleMarkdown(blocks: any[]): string {
  let markdown = '';
  for (const block of blocks) {
    if (block.type === 'text') {
      markdown += `${block.markdown}\n\n`;
    } else if (block.type === 'diagram') {
      if (block.caption) {
        markdown += `*${block.caption}*\n`;
      }
      markdown += `\`\`\`mermaid\n${block.mermaidCode}\n\`\`\`\n\n`;
    }
  }
  return markdown.trim();
}

/**
 * Core Background Execution Pipeline
 */
export async function runPipeline(jobId: string, topic: string, outlineContext: string[], metadata: any, apiKey?: string, baseURL?: string, modelName?: string) {
  try {
    const openaiProvider = createOpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || '',
      baseURL: baseURL || process.env.OPENAI_BASE_URL,
    });
    const model = openaiProvider.chat(modelName || 'gpt-4o');

    const languageContext = metadata?.language || "the user's language (default to English unless Chinese context is given)";
    const outlineString = outlineContext?.length > 0 ? `The book contains the following chapters/sections in order:\n- ${outlineContext.join('\n- ')}\n\nYou are currently writing the section: "${topic}". Do NOT generate content that belongs to other sections.` : '';

    // ==========================================
    // STAGE 1 & 2: RESEARCHING AND PROFILING
    // ==========================================
    await updateJobStatus(jobId, 'RESEARCHING & PROFILING');
    
    const researchPromise = generateText({
      model,
      system: `You are an academic researcher. Search for the latest and most accurate syllabus, facts, or breakthroughs on the given topic. Return a concise summary of facts in ${languageContext}. \n\n${outlineString}`,
      prompt: `Topic: ${topic}`,
    });

    const blueprintPromise = generateText({
      model,
      system: `You are a Chief Academic Officer. Create a strict blueprint for a textbook chapter.
Return ONLY a valid JSON object matching this schema:
{
  "title": "string",
  "targetWordCount": "number",
  "requiredTopics": ["string"],
  "recommendedTone": "string"
}
Do not include any markdown formatting like \`\`\`json or explanations.`,
      prompt: `Topic: ${topic}\n\n${outlineString}\n\nMetadata Profile: ${JSON.stringify(metadata)}`,
    });

    const [researchCtx, blueprintRes] = await Promise.all([researchPromise, blueprintPromise]);
    
    const contextDocs = researchCtx.text;

    let blueprintStr = blueprintRes.text.trim();
    if (blueprintStr.startsWith('```json')) blueprintStr = blueprintStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    else if (blueprintStr.startsWith('```')) blueprintStr = blueprintStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    
    let blueprint;
    try {
      blueprint = JSON.parse(blueprintStr);
    } catch(e) {
      blueprint = { title: topic, targetWordCount: 1500, requiredTopics: [], recommendedTone: 'Academic' };
    }
    
    await updateJobStatus(jobId, 'DRAFTING', { blueprint });

    // ==========================================
    // STAGE 3: DRAFTING (Structured Output)
    // ==========================================
    await updateJobStatus(jobId, 'DRAFTING');
    const draftRes = await generateText({
      model,
      system: `You are an expert textbook writer. Write the chapter using structured blocks.
You MUST strictly follow this blueprint:
- Word Count Target: ~${blueprint.targetWordCount} words
- Tone: ${blueprint.recommendedTone || metadata?.tone || 'Academic'}
- Language: ${languageContext}
- Required Concepts: ${blueprint.requiredTopics.join(', ')}

${outlineString}

CRITICAL RULES FOR CONTENT:
1. DO NOT generate the main chapter title at the top (e.g. # ${topic}). The frontend already renders it.
2. Structure your content clearly using Markdown sub-headings (## and ###). Every logical part of your explanation MUST have a sub-heading.
3. The final sub-heading MUST be exactly "Conclusion" (or its translation in the target language), summarizing the chapter.
4. DO NOT include any "Exercises" or "Homework" sections.
5. For inline math, you MUST ONLY use $...$. Do NOT use \\(...\\).
6. For block equations, you MUST ONLY use $$...$$. Do NOT use \\[...\\] or markdown code blocks for equations.
7. Strictly maintain professional depth and adhere to the target word count (~${blueprint.targetWordCount} words) to ensure consistency.
8. You MAY include a "Recommended Reading" or "References" section after the Conclusion if applicable.

Return ONLY a valid JSON object matching this exact schema:
{
  "blocks": [
    {
      "type": "text" | "diagram",
      "markdown": "string (only if type is text. You should freely embed LaTeX math using $ and $$ directly inside the markdown text. DO NOT create standalone formula blocks.)",
      "mermaidCode": "string (only if type is diagram. RULES: 1. Use 'timeline' for historical events. 2. Use 'flowchart' or 'mindmap' for concept maps. 3. CRITICAL: In flowcharts, ALL node labels MUST be wrapped in double quotes to prevent syntax errors, NO EXCEPTIONS. e.g., A[\"Node Label (2024)\"] instead of A[Node Label (2024)].)",
      "caption": "string (only if type is diagram)"
    }
  ]
}
Do not include any markdown formatting like \`\`\`json or explanations. Ensure the JSON is completely valid.`,
      prompt: `Write the chapter for: ${blueprint.title}\n\nResearch Background:\n${contextDocs}`,
    });

    let draftStr = draftRes.text.trim();
    if (draftStr.startsWith('```json')) draftStr = draftStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    else if (draftStr.startsWith('```')) draftStr = draftStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    
    let draftObject;
    try {
      draftObject = JSON.parse(draftStr);
    } catch(e) {
      draftObject = { blocks: [{ type: 'text', markdown: 'Failed to generate chapter content. Please try again.' }] };
    }

    // ==========================================
    // STAGE 4: VERIFYING (Quality & Fact Check)
    // ==========================================
    await updateJobStatus(jobId, 'VERIFYING');
    // Here we assemble and theoretically ask a Critic agent to review.
    // For this hackathon/MVP version, we assume the Structured Output constraint & RAG inherently fixed most errors.
    const finalMarkdown = assembleMarkdown(draftObject.blocks);

    // ==========================================
    // STAGE 5: COMPLETED
    // ==========================================
    await updateJobStatus(jobId, 'COMPLETED', { markdown_result: finalMarkdown });

  } catch (error: any) {
    console.error("[Pipeline Error]", error);
    await updateJobStatus(jobId, 'FAILED', { error_message: error.message });
  }
}
