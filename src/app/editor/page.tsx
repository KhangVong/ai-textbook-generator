"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { NlpWizard } from "@/components/wizard/NlpWizard";
import { motion } from "framer-motion";

export default function NewProjectPage() {
  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center relative bg-zinc-50/50">
        
        {/* Subtle Background Pattern / Gradient */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-blue-100 blur-[100px] rounded-full opacity-60" />
          <div className="absolute top-[20%] right-[0%] w-[30%] h-[30%] bg-purple-100 blur-[100px] rounded-full opacity-50" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 w-full max-w-2xl px-4"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold mb-3 text-zinc-900 tracking-tight">
              Create a new textbook
            </h2>
            <p className="text-zinc-500 text-base max-w-md mx-auto">
              Enter a topic, and our multi-agent system will generate a structured, comprehensive learning module.
            </p>
          </div>
          
          <NlpWizard />
        </motion.div>
        
      </div>
    </AppLayout>
  );
}
