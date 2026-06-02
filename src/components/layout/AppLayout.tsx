import React, { useState } from 'react';
import { ApiConfigBlock } from '@/components/auth/ApiConfigBlock';
import { ExportMenu } from '@/components/export/ExportMenu';
import { useTextbookStore } from '@/store/useTextbookStore';
import { useGenerationEngine } from '@/hooks/useGenerationEngine';
import { Play, CheckCircle2, Loader2, Settings, BookOpen, Network, Lock, Unlock, X, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { status, currentView, setCurrentView, isEditMode, setIsEditMode, outline } = useTextbookStore();
  const { generateContent, isGenerating, progress } = useGenerationEngine();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isIdle = status === 'IDLE';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Premium Top Navigation */}
      <header className="h-16 border-b border-white/10 bg-card/80 backdrop-blur-xl flex items-center px-6 shrink-0 justify-between z-20 shadow-sm">
        
        {/* Left: Logo and Back */}
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors" title="Back to Dashboard">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
              A
            </div>
            <h1 className="font-bold text-lg hidden sm:block tracking-tight">AI Textbook Gen</h1>
          </div>
        </div>

        {/* Center: View Switcher (Only show if not idle) */}
        {!isIdle && (
          <div className="flex items-center bg-secondary/50 p-1 rounded-full border border-border/50">
            <button
              onClick={() => setCurrentView('READ')}
              className={`flex items-center px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                currentView === 'READ' 
                  ? 'bg-background shadow-md text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Read View
            </button>
            <button
              onClick={() => setCurrentView('MINDMAP')}
              className={`flex items-center px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                currentView === 'MINDMAP' 
                  ? 'bg-background shadow-md text-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Network className="w-4 h-4 mr-2" />
              Mindmap
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center space-x-4">
          {!isIdle && (
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={`flex items-center text-sm px-3 py-1.5 rounded-full transition-colors border ${
                isEditMode 
                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' 
                  : 'bg-secondary text-muted-foreground border-transparent hover:bg-secondary/80'
              }`}
              title={isEditMode ? "Lock Structure" : "Unlock to Edit"}
            >
              {isEditMode ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
              {isEditMode ? "Editing" : "Locked"}
            </button>
          )}

          {isGenerating && (
            <div className="flex items-center text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-full">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {progress}%
            </div>
          )}

          {status === 'EDITING_OUTLINE' && (
            <button 
              onClick={() => generateContent()}
              className="flex items-center text-sm bg-primary text-primary-foreground px-4 py-1.5 rounded-full shadow-md hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-4 h-4 mr-2" />
              Generate All
            </button>
          )}

          <ExportMenu />
          
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-secondary text-muted-foreground transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative bg-dot-pattern">
        {children}
      </main>

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
