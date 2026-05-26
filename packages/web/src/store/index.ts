import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ─── Auth Store ─── */
export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  orgId: number;
  orgCode: string;
  orgName: string;
  role: string;
  roles: Array<{ code: string; name: string; quarryId?: number }>;
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  checkAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,

      login: (token, user) => set({ token, user, loading: false }),

      logout: () => {
        localStorage.removeItem('auth-token');
        set({ token: null, user: null });
      },

      checkAuth: () => {
        const { token } = get();
        if (!token) set({ loading: false });
      },

      updateUser: (partial) =>
        set((s) => ({ user: s.user ? { ...s.user, ...partial } : null })),
    }),
    { name: 'abg-auth' }
  )
);

/* ─── Theme Store ─── */
interface ThemeState {
  theme: 'dark' | 'light';
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        set({ theme: next });
      },
    }),
    { name: 'abg-theme' }
  )
);

/* ─── Toast Store ─── */
interface Toast {
  id: number;
  msg: string;
  type: 'success' | 'error' | 'warn';
}

interface ToastState {
  toasts: Toast[];
  notify: (msg: string, type?: Toast['type']) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  notify: (msg, type = 'success') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
