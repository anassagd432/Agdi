"use client";

import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global React error boundary for the dashboard.
 * Catches render-time errors and displays a recovery UI instead of a blank screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
            An unexpected error occurred while rendering this page. This is
            usually caused by a gateway disconnection or a data format issue.
          </p>
          {this.state.error && (
            <pre className="text-xs text-red-400/70 font-mono bg-black/40 border border-red-500/10 rounded-lg p-4 max-w-lg overflow-auto text-left mb-6">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-[0_0_15px_rgba(34,211,238,0.15)]"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
