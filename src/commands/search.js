import { searchAllSessions } from '../claude-reader.js';
import {
    bold,
    cyan,
    yellow,
    gray,
    dim,
    green,
    blue,
    red,
    shortId,
    truncate,
    timeAgo,
    boxHeader,
    divider,
    ICONS,
} from '../utils/formatter.js';

/**
 * Search across all session conversations.
 *
 * Usage: cam search "query" [--limit N]
 */
export async function searchCommand(args) {
    const query = args._.join(' ');
    if (!query) {
        console.log(red('\n  Error: Please provide a search query.\n'));
        console.log(dim(`  Usage: cam search "your query" [--limit N]\n`));
        return;
    }

    const maxResults = parseInt(args.limit || '20', 10);

    console.log();
    boxHeader(`${ICONS.search}  Searching: "${query}"`);
    console.log();
    console.log(dim(`  Searching across all session logs...\n`));

    const results = await searchAllSessions(query, maxResults);

    if (results.length === 0) {
        console.log(dim('  No matches found.\n'));
        return;
    }

    console.log(`  Found ${green(bold(`${results.length}`))} match(es):\n`);

    for (const r of results) {
        const roleColor = r.role === 'user' ? green : blue;
        const roleLabel = r.role === 'user' ? 'YOU' : 'CLAUDE';

        console.log(
            `  ${cyan(shortId(r.sessionId))} ${dim('│')} ${yellow(r.gitBranch || '—')} ${dim('│')} ${roleColor(roleLabel)} ${dim('│')} ${gray(timeAgo(r.timestamp))}`
        );

        // Show context around the match
        const lines = r.text.split('\n');
        const queryLower = query.toLowerCase();
        let shown = 0;

        for (const line of lines) {
            if (shown >= 3) {
                console.log(dim(`     ... (more matches in this message)`));
                break;
            }
            if (line.toLowerCase().includes(queryLower)) {
                // Highlight the match
                const idx = line.toLowerCase().indexOf(queryLower);
                const before = line.slice(0, idx);
                const match = line.slice(idx, idx + query.length);
                const after = line.slice(idx + query.length);
                console.log(
                    `     ${truncate(before, 30)}${bold(green(match))}${truncate(after, 40)}`
                );
                shown++;
            }
        }
        console.log();
    }

    divider();
    console.log(dim(`  Use ${cyan('cam show <id>')} to see full session details.\n`));
}
