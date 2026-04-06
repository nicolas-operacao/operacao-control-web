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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 md:p-6 lg:p-8 font-sans relative pb-safe">
      <ModalMensagemTatica />
      <BannerPWA />
      <div className="max-w-7xl mx-auto space-y-5 md:space-y-8">

        {/* ── HUD Header ────────────────────────────────────────────────── */}
        <div className="relative">
          {/* Linha decorativa topo */}
          <div className="absolute -top-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent" />

          {/* Título + sair */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <h1 className="text-2xl md:text-4xl font-black text-yellow-400 uppercase tracking-wider leading-none drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]">
                  Operação Control
                </h1>
                <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-yellow-400/60 to-transparent" />
              </div>
              <span className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 text-[9px] px-2.5 py-1 rounded font-black uppercase tracking-widest hidden sm:block animate-pulse">
                ◆ ADMIN
              </span>
            </div>
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); handleLogout(); }}
              className="group flex items-center gap-2 bg-zinc-900 border border-zinc-700 hover:bg-red-950/60 hover:border-red-500/70 text-zinc-500 hover:text-red-400 px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all duration-200 hover:shadow-[0_0_12px_rgba(239,68,68,0.25)]"
            >
              <span className="hidden sm:inline">Sair</span>
              <span className="group-hover:rotate-90 transition-transform duration-200">✕</span>
            </button>
          </div>

          {/* Menu HUD */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.01)_2px,rgba(255,255,255,0.01)_4px)] pointer-events-none" />

            {/* ── MOBILE: grade compacta ── */}
            <div className="relative sm:hidden">
              {/* CTA principal — linha inteira */}
              <button
                onClick={() => { somClick(); setIsModalVendaOpen(true); }}
                className="w-full flex items-center justify-center gap-2 bg-yellow-400 active:scale-95 text-black font-black py-3 rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.4)] uppercase text-sm tracking-widest transition-all mb-3"
              >
                <span>⚔️</span><span>Registrar Venda</span>
              </button>
              {/* Grade 5 cols de ícones */}
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
                  <button
                    key={label}
                    onClick={() => { somClick(); acao(); }}
                    className="flex flex-col items-center justify-center gap-1 bg-zinc-900 border border-zinc-800 active:scale-95 text-zinc-400 rounded-lg py-2.5 px-1 transition-all"
                  >
                    <span className="text-xl leading-none">{icon}</span>
                    <span className="text-[8px] font-black uppercase tracking-wide leading-none text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── DESKTOP: layout original ── */}
            <div className="relative hidden sm:flex flex-wrap gap-2 items-center">
              <button
                onMouseEnter={somHover}
                onClick={() => { somClick(); setIsModalVendaOpen(true); }}
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black px-5 py-2.5 rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] uppercase text-xs tracking-widest transition-all duration-200"
              >
                <span className="text-base">⚔️</span>
                <span>Registrar Venda</span>
              </button>
              <div className="h-8 w-px bg-zinc-800 mx-1" />
              <div className="flex flex-wrap gap-1.5 items-center">
                {[
                  { label: 'Temporadas', icon: '🏴', cor: 'hover:bg-orange-500/20 hover:border-orange-500/60 hover:text-orange-300', acao: () => setIsModalDesafioOpen(true) },
                  { label: 'Missões',    icon: '🎯', cor: 'hover:bg-yellow-500/20 hover:border-yellow-500/60 hover:text-yellow-300', acao: () => setIsModalMissoesOpen(true) },
                  { label: 'Produtos',   icon: '📦', cor: 'hover:bg-blue-500/20 hover:border-blue-500/60 hover:text-blue-300',   acao: () => setIsModalProdutoOpen(true) },
                  { label: 'Financeiro', icon: '💰', cor: 'hover:bg-emerald-500/20 hover:border-emerald-500/60 hover:text-emerald-300', acao: () => setIsFinanceiroModalOpen(true) },
                  { label: 'Planilha',   icon: '📥', cor: 'hover:bg-green-500/20 hover:border-green-500/60 hover:text-green-300',   acao: () => setIsImportModalOpen(true) },
                  { label: 'Exportar',   icon: '📤', cor: 'hover:bg-teal-500/20 hover:border-teal-500/60 hover:text-teal-300',     acao: exportarCSV },
                  { label: 'Histórico',  icon: '📜', cor: 'hover:bg-violet-500/20 hover:border-violet-500/60 hover:text-violet-300', acao: () => setIsModalHistoricoOpen(true) },
                ].map(({ label, icon, cor, acao }) => (
                  <button key={label} onMouseEnter={somHover} onClick={() => { somClick(); acao(); }} className={`flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/60 text-zinc-400 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-200 ${cor}`}>
                    <span>{icon}</span><span>{label}</span>
                  </button>
                ))}
              </div>
              <div className="h-8 w-px bg-zinc-800 mx-1" />
              <div className="flex flex-wrap gap-1.5 items-center ml-auto">
                {[
                  { label: 'Suporte',   icon: '🛡️', cor: 'hover:bg-purple-500/20 hover:border-purple-500/60 hover:text-purple-300', acao: () => navigate('/liberacoes') },
                  { label: 'Recrutas',  icon: '🪖', cor: 'hover:bg-indigo-500/20 hover:border-indigo-500/60 hover:text-indigo-300', acao: () => navigate('/admin/recrutas') },
                  { label: 'Injetados', icon: '🧹', cor: 'hover:bg-red-500/20 hover:border-red-500/60 hover:text-red-300',          acao: handleLimparFogoAmigo },
                ].map(({ label, icon, cor, acao }) => (
                  <button key={label} onMouseEnter={somHover} onClick={() => { somClick(); acao(); }} className={`flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/60 text-zinc-400 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-200 ${cor}`}>
                    <span>{icon}</span><span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Linha decorativa fundo */}
          <div className="absolute -bottom-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent" />
        </div>

        {/* RADAR GLOBAL DE BUSCA */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-6 shadow-xl relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="flex-1 w-full relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-zinc-500 text-lg">🔍</span></div>
              <input type="text" value={globalSearchTerm} onChange={(e) => setGlobalSearchTerm(e.target.value)} placeholder="Buscar por cliente, e-mail ou telefone..." className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-xl pl-12 py-3.5 pr-4 text-sm focus:outline-none focus:border-yellow-400 transition-colors shadow-inner placeholder:text-zinc-600" />
            </div>
            {globalSearchTerm && (
              <button onClick={() => setGlobalSearchTerm('')} className="w-full md:w-auto bg-zinc-800 hover:bg-red-900/50 hover:text-red-400 text-zinc-300 px-5 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors border border-zinc-700 hover:border-red-500/50">✕ Limpar</button>
            )}
          </div>
          {globalSearchTerm.length > 2 && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-4">
              <h3 className="text-yellow-400 font-black uppercase tracking-widest mb-3 text-sm flex items-center gap-2">🎯 {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}</h3>
              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 border border-zinc-800 border-dashed rounded-xl bg-zinc-950/50 uppercase tracking-widest text-xs font-bold">Nenhum alvo encontrado.</div>
              ) : (
                <>
                  {/* Cards mobile */}
                  <div className="md:hidden space-y-2">
                    {searchResults.map(venda => (
                      <div key={venda.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-white font-black text-sm truncate">{venda.customer_name}</p>
                            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">🛡️ {venda.seller_name}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-green-400 font-black text-base">{formataBRL(Number(venda.sale_value))}</p>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${venda.status === 'aprovada' ? 'bg-green-500/10 text-green-500' : venda.status === 'cancelada' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{venda.status}</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-zinc-500 space-y-0.5">
                          <p className="truncate">📦 {venda.product_name}</p>
                          {venda.customer_email && <p className="truncate cursor-pointer hover:text-blue-400" onClick={() => copiarTexto(venda.customer_email)}>📧 {venda.customer_email}</p>}
                          {venda.customer_phone && <p className="cursor-pointer hover:text-green-400" onClick={() => copiarTexto(venda.customer_phone)}>📞 {venda.customer_phone}</p>}
                          <p>📅 {venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--'} · {venda.payment_method || '--'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => openAdminEditModal(venda)} className="flex-1 bg-blue-600/10 text-blue-400 border border-blue-600/30 py-2.5 rounded-lg text-[11px] font-black uppercase transition-all active:scale-95">✏️ Editar</button>
                          <button onClick={() => openRefundModal(venda)} className="flex-1 bg-red-600/10 text-red-500 border border-red-600/30 py-2.5 rounded-lg text-[11px] font-black uppercase transition-all active:scale-95">🔴 Estorno</button>
                          <button onClick={() => handleDeleteVenda(venda.id)} className="px-3 bg-zinc-800 text-zinc-500 border border-zinc-700 py-2.5 rounded-lg text-[11px] font-black uppercase transition-all active:scale-95">🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Tabela desktop */}
                  <div className="hidden md:block overflow-x-auto border border-zinc-800 rounded-lg">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest bg-zinc-950/80"><th className="p-4 font-black">Data</th><th className="p-4 font-black">Soldado</th><th className="p-4 font-black">Cliente / Contato</th><th className="p-4 font-black">Produto</th><th className="p-4 font-black">Pagamento</th><th className="p-4 font-black text-right">Valor</th><th className="p-4 font-black text-center">Status</th><th className="p-4 font-black text-center">Ações</th></tr></thead>
                      <tbody className="text-sm">
                        {searchResults.map(venda => (
                          <tr key={venda.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors bg-zinc-950/30">
                            <td className="p-4 text-zinc-400 whitespace-nowrap">{venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--'}</td>
                            <td className="p-4 font-black text-blue-400 uppercase text-[10px]">{venda.seller_name}</td>
                            <td className="p-4 text-zinc-200"><span className="font-bold block">{venda.customer_name}</span><span className="text-[10px] text-zinc-500 block mt-1 cursor-pointer hover:text-white" onClick={()=>copiarTexto(venda.customer_email)}>📧 {venda.customer_email || '--'}</span><span className="text-[10px] text-zinc-500 block cursor-pointer hover:text-white" onClick={()=>copiarTexto(venda.customer_phone)}>📞 {venda.customer_phone || '--'}</span></td>
                            <td className="p-4 text-zinc-400 text-xs uppercase">{venda.product_name}</td>
                            <td className="p-4 text-zinc-400 text-[10px] uppercase font-bold">{venda.payment_method || '--'}</td>
                            <td className="p-4 font-black text-green-400 text-right whitespace-nowrap">{formataBRL(Number(venda.sale_value))}</td>
                            <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${venda.status === 'aprovada' ? 'bg-green-500/10 text-green-500' : venda.status === 'cancelada' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{venda.status}</span></td>
                            <td className="p-4 text-center"><div className="flex justify-center gap-2"><button onClick={() => openAdminEditModal(venda)} className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-600/30 px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all">✏️ Editar</button><button onClick={() => openRefundModal(venda)} className="bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-600/30 px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all">🔴 Estorno</button><button onClick={() => handleDeleteVenda(venda.id)} className="bg-zinc-800 text-zinc-500 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all">🗑️</button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {edicoesPendentes.length > 0 && (
            <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-6 shadow-2xl animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-blue-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedEdits.length === edicoesPendentes.length} onChange={selectAllEdits} className="w-5 h-5 accent-blue-600 rounded cursor-pointer" />
                  <h2 className="text-xl font-black text-blue-400 uppercase tracking-widest cursor-pointer" onClick={selectAllEdits}>🔄 Correções Pendentes ({edicoesPendentes.length})</h2>
                </div>
                {selectedEdits.length > 0 && (
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={batchRejectEdits} className="flex-1 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-6 py-2 rounded font-bold text-[10px] uppercase tracking-widest transition-all">Rejeitar {selectedEdits.length}</button>
                    <button onClick={batchApproveEdits} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-lg transition-all">Aprovar {selectedEdits.length}</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-6">
                {edicoesPendentes.map(venda => {
                  let newData: any = {}; try { newData = typeof venda.edit_data === 'string' ? JSON.parse(venda.edit_data) : (venda.edit_data || {}); } catch(e) {}
                  const isChecked = selectedEdits.includes(venda.id);
                  return (
                    <div key={venda.id} className={`bg-zinc-950 border ${isChecked ? 'border-blue-500' : 'border-zinc-800'} rounded-lg p-5 flex flex-col gap-4 shadow-inner transition-colors`}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-4 gap-4">
                        <div className="flex items-start gap-4">
                          <input type="checkbox" checked={isChecked} onChange={() => toggleEditSelection(venda.id)} className="w-5 h-5 accent-blue-600 rounded cursor-pointer mt-1" />
                          <div><p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Soldado: <span className="text-white text-sm">{venda.seller_name}</span></p><div className="mt-2 bg-red-950/30 border border-red-500/20 p-3 rounded"><p className="text-red-400 text-[10px] font-black uppercase mb-1">Motivo do Erro:</p><p className="text-zinc-300 text-sm italic">"{venda.edit_reason}"</p></div></div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0"><button onClick={() => handleRejeitarEdicao(venda.id)} className="flex-1 md:flex-none border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-6 py-2.5 rounded font-bold text-xs uppercase tracking-widest transition-colors">Rejeitar</button><button onClick={() => handleAprovarEdicao(venda.id)} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded font-black text-xs uppercase tracking-widest shadow-lg transition-colors">Aprovar</button></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-0 md:pl-9">
                        <div className="bg-zinc-900/50 border border-zinc-700/50 p-4 rounded-lg"><h4 className="text-zinc-500 font-black uppercase tracking-widest text-[10px] mb-3 flex items-center gap-1">📋 Atual</h4><div className="space-y-2 text-xs text-zinc-300"><p><span className="font-bold text-zinc-500 uppercase">Cliente:</span> {venda.customer_name}</p><p><span className="font-bold text-zinc-500 uppercase">Produto:</span> {venda.product_name}</p><p><span className="font-bold text-zinc-500 uppercase">Valor:</span> <span className="text-white font-bold">{formataBRL(Number(venda.sale_value))}</span></p></div></div>
                        <div className="bg-blue-950/20 border border-blue-500/30 p-4 rounded-lg relative overflow-hidden"><h4 className="text-blue-400 font-black uppercase tracking-widest text-[10px] mb-3 flex items-center gap-1">✨ Nova Proposta</h4><div className="space-y-2 text-xs text-blue-100"><p><span className="font-bold text-blue-500/60 uppercase">Cliente:</span> {newData.customer_name || venda.customer_name}</p><p><span className="font-bold text-blue-500/60 uppercase">Produto:</span> {newData.product_name || venda.product_name}</p><p><span className="font-bold text-blue-500/60 uppercase">Valor:</span> <span className="text-green-400 font-black">{newData.sale_value ? formataBRL(Number(newData.sale_value)) : formataBRL(Number(venda.sale_value))}</span></p></div></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {vendasPendentes.length > 0 && (
            <div className="border border-yellow-500/40 rounded-xl shadow-[0_0_30px_rgba(250,204,21,0.06)] overflow-hidden animate-in fade-in">
              {/* Header da seção */}
              <div className="bg-yellow-950/30 border-b border-yellow-500/20 px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3 cursor-pointer" onClick={selectAllSales}>
                  <input type="checkbox" checked={selectedSales.length === vendasPendentes.length} onChange={selectAllSales} className="w-4 h-4 accent-yellow-500 rounded cursor-pointer" onClick={e => e.stopPropagation()} />
                  <div>
                    <h2 className="text-base md:text-xl font-black text-yellow-400 uppercase tracking-widest flex items-center gap-2">
                      ⚠️ Aguardando Liberação
                      <span className="bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
                        {vendasPendentes.length}
                      </span>
                    </h2>
                    <p className="text-yellow-700 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                      Vendas que precisam de aprovação do Comando
                    </p>
                  </div>
                </div>
                {selectedSales.length > 0 && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={batchDeleteSales} className="flex-1 sm:flex-none border border-red-600/60 bg-red-950/30 text-red-400 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all">
                      🗑️ Excluir {selectedSales.length}
                    </button>
                    <button onClick={batchApproveSales} className="flex-1 sm:flex-none bg-green-500 hover:bg-green-400 text-black px-5 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all">
                      ⚡ Liberar {selectedSales.length}
                    </button>
                  </div>
                )}
              </div>

              {/* Cards das vendas */}
              <div className="bg-zinc-950/60 divide-y divide-zinc-800/60">
                {vendasPendentes.map(venda => {
                  const isChecked = selectedSales.includes(venda.id);
                  const isPix = venda.payment_method === 'PIX';
                  const isCartao = (venda.payment_method || '').toLowerCase().includes('cartão') || (venda.payment_method || '').toLowerCase().includes('crédito') || (venda.payment_method || '').toLowerCase().includes('débito');

                  return (
                    <div
                      key={venda.id}
                      className={`p-4 md:p-5 flex flex-col md:flex-row gap-4 transition-all ${isChecked ? 'bg-yellow-950/20' : 'hover:bg-zinc-900/50'}`}
                    >
                      {/* Checkbox + info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSaleSelection(venda.id)}
                          className="w-4 h-4 accent-yellow-500 rounded cursor-pointer mt-1 flex-shrink-0"
                        />

                        {/* Ícone de status */}
                        <div className="w-10 h-10 rounded-full bg-yellow-950 border border-yellow-700/50 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(250,204,21,0.1)]">
                          <span className="text-lg">{isPix ? '⚡' : isCartao ? '💳' : '📄'}</span>
                        </div>

                        {/* Dados da venda */}
                        <div className="flex-1 min-w-0">
                          {/* Linha 1: vendedor */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">🛡️ Soldado:</span>
                            <span className="text-white font-black text-sm">{venda.seller_name}</span>
                          </div>

                          {/* Linha 2: cliente + produto */}
                          <div className="flex items-start gap-2 flex-wrap mb-2">
                            <div className="min-w-0">
                              <p className="text-zinc-200 font-bold text-sm truncate">{venda.customer_name}</p>
                              <p className="text-yellow-400 font-black text-xs uppercase tracking-wide">{venda.product_name}</p>
                            </div>
                          </div>

                          {/* Linha 3: e-mail + telefone */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                            {venda.customer_email && (
                              <span
                                className="text-zinc-500 text-[11px] hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-1"
                                onClick={() => copiarTexto(venda.customer_email)}
                                title="Clique para copiar e-mail"
                              >
                                📧 {venda.customer_email}
                              </span>
                            )}
                            {venda.customer_phone && (
                              <span
                                className="text-zinc-500 text-[11px] hover:text-green-400 cursor-pointer transition-colors flex items-center gap-1"
                                onClick={() => copiarTexto(venda.customer_phone)}
                                title="Clique para copiar telefone"
                              >
                                📞 {venda.customer_phone}
                              </span>
                            )}
                          </div>

                          {/* Linha 4: valor + pagamento */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-green-400 font-black text-base">{formataBRL(Number(venda.sale_value))}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${
                              isPix ? 'bg-green-950/50 border-green-800/50 text-green-400' :
                              isCartao ? 'bg-blue-950/50 border-blue-800/50 text-blue-400' :
                              'bg-zinc-800 border-zinc-700 text-zinc-400'
                            }`}>
                              {venda.payment_method}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex sm:flex-col gap-2 justify-end sm:justify-center flex-shrink-0 sm:min-w-[120px]">
                        <button
                          onClick={() => handleAprovarVenda(venda.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-400 active:scale-95 text-black font-black px-4 py-2.5 rounded-lg text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.25)] transition-all"
                        >
                          ⚡ Liberar
                        </button>
                        <button
                          onClick={() => handleDeleteVenda(venda.id)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 border border-red-700/50 bg-red-950/20 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all"
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Grade de Vendedores ── */}
        {(() => {
          const BRT_MS_V = 3 * 60 * 60 * 1000;
          const vendedoresMap = new Map<string, { id: string; nome: string; equipe: string; totalMes: number; qtdMes: number; totalHoje: number; foto_url?: string }>();
          const nowBRT = new Date(Date.now() - BRT_MS_V);
          const hoje = { y: nowBRT.getUTCFullYear(), m: nowBRT.getUTCMonth(), d: nowBRT.getUTCDate() };

          todasVendas.forEach(v => {
            if (!v.seller_name || v.seller_name === 'Desconhecido' || v.status !== 'aprovada') return;
            const key = String(v.seller_id ?? v.seller_name);
            if (!vendedoresMap.has(key)) {
              vendedoresMap.set(key, { id: key, nome: v.seller_name, equipe: '', totalMes: 0, qtdMes: 0, totalHoje: 0 });
            }
            const entry = vendedoresMap.get(key)!;
            const brt = new Date(new Date(v.created_at).getTime() - BRT_MS_V);
            if (brt.getUTCFullYear() === mesSelecionado.ano && brt.getUTCMonth() === mesSelecionado.mes) {
              entry.totalMes += Number(v.sale_value);
              entry.qtdMes++;
            }
            if (brt.getUTCFullYear() === hoje.y && brt.getUTCMonth() === hoje.m && brt.getUTCDate() === hoje.d) {
              entry.totalHoje += Number(v.sale_value);
            }
          });

          const lista = Array.from(vendedoresMap.values()).sort((a, b) => b.totalMes - a.totalMes);
          const NOMES_MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

          if (lista.length === 0) return null;

          return (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 md:p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  🎯 Soldados — {NOMES_MESES[mesSelecionado.mes]} {mesSelecionado.ano}
                </h3>
                <span className="text-zinc-600 text-[10px] font-bold uppercase">Clique para ver detalhes</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {lista.map((v, idx) => {
                  const iniciais = v.nome.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
                  const POSICOES = ['🥇', '🥈', '🥉'];
                  const medalha = idx < 3 ? POSICOES[idx] : null;
                  return (
                    <button
                      key={v.id}
                      onMouseEnter={somHover}
                      onClick={() => {
                        somClick();
                        setVendedorModalAdmin({
                          id: v.id,
                          nome: v.nome,
                          equipe: v.equipe || 'A',
                          total_vendido: v.totalMes,
                          total_vendas_count: v.qtdMes,
                        });
                      }}
                      className="relative bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 rounded-xl p-3 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 group"
                    >
                      {medalha && (
                        <span className="absolute top-2 right-2 text-sm">{medalha}</span>
                      )}
                      <div className="w-9 h-9 rounded-full bg-zinc-700 border-2 border-zinc-600 flex items-center justify-center mb-2 text-[11px] font-black text-zinc-300">
                        {iniciais}
                      </div>
                      <p className="text-white text-xs font-black truncate leading-tight">{v.nome.split(' ')[0]}</p>
                      <p className="text-zinc-600 text-[10px] truncate">{v.nome.split(' ').slice(1).join(' ')}</p>
                      <p className="text-green-400 font-black text-xs mt-2 leading-tight">
                        {v.totalMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                      <p className="text-zinc-600 text-[10px]">{v.qtdMes} venda{v.qtdMes !== 1 ? 's' : ''}</p>
                      {v.totalHoje > 0 && (
                        <span className="inline-block mt-1.5 text-[9px] font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full">
                          ⚡ hoje
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Filtro por período */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5 shadow-xl">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3">🔎 Filtrar por Período</p>
          <div className="flex flex-col sm:flex-row items-end gap-3">
            <div className="flex-1">
              <label className="block text-zinc-600 text-[10px] font-bold uppercase mb-1">Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg p-2.5 text-sm [color-scheme:dark] focus:outline-none focus:border-yellow-500/50" />
            </div>
            <div className="flex-1">
              <label className="block text-zinc-600 text-[10px] font-bold uppercase mb-1">Fim</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg p-2.5 text-sm [color-scheme:dark] focus:outline-none focus:border-yellow-500/50" />
            </div>
            <div className="flex-1">
              <label className="block text-zinc-600 text-[10px] font-bold uppercase mb-1">Pagamento</label>
              <select value={metodoPagamentoFiltro} onChange={(e) => setMetodoPagamentoFiltro(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg p-2.5 text-sm cursor-pointer focus:outline-none focus:border-yellow-500/50">
                <option value="">Todos</option>
                <option value="PIX">PIX</option>
                <option value="Cartão">Cartões</option>
                <option value="Boleto Parcelado">Boleto</option>
              </select>
            </div>
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); handleFiltrar({ preventDefault: () => {} } as any); }}
              className="bg-yellow-400 hover:bg-yellow-300 text-black font-black py-2.5 px-6 rounded-lg text-sm uppercase tracking-widest transition-all active:scale-95"
            >
              Filtrar
            </button>
          </div>
        </div>

        {/* Navegador de mês */}
        {(() => {
          const MESES_NAV = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
          const navMes = (delta: number) => {
            setMesSelecionado(prev => {
              let m = prev.mes + delta;
              let a = prev.ano;
              if (m < 0) { m = 11; a--; }
              if (m > 11) { m = 0; a++; }
              return { mes: m, ano: a };
            });
          };
          const isCurrentMonth = (() => {
            const now = new Date();
            return mesSelecionado.mes === now.getMonth() && mesSelecionado.ano === now.getFullYear();
          })();
          return (
            <div className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800 rounded-xl px-5 py-3 shadow-inner">
              <div className="flex items-center gap-1">
                <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mr-2 hidden sm:block">Período:</span>
                <button
                  onMouseEnter={somHover}
                  onClick={() => { somClick(); navMes(-1); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black transition-all hover:scale-110 active:scale-95"
                >←</button>
                <div className="px-4 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-lg min-w-[140px] text-center">
                  <span className="text-yellow-400 font-black text-sm uppercase tracking-widest">
                    {MESES_NAV[mesSelecionado.mes]} {mesSelecionado.ano}
                  </span>
                </div>
                <button
                  onMouseEnter={somHover}
                  onClick={() => { somClick(); navMes(1); }}
                  disabled={isCurrentMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                >→</button>
              </div>
              {!isCurrentMonth && (
                <button
                  onMouseEnter={somHover}
                  onClick={() => { somClick(); const now = new Date(); setMesSelecionado({ mes: now.getMonth(), ano: now.getFullYear() }); }}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-yellow-400 transition-colors border border-zinc-700 hover:border-yellow-400/50 px-3 py-1.5 rounded-lg"
                >
                  ← Mês Atual
                </button>
              )}
            </div>
          );
        })()}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Card Hoje */}
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); setModalPeriodo('hoje'); }}
            className="bg-zinc-900 border border-zinc-800 hover:border-yellow-400/40 p-4 md:p-5 rounded-xl shadow-xl text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(250,204,21,0.08)] group active:scale-95"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">⚡ Hoje</p>
              <span className="text-[9px] text-zinc-700 font-bold uppercase group-hover:text-yellow-400/60 transition-colors">Ver detalhes →</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white leading-tight">{formataBRL(vendasHoje)}</h2>
            <p className="text-yellow-400/70 text-[10px] font-bold mt-2">🔥 {qtdHoje} venda{qtdHoje !== 1 ? 's' : ''} confirmada{qtdHoje !== 1 ? 's' : ''}</p>
          </button>

          {/* Card Semana */}
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); setModalPeriodo('semana'); }}
            className="bg-zinc-900 border border-zinc-800 hover:border-blue-400/40 p-4 md:p-5 rounded-xl shadow-xl text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.08)] group active:scale-95"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">📅 Semana</p>
              <span className="text-[9px] text-zinc-700 font-bold uppercase group-hover:text-blue-400/60 transition-colors">Ver detalhes →</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white leading-tight">{formataBRL(vendasSemana)}</h2>
            <p className="text-blue-400/70 text-[10px] font-bold mt-2">🔥 {qtdSemana} venda{qtdSemana !== 1 ? 's' : ''} confirmada{qtdSemana !== 1 ? 's' : ''}</p>
          </button>

          {/* Card Mês */}
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); setModalPeriodo('mes'); }}
            className="bg-zinc-900 border border-zinc-800 hover:border-green-400/40 p-4 md:p-5 rounded-xl shadow-xl text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(34,197,94,0.08)] group active:scale-95 col-span-2 md:col-span-1"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                🗓️ {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mesSelecionado.mes]} {mesSelecionado.ano}
              </p>
              <span className="text-[9px] text-zinc-700 font-bold uppercase group-hover:text-green-400/60 transition-colors">Ver detalhes →</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white leading-tight">{formataBRL(vendasMes)}</h2>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
              <div className="bg-yellow-400 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${progressoMeta}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <p className="text-yellow-400/60 text-[10px] font-bold">🔥 {qtdMes} vendas</p>
              <p className="text-zinc-600 text-[10px] font-bold">{progressoMeta.toFixed(1)}%</p>
            </div>
          </button>

          {/* Card Comissão */}
          <div className="bg-zinc-900 border border-green-500/20 p-4 md:p-5 rounded-xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5 text-green-500 text-6xl">💰</div>
            <div className="flex justify-between items-center mb-2 relative z-10">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">💰 Comissão (1%)</p>
              <button onMouseEnter={somHover} onClick={() => { somClick(); setMostrarComissao(!mostrarComissao); }} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                {mostrarComissao ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                )}
              </button>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-green-400 relative z-10">
              {mostrarComissao ? formataBRL(vendasMes * 0.01) : 'R$ •••••••'}
            </h2>
            <p className="text-zinc-600 text-[10px] font-bold mt-2 uppercase tracking-widest relative z-10">Ganhos da Operação</p>
          </div>
        </div>

        {visaoAtiva === 'periodo' && (<RelatorioBatalha vendas={vendasTabela} titulo={tituloRelatorio} subtitulo={subTituloRelatorio} onClose={() => { setVisaoAtiva(null); setVendedorSelecionado(''); setDataInicio(''); setDataFim(''); }} />)}

        {/* Painel Analítico do Mês */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-zinc-800">
            <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
              📈 Painel Analítico
            </h2>
            <span className="text-yellow-400 font-black text-sm">
              — {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mesSelecionado.mes]} {mesSelecionado.ano}
            </span>
          </div>
          <DashboardMensal vendas={vendasDoMesSel} mes={mesSelecionado.mes} ano={mesSelecionado.ano} />
        </div>

        <div className="w-full"><GuerraEquipes refreshTrigger={mainRefreshTrigger} isAdmin={true} /></div>
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