#!/usr/bin/env bash
set -euo pipefail

cd /repo

export AGDI_STATE_DIR="/tmp/agdi-test"
export AGDI_CONFIG_PATH="${AGDI_STATE_DIR}/agdi.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${AGDI_STATE_DIR}/credentials"
mkdir -p "${AGDI_STATE_DIR}/agents/main/sessions"
echo '{}' >"${AGDI_CONFIG_PATH}"
echo 'creds' >"${AGDI_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${AGDI_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm agdi reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${AGDI_CONFIG_PATH}"
test ! -d "${AGDI_STATE_DIR}/credentials"
test ! -d "${AGDI_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${AGDI_STATE_DIR}/credentials"
echo '{}' >"${AGDI_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm agdi uninstall --state --yes --non-interactive

test ! -d "${AGDI_STATE_DIR}"

echo "OK"
