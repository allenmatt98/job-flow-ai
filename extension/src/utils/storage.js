export const getProfile = async () => {
    return new Promise((resolve) => {
        chrome.storage.local.get(['userProfile'], (result) => {
            resolve(result.userProfile || {});
        });
    });
};

export const saveProfile = async (profile) => {
    return new Promise((resolve) => {
        chrome.storage.local.set({ userProfile: profile }, () => {
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
