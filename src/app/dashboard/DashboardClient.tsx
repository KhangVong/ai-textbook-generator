"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Plus, Clock, FileText, Settings, X, Search, ChevronRight, LayoutDashboard } from 'lucide-react';
import { ApiConfigBlock } from '@/components/auth/ApiConfigBlock';
import { useTextbookStore } from '@/store/useTextbookStore';

interface DashboardClientProps {
  projects: any[] | null;
  error: any;
}

export const DashboardClient: React.FC<DashboardClientProps> = ({ projects, error }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const clearStore = useTextbookStore((state) => state.clearStore);

  useEffect(() => {
    clearStore();
  }, [clearStore]);

  const filteredProjects = projects?.filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex h-screen w-screen overflow-hidden selection:bg-blue-500/20 font-sans antialiased">
      
      {/* Sleek Sidebar */}
      <aside className="w-64 border-r border-zinc-200 bg-white flex flex-col justify-between h-full shrink-0 z-20 shadow-sm">
        <div className="flex flex-col">
          {/* Logo */}
          <div className="h-16 px-6 border-b border-zinc-100 flex items-center space-x-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
              K
            </div>
            <span className="font-bold text-lg tracking-tight text-zinc-900">AnyKnowledge</span>
          </div>

          {/* Navigation */}
          <nav className="p-4 space-y-1">
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-zinc-100/80 text-blue-600 font-medium transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-sm">Projects</span>
            </Link>
          </nav>
        </div>

        {/* Sidebar Footer with Settings and Profile */}
        <div className="p-4 border-t border-zinc-100 bg-white flex flex-col space-y-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center text-sm text-zinc-600 hover:text-zinc-950 transition-colors space-x-3 py-2.5 px-3 rounded-lg hover:bg-zinc-50 w-full font-medium"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          
          <div className="flex items-center justify-between px-3 py-2 mt-2 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-sm font-medium text-zinc-700">Account</span>
            <UserButton />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50">
        
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md shrink-0 z-10 sticky top-0">
          <div className="flex items-center space-x-2 text-sm font-medium text-zinc-500">
            <span>Workspace</span>
            <ChevronRight className="w-4 h-4 text-zinc-300" />
            <span className="text-zinc-900">Projects</span>
          </div>
          <Link 
            href="/editor" 
            className="flex items-center space-x-2 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Notebook</span>
          </Link>
        </header>

        {/* Scrollable grid */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-10 max-w-7xl w-full mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 space-y-4 md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-900 mb-2">Notebooks</h1>
              <p className="text-zinc-500">Manage your generated courses and structured knowledge maps.</p>
            </div>
            
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search notebooks..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full md:w-64"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 border border-red-200 rounded-xl mb-6 font-medium text-sm">
              Failed to load projects. Ensure the database is connected.
            </div>
          )}

          {(!projects || projects.length === 0) && !error ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 px-4 text-center border-2 border-dashed border-zinc-200 rounded-2xl bg-white"
            >
              <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center mb-5 text-blue-600">
                <BookOpen className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-zinc-900 mb-2">No notebooks yet</h2>
              <p className="text-zinc-500 mb-6 max-w-md">You haven't generated any notebooks. Click the button below to start your first structured knowledge base.</p>
              <Link 
                href="/editor" 
                className="flex items-center space-x-2 bg-zinc-900 text-white px-6 py-2.5 rounded-full font-medium hover:bg-zinc-800 transition-all shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Notebook</span>
              </Link>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProjects?.map((project, idx) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link 
                    href={`/book/${project.id}`} 
                    className="group flex flex-col justify-between h-48 p-5 rounded-2xl bg-white border border-zinc-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Abstract subtle background decoration */}
                    <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-50 rounded-full blur-2xl group-hover:bg-blue-100 transition-colors pointer-events-none" />
                    
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                          <FileText className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-base font-bold text-zinc-900 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors leading-snug">
                        {project.title || "Untitled Notebook"}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-500 mt-4 relative z-10 border-t border-zinc-100 pt-3">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <span className="text-zinc-400 group-hover:text-blue-500 transition-colors font-medium">Open &rarr;</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/20 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white border border-zinc-200 shadow-2xl rounded-2xl w-full max-w-md relative overflow-hidden"
            >
              <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <h3 className="font-bold text-zinc-900 flex items-center">
                  <Settings className="w-4 h-4 mr-2 text-zinc-500"/> 
                  API Configuration
                </h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)} 
                  className="p-1.5 hover:bg-zinc-200 rounded-lg text-zinc-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6">
                <ApiConfigBlock />
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full mt-6 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900 py-2.5 rounded-lg font-medium transition-colors border border-zinc-200/50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
