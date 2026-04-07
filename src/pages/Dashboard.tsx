import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { GuerraEquipes } from '../components/GuerraEquipes';
import { RelatorioBatalha } from '../components/RelatorioBatalha';
import { ModalGerenciarProdutos } from '../components/ModalGerenciarProdutos';
import { ModalRegistrarVenda } from '../components/ModalRegistrarVenda';
import { ModalGerenciarDesafios } from '../components/ModalGerenciarDesafios';
import { DashboardMensal } from '../components/DashboardMensal';

import { ModalConfirmacao } from '../components/ModalConfirmacao';
import { ModalReembolsoAdmin } from '../components/ModalReembolsoAdmin';
import { ModalEdicaoAdmin } from '../components/ModalEdicaoAdmin';
import { ModalImportarPlanilha } from '../components/ModalImportarPlanilha';
import { ModalFinanceiro } from '../components/ModalFinanceiro';
import { ModalMensagemTatica } from '../components/ModalMensagemTatica';
import { BannerPWA } from '../components/BannerPWA';
import { ModalGerenciarMissoes } from '../components/ModalGerenciarMissoes';
import { ModalRankingHistorico } from '../components/ModalRankingHistorico';
import { ModalEstatisticasPeriodo } from '../components/ModalEstatisticasPeriodo';
import { ModalVendedor } from '../components/ModalVendedor';
import { somHover, somClick, somVendaAprovada, somSucesso, somAlerta, somDinheiro } from '../services/hudSounds';
import { pedirPermissaoNotificacao } from '../services/notificacoes';
import { toast } from '../services/toast';

import confetti from 'canvas-confetti'; 

type Produto = { id: number; nome: string; valor: number; };
type Venda = { id: string; product_name: string; customer_name: string; customer_phone?: string; customer_email?: string; payment_method?: string; sale_value: number; status: string; created_at: string; seller_name?: string; seller_id?: string | number; edit_status?: string; edit_reason?: string; edit_data?: any; };

export function Dashboard() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { name: 'Admin', id: '' };

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isModalProdutoOpen, setIsModalProdutoOpen] = useState(false);
  const [isModalVendaOpen, setIsModalVendaOpen] = useState(false);
  const [isModalDesafioOpen, setIsModalDesafioOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFinanceiroModalOpen, setIsFinanceiroModalOpen] = useState(false);
  const [isModalMissoesOpen, setIsModalMissoesOpen] = useState(false);
  const [isModalHistoricoOpen, setIsModalHistoricoOpen] = useState(false);
  const [modalPeriodo, setModalPeriodo] = useState<'hoje' | 'semana' | 'mes' | null>(null);
  const [vendedorModalAdmin, setVendedorModalAdmin] = useState<any | null>(null);
  const [novaVendaToast, setNovaVendaToast] = useState<string | null>(null);
  const lastSalesCountRef = useRef<number | null>(null);

  const [mainRefreshTrigger, setMainRefreshTrigger] = useState(0);

  const [desafioAtivo, setDesafioAtivo] = useState<any>(null);
  const META_MENSAL = desafioAtivo ? Number(desafioAtivo.goal_amount) : 400000;

  const BRT_MS = 3 * 60 * 60 * 1000;

  const [vendasHoje, setVendasHoje] = useState(0);
  const [vendasSemana, setVendasSemana] = useState(0);
  const [qtdHoje, setQtdHoje] = useState(0);
  const [qtdSemana, setQtdSemana] = useState(0);

  // Seletor de mês para o painel analítico
  const [mesSelecionado, setMesSelecionado] = useState(() => {
    const now = new Date();
    return { ano: now.getFullYear(), mes: now.getMonth() };
  });

  const [todasVendas, setTodasVendas] = useState<Venda[]>([]);

  // Vendas do mês selecionado (BRT-aware, aprovadas)
  const { vendasMes, qtdMes, vendasDoMesSel } = useMemo(() => {
    const aprovadas = todasVendas.filter(v => v.status === 'aprovada' && v.created_at);
    const doMes = aprovadas.filter(v => {
      const d = new Date(new Date(v.created_at).getTime() - BRT_MS);
      return d.getUTCFullYear() === mesSelecionado.ano && d.getUTCMonth() === mesSelecionado.mes;
    });
    return {
      vendasMes: doMes.reduce((acc, v) => acc + Number(v.sale_value), 0),
      qtdMes: doMes.length,
      vendasDoMesSel: doMes,
    };
  }, [todasVendas, mesSelecionado]);

  const [visaoAtiva, setVisaoAtiva] = useState<'hoje' | 'semana' | 'mes' | 'vendedor' | 'periodo' | null>(null);
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>('');
  const [metodoPagamentoFiltro, setMetodoPagamentoFiltro] = useState<string>('');
  const [mostrarComissao, setMostrarComissao] = useState(false);

  const [selectedEdits, setSelectedEdits] = useState<string[]>([]);
  const [selectedSales, setSelectedSales] = useState<string[]>([]);

  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isAdminEditModalOpen, setIsAdminEditModalOpen] = useState(false);
  const [selectedSaleToAction, setSelectedSaleToAction] = useState<Venda | null>(null);

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', type: 'blue' as 'red' | 'blue' | 'green' | 'yellow', action: async () => {} });


  const lancarConfetes = () => confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#FACC15', '#22C55E', '#3B82F6'] });

  useEffect(() => { fetchProdutos(); fetchVendasPlacar(); fetchDesafioAtivo(); pedirPermissaoNotificacao(); }, []);

  // Polling: notifica admin quando nova venda é registrada (a cada 15s)
  useEffect(() => {
    async function checkNovasVendas() {
      try {
        const res = await api.get('/ranking/ping');
        const count: number = res.data?.total_sales_count ?? res.data?.count ?? 0;
        if (lastSalesCountRef.current !== null && count > lastSalesCountRef.current) {
          const diff = count - lastSalesCountRef.current;
          somVendaAprovada();
          setNovaVendaToast(`🔔 ${diff} nova${diff > 1 ? 's' : ''} venda${diff > 1 ? 's' : ''} registrada${diff > 1 ? 's' : ''}!`);
          fetchVendasPlacar();
          setTimeout(() => setNovaVendaToast(null), 4000);
          // Notificação nativa (funciona mesmo com aba em segundo plano)
          if (Notification.permission === 'granted') {
            const msg = diff === 1 ? 'Nova venda registrada!' : `${diff} novas vendas registradas!`;
            if (navigator.serviceWorker?.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'NOVA_VENDA_ADMIN', body: msg });
            } else {
              new Notification('⚡ Operação Control', { body: msg, icon: '/icon.svg' });
            }
          }
        }
        lastSalesCountRef.current = count;
      } catch { /* silencioso */ }
    }
    checkNovasVendas();
    const t = setInterval(checkNovasVendas, 15000);
    return () => clearInterval(t);
  }, []);

  async function fetchDesafioAtivo() { try { const response = await api.get('/challenges'); setDesafioAtivo(response.data.find((c: any) => c.is_active) || null); } catch (error) {} }
  async function fetchProdutos() { try { const response = await api.get('/products'); setProdutos(response.data); } catch (error) {} }

  async function fetchVendasPlacar() {
    try {
      const response = await api.get('/sales');
      setTodasVendas(response.data);
      const vendasAprovadas = response.data.filter((v: Venda) => v.status === 'aprovada');
      // BRT-aware: usa offset fixo de 3h para calcular hoje/semana no horário de Brasília
      const nowBRT = new Date(Date.now() - BRT_MS);
      const { y: nY, m: nM, d: nD } = { y: nowBRT.getUTCFullYear(), m: nowBRT.getUTCMonth(), d: nowBRT.getUTCDate() };
      const hojeMs = Date.UTC(nY, nM, nD);
      const diaSemana = nowBRT.getUTCDay() || 7; // 1=seg ... 7=dom
      const inicioSemanaMs = hojeMs - (diaSemana - 1) * 86400000;

      let tHoje = 0, tSemana = 0, qHoje = 0, qSemana = 0;
      vendasAprovadas.forEach((v: Venda) => {
        const brt = new Date(new Date(v.created_at).getTime() - BRT_MS);
        const vMs = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate());
        const valor = Number(v.sale_value);
        if (vMs >= inicioSemanaMs) { tSemana += valor; qSemana++; }
        if (vMs >= hojeMs) { tHoje += valor; qHoje++; }
      });
      setVendasHoje(tHoje); setVendasSemana(tSemana);
      setQtdHoje(qHoje); setQtdSemana(qSemana);
      setSelectedEdits([]); setSelectedSales([]);
    } catch (error) {}
  }

  // 🔥 BOTÃO DE PÂNICO FORÇADO A APARECER: LIMPAR FOGO AMIGO 
  const handleLimparFogoAmigo = async () => {
    // Procura por ID 99999 (ou o ID que você configurou) ou pelo Nome
    const vendasDoRobo = todasVendas.filter(v => 
      String(v.seller_id) === '99999' || 
      v.seller_name === 'Checkout Automático'
    );

    if (vendasDoRobo.length === 0) {
      toast.warning("Nenhuma venda com ID 99999 ou 'Checkout Automático' encontrada.");
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'LIMPAR IMPORTAÇÃO',
      message: `Isso vai apagar TODAS as ${vendasDoRobo.length} vendas importadas. Confirma?`,
      type: 'red',
      action: async () => {
        try {
          for (const venda of vendasDoRobo) {
            await api.delete(`/sales/${venda.id}`);
          }
          somSucesso();
          toast.success('Base limpa! Vendas importadas removidas.');
          fetchVendasPlacar();
        } catch (e) {
          toast.error('Erro ao limpar algumas vendas.');
        }
      }
    });
  };

  function copiarTexto(texto?: string) {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    toast.info(`Copiado: ${texto}`);
  }
  const openConfirm = (title: string, message: string, type: 'red' | 'blue' | 'green' | 'yellow', action: () => Promise<void>) => { setConfirmDialog({ isOpen: true, title, message, type, action }); };
  const executeConfirm = async () => { setConfirmDialog(prev => ({ ...prev, isOpen: false })); await confirmDialog.action(); };
  function openRefundModal(venda: Venda) { setSelectedSaleToAction(venda); setIsRefundModalOpen(true); }
  function openAdminEditModal(venda: Venda) { setSelectedSaleToAction(venda); setIsAdminEditModalOpen(true); }

  const handleAprovarEdicao = (id: string) => openConfirm('APROVAR CORREÇÃO', 'Confirma a alteração?', 'blue', async () => { try { await api.post(`/sales/${id}/approve-edit`); somSucesso(); fetchVendasPlacar(); } catch (error) { toast.error('Erro ao aprovar.'); }});
  const handleRejeitarEdicao = (id: string) => openConfirm('REJEITAR CORREÇÃO', 'O vendedor será notificado.', 'red', async () => { try { await api.post(`/sales/${id}/reject-edit`); somAlerta(); fetchVendasPlacar(); } catch (error) { toast.error('Erro ao rejeitar.'); }});
  const handleAprovarVenda = (id: string) => openConfirm('LIBERAR VENDA', 'Esta venda será creditada.', 'green', async () => { try { await api.post(`/sales/${id}/approve`); somDinheiro(); lancarConfetes(); fetchVendasPlacar(); } catch (error) { toast.error('Erro ao liberar.'); }});
  const handleDeleteVenda = (id: string) => openConfirm('EXCLUIR VENDA', '⚠️ ALERTA: Esta venda será apagada.', 'red', async () => { try { await api.delete(`/sales/${id}`); somAlerta(); fetchVendasPlacar(); } catch (error) { toast.error('Erro ao excluir.'); }});
  const batchApproveEdits = () => openConfirm('APROVAR SELECIONADOS', `Aprovar ${selectedEdits.length} correções?`, 'blue', async () => { try { await Promise.all(selectedEdits.map(id => api.post(`/sales/${id}/approve-edit`))); somSucesso(); fetchVendasPlacar(); } catch (error) { toast.error('Erro ao aprovar.'); }});
  const batchRejectEdits = () => openConfirm('REJEITAR SELECIONADOS', `Rejeitar ${selectedEdits.length} correções?`, 'red', async () => { try { await Promise.all(selectedEdits.map(id => api.post(`/sales/${id}/reject-edit`))); somAlerta(); fetchVendasPlacar(); } catch (error) { toast.error('Erro ao rejeitar.'); }});
  const batchApproveSales = () => openConfirm('LIBERAR SELECIONADAS', `Liberar ${selectedSales.length} vendas?`, 'green', async () => { try { await Promise.all(selectedSales.map(id => api.post(`/sales/${id}/approve`))); somDinheiro(); lancarConfetes(); fetchVendasPlacar(); } catch (error) { toast.error('Erro ao liberar.'); }});
  const batchDeleteSales = () => openConfirm('EXCLUIR SELECIONADAS', `⚠️ ALERTA: APAGAR ${selectedSales.length} vendas?`, 'red', async () => { try { await Promise.all(selectedSales.map(id => api.delete(`/sales/${id}`))); somAlerta(); fetchVendasPlacar(); } catch (error) { toast.error('Erro ao excluir.'); }});

  const edicoesPendentes = todasVendas.filter(v => v.edit_status === 'pendente');
  const vendasPendentes = todasVendas.filter(v => v.status === 'pendente_liberacao' || v.status === 'pendente_boleto' || v.status === 'pendente');
  const toggleEditSelection = (id: string) => setSelectedEdits(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSaleSelection = (id: string) => setSelectedSales(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectAllEdits = () => setSelectedEdits(selectedEdits.length === edicoesPendentes.length ? [] : edicoesPendentes.map(e => e.id));
  const selectAllSales = () => setSelectedSales(selectedSales.length === vendasPendentes.length ? [] : vendasPendentes.map(v => v.id));
  function handleLogout() { localStorage.removeItem('user'); localStorage.removeItem('token'); navigate('/'); }
  function handleFiltrar(e: React.FormEvent) { e.preventDefault(); if (!dataInicio || !dataFim) { toast.warning('Insira as datas para filtrar.'); return; } setVendedorSelecionado(''); setVisaoAtiva('periodo'); somSucesso(); }

  const vendasTabela = todasVendas.filter(v => {
    if (!visaoAtiva || !v.created_at) return false;
    let passaFiltroPrincipal = false;
    if (visaoAtiva === 'vendedor') passaFiltroPrincipal = v.seller_name === vendedorSelecionado;
    else if (visaoAtiva === 'periodo') passaFiltroPrincipal = v.created_at.split('T')[0] >= dataInicio && v.created_at.split('T')[0] <= dataFim;
    else {
      const dataVenda = new Date(v.created_at); const hojeData = new Date(); hojeData.setHours(0, 0, 0, 0);
      const inicioSemana = new Date(hojeData); inicioSemana.setDate(hojeData.getDate() - hojeData.getDay()); const inicioMes = new Date(hojeData.getFullYear(), hojeData.getMonth(), 1);
      if (visaoAtiva === 'hoje') passaFiltroPrincipal = dataVenda >= hojeData; else if (visaoAtiva === 'semana') passaFiltroPrincipal = dataVenda >= inicioSemana; else if (visaoAtiva === 'mes') passaFiltroPrincipal = dataVenda >= inicioMes;
    }
    if (!passaFiltroPrincipal) return false;
    if (metodoPagamentoFiltro) {
      const metodo = v.payment_method || '';
      if (metodoPagamentoFiltro === 'Cartão') { if (!metodo.includes('Cartão') && !metodo.includes('Crédito') && !metodo.includes('Débito')) return false; } 
      else if (metodoPagamentoFiltro === 'PIX') { if (metodo !== 'PIX') return false; } 
      else if (metodoPagamentoFiltro === 'Boleto Parcelado') { if (metodo !== 'Boleto Parcelado') return false; }
    }
    return true;
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const searchResults = useMemo(() => {
    if (globalSearchTerm.length < 3) return [];
    const termo = globalSearchTerm.toLowerCase();
    return todasVendas.filter(v => 
      (v.customer_name && v.customer_name.toLowerCase().includes(termo)) ||
      (v.customer_email && v.customer_email.toLowerCase().includes(termo)) ||
      (v.customer_phone && v.customer_phone.toLowerCase().includes(termo))
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [globalSearchTerm, todasVendas]);

  const progressoMeta = Math.min((vendasMes / META_MENSAL) * 100, 100);
  const formataBRL = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function exportarCSV() {
    const cabecalho = 'Data,Vendedor,Cliente,Email,Telefone,Produto,Pagamento,Valor,Status';
    const linhas = todasVendas.map(v => {
      const data = v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
      const esc = (s?: string) => `"${(s ?? '').replace(/"/g, '""')}"`;
      return [
        esc(data),
        esc(v.seller_name),
        esc(v.customer_name),
        esc(v.customer_email),
        esc(v.customer_phone),
        esc(v.product_name),
        esc(v.payment_method),
        String(Number(v.sale_value).toFixed(2)).replace('.', ','),
        esc(v.status),
      ].join(',');
    });
    const conteudo = '\uFEFF' + cabecalho + '\n' + linhas.join('\n');
    const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const vendedoresUnicos = Array.from(new Set(todasVendas.map(v => v.seller_name).filter(nome => nome && nome !== 'Desconhecido'))).sort();

  let tituloRelatorio = ''; let subTituloRelatorio = '';
  if (visaoAtiva === 'hoje') tituloRelatorio = 'Vendas de Hoje'; if (visaoAtiva === 'semana') tituloRelatorio = 'Vendas da Semana'; if (visaoAtiva === 'mes') tituloRelatorio = 'Acumulado do Mês';
  if (visaoAtiva === 'periodo') { tituloRelatorio = 'Relatório de Batalha'; subTituloRelatorio = `${dataInicio.split('-').reverse().join('/')} até ${dataFim.split('-').reverse().join('/')}`; }
  if (metodoPagamentoFiltro) subTituloRelatorio += subTituloRelatorio ? ` | Pagamento: ${metodoPagamentoFiltro}` : `Pagamento: ${metodoPagamentoFiltro}`;

  const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const navMes = (delta: number) => setMesSelecionado(prev => {
    let m = prev.mes + delta, a = prev.ano;
    if (m < 0) { m = 11; a--; } if (m > 11) { m = 0; a++; }
    return { mes: m, ano: a };
  });
  const isCurrentMonth = mesSelecionado.mes === new Date().getMonth() && mesSelecionado.ano === new Date().getFullYear();

  const vendedoresLista = (() => {
    const map = new Map<string, { id: string; nome: string; totalMes: number; qtdMes: number; totalHoje: number }>();
    const nowBRT = new Date(Date.now() - BRT_MS);
    const hoje = { y: nowBRT.getUTCFullYear(), m: nowBRT.getUTCMonth(), d: nowBRT.getUTCDate() };
    todasVendas.forEach(v => {
      if (!v.seller_name || v.seller_name === 'Desconhecido' || v.status !== 'aprovada') return;
      const key = String(v.seller_id ?? v.seller_name);
      if (!map.has(key)) map.set(key, { id: key, nome: v.seller_name, totalMes: 0, qtdMes: 0, totalHoje: 0 });
      const e = map.get(key)!;
      const brt = new Date(new Date(v.created_at).getTime() - BRT_MS);
      if (brt.getUTCFullYear() === mesSelecionado.ano && brt.getUTCMonth() === mesSelecionado.mes) { e.totalMes += Number(v.sale_value); e.qtdMes++; }
      if (brt.getUTCFullYear() === hoje.y && brt.getUTCMonth() === hoje.m && brt.getUTCDate() === hoje.d) e.totalHoje += Number(v.sale_value);
    });
    return Array.from(map.values()).sort((a, b) => b.totalMes - a.totalMes);
  })();

  const [painelAberto, setPainelAberto] = useState(false);
  const totalPendentes = edicoesPendentes.length + vendasPendentes.length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-safe">
      <ModalMensagemTatica />
      <BannerPWA />
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6 space-y-4">

        {/* ── HEADER MÍNIMO ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-xl md:text-2xl font-black text-yellow-400 uppercase tracking-wider leading-none truncate">
              Operação Control
            </h1>
            <span className="hidden sm:block text-[9px] font-black uppercase tracking-widest text-yellow-400/60 border border-yellow-400/20 px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); setPainelAberto(v => !v); }}
              className={`relative flex items-center gap-2 border px-3 py-2 rounded-lg text-xs font-black uppercase transition-all ${painelAberto ? 'bg-yellow-400 border-yellow-400 text-black' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'}`}
            >
              ⚙️ <span className="hidden sm:inline">Ferramentas</span>
              {totalPendentes > 0 && !painelAberto && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">{totalPendentes}</span>
              )}
            </button>
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); handleLogout(); }}
              className="text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-500/40 px-3 py-2 rounded-lg text-xs font-black uppercase transition-all"
            >
              Sair
            </button>
          </div>
        </div>

        {/* ── PAINEL DE FERRAMENTAS (colapsável) ── */}
        {painelAberto && (
          <div className="space-y-3 border border-zinc-800 rounded-xl p-3 bg-zinc-900/50">

            {/* Nav de ações */}
            <div className="sm:hidden space-y-2">
              <button onClick={() => { somClick(); setIsModalVendaOpen(true); }} className="w-full bg-yellow-400 active:scale-95 text-black font-black py-3 rounded-lg uppercase text-sm tracking-widest transition-all">
                ⚔️ Registrar Venda
              </button>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: 'Temporadas', icon: '🏴', acao: () => setIsModalDesafioOpen(true) },
                  { label: 'Missões',    icon: '🎯', acao: () => setIsModalMissoesOpen(true) },
                  { label: 'Produtos',   icon: '📦', acao: () => setIsModalProdutoOpen(true) },
                  { label: 'Financeiro', icon: '💰', acao: () => setIsFinanceiroModalOpen(true) },
                  { label: 'Planilha',   icon: '📥', acao: () => setIsImportModalOpen(true) },
                  { label: 'Exportar',   icon: '📤', acao: exportarCSV },
                  { label: 'Histórico',  icon: '📜', acao: () => setIsModalHistoricoOpen(true) },
                  { label: 'Suporte',    icon: '🛡️', acao: () => navigate('/liberacoes') },
                  { label: 'Recrutas',   icon: '🪖', acao: () => navigate('/admin/recrutas') },
                  { label: 'Injetados',  icon: '🧹', acao: handleLimparFogoAmigo },
                ].map(({ label, icon, acao }) => (
                  <button key={label} onClick={() => { somClick(); acao(); }} className="flex flex-col items-center justify-center gap-1 bg-zinc-800 active:scale-95 text-zinc-400 rounded-lg py-2.5 px-1 transition-all">
                    <span className="text-xl leading-none">{icon}</span>
                    <span className="text-[8px] font-black uppercase tracking-wide leading-none text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 flex-wrap">
              <button onMouseEnter={somHover} onClick={() => { somClick(); setIsModalVendaOpen(true); }} className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black px-4 py-2 rounded-lg text-xs uppercase tracking-widest transition-all">
                ⚔️ Registrar Venda
              </button>
              <div className="h-6 w-px bg-zinc-700" />
              {[
                { label: 'Temporadas', icon: '🏴', acao: () => setIsModalDesafioOpen(true) },
                { label: 'Missões',    icon: '🎯', acao: () => setIsModalMissoesOpen(true) },
                { label: 'Produtos',   icon: '📦', acao: () => setIsModalProdutoOpen(true) },
                { label: 'Financeiro', icon: '💰', acao: () => setIsFinanceiroModalOpen(true) },
                { label: 'Planilha',   icon: '📥', acao: () => setIsImportModalOpen(true) },
                { label: 'Exportar',   icon: '📤', acao: exportarCSV },
                { label: 'Histórico',  icon: '📜', acao: () => setIsModalHistoricoOpen(true) },
              ].map(({ label, icon, acao }) => (
                <button key={label} onMouseEnter={somHover} onClick={() => { somClick(); acao(); }} className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                  <span>{icon}</span><span className="hidden lg:inline">{label}</span>
                </button>
              ))}
              <div className="h-6 w-px bg-zinc-700 ml-auto" />
              {[
                { label: 'Arsenal',  icon: '⚡', acao: () => navigate('/arsenal') },
                { label: 'Suporte',  icon: '🛡️', acao: () => navigate('/liberacoes') },
                { label: 'Recrutas', icon: '🪖', acao: () => navigate('/admin/recrutas') },
              ].map(({ label, icon, acao }) => (
                <button key={label} onMouseEnter={somHover} onClick={() => { somClick(); acao(); }} className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                  <span>{icon}</span><span>{label}</span>
                </button>
              ))}
            </div>

            {/* Busca */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
              <input
                type="text"
                value={globalSearchTerm}
                onChange={e => setGlobalSearchTerm(e.target.value)}
                placeholder="Buscar cliente, e-mail ou telefone..."
                className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-yellow-400/50 placeholder:text-zinc-600"
              />
            </div>
            {globalSearchTerm.length > 2 && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800">
                  <p className="text-yellow-400 font-black text-xs uppercase tracking-widest">{searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}</p>
                  <button onClick={() => setGlobalSearchTerm('')} className="text-zinc-500 hover:text-white text-xs">✕ Limpar</button>
                </div>
                {searchResults.length === 0 ? (
                  <p className="text-center text-zinc-600 text-xs py-6 uppercase tracking-widest">Nenhum resultado.</p>
                ) : (
                  <div className="divide-y divide-zinc-800 max-h-72 overflow-y-auto">
                    {searchResults.map(venda => (
                      <div key={venda.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-black truncate">{venda.customer_name}</p>
                          <p className="text-zinc-500 text-[10px] truncate">{venda.seller_name} · {venda.product_name} · {venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--'}</p>
                        </div>
                        <p className="text-green-400 font-black text-sm flex-shrink-0">{formataBRL(Number(venda.sale_value))}</p>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openAdminEditModal(venda)} className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 bg-blue-500/10 rounded">✏️</button>
                          <button onClick={() => openRefundModal(venda)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-500/10 rounded">↩</button>
                          <button onClick={() => handleDeleteVenda(venda.id)} className="text-zinc-500 hover:text-red-400 text-xs px-2 py-1 bg-zinc-800 rounded">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Filtro por período */}
            <div className="border-t border-zinc-800 pt-3">
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-2">🔎 Filtrar por período</p>
              <div className="flex flex-col sm:flex-row items-end gap-2">
                <div className="flex-1 w-full">
                  <label className="block text-zinc-600 text-[9px] font-bold uppercase mb-1">Início</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-xs [color-scheme:dark] focus:outline-none focus:border-yellow-500/50" />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-zinc-600 text-[9px] font-bold uppercase mb-1">Fim</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-xs [color-scheme:dark] focus:outline-none focus:border-yellow-500/50" />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-zinc-600 text-[9px] font-bold uppercase mb-1">Pagamento</label>
                  <select value={metodoPagamentoFiltro} onChange={e => setMetodoPagamentoFiltro(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-yellow-500/50">
                    <option value="">Todos</option>
                    <option value="PIX">PIX</option>
                    <option value="Cartão">Cartões</option>
                    <option value="Boleto Parcelado">Boleto</option>
                  </select>
                </div>
                <button onMouseEnter={somHover} onClick={() => { somClick(); handleFiltrar({ preventDefault: () => {} } as any); }} className="bg-yellow-400 hover:bg-yellow-300 text-black font-black py-2 px-5 rounded-lg text-xs uppercase tracking-widest transition-all active:scale-95 flex-shrink-0 w-full sm:w-auto">
                  Filtrar
                </button>
              </div>
            </div>

            {/* Alertas */}
            {(edicoesPendentes.length > 0 || vendasPendentes.length > 0) && (
              <div className="space-y-3 border-t border-zinc-800 pt-3">
                {edicoesPendentes.length > 0 && (
                  <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-blue-500/20">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={selectedEdits.length === edicoesPendentes.length} onChange={selectAllEdits} className="accent-blue-600" />
                        <p className="text-blue-400 font-black text-sm uppercase tracking-widest">🔄 Correções ({edicoesPendentes.length})</p>
                      </div>
                      {selectedEdits.length > 0 && (
                        <div className="flex gap-2">
                          <button onClick={batchRejectEdits} className="text-red-400 border border-red-500/40 px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Rejeitar {selectedEdits.length}</button>
                          <button onClick={batchApproveEdits} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase transition-all">Aprovar {selectedEdits.length}</button>
                        </div>
                      )}
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                      {edicoesPendentes.map(venda => {
                        let newData: any = {}; try { newData = typeof venda.edit_data === 'string' ? JSON.parse(venda.edit_data) : (venda.edit_data || {}); } catch(e) {}
                        const isChecked = selectedEdits.includes(venda.id);
                        return (
                          <div key={venda.id} className={`flex flex-col md:flex-row gap-3 p-4 transition-colors ${isChecked ? 'bg-blue-950/20' : 'hover:bg-zinc-900/40'}`}>
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <input type="checkbox" checked={isChecked} onChange={() => toggleEditSelection(venda.id)} className="accent-blue-600 mt-1 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-black">{venda.seller_name} <span className="text-zinc-500 font-normal">→</span> {venda.customer_name}</p>
                                <p className="text-red-400 text-[10px] mt-0.5 italic">"{venda.edit_reason}"</p>
                                <div className="flex gap-4 mt-1.5 text-[10px]">
                                  <span className="text-zinc-500">Atual: <span className="text-white">{formataBRL(Number(venda.sale_value))}</span></span>
                                  {newData.sale_value && <span className="text-zinc-500">Novo: <span className="text-green-400 font-black">{formataBRL(Number(newData.sale_value))}</span></span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => handleRejeitarEdicao(venda.id)} className="border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all">Rejeitar</button>
                              <button onClick={() => handleAprovarEdicao(venda.id)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all">Aprovar</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {vendasPendentes.length > 0 && (
                  <div className="border border-yellow-500/30 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-yellow-950/20 border-b border-yellow-500/20">
                      <div className="flex items-center gap-2" onClick={selectAllSales}>
                        <input type="checkbox" checked={selectedSales.length === vendasPendentes.length} onChange={selectAllSales} className="accent-yellow-500" onClick={e => e.stopPropagation()} />
                        <p className="text-yellow-400 font-black text-sm uppercase tracking-widest cursor-pointer">
                          ⚠️ Aguardando Liberação
                          <span className="ml-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">{vendasPendentes.length}</span>
                        </p>
                      </div>
                      {selectedSales.length > 0 && (
                        <div className="flex gap-2">
                          <button onClick={batchDeleteSales} className="text-red-400 border border-red-500/40 px-3 py-1 rounded text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">🗑️ {selectedSales.length}</button>
                          <button onClick={batchApproveSales} className="bg-green-500 hover:bg-green-400 text-black px-3 py-1 rounded text-[10px] font-black uppercase transition-all">⚡ Liberar {selectedSales.length}</button>
                        </div>
                      )}
                    </div>
                    <div className="divide-y divide-zinc-800/50">
                      {vendasPendentes.map(venda => {
                        const isChecked = selectedSales.includes(venda.id);
                        return (
                          <div key={venda.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${isChecked ? 'bg-yellow-950/15' : 'hover:bg-zinc-900/40'}`}>
                            <input type="checkbox" checked={isChecked} onChange={() => toggleSaleSelection(venda.id)} className="accent-yellow-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-black truncate">{venda.customer_name}</p>
                              <p className="text-zinc-500 text-[10px] truncate">{venda.seller_name} · {venda.product_name} · {venda.payment_method}</p>
                            </div>
                            <p className="text-green-400 font-black text-sm flex-shrink-0">{formataBRL(Number(venda.sale_value))}</p>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <button onClick={() => handleAprovarVenda(venda.id)} className="bg-green-500 hover:bg-green-400 text-black font-black px-3 py-1.5 rounded-lg text-[10px] uppercase transition-all">⚡ Liberar</button>
                              <button onClick={() => handleDeleteVenda(venda.id)} className="border border-red-700/40 text-red-500 hover:bg-red-600 hover:text-white px-2 py-1.5 rounded-lg text-[10px] transition-all">🗑️</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Painel analítico */}
            <div className="border-t border-zinc-800 pt-3 space-y-1">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest px-1">📈 Painel Analítico — {MESES_FULL[mesSelecionado.mes]} {mesSelecionado.ano}</p>
              <DashboardMensal vendas={vendasDoMesSel} mes={mesSelecionado.mes} ano={mesSelecionado.ano} />
            </div>
          </div>
        )}

        {/* ── RELATÓRIO PERÍODO ── */}
        {visaoAtiva === 'periodo' && (<RelatorioBatalha vendas={vendasTabela} titulo={tituloRelatorio} subtitulo={subTituloRelatorio} onClose={() => { setVisaoAtiva(null); setVendedorSelecionado(''); setDataInicio(''); setDataFim(''); }} />)}

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onMouseEnter={somHover} onClick={() => { somClick(); setModalPeriodo('hoje'); }} className="bg-zinc-900 border border-zinc-800 hover:border-yellow-400/40 p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">⚡ Hoje</p>
            <p className="text-2xl font-black text-white leading-tight">{formataBRL(vendasHoje)}</p>
            <p className="text-zinc-600 text-[10px] mt-1">{qtdHoje} venda{qtdHoje !== 1 ? 's' : ''}</p>
          </button>

          <button onMouseEnter={somHover} onClick={() => { somClick(); setModalPeriodo('semana'); }} className="bg-zinc-900 border border-zinc-800 hover:border-blue-400/40 p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">📅 Semana</p>
            <p className="text-2xl font-black text-white leading-tight">{formataBRL(vendasSemana)}</p>
            <p className="text-zinc-600 text-[10px] mt-1">{qtdSemana} venda{qtdSemana !== 1 ? 's' : ''}</p>
          </button>

          <button onMouseEnter={somHover} onClick={() => { somClick(); setModalPeriodo('mes'); }} className="bg-zinc-900 border border-zinc-800 hover:border-green-400/40 p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">
              🗓️ {MESES[mesSelecionado.mes]}
              <span className="ml-1 text-zinc-600">{mesSelecionado.ano}</span>
            </p>
            <p className="text-2xl font-black text-white leading-tight">{formataBRL(vendasMes)}</p>
            <div className="w-full bg-zinc-800 rounded-full h-1 mt-2 overflow-hidden">
              <div className="bg-yellow-400 h-1 rounded-full transition-all duration-700" style={{ width: `${progressoMeta}%` }} />
            </div>
            <p className="text-zinc-600 text-[10px] mt-1">{qtdMes} vendas · {progressoMeta.toFixed(0)}% meta</p>
          </button>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">💰 Comissão 1%</p>
              <button onMouseEnter={somHover} onClick={() => { somClick(); setMostrarComissao(!mostrarComissao); }} className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">{mostrarComissao ? '🙈' : '👁️'}</button>
            </div>
            <p className="text-2xl font-black text-green-400">{mostrarComissao ? formataBRL(vendasMes * 0.01) : '••••••'}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-zinc-600 text-[10px]">{MESES[mesSelecionado.mes]} {mesSelecionado.ano}</p>
              <div className="flex items-center gap-1">
                <button onMouseEnter={somHover} onClick={() => { somClick(); navMes(-1); }} className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-black transition-all">←</button>
                <button onMouseEnter={somHover} onClick={() => { somClick(); navMes(1); }} disabled={isCurrentMonth} className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-black transition-all disabled:opacity-30">→</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── QUADRO DE BATALHA ── */}
        {vendedoresLista.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-400 text-xs font-black uppercase tracking-widest">⚔️ Quadro de Batalha — {MESES[mesSelecionado.mes]} {mesSelecionado.ano}</p>
              <p className="text-zinc-600 text-[10px]">clique para detalhes</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
              {vendedoresLista.map((v, idx) => {
                const iniciais = v.nome.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
                const POSICOES = ['🥇','🥈','🥉'];
                return (
                  <button
                    key={v.id}
                    onMouseEnter={somHover}
                    onClick={() => { somClick(); setVendedorModalAdmin({ id: v.id, nome: v.nome, equipe: 'A', total_vendido: v.totalMes, total_vendas_count: v.qtdMes }); }}
                    className="relative bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-xl p-3 text-left transition-all hover:scale-[1.02] active:scale-95"
                  >
                    {idx < 3 && <span className="absolute top-2 right-2 text-xs">{POSICOES[idx]}</span>}
                    <div className="w-8 h-8 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center mb-2 text-[10px] font-black text-zinc-300">{iniciais}</div>
                    <p className="text-white text-xs font-black truncate">{v.nome.split(' ')[0]}</p>
                    <p className="text-green-400 font-black text-[11px] mt-1">{v.totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <p className="text-zinc-600 text-[10px]">{v.qtdMes} venda{v.qtdMes !== 1 ? 's' : ''}</p>
                    {v.totalHoje > 0 && <span className="inline-block mt-1 text-[9px] font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full">⚡ hoje</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── GUERRA DE EQUIPES ── */}
        <GuerraEquipes refreshTrigger={mainRefreshTrigger} isAdmin={true} />

      </div>

      <ModalGerenciarDesafios isOpen={isModalDesafioOpen} onClose={() => setIsModalDesafioOpen(false)} onAtualizar={() => { fetchDesafioAtivo(); setMainRefreshTrigger(prev => prev + 1); }} />
      <ModalGerenciarProdutos isOpen={isModalProdutoOpen} onClose={() => setIsModalProdutoOpen(false)} produtos={produtos} onAtualizarLista={fetchProdutos} />
      <ModalRegistrarVenda isOpen={isModalVendaOpen} onClose={() => setIsModalVendaOpen(false)} produtos={produtos} user={user} onVendaRegistrada={() => { setIsModalVendaOpen(false); fetchVendasPlacar(); }} />
      
      <ModalImportarPlanilha isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} vendasAtuais={todasVendas} onSuccess={() => { setIsImportModalOpen(false); fetchVendasPlacar(); }} />
      <ModalEdicaoAdmin isOpen={isAdminEditModalOpen} onClose={() => setIsAdminEditModalOpen(false)} venda={selectedSaleToAction} produtos={produtos} onSuccess={() => { setIsAdminEditModalOpen(false); setSelectedSaleToAction(null); fetchVendasPlacar(); }} />
      <ModalReembolsoAdmin isOpen={isRefundModalOpen} onClose={() => setIsRefundModalOpen(false)} venda={selectedSaleToAction} onSuccess={() => { setIsRefundModalOpen(false); setSelectedSaleToAction(null); fetchVendasPlacar(); }} />
      <ModalConfirmacao isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} type={confirmDialog.type} onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} onConfirm={executeConfirm} />
      
      {/* 🔥 MODAL DO FINANCEIRO INJETADO NO FINAL DO ARQUIVO */}
      <ModalFinanceiro isOpen={isFinanceiroModalOpen} onClose={() => setIsFinanceiroModalOpen(false)} vendas={todasVendas} />
      <ModalGerenciarMissoes isOpen={isModalMissoesOpen} onClose={() => setIsModalMissoesOpen(false)} />
      <ModalRankingHistorico isOpen={isModalHistoricoOpen} onClose={() => setIsModalHistoricoOpen(false)} />

      {/* Modal estatísticas por período */}
      {modalPeriodo && (() => {
        const BRT_MS_F = 3 * 60 * 60 * 1000;
        const nowBRT = new Date(Date.now() - BRT_MS_F);
        const hojeMs = Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), nowBRT.getUTCDate());
        const diaSemana = nowBRT.getUTCDay() || 7;
        const inicioSemanaMs = hojeMs - (diaSemana - 1) * 86400000;
        const inicioMesMs = Date.UTC(nowBRT.getUTCFullYear(), nowBRT.getUTCMonth(), 1);

        const vendasFiltradas = todasVendas.filter(v => {
          if (!v.created_at) return false;
          const brt = new Date(new Date(v.created_at).getTime() - BRT_MS_F);
          const vMs = Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), brt.getUTCDate());
          if (modalPeriodo === 'hoje') return vMs >= hojeMs;
          if (modalPeriodo === 'semana') return vMs >= inicioSemanaMs;
          return vMs >= inicioMesMs;
        });

        const TITULOS = { hoje: '⚡ Vendas de Hoje', semana: '📅 Vendas da Semana', mes: '🗓️ Acumulado do Mês' };
        return (
          <ModalEstatisticasPeriodo
            titulo={TITULOS[modalPeriodo]}
            periodo={modalPeriodo}
            vendas={vendasFiltradas}
            onClose={() => setModalPeriodo(null)}
          />
        );
      })()}

      {/* Modal vendedor via card da grade */}
      {vendedorModalAdmin && (() => {
        const VENDAS_POR_NIVEL = 5;
        const TIER_INICIO = [0, 20, 40, 60, 80];
        const PATENTES = [
          { nome: 'Iniciante', icone: '🪖' }, { nome: 'Vendedor', icone: '⚔️' },
          { nome: 'Veterano', icone: '🛡️' }, { nome: 'Elite', icone: '🌟' }, { nome: 'Lendário', icone: '💎' },
        ];
        const c = Math.max(0, vendedorModalAdmin.total_vendas_count || 0);
        let ti = 0;
        for (let i = TIER_INICIO.length - 1; i >= 0; i--) { if (c >= TIER_INICIO[i]) { ti = i; break; } }
        const nivel = Math.floor((c - TIER_INICIO[ti]) / VENDAS_POR_NIVEL) + 1;
        return (
          <ModalVendedor
            vendedor={{ ...vendedorModalAdmin, patente: PATENTES[ti].nome, patenteIcone: PATENTES[ti].icone, nivel }}
            onClose={() => setVendedorModalAdmin(null)}
          />
        );
      })()}

      {/* Toast notificação admin: nova venda registrada */}
      {novaVendaToast && (
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top duration-300">
          <div className="bg-zinc-900 border border-yellow-400/50 rounded-xl px-4 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(250,204,21,0.2)]">
            <span className="text-2xl">🔔</span>
            <p className="text-white font-black text-sm">{novaVendaToast}</p>
          </div>
        </div>
      )}

    </div>
  );
}