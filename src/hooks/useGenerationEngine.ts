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
    
    abortControllerRef.current = new AbortController();
    
    const allNodes = flattenNodes(outline);
    const nodesToGenerate = targetedNodeId 
      ? allNodes.filter(n => n.id === targetedNodeId)
      : allNodes.filter(n => !n.content || n.content.length < 50 || n.content.includes('> **⏳'));
      
    let completed = 0;
    let hasError = false;

    for (const node of nodesToGenerate) {
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }
      
      updateNodeContent(node.id, '');
      let fullText = '';

      try {
        const { enableQuizzes, googleApiKey, googleCx } = useTextbookStore.getState();
        const baseHeaders = {
          'Content-Type': 'application/json',
          'X-OpenAI-Key': apiKey || '',
          'X-Base-URL': baseURL,
          'X-Model-Name': modelName,
          'X-Enable-Quizzes': enableQuizzes ? 'true' : 'false',
          'X-Google-Key': googleApiKey || '',
          'X-Google-Cx': googleCx || '',
        };

        // Function Calling Mode
        updateNodeContent(node.id, `> **⏳ 👑 主笔正在构思和撰写章节内容...**\n\n`);
        
        // Strip full text content from outline to save tokens
        const cleanOutline = outline.map(n => {
          const cleanNode = (nData: any): any => ({
            id: nData.id,
            title: nData.title,
            level: nData.level,
            children: nData.children ? nData.children.map(cleanNode) : []
          });
          return cleanNode(n);
        });

        const currentState = useTextbookStore.getState();
        const { targetAudience, tone } = currentState.metadata || {};

        const generateRes = await fetch('/api/chat', {
          method: 'POST',
          headers: baseHeaders,
          body: JSON.stringify({
            type: 'generate_chapter',
            prompt: node.title,
            targetAudience: targetAudience || 'undergraduate level',
            tone: tone || 'comprehensive and rigorous',
            outlineContext: cleanOutline,
          }),
          signal: abortControllerRef.current.signal
        });

        if (!generateRes.ok) throw new Error('Generate chapter failed');
        if (!generateRes.body) throw new Error('No body returned from server');

        const reader = generateRes.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          if (abortControllerRef.current?.signal.aborted) break;
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunkStr = decoder.decode(value, { stream: true });
          fullText += chunkStr;
          
          // Format fallback for LaTeX
          const displayFormat = fullText
            .replace(/\\\(/g, '$')
            .replace(/\\\)/g, '$')
            .replace(/\\\[/g, '$$$$')
            .replace(/\\\]/g, '$$$$');
            
          updateNodeContent(node.id, `> **⏳ 👑 主笔正在构思和撰写章节内容...**\n\n${displayFormat}`);
        }
        
        fullText = fullText
          .replace(/\\\(/g, '$')
          .replace(/\\\)/g, '$')
          .replace(/\\\[/g, '$$$$')
          .replace(/\\\]/g, '$$$$');
          
        fullText += '\n\n';
        
        // Finalize
        updateNodeContent(node.id, fullText);
      } catch (err: any) {
        if (err.name === 'AbortError' || err.message.includes('aborted')) {
          console.log('Generation aborted by user.');
          break;
        }
        console.error(`Error generating content for ${node.title}:`, err);
        alert(`Failed to generate content for "${node.title}". Error: ${err.message}`);
        hasError = true;
        break;
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
