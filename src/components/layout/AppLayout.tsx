import React, { useState } from 'react';
import { ApiConfigBlock } from '@/components/auth/ApiConfigBlock';
import { ExportMenu } from '@/components/export/ExportMenu';
import { useTextbookStore } from '@/store/useTextbookStore';
import { useGenerationEngine } from '@/hooks/useGenerationEngine';
import { Play, CheckCircle2, Loader2, Settings, BookOpen, Network, Lock, Unlock, X, ChevronLeft, Square } from 'lucide-react';
import Link from 'next/link';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { status, currentView, setCurrentView, isEditMode, setIsEditMode, outline, isSettingsOpen, setIsSettingsOpen } = useTextbookStore();
  const { generateContent, stopGeneration, isGenerating, progress } = useGenerationEngine();

  const isIdle = status === 'IDLE';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Premium Top Navigation */}
      <header className="h-16 border-b border-border bg-card/70 backdrop-blur-md flex items-center px-8 shrink-0 justify-between z-20 shadow-sm">
        
        {/* Left: Logo and Back */}
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="p-1.5 -ml-2 rounded-lg hover:bg-secondary text-muted-foreground transition-colors" title="Back to Dashboard">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <Link href="/dashboard" className="flex items-center space-x-2.5 group">
            <div className="w-7 h-7 rounded bg-primary text-primary-foreground flex items-center justify-center font-serif text-sm font-medium tracking-tighter">
              æ
            </div>
            <h1 className="font-semibold text-sm hidden sm:block tracking-tight text-foreground">AnyKnowledge</h1>
          </Link>
        </div>

        {/* Center: View Switcher (Only show if not idle) */}
        {!isIdle && (
          <div className="flex items-center bg-secondary/40 p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setCurrentView('READ')}
              className={`flex items-center px-3.5 py-1.2 rounded-md text-xs font-medium transition-all ${
                currentView === 'READ' 
                  ? 'bg-card shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              Read
            </button>
            <button
              onClick={() => setCurrentView('MINDMAP')}
              className={`flex items-center px-3.5 py-1.2 rounded-md text-xs font-medium transition-all ${
                currentView === 'MINDMAP' 
                  ? 'bg-card shadow-sm text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Network className="w-3.5 h-3.5 mr-1.5" />
              Mindmap
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center space-x-3">
          {!isIdle && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center text-xs px-2.5 py-1.2 rounded-md transition-colors border ${
                isEditMode 
                  ? 'bg-amber-500/5 text-amber-600 border-amber-500/20' 
                  : 'bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80'
              }`}
              title={isEditMode ? "Lock Structure" : "Unlock to Edit"}
            >
              {isEditMode ? <Unlock className="w-3.5 h-3.5 mr-1.5" /> : <Lock className="w-3.5 h-3.5 mr-1.5" />}
              {isEditMode ? "Editing" : "Locked"}
            </button>
          )}

          {isGenerating && (
            <div className="flex items-center space-x-1.5">
              <div className="flex items-center text-xs text-accent bg-accent/5 px-2.5 py-1.2 rounded-md border border-accent/15">
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                {progress}%
              </div>
              <button 
                onClick={() => stopGeneration?.()}
                className="flex items-center text-xs bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-500 px-3 py-1.2 rounded-md transition-all"
                title="Stop Generation"
              >
                <Square className="w-3 h-3 mr-1" />
                Stop
              </button>
            </div>
          )}

          {status === 'EDITING_OUTLINE' && (
            <button 
              onClick={() => generateContent()}
              className="flex items-center text-xs bg-primary text-primary-foreground px-3.5 py-1.2 rounded-md hover:opacity-90 transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              {progress > 0 ? 'Resume' : 'Generate All'}
            </button>
          )}

          <ExportMenu />
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {children}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm">
          <div className="bg-card border border-border shadow-2xl rounded-xl w-full max-w-md relative overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/20">
              <h3 className="font-semibold text-sm flex items-center"><Settings className="w-4 h-4 mr-2"/> API Configuration</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1 hover:bg-secondary rounded text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <ApiConfigBlock />
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-full mt-4 bg-secondary text-secondary-foreground hover:opacity-90 py-2 rounded-lg font-medium transition-colors text-xs"
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
