import { html, nothing } from "lit";
import type { FounderOpsAgendaItem, FounderOpsAgendaSnapshot } from "../../../src/founder-ops/agenda.js";
import { formatRelativeTimestamp } from "../format.ts";

export type FounderCommandCenterProps = {
  agenda: FounderOpsAgendaSnapshot;
  onNavigate: (tab: string) => void;
  onOpenSession: (sessionKey: string) => void;
};

function renderBucketCard(label: string, value: number, tone?: "approval" | "internal") {
  const accent =
    tone === "approval"
      ? "var(--accent-warn)"
      : tone === "internal"
        ? "var(--accent-info)"
        : "var(--accent-success)";
  return html`
    <div class="card" style="border-color: color-mix(in srgb, ${accent} 26%, var(--border));">
      <div class="card-sub">${label}</div>
      <div style="font-size: 28px; font-weight: 700; margin-top: 6px;">${value}</div>
    </div>
  `;
}

function renderAgendaItem(
  item: FounderOpsAgendaItem,
  props: FounderCommandCenterProps,
  options?: { approvals?: boolean },
) {
  return html`
    <li style="display: grid; gap: 6px; padding: 12px 0; border-top: 1px solid var(--border);">
      <div style="display: flex; justify-content: space-between; gap: 12px; align-items: start;">
        <div>
          <div style="font-weight: 600;">${item.title}</div>
          <div class="muted">${item.summary}</div>
        </div>
        <div class="muted" style="white-space: nowrap;">
          ${formatRelativeTimestamp(item.updatedAtMs)}
        </div>
      </div>
      ${
        item.rationale || item.sourceContext || item.expectedOutcome || item.consequenceOfDelay
          ? html`
              <div class="muted" style="font-size: 12px;">
                ${item.rationale ? html`Why: ${item.rationale}` : nothing}
                ${item.rationale && (item.sourceContext || item.expectedOutcome || item.consequenceOfDelay)
                  ? html`<span> | </span>`
                  : nothing}
                ${item.sourceContext ? html`Context: ${item.sourceContext}` : nothing}
                ${item.sourceContext && (item.expectedOutcome || item.consequenceOfDelay)
                  ? html`<span> | </span>`
                  : nothing}
                ${item.expectedOutcome ? html`Outcome: ${item.expectedOutcome}` : nothing}
                ${item.expectedOutcome && item.consequenceOfDelay ? html`<span> | </span>` : nothing}
                ${item.consequenceOfDelay ? html`Delay: ${item.consequenceOfDelay}` : nothing}
              </div>
            `
          : nothing
      }
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <span class="pill" style="font-size: 11px;">
          ${item.kind === "approval"
            ? "Approval"
            : item.source === "routine"
              ? "Routine"
              : item.kind.replace(/_/g, " ")}
        </span>
        ${item.recommendedAction
          ? html`<span class="muted" style="font-size: 12px;">${item.recommendedAction}</span>`
          : nothing}
        ${
          options?.approvals && item.timeoutFallback
            ? html`
                <span class="pill" style="font-size: 11px;">
                  Timeout: ${item.timeoutFallback}
                </span>
              `
            : nothing
        }
        ${
          item.sessionKey
            ? html`
                <button
                  type="button"
                  class="btn btn--secondary"
                  @click=${() => {
                    props.onOpenSession(item.sessionKey!);
                    props.onNavigate("chat");
                  }}
                >
                  Open thread
                </button>
              `
            : nothing
        }
      </div>
    </li>
  `;
}

function renderSection(
  title: string,
  items: readonly FounderOpsAgendaItem[],
  props: FounderCommandCenterProps,
  options?: { approvals?: boolean; emptyText?: string },
) {
  return html`
    <div class="card">
      <div class="card-title">${title}</div>
      ${
        items.length === 0
          ? html`<div class="muted" style="margin-top: 12px;">${options?.emptyText ?? "Nothing here."}</div>`
          : html`
              <ul style="list-style: none; margin: 12px 0 0; padding: 0;">
                ${items.map((item) => renderAgendaItem(item, props, options))}
              </ul>
            `
      }
    </div>
  `;
}

export function renderFounderCommandCenter(props: FounderCommandCenterProps) {
  const { agenda } = props;
  return html`
    <section class="grid">
      <div class="card">
        <div class="card-title">Founder Command Center</div>
        <div class="card-sub">
          One operating agenda across live threads, routines, and external approvals.
        </div>
        <div class="cards-grid" style="margin-top: 16px;">
          ${renderBucketCard("Agdi knows", agenda.buckets.knows.length)}
          ${renderBucketCard("Agdi already did internally", agenda.buckets.internal.length, "internal")}
          ${renderBucketCard(
            "Agdi needs approval to act externally",
            agenda.buckets.approval.length,
            "approval",
          )}
        </div>
      </div>

      ${renderSection("Today", agenda.sections.today.items, props, {
        emptyText: "No active founder work is in focus right now.",
      })}
      ${renderSection("Blockers", agenda.sections.blockers.items, props, {
        emptyText: "No current blockers detected.",
      })}
      ${renderSection("Waiting", agenda.sections.waiting.items, props, {
        emptyText: "Nothing is waiting on an external dependency.",
      })}
      ${renderSection("Approvals", agenda.sections.approvals.items, props, {
        approvals: true,
        emptyText: "No external actions are waiting for approval.",
      })}
      ${renderSection("Stale", agenda.sections.stale.items, props, {
        emptyText: "No stale commitments detected.",
      })}
      ${renderSection("Recommended next actions", agenda.sections.recommended.items, props, {
        emptyText: "Agdi does not have a stronger recommendation yet.",
      })}
    </section>
  `;
}
