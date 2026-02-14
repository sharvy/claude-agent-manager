import { getSessions } from '../claude-reader.js';
import { getTags } from '../session-store.js';
import {
    table,
    shortId,
    truncate,
    timeAgo,
    cyan,
    yellow,
    gray,
    dim,
    bold,
    green,
    magenta,
    ICONS,
    boxHeader,
} from '../utils/formatter.js';

/**
 * List sessions with filtering and sorting.
 *
 * Options:
 *   --project <path>   Filter by project path
 *   --branch <name>    Filter by git branch (substring match)
 *   --tag <tag>        Filter by tag
 *   --sort date|messages  Sort order (default: date)
 *   --limit N          Max sessions to show (default: 20)
 *   --all              Show all sessions (no limit)
 */
export async function listCommand(args) {
    const project = args.project || null;
    const branch = args.branch || null;
    const tag = args.tag || null;
    const sortBy = args.sort || 'date';
    const limit = args.all ? Infinity : parseInt(args.limit || '20', 10);

    let sessions = await getSessions(project);

    // Filter by branch
    if (branch) {
        const branchLower = branch.toLowerCase();
        sessions = sessions.filter(
            (s) => s.gitBranch && s.gitBranch.toLowerCase().includes(branchLower)
        );
    }

    // Filter by tag
    if (tag) {
        const taggedSessions = [];
        for (const s of sessions) {
            const tags = await getTags(s.sessionId);
            if (tags.includes(tag)) taggedSessions.push(s);
        }
        sessions = taggedSessions;
    }

    // Sort
    if (sortBy === 'messages') {
        sessions.sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));
    }
    // Default sort by date is already applied in getSessions()

    // Apply limit
    sessions = sessions.slice(0, limit);

    if (sessions.length === 0) {
        console.log(dim('\n  No sessions found.\n'));
        return;
    }

    console.log();
    boxHeader(`${ICONS.session}  Sessions (${sessions.length})`);
    console.log();

    // Build table rows
    const headers = ['#', 'ID', 'Branch', 'Summary', 'Msgs', 'Modified', 'Tags'];
    const widths = [3, 10, 24, 32, 5, 12, 16];

    const rows = [];
    for (let i = 0; i < sessions.length; i++) {
        const s = sessions[i];
        const tags = await getTags(s.sessionId);
        const tagStr = tags.length > 0 ? tags.map((t) => magenta(t)).join(', ') : gray('—');

        rows.push([
            dim(`${i + 1}`),
            cyan(shortId(s.sessionId)),
            yellow(truncate(s.gitBranch || '—', 24)),
            truncate(s.summary || s.firstPrompt || '—', 32),
            bold(`${s.messageCount || 0}`),
            gray(timeAgo(s.modified || s.created)),
            tagStr,
        ]);
    }

    table({ headers, rows, widths });
    console.log();
    console.log(dim(`  Use ${cyan('cam show <id>')} to inspect a session.`));
    console.log();
}
