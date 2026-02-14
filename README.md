<p align="center">
  <h1 align="center">Claude Agent Manager</h1>
  <p align="center">
    <strong>Manage your Claude Code sessions from the terminal</strong>
  </p>
  <p align="center">
    List, inspect, search, tag, resume, and snapshot your Claude Code sessions.<br/>
    Never lose track of active work across restarts again.
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/claude-cam"><img src="https://img.shields.io/npm/v/claude-cam.svg" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/claude-cam"><img src="https://img.shields.io/npm/dm/claude-cam.svg" alt="npm downloads"></a>
  </p>
</p>

<p align="center">
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#commands">Commands</a> •
  <a href="#snapshots">Snapshots</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## Installation

### From npm

```bash
npm install -g claude-cam
```

### From source

```bash
git clone https://github.com/sharvy/claude-agent-manager.git
cd claude-agent-manager
npm link
```

After installation, `cam`, `claude-cam`, and `claude-agent-manager` all work as CLI commands:

```bash
cam status
claude-cam status
claude-agent-manager status  # all do the same thing
```

### Requirements

- **Node.js** ≥ 18.0.0
- **Claude Code** CLI installed (sessions stored in `~/.claude/`)
- **Zero runtime dependencies** — only uses Node.js built-ins

## Quick Start

```bash
# See a dashboard of all your sessions
cam status

# List sessions, filter by branch
cam list --branch feature/auth

# Inspect a specific session with conversation history
cam show 9788fdf7

# Search across all conversations
cam search "webhook idempotency"

# Save a snapshot before restarting
cam snapshot save pre-update

# Resume a specific session
cam resume 9788fdf7
```

## Commands

### `cam status`

Dashboard overview showing projects, session counts, active branches, snapshots, and recent activity.

```
╔═══════════════════════════════╗
║  📊  Agent Manager Dashboard  ║
╚═══════════════════════════════╝

  Projects    2 (/Users/you/work/project-a, /Users/you/work/project-b)
  Sessions    14 total │ 5 today │ 12 this week
  Snapshots   1 saved (pre-update: 14 sessions)
  Branches    6 active

  Recent Sessions:
    → abc12345  feature/new-ui          "Implementing dark mode support" 2h ago
    → def67890  bugfix/login-issue      "Fixing OAuth callback redirect" 30m ago
```

---

### `cam list [options]`

List sessions in a formatted table.

| Option | Description |
|--------|-------------|
| `--project <path>` | Filter by project path |
| `--branch <name>` | Filter by git branch (substring match) |
| `--tag <tag>` | Filter by tag |
| `--sort date\|messages` | Sort order (default: `date`) |
| `--limit N` | Max results (default: 20) |
| `--all` | Show all sessions |

```bash
cam list                        # all sessions
cam list --branch security      # filter by branch
cam list --tag urgent           # filter by tag
cam list --sort messages        # most active first
```

---

### `cam show <id>`

Inspect a session's full metadata and recent conversation messages.

```bash
cam show 9788fdf7               # short ID (prefix match)
cam show 9788fdf7-2691-4543...  # full ID also works
cam show 9788fdf7 --messages 20 # show last 20 messages
```

---

### `cam resume <id>`

Resume a session by launching `claude --resume` in the correct project directory.

```bash
cam resume 9788fdf7
cam resume 9788fdf7 --message "continue from where we left off"
```

---

### `cam search "query"`

Full-text search across all session conversation logs.

```bash
cam search "webhook idempotency"
cam search "authentication bug" --limit 10
```

---

<a name="snapshots"></a>
### `cam snapshot <save|list|restore|delete>`

Save and restore collections of sessions — the key feature for surviving restarts.

```bash
# Save all current sessions
cam snapshot save pre-update

# Save specific sessions only
cam snapshot save client-work --sessions 9788fdf7,8db8d7ab

# Add a description
cam snapshot save friday-eod --description "End of week state"

# List saved snapshots
cam snapshot list

# See the resume commands for a snapshot
cam snapshot restore pre-update

# Auto-launch all sessions from a snapshot
cam snapshot restore pre-update --exec

# Delete a snapshot
cam snapshot delete old-snapshot
```

---

### `cam tag <id> <tag>` / `cam untag <id> <tag>`

Tag sessions for organization and filtering.

```bash
cam tag 9788fdf7 urgent
cam tag 8db8d7ab client-a
cam list --tag urgent           # filter by tag
cam untag 9788fdf7 urgent
```

---

### `cam note <id> "text"`

Attach notes to sessions (visible in `cam show`).

```bash
cam note 9788fdf7 "Waiting on client feedback for the API changes"
cam note 9788fdf7               # clear the note
```

## How It Works

`cam` reads Claude Code's local session storage directly:

| Source | Location | Purpose |
|--------|----------|---------|
| Session Index | `~/.claude/projects/{project}/sessions-index.json` | Session metadata |
| Conversation Logs | `~/.claude/projects/{project}/{id}.jsonl` | Full message history |
| Command History | `~/.claude/history.jsonl` | Global prompt history |
| Debug Logs | `~/.claude/debug/{id}.txt` | Debug output |

Your custom metadata (tags, notes, snapshots) is stored separately in `~/.agent-manager/data.json` — Claude's data is never modified.

## Recommended Workflow

### Before Any Restart

```bash
cam snapshot save before-restart
```

### After Restart

```bash
# 1. See what you had
cam snapshot restore before-restart

# 2. Resume specific sessions you need right now
cam resume 9788fdf7
cam resume 8db8d7ab

# 3. Or launch everything at once
cam snapshot restore before-restart --exec
```

### Daily Workflow

```bash
# Start of day — review what's active
cam status

# Tag sessions by priority
cam tag 9788fdf7 urgent
cam tag 8db8d7ab waiting-feedback

# End of day — snapshot everything
cam snapshot save eod-friday
```

## Contributing

Contributions are welcome! This project is intentionally kept simple with zero dependencies.

### Development

```bash
git clone https://github.com/sharvy/claude-agent-manager.git
cd claude-agent-manager
npm link                # creates global `cam` and `claude-agent-manager` commands
```

### Architecture

```
├── bin/agent-manager.js         # CLI entry point + arg parser
├── src/
│   ├── claude-reader.js         # Reads Claude's ~/.claude/ data
│   ├── session-store.js         # Tags, notes, snapshots → ~/.agent-manager/
│   ├── commands/
│   │   ├── list.js              # cam list
│   │   ├── show.js              # cam show
│   │   ├── resume.js            # cam resume
│   │   ├── search.js            # cam search
│   │   ├── snapshot.js          # cam snapshot
│   │   └── status.js            # cam status
│   └── utils/
│       ├── config.js            # Paths + constants
│       └── formatter.js         # Terminal formatting (colors, tables)
```

### Design Principles

- **Zero dependencies** — only Node.js built-ins
- **Read-only** — never writes to `~/.claude/`, only reads
- **Fast** — no database, no daemon, instant startup
- **Portable** — works anywhere Claude Code is installed

## License

[MIT](LICENSE)
