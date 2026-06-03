"use client";

import React, { useState } from 'react';
import { useTextbookStore, BookMetadata } from '@/store/useTextbookStore';
import { BookOpen, Sparkles, Loader2, ArrowRight, UserCircle, MessageSquare, BookMarked, Compass } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export const NlpWizard = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Steps: 'INPUT' -> 'PROFILE_CONFIRM'
  const [step, setStep] = useState<'INPUT' | 'PROFILE_CONFIRM'>('INPUT');
  const [localMetadata, setLocalMetadata] = useState<BookMetadata>({});

  const { apiKey, baseURL, modelName, setOutline, setStatus, setTitle, setMetadata } = useTextbookStore();
  const { userId } = useAuth();
  const router = useRouter();

  const checkConfig = () => {
    const isCustomUrl = baseURL && !baseURL.includes('api.openai.com');
    if (!apiKey && !isCustomUrl) {
      setError('Please configure your API Key first using the settings icon (in the bottom-left sidebar or settings top modal).');
      return false;
    }
    return true;
  };

  const handleProfilePrompt = async () => {
    if (!prompt.trim() || !checkConfig()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/agents/profiler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-Key': apiKey || '',
          'X-Base-URL': baseURL,
          'X-Model-Name': modelName,
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        let errText = await response.text();
        throw new Error(`Profiler failed: ${errText}`);
      }

      const data = await response.json();
      setLocalMetadata(data);
      setStep('PROFILE_CONFIRM');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during profiling');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateOutline = async () => {
    if (!prompt.trim() || !checkConfig()) return;

    setIsLoading(true);
    setError(null);
    setStatus('GENERATING_OUTLINE');

    // Save metadata to store
    setMetadata(localMetadata);

    try {
      const enhancedPrompt = `
Topic: ${prompt}
Target Audience: ${localMetadata.targetAudience}
Tone & Style: ${localMetadata.tone}
Prerequisites: ${localMetadata.prerequisites}
`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-Key': apiKey || '',
          'X-Base-URL': baseURL,
          'X-Model-Name': modelName,
        },
        body: JSON.stringify({
          type: 'generate_outline',
          prompt: enhancedPrompt,
        }),
      });

      if (!response.ok) {
        let errText = await response.text();
        throw new Error(`Failed to generate outline: ${errText}`);
      }

      if (!response.body) throw new Error('Response body is empty');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        responseText += decoder.decode(value, { stream: true });
      }

      let data;
      try {
        let jsonStr = responseText.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }
        data = JSON.parse(jsonStr);
      } catch (jsonErr) {
        throw new Error(`Failed to parse AI response. Server returned: "${responseText.substring(0, 200)}"`);
      }
      
      if (data.outline && Array.isArray(data.outline)) {
        const processOutline = (nodes: any[]): any[] => {
          return nodes.map(node => ({
            ...node,
            id: node.id || uuidv4(),
            children: node.children ? processOutline(node.children) : [],
          }));
        };
        
        const finalOutline = processOutline(data.outline);
        const finalTitle = prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt;
        
        if (userId) {
          const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: finalTitle,
              outline_data: finalOutline
            })
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(`Failed to save project to database: ${errData.error || res.statusText}`);
          }
          
          const insertedProject = await res.json();
          router.push(`/book/${insertedProject.id}`);
        } else {
          setOutline(finalOutline);
          setTitle(finalTitle);
          setStatus('EDITING_OUTLINE');
        }
      } else {
        throw new Error('Invalid outline format received from AI');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during generation');
      setStatus('IDLE');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4">
      <div className="relative">
        <div className="relative flex flex-col bg-card border border-border rounded-xl premium-shadow overflow-hidden min-h-[160px]">
          
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-card/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-200">
              <Loader2 className="w-6 h-6 animate-spin text-foreground mb-4" />
              <span className="text-sm font-medium tracking-tight text-foreground">
                {step === 'INPUT' ? 'Agent 1: Profiler is analyzing target parameters...' : 'Agent 2: Architect is structure mapping the curriculum...'}
              </span>
            </div>
          )}

          {step === 'INPUT' && (
            <div className="flex items-center w-full">
              <div className="pl-5 text-muted-foreground">
                <Compass className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What topic do you wish to master? E.g., Microeconomics..."
                className="w-full px-4 py-6 bg-transparent focus:outline-none text-foreground placeholder-muted-foreground/60 text-base"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleProfilePrompt();
                }}
                disabled={isLoading}
              />
              <button
                onClick={handleProfilePrompt}
                disabled={isLoading || !prompt.trim()}
                className="mr-3 shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-30 disabled:scale-100"
                title="Next"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 'PROFILE_CONFIRM' && (
            <div className="p-6 flex flex-col space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="font-semibold text-sm tracking-tight flex items-center">
                  <UserCircle className="w-4 h-4 mr-2" />
                  Curriculum Persona settings
                </h3>
                <button 
                  onClick={() => setStep('INPUT')}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Edit Topic
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center">
                    <UserCircle className="w-3.5 h-3.5 mr-1.5" />
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={localMetadata.targetAudience || ''}
                    onChange={(e) => setLocalMetadata({ ...localMetadata, targetAudience: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center">
                    <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                    Tone & Style
                  </label>
                  <input
                    type="text"
                    value={localMetadata.tone || ''}
                    onChange={(e) => setLocalMetadata({ ...localMetadata, tone: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center">
                    <BookMarked className="w-3.5 h-3.5 mr-1.5" />
                    Prerequisites
                  </label>
                  <input
                    type="text"
                    value={localMetadata.prerequisites || ''}
                    onChange={(e) => setLocalMetadata({ ...localMetadata, prerequisites: e.target.value })}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleGenerateOutline}
                  disabled={isLoading}
                  className="px-5 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:opacity-90 transition-all text-sm flex items-center"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Generate Curriculum
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-500/5 border border-red-500/10 text-red-500 rounded-lg text-xs flex items-start">
          {error}
        </div>
      )}
    </div>
  );
};
