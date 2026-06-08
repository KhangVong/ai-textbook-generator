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
    
    const concurrencyLimit = 3;
    const activePromises = new Set<Promise<void>>();

    for (const node of nodesToGenerate) {
      if (abortControllerRef.current?.signal.aborted) break;

      const p = (async () => {
        try {
          updateNodeContent(node.id, `> **⏳ 初始化后台作业...**\n\n`);
          
          // 1. Direct Stream Generation
          const currentState = useTextbookStore.getState();
          const generateRes = await fetch('/api/generate-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              topic: node.title, 
              outlineContext: allNodes.map(n => n.title),
              metadata: currentState.metadata,
              apiKey,
              baseURL,
              modelName
            }),
            signal: abortControllerRef.current?.signal
          });

          if (!generateRes.ok || !generateRes.body) throw new Error('Failed to start stream');
          
          const reader = generateRes.body.getReader();
          const decoder = new TextDecoder();
          let currentContent = '';
          
          while (true) {
            if (abortControllerRef.current?.signal.aborted) {
              reader.cancel();
              break;
            }
            
            const { done, value } = await reader.read();
            if (done) break;
            
            currentContent += decoder.decode(value, { stream: true });
            updateNodeContent(node.id, currentContent);
          }
        
        } catch (err: any) {
          if (err.name === 'AbortError' || err.message.includes('aborted')) {
            console.log('Generation aborted by user.');
          } else {
            console.error(`Error generating content for ${node.title}:`, err);
            updateNodeContent(node.id, `> ❌ 生成失败: ${err.message}`);
            hasError = true;
          }
        }
        const currentStateAfter = useTextbookStore.getState();
        if (currentStateAfter.activeProjectId) {
          await fetch(`/api/projects/${currentStateAfter.activeProjectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ outline_data: currentStateAfter.outline })
          }).catch(err => console.error('Failed to sync to database:', err));
        }
        
        completed++;
        setProgress(Math.round((completed / nodesToGenerate.length) * 100));
      })().finally(() => activePromises.delete(p));

      activePromises.add(p);
      
      if (activePromises.size >= concurrencyLimit) {
        await Promise.race(activePromises);
      }
    }
    
    await Promise.all(activePromises);

    if (abortControllerRef.current) abortControllerRef.current = null;
    setIsGenerating(false);
    setStatus(hasError ? 'EDITING_OUTLINE' : 'COMPLETE');
  }, [outline, updateNodeContent, setStatus]);

  return { generateContent, stopGeneration, isGenerating, progress };
};
