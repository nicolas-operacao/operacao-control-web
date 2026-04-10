import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { somClick, somHover, somSucesso } from '../services/hudSounds';
import { toast } from '../services/toast';

type Produto = {
  id: number;
  nome: string;
  valor: number;
};

interface ModalRegistrarVendaProps {
  isOpen: boolean;
  onClose: () => void;
  produtos: Produto[];
  user: { id: string; name: string };
  onVendaRegistrada: () => void;
}

// Retorna a data de hoje no horário de Brasília (UTC-3) no formato YYYY-MM-DD
function getHojeBRT(): string {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().split('T')[0];
}

export function ModalRegistrarVenda({ isOpen, onClose, produtos, user, onVendaRegistrada }: ModalRegistrarVendaProps) {
  const hoje = getHojeBRT();
  
  // 🔥 Trouxemos todos os estados do formulário para cá!
  const [saleDate, setSaleDate] = useState(hoje);
  const [productName, setProductName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [saleValue, setSaleValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const lancarConfetes = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#FACC15', '#22C55E', '#3B82F6'] });
  };

  // Inicializa o primeiro produto apenas uma vez (quando produtos carregam e o campo está vazio)
  const initializedRef = React.useRef(false);
  useEffect(() => {
    if (!initializedRef.current && produtos.length > 0) {
      setProductName(produtos[0].nome);
      setSaleValue(String(produtos[0].valor));
      initializedRef.current = true;
    }
  }, [produtos]);

  if (!isOpen) return null;

  function handleProductChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nome = e.target.value;
    setProductName(nome);
    const prod = produtos.find(p => p.nome === nome);
    if (prod) setSaleValue(String(prod.valor));
  }

  async function handleRegisterSale(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      const isCheckoutExterno = paymentMethod.startsWith('Checkout CrsaEduca') || paymentMethod.startsWith('Checkout TMB');
      await api.post('/sales', {
        seller_id: isCheckoutExterno ? null : user.id, product_name: productName, customer_name: customerName,
        customer_email: customerEmail, customer_phone: customerPhone, payment_method: paymentMethod,
        sale_value: Number(saleValue), sale_date: saleDate
      });
      const isPendente = paymentMethod.toLowerCase().includes('boleto parcelado') ||
        productName.toLowerCase().includes('combo') ||
        productName.toLowerCase().includes('upgrade');
      if (isPendente) {
        toast.info('⏳ Venda enviada para liberação pelo suporte!');
      } else {
        somSucesso();
        lancarConfetes();
        toast.success('Venda registrada com sucesso!');
      }
      setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setSaleDate(hoje);
      onVendaRegistrada();
    } catch (error: any) {
      toast.error('Erro ao registrar venda.');
    } finally { 
      setIsLoading(false); 
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in duration-200 max-h-[95dvh] flex flex-col">
        {/* Pill drag handle — visível só no mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-zinc-700 rounded-full" />
        </div>

        <div className="bg-zinc-950 p-4 md:p-6 border-b border-zinc-800 flex justify-between items-center flex-shrink-0">
          <h2 className="text-2xl font-black text-yellow-400 uppercase tracking-wider">🎯 Venda do Comando</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl font-bold leading-none">&times;</button>
        </div>

        <form onSubmit={handleRegisterSale} className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1 overscroll-contain">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Produto Vendido</label>
              <select value={productName} onChange={handleProductChange} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 cursor-pointer">
                {produtos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                {produtos.length === 0 && <option value="">Cadastre produtos primeiro...</option>}
              </select>
            </div>
            <div>
              <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Valor da Venda (R$)</label>
              <input type="number" step="0.01" required value={saleValue} onChange={(e) => setSaleValue(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-yellow-400 font-bold rounded p-3 focus:outline-none focus:border-yellow-400"/>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Nome do Cliente</label>
              <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400"/>
            </div>
            <div>
              <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Telefone</label>
              <input type="text" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400"/>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">E-mail do Cliente</label>
              <input type="email" required value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400"/>
            </div>
            <div>
              <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Data da Venda</label>
              <input type="date" required value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 cursor-pointer [color-scheme:dark]"/>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Método de Pagamento</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-yellow-400 cursor-pointer">
              <option value="PIX">PIX</option>
              <option value="Cartão de Crédito (até 12x)">Cartão de Crédito (até 12x)</option>
              <option value="Crédito à vista">Crédito à vista</option>
              <option value="Débito à vista">Débito à vista</option>
              <option value="Boleto Parcelado">Boleto Parcelado</option>
              <option disabled>──────────────</option>
              <option value="Checkout CrsaEduca">Checkout CrsaEduca</option>
              <option value="Checkout TMB">Checkout TMB</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800 mt-6">
            <button type="button" onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="px-6 py-3 font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest text-sm">CANCELAR</button>
            <button type="submit" onMouseEnter={somHover} onClick={somClick} disabled={isLoading} className="bg-yellow-400 hover:bg-yellow-500 text-black font-black px-8 py-3 rounded uppercase tracking-wider transition-transform hover:scale-105 active:scale-95 disabled:opacity-50">
              {isLoading ? 'ENVIANDO...' : 'SALVAR VENDA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}