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

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-Key': inputKey.trim() || '',
          'X-Base-URL': inputUrl.trim(),
          'X-Model-Name': inputModel.trim(),
        },
        body: JSON.stringify({ type: 'test_connection' }),
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(text.substring(0, 150) || response.statusText);
      }

      if (response.ok && data.success) {
        setTestResult({ success: true, message: `Connected! AI replied: "${data.text}"` });
      } else {
        setTestResult({ success: false, message: data.error || 'Connection failed' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection error' });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center text-zinc-900 dark:text-zinc-100">
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
              className="w-full pl-3 pr-8 py-1.5 text-sm bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-500/50"
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
            className="w-full px-3 py-1.5 text-sm bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-500/50"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Model Name</label>
          <input 
            type="text"
            value={inputModel}
            onChange={(e) => setInputModel(e.target.value)}
            placeholder="gpt-4o"
            className="w-full px-3 py-1.5 text-sm bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-500/50"
          />
        </div>

        {testResult && (
          <div className={`p-2.5 rounded-lg text-xs border ${
            testResult.success 
              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          }`}>
            {testResult.message}
          </div>
        )}

        <div className="flex justify-between items-center pt-2 space-x-2">
          {apiKey ? (
            <button 
              onClick={handleClear}
              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center shrink-0"
              title="Clear Config"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : <div />}
          
          <div className="flex items-center space-x-2 flex-1 justify-end">
            <button 
              onClick={handleTestConnection}
              disabled={isTesting || !inputKey.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 transition-colors"
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>

            <button 
              onClick={handleSave}
              className="px-3 py-1.5 text-xs font-medium bg-zinc-900 dark:bg-zinc-100 text-background rounded-lg hover:opacity-90 transition-all flex items-center"
            >
              {isSaved ? 'Saved!' : (
                <>
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
