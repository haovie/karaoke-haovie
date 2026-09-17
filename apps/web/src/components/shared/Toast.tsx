import { create } from 'zustand';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const useToast = () => {
  const addToast = useToastStore((s) => s.addToast);
  return {
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error'),
    info: (msg: string) => addToast(msg, 'info'),
  };
};

export const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts);
  
  return (
    <div className="fixed bottom-20 left-0 right-0 md:top-4 md:bottom-auto md:left-auto md:right-4 z-50 flex flex-col items-center md:items-end gap-2 pointer-events-none px-4">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto px-4 py-2 rounded shadow-lg text-white font-medium animate-[slideIn_0.3s_ease-out] ${t.type === 'success' ? 'bg-green-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
};