import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runPipeline } from '@/lib/agents/PipelineRunner';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { topic, outlineContext, metadata, apiKey, baseURL, modelName } = await req.json();

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

    // 2. Return a Heartbeat Stream to keep Vercel Alive while waiting
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send a space every 5 seconds to bypass Vercel timeouts
        const interval = setInterval(() => {
          controller.enqueue(encoder.encode(" "));
        }, 5000);

        try {
          // Await the pipeline COMPLETELY before closing the stream
          await runPipeline(job.id, topic, outlineContext, metadata, apiKey, baseURL, modelName);
          
          clearInterval(interval);
          controller.enqueue(encoder.encode(JSON.stringify({ jobId: job.id })));
          controller.close();
        } catch (err: any) {
          clearInterval(interval);
          controller.enqueue(encoder.encode(JSON.stringify({ error: err.message })));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (err: any) {
    console.error("Generate API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
