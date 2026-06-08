import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: job, error } = await supabase
      .from('generation_jobs')
      .select('status, markdown_result, error_message')
      .eq('id', id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
