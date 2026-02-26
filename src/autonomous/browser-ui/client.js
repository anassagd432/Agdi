/**
 * Dashboard client — connects to the agent dashboard via WebSocket.
 *
 * Features:
 * - Live desktop/browser view switching
 * - Natural language command bar
 * - Voice control (Web Speech API)
 * - Approval modal (Allow/Deny/Always Allow)
 * - Workflow recording controls
 * - Goal management, logs, brain stats
 */

// @ts-nocheck — this runs in the browser

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let ws = null;
let reconnectTimer = null;
const state = {
  connected: false,
  agentState: "idle",
  viewMode: "desktop", // 'desktop' or 'browser'
  voiceListening: false,
  recording: false,
  goals: [],
  logs: [],
  approvalQueue: [],
};

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

function connect() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${protocol}//${location.host}`);

  ws.onopen = () => {
    state.connected = true;
    updateConnectionDot(true);
    ws.send(JSON.stringify({ type: "get_state" }));
  };

  ws.onclose = () => {
    state.connected = false;
    updateConnectionDot(false);
    reconnectTimer = setTimeout(connect, 3000);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleMessage(msg);
    } catch {
      /* skip */
    }
  };
}

function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

function handleMessage(msg) {
  switch (msg.type) {
    case "full_state":
      updateFullState(msg);
      break;

    case "screenshot":
      if (state.viewMode === "browser") updateBrowserView(msg.data, msg.url);
      break;

    case "desktop_frame":
      if (state.viewMode === "desktop") updateDesktopView(msg.data);
      break;

    case "agent_overlay":
      updateOverlay(msg);
      break;

    case "state_change":
      updateAgentState(msg.state);
      break;

    case "goal_added":
    case "goal_completed":
    case "goal_failed":
    case "goal_cancelled":
      send({ type: "get_state" });
      addLogEntry(msg);
      break;

    case "action_executed":
      addLogEntry(msg);
      break;

    case "approval_request":
      showApprovalModal(msg);
      break;

    case "tts_speak":
      speak(msg.text, msg.rate);
      break;

    case "nl_result":
      showCommandResult(msg);
      break;

    case "voice_result":
      addLogEntry({ type: "voice_command", detail: msg.transcript, timestamp: Date.now() });
      break;

    default:
      addLogEntry(msg);
  }
}

// ---------------------------------------------------------------------------
// View updates
// ---------------------------------------------------------------------------

function updateConnectionDot(connected) {
  const dot = document.getElementById("connectionDot");
  if (dot) dot.className = `connection-dot ${connected ? "connected" : ""}`;
}

function updateAgentState(agentState) {
  state.agentState = agentState;
  const badge = document.getElementById("statusBadge");
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  if (badge) badge.className = `status-badge ${agentState}`;
  if (dot) dot.className = `status-dot ${agentState}`;
  if (text) text.textContent = agentState.toUpperCase();
}

function updateBrowserView(base64, url) {
  const img = document.getElementById("browserImg");
  const placeholder = document.getElementById("placeholder");
  if (img) {
    img.src = `data:image/jpeg;base64,${base64}`;
    img.style.display = "block";
  }
  if (placeholder) placeholder.style.display = "none";
  if (url) {
    const urlInput = document.getElementById("urlInput");
    if (urlInput) urlInput.value = url;
  }
}

function updateDesktopView(base64) {
  const img = document.getElementById("browserImg");
  const placeholder = document.getElementById("placeholder");
  if (img) {
    img.src = `data:image/png;base64,${base64}`;
    img.style.display = "block";
  }
  if (placeholder) placeholder.style.display = "none";
}

function updateOverlay(msg) {
  const overlay = document.getElementById("actionOverlay");
  const text = document.getElementById("actionText");
  const reasoning = document.getElementById("actionReasoning");
  if (!overlay) return;

  overlay.classList.add("visible");
  if (text) text.textContent = `${msg.action || ""}`;
  if (reasoning) reasoning.textContent = msg.thinking || msg.reasoning || "";

  // Auto-hide after 5s if idle
  if (msg.state === "idle") {
    setTimeout(() => overlay.classList.remove("visible"), 3000);
  }
}

function updateFullState(msg) {
  if (msg.state) updateAgentState(msg.state);
  if (msg.goalCount !== undefined) {
    const el = document.getElementById("goalCount");
    if (el) el.textContent = msg.goalCount;
  }
  if (msg.memoryCount !== undefined) {
    const el = document.getElementById("memoryCount");
    if (el) el.textContent = msg.memoryCount;
  }
  if (msg.rulesCount !== undefined) {
    const el = document.getElementById("rulesCount");
    if (el) el.textContent = msg.rulesCount;
  }
  if (msg.goals) {
    state.goals = msg.goals;
    renderGoals();
  }
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

function renderGoals() {
  const list = document.getElementById("goalList");
  if (!list) return;

  if (state.goals.length === 0) {
    list.innerHTML =
      '<div class="empty-state"><div class="emoji">🎯</div><div>No goals yet. Add one above or tell the agent what to do!</div></div>';
    return;
  }

  list.innerHTML = state.goals
    .map(
      (goal) => `
    <div class="goal-card ${goal.active ? "active" : ""}">
      <div class="goal-header">
        <div class="goal-desc">${goal.description || goal.goal || ""}</div>
        <div class="goal-priority ${goal.priority || "normal"}">${goal.priority || "normal"}</div>
      </div>
      <div class="goal-meta">
        <div class="goal-status">${goal.status || "queued"}</div>
      </div>
      <div class="goal-actions">
        <button onclick="cancelGoal('${goal.id}')" class="danger">Cancel</button>
      </div>
    </div>
  `,
    )
    .join("");
}

function addGoal() {
  const input = document.getElementById("goalInput");
  const priority = document.getElementById("goalPriority");
  if (!input?.value.trim()) return;

  send({ type: "add_goal", description: input.value, priority: priority?.value || "normal" });
  input.value = "";
}

function cancelGoal(id) {
  send({ type: "cancel_goal", goalId: id });
}

// ---------------------------------------------------------------------------
// Natural Language Command
// ---------------------------------------------------------------------------

function sendCommand() {
  const input = document.getElementById("commandInput");
  if (!input?.value.trim()) return;

  const cmd = input.value;
  input.value = "";

  send({ type: "nl_command", command: cmd });

  addLogEntry({
    type: "user_command",
    detail: cmd,
    timestamp: Date.now(),
  });
}

function showCommandResult(msg) {
  const detail = msg.success
    ? `✅ ${msg.actions?.length || 0} actions in ${msg.durationMs}ms`
    : `❌ ${msg.error}`;
  addLogEntry({ type: "command_result", detail, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// Approval Modal
// ---------------------------------------------------------------------------

function showApprovalModal(msg) {
  state.approvalQueue.push(msg);
  renderApprovalModal();
}

function renderApprovalModal() {
  if (state.approvalQueue.length === 0) {
    const modal = document.getElementById("approvalModal");
    if (modal) modal.style.display = "none";
    return;
  }

  const req = state.approvalQueue[0];
  const modal = document.getElementById("approvalModal");
  const desc = document.getElementById("approvalDesc");
  const risk = document.getElementById("approvalRisk");

  if (modal) modal.style.display = "flex";
  if (desc) desc.textContent = req.description;
  if (risk) {
    risk.textContent = req.riskLevel;
    risk.className = `approval-risk ${req.riskLevel}`;
  }
}

function resolveApproval(approved, alwaysAllow = false) {
  if (state.approvalQueue.length === 0) return;
  const req = state.approvalQueue.shift();
  send({
    type: "approval_response",
    requestId: req.id,
    approved,
    alwaysAllow,
  });
  renderApprovalModal();
}

// ---------------------------------------------------------------------------
// Voice
// ---------------------------------------------------------------------------

let recognition = null;

function toggleVoice() {
  if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
    alert("Speech recognition is not supported in this browser. Use Chrome.");
    return;
  }

  if (state.voiceListening) {
    stopVoice();
  } else {
    startVoice();
  }
}

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    state.voiceListening = true;
    updateVoiceButton(true);
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      }
    }
    if (finalTranscript) {
      send({
        type: "voice_transcript",
        transcript: finalTranscript,
        confidence: event.results[0][0].confidence || 1,
      });
      const input = document.getElementById("commandInput");
      if (input) input.value = finalTranscript;
    }
  };

  recognition.onerror = (event) => {
    console.error("Voice error:", event.error);
    stopVoice();
  };

  recognition.onend = () => {
    if (state.voiceListening) {
      // Auto-restart
      try {
        recognition.start();
      } catch {
        stopVoice();
      }
    }
  };

  recognition.start();
}

function stopVoice() {
  state.voiceListening = false;
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  updateVoiceButton(false);
}

function updateVoiceButton(listening) {
  const btn = document.getElementById("voiceBtn");
  if (btn) {
    btn.classList.toggle("active", listening);
    btn.textContent = listening ? "🎙️" : "🎤";
    btn.title = listening ? "Stop listening" : "Start voice control";
  }
}

function speak(text, rate = 1.0) {
  if (!window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = 1;
  speechSynthesis.speak(utterance);
}

// ---------------------------------------------------------------------------
// View mode toggle
// ---------------------------------------------------------------------------

function setViewMode(mode) {
  state.viewMode = mode;
  const desktopBtn = document.getElementById("viewDesktop");
  const browserBtn = document.getElementById("viewBrowser");
  if (desktopBtn) desktopBtn.classList.toggle("active", mode === "desktop");
  if (browserBtn) browserBtn.classList.toggle("active", mode === "browser");

  // Tell server which stream we want
  send({ type: "set_view_mode", mode });
}

// ---------------------------------------------------------------------------
// Workflow recording
// ---------------------------------------------------------------------------

function toggleRecording() {
  if (state.recording) {
    // Stop recording — prompt for name
    const name = prompt("Save workflow as:", "My Workflow");
    if (!name) return;
    send({ type: "workflow_stop", name });
    state.recording = false;
  } else {
    send({ type: "workflow_start" });
    state.recording = true;
  }
  updateRecordButton();
}

function updateRecordButton() {
  const btn = document.getElementById("recordBtn");
  if (btn) {
    btn.classList.toggle("recording", state.recording);
    btn.textContent = state.recording ? "⏹️ Stop" : "⏺️ Record";
    btn.title = state.recording ? "Stop recording" : "Record workflow";
  }
}

// ---------------------------------------------------------------------------
// Sidebar tabs
// ---------------------------------------------------------------------------

function switchTab(tab) {
  document.querySelectorAll(".sidebar-tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));

  const tabBtn = document.querySelector(`.sidebar-tab[onclick*="${tab}"]`);
  const panel = document.getElementById(`tab-${tab}`);
  if (tabBtn) tabBtn.classList.add("active");
  if (panel) panel.classList.add("active");
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

function addLogEntry(msg) {
  const list = document.getElementById("logList");
  if (!list) return;

  const entry = document.createElement("div");
  entry.className = "log-entry";

  const time = new Date(msg.timestamp || Date.now()).toLocaleTimeString();
  const eventType = msg.type || "unknown";
  const detail = msg.detail || msg.description || msg.action || "";

  entry.innerHTML = `
    <span class="timestamp">${time}</span>
    <span class="event-type ${eventType}">${eventType.replace(/_/g, " ")}</span>
    <div class="event-detail">${detail}</div>
  `;

  list.prepend(entry);

  // Keep max 200 entries
  while (list.children.length > 200) {
    list.removeChild(list.lastChild);
  }
}

// ---------------------------------------------------------------------------
// Nav actions
// ---------------------------------------------------------------------------

function sendMessage() {
  const input = document.getElementById("messageInput");
  if (!input?.value.trim()) return;
  send({ type: "user_message", text: input.value });
  input.value = "";
}

function navigateToUrl() {
  const input = document.getElementById("urlInput");
  if (!input?.value.trim()) return;
  send({ type: "navigate", url: input.value });
}

function navigateBack() {
  send({ type: "navigate_back" });
}
function navigateForward() {
  send({ type: "navigate_forward" });
}
function reloadPage() {
  send({ type: "reload" });
}
function runImprovement() {
  send({ type: "run_improvement" });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

connect();
