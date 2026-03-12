import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Hero from '@/components/home/Hero';
import Footer from '@/components/layout/Footer';
import { Brain, Activity, Laptop, Database, MessageSquare, Code } from 'lucide-react';

export const metadata: Metadata = {
  title: 'AGDI Dashboard',
  description: 'AI Command Center',
  openGraph: {
    title: 'AGDI Dashboard',
    description: 'Control your autonomous agents seamlessly.',
    type: 'website',
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />
      
      <main className="flex-grow flex flex-col">
        {/* Hero Section */}
        <Hero />
        
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-950/10 to-transparent pointer-events-none" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                Core Capabilities
              </h2>
              <p className="text-muted-foreground text-lg">
                AGDI provides the foundational infrastructure required to build, monitor, and scale production-ready AI agents.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <Brain className="w-5 h-5 text-cyan-400" />,
                  title: "Local Agent Orchestration",
                  desc: "Deploy and monitor task-specific autonomous sub-agents with parallel execution capabilities.",
                },
                {
                  icon: <Activity className="w-5 h-5 text-blue-400" />,
                  title: "Real-time Telemetry",
                  desc: "Live system metrics, token usage visualization, and streaming task queues in a unified dashboard.",
                },
                {
                  icon: <Laptop className="w-5 h-5 text-purple-400" />,
                  title: "Device Control via MCP",
                  desc: "Seamlessly interface with the host machine through Model Context Protocol (MCP) endpoints.",
                },
                {
                  icon: <Database className="w-5 h-5 text-pink-400" />,
                  title: "Integrated Vector Memory",
                  desc: "Persistent memory stores for agents to learn, adapt, and recall prior context across system reboots.",
                },
                {
                  icon: <MessageSquare className="w-5 h-5 text-green-400" />,
                  title: "Multi-Channel Messaging",
                  desc: "First-class integrations for Discord, Slack, Telegram, and SMS via comprehensive API routes.",
                },
                {
                  icon: <Code className="w-5 h-5 text-yellow-400" />,
                  title: "Open-Source Extensibility",
                  desc: "A fully modular plugin architecture allowing seamless integration of new AI tools and commands.",
                }
              ].map((feature, i) => (
                <div key={i} className="glass-panel p-8 flex flex-col hover:-translate-y-1 hover:border-cyan-500/50 transition-all duration-300 group">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="font-semibold text-xl mb-3 text-foreground/90">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}