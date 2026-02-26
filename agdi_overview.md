# Agdi: The Personal AI Assistant Gateway

## Context & Vision

Agdi (formerly OpenClaw) is a comprehensive, self-hosted personal AI assistant designed to live on your own devices and seamlessly integrate into your daily digital life. The project’s core ethos is built around creating an AI agent that feels truly local, fast, heavily integrated, and persistently available.

Unlike typical web-based LLM chats (like ChatGPT or Claude's web interfaces), Agdi brings the AI to the platforms you already use. It transforms your preferred Large Language Models (optimally Anthropic Claude or OpenAI GPT) into a robust, always-on omnipresent assistant that can see your screen, run code, interact in group chats, manage automation, and actively assist across all your devices.

Agdi was originally built to power "Molty," a space lobster AI assistant, and has evolved into an extensible, multi-channel platform.

## What Problem Does It Solve?

1. **Fragmentation of AI Access:** Users typically switch out of their workflows to open an AI tab. Agdi brings the AI directly to WhatsApp, Telegram, iMessage, Discord, Slack, and native OS interfaces.
2. **Lack of True Agentic Autonomy:** Most AI tools converse but can't act. Agdi is built on the Pi agent runtime with RPC (Remote Procedure Call) integration, allowing the AI to run system commands, use browsers, edit files, and invoke scripts (all within a controlled/sandboxed environment).
3. **Data Control & Vendor Lock-in:** By running the Gateway locally, you own the control plane. You choose the LLM (OpenAI, Anthropic, or local fallback models), and you set up sandboxing rules (via Docker) to protect your systems. You aren't beholden to a specific AI subscription for your whole workflow.
4. **Multimodal Seamlessness:** The AI needs to see and hear you. Agdi supports Voice Wake, always-on "Talk Mode," camera node connections, live Canvas UI mapping, and system audio interfaces via ElevenLabs integrations.

## Core Architecture

Agdi operates on a highly decoupled node-and-gateway architecture:

- **The Local-First Gateway:** The central hub (typically running on your machine or a remote Linux server) that handles routing, WebSocket connections, event webhooks, cron jobs, and LLM communication.
- **Nodes/Companions:** Devices (macOS, iOS, Android) that connect to the Gateway. The Gateway can ask nodes to perform local actions, such as taking a screen recording, capturing a webcam photo, playing audio, or showing UI via the A2UI Canvas.
- **Channels:** The protocol layers connecting the Gateway to messaging platforms (using libraries like Baileys for WhatsApp, grammY for Telegram, Bolt for Slack, discord.js, etc.).
- **The Pi Agent Runtime:** The brain of the system that evaluates tools, executes thinking blocks, processes commands, and yields responses.

## Key Features & Capabilities

### 1. Massive Multi-Channel Support

Agdi essentially acts as a multi-protocol inbox for AI interaction. It supports:

- **Consumer Chat:** WhatsApp, Telegram, Signal.
- **Apple Ecosystem:** BlueBubbles (iMessage via server) and legacy macOS `imsg`.
- **Work/Community:** Slack, Discord, Google Chat, Microsoft Teams.
- **Protocols:** Matrix, Nostr.
- **Custom UI:** Native WebChat and mobile app interfaces.

### 2. Powerful Agentic Tools

The assistant is not just text, it has hands. It can literally take over the device and act as an operator:

- **Device Level Control (Keyboard / Mouse):** Agdi has deep OS-level access that enables the AI to directly interact with the device using keyboard and mouse events natively via `system.run` tools on macOS, Linux, and Windows.
- **Cybersecurity Capabilities:** Due to its autonomous execution flow, root/host-level bash capabilities, and ability to read real-time system logs, Agdi can conduct local security auditing, monitor system events, analyze anomalies, and potentially defend against threats in real-time.
- **Mobile Device Control (iOS & Android):** The control isn't limited to desktop. Through companion node apps, the AI can execute actions, capture live screens, retrieve GPS locations, and utilize the camera on connected iOS and Android smartphones.
- **Browser Control:** A dedicated managed Chrome/Chromium instance allows the AI to navigate the web, extract data, click, upload files, and take snapshots.
- **System Execution:** The AI can execute Bash/Terminal commands (either locally on the host, or safely sandboxed in Docker for group chats).
- **File System:** Read, write, and manipulate local text/code files.
- **Canvas (A2UI):** The AI can push real-time user interfaces (React/Lit-like components) to the user's screen.
- **Cron & Webhooks:** The agent can be instructed to run recurring jobs, act as an endpoint for webhooks, or tap into external events like Gmail Pub/Sub.
- **Session Splitting:** The AI can span sub-sessions to work on parallel tasks.

### 3. Advanced Routing & Group Behavior

Agdi implements robust logic for group chats:

- It knows how to wait for multiple users, queue messages, and conditionally reply based on mention rules or interaction patterns.
- It provides sandboxing (using Docker) specifically for non-primary sessions to prevent unauthorized users in a Discord or Telegram group from executing arbitrary code on your machine.

### 4. Mobile OS Control, Voice & Spatial "Talk Mode"

With integrated iOS, Android, and macOS nodes, the system spans all form factors:

- **Complete Android & iOS Connectivity:** Agdi goes beyond basic text messaging by enabling the Gateway to connect directly to Android and iOS companion apps. The AI has broad control to utilize these nodes to access mobile features like live screen recording, location retrieval (`location.get`), camera snapping, and rendering visual outputs via Canvas.
- **Voice Wake / Push-To-Talk:** Instantly talk to your AI like a walkie-talkie.
- **Talk Mode:** A continuous conversation overlay powered by ElevenLabs speech synthesis and transcription layers.

### 5. Extendability via Skills & Plugins

The workspace utilizes a "Skills" model (connected to a registry called clawhub.com). You can easily drop in new Markdown + script-based tools that the AI automatically learns how to use by reading the `SKILL.md` instructions.

## Conclusion

Agdi represents the transition from _AI as a Website_ to _AI as an Operating System layer_. It consolidates communication protocols, device-level capabilities, and cutting-edge LLMs into a premium user-controlled hub. By marrying rigorous local tools (headless browsers, bash execution, filesystem access) with omnipresent messaging channels, Agdi solves the problem of friction and enables true, autonomous, personalized assistance.
