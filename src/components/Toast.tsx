import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'error' | 'success' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-md px-4">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 animate-fade-in ${
              isError
                ? 'bg-rose-950/85 border-rose-500/40 text-rose-100'
                : isSuccess
                ? 'bg-emerald-950/85 border-emerald-500/40 text-emerald-100'
                : 'bg-slate-900/85 border-sky-500/40 text-sky-100'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
              {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              {isSuccess && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
              {!isError && !isSuccess && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
              <span>{toast.text}</span>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
