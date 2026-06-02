import { useState, useCallback } from 'react';
import { useTextbookStore, OutlineNode } from '@/store/useTextbookStore';
import { supabase } from '@/lib/supabase';

export const useGenerationEngine = () => {
  const { outline, apiKey, baseURL, modelName, updateNodeContent, setStatus } = useTextbookStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const flattenNodes = (nodes: OutlineNode[]): OutlineNode[] => {
    let result: OutlineNode[] = [];
    nodes.forEach(n => {
      result.push(n);
      if (n.children) result = result.concat(flattenNodes(n.children));
    });
    return result;
  };

  const generateContent = useCallback(async (targetedNodeId?: string) => {
    const isCustomUrl = baseURL && !baseURL.includes('api.openai.com');
    if ((!apiKey && !isCustomUrl) || !outline.length) return;
    
    setIsGenerating(true);
    setStatus('GENERATING_CHAPTERS');
    
    const allNodes = flattenNodes(outline);
    const nodesToGenerate = targetedNodeId 
      ? allNodes.filter(n => n.id === targetedNodeId)
      : allNodes.filter(n => !n.content); // If batch, only generate missing ones
      
    let completed = 0;

    for (const node of nodesToGenerate) {
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
            type: 'generate_content',
            prompt: node.title,
            currentOutline: outline,
            nodeId: node.id
          }),
        });

        if (!response.ok) throw new Error('Failed to generate');
        if (!response.body) throw new Error('No body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let content = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          content += chunk;
          updateNodeContent(node.id, content);
        }
      } catch (err) {
        console.error(`Error generating content for ${node.title}:`, err);
      }
      
      const currentState = useTextbookStore.getState();
      if (currentState.activeProjectId) {
        await supabase
          .from('projects')
          .update({ outline_data: currentState.outline })
          .eq('id', currentState.activeProjectId);
      }
      
      completed++;
      setProgress(Math.round((completed / nodesToGenerate.length) * 100));
    }

    setIsGenerating(false);
    // Don't mark COMPLETE if only generating one node and others are still missing, 
    // but for simplicity we will just set COMPLETE if we successfully generated something.
    setStatus('COMPLETE');
  }, [outline, apiKey, baseURL, modelName, updateNodeContent, setStatus]);

  return {
    generateContent,
    isGenerating,
    progress
  };
};
