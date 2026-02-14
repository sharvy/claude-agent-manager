import { readFile, writeFile, mkdir } from 'fs/promises';
import { AGENT_MANAGER_DIR, DATA_FILE } from './utils/config.js';

// ─── Data Store ───────────────────────────────────────────────────────────────

/**
 * Internal data structure:
 * {
 *   tags: { [sessionId]: string[] },
 *   notes: { [sessionId]: string },
 *   snapshots: { [name]: { created, description, sessions: string[] } }
 * }
 */

async function ensureDir() {
    try {
        await mkdir(AGENT_MANAGER_DIR, { recursive: true });
    } catch {
        // already exists
    }
}

async function loadData() {
    try {
        const raw = await readFile(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return { tags: {}, notes: {}, snapshots: {} };
    }
}

async function saveData(data) {
    await ensureDir();
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

/**
 * Get tags for a session.
 */
export async function getTags(sessionId) {
    const data = await loadData();
    return data.tags[sessionId] || [];
}

/**
 * Add a tag to a session.
 */
export async function addTag(sessionId, tag) {
    const data = await loadData();
    if (!data.tags[sessionId]) data.tags[sessionId] = [];
    if (!data.tags[sessionId].includes(tag)) {
        data.tags[sessionId].push(tag);
    }
    await saveData(data);
}

/**
 * Remove a tag from a session.
 */
export async function removeTag(sessionId, tag) {
    const data = await loadData();
    if (data.tags[sessionId]) {
        data.tags[sessionId] = data.tags[sessionId].filter((t) => t !== tag);
        if (data.tags[sessionId].length === 0) delete data.tags[sessionId];
    }
    await saveData(data);
}

/**
 * Get all sessions that have a given tag.
 */
export async function getSessionsByTag(tag) {
    const data = await loadData();
    return Object.entries(data.tags)
        .filter(([, tags]) => tags.includes(tag))
        .map(([sessionId]) => sessionId);
}

/**
 * Get all unique tags across all sessions.
 */
export async function getAllTags() {
    const data = await loadData();
    const tagSet = new Set();
    for (const tags of Object.values(data.tags)) {
        for (const t of tags) tagSet.add(t);
    }
    return [...tagSet].sort();
}

// ─── Notes ────────────────────────────────────────────────────────────────────

/**
 * Get the note for a session.
 */
export async function getNote(sessionId) {
    const data = await loadData();
    return data.notes[sessionId] || null;
}

/**
 * Set a note for a session.
 */
export async function setNote(sessionId, note) {
    const data = await loadData();
    data.notes[sessionId] = note;
    await saveData(data);
}

/**
 * Remove the note from a session.
 */
export async function removeNote(sessionId) {
    const data = await loadData();
    delete data.notes[sessionId];
    await saveData(data);
}

// ─── Snapshots ────────────────────────────────────────────────────────────────

/**
 * Save a snapshot of session IDs.
 */
export async function saveSnapshot(name, sessionIds, description = '') {
    const data = await loadData();
    data.snapshots[name] = {
        created: new Date().toISOString(),
        description,
        sessions: sessionIds,
    };
    await saveData(data);
}

/**
 * Get a named snapshot.
 */
export async function getSnapshot(name) {
    const data = await loadData();
    return data.snapshots[name] || null;
}

/**
 * List all snapshots.
 */
export async function listSnapshots() {
    const data = await loadData();
    return Object.entries(data.snapshots).map(([name, snap]) => ({
        name,
        ...snap,
    }));
}

/**
 * Delete a snapshot.
 */
export async function deleteSnapshot(name) {
    const data = await loadData();
    delete data.snapshots[name];
    await saveData(data);
}
