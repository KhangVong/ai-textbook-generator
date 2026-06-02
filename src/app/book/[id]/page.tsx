import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { redirect, notFound } from 'next/navigation';
import { WorkspaceClient } from './WorkspaceClient';

export default async function BookPage({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !project) {
    notFound();
  }

  if (project.user_id !== userId) {
    redirect('/dashboard');
  }

  return <WorkspaceClient project={project} />;
}
