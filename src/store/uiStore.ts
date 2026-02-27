import { create } from 'zustand';

interface UIState {
  settingsOpen: boolean;
  settingsDefaultTab: string | null;
  climateModalOpen: boolean;
  logModalOpen: boolean;
  apiLogOpen: boolean;
  regionModalOpen: boolean;
  selectedClimateDevice: any | null;
  selectedRemoteDevice: any | null;

  // Actions
  setSettingsOpen: (open: boolean) => void;
  setClimateModalOpen: (open: boolean) => void;
  setLogModalOpen: (open: boolean) => void;
  setApiLogOpen: (open: boolean) => void;
  setRegionModalOpen: (open: boolean) => void;
  setSelectedClimateDevice: (device: any | null) => void;
  setSelectedRemoteDevice: (device: any | null) => void;

  // Helper to open specific modal with data
  openClimateModal: (device: any) => void;
  openRemoteModal: (device: any) => void;
  /** 打开设置并跳转到指定 Tab */
  openSettingsAt: (tab: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  settingsDefaultTab: null,
  climateModalOpen: false,
  logModalOpen: false,
  apiLogOpen: false,
  regionModalOpen: false,
  selectedClimateDevice: null,
  selectedRemoteDevice: null,

  setSettingsOpen: (open) => set({ settingsOpen: open, settingsDefaultTab: open ? null : null }),
  setClimateModalOpen: (open) => set({ climateModalOpen: open }),
  setLogModalOpen: (open) => set({ logModalOpen: open }),
  setApiLogOpen: (open) => set({ apiLogOpen: open }),
  setRegionModalOpen: (open) => set({ regionModalOpen: open }),
  setSelectedClimateDevice: (device) => set({ selectedClimateDevice: device }),
  setSelectedRemoteDevice: (device) => set({ selectedRemoteDevice: device }),

  openClimateModal: (device) => set({ selectedClimateDevice: device, climateModalOpen: true }),
  openRemoteModal: (device) => set({ selectedRemoteDevice: device }),
  openSettingsAt: (tab) => set({ settingsOpen: true, settingsDefaultTab: tab }),
}));
