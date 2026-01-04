import { create } from 'zustand';
import { fetchWithRetry } from '@/lib/api';

type Theme = 'dark' | 'light';

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => Promise<void>;
    initTheme: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || '';

export const useThemeStore = create<ThemeState>((set) => ({
    theme: 'dark', // Default
    setTheme: async (theme: Theme) => {
        // Optimistic update
        set({ theme });
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);

        try {
            await fetchWithRetry(`${API_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'theme', value: theme }),
            });
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    },
    initTheme: async () => {
        try {
            const res = await fetchWithRetry(`${API_URL}/api/settings`);
            if (res.ok) {
                const settings = await res.json();
                const remoteTheme = (settings.theme as Theme) || 'dark';
                set({ theme: remoteTheme });
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(remoteTheme);
            }
        } catch (error) {
            console.error('Failed to init theme:', error);
        }
    },
}));
