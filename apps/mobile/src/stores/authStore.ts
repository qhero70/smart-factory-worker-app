import { create } from 'zustand';

interface User {
  id: string;
  employeeId: string;
  name: string;
  role: string;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  setAuth: (user, accessToken, refreshToken) =>
    set({ user, accessToken, refreshToken }),
  clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
}));

interface KPI {
  totalQuantity: number;
  totalDefect: number;
  defectRate: number;
  reportCount: number;
}

interface KPIStore {
  kpi: KPI | null;
  setKPI: (kpi: KPI) => void;
}

export const useKPIStore = create<KPIStore>((set) => ({
  kpi: null,
  setKPI: (kpi) => set({ kpi }),
}));
