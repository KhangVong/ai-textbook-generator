import Link from 'next/link';
import { SignInButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { BookOpen, Network, Zap, Download, Sparkles, ChevronRight, BookOpenText, ArrowUpRight } from 'lucide-react';

export default async function LandingPage() {
  const { userId } = await auth();
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-accent/20">
      
      {/* Background Accent Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-40">
        <div className="absolute top-0 left-1/4 w-[1px] h-full bg-border/40" />
        <div className="absolute top-0 left-3/4 w-[1px] h-full bg-border/40" />
        <div className="absolute top-1/3 left-0 w-full h-[1px] bg-border/40" />
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-8 h-24 flex items-center justify-between border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-serif text-xl font-medium tracking-tighter">
            æ
          </div>
          <span className="font-semibold text-lg tracking-tight font-sans">AnyKnowledge</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-12 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Philosophy</a>
          <a href="#workflow" className="hover:text-foreground transition-colors">Workflow</a>
          <a href="https://github.com/github/spec-kit" target="_blank" className="hover:text-foreground transition-colors flex items-center">
            Spec Kit <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </a>
        </nav>

        <div className="flex items-center space-x-4">
          {!userId ? (
            <>
              <SignInButton mode="modal" fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard">
                <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
                  Sign In
                </button>
              </SignInButton>
              <SignInButton mode="modal" fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard">
                <button className="text-sm bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium hover:opacity-95 transition-all shadow-sm">
                  Get Started
                </button>
              </SignInButton>
            </>
          ) : (
            <Link href="/dashboard" className="text-sm bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium hover:opacity-95 transition-all shadow-sm">
              Go to Dashboard
            </Link>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-8 pt-32 pb-24 max-w-5xl mx-auto">
        
        <div className="inline-flex items-center space-x-2 border border-border px-3.5 py-1 rounded-full text-xs font-medium tracking-tight mb-8 bg-card/60 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-muted-foreground">V2.1 Integration</span>
          <span className="text-border">|</span>
          <span className="text-foreground">Fact-Checking Search Engine Active</span>
        </div>

        <h1 className="text-6xl md:text-8xl tracking-tight max-w-4xl leading-[1.05] mb-8 font-serif font-light text-balance">
          Textbooks generated with <span className="italic font-normal">absolute clarity</span>.
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed font-light">
          Enter any topic. Our multi-agent engine profiles your target audience, structures a rigorous curriculum, fact-checks examples, and outputs interactive textbooks.
        </p>

        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 mb-28">
          {!userId ? (
            <SignInButton mode="modal" fallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard">
              <button className="w-full sm:w-auto flex items-center justify-center bg-primary text-primary-foreground px-8 py-3.5 rounded-md font-medium text-base hover:opacity-95 transition-all">
                Start Generating
                <ChevronRight className="w-4 h-4 ml-1.5" />
              </button>
            </SignInButton>
          ) : (
            <Link href="/dashboard" className="w-full sm:w-auto flex items-center justify-center bg-primary text-primary-foreground px-8 py-3.5 rounded-md font-medium text-base hover:opacity-95 transition-all">
              Go to Dashboard
              <ChevronRight className="w-4 h-4 ml-1.5" />
            </Link>
          )}
          <a href="#features" className="w-full sm:w-auto flex items-center justify-center bg-card border border-border text-foreground px-8 py-3.5 rounded-md font-medium text-base hover:bg-secondary/20 transition-all">
            Learn More
          </a>
        </div>
      </main>

      {/* Philosophy / Cardless Features Section */}
      <section id="features" className="relative z-10 py-32 border-t border-border bg-card/20">
        <div className="container mx-auto px-8 max-w-6xl">
          <div className="grid md:grid-cols-3 gap-16">
            
            {/* Column 1 */}
            <div className="flex flex-col space-y-6">
              <div className="flex items-center space-x-3 text-accent">
                <Network className="w-5 h-5" />
                <h3 className="text-xs font-semibold uppercase tracking-wider font-sans">01. CURRICULUM ARCHITECTURE</h3>
              </div>
              <h4 className="text-2xl font-serif">Dynamic Mindmaps</h4>
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                Visualize the complete semantic layout of your course. Explore dependencies and adjust modules using our high-performance React Flow canvas.
              </p>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col space-y-6 md:border-l md:border-border md:pl-16">
              <div className="flex items-center space-x-3 text-accent">
                <Zap className="w-5 h-5" />
                <h3 className="text-xs font-semibold uppercase tracking-wider font-sans">02. COMPOSITION</h3>
              </div>
              <h4 className="text-2xl font-serif">Targeted Generation</h4>
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                Generate the exact sections you need on demand. Skip broad drafts and focus details where learning occurs, optimizing API token usage.
              </p>
            </div>

            {/* Column 3 */}
            <div className="flex flex-col space-y-6 md:border-l md:border-border md:pl-16">
              <div className="flex items-center space-x-3 text-accent">
                <Download className="w-5 h-5" />
                <h3 className="text-xs font-semibold uppercase tracking-wider font-sans">03. DISTRIBUTION</h3>
              </div>
              <h4 className="text-2xl font-serif">Clean Exporting</h4>
              <p className="text-muted-foreground text-sm leading-relaxed font-light">
                Take your library anywhere. Export seamlessly to beautifully formatted Markdown, standards-compliant HTML, or clean EPUB files.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-16 text-center text-muted-foreground bg-background">
        <p className="text-xs tracking-wider">© 2026 ANYKNOWLEDGE. DESIGNED WITH SYSTEMATIC RESTRAINT.</p>
      </footer>
    </div>
  );
}
