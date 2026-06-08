"use client";

import React, { useState } from 'react';
import { useTextbookStore, BookMetadata } from '@/store/useTextbookStore';
import { BookOpen, Loader2, ArrowRight, UserCircle, MessageSquare, BookMarked, Compass } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
      setError('Please configure your API Key first using the settings icon.');
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

      const responseText = await response.text();

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
    <div className="w-full relative">
      <motion.div 
        layout
        className="bg-white border border-zinc-200 rounded-2xl shadow-xl shadow-zinc-200/50 overflow-hidden relative min-h-[140px] w-full"
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
            >
              <Loader2 className="w-6 h-6 animate-spin text-zinc-900 mb-4" />
              <span className="text-sm font-medium text-zinc-700">
                {step === 'INPUT' ? 'Agent 1: Profiling target parameters...' : 'Agent 2: Architect is structuring the curriculum...'}
              </span>
            </motion.div>
          ) : step === 'INPUT' ? (
            <motion.div 
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col sm:flex-row items-center w-full p-2"
            >
              <div className="hidden sm:flex pl-4 text-zinc-400">
                <Compass className="w-6 h-6" />
              </div>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What do you want to learn? e.g., Microeconomics..."
                className="w-full px-4 py-5 bg-transparent focus:outline-none text-zinc-900 placeholder:text-zinc-400 text-lg sm:text-xl font-medium"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleProfilePrompt();
                }}
                disabled={isLoading}
              />
              <button
                onClick={handleProfilePrompt}
                disabled={isLoading || !prompt.trim()}
                className={cn(
                  "mt-2 sm:mt-0 mr-2 shrink-0 flex items-center justify-center w-full sm:w-12 h-12 rounded-xl text-white transition-all duration-200",
                  prompt.trim() ? "bg-zinc-900 hover:bg-zinc-800 hover:scale-[1.02] text-white shadow-md shadow-zinc-900/10" : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                )}
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6 md:p-8 flex flex-col space-y-6"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <h3 className="font-bold text-zinc-900 flex items-center">
                  <UserCircle className="w-5 h-5 mr-2 text-zinc-500" />
                  Curriculum Persona
                </h3>
                <button 
                  onClick={() => setStep('INPUT')}
                  className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-full"
                >
                  Edit Topic
                </button>
              </div>
              
              <div className="space-y-5 text-left">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={localMetadata.targetAudience || ''}
                    onChange={(e) => setLocalMetadata({ ...localMetadata, targetAudience: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all font-medium"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center">
                    Tone & Style
                  </label>
                  <input
                    type="text"
                    value={localMetadata.tone || ''}
                    onChange={(e) => setLocalMetadata({ ...localMetadata, tone: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all font-medium"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center">
                    Prerequisites
                  </label>
                  <input
                    type="text"
                    value={localMetadata.prerequisites || ''}
                    onChange={(e) => setLocalMetadata({ ...localMetadata, prerequisites: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleGenerateOutline}
                  disabled={isLoading}
                  className="w-full md:w-auto px-6 py-3 bg-zinc-900 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-all text-sm flex items-center justify-center shadow-md hover:shadow-lg hover:-translate-y-0.5 duration-200"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Generate Curriculum
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium shadow-lg shadow-red-500/5 text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
