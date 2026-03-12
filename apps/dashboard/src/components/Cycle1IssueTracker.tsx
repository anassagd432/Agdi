'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertCircle, 
  CheckCircle2, 
  Terminal, 
  FileCode, 
  X, 
  ArrowRight, 
  Bug,
  RefreshCw
} from 'lucide-react';

// --- Types ---

type Severity = 'critical' | 'warning' | 'info';
type Status = 'pending' | 'fixing' | 'resolved';

interface Issue {
  id: string;
  title: string;
  description: string;
  file: string;
  line: number;
  severity: Severity;
  status: Status;
}

// --- Mock Data ---

const INITIAL_ISSUES: Issue[] = [
  {
    id: 'ERR-001',
    title: 'Hydration Mismatch',
    description: 'Text content does not match server-rendered HTML.',
    file: 'src/app/layout.tsx',
    line: 42,
    severity: 'critical',
    status: 'pending',
  },
  {
    id: 'ERR-002',
    title: 'Missing Key Prop',
    description: 'Each child in a list should have a unique "key" prop.',
    file: 'src/components/UserList.tsx',
    line: 15,
    severity: 'warning',
    status: 'pending',
  },
  {
    id: 'ERR-003',
    title: 'Any Type Usage',
    description: 'Avoid using "any". Define a strict interface instead.',
    file: 'src/utils/helpers.ts',
    line: 8,
    severity: 'info',
    status: 'pending',
  },
  {
    id: 'ERR-004',
    title: 'Unused Import',
    description: "'useEffect' is defined but never used.",
    file: 'src/components/Header.tsx',
    line: 2,
    severity: 'warning',
    status: 'pending',
  },
];

// --- Sub-components ---

const Badge = ({ severity }: { severity: Severity }) => {
  const styles = {
    critical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
    warning: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    info: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[severity]}`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
};

// --- Main Component ---

export default function Cycle1IssueTracker() {
  const [issues, setIssues] = useState<Issue[]>(INITIAL_ISSUES);
  
  const pendingCount = issues.filter(i => i.status !== 'resolved').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const totalCount = issues.length;
  const progress = totalCount === 0 ? 100 : (resolvedCount / totalCount) * 100;

  const handleFix = (id: string) => {
    // Set status to fixing (loading state)
    setIssues(prev => prev.map(issue => 
      issue.id === id ? { ...issue, status: 'fixing' } : issue
    ));

    // Simulate async fix operation
    setTimeout(() => {
      setIssues(prev => prev.map(issue => 
        issue.id === id ? { ...issue, status: 'resolved' } : issue
      ));
    }, 1500);
  };

  const handleReset = () => {
    setIssues(INITIAL_ISSUES);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 font-sans text-slate-900 dark:text-slate-50">
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-500" />
              Cycle 1 Issues
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Review and resolve critical frontend anomalies.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums">
              {resolvedCount}<span className="text-slate-400 text-lg">/{totalCount}</span>
            </div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Fixed</div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
          <motion.div 
            className="h-full bg-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "circOut" }}
          />
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {pendingCount === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold">All Systems Operational</h3>
              <p className="text-slate-500 max-w-xs mx-auto mt-2 mb-6">
                Cycle 1 issues have been successfully resolved. Ready for deployment.
              </p>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
                Reset Simulation
              </button>
            </motion.div>
          ) : (
            issues
              .filter(issue => issue.status !== 'resolved')
              .map((issue) => (
              <motion.div
                layout
                key={issue.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="group relative bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {/* Icon Area */}
                  <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    issue.severity === 'critical' ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-500'
                  } dark:bg-slate-800/50`}>
                    <Bug className="w-5 h-5" />
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {issue.title}
                        </span>
                        <Badge severity={issue.severity} />
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{issue.id}</span>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {issue.description}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded px-2 py-1.5 w-fit font-mono">
                      <FileCode className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px]">{issue.file}</span>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <span>Ln {issue.line}</span>
                    </div>
                  </div>

                  {/* Action Area */}
                  <div className="flex items-center self-center pl-2">
                    <button
                      onClick={() => handleFix(issue.id)}
                      disabled={issue.status === 'fixing'}
                      className={`
                        relative overflow-hidden flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                        ${issue.status === 'fixing' 
                          ? 'bg-slate-100 text-slate-400 cursor-wait dark:bg-slate-800' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/20'
                        }
                      `}
                      aria-label={`Fix issue ${issue.id}`}
                    >
                      {issue.status === 'fixing' ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Fixing...</span>
                        </>
                      ) : (
                        <>
                          <span>Fix</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}