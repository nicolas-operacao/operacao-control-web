// Sistema de Toast global — sem React Context para simplicidade máxima
// Qualquer arquivo pode chamar toast.success('msg') sem precisar de Provider

type ToastType = 'success' | 'error' | 'info' | 'warning';

export type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
let nextId = 1;
const listeners: Listener[] = [];

function notify() {
  listeners.forEach(l => l([...toasts]));
}

export const toast = {
  success: (message: string) => add(message, 'success'),
  error:   (message: string) => add(message, 'error'),
  info:    (message: string) => add(message, 'info'),
  warning: (message: string) => add(message, 'warning'),
  subscribe: (listener: Listener) => {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  },
};

function add(message: string, type: ToastType) {
  const id = nextId++;
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  }, 4000);
}
