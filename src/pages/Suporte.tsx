import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { somClick, somHover, somAlerta, somSucesso } from '../services/hudSounds';
import { toast } from '../services/toast';

const FRASES_SUPORTE = [
  { texto: 'Cada acesso liberado é uma missão cumprida.', emoji: '🛡️', cor: 'text-purple-400' },
  { texto: 'Você é a linha de defesa do cliente. Mantenha o posto!', emoji: '⚔️', cor: 'text-blue-400' },
  { texto: 'Sem suporte, não há vitória. Você faz isso acontecer.', emoji: '🏆', cor: 'text-yellow-400' },
  { texto: 'Rapidez e precisão — o suporte que transforma vendas em entregas.', emoji: '🚀', cor: 'text-cyan-400' },
  { texto: 'Liberar acesso é abrir portas para o sucesso do cliente.', emoji: '🔓', cor: 'text-green-400' },
  { texto: 'Seu trabalho silencioso move o time inteiro.', emoji: '💎', cor: 'text-purple-300' },
];

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

function tipoAlerta(venda: Venda): 'boleto' | 'combo' | 'upgrade' | null {
  const prod = (venda.product_name ?? '').toLowerCase();
  const pag  = (venda.payment_method ?? '').toLowerCase();
  if (pag.includes('boleto parcelado')) return 'boleto';
  if (prod.includes('combo'))   return 'combo';
  if (prod.includes('upgrade')) return 'upgrade';
  return null;
}

export function Suporte() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Suporte', id: '' };

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [filtroDias, setFiltroDias] = useState<number>(7);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [liberando, setLiberando] = useState<string | null>(null);
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'pendentes' | 'aprovadas' | 'canceladas'>('pendentes');

  const frase = useMemo(() => {
    const idx = new Date().getHours() % FRASES_SUPORTE.length;
    return FRASES_SUPORTE[idx];
  }, []);

  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Venda | null>(null);
  const [refundReason, setRefundReason] = useState('');

  // Para detectar novas pendências e tocar alerta
  const qtdPendentesAnterior = useRef<number | null>(null);

  useEffect(() => {
    fetchVendas();
    // Polling a cada 30s para detectar novas vendas pendentes
    const interval = setInterval(fetchVendas, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchVendas() {
    try {
      const response = await api.get('/sales');
      const dados: Venda[] = response.data;
      setVendas(dados);

      const qtdPendentes = dados.filter(v =>
        v.status === 'pendente_boleto' || v.status === 'pendente_liberacao'
      ).length;

      // Toca alerta se chegou venda nova pendente
      if (qtdPendentesAnterior.current !== null && qtdPendentes > qtdPendentesAnterior.current) {
        somAlerta();
        toast.warning(`⚠️ Nova venda aguardando liberação!`);
      }
      qtdPendentesAnterior.current = qtdPendentes;
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
    }
  }

  async function liberarVenda(venda: Venda) {
    setLiberando(venda.id);
    try {
      await api.post(`/sales/${venda.id}/approve`);
      somSucesso();
      toast.success(`✅ Acesso de ${venda.customer_name} liberado!`);
      await fetchVendas();
    } catch (error: any) {
      toast.error('Erro ao liberar. Tente novamente.');
    } finally {
      setLiberando(null);
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
    toast.info(`E-mail copiado: ${email}`);
  }

  async function handleConfirmRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSale) return;
    setIsLoading(true);
    try {
      await api.post(`/sales/${selectedSale.id}/cancel`, { reason: refundReason });
      toast.success('Reembolso efetuado! Valor removido do placar.');
      setIsRefundModalOpen(false);
      setSelectedSale(null);
      fetchVendas();
    } catch (error: any) {
      toast.error(`Erro: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  const vendasPendentes = vendas.filter(v =>
    v.status === 'pendente_boleto' || v.status === 'pendente_liberacao'
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const vendasFiltradas = vendas.filter(venda => {
    if (!venda.created_at) return false;
    if (abaAtiva === 'aprovadas' && venda.status !== 'aprovada') return false;
    if (abaAtiva === 'canceladas' && venda.status !== 'cancelada') return false;

    const dataVenda = new Date(venda.created_at);
    const limiteData = new Date();
    limiteData.setDate(limiteData.getDate() - (filtroDias - 1));
    limiteData.setHours(0, 0, 0, 0);

    const termo = searchTerm.toLowerCase();
    const passouNaBusca =
      (venda.customer_name && venda.customer_name.toLowerCase().includes(termo)) ||
      (venda.customer_email && venda.customer_email.toLowerCase().includes(termo)) ||
      (venda.customer_phone && venda.customer_phone.toLowerCase().includes(termo));

    if (filtroVendedor && venda.seller_name?.toLowerCase() !== filtroVendedor.toLowerCase()) return false;
    if (searchTerm.trim() === '') return dataVenda >= limiteData;
    return dataVenda >= limiteData && passouNaBusca;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const vendedores = [...new Set(vendas.map(v => v.seller_name).filter(Boolean))].sort() as string[];
  const formataBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const qtdAprovadas  = vendas.filter(v => v.status === 'aprovada').length;
  const qtdCanceladas = vendas.filter(v => v.status === 'cancelada').length;
  const qtdPendentes  = vendasPendentes.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* CABEÇALHO */}
        <div className="flex flex-col md:flex-row justify-between items-start pb-4 border-b border-zinc-800 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-purple-500 uppercase tracking-wider flex items-center gap-3">
              🛡️ CENTRAL DE SUPORTE
            </h1>
            <p className="text-zinc-400 mt-1">Operador: <span className="text-white font-bold">{user.name}</span></p>
            <p className={`text-xs font-bold italic mt-1 flex items-center gap-1.5 ${frase.cor}`}>
              <span>{frase.emoji}</span> {frase.texto}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(user.role === 'admin') && (
              <button
                onMouseEnter={somHover}
                onClick={() => { somClick(); navigate('/dashboard'); }}
                className="border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-white px-4 py-2 rounded font-bold transition-all text-sm uppercase tracking-wider"
              >
                ← Dashboard
              </button>
            )}
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); handleLogout(); }}
              className="border-2 border-red-900 text-red-500 hover:bg-red-900 hover:text-white px-6 py-2 rounded font-bold transition-all text-sm uppercase tracking-wider"
            >
              Sair
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">

          {/* TABS */}
          <div className="flex gap-2 mb-8 border-b border-zinc-800 pb-px overflow-x-auto">
            {/* Aba pendentes com badge pulsante */}
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); setAbaAtiva('pendentes'); }}
              className={`relative flex items-center gap-2 px-5 py-3 font-black uppercase tracking-widest rounded-t-lg transition-colors border-b-2 text-xs md:text-sm whitespace-nowrap ${abaAtiva === 'pendentes' ? 'border-yellow-400 text-yellow-400 bg-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
              ⚡ Aguardando Liberação
              {qtdPendentes > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[10px] font-black text-black"
                  style={{
                    background: 'linear-gradient(135deg, #ca8a04, #facc15)',
                    boxShadow: abaAtiva === 'pendentes' ? '0 0 8px rgba(250,204,21,0.6)' : 'none',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                >
                  {qtdPendentes}
                </span>
              )}
            </button>

            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); setAbaAtiva('aprovadas'); }}
              className={`px-5 py-3 font-black uppercase tracking-widest rounded-t-lg transition-colors border-b-2 text-xs md:text-sm whitespace-nowrap ${abaAtiva === 'aprovadas' ? 'border-purple-500 text-purple-400 bg-zinc-950' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
              Análise de Risco ({qtdAprovadas})
            </button>

            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); setAbaAtiva('canceladas'); }}
              className={`px-5 py-3 font-black uppercase tracking-widest rounded-t-lg transition-colors border-b-2 text-xs md:text-sm whitespace-nowrap ${abaAtiva === 'canceladas' ? 'border-red-500 text-red-400 bg-red-950/20' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
              Histórico de Baixas ({qtdCanceladas})
            </button>
          </div>

          {/* ── ABA AGUARDANDO LIBERAÇÃO ── */}
          {abaAtiva === 'pendentes' && (
            <div>
              {qtdPendentes === 0 ? (
                <div className="text-center py-16">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">Tudo liberado!</p>
                  <p className="text-zinc-700 text-xs mt-1">Nenhuma venda aguardando liberação.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vendasPendentes.map(venda => {
                    const tipo = tipoAlerta(venda);
                    const isBoleto  = tipo === 'boleto';
                    const isCombo   = tipo === 'combo';
                    const isUpgrade = tipo === 'upgrade';

                    return (
                      <div
                        key={venda.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border p-4 transition-all"
                        style={{
                          background: isBoleto ? 'rgba(234,179,8,0.04)' : 'rgba(168,85,247,0.04)',
                          borderColor: isBoleto ? 'rgba(234,179,8,0.25)' : 'rgba(168,85,247,0.25)',
                          boxShadow: isBoleto ? '0 0 12px rgba(234,179,8,0.06)' : '0 0 12px rgba(168,85,247,0.06)',
                        }}
                      >
                        {/* Ícone tipo */}
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl"
                          style={{ background: isBoleto ? 'rgba(234,179,8,0.15)' : 'rgba(168,85,247,0.15)' }}
                        >
                          {isBoleto ? '📄' : isCombo ? '📦' : '⬆️'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="text-white font-black text-sm">{venda.customer_name}</p>
                            <span
                              className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border"
                              style={{
                                color: isBoleto ? '#facc15' : '#a855f7',
                                background: isBoleto ? 'rgba(250,204,21,0.1)' : 'rgba(168,85,247,0.1)',
                                borderColor: isBoleto ? 'rgba(250,204,21,0.3)' : 'rgba(168,85,247,0.3)',
                              }}
                            >
                              {isBoleto ? '📄 Boleto Parcelado' : isCombo ? '📦 Combo' : '⬆️ Upgrade'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-zinc-500">
                            <span>🎯 {venda.product_name}</span>
                            <span>💰 {formataBRL(Number(venda.sale_value))}</span>
                            <span>🧑‍💼 {venda.seller_name || 'Desconhecido'}</span>
                            <span>📅 {new Date(venda.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-zinc-600 mt-0.5">
                            {venda.customer_phone && <span>📞 {venda.customer_phone}</span>}
                            {venda.customer_email && (
                              <span
                                className="text-blue-400 cursor-pointer hover:text-blue-300"
                                onClick={() => copiarEmail(venda.customer_email)}
                              >
                                📧 {venda.customer_email}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Botão liberar */}
                        <button
                          onMouseEnter={somHover}
                          onClick={() => { somClick(); liberarVenda(venda); }}
                          disabled={liberando === venda.id}
                          className="flex-shrink-0 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: liberando === venda.id ? '#71717a' : 'linear-gradient(135deg, #16a34a, #22c55e)', boxShadow: liberando === venda.id ? 'none' : '0 0 12px rgba(34,197,94,0.3)' }}
                        >
                          {liberando === venda.id ? '⏳ Liberando...' : '✅ Liberar Acesso'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ABAS APROVADAS / CANCELADAS ── */}
          {abaAtiva !== 'pendentes' && (
            <>
              {/* Filtros */}
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-zinc-800 pb-6">
                <div className="flex flex-col md:flex-row items-center gap-3 w-full">
                  <div className="w-full md:w-80">
                    <input
                      type="text"
                      placeholder="Buscar por cliente, e-mail ou telefone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full bg-zinc-950 border ${abaAtiva === 'canceladas' ? 'border-red-900/50 focus:border-red-500' : 'border-zinc-700 focus:border-purple-500'} text-white rounded p-3 text-xs outline-none transition-colors placeholder:text-zinc-600`}
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <select
                      value={filtroVendedor}
                      onChange={(e) => setFiltroVendedor(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 focus:border-purple-500 text-white rounded p-3 text-xs outline-none transition-colors cursor-pointer"
                    >
                      <option value="">Todos os vendedores</option>
                      {vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800 w-full md:w-auto justify-center ml-auto">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase ml-2 hidden lg:block">Exibir:</span>
                    {[7, 15, 30].map(d => (
                      <button key={d} onMouseEnter={somHover} onClick={() => { somClick(); setFiltroDias(d); }} className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${filtroDias === d ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}>{d} dias</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className={`border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest ${abaAtiva === 'canceladas' ? 'bg-red-950/10' : 'bg-zinc-950/50'}`}>
                      <th className="p-4 font-black">Data</th>
                      <th className="p-4 font-black">Vendedor</th>
                      <th className="p-4 font-black">Cliente & Contato</th>
                      <th className="p-4 font-black">Produto</th>
                      <th className="p-4 font-black text-right">Valor</th>
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
                          <div className="text-[10px] text-zinc-500 font-normal mt-1">📞 {venda.customer_phone || 'Sem telefone'}</div>
                          <div onClick={() => copiarEmail(venda.customer_email)} className="text-[10px] text-blue-400 font-bold cursor-pointer mt-0.5 hover:text-blue-300 transition-colors">
                            📧 {venda.customer_email || 'Sem e-mail'}
                          </div>
                        </td>
                        <td className="p-4 text-zinc-400 text-xs">{venda.product_name}</td>
                        <td className={`p-4 font-black text-right whitespace-nowrap ${venda.status === 'cancelada' ? 'text-red-400 line-through opacity-70' : 'text-zinc-100'}`}>
                          {formataBRL(Number(venda.sale_value))}
                        </td>
                        <td className="p-4 text-center text-zinc-400 text-[10px] font-bold uppercase">
                          {venda.payment_method || '--'}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${venda.status === 'aprovada' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                            {venda.status === 'cancelada' ? 'REEMBOLSADO' : venda.status}
                          </span>
                        </td>
                        {abaAtiva === 'aprovadas' && (
                          <td className="p-4 text-center">
                            <button
                              onMouseEnter={somHover}
                              onClick={() => { somClick(); openRefundModal(venda); }}
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
            </>
          )}
        </div>
      </div>

      {/* MODAL DE JUSTIFICATIVA DE REEMBOLSO */}
      {isRefundModalOpen && selectedSale && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/30 rounded-2xl w-full max-w-md shadow-[0_0_30px_rgba(220,38,38,0.15)]">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-red-950/30">
              <h2 className="text-xl font-black text-red-500 uppercase flex items-center gap-2">🔴 Confirmar Reembolso</h2>
              <button onMouseEnter={somHover} onClick={() => { somClick(); setIsRefundModalOpen(false); }} className="text-zinc-500 hover:text-white text-2xl">&times;</button>
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
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">Motivo do Reembolso (Obrigatório)</label>
                <textarea
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Ex: Cliente desistiu da compra no prazo de garantia..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded p-3 focus:outline-none focus:border-red-500 min-h-[100px]"
                />
                <p className="text-red-500/70 text-[10px] mt-2 font-bold">Atenção: Esta ação removerá o valor do placar do vendedor.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onMouseEnter={somHover} onClick={() => { somClick(); setIsRefundModalOpen(false); }} className="w-1/3 border border-zinc-700 hover:bg-zinc-800 text-white font-bold py-3 rounded-lg uppercase tracking-widest transition-colors text-xs">Cancelar</button>
                <button onMouseEnter={somHover} onClick={somClick} disabled={isLoading} className="w-2/3 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-lg uppercase tracking-widest shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all text-xs">
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
