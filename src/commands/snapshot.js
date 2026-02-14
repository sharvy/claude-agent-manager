import { spawn } from 'child_process';
import { getSessions, findSession } from '../claude-reader.js';
import {
    saveSnapshot,
    getSnapshot,
    listSnapshots,
    deleteSnapshot,
} from '../session-store.js';
import {
    bold,
    cyan,
    yellow,
    green,
    gray,
    dim,
    red,
    magenta,
    shortId,
    truncate,
    timeAgo,
    shortDate,
    table,
    divider,
    boxHeader,
    ICONS,
} from '../utils/formatter.js';

/**
 * Snapshot management commands.
 *
 * Usage:
 *   cam snapshot save <name> [--sessions id1,id2,...] [--description "..."]
 *   cam snapshot list
 *   cam snapshot restore <name> [--exec]
 *   cam snapshot delete <name>
 */
export async function snapshotCommand(args) {
    const subcommand = args._[0];

    switch (subcommand) {
        case 'save':
            return snapshotSave(args);
        case 'list':
            return snapshotList(args);
        case 'restore':
            return snapshotRestore(args);
        case 'delete':
            return snapshotDelete(args);
        default:
            console.log(red('\n  Error: Unknown snapshot subcommand.\n'));
            printSnapshotHelp();
    }
}

async function snapshotSave(args) {
    const name = args._[1];
    if (!name) {
        console.log(red('\n  Error: Please provide a snapshot name.\n'));
        console.log(dim(`  Usage: cam snapshot save <name> [--sessions id1,id2]\n`));
        return;
    }

    let sessionIds;
    if (args.sessions) {
        sessionIds = args.sessions.split(',').map((s) => s.trim());
    } else {
        // Capture all sessions
        const sessions = await getSessions();
        sessionIds = sessions.map((s) => s.sessionId);
    }

    const description = args.description || '';
    await saveSnapshot(name, sessionIds, description);

    console.log();
    boxHeader(`${ICONS.snapshot}  Snapshot Saved`);
    console.log();
    console.log(`  ${bold('Name')}        ${green(name)}`);
    console.log(`  ${bold('Sessions')}    ${sessionIds.length}`);
    if (description) {
        console.log(`  ${bold('Description')} ${description}`);
    }
    console.log();
    console.log(green(`  ✓ Snapshot "${name}" saved with ${sessionIds.length} session(s).\n`));
}

async function snapshotList(args) {
    const snapshots = await listSnapshots();

    if (snapshots.length === 0) {
        console.log(dim('\n  No snapshots saved yet.\n'));
        console.log(dim(`  Create one with: ${cyan('cam snapshot save <name>')}\n`));
        return;
    }

    console.log();
    boxHeader(`${ICONS.snapshot}  Snapshots`);
    console.log();

    const headers = ['Name', 'Sessions', 'Created', 'Description'];
    const widths = [20, 10, 18, 40];

    const rows = snapshots.map((snap) => [
        green(bold(snap.name)),
        bold(`${snap.sessions.length}`),
        gray(shortDate(snap.created)),
        dim(truncate(snap.description || '—', 40)),
    ]);

    table({ headers, rows, widths });
    console.log();
}

async function snapshotRestore(args) {
    const name = args._[1];
    if (!name) {
        console.log(red('\n  Error: Please provide a snapshot name.\n'));
        console.log(dim(`  Usage: cam snapshot restore <name> [--exec]\n`));
        return;
    }

    const snapshot = await getSnapshot(name);
    if (!snapshot) {
        console.log(red(`\n  Snapshot "${name}" not found.\n`));
        return;
    }

    console.log();
    boxHeader(`${ICONS.snapshot}  Restoring Snapshot: "${name}"`);
    console.log();
    console.log(`  ${bold('Created')}     ${shortDate(snapshot.created)}`);
    console.log(`  ${bold('Sessions')}    ${snapshot.sessions.length}`);
    if (snapshot.description) {
        console.log(`  ${bold('Description')} ${snapshot.description}`);
    }
    console.log();
    divider();
    console.log();

    // Resolve session details
    const allSessions = await getSessions();
    const sessionMap = new Map(allSessions.map((s) => [s.sessionId, s]));

    if (args.exec) {
        console.log(yellow(`  Launching ${snapshot.sessions.length} session(s)...\n`));
    } else {
        console.log(`  ${bold('Resume commands:')}\n`);
    }

    for (const sid of snapshot.sessions) {
        const session = sessionMap.get(sid);
        const branch = session?.gitBranch || '—';
        const summary = session?.summary || '—';
        const project = session?.projectPath || process.cwd();

        console.log(`  ${cyan(shortId(sid))} │ ${yellow(branch)} │ ${truncate(summary, 40)}`);

        if (args.exec) {
            // Actually spawn the Claude process
            const child = spawn('claude', ['--resume', sid], {
                cwd: project,
                stdio: 'ignore',
                detached: true,
                shell: true,
            });
            child.unref();
            console.log(green(`    ✓ Launched`));
        } else {
            console.log(dim(`    $ claude --resume ${sid}`));
            console.log(dim(`    cwd: ${project}`));
        }
        console.log();
    }

    if (!args.exec) {
        console.log(dim(`  Tip: Add ${cyan('--exec')} to launch all sessions automatically.\n`));
    }
}

async function snapshotDelete(args) {
    const name = args._[1];
    if (!name) {
        console.log(red('\n  Error: Please provide a snapshot name.\n'));
        return;
    }

    const snapshot = await getSnapshot(name);
    if (!snapshot) {
        console.log(red(`\n  Snapshot "${name}" not found.\n`));
        return;
    }

    await deleteSnapshot(name);
    console.log(green(`\n  ✓ Snapshot "${name}" deleted.\n`));
}

function printSnapshotHelp() {
    console.log(`
  ${bold('Snapshot Commands:')}

    ${cyan('cam snapshot save <name>')}      Save current sessions
    ${cyan('cam snapshot list')}              List all snapshots
    ${cyan('cam snapshot restore <name>')}    Restore a snapshot
    ${cyan('cam snapshot delete <name>')}     Delete a snapshot

  ${bold('Options:')}

    --sessions id1,id2   Only save specific sessions
    --description "..."  Add a description to the snapshot
    --exec               Auto-launch sessions when restoring
  `);
}
