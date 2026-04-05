import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';
import { BotaoHUD } from '../components/BotaoHUD';

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

export function Liberacoes() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Suporte', id: '' };

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [aprovando, setAprovando] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchPendentes(); }, []);

  async function fetchPendentes() {
    setLoading(true);
    try {
      const res = await api.get('/sales');
      const todas: Venda[] = res.data;
      setVendas(todas.filter(v => v.status === 'pendente_liberacao' || v.status === 'pendente_boleto'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAprovar(id: string) {
    setAprovando(id);
    try {
      await api.post(`/sales/${id}/approve`);
      setVendas(prev => prev.filter(v => v.id !== id));
    } catch (e: any) {
      alert(`Erro: ${e.response?.data?.error || e.message}`);
    } finally {
      setAprovando(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  }

  const formataBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const vendasFiltradas = vendas.filter(v => {
    if (!searchTerm.trim()) return true;
    const t = searchTerm.toLowerCase();
    return (
      v.customer_name?.toLowerCase().includes(t) ||
      v.seller_name?.toLowerCase().includes(t) ||
      v.product_name?.toLowerCase().includes(t)
    );
  });

  const pendLiber = vendas.filter(v => v.status === 'pendente_liberacao').length;
  const pendBoleto = vendas.filter(v => v.status === 'pendente_boleto').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-center pb-4 border-b border-zinc-800 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-purple-400 uppercase tracking-wider flex items-center gap-3">
              🛠️ Central de Liberações
            </h1>
            <p className="text-zinc-500 text-sm mt-1 uppercase tracking-widest font-bold">
              Operador: <span className="text-white">{user.name}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <BotaoHUD variant="ghost" onClick={() => { somClick(); navigate('/dashboard'); }}>
              ← Voltar
            </BotaoHUD>
            <BotaoHUD variant="danger" onClick={() => { somClick(); handleLogout(); }}>
              Sair
            </BotaoHUD>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-yellow-700/40 rounded-xl p-4">
            <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Aguardando Liberação</p>
            <p className="text-3xl font-black text-yellow-400 mt-1">{pendLiber}</p>
            <p className="text-zinc-600 text-xs mt-1">combos / upgrades</p>
          </div>
          <div className="bg-zinc-900 border border-blue-700/40 rounded-xl p-4">
            <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Boleto Parcelado</p>
            <p className="text-3xl font-black text-blue-400 mt-1">{pendBoleto}</p>
            <p className="text-zinc-600 text-xs mt-1">aguardando confirmação</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-700/40 rounded-xl p-4">
            <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Total na Fila</p>
            <p className="text-3xl font-black text-white mt-1">{vendas.length}</p>
            <p className="text-zinc-600 text-xs mt-1">vendas pendentes</p>
          </div>
        </div>

        {/* BUSCA */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Buscar por cliente, vendedor ou produto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-purple-500 text-white rounded-lg px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-zinc-600"
          />
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); fetchPendentes(); }}
            className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
          >
            ↻ Atualizar
          </button>
        </div>

        {/* TABELA */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-zinc-600">
              <div className="text-center space-y-3">
                <div className="text-4xl animate-pulse">⏳</div>
                <p className="text-sm font-bold uppercase tracking-widest">Carregando...</p>
              </div>
            </div>
          ) : vendasFiltradas.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center space-y-3">
                <div className="text-5xl">{vendas.length === 0 ? '✅' : '🔍'}</div>
                <p className="text-zinc-400 font-black uppercase tracking-widest text-sm">
                  {vendas.length === 0 ? 'Fila vazia! Tudo liberado.' : 'Nenhum resultado'}
                </p>
                <p className="text-zinc-600 text-xs">
                  {vendas.length === 0 ? 'Todas as vendas foram processadas.' : 'Tente outro termo de busca.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest bg-zinc-950/50">
                    <th className="p-4 font-black">Data</th>
                    <th className="p-4 font-black">Vendedor</th>
                    <th className="p-4 font-black">Cliente</th>
                    <th className="p-4 font-black">Produto</th>
                    <th className="p-4 font-black text-right">Valor</th>
                    <th className="p-4 font-black text-center">Tipo</th>
                    <th className="p-4 font-black text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-zinc-800/50">
                  {vendasFiltradas.map(venda => (
                    <tr key={venda.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-4 text-zinc-400 whitespace-nowrap text-xs">
                        {new Date(venda.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>
                      <td className="p-4 font-black text-blue-400 uppercase tracking-wider text-xs">
                        {venda.seller_name || '—'}
                      </td>
                      <td className="p-4">
                        <p className="text-white font-medium text-sm">{venda.customer_name}</p>
                        {venda.customer_phone && (
                          <p className="text-zinc-500 text-[10px] mt-0.5">📞 {venda.customer_phone}</p>
                        )}
                      </td>
                      <td className="p-4 text-zinc-300 text-xs max-w-[160px] truncate">
                        {venda.product_name}
                      </td>
                      <td className="p-4 text-right font-black text-yellow-400 whitespace-nowrap">
                        {formataBRL(Number(venda.sale_value))}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${
                          venda.status === 'pendente_liberacao'
                            ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}>
                          {venda.status === 'pendente_liberacao' ? 'Liberação' : 'Boleto'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onMouseEnter={somHover}
                          onClick={() => { somClick(); handleAprovar(venda.id); }}
                          disabled={aprovando === venda.id}
                          className="bg-green-600/20 hover:bg-green-600 text-green-400 hover:text-white border border-green-600/50 px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {aprovando === venda.id ? '...' : 'Liberar'}
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
    </div>
  );
}
