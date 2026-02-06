import { createClient } from '@supabase/supabase-js';

// TODO: Replace with user's actual Supabase project details
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://xyz.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJ...';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const signInWithGoogle = async () => {
    // For Chrome Extensions, we usually need to use chrome.identity.launchWebAuthFlow
    // OR use Supabase's signInWithOAuth ({ redirectTo: chrome.identity.getRedirectURL() })

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: chrome.identity.getRedirectURL(),
        },
    });
    return { data, error };
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const getSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
};

export const logApplication = async (userId, applicationData) => {
    // applicationData: { company, role, url, status: 'Applied' }
    const { data, error } = await supabase
        .from('applications') // Assumes table 'applications' exists
        .insert([
            { user_id: userId, ...applicationData }
        ]);
    return { data, error };
};
