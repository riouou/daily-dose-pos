import { create } from 'zustand';
import { io } from 'socket.io-client';
import { MenuItem, Category, FlavorSection } from '@/types/pos';
import { toast } from 'sonner';
import { fetchWithRetry } from '@/lib/api';

interface MenuState {
    items: MenuItem[];
    categories: Category[];
    globalAddons: FlavorSection[];
    isLoading: boolean;
    fetchMenu: () => Promise<void>;
    addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
    updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
    deleteMenuItem: (id: string) => Promise<void>;
    addCategory: (category: string) => Promise<void>;
    deleteCategory: (category: string) => Promise<void>;
    reorderCategories: (categories: string[]) => Promise<void>;
    fetchGlobalAddons: () => Promise<void>;
    saveGlobalAddons: (addons: FlavorSection[]) => Promise<void>;
}

import { API_URL } from '../lib/config';


export const useMenuStore = create<MenuState>((set, get) => ({
    items: [],
    categories: ['All'],
    globalAddons: [],
    isLoading: false,

    fetchMenu: async () => {
        set({ isLoading: true });
        try {
            const res = await fetchWithRetry(`${API_URL}/api/menu`);
            if (res.ok) {
                const data = await res.json();
                set({
                    items: data.items,
                    categories: data.categories,
                    // Load globalAddons if returned by API, else fetch them separately or default to []
                    globalAddons: data.globalAddons || []
                });
            }
        } catch (error) {
            console.error('Failed to fetch menu:', error);
            // Only show toast after all retries fail
            toast.error('Connection failed. Could not load menu.');
        } finally {
            set({ isLoading: false });
        }
    },

    fetchGlobalAddons: async () => {
        try {
            const res = await fetchWithRetry(`${API_URL}/api/settings`);
            if (res.ok) {
                const settings = await res.json();
                if (settings.global_addons) {
                    try {
                        const addons = JSON.parse(settings.global_addons);
                        set({ globalAddons: addons });
                    } catch (e) {
                        console.error('Failed to parse global addons', e);
                        set({ globalAddons: [] });
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch global addons:', error);
        }
    },

    saveGlobalAddons: async (addons) => {
        try {
            const res = await fetchWithRetry(`${API_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'global_addons', value: JSON.stringify(addons) }),
            });
            if (res.ok) {
                set({ globalAddons: addons });
                toast.success('Global add-ons saved');
                // Emit event handled by saving setting
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to save global add-ons');
        }
    },

    addMenuItem: async (item) => {
        try {
            const res = await fetchWithRetry(`${API_URL}/api/menu/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item),
            });
            if (res.ok) {
                const newItem = await res.json();
                set((state) => ({ items: [...state.items, newItem] }));
                toast.success('Item added successfully');
            } else {
                throw new Error('Failed to add item');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to add item');
        }
    },

    updateMenuItem: async (id, updates) => {
        try {
            const res = await fetchWithRetry(`${API_URL}/api/menu/items/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                const updatedItem = await res.json();
                set((state) => ({
                    items: state.items.map((i) => (i.id === id ? updatedItem : i)),
                }));
                toast.success('Item updated');
            } else {
                throw new Error('Failed to update item');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to update item');
        }
    },

    deleteMenuItem: async (id) => {
        try {
            const res = await fetchWithRetry(`${API_URL}/api/menu/items/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                set((state) => ({
                    items: state.items.filter((i) => i.id !== id),
                }));
                toast.success('Item deleted');
            } else {
                throw new Error('Failed to delete item');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete item');
        }
    },

    addCategory: async (category) => {
        try {
            const res = await fetchWithRetry(`${API_URL}/api/menu/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category }),
            });
            if (res.ok) {
                const categories = await res.json();
                set({ categories });
                toast.success('Category added');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to add category');
        }
    },

    deleteCategory: async (category) => {
        try {
            const res = await fetchWithRetry(`${API_URL}/api/menu/categories/${encodeURIComponent(category)}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                const categories = await res.json();
                set({ categories });
                toast.success('Category deleted');
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to delete');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete category');
        }
    },

    reorderCategories: async (categories) => {
        // Optimistic update
        set({ categories });

        try {
            const res = await fetchWithRetry(`${API_URL}/api/menu/categories/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categories }),
            });

            if (!res.ok) {
                // Revert on failure (fetch actual state)
                await get().fetchMenu();
                throw new Error('Failed to save order');
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to reorder categories');
        }
    }
}));

// Socket listening for menu changes
const socket = io(API_URL);

socket.on('connect', () => {
    // console.log('MenuStore connected to socket');
});

socket.on('menu:update', () => {
    // console.log('Menu update received, refetching...');
    useMenuStore.getState().fetchMenu();
});

socket.on('settings:update', (setting: { key: string, value: string }) => {
    if (setting.key === 'global_addons') {
        try {
            const addons = JSON.parse(setting.value);
            useMenuStore.setState({ globalAddons: addons });
        } catch (e) {
            console.error('Failed to sync global addons update', e);
        }
    }
});
