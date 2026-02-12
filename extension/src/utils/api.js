const API_URL = 'http://localhost:3000/api';

export const parseResume = async (file, { extractStructured = false } = {}) => {
    const formData = new FormData();
    formData.append('resume', file);

    const url = extractStructured
        ? `${API_URL}/parse-resume?extractStructured=true`
        : `${API_URL}/parse-resume`;

    const response = await fetch(url, {
        method: 'POST',
        body: formData,
    });
    return response.json();
};

export const generateResponse = async ({ jobDescription, userProfile, type }) => {
    const response = await fetch(`${API_URL}/generate-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription, userProfile, type }),
    });
    return response.json();
};

export const matchDropdown = async ({ question, options, userValue, context }) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(`${API_URL}/match-dropdown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, options, userValue, context }),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return response.json();
    } catch (e) {
        console.warn('matchDropdown failed (non-fatal):', e.message);
        return { match: null };
    }
};

export const answerQuestion = async ({ question, fieldType, userProfile, jobDescription, maxLength }) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${API_URL}/answer-question`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, fieldType, userProfile, jobDescription, maxLength }),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return response.json();
    } catch (e) {
        console.warn('answerQuestion failed (non-fatal):', e.message);
        return { answer: null };
    }
};
