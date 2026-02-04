const API_URL = 'http://localhost:3000/api';

export const parseResume = async (file) => {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await fetch(`${API_URL}/parse-resume`, {
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
