# Feature Matrix — AGDI E2E Verification

## Core Dashboard Features (1–15)

| # | Feature | Route / UI Entry | Backend Dep | Preconditions | Test Case | Evidence | Runnable |
|---|---------|-----------------|-------------|---------------|-----------|----------|----------|
| 1 | Chat | `/chat` | WS `chat.send`, events `chat.*` | Gateway running | Send msg, get response | WS req/res log | EXTERNAL OPTIONAL |
| 2 | Overview | `/overview` | WS snapshot (health, presence) | Gateway running | Page loads, stats render | curl HTTP 200 | LOCAL-ONLY |
| 3 | Channels list | `/channels` | WS `channels.*` | Gateway running | List loads, adapter forms render | curl HTTP 200 | LOCAL-ONLY |
| 4 | Instances | `/instances` | WS snapshot (presence) | Gateway running | List loads | curl HTTP 200 | LOCAL-ONLY |
| 5 | Sessions | `/sessions` | WS `sessions.*` | Gateway running | List loads, detail opens | WS req/res log | LOCAL-ONLY |
| 6 | Usage | `/usage` | WS `usage.*` | Gateway running | Metrics load, no NaN | WS req/res log | LOCAL-ONLY |
| 7 | Cron Jobs | `/cron` | WS `cron.*` | Gateway running | List loads, create form | WS req/res log | LOCAL-ONLY |
| 8 | Agents | `/agents` | WS `agents.*` | Gateway running | List loads, detail panels | WS req/res log | LOCAL-ONLY |
| 9 | Skills | `/skills` | WS `skills.*` | Gateway running | List, enable/disable | WS req/res log | LOCAL-ONLY |
| 10 | Nodes | `/nodes` | WS `nodes.*` | Gateway running | Device list, approval panel | WS req/res log | LOCAL-ONLY |
| 11 | Config | `/config` | WS `config.*` | Gateway running | Load form, edit, save | WS req/res log | LOCAL-ONLY |
| 12 | Debug | `/debug` | WS snapshot, manual RPC | Gateway running | Snapshot renders | WS req/res log | LOCAL-ONLY |
| 13 | Logs | `/logs` | WS `logs.*` | Gateway running | Live tail streams | WS req/res log | LOCAL-ONLY |
| 14 | Jarvis Voice | Top-bar mic btn | WS `jarvis.status/start/stop` | Jarvis backend | Toggle, status badge | WS req/res log | EXTERNAL OPTIONAL |
| 15 | Security Headers | All HTTP responses | `control-ui-csp.ts` | Gateway running | CSP, X-Frame, nosniff | `curl -I` output | LOCAL-ONLY |

## Agent-Mode Capabilities (16–25)

| # | Feature | Route / UI Entry | Backend Dep | Preconditions | Test Case | Evidence | Runnable |
|---|---------|-----------------|-------------|---------------|-----------|----------|----------|
| 16 | Provider/model selection | `/config` → models section | `config.get/set`, model registry | API key in config | List providers, select model | WS req/res log | EXTERNAL OPTIONAL |
| 17 | Browser tool | `/chat` → tool trace | `tools.browser.*`, exec approval | Browser service ready | Instruct: "open example.com, screenshot" | Artifact file (screenshot) | LOCAL-ONLY |
| 18 | Shell tool | `/chat` → tool trace | `tools.exec.*`, exec approval | Sandbox workspace | Instruct: "run `node -v`" | WS log + output text | LOCAL-ONLY |
| 19 | Filesystem tool | `/chat` → tool trace | `tools.fs.*` | Sandbox workspace | Write file, read back | Artifact file path | LOCAL-ONLY |
| 20 | Canvas tool | `/chat` → canvas panel | `canvas.*` | Canvas host mounted | Create artifact, render | Canvas HTTP 200 | LOCAL-ONLY |
| 21 | Sub-agents | `/agents` → spawn | `agents.spawn`, events | Agent config | Spawn agent, get result | WS event log | MOCK REQUIRED |
| 22 | Approval gates | `/nodes` → exec-approvals | `exec.approve/deny`, queue | Exec approval enabled | Submit dangerous cmd, deny, verify blocked | WS req/res log | LOCAL-ONLY |
| 23 | Tool policies | `/config` → tools section | `config.get/set` (tools policy) | Policy configured | Set deny rule, verify tool blocked | WS req/res log | LOCAL-ONLY |
| 24 | Cron triggers agent | `/cron` → create job | `cron.create`, heartbeat | Cron + agent configured | Create cron job, verify it fires | Log stream excerpt | MOCK REQUIRED |
| 25 | Channel ingress mock | `/channels` → adapter | Channel adapter interface | Mock adapter | Send inbound msg via mock, verify delivery | WS event log | MOCK REQUIRED |

## Evidence Requirements (All Rows)

| # | Evidence Type | Detail |
|---|--------------|--------|
| 1 | WS log | `chat.send` request + response payload |
| 2 | HTTP | `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:19001/overview` |
| 3 | HTTP | Same curl pattern for `/channels` |
| 4 | HTTP | Same curl pattern for `/instances` |
| 5 | WS log | `sessions.list` response |
| 6 | WS log | `usage.query` response — assert no `NaN` |
| 7 | WS log | `cron.list` response |
| 8 | WS log | `agents.list` response |
| 9 | WS log | `skills.list` response |
| 10 | WS log | `nodes.list` response |
| 11 | WS log | `config.get` + `config.set` round-trip |
| 12 | WS log | snapshot payload |
| 13 | WS log | `logs.tail` event stream |
| 14 | WS log | `jarvis.status` response |
| 15 | curl output | `curl -I http://127.0.0.1:19001/` headers |
| 16 | WS log | `config.get` → models section |
| 17 | Artifact | Screenshot file in workspace |
| 18 | WS log | `exec` tool output text |
| 19 | Artifact | Written file content matches read |
| 20 | HTTP | `curl http://127.0.0.1:19001/__agdi__/canvas/` → 200 |
| 21 | WS log | `agents.spawn` + result event |
| 22 | WS log | `exec.approve` denied → tool blocked |
| 23 | WS log | Policy violation error returned |
| 24 | Log excerpt | Cron trigger line in gateway log |
| 25 | WS log | Mock channel inbound → chat delivery |

## Mock Strategy

### Channel Mock (rows 3, 25)
- Use `AGDI_SKIP_CHANNELS=1` (already used in dev). For row 25, create a minimal test that sends a mock inbound message via the hooks HTTP endpoint (`POST /hooks/message`) with a valid hook token. No external provider needed.

### Model Provider Mock (rows 1, 16, 21, 24)
- Chat requires a real LLM API key OR the existing `echo` test model if available. Check `src/models/` for a test/echo provider. If none exists, these rows are EXTERNAL OPTIONAL.

### Sub-agent Mock (row 21)
- Requires a configured agent workspace. Can use the dev workspace (`~/.agdi/workspace-dev`). Mock by creating a minimal agent config that echoes input.

### Cron Mock (row 24)
- Create a cron job with a short interval (e.g., `*/1 * * * *`) that triggers a trivial action (e.g., log a message). Verify via log tail.
