"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { BookOpen, Plus, Clock, FileText, Settings, X } from 'lucide-react';
import { ApiConfigBlock } from '@/components/auth/ApiConfigBlock';
import { useTextbookStore } from '@/store/useTextbookStore';

interface DashboardClientProps {
  projects: any[] | null;
  error: any;
}

export const DashboardClient: React.FC<DashboardClientProps> = ({ projects, error }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const clearStore = useTextbookStore((state) => state.clearStore);

  useEffect(() => {
    // Clear textbook store on dashboard mount to prevent cross-session or cross-project data leakage
    clearStore();
  }, [clearStore]);

  return (
    <div className="min-h-screen bg-background text-foreground flex h-screen w-screen overflow-hidden">
      {/* Elegant Left Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col justify-between h-full shrink-0">
        <div className="flex flex-col">
          {/* Logo */}
          <div className="h-16 px-6 border-b border-border/50 flex items-center space-x-3 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-background font-bold shadow-md">
              K
            </div>
            <span className="font-bold text-xl tracking-tight">AnyKnowledge</span>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-3 px-4 py-2.5 rounded-xl bg-secondary text-foreground font-medium transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Projects</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer with Settings and Profile */}
        <div className="p-4 border-t border-border/50 bg-secondary/10 flex flex-col space-y-4">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors space-x-2 py-2 px-3 rounded-lg hover:bg-secondary w-full"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-muted-foreground">Account</span>
            <UserButton />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
        {/* Top Header */}
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-8 bg-card/30 backdrop-blur-md shrink-0">
          <h2 className="font-bold text-lg">My Projects</h2>
          <Link 
            href="/editor" 
            className="flex items-center space-x-2 text-sm bg-zinc-900 dark:bg-zinc-100 text-background px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Notebook</span>
          </Link>
        </header>

        {/* Scrollable grid */}
        <main className="flex-1 overflow-y-auto p-8 max-w-6xl w-full mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Notebooks</h1>
            <p className="text-muted-foreground">Manage your generated courses and structured knowledge maps.</p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl mb-6">
              Failed to load projects. Ensure the Supabase database is connected.
            </div>
          )}

          {(!projects || projects.length === 0) && !error ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-border rounded-2xl bg-card/30">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                <BookOpen className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold mb-2">No notebooks yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md">You haven't generated any notebooks. Click the button below to start your first structured knowledge base.</p>
              <Link 
                href="/editor" 
                className="flex items-center space-x-2 bg-zinc-900 dark:bg-zinc-100 text-background px-6 py-3 rounded-full font-semibold hover:scale-105 transition-all shadow-md"
              >
                <Plus className="w-5 h-5" />
                <span>Create New Notebook</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects?.map((project) => (
                <Link 
                  href={`/book/${project.id}`} 
                  key={project.id} 
                  className="group flex flex-col justify-between p-6 rounded-2xl bg-card border border-border/50 hover:border-zinc-500/50 hover:shadow-lg transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary text-muted-foreground flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold line-clamp-2 mb-2 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                      {project.title || "Untitled Notebook"}
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

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-2xl w-full max-w-md relative overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-border/50 flex justify-between items-center bg-secondary/30">
              <h3 className="font-semibold flex items-center"><Settings className="w-4 h-4 mr-2"/> API Configuration</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-secondary rounded-md text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <ApiConfigBlock />
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full mt-6 bg-secondary text-secondary-foreground hover:bg-secondary/80 py-2 rounded-lg font-medium transition-colors"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
