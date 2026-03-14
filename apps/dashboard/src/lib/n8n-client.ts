// ── n8n Client ────────────────────────────────────────────────────────────

const N8N_URL = process.env.N8N_API_URL || "http://localhost:5678";
const N8N_KEY = process.env.N8N_API_KEY || "";

async function n8nFetch(path: string, opts?: RequestInit): Promise<Response> {
  return fetch(`${N8N_URL}/api/v1${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": N8N_KEY,
      ...opts?.headers,
    },
  });
}

export async function listWorkflows() {
  const r = await n8nFetch("/workflows");
  return r.json();
}

export async function toggleWorkflow(id: string, active: boolean) {
  const r = await n8nFetch(`/workflows/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
  return r.json();
}

export async function executeWorkflow(id: string) {
  const r = await n8nFetch(`/workflows/${id}/execute`, { method: "POST" });
  return r.json();
}

export async function getExecutions(workflowId?: string) {
  const q = workflowId ? `?workflowId=${workflowId}` : "";
  const r = await n8nFetch(`/executions${q}`);
  return r.json();
}
