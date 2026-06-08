import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runPipeline } from '@/lib/agents/PipelineRunner';

export async function POST(req: Request) {
  try {
    const { topic, outlineContext, apiKey, baseURL, modelName } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // 1. Create Job in Supabase
    const { data: job, error } = await supabase
      .from('generation_jobs')
      .insert({ status: 'PENDING' })
      .select('id')
      .single();

    if (error || !job) {
      console.error("Supabase insert error:", error);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    // 2. Start Background Task (Do NOT await it)
    runPipeline(job.id, topic, apiKey, baseURL, modelName).catch(console.error);

    // 3. Return Job ID to client for polling
    return NextResponse.json({ jobId: job.id });

  } catch (err: any) {
    console.error("Generate API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
