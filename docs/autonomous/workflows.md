---
title: "Workflows & Automation"
description: "Record, replay, schedule, and automate complex multi-step workflows."
---

# Workflows & Automation

AGDI can record your actions, replay them on demand, schedule tasks, watch files, and manage your clipboard intelligently.

## Workflow Record & Replay

Capture a sequence of device actions and replay them perfectly:

```typescript
import { WorkflowReplay } from "agdi/autonomous";

const workflow = new WorkflowReplay();

// Load a saved workflow
const saved = await workflow.load("daily-report.json");

// Replay it
const result = await workflow.replay(saved);
console.log(`Replayed ${result.stepsCompleted} steps in ${result.durationMs}ms`);
```

## Task Scheduler

Cron-like scheduling for automated tasks:

```typescript
import { TaskScheduler } from "agdi/autonomous";

const scheduler = new TaskScheduler();

// Schedule a task
scheduler.add({
  name: "daily-backup",
  schedule: { cron: "0 2 * * *" }, // 2 AM daily
  command: "tar -czf /backup/daily.tar.gz /home/user/documents",
});

// Start the scheduler
scheduler.start();
```

## File Watcher

Trigger actions when files change:

```typescript
import { FileWatcher } from "agdi/autonomous";

const watcher = new FileWatcher();

watcher.addRule({
  path: "/home/user/downloads",
  pattern: "*.pdf",
  action: "move",
  destination: "/home/user/documents/pdfs",
});

watcher.start();
```

## Smart Clipboard

AI-powered clipboard with history and semantic search:

```typescript
import { SmartClipboard } from "agdi/autonomous";

const clipboard = new SmartClipboard();

// Get clipboard history
const history = await clipboard.getHistory(20);

// Search by content
const results = await clipboard.search("email address");

// Pin important entries
await clipboard.pin(history[0].id);
```

## REST API

Control the autonomous agent remotely:

```bash
# Start the REST API server
agdi agent --rest-api --port 7778

# Send a command
curl -X POST http://localhost:7778/api/command \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"command": "open spotify and play jazz"}'

# Take a screenshot
curl http://localhost:7778/api/screenshot > screen.png

# Get agent status
curl http://localhost:7778/api/status
```
