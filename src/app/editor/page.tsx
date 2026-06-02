"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { NlpWizard } from "@/components/wizard/NlpWizard";

export default function NewProjectPage() {
  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {/* Ambient Background for premium feel */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="glassmorphism p-10 rounded-3xl premium-shadow max-w-2xl w-full text-center relative z-10 border border-white/10 dark:border-white/5">
          <h2 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary via-blue-500 to-purple-600">
            Start Your Learning Journey
          </h2>
          <p className="text-muted-foreground mb-10 text-lg">
            Enter a topic, and we'll generate a complete, structured textbook for you.
          </p>
          <NlpWizard />
        </div>
      </div>
    </AppLayout>
  );
}
