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

        // Step 1: Route
        updateNodeContent(node.id, `> **⏳ 👑 主理人正在拆解子任务...**\\n\\n`);
        let routerRes;
        let routerText = '';
        let routerRetries = 2;
        while (routerRetries >= 0) {
          routerRes = await fetch('/api/chat', {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify({
              type: 'router',
              prompt: node.title,
              currentOutline: outline,
            }),
            signal: abortControllerRef.current.signal
          });

          if (routerRes.ok) {
            if (!routerRes.body) throw new Error('No body returned from router');
            const reader = routerRes.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
              if (abortControllerRef.current?.signal.aborted) break;
              const { done, value } = await reader.read();
              if (done) break;
              routerText += decoder.decode(value, { stream: true });
              updateNodeContent(node.id, `> **⏳ 👑 主理人正在拆解子任务...**\\n\\n\`\`\`json\\n${routerText}\\n\`\`\``);
            }
            break;
          }
          
          if (routerRetries === 0) {
            const errText = await routerRes.text();
            throw new Error(`Router failed to fetch: ${routerRes.status} ${errText}`);
          }
          routerRetries--;
          await new Promise(r => setTimeout(r, 2000));
        }
        
        let routerData;
        try {
          const jsonMatch = routerText.match(/\{[\s\S]*\}/);
          const textToParse = jsonMatch ? jsonMatch[0] : routerText.replace(/```json/g, '').replace(/```/g, '').trim();
          routerData = JSON.parse(textToParse);
        } catch (e) {
          throw new Error("Router failed to output valid JSON: " + routerText);
        }
        const tasks = routerData.tasks || [];

        // Step 2: Execute Experts sequentially
        for (const task of tasks) {
          if (abortControllerRef.current?.signal.aborted) break;

          let statusMsg = "";
          if (task.agentType === "prose") statusMsg = "✍️ 散文写作专家正在撰写段落...";
          if (task.agentType === "math") statusMsg = "🧮 数学推导专家正在严谨排版...";
          if (task.agentType === "matplotlib" || task.agentType === "chart") statusMsg = "📊 可视化专家正在构建数据图表...";
          if (task.agentType === "diagram") statusMsg = "🗺️ 拓扑绘图专家正在构建 Mermaid...";

          updateNodeContent(node.id, `> **⏳ ${statusMsg}**\\n\\n${fullText}`);

          const expertRes = await fetch('/api/chat', {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify({
              type: 'expert',
              task: task,
            }),
            signal: abortControllerRef.current.signal
          });

          if (!expertRes.ok) throw new Error(`Expert ${task.agentType} failed`);
          if (!expertRes.body) throw new Error('No body returned from server');

          const reader = expertRes.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            if (abortControllerRef.current?.signal.aborted) break;
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunkStr = decoder.decode(value, { stream: true });
            fullText += chunkStr;
            updateNodeContent(node.id, `> **⏳ ${statusMsg}**\\n\\n${fullText}`);
          }
          
          fullText += '\\n\\n';
        }
        
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
