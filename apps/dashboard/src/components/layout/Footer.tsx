import React from 'react';
import Link from 'next/link';
import { Rocket, Twitter, Github, Linkedin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="bg-primary text-primary-foreground p-1 rounded-lg">
                <Rocket className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl">AGDI</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The extensible and open-source platform for orchestrating autonomous AI agents and intelligent systems.
            </p>
          </div>

          {/* Links Columns */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 col-span-1 md:col-span-3">
            <div>
              <h3 className="font-semibold mb-4">Project</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="https://github.com/agdi/agdi" className="hover:text-foreground transition-colors">GitHub Repository</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Architecture</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="https://docs.agdi.ai" className="hover:text-foreground transition-colors">Documentation</Link></li>
                <li><Link href="https://docs.agdi.ai/configuration" className="hover:text-foreground transition-colors">Configuration</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Community Discord</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">
            © {currentYear} AGDI Open Source Project. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Twitter className="w-5 h-5" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Github className="w-5 h-5" />
              <span className="sr-only">GitHub</span>
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              <Linkedin className="w-5 h-5" />
              <span className="sr-only">LinkedIn</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}