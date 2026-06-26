import { create } from 'zustand';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'offline';

interface ConnectionState {
  status: ConnectionStatus;
  /** Timestamp of the last successful connection, used to drive offline sync. */
  lastConnectedAt: number | null;
  setStatus: (status: ConnectionStatus) => void;
  markConnected: () => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'connecting',
  lastConnectedAt: null,
  setStatus: (status) => set({ status }),
  markConnected: () => set({ status: 'connected', lastConnectedAt: Date.now() }),
}));
