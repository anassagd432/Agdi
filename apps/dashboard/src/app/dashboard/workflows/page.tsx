"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  GitMerge,
  Play,
  Pause,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Zap,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  listWorkflows,
  listExecutions,
  toggleWorkflow,
  executeWorkflow,
  type N8nWorkflow,
  type N8nExecution,
} from "@/lib/n8n-client";

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([]);
  const [executions, setExecutions] = useState<N8nExecution[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    try {
      const wfs = await listWorkflows();
      setWorkflows(Array.isArray(wfs) ? wfs : []);
      setError(null);
      if (!selectedId && wfs.length > 0) {
        setSelectedId(wfs[0].id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to n8n.");
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const fetchExecutions = useCallback(async () => {
    if (!selectedId) return;
    try {
      const execs = await listExecutions(selectedId, 10);
      setExecutions(Array.isArray(execs) ? execs : []);
    } catch {
      setExecutions([]);
    }
  }, [selectedId]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  // Auto-refresh executions every 10s
  useEffect(() => {
    const iv = setInterval(fetchExecutions, 10000);
    return () => clearInterval(iv);
  }, [fetchExecutions]);

  const handleToggle = async (wf: N8nWorkflow) => {
    try {
      await toggleWorkflow(wf.id, !wf.active);
      toast.success(`${wf.name} ${wf.active ? "deactivated" : "activated"}.`);
      fetchWorkflows();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle workflow.");
    }
  };

  const handleExecute = async (wf: N8nWorkflow) => {
    setExecuting(wf.id);
    try {
      await executeWorkflow(wf.id);
      toast.success(`${wf.name} triggered successfully.`);
      setTimeout(fetchExecutions, 1000);
    } catch (err: any) {
      toast.error(err.message || "Failed to execute workflow.");
    } finally {
      setExecuting(null);
    }
  };

  const selectedWorkflow = workflows.find((w) => w.id === selectedId);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return d;
    }
  };

  const statusIcon = (status: N8nExecution["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "running":
        return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
      case "waiting":
        return <Clock className="w-4 h-4 text-amber-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in duration-500 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <GitMerge className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" />{" "}
            n8n Workflows
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Manage, trigger, and monitor your{" "}
            <span className="text-pink-400 font-semibold">n8n automations</span>{" "}
            from the dashboard.
          </p>
        </div>

        <button
          onClick={() => fetchWorkflows()}
          disabled={loading}
          className="glass-button px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />{" "}
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="glass-panel p-4 border-amber-500/30 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm text-amber-200">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Make sure n8n is running and{" "}
              <code className="text-gray-400">N8N_API_URL</code> +{" "}
              <code className="text-gray-400">N8N_API_KEY</code> are set.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      )}

      {/* Main content */}
      {!loading && (
        <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
          {/* Workflow List */}
          <div className="flex md:flex-col md:w-72 flex-shrink-0 gap-2 overflow-x-auto md:overflow-y-auto md:overflow-x-visible pb-2 md:pb-0">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-2 mb-2 whitespace-nowrap">
              Workflows ({workflows.length})
            </div>

            {workflows.length === 0 && !error && (
              <div className="text-sm text-muted-foreground px-2">
                No workflows found in n8n.
              </div>
            )}

            {workflows.map((wf) => (
              <button
                key={wf.id}
                onClick={() => setSelectedId(wf.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors text-left min-w-[200px] md:min-w-0 ${
                  selectedId === wf.id
                    ? "border-cyan-500/30 bg-cyan-500/5 glass-panel"
                    : "border-transparent hover:border-white/5 hover:bg-white/5"
                }`}
              >
                <div
                  className={`text-sm ${
                    selectedId === wf.id
                      ? "font-semibold text-white"
                      : "font-medium text-gray-300"
                  }`}
                >
                  {wf.name}
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      wf.active ? "bg-emerald-500" : "bg-gray-600"
                    }`}
                  />
                  {wf.active ? "Active" : "Inactive"}
                  {wf.tags && wf.tags.length > 0 && (
                    <span className="text-gray-600">
                      • {wf.tags.map((t) => t.name).join(", ")}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Workflow Detail */}
          {selectedWorkflow ? (
            <div className="flex-1 glass-panel rounded-xl border border-white/5 p-6 space-y-6 overflow-y-auto">
              {/* Workflow header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedWorkflow.name}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    ID: {selectedWorkflow.id} • Updated:{" "}
                    {formatDate(selectedWorkflow.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(selectedWorkflow)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      selectedWorkflow.active
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    }`}
                  >
                    {selectedWorkflow.active ? (
                      <>
                        <Pause className="w-4 h-4" /> Deactivate
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" /> Activate
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleExecute(selectedWorkflow)}
                    disabled={executing === selectedWorkflow.id}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {executing === selectedWorkflow.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Running…
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" /> Execute
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Nodes preview */}
              {selectedWorkflow.nodes &&
                selectedWorkflow.nodes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3">
                      Nodes ({selectedWorkflow.nodes.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedWorkflow.nodes.map((node: any, i: number) => (
                        <div
                          key={i}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-cyan-400" />
                          <span className="text-white/80">
                            {node.name || node.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Recent executions */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">
                  Recent Executions
                </h3>
                {executions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No executions yet for this workflow.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {executions.map((exec) => (
                      <div
                        key={exec.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
                      >
                        {statusIcon(exec.status)}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white/80">
                            Execution #{exec.id}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(exec.startedAt)}
                            {exec.stoppedAt && (
                              <span>
                                {" "}
                                →{" "}
                                {formatDate(exec.stoppedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            exec.status === "success"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : exec.status === "error"
                                ? "bg-red-500/10 text-red-400"
                                : exec.status === "running"
                                  ? "bg-cyan-500/10 text-cyan-400"
                                  : "bg-gray-500/10 text-gray-400"
                          }`}
                        >
                          {exec.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 glass-panel rounded-xl border border-white/5 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <GitMerge className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  Select a workflow to view details
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
