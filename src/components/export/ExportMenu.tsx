"use client";

import React, { useState } from 'react';
import { useTextbookStore } from '@/store/useTextbookStore';
import { exportToMarkdown, exportToHTML, exportToEPUB, downloadString, downloadBlob } from '@/utils/exportEngine';
import { Download, FileText, Globe, Book, Loader2 } from 'lucide-react';

export const ExportMenu = () => {
  const { title, outline, status } = useTextbookStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // We only allow export if the app is not idle/generating outlines, 
  // typically COMPLETE or at least when there are chapters generated.
  const canExport = status === 'COMPLETE' || status === 'GENERATING_CHAPTERS';

  const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'textbook';

  const handleExportMarkdown = () => {
    try {
      const md = exportToMarkdown(title, outline);
      downloadString(md, 'text/markdown', `${safeTitle}.md`);
    } catch (e) {
      console.error(e);
      alert('Failed to export Markdown');
    }
    setIsOpen(false);
  };

  const handleExportHTML = () => {
    try {
      const html = exportToHTML(title, outline);
      downloadString(html, 'text/html', `${safeTitle}.html`);
    } catch (e) {
      console.error(e);
      alert('Failed to export HTML');
    }
    setIsOpen(false);
  };

  const handleExportEPUB = async () => {
    try {
      setIsExporting(true);
      const epubBlob = await exportToEPUB(title, outline);
      downloadBlob(epubBlob, `${safeTitle}.epub`);
    } catch (e) {
      console.error(e);
      alert('Failed to export EPUB');
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  if (!canExport) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-sm bg-secondary text-secondary-foreground px-4 py-1.5 rounded-full shadow-sm hover:bg-secondary/80 transition-colors border border-border"
      >
        <Download className="w-4 h-4 mr-2" />
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-1">
            <button
              onClick={handleExportMarkdown}
              className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4 mr-3" />
              Markdown (.md)
            </button>
            <button
              onClick={handleExportHTML}
              className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
            >
              <Globe className="w-4 h-4 mr-3" />
              HTML Page (.html)
            </button>
            <button
              onClick={handleExportEPUB}
              disabled={isExporting}
              className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-primary/10 hover:text-primary rounded-lg transition-colors disabled:opacity-50"
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Book className="w-4 h-4 mr-3" />}
              EPUB eBook (.epub)
            </button>
            <button
              onClick={() => { window.print(); setIsOpen(false); }}
              className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 mr-3" />
              PDF (Print)
            </button>
          </div>
        </div>
      )}

      {/* Click away listener overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
