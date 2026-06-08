"use client";

import React, { useState } from 'react';
import { useTextbookStore, OutlineNode } from '@/store/useTextbookStore';
import { useGenerationEngine } from '@/hooks/useGenerationEngine';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

import { Loader2, Play, Edit3, Trash2, ZoomIn, ZoomOut, Settings, BookOpen, Download } from 'lucide-react';
import { MermaidDiagram } from '@/components/ui/MermaidDiagram';
import { JsonChart } from '@/components/ui/JsonChart';
import { PythonChart } from '@/components/ui/PythonChart';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { motion } from 'framer-motion';

import 'katex/dist/katex.min.css';

export const ReadView = () => {
  const { outline, isEditMode, selectedNodeId, setSelectedNodeId, deleteNode, updateNodeTitle, setIsSettingsOpen } = useTextbookStore();
  const { generateContent, isGenerating } = useGenerationEngine();
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [localTitle, setLocalTitle] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);

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

  const handleExport = (format: 'md' | 'html') => {
    if (!activeNode || !activeNode.content) return;
    
    let content = activeNode.content;
    let mimeType = 'text/markdown';
    let extension = 'md';
    
    if (format === 'html') {
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeNode.title}</title><style>body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;max-width:800px;margin:40px auto;padding:0 20px}</style></head><body><pre style="white-space:pre-wrap;font-family:inherit;">${activeNode.content}</pre></body></html>`;
      mimeType = 'text/html';
      extension = 'html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeNode.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full bg-white font-sans text-zinc-900">
      {/* Left Sidebar: Notion-like Outline Directory */}
      <div className="w-72 md:w-80 border-r border-zinc-200 bg-zinc-50 flex flex-col h-full shrink-0 z-10">
        <div className="px-5 py-4 flex items-center justify-between mt-2">
          <span className="font-bold text-xs tracking-wider uppercase text-zinc-400">Contents</span>
          {isEditMode && (
            <span className="text-[10px] text-amber-600 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 font-medium">
              Edit Mode
            </span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5 directory-list">
          {allNodes.map((node) => {
            const isActive = activeNodeId === node.id;
            const hasContent = !!node.content;
            const level = Math.max(1, node.level);
            
            return (
              <div 
                key={node.id}
                onClick={() => setSelectedNodeId(node.id)}
                className={`group relative flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                  isActive ? 'bg-zinc-200/60 text-zinc-900 font-medium' : 'hover:bg-zinc-200/40 text-zinc-600 hover:text-zinc-900'
                }`}
                style={{ marginLeft: `${(level - 1) * 1}rem` }}
              >
                {/* Visual Branch Line for Nested items */}
                {level > 1 && (
                  <div 
                    className="absolute top-0 bottom-0 bg-zinc-200 w-[1px]"
                    style={{ left: `-0.5rem` }}
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
                      className="bg-white border border-blue-500 px-2 py-0.5 rounded text-sm w-full text-zinc-900 focus:outline-none shadow-sm"
                    />
                  ) : (
                    <span 
                      className="text-sm truncate"
                      title={node.title}
                    >
                      {node.title}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditMode && editingTitleId !== node.id && (
                    <>
                      <button 
                        onClick={(e) => handleTitleEditStart(e, node)}
                        className="p-1 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-300/50 rounded"
                        title="Rename Section"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                        title="Delete Section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  
                  {!hasContent && !isGenerating && (
                    <button 
                      onClick={(e) => handleGenerateClick(e, node.id)}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      title="Generate this section"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Main Area: Content Reader */}
      <div className="flex-1 h-full overflow-y-auto bg-white relative">
        <div className="max-w-3xl mx-auto py-16 px-8 md:px-16">
          {!activeNode ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 mt-40">
              <BookOpen className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm font-medium">Select a chapter from the left to start reading.</p>
            </div>
          ) : (
            <motion.div 
              key={activeNode.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="prose prose-zinc max-w-none prose-headings:font-bold prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-a:text-blue-600 prose-img:rounded-xl"
            >
              {/* Reader Header with Zoom Controls */}
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-zinc-100 gap-4">
                <h1 className="text-4xl tracking-tight m-0 font-extrabold text-zinc-900 leading-tight">
                  {activeNode.title}
                </h1>
                <div className="flex items-center space-x-1 bg-zinc-50 rounded-lg p-1 border border-zinc-200 print:hidden shrink-0">

                  <button onClick={() => setZoomLevel(Math.max(0.8, zoomLevel - 0.1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-zinc-500 hover:text-zinc-900">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold w-10 text-center text-zinc-600">{Math.round(zoomLevel * 100)}%</span>
                  <button onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))} className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-zinc-500 hover:text-zinc-900">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {!activeNode.content ? (
                <div className="flex flex-col items-center justify-center py-20 px-8 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                      <p className="text-sm text-zinc-600 font-medium">Generating premium content for this section...</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                        <BookOpen className="w-6 h-6 text-zinc-400" />
                      </div>
                      <p className="text-sm text-zinc-500 mb-6 font-medium">This section has not been generated yet.</p>
                      <button 
                        onClick={(e) => handleGenerateClick(e, activeNode.id)}
                        className="flex items-center bg-zinc-900 text-white px-6 py-2.5 rounded-full font-semibold hover:bg-zinc-800 shadow-md hover:shadow-lg transition-all text-sm hover:-translate-y-0.5 duration-200"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Generate Now
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div 
                  className="markdown-content font-sans antialiased text-zinc-800"
                  style={{ fontSize: `${zoomLevel}rem` }}
                >
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath, remarkGfm]} 
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      code({ node, inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || '');
                        const contentString = String(children).replace(/\n$/, '');
                        
                        if (!inline && match && match[1] === 'mermaid') {
                          return <div className="my-8"><MermaidDiagram chart={contentString} /></div>;
                        }

                        if (!inline && match && match[1] === 'chart') {
                          return <div className="my-8"><JsonChart data={contentString} /></div>;
                        }

                        if (!inline && match && (match[1] === 'python-chart' || (match[1] === 'python' && contentString.includes('matplotlib')))) {
                          return <div className="my-8"><PythonChart code={contentString} /></div>;
                        }

                        return !inline ? (
                          <div className="my-8 rounded-xl overflow-hidden border border-zinc-200 shadow-sm">
                            <div className="bg-zinc-100 px-4 py-2 border-b border-zinc-200 text-xs font-mono text-zinc-500 flex items-center">
                              {match ? match[1] : 'code'}
                            </div>
                            <SyntaxHighlighter
                              style={vscDarkPlus}
                              language={match ? match[1] : 'text'}
                              PreTag="div"
                              customStyle={{ margin: 0, padding: '1.25rem', fontSize: '0.875rem', backgroundColor: '#09090b' }}
                              {...props}
                            >
                              {contentString}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded-md font-mono text-[0.875em] border border-zinc-200" {...props}>
                            {children}
                          </code>
                        );
                      },
                      blockquote({ children }) {
                        return (
                          <blockquote className="border-l-4 border-blue-500 bg-blue-50/50 px-6 py-4 rounded-r-xl italic my-8 text-zinc-700 font-medium">
                            {children}
                          </blockquote>
                        );
                      },
                      table({ children }) {
                        return (
                          <div className="overflow-x-auto my-8 border border-zinc-200 rounded-xl shadow-sm">
                            <table className="min-w-full text-sm">{children}</table>
                          </div>
                        );
                      },
                      thead({ children }) {
                        return <thead className="bg-zinc-50 border-b border-zinc-200">{children}</thead>;
                      },
                      th({ children }) {
                        return <th className="px-4 py-3 text-left font-semibold text-zinc-900">{children}</th>;
                      },
                      td({ children }) {
                        return <td className="px-4 py-3 border-t border-zinc-100 text-zinc-600">{children}</td>;
                      }
                    }}
                  >
                    {activeNode.content}
                  </ReactMarkdown>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
