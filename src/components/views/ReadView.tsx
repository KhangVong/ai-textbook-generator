"use client";

import React, { useState } from 'react';
import { useTextbookStore, OutlineNode } from '@/store/useTextbookStore';
import { useGenerationEngine } from '@/hooks/useGenerationEngine';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

import { Loader2, Play, Lock, Unlock, Edit3, Trash2, ZoomIn, ZoomOut, Settings, Plus, BookOpen } from 'lucide-react';
import { MermaidDiagram } from '@/components/ui/MermaidDiagram';
import { JsonFlowchart } from '@/components/ui/JsonFlowchart';
import { JsonChart } from '@/components/ui/JsonChart';
import { PythonChart } from '@/components/ui/PythonChart';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import 'katex/dist/katex.min.css';

export const ReadView = () => {
  const { outline, isEditMode, selectedNodeId, setSelectedNodeId, deleteNode, updateNodeTitle, setIsSettingsOpen } = useTextbookStore();
  const { generateContent, isGenerating } = useGenerationEngine();
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [localTitle, setLocalTitle] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Default selection to first node if none selected
  const activeNodeId = selectedNodeId || (outline.length > 0 ? outline[0].id : null);

  const flattenNodes = (nodes: OutlineNode[]): OutlineNode[] => {
    let result: OutlineNode[] = [];
    nodes.forEach(n => {
      result.push(n);
      if (n.children) result = result.concat(flattenNodes(n.children));
    });
    return result;
  };

  const allNodes = flattenNodes(outline);
  const activeNode = allNodes.find(n => n.id === activeNodeId);

  const handleGenerateClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedNodeId(id);
    generateContent(id);
  };

  const handleTitleEditStart = (e: React.MouseEvent, node: OutlineNode) => {
    e.stopPropagation();
    if (!isEditMode) return;
    setEditingTitleId(node.id);
    setLocalTitle(node.title);
  };

  const handleTitleEditSave = (e: React.KeyboardEvent | React.FocusEvent, id: string) => {
    if ('key' in e && e.key !== 'Enter') return;
    if (localTitle.trim()) {
      updateNodeTitle(id, localTitle.trim());
    }
    setEditingTitleId(null);
  };

  return (
    <div className="flex h-full w-full">
      {/* Left Sidebar: Outline Directory */}
      <div className="w-80 border-r border-border bg-card/45 backdrop-blur flex flex-col h-full shrink-0">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <span className="font-semibold text-xs tracking-wider uppercase text-muted-foreground">Directory</span>
          {isEditMode && (
            <span className="text-[10px] text-amber-600 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/15">
              Edit Mode Active
            </span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1 directory-list">
          {allNodes.map((node) => {
            const isActive = activeNodeId === node.id;
            const hasContent = !!node.content;
            const level = Math.max(1, node.level);
            
            return (
              <div 
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all ${
                  isActive ? 'bg-primary/5 text-foreground font-medium' : 'hover:bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
                style={{ marginLeft: `${(level - 1) * 1.25}rem` }}
              >
                {/* Visual Branch Line for Nested items */}
                {level > 1 && (
                  <div 
                    className="absolute top-0 bottom-0 bg-border/80 w-[1px]"
                    style={{ left: `-0.625rem` }}
                  />
                )}

                <div className="flex-1 truncate mr-2 flex items-center min-w-0">
                  {editingTitleId === node.id ? (
                    <input 
                      autoFocus
                      value={localTitle}
                      onChange={(e) => setLocalTitle(e.target.value)}
                      onBlur={(e) => handleTitleEditSave(e, node.id)}
                      onKeyDown={(e) => handleTitleEditSave(e, node.id)}
                      className="bg-background border border-border px-2 py-0.5 rounded text-xs w-full text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <span 
                      className="text-xs truncate"
                      title={node.title}
                    >
                      {node.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditMode && editingTitleId !== node.id && (
                    <>
                      <button 
                        onClick={(e) => handleTitleEditStart(e, node)}
                        className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded"
                        title="Rename Section"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                        title="Delete Section"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  
                  {!hasContent && !isGenerating && (
                    <button 
                      onClick={(e) => handleGenerateClick(e, node.id)}
                      className="p-1 text-accent hover:bg-accent/10 rounded-full"
                      title="Generate this section"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Sidebar Footer with Settings */}
        <div className="p-4 border-t border-border bg-secondary/10 flex items-center shrink-0">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors space-x-2 py-2 px-3 rounded-lg hover:bg-secondary w-full"
            title="Configure model and API settings"
          >
            <Settings className="w-4 h-4" />
            <span>Settings & Keys</span>
          </button>
        </div>
      </div>

      {/* Right Main Area: Content Reader */}
      <div className="flex-1 h-full overflow-y-auto bg-background/30">
        <div className="max-w-3xl mx-auto py-16 px-12">
          {!activeNode ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground mt-32">
              <BookOpen className="w-12 h-12 mb-4 opacity-25" />
              <p className="text-xs">Select a chapter from the table of contents</p>
            </div>
          ) : (
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {/* Reader Header with Zoom Controls */}
              <div className="flex items-center justify-between mb-12 pb-5 border-b border-border">
                <h1 className="text-4xl tracking-tight m-0 font-serif font-normal text-balance">
                  {activeNode.title}
                </h1>
                <div className="flex items-center space-x-2 bg-secondary/40 rounded-lg p-0.5 border border-border">
                  <button onClick={() => setZoomLevel(Math.max(0.8, zoomLevel - 0.1))} className="p-1.5 hover:bg-card rounded transition-colors text-muted-foreground hover:text-foreground">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-medium w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))} className="p-1.5 hover:bg-card rounded transition-colors text-muted-foreground hover:text-foreground">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              {!activeNode.content ? (
                <div className="flex flex-col items-center justify-center py-16 px-8 border border-dashed border-border rounded-xl bg-card/50">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-4" />
                      <p className="text-xs text-muted-foreground font-medium">Generating content for this section...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground mb-4">This section has not been generated yet.</p>
                      <button 
                        onClick={(e) => handleGenerateClick(e, activeNode.id)}
                        className="flex items-center bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 shadow-sm transition-all text-xs"
                      >
                        <Play className="w-3.5 h-3.5 mr-2" />
                        Generate Now
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div 
                  className="markdown-content font-sans antialiased text-foreground/90 font-light"
                  style={{ fontSize: `${zoomLevel}rem`, lineHeight: 1.75 }}
                >
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath, remarkGfm]} 
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const contentString = String(children).replace(/\n$/, '');
                        
                        // Legacy support for mermaid
                        if (!inline && match && match[1] === 'mermaid') {
                          return <MermaidDiagram chart={contentString} />;
                        }
                        
                        // New robust JSON Flowchart support
                        if (!inline && match && match[1] === 'json') {
                          try {
                            const parsed = JSON.parse(contentString);
                            if (parsed && parsed.type === 'flowchart') {
                              return <JsonFlowchart data={contentString} />;
                            }
                          } catch (e) {
                            // Fall through to standard code block if JSON is invalid
                          }
                        }

                        // Robust Data Charts
                        if (!inline && match && match[1] === 'chart') {
                          return <JsonChart data={contentString} />;
                        }

                        // Python Matplotlib Sandboxing
                        if (!inline && match && match[1] === 'python-chart') {
                          return <PythonChart code={contentString} />;
                        }

                        return (
                          <div className="my-6 rounded-md overflow-hidden bg-secondary/10 border border-border">
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match ? match[1] : 'text'}
                              PreTag="div"
                              customStyle={{ margin: 0, padding: '1rem', fontSize: '0.875rem' }}
                              {...props}
                            >
                              {contentString}
                            </SyntaxHighlighter>
                          </div>
                        );
                      },
                      p({ children }) {
                        return <p className="mb-6 leading-loose text-sm md:text-base font-light text-foreground/80">{children}</p>;
                      },
                      h1({ children }) {
                        return <h2 className="text-2xl font-serif font-normal tracking-tight mt-12 mb-6 text-foreground">{children}</h2>;
                      },
                      h2({ children }) {
                        return <h3 className="text-xl font-serif font-normal tracking-tight mt-8 mb-4 text-foreground">{children}</h3>;
                      },
                      h3({ children }) {
                        return <h4 className="text-lg font-sans font-medium tracking-tight mt-6 mb-3 text-foreground">{children}</h4>;
                      },
                      ul({ children }) {
                        return <ul className="list-disc pl-6 mb-6 space-y-2 text-sm md:text-base font-light text-foreground/80 leading-loose">{children}</ul>;
                      },
                      ol({ children }) {
                        return <ol className="list-decimal pl-6 mb-6 space-y-2 text-sm md:text-base font-light text-foreground/80 leading-loose">{children}</ol>;
                      },
                      li({ children }) {
                        return <li className="pl-1 leading-loose">{children}</li>;
                      },
                      table({ children }) {
                        return (
                          <div className="overflow-x-auto my-8 border shadow-sm border-border rounded-xl scrollbar-thin">
                            <table className="min-w-full text-sm md:text-base border-collapse">{children}</table>
                          </div>
                        );
                      },
                      thead({ children }) {
                        return <thead className="bg-secondary/40 border-b-2 border-border">{children}</thead>;
                      },
                      tbody({ children }) {
                        return <tbody className="divide-y divide-border">{children}</tbody>;
                      },
                      tr({ children }) {
                        return <tr className="hover:bg-muted/30 transition-colors">{children}</tr>;
                      },
                      th({ children }) {
                        return <th className="px-5 py-4 text-left font-semibold text-foreground tracking-wide">{children}</th>;
                      },
                      td({ children }) {
                        return <td className="px-5 py-4 text-foreground/90 font-normal">{children}</td>;
                      },
                      blockquote({ children }) {
                        return (
                          <blockquote className="border-l-4 border-primary/60 bg-primary/5 px-6 py-4 rounded-r-lg italic my-8 text-foreground/90 text-sm font-serif">
                            {children}
                          </blockquote>
                        );
                      }
                    }}
                  >
                    {activeNode.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
