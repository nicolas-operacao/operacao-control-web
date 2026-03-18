import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

type Venda = {
  id: string;
  product_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_method: string;
  sale_value: number;
  status: string;
  created_at: string;
};

export function Suporte() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Suporte', id: '' };

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [busca, setBusca] = useState('');
  
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [vendaParaCancelar, setVendaParaCancelar] = useState<Venda | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  useEffect(() => {
    fetchVendas();
  }, []);

  // 1. BUSCA AS VENDAS REAIS NO BANCO
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

  // Filtro inteligente
  const vendasFiltradas = vendas.filter(v => 
    v.customer_name.toLowerCase().includes(busca.toLowerCase()) ||
    v.customer_email.toLowerCase().includes(busca.toLowerCase()) ||
    v.customer_phone.includes(busca)
  );

  const vendasPendentes = vendasFiltradas.filter(v => v.status.includes('pendente'));
  const vendasAprovadas = vendasFiltradas.filter(v => v.status === 'aprovada');

  // 2. APROVA A VENDA DE VERDADE
  async function handleLiberarAcesso(id: string) {
    try {
      await api.patch(`/sales/${id}/approve`);
      alert('Acesso liberado! O vendedor acaba de pontuar no placar! ⚡');
      fetchVendas(); // Atualiza a tela
    } catch (error) {
      alert('Erro ao liberar acesso.');
    }
  }

  function abrirModalCancelamento(venda: Venda) {
    setVendaParaCancelar(venda);
    setIsCancelModalOpen(true);
  }

  // 3. CANCELA A VENDA COM JUSTIFICATIVA
  async function handleConfirmarCancelamento(e: React.FormEvent) {
    e.preventDefault();
    if (!motivoCancelamento.trim()) {
      alert('É obrigatório informar o motivo do cancelamento.');
      return;
    }

    try {
      await api.post(`/sales/${vendaParaCancelar?.id}/cancel`, { reason: motivoCancelamento });
      alert('Venda cancelada e reembolso registrado.');
      setIsCancelModalOpen(false);
      setMotivoCancelamento('');
      fetchVendas(); // Atualiza a tela
    } catch (error) {
      alert('Erro ao registrar cancelamento.');
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-center pb-4 border-b border-zinc-800 gap-4">
          <h1 className="text-3xl md:text-4xl font-black text-purple-500 uppercase tracking-wider flex items-center gap-3">
            Central de Resoluções <span className="text-zinc-500 text-lg md:text-xl ml-2 font-bold">(Suporte)</span>
          </h1>
          <div className="flex gap-4">
            {/* NOVO: Se for Admin, mostra botão para voltar pro Dashboard */}
            {user.role === 'admin' && (
              <button 
                onClick={() => navigate('/dashboard')} 
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded font-bold transition-all uppercase text-sm border border-zinc-700"
              >
                Voltar ao Comando
              </button>
            )}
            <button 
              onClick={handleLogout} 
              className="border-2 border-zinc-700 text-zinc-300 hover:border-red-500 hover:text-red-500 px-6 py-2 rounded font-bold transition-all duration-300 uppercase text-sm tracking-wider"
            >
              Sair
            </button>
          </div>
        </div>

        {/* BARRA DE BUSCA GLOBAL */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
          <label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">🔍 Localizar Cliente (Nome, E-mail ou Telefone)</label>
          <input 
            type="text" 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite para filtrar instantaneamente..."
            className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-4 text-lg focus:outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-600"
          />
        </div>

        {/* ÁREA 1: ALERTAS DE LIBERAÇÃO (PRIORIDADE) */}
        <div className="bg-zinc-900 border-l-4 border-orange-500 rounded-xl p-6 shadow-2xl flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6 uppercase flex items-center gap-2">
            🚨 Requer Liberação Manual (Combos / Upgrades / Boletos)
          </h2>
          
          {vendasPendentes.length === 0 ? (
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-10 text-center">
              <p className="text-zinc-500 font-medium">Nenhuma liberação pendente no momento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-zinc-800 text-zinc-500 uppercase text-xs tracking-wider">
                    <th className="p-4 font-bold">Cliente</th>
                    <th className="p-4 font-bold">Produto</th>
                    <th className="p-4 font-bold">Contato</th>
                    <th className="p-4 font-bold text-right">Ação Tática</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasPendentes.map(venda => (
                    <tr key={venda.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-bold text-white">{venda.customer_name}</td>
                      <td className="p-4 text-orange-400 font-black uppercase text-sm">{venda.product_name}</td>
                      <td className="p-4 text-zinc-400 text-sm">
                        <div>{venda.customer_email}</div>
                        <div>{venda.customer_phone}</div>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleLiberarAcesso(venda.id)} 
                          className="bg-orange-500 hover:bg-orange-400 text-black font-black py-2 px-6 rounded shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-transform hover:scale-105 uppercase text-xs tracking-wider"
                        >
                          ✔️ Liberar Acesso
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ÁREA 2: HISTÓRICO GERAL (PARA CANCELAMENTOS) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6 uppercase flex items-center gap-2">
            ✅ Vendas Aprovadas (Gestão de Reembolso)
          </h2>
          
          {vendasAprovadas.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">Nenhuma venda aprovada para exibir.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-zinc-800 text-zinc-500 uppercase text-xs tracking-wider">
                    <th className="p-4 font-bold">Cliente</th>
                    <th className="p-4 font-bold">Produto</th>
                    <th className="p-4 font-bold">Valor</th>
                    <th className="p-4 font-bold text-right">Gerenciar</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasAprovadas.map(venda => (
                    <tr key={venda.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 font-bold text-white">
                        {venda.customer_name}
                        <div className="text-zinc-500 font-normal text-xs">{venda.customer_email}</div>
                      </td>
                      <td className="p-4 text-zinc-300 font-medium">{venda.product_name}</td>
                      <td className="p-4 text-green-400 font-bold">R$ {Number(venda.sale_value).toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => abrirModalCancelamento(venda)} 
                          className="border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white font-bold py-1 px-4 rounded transition-colors uppercase text-xs tracking-wider"
                        >
                          Reembolsar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE JUSTIFICATIVA DE CANCELAMENTO */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-900 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(220,38,38,0.1)] overflow-hidden animate-in fade-in zoom-in duration-200">
            
            <div className="bg-red-950/50 p-6 border-b border-red-900/50 flex justify-between items-center">
              <h2 className="text-xl font-black text-red-500 uppercase tracking-wider">⚠️ Solicitar Reembolso</h2>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-zinc-500 hover:text-white text-2xl font-bold leading-none">&times;</button>
            </div>

            <form onSubmit={handleConfirmarCancelamento} className="p-6 space-y-4">
              <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                <p className="text-zinc-400 text-sm">Cancelando venda de:</p>
                <p className="text-white font-bold text-lg">{vendaParaCancelar?.customer_name}</p>
                <p className="text-zinc-500 text-sm">{vendaParaCancelar?.product_name} - R$ {Number(vendaParaCancelar?.sale_value).toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-red-400 text-xs font-bold uppercase tracking-widest mb-2">Motivo do Reembolso (Obrigatório)</label>
                <textarea 
                  required rows={4} value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Ex: Cliente solicitou estorno no 3º dia pelo WhatsApp..."
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 focus:outline-none focus:border-red-500 transition-colors placeholder:text-zinc-700 resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800 mt-6">
                <button type="button" onClick={() => setIsCancelModalOpen(false)} className="px-6 py-3 font-bold text-zinc-400 hover:text-white">VOLTAR</button>
                <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-3 rounded uppercase tracking-wider transition-colors">
                  CONFIRMAR CANCELAMENTO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}