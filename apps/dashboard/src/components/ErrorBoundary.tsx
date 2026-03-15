"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Bug, ChevronDown } from "lucide-react";

interface Props { children: ReactNode; fallbackMessage?: string; }
interface State { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null; showDetails: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[300px] p-6">
          <div className="max-w-md w-full glass-panel p-8 border border-red-500/20 rounded-2xl text-center space-y-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
            <p className="text-sm text-gray-400">
              {this.props.fallbackMessage || "An unexpected error occurred. Try refreshing the page."}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button onClick={() => window.location.reload()}
                className="px-4 py-2 bg-cyan-500 text-black rounded-lg text-sm font-semibold flex items-center gap-2 hover:bg-cyan-400">
                <RefreshCw className="w-4 h-4" /> Reload Page
              </button>
              <button onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="px-4 py-2 border border-white/10 text-gray-400 rounded-lg text-sm font-semibold flex items-center gap-2 hover:text-white">
                <Bug className="w-4 h-4" /> Details
                <ChevronDown className={`w-3 h-3 transition-transform ${this.state.showDetails ? "rotate-180" : ""}`} />
              </button>
            </div>

            {this.state.showDetails && (
              <div className="text-left mt-4 p-3 rounded-lg bg-black/40 border border-white/5 overflow-auto max-h-[200px]">
                <p className="text-xs text-red-400 font-mono mb-2">{this.state.error?.message}</p>
                <pre className="text-[10px] text-gray-600 font-mono whitespace-pre-wrap">
                  {this.state.error?.stack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
