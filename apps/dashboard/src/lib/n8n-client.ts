/**
 * n8n REST API client.
 * Proxied through /api/n8n/proxy to avoid CORS issues.
 */

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes?: any[];
  tags?: { id: string; name: string }[];
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  status: "success" | "error" | "running" | "waiting";
  startedAt: string;
  stoppedAt?: string;
  data?: any;
}

const PROXY_BASE = "/api/n8n/proxy";

async function n8nFetch(
  path: string,
  opts?: RequestInit,
): Promise<any> {
  const res = await fetch(`${PROXY_BASE}?path=${encodeURIComponent(path)}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...opts?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `n8n API error: ${res.status}`);
  }

  return res.json();
}

/**
 * List all workflows.
 */
export async function listWorkflows(): Promise<N8nWorkflow[]> {
  const res = await n8nFetch("/workflows");
  return res.data || res.workflows || res || [];
}

/**
 * Get a single workflow by ID.
 */
export async function getWorkflow(id: string): Promise<N8nWorkflow> {
  return n8nFetch(`/workflows/${id}`);
}

/**
 * Activate or deactivate a workflow.
 */
export async function toggleWorkflow(
  id: string,
  active: boolean,
): Promise<N8nWorkflow> {
  return n8nFetch(`/workflows/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

/**
 * Manually execute a workflow via webhook trigger.
 */
export async function executeWorkflow(id: string): Promise<any> {
  return n8nFetch(`/workflows/${id}/execute`, {
    method: "POST",
  });
}

/**
 * List recent executions for a workflow.
 */
export async function listExecutions(
  workflowId?: string,
  limit = 20,
): Promise<N8nExecution[]> {
  const params = new URLSearchParams();
  if (workflowId) params.set("workflowId", workflowId);
  params.set("limit", String(limit));
  const res = await n8nFetch(`/executions?${params.toString()}`);
  return res.data || res.results || res || [];
}
