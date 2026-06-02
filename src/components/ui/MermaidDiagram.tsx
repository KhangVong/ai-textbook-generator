"use client";
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'default', // You can change this to 'dark' or other themes
  securityLevel: 'loose',
  fontFamily: 'inherit',
});

interface MermaidProps {
  chart: string;
}

export const MermaidDiagram: React.FC<MermaidProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const renderChart = async () => {
      try {
        setError(null);
        // Create a unique ID for the mermaid render
        const id = `mermaid-${Math.random().toString(36).substring(7)}`;
        
        // Clean up common LLM hallucination errors in mermaid blocks
        let cleanChart = chart.trim();
        if (cleanChart.toLowerCase().startsWith('mermaid')) {
          cleanChart = cleanChart.substring(7).trim();
        }
        // Remove trailing backticks if any leaked
        cleanChart = cleanChart.replace(/```$/, '').trim();

        const { svg: renderedSvg } = await mermaid.render(id, cleanChart);
        
        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err: any) {
        console.error("Failed to render mermaid diagram", err);
        if (isMounted) {
          setError(err.message || 'Syntax error in Mermaid diagram');
        }
      }
    };
    
    if (chart) {
      renderChart();
    }
    
    return () => {
      isMounted = false;
    };
  }, [chart]);

  return (
    <div className="my-8 w-full max-w-full overflow-x-auto bg-card border border-border rounded-xl p-4 shadow-sm">
      {error ? (
        <div className="text-red-500 text-sm font-mono whitespace-pre-wrap p-4 bg-red-500/10 rounded-md">
          {error}
        </div>
      ) : svg ? (
        <div 
          ref={containerRef} 
          className="flex justify-center"
          dangerouslySetInnerHTML={{ __html: svg }} 
        />
      ) : (
        <div className="flex justify-center items-center py-8 text-muted-foreground animate-pulse">
          Rendering Diagram...
        </div>
      )}
    </div>
  );
};
