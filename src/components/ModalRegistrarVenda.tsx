import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import confetti from 'canvas-confetti';
import { somClick, somHover } from '../services/hudSounds';

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

export function ModalRegistrarVenda({ isOpen, onClose, produtos, user, onVendaRegistrada }: ModalRegistrarVendaProps) {
  const hoje = new Date().toISOString().split('T')[0];
  
  // 🔥 Trouxemos todos os estados do formulário para cá!
  const [saleDate, setSaleDate] = useState(hoje);
  const [productName, setProductName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [saleValue, setSaleValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const somSucesso = () => new Audio('https://actions.google.com/sounds/v1/cartoon/bell_ding.ogg').play().catch(()=>{});
  const lancarConfetes = () => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#FACC15', '#22C55E', '#3B82F6'] });
  };

  // Garante que o primeiro produto já venha selecionado
  useEffect(() => {
    if (produtos.length > 0 && !productName) {
      setProductName(produtos[0].nome);
      setSaleValue(String(produtos[0].valor));
    }
  }, [produtos, productName]);

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
      await api.post('/sales', {
        seller_id: user.id, product_name: productName, customer_name: customerName,
        customer_email: customerEmail, customer_phone: customerPhone, payment_method: paymentMethod,
        sale_value: Number(saleValue), sale_date: saleDate
      });
      somSucesso(); 
      lancarConfetes(); 
      alert('⚡ Venda registrada com sucesso!');
      
      // Limpa os campos
      setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setSaleDate(hoje);
      
      // Avisa o Dashboard para atualizar a tela e fechar o modal
      onVendaRegistrada(); 
    } catch (error: any) { 
      alert('Erro ao registrar venda.'); 
    } finally { 
      setIsLoading(false); 
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="bg-zinc-950 p-6 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="text-2xl font-black text-yellow-400 uppercase tracking-wider">🎯 Venda do Comando</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-2xl font-bold leading-none">&times;</button>
        </div>

        <form onSubmit={handleRegisterSale} className="p-6 space-y-4">
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