"use client";

import React, { useState } from 'react';
import { useTextbookStore } from '@/store/useTextbookStore';
import { BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@clerk/nextjs';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export const NlpWizard = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { apiKey, baseURL, modelName, setOutline, setStatus, setTitle } = useTextbookStore();
  const { userId } = useAuth();
  const router = useRouter();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    const isCustomUrl = baseURL && !baseURL.includes('api.openai.com');
    if (!apiKey && !isCustomUrl) {
      setError('Please configure your API Key first using the settings icon in the top right.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatus('GENERATING_OUTLINE');

    try {
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
          prompt,
        }),
      });

      if (!response.ok) {
        let errText = await response.text();
        let errMsg = 'Failed to generate outline';
        try {
          const errData = JSON.parse(errText);
          errMsg = errData.error || errMsg;
        } catch {
          errMsg = errText || response.statusText;
        }
        throw new Error(errMsg);
      }

      let responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        throw new Error(`Failed to parse AI response. Server returned: "${responseText.substring(0, 200)}"`);
      }
      
      // The API returns an object { outline: [...] } based on Zod schema
      if (data.outline && Array.isArray(data.outline)) {
        // Post-process the outline to ensure every node has an ID if missing
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
          const { data: insertedProject, error: dbError } = await supabase
            .from('projects')
            .insert({
              user_id: userId,
              title: finalTitle,
              outline_data: finalOutline
            })
            .select('id')
            .single();

          if (dbError) throw new Error(`Failed to save project to database: ${dbError.message}`);
          
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
    <div className="w-full">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-xl blur opacity-30 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative flex items-center bg-card border border-border rounded-xl premium-shadow overflow-hidden">
          
          {isLoading && (
            <div className="absolute inset-0 z-10 bg-card/90 backdrop-blur-md flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                AI is designing your curriculum outline...
              </span>
            </div>
          )}

          <div className="pl-4 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., I want to learn AI Product Management for beginners..."
            className="w-full px-4 py-4 bg-transparent focus:outline-none text-card-foreground placeholder-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGenerate();
            }}
            disabled={isLoading}
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="mx-2 my-2 px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center space-x-2 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Generate</span>
                <BookOpen className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm text-left">
          {error}
        </div>
      )}
    </div>
  );
};
