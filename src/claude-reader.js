import { readdir, readFile, stat } from 'fs/promises';
import { join, basename } from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { PROJECTS_DIR, HISTORY_FILE, DEBUG_DIR } from './utils/config.js';
import { decodeProjectDir } from './utils/formatter.js';

// ─── Project Discovery ───────────────────────────────────────────────────────

/**
 * List all Claude project directories.
 * Returns array of { dirName, projectPath, fullPath }.
 */
export async function getAllProjects() {
    try {
        const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
        return entries
            .filter((e) => e.isDirectory())
            .map((e) => ({
                dirName: e.name,
                projectPath: decodeProjectDir(e.name),
                fullPath: join(PROJECTS_DIR, e.name),
            }));
    } catch {
        return [];
    }
}

// ─── Session Index ────────────────────────────────────────────────────────────

/**
 * Read sessions-index.json for a given project directory.
 * Returns the entries array enriched with projectPath.
 */
async function readSessionIndex(projectFullPath) {
    const indexFile = join(projectFullPath, 'sessions-index.json');
    try {
        const raw = await readFile(indexFile, 'utf-8');
        const data = JSON.parse(raw);
        const projectPath = decodeProjectDir(basename(projectFullPath));
        return (data.entries || []).map((entry) => ({
            ...entry,
            projectPath: entry.projectPath || projectPath,
        }));
    } catch {
        return [];
    }
}

/**
 * Get all sessions across all projects (or for a specific project path).
 *
 * @param {string} [filterProject] - Optional project path to filter by
 * @returns {Promise<Object[]>} Array of session objects
 */
export async function getSessions(filterProject) {
    const projects = await getAllProjects();
    const filtered = filterProject
        ? projects.filter((p) => p.projectPath === filterProject)
        : projects;

    const allSessions = [];
    for (const project of filtered) {
        const sessions = await readSessionIndex(project.fullPath);
        allSessions.push(...sessions);
    }

    // Sort by modified date descending (most recent first)
    allSessions.sort((a, b) => {
        const dateA = new Date(a.modified || a.created || 0);
        const dateB = new Date(b.modified || b.created || 0);
        return dateB - dateA;
    });

    return allSessions;
}

/**
 * Find a single session by its full or partial ID.
 */
export async function findSession(partialId) {
    const allSessions = await getSessions();
    // Try exact match first
    let match = allSessions.find((s) => s.sessionId === partialId);
    if (match) return match;

    // Try prefix match
    const matches = allSessions.filter((s) =>
        s.sessionId.startsWith(partialId)
    );
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
        throw new Error(
            `Ambiguous session ID "${partialId}" — matches ${matches.length} sessions. Use a longer prefix.`
        );
    }

    throw new Error(`No session found matching "${partialId}".`);
}

// ─── Session Messages ─────────────────────────────────────────────────────────

/**
 * Parse a session's .jsonl file and extract conversation messages.
 *
 * @param {string} sessionId - Full session ID
 * @param {Object} [opts]
 * @param {number} [opts.limit] - Max messages to return (from the end)
 * @param {string} [opts.search] - Text to search for in messages
 * @returns {Promise<Object[]>} Array of { role, text, timestamp, toolUse? }
 */
export async function getSessionMessages(sessionId, opts = {}) {
    const projects = await getAllProjects();
    let jsonlPath = null;

    for (const project of projects) {
        const candidatePath = join(project.fullPath, `${sessionId}.jsonl`);
        try {
            await stat(candidatePath);
            jsonlPath = candidatePath;
            break;
        } catch {
            continue;
        }
    }

    if (!jsonlPath) {
        throw new Error(`Session log file not found for "${sessionId}".`);
    }

    const messages = [];
    const rl = createInterface({
        input: createReadStream(jsonlPath, 'utf-8'),
        crlfDelay: Infinity,
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const entry = JSON.parse(line);

            // Skip non-message entries (file-history-snapshot, etc.)
            if (!entry.message) continue;
            if (entry.type === 'file-history-snapshot') continue;

            const msg = entry.message;
            const role = msg.role || entry.type;

            // Extract text content
            let text = '';
            if (typeof msg.content === 'string') {
                text = msg.content;
            } else if (Array.isArray(msg.content)) {
                text = msg.content
                    .filter((block) => block.type === 'text')
                    .map((block) => block.text)
                    .join('\n');
            }

            // Count tool uses
            let toolUseCount = 0;
            if (Array.isArray(msg.content)) {
                toolUseCount = msg.content.filter(
                    (block) => block.type === 'tool_use'
                ).length;
            }

            // Apply search filter
            if (opts.search) {
                const searchLower = opts.search.toLowerCase();
                if (!text.toLowerCase().includes(searchLower)) continue;
            }

            if (text || toolUseCount > 0) {
                messages.push({
                    role,
                    text: text.trim(),
                    timestamp: entry.timestamp,
                    toolUseCount,
                    uuid: entry.uuid,
                });
            }
        } catch {
            // Skip malformed lines
            continue;
        }
    }

    // Apply limit (return last N messages)
    if (opts.limit && messages.length > opts.limit) {
        return messages.slice(-opts.limit);
    }

    return messages;
}

// ─── Global History ───────────────────────────────────────────────────────────

/**
 * Read the global command history (history.jsonl).
 * Returns array of { display, timestamp, project, sessionId }.
 */
export async function getHistory(limit = 50) {
    try {
        const entries = [];
        const rl = createInterface({
            input: createReadStream(HISTORY_FILE, 'utf-8'),
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (!line.trim()) continue;
            try {
                entries.push(JSON.parse(line));
            } catch {
                continue;
            }
        }

        // Return last N entries, most recent first
        return entries.slice(-limit).reverse();
    } catch {
        return [];
    }
}

// ─── Debug Logs ───────────────────────────────────────────────────────────────

/**
 * Check if a debug log exists for a session and return its size.
 */
export async function getDebugLogInfo(sessionId) {
    const logPath = join(DEBUG_DIR, `${sessionId}.txt`);
    try {
        const info = await stat(logPath);
        return {
            exists: true,
            path: logPath,
            size: info.size,
            modified: info.mtime,
        };
    } catch {
        return { exists: false };
    }
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Search across all session .jsonl files for matching text.
 *
 * @param {string} query - Search query
 * @param {number} [maxResults=20] - Maximum results to return
 * @returns {Promise<Object[]>} Array of { sessionId, summary, role, text, timestamp }
 */
export async function searchAllSessions(query, maxResults = 20) {
    const sessions = await getSessions();
    const results = [];
    const queryLower = query.toLowerCase();

    for (const session of sessions) {
        if (results.length >= maxResults) break;

        try {
            const messages = await getSessionMessages(session.sessionId, {
                search: query,
            });

            for (const msg of messages) {
                if (results.length >= maxResults) break;
                results.push({
                    sessionId: session.sessionId,
                    summary: session.summary,
                    projectPath: session.projectPath,
                    gitBranch: session.gitBranch,
                    role: msg.role,
                    text: msg.text,
                    timestamp: msg.timestamp,
                });
            }
        } catch {
            continue;
        }
    }

    return results;
}
