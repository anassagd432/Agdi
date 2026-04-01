<div align="center">
  <h1>⚡ Agdi ⚡</h1>
  <p><b>The AI that actually does things.</b></p>
  
  [![Version](https://img.shields.io/badge/version-2026.3.24-blue.svg)](#)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](#)
  [![Node.js](https://img.shields.io/badge/Node.js-22.14+-brightgreen.svg)](#)

  <p>
    An advanced, open-source orchestration system for AI agents. Run it anywhere, connect to any model, deploy to any messaging channel, and securely execute real-world tasks.
  </p>
</div>

---

## 📦 Installation

Agdi is distributed with zero-friction native OS installers. You don't even need Node.js!

- **Windows**: Download `agdi-windows.exe` from the latest GitHub Release.
- **macOS**: Download the `agdi-macos` binary from the latest GitHub Release.
- **Linux**: Download the `agdi-linux` binary from the latest GitHub Release.

Once downloaded, simply run the executable in your terminal to launch the setup wizard and access the dashboard!

*(Alternatively, if you prefer using npm: run `npm install -g agdi`)*

---

## 🌟 Comprehensive Capabilities

Agdi is not just a chatbot—it is a full-fledged agentic orchestration platform. Here is everything it can do out of the box:

### 🧠 Model Agnostic (Bring Your Own AI)
Seamlessly switch between the best AI models in the world without changing your workflow.
- **Anthropic Claude** (Opus, Sonnet, Haiku)
- **OpenAI** (GPT-4o, GPT-4 Turbo)
- **Google Gemini** (Pro, Flash)
- **Local Models** (Llama 3, Mistral, via Ollama & LM Studio)
- **Vision & Audio Processing** (Send images, documents, and voice notes directly to the AI)

### 💬 Universal Messaging Channels
Interact with your AI assistant where you already spend your time. Agdi natively connects to:
- **Discord** (Threads, direct messages, attachments)
- **Slack** (Interactive buttons, thread tracking)
- **Microsoft Teams** (Rich cards, streaming replies, seamless enterprise integration)
- **Telegram & WhatsApp**
- **Apple iMessage & SMS** (via macOS integration)
- **Web Dashboard** (Built-in rich chat interface)

### 🔌 Powerful Plugin & Skill Ecosystem
Give your AI the tools it needs to take action in the real world.
- **File System & Terminal:** Securely read/write files and execute shell commands.
- **Web Browsing & Search:** Search the internet, summarize articles, and extract data from websites.
- **Smart Home Controls:** Control Philips Hue, Sonos, Eight Sleep, and other IoT devices.
- **Productivity Apps:** Read and write to Apple Notes, Notion, Google Calendar, and Trello.
- **GitHub & DevOps:** Automate PR reviews, issue management, and GitHub Actions.
- *Plus dozens of community plugins easily installable via `agdi skills list`.*

### 🔐 Unmatched Privacy & Security
- **Local First:** All your API keys, configuration files, and chat logs are stored strictly on your local machine (or your VPS). Nothing routes through third-party telemetry servers.
- **Execution Guardrails:** Fine-grained permissions ensure the AI cannot run destructive terminal commands or access sensitive files without explicit approval.
- **Secure Remote Access:** Built-in Tailscale support allows you to securely access your Agdi instance remotely without exposing ports to the public internet.

### 🖥️ Built-In Control Dashboard
Agdi ships with a stunning, local web dashboard designed for true control:
- Manage running agents and monitor CPU/Memory usage.
- Install, configure, and toggle plugins with a single click.
- Review and approve pending tool execution requests.
- Read analytics, token usage, and execution traces.

---

## 🚀 Getting Started (From Source)

If you prefer to run Agdi from source or contribute to the project:

### Prerequisites
- [Node.js](https://nodejs.org/) v22.14 or higher
- [pnpm](https://pnpm.io/) v10.32+

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/anassagd432/Agdi.git
   cd Agdi
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Build the core engine:**
   ```bash
   pnpm build
   ```

4. **Start the application:**
   ```bash
   pnpm dev
   ```

---

## 📚 Documentation & Help

To see all available CLI commands, simply run `agdi --help`. 

For complete guides on configuring specialized channels (like provisioning the Slack bot or setting up Microsoft Teams), configuring Docker, or developing your own custom plugins using the Agdi plugin SDK architecture, check the `docs/` folder in this repository.

<br/>
<div align="center">
  <i>Built with ❤️ for true automation.</i>
</div>
