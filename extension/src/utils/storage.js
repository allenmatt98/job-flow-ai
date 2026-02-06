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
