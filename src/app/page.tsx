import Link from 'next/link';
import { BookOpen, Network, Zap, Download, Sparkles, ChevronRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[20%] bg-blue-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20">
            A
          </div>
          <span className="font-bold text-xl tracking-tight">AI Textbook Gen</span>
        </div>
        <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
        </nav>
        <div className="flex items-center space-x-4">
          <Link href="/editor" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/editor" className="text-sm bg-foreground text-background px-5 py-2 rounded-full font-medium hover:bg-foreground/90 transition-all hover:scale-105 active:scale-95 shadow-md">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-32 pb-20">
        
        <div className="inline-flex items-center space-x-2 bg-secondary/50 border border-border/50 px-3 py-1 rounded-full text-xs font-medium text-primary mb-8 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles className="w-3.5 h-3.5" />
          <span>V2.0 is now live: DeepSeek Pro Integration</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter max-w-4xl leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100 fill-mode-both">
          Generate <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-blue-500">Master-Level</span> Textbooks in Seconds.
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 fill-mode-both">
          Enter any topic, and our AI orchestrates a deeply structured curriculum, complete with interactive mindmaps and production-ready markdown content.
        </p>

        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 fill-mode-both">
          <Link href="/editor" className="w-full sm:w-auto flex items-center justify-center bg-primary text-primary-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary/90 transition-all hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] hover:-translate-y-1">
            Start Generating for Free
            <ChevronRight className="w-5 h-5 ml-2" />
          </Link>
          <a href="#demo" className="w-full sm:w-auto flex items-center justify-center bg-secondary/50 backdrop-blur border border-border/50 text-foreground px-8 py-4 rounded-full font-semibold text-lg hover:bg-secondary transition-all">
            View Live Demo
          </a>
        </div>

        {/* Floating App Preview Mockup */}
        <div className="mt-24 w-full max-w-5xl rounded-2xl border border-white/10 bg-card/40 backdrop-blur-xl p-2 shadow-2xl shadow-primary/10 overflow-hidden animate-in fade-in zoom-in-95 duration-1000 delay-500 fill-mode-both">
          <div className="rounded-xl border border-white/5 bg-background overflow-hidden aspect-video relative flex items-center justify-center">
            {/* Mockup UI Elements */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="relative z-10 flex flex-col items-center opacity-50">
              <BookOpen className="w-16 h-16 text-primary mb-4" />
              <p className="font-medium text-lg">Interactive Workspace Preview</p>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 border-t border-white/5 bg-background/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight">Everything you need to learn anything.</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Our platform abstracts away the complexity of prompt engineering, giving you a beautiful canvas to learn.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <FeatureCard 
              icon={<Network />}
              title="Dynamic Mindmaps"
              desc="Visualize the entire curriculum architecture at a glance using our premium interactive React Flow canvas."
            />
            <FeatureCard 
              icon={<Zap />}
              title="Targeted Generation"
              desc="Don't waste tokens. Selectively generate the exact chapters you want to learn right now with zero waiting."
            />
            <FeatureCard 
              icon={<Download />}
              title="Multi-Format Export"
              desc="Take your knowledge offline. Export instantly to pristine Markdown, fully styled HTML, or standard EPUB 3."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 text-center text-muted-foreground">
        <p className="text-sm">© 2026 AI Textbook Gen. All rights reserved. Designed with precision.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="group p-8 rounded-3xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-all hover:shadow-xl hover:-translate-y-1">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {desc}
      </p>
    </div>
  );
}
