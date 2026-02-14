import { getSessions, getAllProjects } from '../claude-reader.js';
import { listSnapshots, getAllTags } from '../session-store.js';
import {
    bold,
    cyan,
    yellow,
    green,
    gray,
    dim,
    magenta,
    shortId,
    truncate,
    timeAgo,
    divider,
    boxHeader,
    ICONS,
} from '../utils/formatter.js';

/**
 * Dashboard status overview.
 *
 * Usage: cam status
 */
export async function statusCommand(args) {
    const projects = await getAllProjects();
    const sessions = await getSessions();
    const snapshots = await listSnapshots();
    const allTags = await getAllTags();

    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const todaySessions = sessions.filter(
        (s) => new Date(s.modified || s.created) > oneDayAgo
    );
    const weekSessions = sessions.filter(
        (s) => new Date(s.modified || s.created) > oneWeekAgo
    );

    // Group sessions by branch
    const branchMap = new Map();
    for (const s of sessions) {
        const branch = s.gitBranch || 'no-branch';
        if (!branchMap.has(branch)) branchMap.set(branch, []);
        branchMap.get(branch).push(s);
    }

    console.log();
    boxHeader(`${ICONS.dashboard}  Agent Manager Dashboard`);
    console.log();

    // ─── Overview ───────────────────────────────────────────────────────
    console.log(
        `  ${bold('Projects')}    ${projects.length} ${dim('(' + projects.map((p) => p.projectPath).join(', ') + ')')}`
    );
    console.log(
        `  ${bold('Sessions')}    ${green(bold(`${sessions.length}`))} total ${dim('│')} ${cyan(`${todaySessions.length}`)} today ${dim('│')} ${yellow(`${weekSessions.length}`)} this week`
    );
    console.log(
        `  ${bold('Snapshots')}   ${snapshots.length > 0 ? green(`${snapshots.length} saved`) : gray('none')}`
    );
    console.log(
        `  ${bold('Tags')}        ${allTags.length > 0 ? allTags.map((t) => magenta(`#${t}`)).join('  ') : gray('none')}`
    );
    console.log(
        `  ${bold('Branches')}    ${branchMap.size} active`
    );

    // ─── Recent Sessions ───────────────────────────────────────────────
    console.log();
    divider();
    console.log(`  ${bold('Recent Sessions:')}`);
    console.log();

    const recentSessions = sessions.slice(0, 8);
    for (const s of recentSessions) {
        const id = cyan(shortId(s.sessionId));
        const branch = yellow(truncate(s.gitBranch || '—', 22));
        const summary = truncate(s.summary || s.firstPrompt || '—', 35);
        const modified = gray(timeAgo(s.modified || s.created));

        console.log(`    ${ICONS.arrow} ${id}  ${branch}  ${dim('"')}${summary}${dim('"')}  ${modified}`);
    }

    if (sessions.length > 8) {
        console.log(dim(`\n    ... and ${sessions.length - 8} more sessions`));
    }

    // ─── Active Branches ───────────────────────────────────────────────
    console.log();
    divider();
    console.log(`  ${bold('Active Branches:')}`);
    console.log();

    const sortedBranches = [...branchMap.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 6);

    for (const [branch, branchSessions] of sortedBranches) {
        const latestModified = branchSessions.reduce((latest, s) => {
            const d = new Date(s.modified || s.created);
            return d > latest ? d : latest;
        }, new Date(0));

        console.log(
            `    ${ICONS.branch} ${yellow(truncate(branch, 30))}  ${dim('│')} ${branchSessions.length} session(s)  ${dim('│')} ${gray(timeAgo(latestModified))}`
        );
    }

    // ─── Snapshots ──────────────────────────────────────────────────────
    if (snapshots.length > 0) {
        console.log();
        divider();
        console.log(`  ${bold('Saved Snapshots:')}`);
        console.log();

        for (const snap of snapshots) {
            console.log(
                `    ${ICONS.snapshot} ${green(bold(snap.name))}  ${dim('│')} ${snap.sessions.length} session(s)  ${dim('│')} ${gray(timeAgo(snap.created))}`
            );
        }
    }

    // ─── Quick Actions ──────────────────────────────────────────────────
    console.log();
    divider();
    console.log(`  ${bold('Quick Actions:')}`);
    console.log(`    ${ICONS.arrow} ${cyan('cam list')}                    List all sessions`);
    console.log(`    ${ICONS.arrow} ${cyan('cam show <id>')}               Inspect a session`);
    console.log(`    ${ICONS.arrow} ${cyan('cam snapshot save <name>')}    Save current state`);
    console.log(`    ${ICONS.arrow} ${cyan('cam search "query"')}          Search conversations`);
    console.log();
}
