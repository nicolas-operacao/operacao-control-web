import React, { useState } from 'react';
import { api } from '../services/api';
import { somClick, somHover, somAlerta } from '../services/hudSounds';
import { toast } from '../services/toast';

interface Props { isOpen: boolean; onClose: () => void; venda: any; onSuccess: () => void; }

export function ModalReembolsoAdmin({ isOpen, onClose, venda, onSuccess }: Props) {
  const [refundReason, setRefundReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !venda) return null;

  const formataBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  async function handleConfirmRefund(e: React.FormEvent) {
    e.preventDefault(); setIsLoading(true);
    try {
      await api.post(`/sales/${venda.id}/cancel`, { reason: refundReason });
      somAlerta(); toast.success('Reembolso efetuado com sucesso!');
      setRefundReason(''); onSuccess();
    } catch (error: any) { toast.error(`Erro: ${error.response?.data?.error || error.message}`); } finally { setIsLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bg-zinc-900 border border-red-500/30 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-[0_0_30px_rgba(220,38,38,0.15)] animate-in slide-in-from-bottom-4 sm:zoom-in duration-200 max-h-[95dvh] overflow-y-auto overscroll-contain">
        <div className="sm:hidden flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-zinc-700 rounded-full" /></div>
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-red-950/30"><h2 className="text-xl font-black text-red-500 uppercase flex items-center gap-2">🔴 Forçar Reembolso</h2><button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="text-zinc-500 hover:text-white text-2xl">&times;</button></div>
        <form onSubmit={handleConfirmRefund} className="p-6 space-y-6">
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800"><p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Estornar venda de:</p><p className="text-white font-black text-lg">{venda.customer_name}</p><p className="text-zinc-500 text-sm mt-1">Valor: <span className="text-red-400 font-bold">{formataBRL(Number(venda.sale_value))}</span></p><p className="text-zinc-500 text-xs mt-1">Vendedor: <span className="text-blue-400 font-bold">{venda.seller_name}</span></p></div>
            <div><label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">Motivo do Reembolso</label><textarea required value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Ex: Cliente desistiu..." className="w-full bg-zinc-950 border border-zinc-800 text-white rounded p-3 focus:outline-none focus:border-red-500 min-h-[100px]" /><p className="text-red-500/70 text-[10px] mt-2 font-bold">O valor será deduzido da meta.</p></div>
            <div className="flex gap-3 pt-2"><button type="button" onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="w-1/3 border border-zinc-700 hover:bg-zinc-800 text-white font-bold py-3 rounded-lg uppercase tracking-widest transition-colors text-xs">Cancelar</button><button onMouseEnter={somHover} onClick={somClick} disabled={isLoading} className="w-2/3 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-lg uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all text-xs">{isLoading ? 'PROCESSANDO...' : 'CONFIRMAR ESTORNO'}</button></div>
        </form>
      </div>
    </div>
  );
}