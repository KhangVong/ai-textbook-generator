import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { BookOpen, Plus, Clock, FileText } from 'lucide-react';

export default async function DashboardPage() {
  const { userId } = auth();
  
  if (!userId) {
    redirect('/');
  }

  // Fetch user projects from Supabase
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Dashboard Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
            A
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:inline-block">My Workspace</span>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/editor" className="flex items-center space-x-2 text-sm bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-all">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline-block">New Textbook</span>
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Projects</h1>
          <p className="text-muted-foreground">Manage your generated textbooks and curriculum structures.</p>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl mb-6">
            Failed to load projects. Ensure the Supabase database is connected.
          </div>
        )}

        {(!projects || projects.length === 0) && !error ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-white/10 rounded-2xl bg-card/30">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
              <BookOpen className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2">No textbooks yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md">You haven't generated any textbooks. Click the button below to start your first AI curriculum design.</p>
            <Link href="/editor" className="flex items-center space-x-2 bg-foreground text-background px-6 py-3 rounded-full font-semibold hover:scale-105 transition-transform">
              <Plus className="w-5 h-5" />
              <span>Create New Textbook</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.map((project) => (
              <Link href={`/book/${project.id}`} key={project.id} className="group flex flex-col justify-between p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {project.title || "Untitled Textbook"}
                  </h3>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-4 space-x-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
