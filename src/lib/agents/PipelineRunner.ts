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
    // SINGLE-PASS DIRECT DRAFTING
    // ==========================================
    await updateJobStatus(jobId, 'DRAFTING');
    
    const draftRes = await generateText({
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

    const finalMarkdown = draftRes.text.trim();

    // ==========================================
    // STAGE: COMPLETED
    // ==========================================
    await updateJobStatus(jobId, 'COMPLETED', { markdown_result: finalMarkdown });

  } catch (error: any) {
    console.error("[Pipeline Error]", error);
    await updateJobStatus(jobId, 'FAILED', { error_message: error.message });
  }
}
