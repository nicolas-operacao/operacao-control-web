import { useEffect, useState } from 'react';
import { toast, type Toast } from '../services/toast';

const ICONS = {
  success: '✅',
  error:   '🚨',
  info:    '💡',
  warning: '⚠️',
};

const COLORS = {
  success: 'border-green-500/40 bg-green-950/60 text-green-300',
  error:   'border-red-500/40 bg-red-950/60 text-red-300',
  info:    'border-blue-500/40 bg-blue-950/60 text-blue-300',
  warning: 'border-yellow-500/40 bg-yellow-950/60 text-yellow-300',
};

const BARS = {
  success: 'bg-green-500',
  error:   'bg-red-500',
  info:    'bg-blue-500',
  warning: 'bg-yellow-400',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-xs w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`relative overflow-hidden rounded-xl border shadow-2xl backdrop-blur-sm pointer-events-auto animate-in slide-in-from-right-4 duration-300 ${COLORS[t.type]}`}
        >
          <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${BARS[t.type]} opacity-60`} />
          <div className="px-4 py-3 flex items-start gap-3">
            <span className="text-base leading-none mt-0.5 flex-shrink-0">{ICONS[t.type]}</span>
            <p className="text-sm font-bold leading-snug">{t.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
