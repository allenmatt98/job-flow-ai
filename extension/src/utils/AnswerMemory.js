import { SmartMatcher } from './SmartMatcher';
import { getSession, syncAnswerMemoryToCloud, pullAnswerMemoryFromCloud, deleteCloudAnswer } from './supabase';

const STORAGE_KEY = 'answerMemory';

const STOPWORDS = new Set([
    'do', 'you', 'are', 'what', 'how', 'please', 'select', 'enter', 'provide',
    'your', 'the', 'a', 'an', 'is', 'it', 'to', 'of', 'for', 'in', 'and',
    'or', 'if', 'this', 'that', 'we', 'us', 'i', 'my', 'will', 'would',
    'can', 'could', 'should', 'have', 'has', 'had', 'be', 'been', 'being',
    'with', 'from', 'on', 'at', 'by', 'as', 'was', 'were', 'not', 'no',
    'yes', 'any', 'all', 'each', 'every', 'following', 'below', 'above'
]);

/**
 * Normalize a question string into a stable lookup key.
 * Lowercase, strip punctuation, remove stopwords, sort tokens, join with space.
 */
export function normalizeQuestion(text) {
    if (!text) return '';
    const tokens = text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(t => t.length > 0 && !STOPWORDS.has(t));
    tokens.sort();
    return tokens.join(' ');
}

export async function getAnswerMemory() {
    return new Promise((resolve) => {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
            resolve(result[STORAGE_KEY] || {});
        });
    });
}

export async function saveAnswerMemory(memory) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [STORAGE_KEY]: memory }, () => {
            resolve(true);
        });
    });
}

/**
 * Save a single Q&A pair. Increments useCount if key already exists.
 */
export async function learnAnswer(question, answer, fieldTag) {
    if (!question || !answer) return;
    const key = normalizeQuestion(question);
    if (!key) return;

    const memory = await getAnswerMemory();
    const existing = memory[key];

    memory[key] = {
        question: existing?.question || question,
        answer,
        fieldTag: fieldTag || existing?.fieldTag || 'input',
        lastUsed: Date.now(),
        useCount: (existing?.useCount || 0) + 1
    };

    await saveAnswerMemory(memory);
}

/**
 * Batch save from SAVE_ANSWERS message.
 * @param {Array<{question: string, answer: string, fieldTag: string}>} entries
 * @returns {{ saved: number, totalStored: number }}
 */
export async function learnAnswers(entries) {
    if (!entries || entries.length === 0) return { saved: 0, totalStored: 0 };

    const memory = await getAnswerMemory();
    let saved = 0;

    for (const { question, answer, fieldTag } of entries) {
        if (!question || !answer) continue;
        const key = normalizeQuestion(question);
        if (!key) continue;

        const existing = memory[key];
        memory[key] = {
            question: existing?.question || question,
            answer,
            fieldTag: fieldTag || existing?.fieldTag || 'input',
            lastUsed: Date.now(),
            useCount: (existing?.useCount || 0) + 1
        };
        saved++;
    }

    await saveAnswerMemory(memory);
    // Fire-and-forget cloud sync
    syncToCloudIfLoggedIn(memory);
    return { saved, totalStored: Object.keys(memory).length };
}

/**
 * Find a stored answer for a given field label.
 * 1. Exact normalized key lookup -> confidence: 'high'
 * 2. Fuzzy fallback via SmartMatcher -> confidence based on match tier
 * 3. No match -> null
 */
export async function recallAnswer(questionLabel) {
    if (!questionLabel) return null;

    const memory = await getAnswerMemory();
    const keys = Object.keys(memory);
    if (keys.length === 0) return null;

    const normalizedInput = normalizeQuestion(questionLabel);
    if (!normalizedInput) return null;

    // 1. Exact key match
    if (memory[normalizedInput]) {
        return {
            answer: memory[normalizedInput].answer,
            confidence: 'high',
            key: normalizedInput
        };
    }

    // 2. Fuzzy match via SmartMatcher
    const matcher = new SmartMatcher();
    const result = matcher.findBestMatchTiered(normalizedInput, keys);

    if (result) {
        const entry = memory[result.match];
        return {
            answer: entry.answer,
            confidence: result.confidence,
            key: result.match
        };
    }

    return null;
}

export async function deleteAnswer(normalizedKey) {
    const memory = await getAnswerMemory();
    delete memory[normalizedKey];
    await saveAnswerMemory(memory);
}

export async function updateAnswer(normalizedKey, newAnswer) {
    const memory = await getAnswerMemory();
    if (memory[normalizedKey]) {
        memory[normalizedKey].answer = newAnswer;
        memory[normalizedKey].lastUsed = Date.now();
        await saveAnswerMemory(memory);
        // Sync updated answer to cloud
        syncToCloudIfLoggedIn({ [normalizedKey]: memory[normalizedKey] });
    }
}

// ─── Cloud Sync ─────────────────────────────────────────────────────────────

/**
 * Merge cloud answers into local storage.
 * Cloud wins on conflicts where cloud has higher useCount.
 * Returns the merged memory object.
 */
export async function pullFromCloud() {
    const session = await getSession();
    if (!session) return { merged: false, reason: 'not_authenticated' };

    const { data: cloudMemory, error } = await pullAnswerMemoryFromCloud();
    if (error) return { merged: false, reason: error.message };
    if (!cloudMemory || Object.keys(cloudMemory).length === 0) {
        return { merged: true, added: 0 };
    }

    const localMemory = await getAnswerMemory();
    let added = 0;

    for (const [key, cloudEntry] of Object.entries(cloudMemory)) {
        const localEntry = localMemory[key];
        if (!localEntry) {
            // New from cloud
            localMemory[key] = cloudEntry;
            added++;
        } else if (cloudEntry.useCount > localEntry.useCount) {
            // Cloud has more usage, take cloud version
            localMemory[key] = cloudEntry;
        }
        // Otherwise keep local (local is more recent)
    }

    await saveAnswerMemory(localMemory);
    return { merged: true, added };
}

/**
 * Push all local answers to cloud.
 */
export async function pushToCloud() {
    const session = await getSession();
    if (!session) return { pushed: false, reason: 'not_authenticated' };

    const localMemory = await getAnswerMemory();
    const { error } = await syncAnswerMemoryToCloud(localMemory);
    if (error) return { pushed: false, reason: error.message };

    return { pushed: true, count: Object.keys(localMemory).length };
}

/**
 * Full bi-directional sync: pull from cloud, merge, then push merged state.
 */
export async function fullSync() {
    const pullResult = await pullFromCloud();
    if (!pullResult.merged) return pullResult;

    const pushResult = await pushToCloud();
    return { ...pullResult, ...pushResult };
}

/**
 * Helper: sync a subset of answers to cloud if user is logged in.
 * Non-blocking — fire and forget.
 */
function syncToCloudIfLoggedIn(entries) {
    getSession().then((session) => {
        if (session) {
            syncAnswerMemoryToCloud(entries).catch(() => {});
        }
    });
}

/**
 * Delete an answer from both local and cloud.
 */
export async function deleteAnswerEverywhere(normalizedKey) {
    await deleteAnswer(normalizedKey);
    const session = await getSession();
    if (session) {
        await deleteCloudAnswer(normalizedKey).catch(() => {});
    }
}
