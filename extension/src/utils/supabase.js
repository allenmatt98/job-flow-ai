import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        storage: {
            getItem: (key) => new Promise((resolve) => {
                chrome.storage.local.get([key], (result) => resolve(result[key] || null));
            }),
            setItem: (key, value) => new Promise((resolve) => {
                chrome.storage.local.set({ [key]: value }, resolve);
            }),
            removeItem: (key) => new Promise((resolve) => {
                chrome.storage.local.remove(key, resolve);
            }),
        },
    },
});

// ─── Auth ───────────────────────────────────────────────────────────────────

export const signInWithGoogle = async () => {
    const manifest = chrome.runtime.getManifest();
    const clientId = manifest.oauth2.client_id;
    const redirectUrl = chrome.identity.getRedirectURL();

    // Generate a nonce for security
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    const encoder = new TextEncoder();
    const encodedNonce = encoder.encode(nonce);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encodedNonce);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Go directly to Google's OAuth endpoint (not through Supabase)
    const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('redirect_uri', redirectUrl);
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('nonce', hashedNonce);

    return new Promise((resolve) => {
        chrome.identity.launchWebAuthFlow(
            { url: authUrl.href, interactive: true },
            async (callbackUrl) => {
                if (chrome.runtime.lastError || !callbackUrl) {
                    resolve({ data: null, error: chrome.runtime.lastError || new Error('Auth cancelled') });
                    return;
                }

                // Extract the ID token from the callback URL hash
                const url = new URL(callbackUrl);
                const params = new URLSearchParams(url.hash.substring(1));
                const idToken = params.get('id_token');

                if (idToken) {
                    // Exchange Google ID token for a Supabase session
                    const { data, error } = await supabase.auth.signInWithIdToken({
                        provider: 'google',
                        token: idToken,
                        nonce: nonce,
                    });
                    resolve({ data, error });
                } else {
                    resolve({ data: null, error: new Error('No ID token in callback') });
                }
            }
        );
    });
};

export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
};

export const getSession = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
};

export const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user;
};

// ─── Applications ───────────────────────────────────────────────────────────

export const getApplications = async ({ limit = 50, offset = 0, status, search } = {}) => {
    let query = supabase
        .from('applications')
        .select('*, cover_letters(id, content, generated_by, created_at)')
        .order('applied_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (status) {
        query = query.eq('status', status);
    }
    if (search) {
        query = query.or(`company_name.ilike.%${search}%,job_title.ilike.%${search}%`);
    }

    const { data, error } = await query;
    return { data, error };
};

export const logApplication = async (applicationData) => {
    const user = await getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
        .from('applications')
        .insert([{ user_id: user.id, ...applicationData }])
        .select()
        .single();

    return { data, error };
};

export const updateApplicationStatus = async (applicationId, status) => {
    const { data, error } = await supabase
        .from('applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select()
        .single();

    return { data, error };
};

export const deleteApplication = async (applicationId) => {
    const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', applicationId);

    return { error };
};

// ─── Cover Letters ──────────────────────────────────────────────────────────

export const saveCoverLetter = async ({ applicationId, content, jobTitle, companyName, generatedBy = 'gpt-4' }) => {
    const user = await getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };

    const { data, error } = await supabase
        .from('cover_letters')
        .insert([{
            user_id: user.id,
            application_id: applicationId || null,
            content,
            job_title: jobTitle,
            company_name: companyName,
            generated_by: generatedBy,
        }])
        .select()
        .single();

    return { data, error };
};

export const getCoverLetters = async ({ applicationId } = {}) => {
    let query = supabase
        .from('cover_letters')
        .select('*')
        .order('created_at', { ascending: false });

    if (applicationId) {
        query = query.eq('application_id', applicationId);
    }

    const { data, error } = await query;
    return { data, error };
};

export const deleteCoverLetter = async (id) => {
    const { error } = await supabase
        .from('cover_letters')
        .delete()
        .eq('id', id);

    return { error };
};

// ─── Answer Memory (Cloud Sync) ─────────────────────────────────────────────

export const syncAnswerMemoryToCloud = async (localMemory) => {
    const user = await getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const entries = Object.entries(localMemory).map(([key, entry]) => ({
        user_id: user.id,
        question_hash: key,
        question_text: entry.question,
        answer_value: entry.answer,
        field_tag: entry.fieldTag || 'input',
        use_count: entry.useCount || 1,
        last_used: entry.lastUsed ? new Date(entry.lastUsed).toISOString() : new Date().toISOString(),
    }));

    if (entries.length === 0) return { data: [], error: null };

    const { data, error } = await supabase
        .from('answer_memory')
        .upsert(entries, { onConflict: 'user_id,question_hash' })
        .select();

    return { data, error };
};

export const pullAnswerMemoryFromCloud = async () => {
    const { data, error } = await supabase
        .from('answer_memory')
        .select('*')
        .order('last_used', { ascending: false });

    if (error) return { data: null, error };

    // Convert to local format: { [questionHash]: { question, answer, fieldTag, lastUsed, useCount } }
    const memory = {};
    for (const row of data) {
        memory[row.question_hash] = {
            question: row.question_text,
            answer: row.answer_value,
            fieldTag: row.field_tag || 'input',
            lastUsed: new Date(row.last_used).getTime(),
            useCount: row.use_count || 1,
        };
    }

    return { data: memory, error: null };
};

export const deleteCloudAnswer = async (questionHash) => {
    const { error } = await supabase
        .from('answer_memory')
        .delete()
        .eq('question_hash', questionHash);

    return { error };
};
