import { useState, useCallback, useRef } from 'react';
import { useTextbookStore, OutlineNode } from '@/store/useTextbookStore';

export const useGenerationEngine = () => {
  const { outline, apiKey, baseURL, modelName, updateNodeContent, setStatus } = useTextbookStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const flattenNodes = (nodes: OutlineNode[]): OutlineNode[] => {
    let result: OutlineNode[] = [];
    nodes.forEach(n => {
      result.push(n);
      if (n.children) result = result.concat(flattenNodes(n.children));
    });
    return result;
  };

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setStatus('EDITING_OUTLINE');
  }, [setStatus]);

  const generateContent = useCallback(async (targetedNodeId?: string) => {
    const isCustomUrl = baseURL && !baseURL.includes('api.openai.com');
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
    
    // Setup abort controller for this run
    abortControllerRef.current = new AbortController();
    
    const allNodes = flattenNodes(outline);
    // Only generate nodes that are empty or were partially generated (we could clear them first, or just overwrite).
    // For simplicity, we'll overwrite any node that doesn't have a lot of content (< 50 chars usually means failed/partial)
    const nodesToGenerate = targetedNodeId 
      ? allNodes.filter(n => n.id === targetedNodeId)
      : allNodes.filter(n => !n.content || n.content.length < 50 || n.content.includes('> **⏳'));
      
    let completed = 0;
    let hasError = false;

    for (const node of nodesToGenerate) {
      if (abortControllerRef.current?.signal.aborted) {
        break; // Stop the loop if aborted
      }
      
      // Clear existing content before generating to show it's starting fresh
      updateNodeContent(node.id, '');

      try {
        const { enableQuizzes, googleApiKey, googleCx } = useTextbookStore.getState();
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-OpenAI-Key': apiKey || '',
            'X-Base-URL': baseURL,
            'X-Model-Name': modelName,
            'X-Enable-Quizzes': enableQuizzes ? 'true' : 'false',
            'X-Google-Key': googleApiKey || '',
            'X-Google-Cx': googleCx || '',
          },
          body: JSON.stringify({
            type: 'generate_content',
            prompt: node.title,
            currentOutline: outline,
            nodeId: node.id
          }),
          signal: abortControllerRef.current.signal
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Server returned ${response.status}: ${errText}`);
        }
        if (!response.body) throw new Error('No body returned from server');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let currentStatus = '';

        while (true) {
          if (abortControllerRef.current?.signal.aborted) {
            break;
          }
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunkStr = decoder.decode(value, { stream: true });
          buffer += chunkStr;
          
          const lines = buffer.split('\\n');
          buffer = lines.pop() || ''; // Keep the last partial line in the buffer
          
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);
              
              if (event.type === 'status') {
                currentStatus = event.data;
              } else if (event.type === 'chunk') {
                fullText += event.data;
              } else if (event.type === 'error') {
                throw new Error(event.data);
              } else if (event.type === 'done') {
                currentStatus = '';
              }
              
              const displayContent = currentStatus ? `> **⏳ ${currentStatus}**\\n\\n${fullText}` : fullText;
              updateNodeContent(node.id, displayContent);
            } catch (e: any) {
              // Ignore parse errors from partial lines or non-json if streaming splits mid-JSON
              // Wait, NDJSON from our server guarantees newline separation. If split mid-chunk, we might need a buffer.
            }
          }
        }
        
        // After stream is done, clean
        updateNodeContent(node.id, fullText);
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message.includes('aborted')) {
          console.log('Generation aborted by user.');
          break; // Exit the loop gracefully
        }
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

    if (abortControllerRef.current) {
      abortControllerRef.current = null;
    }
    
    setIsGenerating(false);
    setStatus(hasError ? 'EDITING_OUTLINE' : 'COMPLETE');
  }, [outline, apiKey, baseURL, modelName, updateNodeContent, setStatus]);

  return {
    generateContent,
    stopGeneration,
    isGenerating,
    progress
  };
};
