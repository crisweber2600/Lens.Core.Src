# Lens Module

> Unified lifecycle router — one agent, one interface, every phase.

Lens is a global BMAD module that provides a single `@lens` agent as the entry point to the entire BMAD lifecycle. It replaces the multi-agent lens-work architecture with skills-based internal delegation and inline governance.

## Quick Start

```
@lens /onboard          # First-time setup
@lens /new              # Create initiative
@lens /pre-plan         # Start brainstorming
```

## Commands

### Phase Commands
| Command | Description |
|---------|-------------|
| `/pre-plan` | Brainstorming, discovery, vision |
| `/plan` | Product requirements, epics |
| `/tech-plan` | Architecture, technical design |
| `/Story-Gen` | Generate implementation stories |
| `/Review` | Implementation readiness checks |
| `/Dev` | Implementation loop |

### Initiative Commands
| Command | Description |
|---------|-------------|
| `/new` | Create initiative (domain/service/feature) |
| `/switch` | Switch active initiative |

### State & Recovery
| Command | Description |
|---------|-------------|
| `/status` | Compact status view |
| `/lens` | Full context view |
| `/sync` | Reconcile state with git |
| `/fix` | Repair corrupted state |
| `/resume` | Resume interrupted workflow |

### Discovery
| Command | Description |
|---------|-------------|
| `/onboard` | First-time setup |
| `/discover` | Scan repositories |
| `/bootstrap` | Initialize BMAD in target repos |

## Architecture

- **Single agent** (`@lens`) with 5 internal skills
- **Skills:** git-orchestration, state-management, discovery, constitution, checklist
- **Two-file state:** state.yaml (mutable) + event-log.jsonl (immutable)
- **Background workflows** auto-triggered at workflow boundaries
- **Constitution checks** inline at every step (not separate workflows)
- **Flat branch naming** — no slashes, hyphen-separated

## Dependencies

**Required:** core, bmm, bmb, cis, tea
**Optional:** bmgd (domain-activated)

## Documentation

- [Getting Started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Configuration](docs/configuration.md)
- [Branch Topology](docs/branch-topology.md)
- [Constitution Guide](docs/constitution-guide.md)
- [Migration from lens-work](docs/migration-from-lens-work.md)
- [Copilot Instructions](docs/copilot-instructions.md)
- [Troubleshooting](docs/troubleshooting.md)
- [API Reference](docs/api-reference.md)

## Module Code

`lens`
