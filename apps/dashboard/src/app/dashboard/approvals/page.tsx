"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, AlertTriangle, ArrowRight, FileDiff, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { agdi } from '@/lib/agdi-client';

interface ApprovalRequest {
  id: string;
  agentName: string;
  riskLevel: 'high' | 'medium' | 'critical';
  task: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  details?: {
    diff?: string;
    cost?: string;
    impact?: string;
  };
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);

  const fetchApprovals = async () => {
    try {
      const res = await agdi.call("exec.approvals.get");
      if (res && res.approvals) {
        const mapped: ApprovalRequest[] = res.approvals.map((a: any) => ({
          id: a.id,
          agentName: a.agentId || 'Unknown Agent',
          riskLevel: a.risk || 'medium',
          task: a.action || 'Execute Action',
          description: a.summary || JSON.stringify(a.context),
          timestamp: new Date(a.requestedAt || Date.now()).toLocaleString(),
          status: a.status || 'pending',
          details: {
            diff: a.diff,
            impact: a.impact
          }
        }));
        setRequests(mapped);
      } else {
        setRequests([]);
      }
    } catch(e) {
      console.warn("exec.approvals.get error:", e);
      setRequests([]);
    }
  };

  useEffect(() => {
    fetchApprovals();
    const intv = setInterval(fetchApprovals, 5000);
    return () => clearInterval(intv);
  }, []);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    const isApproved = action === 'approved';
    try {
      await agdi.call("exec.approval.resolve", { 
        id, 
        approved: isApproved, 
        comment: `User ${action} via Dashboard` 
      });
      if (isApproved) toast.success(`Action Approved: Agent has resumed execution.`);
      else toast.error(`Action Rejected: Agent task aborted.`);
      fetchApprovals();
    } catch(e: any) {
      toast.error(`Error resolving approval: ${e.message || String(e)}`);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'high': return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
      case 'medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      default: return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-cyan-400" /> 
            Human-in-the-Loop <span className="font-normal text-xl text-gray-400">Approvals</span>
            {pendingCount > 0 && (
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-xs text-white font-bold animate-pulse">
                {pendingCount}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and authorize high-risk actions requested by autonomous agents.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-6">
        {requests.map(req => (
          <div key={req.id} className={`glass-panel p-6 rounded-xl border transition-all ${req.status === 'pending' ? 'border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]' : 'border-white/5 opacity-60'}`}>
             
             {/* Card Header */}
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                   <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getRiskColor(req.riskLevel)}`}>
                     {req.riskLevel} Risk
                   </div>
                   <h3 className="text-lg font-bold text-white leading-none">{req.task}</h3>
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  {req.timestamp}
                </div>
             </div>

             {/* Content */}
             <div className="mb-4">
               <div className="text-sm text-cyan-400 font-medium mb-1">Requested by: {req.agentName}</div>
               <p className="text-gray-300 text-sm">{req.description}</p>
             </div>

             {/* Expandable Details for Pending items */}
             {req.status === 'pending' && req.details && (
               <div className="bg-black/40 rounded-lg p-4 mb-6 border border-white/5">
                 <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                   <AlertTriangle className="w-3.5 h-3.5" /> Context Details
                 </h4>
                 
                 {req.details.cost && (
                   <div className="flex items-start gap-2 mb-2 text-sm">
                     <span className="text-gray-400 w-16">Budget:</span>
                     <span className="text-white font-mono">{req.details.cost}</span>
                   </div>
                 )}
                 
                 {req.details.impact && (
                   <div className="flex items-start gap-2 mb-2 text-sm">
                     <span className="text-gray-400 w-16">Impact:</span>
                     <span className="text-white">{req.details.impact}</span>
                   </div>
                 )}

                 {req.details.diff && (
                   <div className="mt-4">
                     <div className="text-xs text-gray-400 mb-2 flex items-center gap-2">
                       <FileDiff className="w-3.5 h-3.5" /> Proposed Code Changes
                     </div>
                     <pre className="bg-[#0d1117] p-3 rounded-md text-xs font-mono border border-white/10 overflow-x-auto">
                       <code className="text-green-400">{req.details.diff.split('\n')[0]}</code>
                       <br />
                       <code className="text-red-400">{req.details.diff.split('\n')[1]}</code>
                     </pre>
                   </div>
                 )}
               </div>
             )}

             {/* Actions Footer */}
             {req.status === 'pending' ? (
               <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <button 
                    onClick={() => handleAction(req.id, 'approved')}
                    className="flex flex-1 items-center justify-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Check className="w-4 h-4" /> Authorize & Execute
                  </button>
                  <button 
                    onClick={() => handleAction(req.id, 'rejected')}
                    className="flex flex-1 items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <X className="w-4 h-4" /> Reject Task
                  </button>
                  <button className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 text-sm font-medium transition-colors">
                    Modify Request
                  </button>
               </div>
             ) : (
               <div className="pt-4 border-t border-white/5 flex items-center gap-2">
                  {req.status === 'approved' ? (
                    <span className="text-emerald-500 text-sm font-medium flex items-center gap-1"><Check className="w-4 h-4" /> Request Approved</span>
                  ) : (
                    <span className="text-red-500 text-sm font-medium flex items-center gap-1"><X className="w-4 h-4" /> Request Rejected</span>
                  )}
               </div>
             )}

          </div>
        ))}

        {requests.length === 0 && (
          <div className="glass-panel p-12 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center">
            <ShieldCheck className="w-16 h-16 text-cyan-500/20 mb-4" />
            <h3 className="text-lg font-medium text-white">All Clear</h3>
            <p className="text-muted-foreground mt-1">There are no pending actions requiring human approval.</p>
          </div>
        )}
      </div>

    </div>
  );
}
