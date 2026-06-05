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
        
        let cleanChart = chart.trim();
        
        // Strip out common hallucinated starting lines like "mermaid" or "mermaid version x.x"
        const lines = cleanChart.split('\n');
        const validLines = lines.filter(line => {
          const lower = line.trim().toLowerCase();
          return !lower.startsWith('mermaid version') && lower !== 'mermaid' && !lower.startsWith('```');
        });
        cleanChart = validLines.join('\n').trim();

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
    <div className="my-8 w-full max-w-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {error ? (
        <div className="p-6">
          <div className="flex items-center space-x-2 text-destructive mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <h4 className="font-semibold text-sm">Diagram Syntax Error</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            The AI generated an invalid flowchart. You can view the raw markup below.
          </p>
          <div className="bg-muted/50 rounded-md p-4 overflow-x-auto">
            <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{chart}</pre>
          </div>
        </div>
      ) : svg ? (
        <div className="p-4 overflow-x-auto">
          <div 
            ref={containerRef} 
            className="flex justify-center min-w-[600px]"
            dangerouslySetInnerHTML={{ __html: svg }} 
          />
        </div>
      ) : (
        <div className="flex justify-center items-center py-12 text-muted-foreground animate-pulse text-sm">
          Rendering Diagram...
        </div>
      )}
    </div>
  );
};
