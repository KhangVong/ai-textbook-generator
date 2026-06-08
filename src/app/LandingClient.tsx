"use client";

import React from 'react';
import Link from 'next/link';
import { SignInButton } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { BookOpen, Network, Zap, Download, ChevronRight, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export const LandingClient = ({ userId }: { userId: string | null }) => {
  return (
    <div className="min-h-screen bg-white text-zinc-950 font-sans antialiased selection:bg-blue-500/20">
      
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100 blur-[120px] rounded-full opacity-60" />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-100 blur-[120px] rounded-full opacity-60" />
      </div>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/70 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-950 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              K
            </div>
            <span className="font-bold text-lg tracking-tight">AnyKnowledge</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-zinc-600">
            <a href="#features" className="hover:text-zinc-950 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-zinc-950 transition-colors">Workflow</a>
            <a href="#" className="hover:text-zinc-950 transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center space-x-4">
            {!userId ? (
              <>
                <SignInButton mode="modal" fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard">
                  <button className="text-sm font-medium text-zinc-600 hover:text-zinc-950 transition-colors">
                    Log in
                  </button>
                </SignInButton>
                <SignInButton mode="modal" fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard">
                  <button className="text-sm bg-zinc-950 text-white px-5 py-2 rounded-full font-medium hover:bg-zinc-800 transition-all shadow-sm">
                    Get Started
                  </button>
                </SignInButton>
              </>
            ) : (
              <Link href="/dashboard" className="text-sm bg-zinc-950 text-white px-5 py-2 rounded-full font-medium hover:bg-zinc-800 transition-all shadow-sm">
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-40 pb-20 max-w-5xl mx-auto">
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center space-x-2 border border-zinc-200/60 px-4 py-1.5 rounded-full text-xs font-semibold tracking-tight mb-8 bg-white/60 backdrop-blur-md shadow-sm"
        >
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-blue-600">New in V2.1</span>
          <span className="text-zinc-300">|</span>
          <span className="text-zinc-700">Multi-Agent Fact-Checking Engine Active</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6 text-zinc-950 text-balance"
        >
          Generate rigorous textbooks in <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">seconds.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-zinc-600 max-w-2xl mb-10 leading-relaxed font-medium"
        >
          AnyKnowledge orchestrates multiple AI agents to research, structure, and write comprehensive learning materials on any topic you choose.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-20 w-full justify-center"
        >
          {!userId ? (
            <SignInButton mode="modal" fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard">
              <button className="w-full sm:w-auto flex items-center justify-center bg-zinc-950 text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-zinc-800 transition-all shadow-lg hover:shadow-xl shadow-zinc-950/20 hover:-translate-y-0.5 duration-200">
                Start Generating for Free
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </button>
            </SignInButton>
          ) : (
            <Link href="/dashboard" className="w-full sm:w-auto flex items-center justify-center bg-blue-600 text-white px-8 py-3.5 rounded-full font-semibold text-base hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl shadow-blue-600/20 hover:-translate-y-0.5 duration-200">
              Open Dashboard
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Link>
          )}
        </motion.div>

        {/* Dashboard Mockup Visual */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="w-full max-w-5xl rounded-2xl overflow-hidden border border-zinc-200/50 shadow-2xl shadow-zinc-900/10 bg-white"
        >
          {/* Mockup Header */}
          <div className="h-12 bg-zinc-50 border-b border-zinc-200 flex items-center px-4 space-x-2">
            <div className="flex space-x-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="mx-auto bg-white border border-zinc-200 rounded-md px-32 py-1 text-xs text-zinc-400 font-medium">
              anyknowledge.com
            </div>
          </div>
          {/* Mockup Content */}
          <div className="aspect-[16/9] bg-zinc-50/50 relative overflow-hidden flex">
             {/* Fake Sidebar */}
             <div className="w-48 bg-white border-r border-zinc-100 flex flex-col p-4 space-y-2">
               <div className="h-4 w-24 bg-zinc-200 rounded animate-pulse" />
               <div className="h-4 w-16 bg-zinc-200 rounded animate-pulse opacity-70 mt-6" />
               <div className="h-4 w-20 bg-blue-100 rounded" />
               <div className="h-4 w-12 bg-zinc-100 rounded" />
             </div>
             {/* Fake Content */}
             <div className="flex-1 p-8 flex flex-col space-y-4">
               <div className="h-8 w-64 bg-zinc-200 rounded-md animate-pulse mb-4" />
               <div className="flex space-x-4">
                 <div className="flex-1 h-32 bg-white border border-zinc-100 rounded-xl shadow-sm p-4 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-full bg-blue-100" />
                    <div className="h-3 w-20 bg-zinc-200 rounded" />
                 </div>
                 <div className="flex-1 h-32 bg-white border border-zinc-100 rounded-xl shadow-sm p-4 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-full bg-purple-100" />
                    <div className="h-3 w-20 bg-zinc-200 rounded" />
                 </div>
                 <div className="flex-1 h-32 bg-white border border-zinc-100 rounded-xl shadow-sm p-4 flex flex-col justify-between">
                    <div className="w-8 h-8 rounded-full bg-emerald-100" />
                    <div className="h-3 w-20 bg-zinc-200 rounded" />
                 </div>
               </div>
             </div>
          </div>
        </motion.div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 bg-zinc-50 border-t border-zinc-200/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-950 mb-4">Everything you need to learn.</h2>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">Our multi-agent architecture ensures your content is structured logically, fact-checked thoroughly, and presented beautifully.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                <Network className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold mb-3">Curriculum Architecture</h4>
              <p className="text-zinc-600 font-medium leading-relaxed">
                Visualize the complete semantic layout of your course. Explore dependencies and adjust modules using our high-performance React Flow canvas.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold mb-3">Targeted Generation</h4>
              <p className="text-zinc-600 font-medium leading-relaxed">
                Generate the exact sections you need on demand. Skip broad drafts and focus details where learning occurs, optimizing API token usage.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                <Download className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold mb-3">Clean Exporting</h4>
              <p className="text-zinc-600 font-medium leading-relaxed">
                Take your library anywhere. Export seamlessly to beautifully formatted Markdown, standards-compliant HTML, or clean EPUB files.
              </p>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm font-medium text-zinc-500">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-6 h-6 rounded-md bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
              K
            </div>
            <span className="text-zinc-950 font-bold">AnyKnowledge</span>
            <span>© 2026</span>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-zinc-950 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-950 transition-colors">Terms of Service</a>
            <a href="https://github.com/KhangVong/ai-textbook-generator" target="_blank" className="hover:text-zinc-950 transition-colors flex items-center">
              GitHub <ArrowUpRight className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
