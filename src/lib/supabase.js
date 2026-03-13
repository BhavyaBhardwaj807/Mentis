import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const looksLikePlaceholder = (value) => {
    if (!value) return true;
    const normalized = value.trim().toLowerCase();
    return (
        normalized.includes('your_') ||
        normalized.includes('_here') ||
        normalized.includes('placeholder')
    );
};

const isValidSupabaseUrl = (value) => {
    if (!value || looksLikePlaceholder(value)) return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:';
    } catch {
        return false;
    }
};

export const isSupabaseConfigured =
    isValidSupabaseUrl(supabaseUrl) && !looksLikePlaceholder(supabaseAnonKey);

if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured correctly. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env and restart Vite.');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
);
