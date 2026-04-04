import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { GuerraEquipes } from '../components/GuerraEquipes';
import { ModalMensagemTatica } from '../components/ModalMensagemTatica';
import confetti from 'canvas-confetti';

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

// 🔥 FUNÇÕES BLINDADAS FORA DO COMPONENTE PARA NÃO PESAR A MEMÓRIA
const checkCancelada = (status?: string) => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'cancelada' || s === 'cancelado' || s === 'reembolsado' || s === 'reembolsada' || s === 'estornado';
};

const checkAprovada = (status?: string) => {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'aprovada' || s === 'aprovado';
};

export function Vendas() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  
  // 🔥 USEMEMO: Guarda o usuário na memória
  const user = useMemo(() => userString ? JSON.parse(userString) : { name: 'Vendedor', id: '' }, [userString]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); 

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  
  const [filtro, setFiltro] = useState<'dia' | 'semana' | 'mes' | 'reembolsos'>('mes');

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
  const [mostrarComissao, setMostrarComissao] = useState(false);

  // ── Notificação de venda aprovada ──────────────────────────────────────────
  type VendaAprovada = { product_name: string; sale_value: number; customer_name: string };
  const [vendaAprovadaNotif, setVendaAprovadaNotif] = useState<VendaAprovada | null>(null);
  // Usamos ref para guardar IDs pendentes sem criar dependência circular
  const prevPendingIdsRef = useRef<Set<string>>(new Set());
  // Ref com a função de celebração para evitar closure velha dentro do useCallback
  const celebracaoRef = useRef<((v: VendaAprovada) => void) | null>(null);

  // Mantém celebracaoRef sempre atualizada sem re-criar fetchData
  celebracaoRef.current = (venda: VendaAprovada) => {
    setVendaAprovadaNotif(venda);
    const cores = ['#22C55E', '#FACC15', '#3B82F6', '#A855F7', '#FFFFFF', '#F97316'];
    // Rajadas de confete em 4 posições
    confetti({ particleCount: 150, spread: 100, origin: { y: 0.5, x: 0.5 }, colors: cores });
    setTimeout(() => confetti({ particleCount: 100, spread: 80, angle: 60,  origin: { x: 0, y: 0.6 }, colors: cores }), 300);
    setTimeout(() => confetti({ particleCount: 100, spread: 80, angle: 120, origin: { x: 1, y: 0.6 }, colors: cores }), 300);
    setTimeout(() => confetti({ particleCount: 80,  spread: 60, origin: { y: 0.3, x: 0.5 }, colors: cores }), 700);
    // Som de caixa registradora seguido de sino
    try { new Audio('https://actions.google.com/sounds/v1/foley/cash_register.ogg').play(); } catch {}
    setTimeout(() => { try { new Audio('https://actions.google.com/sounds/v1/cartoon/bell_ding.ogg').play(); } catch {} }, 800);
    setTimeout(() => setVendaAprovadaNotif(null), 8000);
  };

  // fetchData definido ANTES do useEffect que o usa
  const fetchData = useCallback(async (detectarAprovadas = false) => {
    try {
      const [prodRes, salesRes] = await Promise.all([
        api.get('/products'),
        api.get('/sales')
      ]);

      const novasVendas: Venda[] = salesRes.data;
      const userId = String(JSON.parse(localStorage.getItem('user') || '{}').id || '');

      if (detectarAprovadas && prevPendingIdsRef.current.size > 0) {
        const recemAprovadas = novasVendas.filter(v =>
          String(v.seller_id) === userId &&
          checkAprovada(v.status) &&
          prevPendingIdsRef.current.has(v.id)
        );
        if (recemAprovadas.length > 0) {
          celebracaoRef.current?.({
            product_name: recemAprovadas[0].product_name,
            sale_value:   recemAprovadas[0].sale_value,
            customer_name: recemAprovadas[0].customer_name,
          });
        }
      }

      // Atualiza IDs pendentes para próxima comparação
      prevPendingIdsRef.current = new Set(
        novasVendas
          .filter(v => String(v.seller_id) === userId && !checkAprovada(v.status) && !checkCancelada(v.status))
          .map(v => v.id)
      );

      setProdutos(prodRes.data);
      setVendas(novasVendas);

      if (prodRes.data.length > 0) {
        setProductName(prodRes.data[0].nome);
        setSaleValue(String(prodRes.data[0].valor));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }, []);

  // Polling: verifica a cada 15s se alguma venda pendente foi aprovada
  useEffect(() => {
    fetchData(false); // carga inicial sem celebração
    const intervalo = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(intervalo);
  }, [fetchData]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/');
  }, [navigate]);

  const handleProductChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const nomeSelecionado = e.target.value;
    setProductName(nomeSelecionado);

    const produtoEscolhido = produtos.find(p => p.nome === nomeSelecionado);
    if (produtoEscolhido) {
      setSaleValue(String(produtoEscolhido.valor));
    }
  }, [produtos]);

  const handleOpenEdit = useCallback((venda: Venda) => {
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
  }, []);

  const resetForm = useCallback(() => {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setEditReason('');
    setSaleDate(new Date().toISOString().split('T')[0]);
    if (produtos.length > 0) {
      setProductName(produtos[0].nome);
      setSaleValue(String(produtos[0].valor));
    }
  }, [produtos]);

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
      fetchData(false);
    } catch (error: any) {
      alert('Erro ao registrar venda.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestEdit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const novaDataFormatada = new Date(`${saleDate}T12:00:00Z`).toISOString();

      const newData = {
        product_name: productName,
        sale_value: Number(saleValue),
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        payment_method: paymentMethod,
        created_at: novaDataFormatada 
      };

      await api.post(`/sales/${editingSaleId}/request-edit`, {
        reason: editReason,
        newData: newData
      });

      alert('🛡️ Solicitação de edição enviada ao Comando Militar! Aguarde aprovação.');
      resetForm();
      setIsEditModalOpen(false);
      fetchData(false);
    } catch (error: any) {
      alert('Erro ao solicitar edição. Fale com o suporte.');
    } finally {
      setIsLoading(false);
    }
  }

  // ========================================================
  // 🔥 MOTOR DE ALTA PERFORMANCE (USEMEMO)
  // Só refaz as contas se entrar uma venda nova
  // ========================================================
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(venda => {
      if (String(venda.seller_id) !== String(user.id)) return false;
      if (!venda.created_at) return false;
      
      const isCancelada = checkCancelada(venda.status);

      if (filtro === 'reembolsos') return isCancelada;
      if (isCancelada) return false;

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
  }, [vendas, filtro, user.id]);

  const { qtdVendasMes, percentualComissao, valorComissao } = useMemo(() => {
    const aprovadasMes = vendas.filter(v => {
      if (String(v.seller_id) !== String(user.id)) return false;
      if (!checkAprovada(v.status)) return false; 
      if (!v.created_at) return false;
      
      const dataVenda = new Date(v.created_at);
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      
      return dataVenda >= inicioMes;
    });

    const qtd = aprovadasMes.length;
    const total = aprovadasMes.reduce((acc, v) => acc + Number(v.sale_value), 0);

    let percentual = 0;
    if (qtd <= 60) percentual = 1;
    else if (qtd <= 100) percentual = 2;
    else if (qtd <= 150) percentual = 2.5;
    else percentual = 3; 

    return {
      qtdVendasMes: qtd,
      percentualComissao: percentual,
      valorComissao: (total * percentual) / 100
    };
  }, [vendas, user.id]);

  const { minhasVendasCanceladas, totalArrecadacaoPerdida } = useMemo(() => {
    const canceladas = vendas.filter(v => String(v.seller_id) === String(user.id) && checkCancelada(v.status));
    const totalPerdido = canceladas.reduce((acc, v) => acc + Number(v.sale_value), 0);
    return {
      minhasVendasCanceladas: canceladas,
      totalArrecadacaoPerdida: totalPerdido
    };
  }, [vendas, user.id]);

  const formataBRL = useCallback((valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), []);


  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-3 md:p-6 lg:p-8 relative">
      <ModalMensagemTatica />
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800 gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-yellow-400 tracking-tight uppercase flex items-center gap-2">
              Central do Vendedor <span>⚡</span>
            </h1>
            <p className="text-zinc-500 text-xs md:text-sm mt-0.5">
              Soldado: <span className="text-white font-bold">{user.name}</span>
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 border border-zinc-700 hover:border-red-600 text-zinc-400 hover:text-red-400 px-3 md:px-5 py-2 rounded-lg font-bold transition-all uppercase text-xs"
          >
            <span className="hidden sm:inline">Sair da Operação</span>
            <span className="sm:hidden">Sair</span>
          </button>
        </div>

        {/* 🔥 ALERTA DE BAIXAS */}
        {minhasVendasCanceladas.length > 0 && (
          <div className="bg-red-950/40 border border-red-500/50 rounded-xl p-4 md:p-6 mb-8 shadow-[0_0_20px_rgba(239,68,68,0.2)] animate-in fade-in flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-start gap-4">
              <span className="text-4xl">🚨</span>
              <div>
                <h3 className="text-red-400 font-black uppercase tracking-widest text-lg">Aviso de Baixa em Combate</h3>
                <p className="text-zinc-300 text-sm mt-1">
                  Você possui <span className="font-black text-white bg-red-600/30 px-2 py-0.5 rounded">{minhasVendasCanceladas.length} reembolsos</span> registrados. Estes valores foram removidos do seu placar.
                </p>
              </div>
            </div>
            <div className="text-center md:text-right bg-red-950/80 p-3 rounded-lg border border-red-500/30 w-full md:w-auto">
              <p className="text-red-500/70 text-[10px] font-black uppercase mb-1 tracking-widest">Valor Estornado</p>
              <p className="text-red-400 font-black text-xl">{formataBRL(totalArrecadacaoPerdida)}</p>
            </div>
          </div>
        )}

        {/* 🔥 PAINEL DE COMISSÃO DO SOLDADO */}
        <div className="bg-gradient-to-r from-green-950 to-zinc-900 border border-green-500/30 rounded-xl p-6 shadow-[0_0_20px_rgba(34,197,94,0.1)] mb-8 flex flex-col md:flex-row justify-between items-center gap-6 animate-in fade-in slide-in-from-top-4">
          <div className="text-center md:text-left">
            <h3 className="text-green-400 font-black uppercase tracking-widest text-lg flex items-center justify-center md:justify-start gap-2">
              💰 Relatório de Ganhos Pessoais
            </h3>
            <p className="text-zinc-400 text-xs mt-1 uppercase tracking-widest">
              Baseado nas suas Vendas Aprovadas do Mês
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 w-full md:w-auto">
            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 min-w-[120px] text-center">
              <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Total de Vendas</p>
              <p className="text-2xl font-black text-white">{qtdVendasMes}</p>
            </div>
            <div className="bg-zinc-950 p-4 rounded-lg border border-yellow-500/20 min-w-[120px] text-center">
              <p className="text-yellow-500/70 text-[10px] font-black uppercase mb-1">Taxa Alcançada</p>
              <p className="text-2xl font-black text-yellow-400">{percentualComissao}%</p>
            </div>
            
            {/* TRAVA DE SEGURANÇA (OLHINHO) */}
            <div className="bg-green-950/50 p-4 rounded-lg border border-green-500/50 min-w-[170px] text-center shadow-[0_0_15px_rgba(34,197,94,0.2)]">
              <div className="flex items-center justify-center gap-2 mb-1">
                <p className="text-green-500 text-[10px] font-black uppercase">Comissão Estimada</p>
                <button onClick={() => setMostrarComissao(!mostrarComissao)} className="text-green-500/70 hover:text-green-400 focus:outline-none transition-colors" title={mostrarComissao ? "Ocultar Comissão" : "Ver Comissão"}>
                  {mostrarComissao ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                  )}
                </button>
              </div>
              <p className="text-2xl font-black text-green-400">{mostrarComissao ? formataBRL(valorComissao) : 'R$ •••••••'}</p>
            </div>

          </div>
        </div>

        <div className="mb-10">
           <GuerraEquipes refreshTrigger={0} />
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 shadow-2xl">
          {/* Filtros + CTA */}
          <div className="flex flex-col gap-3 mb-5 border-b border-zinc-800 pb-5">
            <div className="flex flex-wrap gap-2">
              {(['dia','semana','mes'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all ${filtro === f ? 'bg-yellow-400 text-black shadow-[0_0_12px_rgba(250,204,21,0.3)]' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                >
                  {f === 'dia' ? '📅 Hoje' : f === 'semana' ? '📆 Semana' : '🗓️ Mês'}
                </button>
              ))}
              <button
                onClick={() => setFiltro('reembolsos')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-black text-[11px] uppercase tracking-widest transition-all ${filtro === 'reembolsos' ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]' : 'bg-red-950/30 text-red-500 border border-red-900/40 hover:bg-red-900/40'}`}
              >
                🚨 Reembolsos
                {minhasVendasCanceladas.length > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${filtro === 'reembolsos' ? 'bg-black/30' : 'bg-red-900'}`}>
                    {minhasVendasCanceladas.length}
                  </span>
                )}
              </button>
            </div>
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="w-full bg-green-500 hover:bg-green-400 active:scale-95 text-black font-black py-3 rounded-xl shadow-[0_0_15px_rgba(34,197,94,0.25)] transition-all tracking-widest text-sm uppercase"
            >
              + Lançar Nova Venda
            </button>
          </div>

          {/* Cards (mobile) */}
          <div className="md:hidden space-y-3">
            {vendasFiltradas.length > 0 ? vendasFiltradas.map(venda => {
              const isCancelada = checkCancelada(venda.status);
              const isAprovada = checkAprovada(venda.status);
              return (
                <div
                  key={venda.id}
                  className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${isCancelada ? 'bg-red-950/10 border-red-900/30 opacity-80' : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">{venda.customer_name}</p>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-wider truncate">{venda.product_name}</p>
                    </div>
                    <span className={`flex-shrink-0 font-black text-base ${isCancelada ? 'text-red-400 line-through' : 'text-green-400'}`}>
                      R$ {(Number(venda.sale_value) || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-600 text-xs">
                        {venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide
                        ${isAprovada ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                          isCancelada ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                          'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}
                      >
                        {isCancelada ? 'Estornado' : isAprovada ? 'Aprovada' : 'Pendente'}
                      </span>
                    </div>
                    {!isCancelada && (
                      venda.edit_status === 'pendente'
                        ? <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/30">⏳ Análise</span>
                        : <button onClick={() => handleOpenEdit(venda)} className="text-blue-400 text-[10px] font-bold border border-blue-400/30 bg-blue-950/20 px-3 py-1.5 rounded transition-colors hover:text-blue-300">Corrigir</button>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="py-12 text-center text-zinc-600 uppercase font-black tracking-widest italic text-sm">
                {filtro === 'reembolsos' ? 'Ótimo! Nenhuma baixa registrada. 🛡️' : 'Nenhuma venda encontrada neste período.'}
              </div>
            )}
          </div>

          {/* Tabela (desktop) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest">
                  <th className="pb-4 font-black">Data</th>
                  <th className="pb-4 font-black">Cliente</th>
                  <th className="pb-4 font-black">Produto</th>
                  <th className="pb-4 font-black">Valor</th>
                  <th className="pb-4 font-black text-center">Status</th>
                  <th className="pb-4 font-black text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {vendasFiltradas.length > 0 ? vendasFiltradas.map(venda => {
                  const isCancelada = checkCancelada(venda.status);
                  const isAprovada = checkAprovada(venda.status);
                  return (
                    <tr key={venda.id} className={`border-b border-zinc-800/50 transition-colors ${isCancelada ? 'bg-red-950/10 opacity-80' : 'hover:bg-zinc-800/30'}`}>
                      <td className="py-4 text-zinc-400 whitespace-nowrap">
                        {venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--/--/----'}
                      </td>
                      <td className="py-4 font-bold">{venda.customer_name}</td>
                      <td className="py-4 text-zinc-300 text-xs uppercase tracking-wider">{venda.product_name}</td>
                      <td className={`py-4 font-bold whitespace-nowrap ${isCancelada ? 'text-red-400 line-through' : 'text-green-400'}`}>
                        R$ {(Number(venda.sale_value) || 0).toFixed(2)}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest
                          ${isAprovada ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                            isCancelada ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                            'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}
                        >
                          {isCancelada ? 'REEMBOLSADO' : isAprovada ? 'Aprovada' : 'Pendente'}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        {isCancelada ? (
                          <span className="text-[10px] font-bold text-red-500/50 uppercase tracking-widest">Estornado</span>
                        ) : venda.edit_status === 'pendente' ? (
                          <span className="text-[10px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/30">⏳ EM ANÁLISE</span>
                        ) : (
                          <button
                            onClick={() => handleOpenEdit(venda)}
                            className="text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase tracking-widest transition-colors border border-blue-400/30 bg-blue-950/20 px-3 py-1.5 rounded"
                          >
                            Corrigir Erro
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-600 uppercase font-black tracking-widest italic">
                      {filtro === 'reembolsos' ? 'Ótimo trabalho! Nenhuma baixa registrada. 🛡️' : 'Nenhuma venda sua foi encontrada neste período.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE REGISTRAR VENDA */}
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

      {/* MODAL SOLICITAR EDIÇÃO */}
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

      {/* ── NOTIFICAÇÃO DE VENDA APROVADA — TELA CHEIA ───────────────────── */}
      {vendaAprovadaNotif && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          {/* Fundo com gradiente pulsante */}
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md cursor-pointer"
            onClick={() => setVendaAprovadaNotif(null)}
          />

          {/* Brilho verde espalhado no fundo */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-96 h-96 bg-green-500/20 rounded-full blur-[120px] animate-pulse" />
          </div>

          {/* Card central */}
          <div className="relative z-10 w-full max-w-md mx-4 animate-in zoom-in-90 duration-300">

            {/* Halo externo */}
            <div className="absolute -inset-4 bg-green-500/10 rounded-3xl blur-xl" />

            <div className="relative bg-zinc-950 border-2 border-green-500 rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(34,197,94,0.5)]">

              {/* Barra superior animada */}
              <div className="h-1.5 bg-gradient-to-r from-green-600 via-yellow-400 to-green-600 animate-pulse" />

              <div className="p-7 text-center">
                {/* Ícone principal com animação */}
                <div className="relative inline-block mb-4">
                  <div className="text-8xl animate-bounce select-none leading-none">💰</div>
                  <div className="absolute -top-1 -right-1 text-2xl animate-spin" style={{ animationDuration: '3s' }}>✨</div>
                  <div className="absolute -bottom-1 -left-1 text-xl animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>⭐</div>
                </div>

                {/* Título principal */}
                <div className="mb-1">
                  <span className="text-[11px] font-black text-green-400 uppercase tracking-[0.4em]">🎖️ Comando Liberou!</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wide leading-tight mb-1">
                  VENDA
                </h1>
                <h1 className="text-3xl md:text-4xl font-black text-green-400 uppercase tracking-wide leading-tight mb-4">
                  LIBERADA!
                </h1>

                {/* Info do produto */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 mb-3 text-left">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-0.5">Produto</p>
                  <p className="text-yellow-400 font-black text-base uppercase">{vendaAprovadaNotif.product_name}</p>
                  <p className="text-zinc-400 text-xs mt-1">Cliente: <span className="text-white font-bold">{vendaAprovadaNotif.customer_name}</span></p>
                </div>

                {/* Valor em destaque */}
                <div className="bg-green-950/60 border-2 border-green-600/60 rounded-2xl py-4 px-5 mb-5 shadow-[inset_0_0_30px_rgba(34,197,94,0.1)]">
                  <p className="text-[10px] text-green-600 font-black uppercase tracking-[0.3em] mb-1">💵 Valor Creditado</p>
                  <p className="text-green-400 font-black text-4xl md:text-5xl leading-none drop-shadow-[0_0_15px_rgba(34,197,94,0.7)]">
                    {(vendaAprovadaNotif.sale_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>

                <p className="text-zinc-600 text-xs mb-5 uppercase tracking-widest">
                  Toque em qualquer lugar para fechar
                </p>

                <button
                  onClick={() => setVendaAprovadaNotif(null)}
                  className="w-full bg-green-500 hover:bg-green-400 active:scale-95 text-black font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-base transition-all shadow-[0_0_25px_rgba(34,197,94,0.4)]"
                >
                  SHOW! ✓
                </button>
              </div>

              {/* Barra inferior */}
              <div className="h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}