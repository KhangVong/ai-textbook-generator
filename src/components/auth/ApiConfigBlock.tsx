"use client";

import React, { useState, useEffect } from 'react';
import { useTextbookStore } from '@/store/useTextbookStore';
import { saveConfig, loadConfig, clearConfig } from '@/utils/storage';
import { Settings2, Eye, EyeOff, Save, Trash2 } from 'lucide-react';

export const ApiConfigBlock = () => {
  const { apiKey, setApiKey, baseURL, setBaseURL, modelName, setModelName } = useTextbookStore();
  
  const [inputKey, setInputKey] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [inputModel, setInputModel] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const config = loadConfig();
    if (config.key) setApiKey(config.key);
    if (config.url) setBaseURL(config.url);
    if (config.model) setModelName(config.model);
  }, [setApiKey, setBaseURL, setModelName]);

  // Sync state to inputs
  useEffect(() => {
    setInputKey(apiKey || '');
    setInputUrl(baseURL);
    setInputModel(modelName);
  }, [apiKey, baseURL, modelName]);

  const handleSave = () => {
    saveConfig(inputKey.trim(), inputUrl.trim(), inputModel.trim());
    setApiKey(inputKey.trim() || null);
    setBaseURL(inputUrl.trim());
    setModelName(inputModel.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClear = () => {
    clearConfig();
    setApiKey(null);
    setInputKey('');
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center text-primary">
          <Settings2 className="w-4 h-4 mr-2" />
          AI Provider
        </h3>
        {apiKey && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
            Active
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">API Key (OpenAI / DeepSeek)</label>
          <div className="relative">
            <input 
              type={showKey ? "text" : "password"}
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder={apiKey ? '••••••••••••••••' : 'sk-...'}
              className="w-full pl-3 pr-8 py-1.5 text-sm bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
            >
              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Base URL</label>
          <input 
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full px-3 py-1.5 text-sm bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Model Name</label>
          <input 
            type="text"
            value={inputModel}
            onChange={(e) => setInputModel(e.target.value)}
            placeholder="gpt-4o"
            className="w-full px-3 py-1.5 text-sm bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>

        <div className="flex justify-between items-center pt-2">
          {apiKey ? (
            <button 
              onClick={handleClear}
              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center"
              title="Clear Config"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : <div />}
          
          <button 
            onClick={handleSave}
            className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center"
          >
            {isSaved ? 'Saved!' : (
              <>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save & Connect
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
