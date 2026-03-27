import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

type Venda = {
  id: string;
  product_name: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  payment_method?: string;
  sale_value: number;
  status: string;
  created_at: string;
  seller_name?: string; 
};

export function Suporte() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Suporte', id: '' };

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [filtroDias, setFiltroDias] = useState<number>(7); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [isLoading, setIsLoading] = useState(false);

  // 🔥 ESTADO DAS GUIAS (TABS)
  const [abaAtiva, setAbaAtiva] = useState<'aprovadas' | 'canceladas'>('aprovadas');

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Venda | null>(null);
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    fetchVendas();
  }, []);

  async function fetchVendas() {
    try {
      const response = await api.get('/sales');
      setVendas(response.data);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
    }
  }

  function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  }

  function openRefundModal(venda: Venda) {
    setSelectedSale(venda);
    setRefundReason('');
    setIsRefundModalOpen(true);
  }

  function copiarEmail(email?: string) {
    if (!email) return;
    navigator.clipboard.writeText(email);
    alert(`📧 E-mail copiado para a área de transferência:\n${email}`);
  }

  async function handleConfirmRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSale) return;
    setIsLoading(true);

    try {
      await api.post(`/sales/${selectedSale.id}/cancel`, {
        reason: refundReason
      });

      new Audio('https://actions.google.com/sounds/v1/alarms/buzzer_alarm.ogg').play().catch(()=>{});
      
      alert('🔴 Reembolso efetuado! O valor foi removido do placar do vendedor.');
      setIsRefundModalOpen(false);
      setSelectedSale(null);
      fetchVendas(); 
    } catch (error: any) {
      const mensagemReal = error.response?.data?.error || error.message;
      alert(`🚨 ERRO DO SERVIDOR: ${mensagemReal}`);
    } finally {
      setIsLoading(false);
    }
  }

  // Lógica de Filtragem de Datas, Busca e Abas
  const vendasFiltradas = vendas.filter(venda => {
    if (!venda.created_at) return false;
    
    // Filtro da Aba (Aprovadas vs Canceladas)
    if (abaAtiva === 'aprovadas' && venda.status !== 'aprovada') return false;
    if (abaAtiva === 'canceladas' && venda.status !== 'cancelada') return false;

    const dataVenda = new Date(venda.created_at);
    const limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - (filtroDias - 1));
    limiteData.setHours(0, 0, 0, 0);
    const dentroDaData = dataVenda >= limiteData;

    const termo = searchTerm.toLowerCase();
    const passouNaBusca = 
      (venda.customer_name && venda.customer_name.toLowerCase().includes(termo)) ||
      (venda.customer_email && venda.customer_email.toLowerCase().includes(termo)) ||
      (venda.customer_phone && venda.customer_phone.toLowerCase().includes(termo));

    if (searchTerm.trim() === '') {
      return dentroDaData;
    } else {
      return dentroDaData && passouNaBusca;
    }

  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const formataBRL = (valor: number) => 
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const qtdAprovadas = vendas.filter(v => v.status === 'aprovada').length;
  const qtdCanceladas = vendas.filter(v => v.status === 'cancelada').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-center pb-4 border-b border-zinc-800 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-purple-500 uppercase tracking-wider flex items-center gap-3">
              🛡️ CENTRAL DE SUPORTE
            </h1>
            <p className="text-zinc-400 mt-1">Operador: <span className="text-white font-bold">{user.name}</span></p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="border border-zinc-700 hover:border-purple-500 hover:text-purple-400 text-zinc-400 font-bold px-6 py-2 rounded transition-colors text-sm uppercase tracking-wider"
            >
              Voltar
            </button>
            <button 
              onClick={handleLogout} 
              className="border-2 border-red-900 text-red-500 hover:bg-red-900 hover:text-white px-6 py-2 rounded font-bold transition-all text-sm uppercase tracking-wider"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
          
          {/* 🔥 GUIAS (TABS) TÁTICAS */}
          <div className="flex gap-4 mb-8 border-b border-zinc-800 pb-px">
            <button 
              onClick={() => setAbaAtiva('aprovadas')}
              className={`px-6 py-3 font-black uppercase tracking-widest rounded-t-lg transition-colors border-b-2 text-xs md:text-sm ${abaAtiva === 'aprovadas' ? 'border-purple-500 text-purple-400 bg-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 bg-zinc-900/30'}`}
            >
              Análise de Risco ({qtdAprovadas})
            </button>
            <button 
              onClick={() => setAbaAtiva('canceladas')}
              className={`px-6 py-3 font-black uppercase tracking-widest rounded-t-lg transition-colors border-b-2 text-xs md:text-sm ${abaAtiva === 'canceladas' ? 'border-red-500 text-red-400 bg-red-950/20' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 bg-zinc-900/30'}`}
            >
              Histórico de Baixas ({qtdCanceladas})
            </button>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-zinc-800 pb-6">
            
            <div className="flex flex-col md:flex-row items-center gap-3 w-full">
              <div className="w-full md:w-96">
                <input 
                  type="text"
                  placeholder="Buscar por cliente, e-mail ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full bg-zinc-950 border ${abaAtiva === 'canceladas' ? 'border-red-900/50 focus:border-red-500' : 'border-zinc-700 focus:border-purple-500'} text-white rounded p-3 text-xs outline-none transition-colors placeholder:text-zinc-600`}
                />
              </div>

              <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800 w-full md:w-auto justify-center ml-auto">
                <span className="text-zinc-500 text-[10px] font-bold uppercase ml-2 hidden lg:block">Exibir:</span>
                <button onClick={() => setFiltroDias(7)} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${filtroDias === 7 ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}>7 dias</button>
                <button onClick={() => setFiltroDias(15)} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${filtroDias === 15 ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}>15 dias</button>
                <button onClick={() => setFiltroDias(30)} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${filtroDias === 30 ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}>30 dias</button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className={`border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest ${abaAtiva === 'canceladas' ? 'bg-red-950/10' : 'bg-zinc-950/50'}`}>
                  <th className="p-4 font-black">Data</th>
                  <th className="p-4 font-black">Soldado (Vendedor)</th>
                  <th className="p-4 font-black">Cliente & Contato</th>
                  <th className="p-4 font-black">Produto</th>
                  <th className="p-4 font-black text-right">Valor</th>
                  
                  {/* 🔥 NOVA COLUNA DE PAGAMENTO */}
                  <th className="p-4 font-black text-center">Pagamento</th>
                  
                  <th className="p-4 font-black text-center">Status</th>
                  {abaAtiva === 'aprovadas' && <th className="p-4 font-black text-center">Ação</th>}
                </tr>
              </thead>
              <tbody className="text-sm">
                {vendasFiltradas.length > 0 ? vendasFiltradas.map(venda => (
                  <tr key={venda.id} className={`border-b border-zinc-800/50 transition-colors ${venda.status === 'cancelada' ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-zinc-800/40'}`}>
                    <td className="p-4 text-zinc-400 whitespace-nowrap">
                      {venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--'}
                    </td>
                    <td className="p-4 font-black text-blue-400 uppercase tracking-wider">
                      {venda.seller_name || 'Desconhecido'}
                    </td>
                    <td className="p-4 text-zinc-200 font-medium">
                      {venda.customer_name}
                      <div className="text-[10px] text-zinc-500 font-normal mt-1">
                        📞 {venda.customer_phone || 'Sem telefone'}
                      </div>
                      <div 
                        onClick={() => copiarEmail(venda.customer_email)}
                        className="text-[10px] text-blue-400 font-bold cursor-pointer mt-0.5 hover:text-blue-300 transition-colors" 
                        title="Clique para copiar o e-mail"
                      >
                        📧 {venda.customer_email || 'Sem e-mail'}
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400 text-xs">{venda.product_name}</td>
                    <td className={`p-4 font-black text-right whitespace-nowrap ${venda.status === 'cancelada' ? 'text-red-400 line-through opacity-70' : 'text-zinc-100'}`}>
                      {formataBRL(Number(venda.sale_value))}
                    </td>
                    
                    {/* 🔥 EXIBIÇÃO DO MÉTODO DE PAGAMENTO AQUI */}
                    <td className="p-4 text-center text-zinc-400 text-[10px] font-bold uppercase">
                      {venda.payment_method || '--'}
                    </td>

                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider 
                        ${venda.status === 'aprovada' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                          'bg-red-500/10 text-red-500 border border-red-500/20'}`}
                      >
                        {venda.status === 'cancelada' ? 'REEMBOLSADO' : venda.status}
                      </span>
                    </td>
                    {abaAtiva === 'aprovadas' && (
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => openRefundModal(venda)}
                          className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/50 px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Reembolsar
                        </button>
                      </td>
                    )}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-600 uppercase font-black tracking-widest italic">
                      Nenhuma venda encontrada nesta categoria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE JUSTIFICATIVA DE REEMBOLSO */}
      {isRefundModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/30 rounded-2xl w-full max-w-md shadow-[0_0_30px_rgba(220,38,38,0.15)] animate-in zoom-in duration-150">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-red-950/30">
              <h2 className="text-xl font-black text-red-500 uppercase flex items-center gap-2">
                🔴 Confirmar Reembolso
              </h2>
              <button onClick={() => setIsRefundModalOpen(false)} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
            </div>
            
            <form onSubmit={handleConfirmRefund} className="p-6 space-y-6">
                <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                  <p className="text-zinc-400 text-xs uppercase tracking-widest mb-1">Estornar venda de:</p>
                  <p className="text-white font-black text-lg">{selectedSale.customer_name}</p>
                  <p className="text-zinc-500 text-sm mt-1">Valor: <span className="text-red-400 font-bold">{formataBRL(Number(selectedSale.sale_value))}</span></p>
                  <p className="text-zinc-500 text-xs mt-1">Pagamento: <span className="text-yellow-400 font-bold">{selectedSale.payment_method || '--'}</span></p>
                  <p className="text-zinc-500 text-xs mt-1">Vendedor: <span className="text-blue-400 font-bold">{selectedSale.seller_name}</span></p>
                </div>

                <div>
                  <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">
                    Motivo do Reembolso (Obrigatório)
                  </label>
                  <textarea 
                    required 
                    value={refundReason} 
                    onChange={(e) => setRefundReason(e.target.value)} 
                    placeholder="Ex: Cliente desistiu da compra no prazo de garantia..."
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded p-3 focus:outline-none focus:border-red-500 min-h-[100px]" 
                  />
                  <p className="text-red-500/70 text-[10px] mt-2 font-bold">
                    Atenção: Esta ação removerá o valor do placar do vendedor.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsRefundModalOpen(false)} className="w-1/3 border border-zinc-700 hover:bg-zinc-800 text-white font-bold py-3 rounded-lg uppercase tracking-widest transition-colors text-xs">
                      Cancelar
                  </button>
                  <button disabled={isLoading} className="w-2/3 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-lg uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all text-xs">
                      {isLoading ? 'PROCESSANDO...' : 'CONFIRMAR ESTORNO'}
                  </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}