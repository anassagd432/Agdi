import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

// Utility shared visual components mapping into our deep dark AGC design tokens

@customElement("agdi-card")
export class AgdiCard extends LitElement {
  static styles = css`
    :host {
      display: block;
      border: 1px solid var(--border);
      background: var(--card);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: var(--radius-lg);
      padding: 20px;
      transition:
        border-color var(--duration-normal) var(--ease-out),
        box-shadow var(--duration-normal) var(--ease-out);
      box-shadow:
        var(--shadow-sm),
        inset 0 1px 0 var(--card-highlight);
    }
    :host(:hover) {
      border-color: var(--border-strong);
      box-shadow:
        var(--shadow-md),
        inset 0 1px 0 var(--card-highlight);
    }
  `;

  render() {
    return html`
      <slot></slot>
    `;
  }
}

@customElement("agdi-badge")
export class AgdiBadge extends LitElement {
  @property({ type: String }) status = "default"; // "ok", "warn", "danger", "info"

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: var(--radius-full);
      background: var(--secondary);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
    :host([status="ok"]) {
      border-color: rgba(16, 185, 129, 0.3);
      color: #10b981;
      background: rgba(16, 185, 129, 0.1);
    }
    :host([status="warn"]) {
      border-color: rgba(245, 158, 11, 0.3);
      color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
    }
    :host([status="danger"]) {
      border-color: rgba(239, 68, 68, 0.3);
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    :host([status="info"]) {
      border-color: rgba(0, 213, 255, 0.3);
      color: var(--accent);
      background: rgba(0, 213, 255, 0.1);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 6px currentColor;
    }
  `;

  render() {
    return html`
      ${
        this.status !== "default"
          ? html`
              <div class="dot"></div>
            `
          : ""
      }
      <slot></slot>
    `;
  }
}

@customElement("agdi-button")
export class AgdiButton extends LitElement {
  @property({ type: Boolean }) primary = false;
  @property({ type: Boolean }) danger = false;
  @property({ type: Boolean }) disabled = false;

  static styles = css`
    :host {
      display: inline-block;
    }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      padding: 8px 16px;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      cursor: pointer;
      transition: all var(--duration-fast) var(--ease-out);
      font-family: inherit;
    }
    button:hover {
      background: var(--bg-hover);
      border-color: var(--border-strong);
      transform: translateY(-1px);
    }
    button.primary {
      border-color: var(--accent);
      background: var(--accent);
      color: #fff;
    }
    button.primary:hover {
      background: var(--accent-hover);
      border-color: var(--accent-hover);
      box-shadow: 0 0 15px var(--accent-glow);
    }
    button.danger {
      border-color: rgba(239, 68, 68, 0.3);
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }
    button.danger:hover {
      background: rgba(239, 68, 68, 0.2);
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }
  `;

  render() {
    const classes = [];
    if (this.primary) classes.push("primary");
    if (this.danger) classes.push("danger");
    return html`<button class=${classes.join(" ")} ?disabled=${this.disabled}><slot></slot></button>`;
  }
}
