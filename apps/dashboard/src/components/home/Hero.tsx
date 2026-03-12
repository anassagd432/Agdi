'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Github, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/20 blur-[100px] rounded-full opacity-50 pointer-events-none" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full opacity-30 pointer-events-none" />
      </div>

      <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto flex flex-col items-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass text-primary">
              <Zap className="w-3 h-3" />
              <span>AGDI Runtime Active</span>
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent"
          >
            The Extensible <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-primary bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              AI Agent Framework.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed"
          >
            Build, manage, and orchestrate autonomous AI agents locally. Connect specialized subsystems for coding, web automation, and computer use with zero friction.
          </motion.p>

          {/* Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center"
          >
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto glass-button gap-2 h-12 text-base px-8">
                Open Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="https://github.com/agdi/agdi" target="_blank" rel="noreferrer" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto glass gap-2 h-12 text-base px-8 hover:bg-white/5">
                <Github className="w-4 h-4" />
                View Source
              </Button>
            </Link>
          </motion.div>

          {/* Tech Stack Preview */}
          <motion.div
            variants={itemVariants}
            className="mt-16 pt-8 border-t border-border/40 w-full"
          >
            <p className="text-sm text-muted-foreground mb-4">BUILT FOR MODERN AI ENGINEERING</p>
            <div className="flex flex-wrap justify-center gap-8 opacity-70 transition-all duration-500">
               <span className="font-semibold text-xl text-cyan-400">Local Gateway</span>
               <span className="font-semibold text-xl text-blue-400">Real-time Telemetry</span>
               <span className="font-semibold text-xl text-purple-400">Extensible Tools</span>
               <span className="font-semibold text-xl text-pink-400">Sub-Agents</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}