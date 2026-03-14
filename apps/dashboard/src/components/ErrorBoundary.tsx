"use client";
import React from "react";

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="glass-panel p-6 max-w-md text-center space-y-3">
            <h3 className="text-lg font-semibold text-red-400">Something went wrong</h3>
            <p className="text-sm text-muted-foreground">{this.state.error?.message}</p>
            <button onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-cyan-500 text-black rounded-lg text-sm font-medium">
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
