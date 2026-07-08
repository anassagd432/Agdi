import { html, nothing } from "lit";

export type BrowserProps = Record<string, never>;

type AutomationStep = {
  id: string;
  action: string;
  target: string;
  status: "success" | "error" | "running" | "pending";
  ts: number;
};

type BrowserState = {
  url: string;
  title: string;
  loading: boolean;
  steps: AutomationStep[];
  selectedElement: string | null;
};

// Simulated demo state – updated by interactive actions in the view.
let _state: BrowserState = {
  url: "https://google.com/search?q=Agdi+AI+Framework",
  title: "Agdi AI Framework – Google Search",
  loading: false,
  steps: [
    { id: "s1", action: "navigate", target: "https://google.com", status: "success", ts: Date.now() - 5000 },
    { id: "s2", action: "type", target: 'input[name="q"]  ← "Agdi AI Framework"', status: "success", ts: Date.now() - 4200 },
    { id: "s3", action: "click", target: 'button[type="submit"]', status: "success", ts: Date.now() - 3800 },
    { id: "s4", action: "wait_for", target: "#search", status: "success", ts: Date.now() - 3100 },
    { id: "s5", action: "extract_text", target: "h3.LC20lb", status: "running", ts: Date.now() - 800 },
    { id: "s6", action: "screenshot", target: "viewport", status: "pending", ts: 0 },
  ],
  selectedElement: 'input[name="q"]',
};

function statusBadge(status: AutomationStep["status"]) {
  const map: Record<string, string> = {
    success: "success",
    error: "danger",
    running: "info",
    pending: "muted",
  };
  const labels: Record<string, string> = {
    success: "✓ Done",
    error: "✗ Error",
    running: "⟳ Running",
    pending: "· Pending",
  };
  return html`<span class="pill ${map[status] ?? ""}">${labels[status] ?? status}</span>`;
}

function renderSidePanel(state: BrowserState) {
  return html`
    <div class="browser-side-panel">
      <div class="browser-panel-section">
        <div class="browser-panel-title">Elements</div>
        ${["html", "body", "div#main", "div#search", "h3.LC20lb", 'input[name="q"]'].map(
          (sel) => html`
            <div
              class="browser-element-row ${state.selectedElement === sel ? "browser-element-row--active" : ""}"
              @click=${() => {
                _state = { ..._state, selectedElement: sel };
              }}
            >
              <span class="browser-element-tag">${sel}</span>
            </div>
          `,
        )}
      </div>
      <div class="browser-panel-section">
        <div class="browser-panel-title">Selector</div>
        <pre class="browser-selector-box">${state.selectedElement ?? "none"}</pre>
      </div>
      <div class="browser-panel-section">
        <div class="browser-panel-title">Attributes</div>
        <div class="browser-attr-row"><span class="browser-attr-key">id</span><span class="browser-attr-val">q</span></div>
        <div class="browser-attr-row"><span class="browser-attr-key">type</span><span class="browser-attr-val">text</span></div>
        <div class="browser-attr-row"><span class="browser-attr-key">aria-label</span><span class="browser-attr-val">Search</span></div>
      </div>
    </div>
  `;
}

export function renderBrowser(_props: BrowserProps) {
  const state = _state;

  return html`
    <div class="browser-view">
      <!-- Address bar -->
      <div class="browser-toolbar">
        <div class="browser-nav-btns">
          <button class="browser-nav-btn" title="Back">&#8592;</button>
          <button class="browser-nav-btn" title="Forward">&#8594;</button>
          <button class="browser-nav-btn ${state.loading ? "browser-nav-btn--spinning" : ""}" title="Refresh">&#8635;</button>
        </div>
        <div class="browser-address-bar">
          <span class="browser-lock-icon">🔒</span>
          <input
            class="browser-url-input"
            type="text"
            .value=${state.url}
            readonly
            aria-label="Browser address bar"
          />
        </div>
        <div class="browser-toolbar-actions">
          <button class="btn btn--sm btn--primary">
            ▶ Run Automation
          </button>
          <button class="btn btn--sm">Stop</button>
        </div>
      </div>

      <!-- Main area: viewport + side panel -->
      <div class="browser-main">
        <!-- Simulated browser viewport -->
        <div class="browser-viewport">
          <div class="browser-viewport-inner">
            <div class="browser-page-title">${state.title}</div>
            <div class="browser-page-url">${state.url}</div>
            <div class="browser-mock-content">
              <div class="browser-mock-searchbar">
                <div class="browser-mock-google-logo">
                  <span style="color:#4285f4">A</span><span style="color:#ea4335">g</span><span style="color:#fbbc05">d</span><span style="color:#4285f4">i</span>
                </div>
                <div class="browser-mock-input-wrap">
                  <span class="browser-mock-input-text">Agdi AI Framework</span>
                  <span class="browser-highlight-overlay"></span>
                </div>
              </div>
              <div class="browser-mock-results">
                ${["agdi.ai – The Open Developer AI Gateway",
                   "GitHub – agdi/agdi: AI command layer for developers",
                   "Agdi Docs: Getting Started with the Gateway",
                   "Compare Agdi vs OpenClaw – feature matrix"].map(
                  (r, i) => html`
                    <div class="browser-mock-result ${i === 0 ? "browser-mock-result--active" : ""}">
                      <div class="browser-mock-result-url">agdi.ai/...</div>
                      <div class="browser-mock-result-title">${r}</div>
                    </div>
                  `,
                )}
              </div>
            </div>
            <!-- Automation cursor overlay -->
            <div class="browser-cursor-overlay">
              <div class="browser-cursor">▶</div>
              <div class="browser-cursor-label">Extracting text…</div>
            </div>
          </div>
        </div>

        <!-- Side panel: element inspector -->
        ${renderSidePanel(state)}
      </div>

      <!-- Automation step log -->
      <div class="browser-log">
        <div class="browser-log-title">Automation Steps</div>
        <div class="browser-log-steps">
          ${state.steps.map(
            (step) => html`
              <div class="browser-log-step browser-log-step--${step.status}">
                <span class="browser-log-action">${step.action}</span>
                <span class="browser-log-target">${step.target}</span>
                ${statusBadge(step.status)}
              </div>
            `,
          )}
        </div>
      </div>
    </div>

    <style>
      .browser-view {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 120px);
        gap: 0;
        padding: 0 var(--space-4);
        overflow: hidden;
      }
      .browser-toolbar {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--border);
      }
      .browser-nav-btns {
        display: flex;
        gap: 4px;
      }
      .browser-nav-btn {
        background: var(--surface-1);
        border: 1px solid var(--border);
        color: var(--text-1);
        border-radius: var(--radius-sm);
        width: 28px;
        height: 28px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.15s;
      }
      .browser-nav-btn:hover { background: var(--surface-2); }
      .browser-nav-btn--spinning { animation: spin 1s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .browser-address-bar {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--surface-1);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 0 10px;
        height: 32px;
      }
      .browser-lock-icon { font-size: 11px; opacity: 0.6; }
      .browser-url-input {
        flex: 1;
        border: none;
        background: transparent;
        color: var(--text-1);
        font-size: 12px;
        font-family: var(--font-mono);
        outline: none;
      }
      .browser-toolbar-actions {
        display: flex;
        gap: 6px;
      }
      .browser-main {
        flex: 1;
        display: flex;
        gap: 0;
        min-height: 0;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
        margin-top: var(--space-2);
      }
      .browser-viewport {
        flex: 1;
        background: #fff;
        overflow: auto;
        position: relative;
      }
      .browser-viewport-inner {
        padding: 20px 24px;
        min-height: 100%;
        position: relative;
      }
      .browser-page-title {
        font-size: 11px;
        color: #555;
        font-family: sans-serif;
        margin-bottom: 2px;
      }
      .browser-page-url {
        font-size: 10px;
        color: #1558d6;
        font-family: sans-serif;
        margin-bottom: 16px;
      }
      .browser-mock-content { font-family: Arial, sans-serif; }
      .browser-mock-searchbar {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
      }
      .browser-mock-google-logo {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -1px;
      }
      .browser-mock-input-wrap {
        flex: 1;
        max-width: 400px;
        border: 1px solid #ddd;
        border-radius: 24px;
        padding: 8px 16px;
        display: flex;
        align-items: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        position: relative;
        background: #fff;
      }
      .browser-mock-input-text { color: #333; font-size: 14px; }
      .browser-mock-results { display: flex; flex-direction: column; gap: 16px; }
      .browser-mock-result {
        padding: 10px;
        border-radius: 8px;
        transition: background 0.15s;
      }
      .browser-mock-result--active {
        background: rgba(66,133,244,0.07);
        outline: 2px solid #4285f4;
      }
      .browser-mock-result-url { font-size: 12px; color: #3c4043; }
      .browser-mock-result-title { font-size: 16px; color: #1558d6; font-weight: 500; }
      .browser-cursor-overlay {
        position: absolute;
        bottom: 40px;
        right: 40px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(0,0,0,0.7);
        color: #fff;
        border-radius: 20px;
        padding: 6px 12px;
        font-size: 12px;
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      .browser-side-panel {
        width: 220px;
        border-left: 1px solid var(--border);
        background: var(--surface-0);
        overflow-y: auto;
        padding: var(--space-2);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .browser-panel-section {
        background: var(--surface-1);
        border-radius: var(--radius-sm);
        padding: var(--space-2);
      }
      .browser-panel-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-3);
        margin-bottom: var(--space-1);
      }
      .browser-element-row {
        padding: 4px 6px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.15s;
        font-size: 11px;
        font-family: var(--font-mono);
        color: var(--text-2);
      }
      .browser-element-row:hover { background: var(--surface-2); }
      .browser-element-row--active {
        background: var(--accent-alpha-10);
        color: var(--accent);
      }
      .browser-element-tag { word-break: break-all; }
      .browser-selector-box {
        background: var(--surface-2);
        border-radius: 4px;
        padding: 6px;
        font-size: 11px;
        font-family: var(--font-mono);
        color: var(--accent);
        white-space: pre-wrap;
        word-break: break-all;
        margin: 0;
      }
      .browser-attr-row {
        display: flex;
        gap: 6px;
        font-size: 11px;
        padding: 2px 0;
      }
      .browser-attr-key { color: var(--text-3); font-family: var(--font-mono); }
      .browser-attr-val { color: var(--text-1); font-family: var(--font-mono); }
      .browser-log {
        border-top: 1px solid var(--border);
        max-height: 180px;
        overflow-y: auto;
        padding: var(--space-2) 0;
        flex-shrink: 0;
      }
      .browser-log-title {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-3);
        margin-bottom: var(--space-1);
      }
      .browser-log-steps { display: flex; flex-direction: column; gap: 4px; }
      .browser-log-step {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 5px 10px;
        border-radius: var(--radius-sm);
        font-size: 12px;
        background: var(--surface-1);
        border-left: 3px solid transparent;
        transition: border-color 0.2s;
      }
      .browser-log-step--success { border-left-color: var(--success); }
      .browser-log-step--error { border-left-color: var(--danger); }
      .browser-log-step--running { border-left-color: var(--info); animation: pulse 1.5s ease-in-out infinite; }
      .browser-log-step--pending { border-left-color: var(--border); opacity: 0.5; }
      .browser-log-action {
        font-family: var(--font-mono);
        font-weight: 600;
        color: var(--accent);
        min-width: 90px;
        font-size: 11px;
      }
      .browser-log-target {
        flex: 1;
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-2);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    </style>
  `;
}
