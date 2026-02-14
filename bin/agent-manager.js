#!/usr/bin/env node

/**
 * Agent Manager CLI — Manage your Claude Code sessions
 *
 * Commands:
 *   status                         Dashboard overview
 *   list [options]                 List sessions
 *   show <id> [--messages N]       Show session details
 *   resume <id> [--message "..."]  Resume a session
 *   search "query" [--limit N]     Search conversations
 *   snapshot <sub> [options]       Manage snapshots
 *   tag <id> <tag>                 Add a tag
 *   untag <id> <tag>              Remove a tag
 *   note <id> "text"              Set a note
 */

import { listCommand } from '../src/commands/list.js';
import { showCommand } from '../src/commands/show.js';
import { resumeCommand } from '../src/commands/resume.js';
import { searchCommand } from '../src/commands/search.js';
import { snapshotCommand } from '../src/commands/snapshot.js';
import { statusCommand } from '../src/commands/status.js';
import { findSession } from '../src/claude-reader.js';
import { addTag, removeTag, setNote, removeNote } from '../src/session-store.js';
import {
    bold,
    cyan,
    dim,
    green,
    red,
    yellow,
    magenta,
    boxHeader,
} from '../src/utils/formatter.js';

// ─── Argument Parser ──────────────────────────────────────────────────────────

function parseArgs(argv) {
    const args = { _: [] };
    let i = 0;

    while (i < argv.length) {
        const arg = argv[i];

        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = argv[i + 1];

            // Boolean flag (next arg is another flag or end of args)
            if (!next || next.startsWith('--')) {
                args[key] = true;
            } else {
                args[key] = next;
                i++;
            }
        } else if (arg.startsWith('-') && arg.length === 2) {
            const key = arg.slice(1);
            const next = argv[i + 1];

            if (!next || next.startsWith('-')) {
                args[key] = true;
            } else {
                args[key] = next;
                i++;
            }
        } else {
            args._.push(arg);
        }
        i++;
    }

    return args;
}

// ─── Help ─────────────────────────────────────────────────────────────────────

function printHelp() {
    console.log(`
${bold('Claude Agent Manager')} ${dim('(cam)')} — ${dim('Manage your Claude Code sessions')}

${bold('Usage:')}
  ${cyan('cam')} ${yellow('<command>')} ${dim('[options]')}

${bold('Commands:')}
  ${cyan('status')}                              Dashboard overview
  ${cyan('list')}     ${dim('[options]')}                  List all sessions
  ${cyan('show')}     ${yellow('<id>')} ${dim('[--messages N]')}        Show session details
  ${cyan('resume')}   ${yellow('<id>')} ${dim('[--message "..."]')}     Resume a session in Claude
  ${cyan('search')}   ${yellow('"query"')} ${dim('[--limit N]')}         Search across conversations
  ${cyan('snapshot')} ${yellow('<save|list|restore|delete>')} Manage session snapshots
  ${cyan('tag')}      ${yellow('<id> <tag>')}                  Add a tag to a session
  ${cyan('untag')}    ${yellow('<id> <tag>')}                  Remove a tag
  ${cyan('note')}     ${yellow('<id> "text"')}                 Set a note on a session

${bold('List Options:')}
  --project ${dim('<path>')}    Filter by project path
  --branch ${dim('<name>')}     Filter by git branch
  --tag ${dim('<tag>')}         Filter by tag
  --sort ${dim('date|messages')} Sort order (default: date)
  --limit ${dim('N')}           Max results (default: 20)
  --all                 Show all sessions

${bold('Snapshot Subcommands:')}
  save ${dim('<name>')}                  Save all sessions (or --sessions id1,id2)
  list                           List saved snapshots
  restore ${dim('<name>')} ${dim('[--exec]')}    Show/run restore commands
  delete ${dim('<name>')}                Delete a snapshot

${bold('Examples:')}
  ${dim('$')} cam status
  ${dim('$')} cam list --branch security
  ${dim('$')} cam show 9788fdf7
  ${dim('$')} cam search "webhook idempotency"
  ${dim('$')} cam snapshot save pre-update
  ${dim('$')} cam snapshot restore pre-update --exec
  ${dim('$')} cam tag 9788fdf7 urgent
  ${dim('$')} cam resume 9788fdf7

${dim('Aliases: claude-agent-manager, cam')}
  `);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const rawArgs = process.argv.slice(2);

    if (rawArgs.length === 0 || rawArgs[0] === '--help' || rawArgs[0] === '-h') {
        printHelp();
        return;
    }

    const command = rawArgs[0];
    const args = parseArgs(rawArgs.slice(1));

    try {
        switch (command) {
            case 'status':
                await statusCommand(args);
                break;

            case 'list':
            case 'ls':
                await listCommand(args);
                break;

            case 'show':
            case 'inspect':
                await showCommand(args);
                break;

            case 'resume':
                await resumeCommand(args);
                break;

            case 'search':
            case 'find':
                await searchCommand(args);
                break;

            case 'snapshot':
            case 'snap':
                await snapshotCommand(args);
                break;

            case 'tag':
                await tagCommand(args);
                break;

            case 'untag':
                await untagCommand(args);
                break;

            case 'note':
                await noteCommand(args);
                break;

            case 'help':
                printHelp();
                break;

            default:
                console.log(red(`\n  Unknown command: "${command}"\n`));
                printHelp();
                process.exitCode = 1;
        }
    } catch (err) {
        console.error(red(`\n  Error: ${err.message}\n`));
        if (process.env.DEBUG) {
            console.error(err.stack);
        }
        process.exitCode = 1;
    }
}

// ─── Inline Tag/Note Commands ─────────────────────────────────────────────────

async function tagCommand(args) {
    const sessionId = args._[0];
    const tag = args._[1];

    if (!sessionId || !tag) {
        console.log(red('\n  Error: Please provide a session ID and tag.\n'));
        console.log(dim(`  Usage: cam tag <session-id> <tag>\n`));
        return;
    }

    const session = await findSession(sessionId);
    await addTag(session.sessionId, tag);
    console.log(green(`\n  ✓ Tagged ${cyan(session.sessionId.slice(0, 8))} with ${magenta(`#${tag}`)}\n`));
}

async function untagCommand(args) {
    const sessionId = args._[0];
    const tag = args._[1];

    if (!sessionId || !tag) {
        console.log(red('\n  Error: Please provide a session ID and tag.\n'));
        console.log(dim(`  Usage: cam untag <session-id> <tag>\n`));
        return;
    }

    const session = await findSession(sessionId);
    await removeTag(session.sessionId, tag);
    console.log(green(`\n  ✓ Removed tag ${magenta(`#${tag}`)} from ${cyan(session.sessionId.slice(0, 8))}\n`));
}

async function noteCommand(args) {
    const sessionId = args._[0];
    const text = args._.slice(1).join(' ');

    if (!sessionId) {
        console.log(red('\n  Error: Please provide a session ID.\n'));
        console.log(dim(`  Usage: cam note <session-id> "your note"\n`));
        return;
    }

    const session = await findSession(sessionId);

    if (!text) {
        // Clear the note
        await removeNote(session.sessionId);
        console.log(green(`\n  ✓ Note cleared from ${cyan(session.sessionId.slice(0, 8))}\n`));
    } else {
        await setNote(session.sessionId, text);
        console.log(green(`\n  ✓ Note set on ${cyan(session.sessionId.slice(0, 8))}\n`));
    }
}

main();
