import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Props { isOpen: boolean; onClose: () => void; venda: any; produtos: any[]; onSuccess: () => void; }

export function ModalEdicaoAdmin({ isOpen, onClose, venda, produtos, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ product_name: '', sale_value: '', customer_name: '', customer_email: '', customer_phone: '', payment_method: 'PIX', sale_date: '' });

  const somSucesso = () => new Audio('https://actions.google.com/sounds/v1/cartoon/bell_ding.ogg').play().catch(() => {});

  useEffect(() => {
    if (venda) {
      setFormData({ product_name: venda.product_name, sale_value: String(venda.sale_value), customer_name: venda.customer_name, customer_email: venda.customer_email || '', customer_phone: venda.customer_phone || '', payment_method: venda.payment_method || 'PIX', sale_date: venda.created_at ? new Date(venda.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0] });
    }
  }, [venda]);

  if (!isOpen || !venda) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setIsLoading(true);
    try {
      const novaData = new Date(`${formData.sale_date}T12:00:00Z`).toISOString();
      await api.put(`/sales/${venda.id}`, { ...formData, sale_value: Number(formData.sale_value), created_at: novaData });
      somSucesso(); alert('✅ Venda atualizada com sucesso!');
      onSuccess();
    } catch (error) { alert(`🚨 Erro ao editar.`); } finally { setIsLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl w-full max-w-xl shadow-2xl animate-in zoom-in duration-150">
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-blue-900/10"><h2 className="text-xl font-black text-blue-400 uppercase flex items-center gap-2">✏️ Editar Venda Global</h2><button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl">&times;</button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Produto</label><select value={formData.product_name} onChange={(e) => setFormData({...formData, product_name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white cursor-pointer">{produtos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}</select></div>
                <div><label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Valor R$</label><input type="number" step="0.01" value={formData.sale_value} onChange={(e) => setFormData({...formData, sale_value: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-yellow-400 font-bold" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Data da Venda</label><input type="date" value={formData.sale_date} onChange={(e) => setFormData({...formData, sale_date: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white [color-scheme:dark]" /></div>
                <div><label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Pagamento</label><select value={formData.payment_method} onChange={(e) => setFormData({...formData, payment_method: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white"><option value="PIX">PIX</option><option value="Cartão de Crédito (até 12x)">Cartão de Crédito (até 12x)</option><option value="Crédito à vista">Crédito à vista</option><option value="Débito à vista">Débito à vista</option><option value="Boleto Parcelado">Boleto Parcelado</option></select></div>
            </div>
            <div><label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Nome do Cliente</label><input type="text" required value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white" /></div>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">WhatsApp / Telefone</label><input type="text" required value={formData.customer_phone} onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white" /></div>
                <div><label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">E-mail do Cliente</label><input type="email" required value={formData.customer_email} onChange={(e) => setFormData({...formData, customer_email: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white" /></div>
            </div>
            <div className="flex gap-3 pt-4"><button type="button" onClick={onClose} className="w-1/3 border border-zinc-700 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-colors text-xs">Cancelar</button><button disabled={isLoading} className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all text-xs">{isLoading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}</button></div>
        </form>
      </div>
    </div>
  );
}