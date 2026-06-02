"use client";

import React, { useState } from 'react';
import { useTextbookStore } from '@/store/useTextbookStore';
import { BookOpen, Sparkles, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export const NlpWizard = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { apiKey, baseURL, modelName, setOutline, setStatus, setTitle } = useTextbookStore();

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
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate outline');
      }

      const data = await response.json();
      
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
        
        setOutline(processOutline(data.outline));
        setTitle(prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt);
        setStatus('EDITING_OUTLINE');
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
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center bg-card border border-border rounded-xl premium-shadow overflow-hidden">
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
