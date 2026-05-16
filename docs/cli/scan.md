---
title: "agdi scan"
description: "Run quick diagnostic health checks"
---

# agdi scan

Run a comprehensive diagnostic scan to check the health of your Agdi installation, gateway, channels, and configuration.

## Usage

```bash
agdi scan [options]
```

## Options

- `--json` - Output results in JSON format (useful for scripting and CI/CD)

## Exit Codes

The command returns different exit codes based on scan results:

| Exit Code | Meaning | Description |
|-----------|---------|-------------|
| `0` | Success | All checks passed |
| `1` | Warnings | Some checks have warnings but no critical issues |
| `2` | Critical | Critical issues detected that require immediate attention |

## What It Checks

The scan performs the following health checks:

1. **Gateway Running** - Verifies the gateway service is running and reachable
2. **Gateway RPC** - Validates RPC communication with the gateway
3. **Configuration** - Ensures config loads without errors
4. **Channels** - Reports how many channels are configured
5. **Authentication** - Checks if gateway auth is set up

## Example Output

### Healthy System

```
Agdi Debugging Scan
Started: 2026-05-16T10:30:45.123Z

✓ Gateway Running: Gateway service is running
✓ Gateway RPC: Gateway RPC is responding
✓ Configuration: Config loads successfully
✓ Channels: 3 channel(s) configured
✓ Authentication: Gateway auth is configured

────────────────────────────────────────────────────────────
Summary: 5 passed
Duration: 1.2s
```

### System with Issues

```
Agdi Debugging Scan
Started: 2026-05-16T10:30:45.123Z

✗ Gateway Running: Gateway service is not running
  → Run: agdi gateway start
⚠ Gateway RPC: Gateway RPC not reachable
  → Run: agdi gateway probe
✓ Configuration: Config loads successfully
⚠ Channels: No channels configured
✓ Authentication: No gateway auth configured (optional)

────────────────────────────────────────────────────────────
Summary: 2 passed, 2 warnings, 1 critical
Duration: 0.8s
```

## JSON Output

Use the `--json` flag for machine-readable output:

```bash
agdi scan --json
```

Returns:

```json
{
  "totalChecks": 5,
  "passed": 2,
  "warnings": 2,
  "critical": 1,
  "duration": 823,
  "timestamp": "2026-05-16T10:30:45.123Z",
  "results": [
    {
      "check": "Gateway Running",
      "severity": "critical",
      "message": "Gateway service is not running",
      "duration": 142,
      "repairCommand": "agdi gateway start"
    }
  ]
}
```

## Use Cases

### Quick Health Check

Run a quick scan to verify your Agdi installation is healthy:

```bash
agdi scan
```

### CI/CD Integration

Use in CI/CD pipelines to verify deployment health:

```bash
#!/bin/bash
agdi scan --json > health-report.json

if [ $? -gt 1 ]; then
  echo "Critical issues detected, failing build"
  exit 1
fi
```

### Monitoring Scripts

Check health periodically:

```bash
# Check every 5 minutes
*/5 * * * * /usr/local/bin/agdi scan --json >> /var/log/agdi-health.log
```

### Troubleshooting

When something isn't working, run scan first to identify the issue:

```bash
agdi scan
# Follow the repair commands shown in output
```

## Comparison with Other Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `agdi scan` | Quick health check (5 checks, ~1s) | Fast triage, CI/CD, monitoring |
| `agdi doctor` | Comprehensive diagnostics + repairs | Deep troubleshooting, setup issues |
| `agdi status` | Config overview | Check what's configured |
| `agdi health` | Gateway RPC health details | Gateway-specific debugging |

## Tips

- Run `agdi scan` first when troubleshooting - it's fast and points you in the right direction
- Use `--json` in scripts to parse results programmatically
- Exit codes make it easy to use in shell scripts and CI/CD pipelines
- For deeper diagnostics after scan shows issues, use `agdi doctor`

## Related Commands

- [agdi doctor](/cli/doctor) - Comprehensive health checks with auto-repair
- [agdi status](/cli/status) - View configuration and channel status
- [agdi health](/cli/health) - Detailed gateway health information
- [agdi gateway](/gateway) - Gateway management commands
