import { useState, useCallback } from 'react';
import { useTextbookStore, OutlineNode } from '@/store/useTextbookStore';

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
    // If no API key and it's not a custom local URL (like localhost), we should warn
    if (!apiKey && !isCustomUrl) {
      alert("Please configure your API Key in the Settings (bottom left) first.");
      return;
    }
    
    if (!outline.length) {
      alert("Outline is empty. Please go back and generate an outline first.");
      return;
    }
    
    setIsGenerating(true);
    setStatus('GENERATING_CHAPTERS');
    
    const allNodes = flattenNodes(outline);
    const nodesToGenerate = targetedNodeId 
      ? allNodes.filter(n => n.id === targetedNodeId)
      : allNodes.filter(n => !n.content); // If batch, only generate missing ones
      
    let completed = 0;
    let hasError = false;

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

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Server returned ${response.status}: ${errText}`);
        }
        if (!response.body) throw new Error('No body returned from server');

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
      } catch (err: any) {
        console.error(`Error generating content for ${node.title}:`, err);
        alert(`Failed to generate content for "${node.title}". Error: ${err.message}`);
        hasError = true;
        break; // Stop generating if there's an error
      }
      
      const currentState = useTextbookStore.getState();
      if (currentState.activeProjectId) {
        await fetch(`/api/projects/${currentState.activeProjectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ outline_data: currentState.outline })
        }).catch(err => console.error('Failed to sync to database:', err));
      }
      
      completed++;
      setProgress(Math.round((completed / nodesToGenerate.length) * 100));
    }

    setIsGenerating(false);
    setStatus(hasError ? 'EDITING_OUTLINE' : 'COMPLETE');
  }, [outline, apiKey, baseURL, modelName, updateNodeContent, setStatus]);

  return {
    generateContent,
    isGenerating,
    progress
  };
};
