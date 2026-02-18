```prompt
---
description: Fast health check for confidence scoring without full discovery
---

Activate Scout agent and execute repo-status:

1. Load agent: `_bmad/lens-work/agents/scout.agent.yaml`
2. Execute `repo-status` command for quick health check
3. Return confidence scores without full scan
4. Identify unhealthy repos

**Use When:**
- Quick diagnostics needed
- Pre-documentation health check
- Confidence scoring for layer detection

**Output:**
```
🔍 Repo Health Check
├── ✅ api-gateway (healthy, 98% confidence)
├── ✅ payment-service (healthy, 95% confidence)
├── ⚠️ old-gateway (unhealthy: detached HEAD)
└── Summary: 2 healthy, 1 unhealthy
```

**Faster than:** Full `discover` operation

```
