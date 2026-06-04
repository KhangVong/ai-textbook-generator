import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/');
  }

  // Fetch user projects from Supabase
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return <DashboardClient projects={projects} error={error} />;
}
