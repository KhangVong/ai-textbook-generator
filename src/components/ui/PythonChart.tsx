"use client";
import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface PythonChartProps {
  code: string;
}

export const PythonChart: React.FC<PythonChartProps> = ({ code }) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const runPython = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Wait for pyodide to be available on window
        let pyodide: any;
        if (!(window as any).pyodide) {
           if (!(window as any).loadPyodide) {
             throw new Error("Pyodide engine not loaded yet.");
           }
           pyodide = await (window as any).loadPyodide({
             indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
           });
           (window as any).pyodide = pyodide;
        } else {
           pyodide = (window as any).pyodide;
        }

        // Load matplotlib
        await pyodide.loadPackage(['matplotlib', 'numpy']);

        // Wrapper code to capture the figure as base64 if not explicitly done by the user
        // We will execute the user code, and then find all figures and encode the last one.
        const wrapperCode = `
import matplotlib
import matplotlib.pyplot as plt
import io
import base64

# User code execution
${code}

# If user didn't explicitly clear or show, capture the current figure
buf = io.BytesIO()
plt.savefig(buf, format='png', bbox_inches='tight', dpi=150)
plt.close('all')
buf.seek(0)
base64.b64encode(buf.read()).decode('utf-8')
`;

        const result = await pyodide.runPythonAsync(wrapperCode);
        
        if (isMounted) {
          setImgSrc(`data:image/png;base64,${result}`);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Pyodide execution error:", err);
        if (isMounted) {
          setError(err.message || "Failed to execute Python code.");
          setLoading(false);
        }
      }
    };

    // Only run if the script is loaded
    if ((window as any).loadPyodide) {
        runPython();
    } else {
        // We set a polling interval to wait for the script to load
        const interval = setInterval(() => {
            if ((window as any).loadPyodide) {
                clearInterval(interval);
                runPython();
            }
        }, 500);
        return () => clearInterval(interval);
    }

    return () => {
      isMounted = false;
    };
  }, [code]);

  return (
    <div className="my-8 w-full max-w-2xl mx-auto bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <Script src="https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js" strategy="lazyOnload" />
      
      {loading && !error && !imgSrc && (
        <div className="p-8 flex flex-col items-center justify-center space-y-4 animate-pulse text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-foreground">Executing Python Sandbox...</p>
          <p className="text-xs">Loading Matplotlib and generating chart</p>
        </div>
      )}

      {error && (
        <div className="p-6">
          <div className="flex items-center space-x-2 text-destructive mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <h4 className="font-semibold text-sm">Python Execution Error</h4>
          </div>
          <div className="bg-muted/50 rounded-md p-4 overflow-x-auto">
            <pre className="text-xs font-mono text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        </div>
      )}

      {imgSrc && !error && (
        <div className="p-4 flex justify-center bg-white">
          <img src={imgSrc} alt="Generated Chart" className="max-w-full h-auto rounded" />
        </div>
      )}

      {/* Code Inspector Toggle (Optional UX improvement for users to see what code was run) */}
      <details className="border-t border-border bg-muted/20">
        <summary className="px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors">
          View Python Source Code
        </summary>
        <div className="p-4 overflow-x-auto">
          <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">{code}</pre>
        </div>
      </details>
    </div>
  );
};
