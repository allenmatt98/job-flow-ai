import { SmartMatcher } from './SmartMatcher';

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
    }
}
