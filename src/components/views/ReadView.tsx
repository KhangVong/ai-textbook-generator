"use client";

import React, { useState } from 'react';
import { useTextbookStore, OutlineNode } from '@/store/useTextbookStore';
import { useGenerationEngine } from '@/hooks/useGenerationEngine';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Loader2, Play, Lock, Unlock, Edit3, Trash2, ZoomIn, ZoomOut, Settings } from 'lucide-react';
import { MermaidDiagram } from '@/components/ui/MermaidDiagram';

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
      <div className="w-80 border-r border-border bg-card/50 backdrop-blur flex flex-col h-full shrink-0">
        <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="font-semibold text-sm">Table of Contents</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {allNodes.map((node) => {
            const isActive = activeNodeId === node.id;
            const hasContent = !!node.content;
            
            return (
              <div 
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  isActive ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-secondary text-muted-foreground'
                }`}
                style={{ paddingLeft: `${Math.max(1, node.level) * 1.5 - 0.5}rem` }}
              >
                <div className="flex-1 truncate mr-2">
                  {editingTitleId === node.id ? (
                    <input 
                      autoFocus
                      value={localTitle}
                      onChange={(e) => setLocalTitle(e.target.value)}
                      onBlur={(e) => handleTitleEditSave(e, node.id)}
                      onKeyDown={(e) => handleTitleEditSave(e, node.id)}
                      className="bg-background border border-border px-2 py-0.5 rounded text-sm w-full text-foreground"
                    />
                  ) : (
                    <span 
                      className="text-sm truncate"
                      onDoubleClick={(e) => handleTitleEditStart(e, node)}
                    >
                      {node.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  {isEditMode && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-destructive hover:bg-destructive/10 rounded transition-opacity"
                      title="Delete Section"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  
                  {!hasContent && (
                    <button 
                      onClick={(e) => handleGenerateClick(e, node.id)}
                      className={`p-1.5 rounded-full transition-colors ${isActive ? 'bg-primary text-primary-foreground hover:bg-primary/80' : 'bg-secondary-foreground/10 hover:bg-primary hover:text-primary-foreground'}`}
                      title="Generate this section"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Sidebar Footer with Settings */}
        <div className="p-4 border-t border-border/50 bg-secondary/10 flex items-center shrink-0">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors space-x-2 py-1.5 px-3 rounded-lg hover:bg-secondary w-full"
            title="Configure model and API settings"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Right Main Area: Content Reader */}
      <div className="flex-1 h-full overflow-y-auto bg-background/50">
        <div className="max-w-4xl mx-auto py-12 px-12">
          {!activeNode ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground mt-32">
              <BookPlaceholderIcon className="w-16 h-16 mb-4 opacity-20" />
              <p>Select a chapter from the table of contents</p>
            </div>
          ) : (
            <div className="prose prose-slate dark:prose-invert max-w-none">
              {/* Reader Header with Zoom Controls */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
                <h1 className="text-4xl font-extrabold tracking-tight m-0">
                  {activeNode.title}
                </h1>
                <div className="flex items-center space-x-2 bg-secondary/50 rounded-full p-1 border border-border/50">
                  <button onClick={() => setZoomLevel(Math.max(0.8, zoomLevel - 0.1))} className="p-2 hover:bg-background rounded-full transition-colors text-muted-foreground hover:text-foreground">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))} className="p-2 hover:bg-background rounded-full transition-colors text-muted-foreground hover:text-foreground">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {!activeNode.content ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-secondary/20">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                      <p className="text-muted-foreground font-medium">Generating content for this section...</p>
                    </>
                  ) : (
                    <>
                      <p className="text-muted-foreground mb-4">This section has not been generated yet.</p>
                      <button 
                        onClick={(e) => handleGenerateClick(e, activeNode.id)}
                        className="flex items-center bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:bg-primary/90 shadow-md transition-all hover:scale-105 active:scale-95"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Generate Now
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div 
                  className="markdown-content"
                  style={{ fontSize: `${zoomLevel}rem`, lineHeight: 1.7 }}
                >
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath, remarkGfm]} 
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        if (!inline && match && match[1] === 'mermaid') {
                          return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
                        }
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
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

const BookPlaceholderIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </svg>
);
