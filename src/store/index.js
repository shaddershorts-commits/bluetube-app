import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const useAuthStore = create((set) => ({
  token: null,
  user: null,
  introSeen: false,
  isLoading: true,
  setToken: async (token) => {
    if (token) await SecureStore.setItemAsync('bt_token', token);
    else await SecureStore.deleteItemAsync('bt_token');
    set({ token });
  },
  setUser: (user) => set({ user }),
  markIntroSeen: async () => {
    await SecureStore.setItemAsync('bt_intro_visto', '1').catch(() => {});
    set({ introSeen: true });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('bt_token');
    await SecureStore.deleteItemAsync('bt_refresh_token');
    set({ token: null, user: null });
  },
  init: async () => {
    try {
      const [token, introFlag] = await Promise.all([
        SecureStore.getItemAsync('bt_token'),
        SecureStore.getItemAsync('bt_intro_visto'),
      ]);
      set({ token, introSeen: introFlag === '1', isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));

export const useFeedStore = create((set) => ({
  videos: [],
  cursor: null,
  hasMore: true,
  isLoading: false,
  currentIndex: 0,
  setVideos: (videos) => set({ videos }),
  addVideos: (videos) => set((s) => ({ videos: [...s.videos, ...videos] })),
  setCursor: (cursor) => set({ cursor }),
  setHasMore: (hasMore) => set({ hasMore }),
  setLoading: (isLoading) => set({ isLoading }),
  setCurrentIndex: (i) => set({ currentIndex: i }),
  reset: () => set({ videos: [], cursor: null, hasMore: true, currentIndex: 0 }),
}));
