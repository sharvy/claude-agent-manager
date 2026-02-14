import { COLORS } from './config.js';

const c = COLORS;

// ─── Color helpers ────────────────────────────────────────────────────────────

export const bold = (s) => `${c.bold}${s}${c.reset}`;
export const dim = (s) => `${c.dim}${s}${c.reset}`;
export const italic = (s) => `${c.italic}${s}${c.reset}`;
export const red = (s) => `${c.red}${s}${c.reset}`;
export const green = (s) => `${c.green}${s}${c.reset}`;
export const yellow = (s) => `${c.yellow}${s}${c.reset}`;
export const blue = (s) => `${c.blue}${s}${c.reset}`;
export const magenta = (s) => `${c.magenta}${s}${c.reset}`;
export const cyan = (s) => `${c.cyan}${s}${c.reset}`;
export const gray = (s) => `${c.gray}${s}${c.reset}`;

// ─── Compound styles ─────────────────────────────────────────────────────────

export const header = (s) => `${c.bold}${c.cyan}${s}${c.reset}`;
export const success = (s) => `${c.bold}${c.green}✓ ${s}${c.reset}`;
export const warn = (s) => `${c.bold}${c.yellow}⚠ ${s}${c.reset}`;
export const error = (s) => `${c.bold}${c.red}✗ ${s}${c.reset}`;
export const info = (s) => `${c.blue}ℹ ${s}${c.reset}`;

// ─── Icons ────────────────────────────────────────────────────────────────────

export const ICONS = {
    session: '💬',
    project: '📁',
    branch: '🌿',
    snapshot: '📸',
    search: '🔍',
    dashboard: '📊',
    arrow: '→',
    bullet: '•',
    check: '✓',
    cross: '✗',
    clock: '🕐',
    tag: '🏷️',
    note: '📝',
};

// ─── Table formatting ─────────────────────────────────────────────────────────

/**
 * Strip ANSI escape sequences for accurate string width measurement.
 */
function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Pad a string to a given width, accounting for ANSI codes.
 */
function padEnd(str, width) {
    const visible = stripAnsi(str);
    const padding = Math.max(0, width - visible.length);
    return str + ' '.repeat(padding);
}

/**
 * Truncate a string to maxLen (visible characters), adding ellipsis.
 */
export function truncate(str, maxLen) {
    if (!str) return '';
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen - 1) + '…';
}

/**
 * Render a formatted table.
 *
 * @param {Object} opts
 * @param {string[]} opts.headers - Column headers
 * @param {string[][]} opts.rows - 2D array of cell values (may contain ANSI)
 * @param {number[]} [opts.widths] - Column widths (auto-calculated if omitted)
 */
export function table({ headers, rows, widths }) {
    if (!rows.length) return;

    // Calculate widths from content if not provided
    if (!widths) {
        widths = headers.map((h, i) => {
            const maxContent = Math.max(
                stripAnsi(h).length,
                ...rows.map((r) => stripAnsi(r[i] || '').length)
            );
            return Math.min(maxContent, 50); // cap column width
        });
    }

    // Header
    const headerLine = headers
        .map((h, i) => `${c.bold}${padEnd(h, widths[i])}${c.reset}`)
        .join(` ${c.dim}│${c.reset} `);
    console.log(headerLine);

    // Separator
    const sepLine = widths
        .map((w) => '─'.repeat(w))
        .join(`─${c.dim}┼${c.reset}─`);
    console.log(dim(sepLine));

    // Rows
    for (const row of rows) {
        const line = row
            .map((cell, i) => padEnd(cell || '', widths[i]))
            .join(` ${c.dim}│${c.reset} `);
        console.log(line);
    }
}

// ─── Time formatting ──────────────────────────────────────────────────────────

/**
 * Format a date/timestamp as relative time (e.g. "2 hours ago").
 */
export function timeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    if (diffWeek < 4) return `${diffWeek}w ago`;
    return date.toLocaleDateString();
}

/**
 * Format a date as a short human-readable string.
 */
export function shortDate(dateStr) {
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

/**
 * Print a section divider.
 */
export function divider(char = '─', width = 60) {
    console.log(dim(char.repeat(width)));
}

/**
 * Print a boxed header.
 */
export function boxHeader(title) {
    const line = '═'.repeat(title.length + 4);
    console.log(cyan(`╔${line}╗`));
    console.log(cyan(`║  ${bold(title)}  ${c.cyan}║`));
    console.log(cyan(`╚${line}╝`));
}

/**
 * Short session ID (first 8 chars).
 */
export function shortId(id) {
    return id ? id.slice(0, 8) : '????????';
}

/**
 * Decode a Claude project directory name back to a path.
 * e.g. "-Users-username-work-project" → "/Users/username/work/project"
 */
export function decodeProjectDir(dirName) {
    return dirName.replace(/-/g, '/');
}
