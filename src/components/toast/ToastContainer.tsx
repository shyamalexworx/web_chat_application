import React from 'react';
import { useChat } from '../../context/ChatContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useChat();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none select-none max-w-sm">
      {toasts.map((toast) => {
        let icon = <Info className="w-4 h-4 text-[#4F8CFF]" />;
        let borderColor = 'border-[#4F8CFF]/30';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-4 h-4 text-[#32C48D]" />;
          borderColor = 'border-[#32C48D]/30';
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-4 h-4 text-[#F05D6C]" />;
          borderColor = 'border-[#F05D6C]/30';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle className="w-4 h-4 text-[#F5A623]" />;
          borderColor = 'border-[#F5A623]/30';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center space-x-3 px-3.5 py-2.5 bg-[#181C25] border ${borderColor} rounded-xl shadow-modal animate-slide-down`}
          >
            <div className="flex-shrink-0">{icon}</div>
            <div className="flex-1 text-xs text-[#F5F7FA] font-medium leading-tight">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#929BAA] hover:text-[#F5F7FA] p-0.5 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

