import React from 'react';
import { somClick, somHover } from '../services/hudSounds';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'red' | 'blue' | 'green' | 'yellow';
  onCancel: () => void;
  onConfirm: () => void;
}

export function ModalConfirmacao({ isOpen, title, message, type, onCancel, onConfirm }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
      <div className={`bg-zinc-950 border ${type === 'red' ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : type === 'green' ? 'border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]' : 'border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.2)]'} rounded-2xl w-full max-w-md animate-in zoom-in duration-200 overflow-hidden`}>
        <div className={`p-6 border-b border-zinc-800 ${type === 'red' ? 'bg-red-950/30' : type === 'green' ? 'bg-green-950/30' : 'bg-blue-950/30'}`}>
          <h2 className={`text-xl font-black uppercase tracking-widest flex items-center gap-2 ${type === 'red' ? 'text-red-500' : type === 'green' ? 'text-green-500' : 'text-blue-500'}`}>
            {type === 'red' && '⚠️ '} {type === 'green' && '✅ '} {type === 'blue' && '🛡️ '} {title}
          </h2>
        </div>
        <div className="p-6"><p className="text-zinc-300 text-sm font-medium leading-relaxed">{message}</p></div>
        <div className="p-6 bg-zinc-900/50 border-t border-zinc-800 flex gap-3">
          <button onMouseEnter={somHover} onClick={() => { somClick(); onCancel(); }} className="flex-1 border border-zinc-700 hover:bg-zinc-800 text-white font-bold py-3 rounded-lg uppercase tracking-widest text-xs transition-colors">CANCELAR</button>
          <button onMouseEnter={somHover} onClick={() => { somClick(); onConfirm(); }} className={`flex-1 font-black py-3 rounded-lg uppercase tracking-widest text-xs shadow-lg transition-transform hover:scale-105 ${type === 'red' ? 'bg-red-600 hover:bg-red-500 text-white' : type === 'green' ? 'bg-green-600 hover:bg-green-500 text-black' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>CONFIRMAR</button>
        </div>
      </div>
    </div>
  );
}