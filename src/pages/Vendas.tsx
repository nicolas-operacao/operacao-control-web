import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { GuerraEquipes } from '../components/GuerraEquipes'; 

type Produto = {
  id: number;
  nome: string;
  valor: number;
};

type Venda = {
  id: string;
  product_name: string;
  sale_value: number;
  created_at: string; 
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  status: string;
  seller_id: string | number; 
  edit_status?: string; 
};

export function Vendas() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Vendedor', id: '' };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); 

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [filtro, setFiltro] = useState<'dia' | 'semana' | 'mes'>('mes');

  const [productName, setProductName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [saleValue, setSaleValue] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [editingSaleId, setEditingSaleId] = useState('');
  const [editReason, setEditReason] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [prodRes, salesRes] = await Promise.all([
        api.get('/products'),
        api.get('/sales') 
      ]);

      setProdutos(prodRes.data);
      setVendas(salesRes.data);
      
      if (prodRes.data.length > 0) {
        setProductName(prodRes.data[0].nome);
        setSaleValue(String(prodRes.data[0].valor));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  }

  function handleProductChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nomeSelecionado = e.target.value;
    setProductName(nomeSelecionado);

    const produtoEscolhido = produtos.find(p => p.nome === nomeSelecionado);
    if (produtoEscolhido) {
      setSaleValue(String(produtoEscolhido.valor));
    }
  }

  function handleOpenEdit(venda: Venda) {
    setEditingSaleId(venda.id);
    setProductName(venda.product_name);
    setSaleValue(String(venda.sale_value));
    setCustomerName(venda.customer_name);
    setCustomerEmail(venda.customer_email || '');
    setCustomerPhone(venda.customer_phone || '');
    setPaymentMethod(venda.payment_method || 'PIX');
    setEditReason('');
    
    if (venda.created_at) {
      setSaleDate(new Date(venda.created_at).toISOString().split('T')[0]);
    }

    setIsEditModalOpen(true);
  }

  function resetForm() {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setEditReason('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    if (produtos.length > 0) {
      setProductName(produtos[0].nome);
      setSaleValue(String(produtos[0].valor));
    }
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

      alert('⚡ Venda registrada com sucesso!');
      resetForm();
      setIsModalOpen(false);
      fetchData(); 
    } catch (error: any) {
      alert('Erro ao registrar venda.');
    } finally {
      setIsLoading(false);
    }
  }

  // 🔥 ATUALIZADO: ENVIA A DATA JUNTO COM O PEDIDO DE EDIÇÃO
  async function handleRequestEdit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Ajusta a nova data para o formato exato que o banco de dados exige
      const novaDataFormatada = new Date(`${saleDate}T12:00:00Z`).toISOString();

      const newData = {
        product_name: productName,
        sale_value: Number(saleValue),
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        payment_method: paymentMethod,
        created_at: novaDataFormatada // 🔥 AQUI ESTÁ A DATA CORRIGIDA!
      };

      await api.post(`/sales/${editingSaleId}/request-edit`, {
        reason: editReason,
        newData: newData
      });

      alert('🛡️ Solicitação de edição enviada ao Comando Militar! Aguarde aprovação.');
      resetForm();
      setIsEditModalOpen(false);
      fetchData(); 
    } catch (error: any) {
      alert('Erro ao solicitar edição. Fale com o suporte.');
    } finally {
      setIsLoading(false);
    }
  }

  const vendasFiltradas = vendas.filter(venda => {
    if (String(venda.seller_id) !== String(user.id)) return false;
    if (!venda.created_at) return false;
    
    const dataVenda = new Date(venda.created_at);
    const hoje = new Date();
    
    if (filtro === 'dia') return dataVenda.toDateString() === hoje.toDateString();
    if (filtro === 'semana') {
      const umaSemanaAtras = new Date();
      umaSemanaAtras.setDate(hoje.getDate() - 7);
      return dataVenda >= umaSemanaAtras;
    }
    return true; 
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 md:p-8 relative">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 border-b border-zinc-800 gap-4">
          <div>
            <h1 className="text-3xl font-black text-yellow-400 tracking-tight uppercase flex items-center gap-3">
              CENTRAL DO VENDEDOR <span className="text-xl">⚡</span>
            </h1>
            <p className="text-zinc-400">Soldado: <span className="text-white font-bold">{user.name}</span></p>
          </div>
          <button onClick={handleLogout} className="border-2 border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-red-500 px-6 py-2 rounded font-bold transition-all uppercase text-sm">
            Sair da Operação
          </button>
        </div>

        <div className="mb-10">
           <GuerraEquipes />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex gap-2">
              <button onClick={() => setFiltro('dia')} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all ${filtro === 'dia' ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>Hoje</button>
              <button onClick={() => setFiltro('semana')} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all ${filtro === 'semana' ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>Semana</button>
              <button onClick={() => setFiltro('mes')} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase transition-all ${filtro === 'mes' ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400'}`}>Mês</button>
            </div>
            
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-black font-black px-8 py-3 rounded-lg shadow-lg transition-transform hover:scale-105"
            >
              + LANÇAR NOVA VENDA
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-widest">
                  <th className="pb-4">Data</th>
                  <th className="pb-4">Cliente</th>
                  <th className="pb-4">Produto</th>
                  <th className="pb-4">Valor</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {vendasFiltradas.length > 0 ? vendasFiltradas.map(venda => (
                  <tr key={venda.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="py-4 text-zinc-400">
                      {venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR') : '--/--/----'}
                    </td>
                    <td className="py-4 font-bold">{venda.customer_name}</td>
                    <td className="py-4 text-zinc-300">{venda.product_name}</td>
                    <td className="py-4 text-green-400 font-bold">R$ {(Number(venda.sale_value) || 0).toFixed(2)}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${venda.status === 'aprovada' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        {venda.status === 'aprovada' ? 'Aprovada' : 'Pendente'}
                      </span>
                    </td>
                    <td className="py-4 text-center">
                      {venda.edit_status === 'pendente' ? (
                        <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/30">
                          ⏳ EM ANÁLISE
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleOpenEdit(venda)}
                          className="text-blue-400 hover:text-blue-300 text-xs font-bold underline transition-colors"
                        >
                          Corrigir Erro
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-zinc-600 uppercase font-bold tracking-widest italic">
                      Nenhuma venda sua foi encontrada neste período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-xl shadow-2xl animate-in zoom-in duration-150">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-black text-green-500 uppercase">🎯 Registrar Venda</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
            </div>
            <form onSubmit={handleRegisterSale} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Produto</label>
                        <select value={productName} onChange={handleProductChange} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white cursor-pointer">
                            {produtos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Valor R$</label>
                        <input type="number" step="0.01" value={saleValue} onChange={(e) => setSaleValue(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-yellow-400 font-bold" />
                    </div>
                </div>
                <div>
                    <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Data</label>
                    <input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white [color-scheme:dark]" />
                </div>
                <div>
                    <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Nome do Cliente</label>
                    <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">WhatsApp / Telefone</label>
                        <input type="text" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white" placeholder="Ex: (11) 99999-9999" />
                    </div>
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">E-mail do Cliente</label>
                        <input type="email" required value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white" placeholder="Ex: email@cliente.com" />
                    </div>
                </div>
                <div>
                    <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Método de Pagamento</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white">
                        <option value="PIX">PIX</option>
                        <option value="Cartão de Crédito (até 12x)">Cartão de Crédito (até 12x)</option>
                        <option value="Crédito à vista">Crédito à vista</option>
                        <option value="Débito à vista">Débito à vista</option>
                        <option value="Boleto Parcelado">Boleto Parcelado</option>
                    </select>
                </div>
                <button disabled={isLoading} className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-xl mt-4 uppercase tracking-widest shadow-lg transition-colors">
                    {isLoading ? 'ENVIANDO...' : 'CONFIRMAR LANÇAMENTO ⚡'}
                </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 🔥 MODAL DE SOLICITAR EDIÇÃO ATUALIZADO   */}
      {/* ========================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl w-full max-w-xl shadow-[0_0_30px_rgba(59,130,246,0.15)] animate-in zoom-in duration-150">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-blue-900/10">
              <h2 className="text-xl font-black text-blue-400 uppercase">🛡️ Solicitar Correção</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleRequestEdit} className="p-6 space-y-4">
                
                <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-lg mb-6">
                  <label className="block text-red-400 text-xs font-black uppercase mb-2 flex items-center gap-2">
                    ⚠️ JUSTIFICATIVA DO ERRO
                  </label>
                  <textarea 
                    required 
                    value={editReason} 
                    onChange={(e) => setEditReason(e.target.value)} 
                    placeholder="Explique detalhadamente por que você está alterando esta venda..."
                    className="w-full bg-zinc-900 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-blue-500 min-h-[80px]" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Produto Correto</label>
                        <select value={productName} onChange={handleProductChange} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white cursor-pointer">
                            {produtos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Valor Correto R$</label>
                        <input type="number" step="0.01" value={saleValue} onChange={(e) => setSaleValue(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-yellow-400 font-bold" />
                    </div>
                </div>
                
                {/* 🔥 AQUI ESTÁ O CAMPO DE DATA ADICIONADO! */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Nome do Cliente</label>
                        <input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white" />
                    </div>
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Data Correta</label>
                        <input type="date" required value={saleDate} onChange={(e) => setSaleDate(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white [color-scheme:dark]" />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Telefone Correto</label>
                        <input type="text" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white" />
                    </div>
                    <div>
                        <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">E-mail Correto</label>
                        <input type="email" required value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white" />
                    </div>
                </div>
                <div>
                    <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Método de Pagamento</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded p-2.5 text-sm text-white">
                        <option value="PIX">PIX</option>
                        <option value="Cartão de Crédito (até 12x)">Cartão de Crédito (até 12x)</option>
                        <option value="Crédito à vista">Crédito à vista</option>
                        <option value="Débito à vista">Débito à vista</option>
                        <option value="Boleto Parcelado">Boleto Parcelado</option>
                    </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-1/3 border border-zinc-700 hover:bg-zinc-800 text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-colors">
                      CANCELAR
                  </button>
                  <button disabled={isLoading} className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all">
                      {isLoading ? 'ENVIANDO...' : 'ENVIAR PARA APROVAÇÃO'}
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}