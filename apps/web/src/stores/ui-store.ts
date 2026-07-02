import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  activityPanelOpen: boolean;
  previewFile: { id: string; name: string; storageKey: string } | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleActivityPanel: () => void;
  setActivityPanelOpen: (open: boolean) => void;
  setPreviewFile: (file: { id: string; name: string; storageKey: string } | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      activityPanelOpen: false,
      previewFile: null,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleActivityPanel: () => set((s) => ({ activityPanelOpen: !s.activityPanelOpen })),
      setActivityPanelOpen: (open) => set({ activityPanelOpen: open }),
      setPreviewFile: (file) => set({ previewFile: file }),
    }),
    {
      name: 'vaultly-ui',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        activityPanelOpen: state.activityPanelOpen,
      }),
    },
  ),
);
