'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Features', href: '#features' },
  { label: 'Showcase', href: '#showcase' },
  { label: 'Docs', href: '#docs' },
  { label: 'Blog', href: '#blog' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle scroll effect for transparency
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b',
        scrolled
          ? 'glass'
          : 'bg-transparent border-transparent'
      )}
    >
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 z-50">
          <div className="glass-button p-1.5 rounded-lg flex items-center justify-center">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AGDI</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center space-x-4">
          <Link href="/dashboard" className="text-sm font-medium hover:text-cyan-400 transition-colors">
            Dashboard
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="glass-button">Connect Agent</Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden z-50 p-2 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-0 w-full bg-background border-b border-border shadow-lg md:hidden flex flex-col p-4 gap-4"
          >
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-lg font-medium py-2 border-b border-border/50 last:border-0"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex flex-col gap-3 mt-4">
              <Button variant="outline" className="w-full">Log in</Button>
              <Button className="w-full">Get Started</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}