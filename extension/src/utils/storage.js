/**
 * Storage Utility
 * 
 * Schema:
 * - userProfile: Object (Personal Info)
 * - education: Array [{school, degree, start, end}]
 * - experience: Array [{company, title, start, end, description}]
 * - resume: Object { name, data (base64/text), type }
 * - apiKey: String (OpenAI)
 * - applicationHistory: Array [{company, role, date, status, url}] (Syncs to Supabase primarily, but local cache)
 */

export const getProfile = async () => {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userProfile', 'education', 'experience', 'resume'], (result) => {
            resolve({
                userProfile: result.userProfile || {},
                education: result.education || [],
                experience: result.experience || [],
                resume: result.resume || null
            });
        });
    });
};

export const saveProfile = async (data) => {
    return new Promise((resolve) => {
        // Data can be partial
        chrome.storage.local.set(data, () => {
            resolve(true);
        });
    });
};

export const getApiKey = async () => {
    return new Promise((resolve) => {
        chrome.storage.local.get(['apiKey'], (result) => {
            resolve(result.apiKey || '');
        });
    });
};

export const saveApiKey = async (apiKey) => {
    return new Promise((resolve) => {
        chrome.storage.local.set({ apiKey }, () => {
            resolve(true);
        });
    });
};

export const getAnswerMemory = async () => {
    return new Promise((resolve) => {
        chrome.storage.local.get(['answerMemory'], (result) => {
            resolve(result.answerMemory || {});
        });
    });
};

export const saveAnswerMemory = async (memory) => {
    return new Promise((resolve) => {
        chrome.storage.local.set({ answerMemory: memory }, () => {
            resolve(true);
        });
    });
};

export const getTimeSaved = async () => {
    return new Promise((resolve) => {
        chrome.storage.local.get(['timeSavedMinutes', 'applicationCount'], (result) => {
            resolve({
                timeSavedMinutes: result.timeSavedMinutes || 0,
                applicationCount: result.applicationCount || 0,
            });
        });
    });
};

export const incrementTimeSaved = async (minutes = 5) => {
    const current = await getTimeSaved();
    return new Promise((resolve) => {
        chrome.storage.local.set({
            timeSavedMinutes: current.timeSavedMinutes + minutes,
            applicationCount: current.applicationCount + 1,
        }, () => {
            resolve({
                timeSavedMinutes: current.timeSavedMinutes + minutes,
                applicationCount: current.applicationCount + 1,
            });
        });
    });
};
