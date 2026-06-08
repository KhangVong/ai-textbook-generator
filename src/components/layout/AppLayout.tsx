import React from 'react';
import { ApiConfigBlock } from '@/components/auth/ApiConfigBlock';
import { ExportMenu } from '@/components/export/ExportMenu';
import { useTextbookStore } from '@/store/useTextbookStore';
import { useGenerationEngine } from '@/hooks/useGenerationEngine';
import { Play, Loader2, Settings, BookOpen, Network, Lock, Unlock, X, ChevronLeft, Square, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { status, currentView, setCurrentView, isEditMode, setIsEditMode, isSettingsOpen, setIsSettingsOpen } = useTextbookStore();
  const { generateContent, stopGeneration, isGenerating, progress } = useGenerationEngine();

  const isIdle = status === 'IDLE';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-zinc-900 font-sans selection:bg-blue-500/20">
      {/* SaaS Style Top Navigation */}
      <header className="h-14 border-b border-zinc-200 bg-white flex items-center px-4 md:px-6 shrink-0 justify-between z-20">
        
        {/* Left: Logo and Back */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <Link 
            href="/dashboard" 
            className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center" 
            title="Back to Dashboard"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium hidden sm:block">Dashboard</span>
          </Link>
          <div className="w-[1px] h-4 bg-zinc-200 hidden sm:block" />
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-zinc-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              K
            </div>
            <h1 className="font-bold text-sm hidden md:block text-zinc-900">AnyKnowledge</h1>
          </div>
        </div>

        {/* Center: View Switcher */}
        {!isIdle && (
          <div className="flex items-center bg-zinc-100/80 p-1 rounded-lg border border-zinc-200/50">
            <button
              onClick={() => setCurrentView('READ')}
              className={`flex items-center px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                currentView === 'READ' 
                  ? 'bg-white shadow-sm text-blue-600 border border-zinc-200/50' 
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Read
            </button>
            <button
              onClick={() => setCurrentView('MINDMAP')}
              className={`flex items-center px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                currentView === 'MINDMAP' 
                  ? 'bg-white shadow-sm text-blue-600 border border-zinc-200/50' 
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              <Network className="w-3.5 h-3.5 mr-1.5" />
              Mindmap
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {!isIdle && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center text-xs px-3 py-1.5 rounded-md transition-colors font-medium border ${
                isEditMode 
                  ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' 
                  : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
              title={isEditMode ? "Lock Structure" : "Unlock to Edit"}
            >
              {isEditMode ? <Unlock className="w-3.5 h-3.5 sm:mr-1.5" /> : <Lock className="w-3.5 h-3.5 sm:mr-1.5" />}
              <span className="hidden sm:inline">{isEditMode ? "Editing" : "Locked"}</span>
            </button>
          )}

          {isGenerating && (
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100">
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                {progress}%
              </div>
              <button 
                onClick={() => stopGeneration?.()}
                className="flex items-center text-xs font-medium bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 px-3 py-1.5 rounded-md transition-all"
                title="Stop Generation"
              >
                <Square className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Stop</span>
              </button>
            </div>
          )}

          {status === 'EDITING_OUTLINE' && (
            <button 
              onClick={() => generateContent()}
              className="flex items-center text-xs font-semibold bg-zinc-900 text-white px-4 py-1.5 rounded-md hover:bg-zinc-800 transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {progress > 0 ? 'Resume' : 'Generate'}
            </button>
          )}

          <ExportMenu />
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative bg-zinc-50/50">
        {children}
      </main>

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
