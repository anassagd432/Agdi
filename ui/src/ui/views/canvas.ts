import { html, nothing } from "lit";

export type CanvasProps = Record<string, never>;

const TEMPLATES: Array<{ id: string; label: string; code: string }> = [
  {
    id: "counter",
    label: "Animated Counter",
    code: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #0a0a14; color: #fff; }
  .counter { text-align: center; }
  .count { font-size: 80px; font-weight: 900; background: linear-gradient(135deg, #6c63ff, #48cfad); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  button { padding: 10px 24px; border-radius: 8px; border: none; background: #6c63ff; color: #fff; font-size: 16px; cursor: pointer; margin: 0 6px; }
  button:hover { opacity: 0.85; }
</style>
</head>
<body>
  <div class="counter">
    <div class="count" id="n">0</div>
    <button onclick="n.textContent=+n.textContent-1">−</button>
    <button onclick="n.textContent=+n.textContent+1">+</button>
    <button onclick="n.textContent=0">Reset</button>
  </div>
</body>
</html>`,
  },
  {
    id: "chart",
    label: "Live Bar Chart",
    code: `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: sans-serif; background: #0a0a14; color: #fff; padding: 20px; margin: 0; }
  .chart { display: flex; align-items: flex-end; gap: 8px; height: 200px; }
  .bar { flex: 1; background: linear-gradient(0deg, #6c63ff, #48cfad); border-radius: 4px 4px 0 0; transition: height 0.4s; cursor: pointer; }
  h2 { font-size: 16px; margin-bottom: 16px; opacity: 0.7; }
</style>
</head>
<body>
  <h2>Live CPU Usage (simulated)</h2>
  <div class="chart" id="chart"></div>
  <script>
    const bars = Array.from({length: 12}, (_, i) => {
      const b = document.createElement('div');
      b.className = 'bar';
      b.style.height = Math.random() * 80 + 20 + '%';
      document.getElementById('chart').appendChild(b);
      return b;
    });
    setInterval(() => {
      bars.forEach(b => { b.style.height = Math.random() * 80 + 20 + '%'; });
    }, 900);
  </script>
</body>
</html>`,
  },
  {
    id: "glass",
    label: "Glassmorphism Card",
    code: `<!DOCTYPE html>
<html>
<head>
<style>
  body { min-height: 100vh; margin: 0; display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #1a0533 0%, #0a1628 100%); font-family: sans-serif; }
  .card {
    background: rgba(255,255,255,0.07);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 20px;
    padding: 36px 40px;
    color: #fff;
    max-width: 320px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  .tag { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.5; }
  h2 { font-size: 22px; margin: 8px 0; background: linear-gradient(135deg,#b07dff,#48cfad); -webkit-background-clip:text;-webkit-text-fill-color:transparent; }
  p { font-size: 14px; opacity: 0.7; line-height: 1.6; }
  .btn { display: inline-block; padding: 10px 22px; background: linear-gradient(135deg,#6c63ff,#48cfad);
    border-radius: 8px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 16px; }
</style>
</head>
<body>
  <div class="card">
    <div class="tag">Agdi Canvas</div>
    <h2>Glassmorphism UI</h2>
    <p>Live preview of generated HTML & CSS components, rendered inside the Agdi workspace.</p>
    <div class="btn">Open in Canvas →</div>
  </div>
</body>
</html>`,
  },
];

let _activeTemplate = TEMPLATES[0];
let _customCode = _activeTemplate.code;

export function renderCanvas(_props: CanvasProps) {
  return html`
    <div class="canvas-view">
      <!-- Template picker -->
      <div class="canvas-toolbar">
        <div class="canvas-toolbar-label">Templates</div>
        <div class="canvas-template-tabs">
          ${TEMPLATES.map(
            (tpl) => html`
              <button
                class="canvas-tab ${_activeTemplate.id === tpl.id ? "canvas-tab--active" : ""}"
                @click=${() => {
                  _activeTemplate = tpl;
                  _customCode = tpl.code;
                }}
              >
                ${tpl.label}
              </button>
            `,
          )}
        </div>
        <div style="margin-left:auto; display:flex; gap:6px;">
          <button class="btn btn--sm btn--primary">▶ Run</button>
          <button class="btn btn--sm">↗ Open</button>
        </div>
      </div>

      <!-- Split: editor + preview -->
      <div class="canvas-split">
        <!-- Left: code editor (read-only textarea for demo) -->
        <div class="canvas-editor-pane">
          <div class="canvas-pane-header">
            <span class="canvas-pane-title">HTML / JS</span>
            <span class="canvas-pane-badge">index.html</span>
          </div>
          <textarea
            class="canvas-editor"
            spellcheck="false"
            aria-label="Code editor"
            .value=${_activeTemplate.code}
            @input=${(e: Event) => {
              _customCode = (e.target as HTMLTextAreaElement).value;
            }}
          ></textarea>
        </div>

        <!-- Divider -->
        <div class="canvas-divider" role="separator" aria-orientation="vertical"></div>

        <!-- Right: live iframe preview -->
        <div class="canvas-preview-pane">
          <div class="canvas-pane-header">
            <span class="canvas-pane-title">Preview</span>
            <span class="canvas-pane-badge">live</span>
            <span class="canvas-preview-dot"></span>
          </div>
          <div class="canvas-iframe-wrap">
            <iframe
              class="canvas-iframe"
              title="Live preview"
              srcdoc=${_activeTemplate.code}
              sandbox="allow-scripts"
            ></iframe>
          </div>
        </div>
      </div>
    </div>

    <style>
      .canvas-view {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 120px);
        overflow: hidden;
        padding: 0 var(--space-4);
        gap: 0;
      }
      .canvas-toolbar {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
      }
      .canvas-toolbar-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-3);
        white-space: nowrap;
      }
      .canvas-template-tabs {
        display: flex;
        gap: 4px;
      }
      .canvas-tab {
        padding: 5px 12px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--border);
        background: transparent;
        color: var(--text-2);
        font-size: 12px;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }
      .canvas-tab:hover { background: var(--surface-2); color: var(--text-1); }
      .canvas-tab--active {
        background: var(--accent);
        color: #fff;
        border-color: var(--accent);
      }
      .canvas-split {
        flex: 1;
        display: flex;
        min-height: 0;
        margin-top: var(--space-2);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        overflow: hidden;
      }
      .canvas-editor-pane,
      .canvas-preview-pane {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .canvas-pane-header {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--surface-1);
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
      }
      .canvas-pane-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--text-2);
      }
      .canvas-pane-badge {
        font-size: 10px;
        font-family: var(--font-mono);
        background: var(--surface-2);
        color: var(--text-3);
        padding: 1px 6px;
        border-radius: 4px;
      }
      .canvas-preview-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--success);
        margin-left: auto;
        animation: blink 2s ease-in-out infinite;
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      .canvas-editor {
        flex: 1;
        width: 100%;
        background: var(--surface-0);
        color: var(--text-1);
        border: none;
        font-family: var(--font-mono);
        font-size: 12px;
        line-height: 1.6;
        padding: 14px;
        resize: none;
        outline: none;
        white-space: pre;
        overflow-wrap: normal;
        overflow: auto;
        tab-size: 2;
      }
      .canvas-divider {
        width: 5px;
        background: var(--surface-2);
        border-left: 1px solid var(--border);
        border-right: 1px solid var(--border);
        flex-shrink: 0;
        cursor: col-resize;
        transition: background 0.15s;
      }
      .canvas-divider:hover { background: var(--accent-alpha-20); }
      .canvas-iframe-wrap {
        flex: 1;
        overflow: hidden;
        background: #fff;
      }
      .canvas-iframe {
        width: 100%;
        height: 100%;
        border: none;
      }
    </style>
  `;
}
