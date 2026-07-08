import { html, nothing } from "lit";

export type KnowledgeProps = Record<string, never>;

type KnowledgeFile = {
  id: string;
  name: string;
  type: "pdf" | "txt" | "md" | "json";
  chunks: number;
  vectors: number;
  sizeKb: number;
  status: "indexed" | "indexing" | "queued" | "error";
  addedAt: number;
};

type SearchMatch = {
  score: number;
  source: string;
  excerpt: string;
};

const DEMO_FILES: KnowledgeFile[] = [
  { id: "f1", name: "agdi-architecture.pdf", type: "pdf", chunks: 142, vectors: 142, sizeKb: 812, status: "indexed", addedAt: Date.now() - 86400000 * 2 },
  { id: "f2", name: "developer-guide.md", type: "md", chunks: 88, vectors: 88, sizeKb: 148, status: "indexed", addedAt: Date.now() - 86400000 },
  { id: "f3", name: "api-reference.json", type: "json", chunks: 204, vectors: 204, sizeKb: 2340, status: "indexed", addedAt: Date.now() - 3600000 * 5 },
  { id: "f4", name: "release-notes-v2.txt", type: "txt", chunks: 31, vectors: 31, sizeKb: 42, status: "indexing", addedAt: Date.now() - 600000 },
  { id: "f5", name: "competitors-analysis.pdf", type: "pdf", chunks: 0, vectors: 0, sizeKb: 1240, status: "queued", addedAt: Date.now() - 60000 },
];

const DEMO_SEARCH_RESULTS: SearchMatch[] = [
  { score: 0.97, source: "agdi-architecture.pdf §4.2", excerpt: "The gateway layer routes all incoming messages through a pluggable channel adapter, enabling…" },
  { score: 0.91, source: "developer-guide.md §Getting Started", excerpt: "To install the Agdi gateway, run: npm install -g agdi and then agdi gateway run…" },
  { score: 0.84, source: "api-reference.json", excerpt: '"method": "chat.send", "description": "Send a message to the active session…"' },
];

let _searchQuery = "";
let _searchResults: SearchMatch[] | null = null;
let _isDragging = false;
let _files = [...DEMO_FILES];

function fileTypeIcon(type: KnowledgeFile["type"]) {
  const map: Record<string, string> = { pdf: "📄", txt: "📝", md: "📋", json: "🗂️" };
  return map[type] ?? "📄";
}

function statusBadge(status: KnowledgeFile["status"]) {
  const cls: Record<string, string> = { indexed: "success", indexing: "info", queued: "muted", error: "danger" };
  const label: Record<string, string> = { indexed: "Indexed", indexing: "Indexing…", queued: "Queued", error: "Error" };
  return html`<span class="pill ${cls[status] ?? ""}">${label[status] ?? status}</span>`;
}

function formatKb(kb: number) {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function renderKnowledge(_props: KnowledgeProps) {
  return html`
    <div class="knowledge-view">
      <!-- Top split: drop zone + stats -->
      <div class="knowledge-top">
        <!-- Drop zone -->
        <div
          class="knowledge-drop-zone ${_isDragging ? "knowledge-drop-zone--active" : ""}"
          @dragover=${(e: DragEvent) => { e.preventDefault(); _isDragging = true; }}
          @dragleave=${() => { _isDragging = false; }}
          @drop=${(e: DragEvent) => {
            e.preventDefault();
            _isDragging = false;
          }}
          @click=${() => {
            // Open file input programmatically in a real impl
          }}
          role="button"
          tabindex="0"
          aria-label="Drop files to ingest"
        >
          <div class="knowledge-drop-icon">${_isDragging ? "⬇️" : "📂"}</div>
          <div class="knowledge-drop-title">Drop files to ingest</div>
          <div class="knowledge-drop-sub">PDF, TXT, Markdown, JSON · Max 50 MB each</div>
          <button class="btn btn--sm btn--primary" style="margin-top:12px;">Browse Files</button>
        </div>

        <!-- Stats -->
        <div class="knowledge-stats">
          <div class="knowledge-stat-card">
            <div class="knowledge-stat-value">${_files.length}</div>
            <div class="knowledge-stat-label">Documents</div>
          </div>
          <div class="knowledge-stat-card">
            <div class="knowledge-stat-value">${_files.reduce((s, f) => s + f.chunks, 0)}</div>
            <div class="knowledge-stat-label">Chunks</div>
          </div>
          <div class="knowledge-stat-card">
            <div class="knowledge-stat-value">${_files.reduce((s, f) => s + f.vectors, 0)}</div>
            <div class="knowledge-stat-label">Vectors</div>
          </div>
          <div class="knowledge-stat-card">
            <div class="knowledge-stat-value">${formatKb(_files.reduce((s, f) => s + f.sizeKb, 0))}</div>
            <div class="knowledge-stat-label">Total Size</div>
          </div>
        </div>
      </div>

      <!-- File table -->
      <div class="knowledge-section">
        <div class="knowledge-section-title">Ingested Documents</div>
        <table class="knowledge-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Chunks</th>
              <th>Vectors</th>
              <th>Size</th>
              <th>Added</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${_files.map(
              (file) => html`
                <tr class="knowledge-row">
                  <td>
                    <span class="knowledge-file-icon">${fileTypeIcon(file.type)}</span>
                    <span class="knowledge-file-name">${file.name}</span>
                  </td>
                  <td class="knowledge-num">${file.chunks > 0 ? file.chunks : "—"}</td>
                  <td class="knowledge-num">${file.vectors > 0 ? file.vectors : "—"}</td>
                  <td class="knowledge-num">${formatKb(file.sizeKb)}</td>
                  <td class="knowledge-muted">${timeAgo(file.addedAt)}</td>
                  <td>${statusBadge(file.status)}</td>
                  <td>
                    <button
                      class="knowledge-del-btn"
                      title="Remove"
                      @click=${() => {
                        _files = _files.filter((f) => f.id !== file.id);
                      }}
                      aria-label="Remove ${file.name}"
                    >✕</button>
                  </td>
                </tr>
              `,
            )}
          </tbody>
        </table>
      </div>

      <!-- Semantic search box -->
      <div class="knowledge-section knowledge-search-section">
        <div class="knowledge-section-title">Semantic Search</div>
        <div class="knowledge-search-bar">
          <input
            class="knowledge-search-input"
            type="text"
            placeholder="Search your knowledge base…"
            .value=${_searchQuery}
            @input=${(e: Event) => { _searchQuery = (e.target as HTMLInputElement).value; }}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === "Enter" && _searchQuery.trim()) {
                _searchResults = DEMO_SEARCH_RESULTS;
              }
            }}
            aria-label="Search knowledge base"
          />
          <button
            class="btn btn--sm btn--primary"
            @click=${() => {
              if (_searchQuery.trim()) _searchResults = DEMO_SEARCH_RESULTS;
            }}
          >Search</button>
        </div>
        ${_searchResults
          ? html`
              <div class="knowledge-results">
                ${_searchResults.map(
                  (r) => html`
                    <div class="knowledge-result">
                      <div class="knowledge-result-header">
                        <span class="knowledge-result-source">${r.source}</span>
                        <span class="knowledge-result-score">
                          <span class="knowledge-score-bar" style="width:${Math.round(r.score * 100)}%"></span>
                          ${(r.score * 100).toFixed(0)}% match
                        </span>
                      </div>
                      <div class="knowledge-result-excerpt">${r.excerpt}</div>
                    </div>
                  `,
                )}
              </div>
            `
          : nothing}
      </div>
    </div>

    <style>
      .knowledge-view {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
        padding: 0 var(--space-4) var(--space-4);
        overflow-y: auto;
        max-height: calc(100vh - 120px);
      }
      .knowledge-top {
        display: flex;
        gap: var(--space-4);
        align-items: flex-start;
      }
      .knowledge-drop-zone {
        flex: 1;
        min-height: 160px;
        border: 2px dashed var(--border);
        border-radius: var(--radius);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
        transition: border-color 0.2s, background 0.2s;
        background: var(--surface-1);
        text-align: center;
        padding: var(--space-4);
      }
      .knowledge-drop-zone:hover,
      .knowledge-drop-zone--active {
        border-color: var(--accent);
        background: var(--accent-alpha-10);
      }
      .knowledge-drop-icon { font-size: 32px; }
      .knowledge-drop-title { font-weight: 600; color: var(--text-1); }
      .knowledge-drop-sub { font-size: 12px; color: var(--text-3); }
      .knowledge-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-2);
        min-width: 220px;
      }
      .knowledge-stat-card {
        background: var(--surface-1);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: var(--space-3);
        text-align: center;
      }
      .knowledge-stat-value {
        font-size: 24px;
        font-weight: 800;
        background: linear-gradient(135deg, var(--accent), #48cfad);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .knowledge-stat-label {
        font-size: 11px;
        color: var(--text-3);
        text-transform: uppercase;
        letter-spacing: 0.07em;
        margin-top: 2px;
      }
      .knowledge-section {
        background: var(--surface-1);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: var(--space-3);
      }
      .knowledge-section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-3);
        margin-bottom: var(--space-2);
      }
      .knowledge-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .knowledge-table th {
        text-align: left;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-3);
        padding: 6px 8px;
        border-bottom: 1px solid var(--border);
      }
      .knowledge-row td {
        padding: 8px 8px;
        border-bottom: 1px solid var(--border);
        vertical-align: middle;
      }
      .knowledge-row:last-child td { border-bottom: none; }
      .knowledge-row:hover td { background: var(--surface-2); }
      .knowledge-file-icon { margin-right: 6px; }
      .knowledge-file-name { font-family: var(--font-mono); font-size: 12px; color: var(--text-1); }
      .knowledge-num { font-family: var(--font-mono); color: var(--text-2); text-align: right; }
      .knowledge-muted { color: var(--text-3); font-size: 12px; }
      .knowledge-del-btn {
        background: transparent;
        border: none;
        color: var(--text-3);
        cursor: pointer;
        font-size: 14px;
        padding: 2px 6px;
        border-radius: 4px;
        transition: color 0.15s, background 0.15s;
      }
      .knowledge-del-btn:hover { color: var(--danger); background: var(--surface-2); }
      .knowledge-search-section { display: flex; flex-direction: column; gap: var(--space-2); }
      .knowledge-search-bar {
        display: flex;
        gap: 8px;
      }
      .knowledge-search-input {
        flex: 1;
        padding: 8px 12px;
        background: var(--surface-0);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text-1);
        font-size: 13px;
        outline: none;
        transition: border-color 0.15s;
      }
      .knowledge-search-input:focus { border-color: var(--accent); }
      .knowledge-results {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .knowledge-result {
        background: var(--surface-0);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: var(--space-2) var(--space-3);
      }
      .knowledge-result-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .knowledge-result-source {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--accent);
        font-weight: 600;
      }
      .knowledge-result-score {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--text-3);
      }
      .knowledge-score-bar {
        display: inline-block;
        height: 4px;
        background: linear-gradient(90deg, var(--accent), #48cfad);
        border-radius: 2px;
        min-width: 10px;
        max-width: 80px;
      }
      .knowledge-result-excerpt {
        font-size: 13px;
        color: var(--text-2);
        line-height: 1.5;
        font-style: italic;
      }
    </style>
  `;
}
