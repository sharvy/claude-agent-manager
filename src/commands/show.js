import { findSession, getSessionMessages, getDebugLogInfo } from '../claude-reader.js';
import { getTags, getNote } from '../session-store.js';
import {
    bold,
    cyan,
    yellow,
    green,
    gray,
    dim,
    magenta,
    blue,
    red,
    shortId,
    shortDate,
    timeAgo,
    truncate,
    divider,
    boxHeader,
    ICONS,
} from '../utils/formatter.js';

/**
 * Show detailed information about a specific session.
 *
 * Usage: cam show <session-id> [--messages N]
 */
export async function showCommand(args) {
    const sessionId = args._[0];
    if (!sessionId) {
        console.log(red('\n  Error: Please provide a session ID.\n'));
        console.log(dim(`  Usage: cam show <session-id> [--messages N]\n`));
        return;
    }

    const messageLimit = parseInt(args.messages || '10', 10);

    let session;
    try {
        session = await findSession(sessionId);
    } catch (err) {
        console.log(red(`\n  ${err.message}\n`));
        return;
    }

    const tags = await getTags(session.sessionId);
    const note = await getNote(session.sessionId);
    const debugInfo = await getDebugLogInfo(session.sessionId);

    console.log();
    boxHeader(`${ICONS.session}  Session Details`);

    // ─── Metadata ───────────────────────────────────────────────────────
    console.log();
    console.log(`  ${bold('Session ID')}    ${cyan(session.sessionId)}`);
    console.log(`  ${bold('Project')}       ${ICONS.project} ${session.projectPath || '—'}`);
    console.log(`  ${bold('Branch')}        ${ICONS.branch} ${yellow(session.gitBranch || '—')}`);
    console.log(`  ${bold('Summary')}       ${session.summary || '—'}`);
    console.log(`  ${bold('Messages')}      ${session.messageCount || 0}`);
    console.log(`  ${bold('Created')}       ${shortDate(session.created)} ${gray(`(${timeAgo(session.created)})`)}`);
    console.log(`  ${bold('Modified')}      ${shortDate(session.modified)} ${gray(`(${timeAgo(session.modified)})`)}`);
    console.log(`  ${bold('First Prompt')}  ${dim(truncate(session.firstPrompt || '—', 70))}`);

    if (tags.length > 0) {
        console.log(`  ${bold('Tags')}          ${tags.map((t) => magenta(`#${t}`)).join('  ')}`);
    }

    if (note) {
        console.log(`  ${bold('Note')}          ${ICONS.note} ${note}`);
    }

    if (debugInfo.exists) {
        const sizeKb = (debugInfo.size / 1024).toFixed(1);
        console.log(`  ${bold('Debug Log')}     ${dim(`${sizeKb}KB — ${debugInfo.path}`)}`);
    }

    // ─── Recent Messages ───────────────────────────────────────────────
    console.log();
    divider();
    console.log(`  ${bold(`Last ${messageLimit} Messages:`)}`);
    console.log();

    try {
        const messages = await getSessionMessages(session.sessionId, {
            limit: messageLimit,
        });

        if (messages.length === 0) {
            console.log(dim('    No messages found.\n'));
            return;
        }

        for (const msg of messages) {
            const roleColor = msg.role === 'user' ? green : blue;
            const roleLabel = msg.role === 'user' ? 'YOU' : 'CLAUDE';
            const timestamp = msg.timestamp
                ? gray(` ${new Date(msg.timestamp).toLocaleTimeString()}`)
                : '';

            console.log(`  ${roleColor(bold(roleLabel))}${timestamp}`);

            // Show truncated message text
            const lines = msg.text.split('\n').slice(0, 6);
            for (const line of lines) {
                console.log(`  ${dim('│')} ${truncate(line, 80)}`);
            }
            if (msg.text.split('\n').length > 6) {
                console.log(`  ${dim('│')} ${dim('... (truncated)')}`);
            }

            if (msg.toolUseCount > 0) {
                console.log(`  ${dim('│')} ${gray(`[${msg.toolUseCount} tool call(s)]`)}`);
            }
            console.log();
        }
    } catch (err) {
        console.log(red(`    Error reading messages: ${err.message}\n`));
    }

    // ─── Quick Actions ──────────────────────────────────────────────────
    divider();
    console.log(`  ${bold('Quick Actions:')}`);
    console.log(`    ${ICONS.arrow} Resume:   ${cyan(`cam resume ${shortId(session.sessionId)}`)}`);
    console.log(`    ${ICONS.arrow} Tag:      ${cyan(`cam tag ${shortId(session.sessionId)} <tag>`)}`);
    console.log(`    ${ICONS.arrow} Note:     ${cyan(`cam note ${shortId(session.sessionId)} "your note"`)}`);
    console.log(`    ${ICONS.arrow} Claude:   ${cyan(`claude --resume ${session.sessionId}`)}`);
    console.log();
}
