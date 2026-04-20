import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.ts";
import { describeFounderOpsApproval } from "../../../../src/founder-ops/control-plane.js";

function formatRemaining(ms: number): string {
  const remaining = Math.max(0, ms);
  const totalSeconds = Math.floor(remaining / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

function renderMetaRow(label: string, value?: string | null) {
  if (!value) {
    return nothing;
  }
  return html`<div class="exec-approval-meta-row"><span>${label}</span><span>${value}</span></div>`;
}

export function renderExecApprovalPrompt(state: AppViewState) {
  const active = state.execApprovalQueue[0];
  if (!active) {
    return nothing;
  }
  const request = active.request;
  const approval = describeFounderOpsApproval({
    command: request.command,
    ask: request.ask,
    sessionKey: request.sessionKey,
    cwd: request.cwd,
    host: request.host,
    resolvedPath: request.resolvedPath,
    security: request.security,
  });
  const remainingMs = active.expiresAtMs - Date.now();
  const remaining = remainingMs > 0 ? `expires in ${formatRemaining(remainingMs)}` : "expired";
  const queueCount = state.execApprovalQueue.length;
  return html`
    <div class="exec-approval-overlay" role="dialog" aria-live="polite">
      <div class="exec-approval-card">
        <div class="exec-approval-header">
          <div>
            <div class="exec-approval-title">Founder approval required</div>
            <div class="exec-approval-sub">${remaining}</div>
          </div>
          ${
            queueCount > 1
              ? html`<div class="exec-approval-queue">${queueCount} pending</div>`
              : nothing
          }
        </div>
        <div style="display: grid; gap: 8px; margin-bottom: 12px;">
          <div style="font-weight: 600;">${approval.title}</div>
          <div class="muted">${approval.rationale}</div>
          <div class="muted" style="font-size: 12px;">Context: ${approval.sourceContext}</div>
          <div class="muted" style="font-size: 12px;">Outcome: ${approval.expectedOutcome}</div>
          <div class="muted" style="font-size: 12px;">
            Delay: ${approval.consequenceOfDelay}
          </div>
          <div class="pill" style="font-size: 11px; width: fit-content;">
            Timeout fallback: ${approval.timeoutFallback}
          </div>
        </div>
        <div class="exec-approval-command mono">${request.command}</div>
        <div class="exec-approval-meta">
          ${renderMetaRow("Host", request.host)}
          ${renderMetaRow("Agent", request.agentId)}
          ${renderMetaRow("Session", request.sessionKey)}
          ${renderMetaRow("CWD", request.cwd)}
          ${renderMetaRow("Resolved", request.resolvedPath)}
          ${renderMetaRow("Security", request.security)}
          ${renderMetaRow("Ask", request.ask)}
        </div>
        ${
          state.execApprovalError
            ? html`<div class="exec-approval-error">${state.execApprovalError}</div>`
            : nothing
        }
        <div class="exec-approval-actions">
          <button
            class="btn primary"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("allow-once")}
          >
            ${approval.labels.approveOnce}
          </button>
          <button
            class="btn"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("allow-always")}
          >
            ${approval.labels.approveAlways}
          </button>
          <button
            class="btn danger"
            ?disabled=${state.execApprovalBusy}
            @click=${() => state.handleExecApprovalDecision("deny")}
          >
            ${approval.labels.reject}
          </button>
        </div>
      </div>
    </div>
  `;
}
