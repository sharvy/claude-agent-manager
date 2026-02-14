import { spawn } from 'child_process';
import { findSession } from '../claude-reader.js';
import {
    bold,
    cyan,
    yellow,
    green,
    gray,
    dim,
    red,
    shortId,
    ICONS,
    boxHeader,
} from '../utils/formatter.js';

/**
 * Resume a Claude session.
 *
 * Usage: cam resume <session-id> [--message "..."]
 */
export async function resumeCommand(args) {
    const sessionId = args._[0];
    if (!sessionId) {
        console.log(red('\n  Error: Please provide a session ID.\n'));
        console.log(dim(`  Usage: cam resume <session-id> [--message "..."]\n`));
        return;
    }

    let session;
    try {
        session = await findSession(sessionId);
    } catch (err) {
        console.log(red(`\n  ${err.message}\n`));
        return;
    }

    console.log();
    boxHeader(`${ICONS.session}  Resuming Session`);
    console.log();
    console.log(`  ${bold('Session')}   ${cyan(shortId(session.sessionId))}`);
    console.log(`  ${bold('Branch')}    ${ICONS.branch} ${yellow(session.gitBranch || '—')}`);
    console.log(`  ${bold('Summary')}   ${session.summary || '—'}`);
    console.log(`  ${bold('Project')}   ${ICONS.project} ${session.projectPath || '—'}`);
    console.log();

    const claudeArgs = ['--resume', session.sessionId];
    if (args.message) {
        claudeArgs.push(args.message);
    }

    const cwd = session.projectPath || process.cwd();

    console.log(dim(`  $ claude ${claudeArgs.join(' ')}`));
    console.log(dim(`  cwd: ${cwd}`));
    console.log();

    // Spawn claude in the project directory, inheriting stdio
    const child = spawn('claude', claudeArgs, {
        cwd,
        stdio: 'inherit',
        shell: true,
    });

    child.on('error', (err) => {
        console.log(red(`\n  Failed to start Claude: ${err.message}`));
        console.log(dim(`  Make sure 'claude' is in your PATH.\n`));
    });

    child.on('exit', (code) => {
        if (code !== 0 && code !== null) {
            console.log(yellow(`\n  Claude exited with code ${code}\n`));
        }
    });
}
