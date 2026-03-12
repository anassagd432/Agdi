import React from "react";
import type { Metadata } from "next";
import { Server, Database, Shield, Globe, Clock, CheckCircle2 } from "lucide-react";
import StatusIndicator, { StatusType } from "@/components/status/StatusIndicator";
import ApiLatencyChart from "@/components/status/ApiLatencyChart";

// Metadata for SEO
export const metadata: Metadata = {
  title: "System Status | OmniPlatform",
  description: "Real-time system performance monitoring and uptime status.",
};

// --- Mock Data ---
interface Service {
  id: string;
  name: string;
  status: StatusType;
  uptime: string;
  icon: React.ReactNode;
}

const services: Service[] = [
  { id: "api", name: "Main API", status: "operational", uptime: "99.99%", icon: <Server className="w-4 h-4" /> },
  { id: "db", name: "Primary Database", status: "operational", uptime: "99.95%", icon: <Database className="w-4 h-4" /> },
  { id: "auth", name: "Authentication", status: "operational", uptime: "100%", icon: <Shield className="w-4 h-4" /> },
  { id: "cdn", name: "Global CDN", status: "degraded", uptime: "98.50%", icon: <Globe className="w-4 h-4" /> },
];

// --- Components ---

function SystemHeader() {
  return (
    <div className="mb-12 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>All Systems Normal</span>
        </div>
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-500">
        System Status
      </h1>
      <p className="text-slate-400 max-w-lg mx-auto">
        Live tracking of our API services, database connectivity, and global latency metrics.
      </p>
    </div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50 p-6 transition-all duration-300 hover:border-slate-700 hover:shadow-xl hover:shadow-slate-900/20">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      
      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-300 group-hover:text-white transition-colors">
            {service.icon}
          </div>
          <h3 className="font-semibold text-slate-200">{service.name}</h3>
        </div>
        <StatusIndicator status={service.status} showLabel={false} />
      </div>
      
      <div className="relative flex items-center justify-between border-t border-slate-800/50 pt-4">
        <span className="text-sm text-slate-500">Uptime (90d)</span>
        <span className="font-mono text-sm font-medium text-slate-300">{service.uptime}</span>
      </div>
    </div>
  );
}

function IncidentHistory() {
  return (
    <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950/30 p-6 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400" />
        Past Incidents
      </h3>
      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
        {/* Incident Item 1 */}
        <div className="relative flex items-start group">
          <div className="absolute left-0 ml-1 h-3 w-3 rounded-full border-2 border-slate-900 bg-emerald-500 mt-1.5" />
          <div className="ml-8 w-full">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
                <h4 className="text-sm font-medium text-slate-300">CDN Performance Restored</h4>
                <time className="text-xs text-slate-500">Oct 24, 14:30 UTC</time>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              We have mitigated the traffic spike affecting our Asian edge nodes. Latency has returned to normal levels.
            </p>
          </div>
        </div>

        {/* Incident Item 2 */}
        <div className="relative flex items-start group">
          <div className="absolute left-0 ml-1 h-3 w-3 rounded-full border-2 border-slate-900 bg-amber-500 mt-1.5" />
          <div className="ml-8 w-full">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
                <h4 className="text-sm font-medium text-slate-300">High Latency in EU-West</h4>
                <time className="text-xs text-slate-500">Oct 24, 13:15 UTC</time>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
               Investigating increased error rates on the image optimization API.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatusPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 selection:bg-emerald-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <SystemHeader />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Left Column: Services Grid */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.map((service) => (
                        <ServiceCard key={service.id} service={service} />
                    ))}
                </div>
                
                {/* Status Summary Box */}
                <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Overall Health</h3>
                    <div className="space-y-3">
                         <div className="flex justify-between text-sm">
                            <span className="text-slate-400">API Success Rate</span>
                            <span className="text-emerald-400 font-mono">99.98%</span>
                         </div>
                         <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div className="bg-emerald-500 h-1.5 rounded-full w-[99.98%]" />
                         </div>
                         <div className="flex justify-between text-sm mt-4">
                            <span className="text-slate-400">Avg Response Time</span>
                            <span className="text-blue-400 font-mono">45ms</span>
                         </div>
                         <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div className="bg-blue-500 h-1.5 rounded-full w-[80%]" />
                         </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Chart */}
            <div className="h-[300px] md:h-auto min-h-[300px]">
                <ApiLatencyChart />
            </div>
        </div>

        <IncidentHistory />
        
      </div>
    </main>
  );
}