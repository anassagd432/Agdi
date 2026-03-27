<div align="center">
  <h1>⚡ Agdi ⚡</h1>
  <p><b>The AI that actually does things.</b></p>
  
  [![Version](https://img.shields.io/badge/version-2026.3.24-blue.svg)](#)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](#)
  [![Node.js](https://img.shields.io/badge/Node.js-22.14+-brightgreen.svg)](#)

  <p>
    An advanced, open-source orchestration system for AI agents. Connect to any model, deploy to any channel, and securely execute real-world tasks.
  </p>
</div>

---

## 🌟 Key Features

- 🧠 **Bring Your Own Model:** Seamlessly swap between Anthropic Claude, OpenAI, Google Gemini, local Llama models, and more.
- 💬 **Universal Channels:** Deploy your assistant directly to Discord, Slack, Microsoft Teams, Telegram, WhatsApp, iOS/macOS via iMessage, or use the built-in web dashboard.
- 🔌 **Extensible Plugin Ecosystem:** Install community skills to let Agdi browse the web, manage your calendar, control smart home devices, run shell commands, or write code.
- 🔒 **Privacy & Control:** Strong secure defaults. Run everything locally, set up fine-grained allowed actions, and never expose your API keys to third-party servers.
- 🚀 **High Performance:** Built on modern TypeScript/Node.js architecture for speed and reliability.

## 🚀 Quickstart

### Prerequisites
- [Node.js](https://nodejs.org/) v22.14 or higher
- [pnpm](https://pnpm.io/) v10.32+

### Installation

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

*(For a global CLI installation, you can link the package locally: `npm link`)*

## 🧩 Extensions & Plugins

Agdi is designed to be highly extensible. The `extensions/` directory contains dozens of supported plugins ranging from API connectors to full messaging interfaces.

To manage plugins, simply use the powerful built-in Skill Management UI or the CLI:
```bash
agdi skills list
```

## 📚 Documentation
For complete guides on configuring channels, adding API keys, writing your own custom extensions, and setting up Docker containers, please refer to the `docs/` folder in this repository.

## 🛡️ Security

Agdi provides a robust set of security guardrails, especially when granting the AI access to your terminal or file system. Always run the platform in a sandboxed environment if exposing it to untrusted models or users.

---

<div align="center">
  <i>Built with ❤️ for true automation.</i>
</div>
