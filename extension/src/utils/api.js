import { supabase } from './supabase';


export const parseResume = async (formData) => {
    const { data, error } = await supabase.functions.invoke('parse-resume', {
        body: formData,
    });

    if (error) throw error;
    return data;
};

export const generateResponse = async ({ jobDescription, userProfile, type }) => {
    // Strip base64 resume data before sending to edge function
    const { resume, ...profileWithoutResume } = userProfile || {};
    const cleanProfile = { ...profileWithoutResume };
    if (resume?.name) {
        cleanProfile.resumeName = resume.name;
    }

    const { data, error } = await supabase.functions.invoke('generate-response', {
        body: { action: 'generate-response', jobDescription, userProfile: cleanProfile, type },
    });

    if (error) {
        // Extract actual error message from the response context if available
        const msg = data?.error || error.message || 'Edge Function error';
        throw new Error(msg);
    }
    return data;
};

export const matchDropdown = async ({ question, options, userValue, context }) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const { data, error } = await supabase.functions.invoke('generate-response', {
            body: { action: 'match-dropdown', question, options, userValue, context },
        });

        clearTimeout(timeout);
        if (error) throw error;
        return data;
    } catch (e) {
        console.warn('matchDropdown failed (non-fatal):', e.message);
        return { match: null };
    }
};

export const answerQuestion = async ({ question, fieldType, userProfile, jobDescription, maxLength }) => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        // Strip base64 resume data before sending
        const { resume, ...profileWithoutResume } = userProfile || {};
        const cleanProfile = { ...profileWithoutResume };
        if (resume?.name) cleanProfile.resumeName = resume.name;

        const { data, error } = await supabase.functions.invoke('generate-response', {
            body: { action: 'answer-question', question, fieldType, userProfile: cleanProfile, jobDescription, maxLength },
        });

        clearTimeout(timeout);
        if (error) throw error;
        return data;
    } catch (e) {
        console.warn('answerQuestion failed (non-fatal):', e.message);
        return { answer: null };
    }
};
