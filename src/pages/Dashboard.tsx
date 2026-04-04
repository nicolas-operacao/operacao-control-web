import { useEffect, useState, useMemo } from 'react';
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
import { somHover, somClick } from '../services/hudSounds';

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
  const [isFinanceiroModalOpen, setIsFinanceiroModalOpen] = useState(false); // 🔥 ESTADO DO FINANCEIRO

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

  const somDinheiro = () => new Audio('https://actions.google.com/sounds/v1/foley/cash_register.ogg').play().catch(() => {});
  const somAlerta = () => new Audio('https://actions.google.com/sounds/v1/alarms/buzzer_alarm.ogg').play().catch(() => {});
  const somSucesso = () => new Audio('https://actions.google.com/sounds/v1/cartoon/bell_ding.ogg').play().catch(() => {});

  const lancarConfetes = () => confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#FACC15', '#22C55E', '#3B82F6'] });

  useEffect(() => { fetchProdutos(); fetchVendasPlacar(); fetchDesafioAtivo(); }, []);

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
      alert("Comandante, não achei vendas com o ID 99999 ou nome 'Checkout Automático'. Se você usou outro ID na hora de importar, me avise para eu ajustar o radar!"); 
      return;
    }

    const confirma = window.confirm(`⚠️ ATENÇÃO: Isso vai apagar TODAS as ${vendasDoRobo.length} vendas importadas incorretamente. Deseja prosseguir?`);
    if (!confirma) return;

    try {
      // Deleta uma por uma
      for (const venda of vendasDoRobo) {
        await api.delete(`/sales/${venda.id}`);
      }
      somSucesso();
      alert("🧹 Base limpa! As vendas importadas erradas foram removidas. Os números vão voltar ao normal.");
      fetchVendasPlacar();
    } catch (e) {
      alert("Erro ao limpar algumas vendas.");
    }
  };

  function copiarTexto(texto?: string) { if (!texto) return; navigator.clipboard.writeText(texto); alert(`📋 Copiado: ${texto}`); }
  const openConfirm = (title: string, message: string, type: 'red' | 'blue' | 'green' | 'yellow', action: () => Promise<void>) => { setConfirmDialog({ isOpen: true, title, message, type, action }); };
  const executeConfirm = async () => { setConfirmDialog(prev => ({ ...prev, isOpen: false })); await confirmDialog.action(); };
  function openRefundModal(venda: Venda) { setSelectedSaleToAction(venda); setIsRefundModalOpen(true); }
  function openAdminEditModal(venda: Venda) { setSelectedSaleToAction(venda); setIsAdminEditModalOpen(true); }

  const handleAprovarEdicao = (id: string) => openConfirm('APROVAR CORREÇÃO', 'Confirma a alteração?', 'blue', async () => { try { await api.post(`/sales/${id}/approve-edit`); somSucesso(); fetchVendasPlacar(); } catch (error) { alert("Erro ao aprovar."); }});
  const handleRejeitarEdicao = (id: string) => openConfirm('REJEITAR CORREÇÃO', 'O vendedor será notificado.', 'red', async () => { try { await api.post(`/sales/${id}/reject-edit`); somAlerta(); fetchVendasPlacar(); } catch (error) { alert("Erro ao rejeitar."); }});
  const handleAprovarVenda = (id: string) => openConfirm('LIBERAR VENDA', 'Esta venda será creditada.', 'green', async () => { try { await api.post(`/sales/${id}/approve`); somDinheiro(); lancarConfetes(); fetchVendasPlacar(); } catch (error) { alert("Erro ao liberar."); }});
  const handleDeleteVenda = (id: string) => openConfirm('EXCLUIR VENDA', '⚠️ ALERTA: Esta venda será apagada.', 'red', async () => { try { await api.delete(`/sales/${id}`); somAlerta(); fetchVendasPlacar(); } catch (error) { alert('Erro ao excluir.'); }});
  const batchApproveEdits = () => openConfirm('APROVAR SELECIONADOS', `Aprovar ${selectedEdits.length} correções?`, 'blue', async () => { try { await Promise.all(selectedEdits.map(id => api.post(`/sales/${id}/approve-edit`))); somSucesso(); fetchVendasPlacar(); } catch (error) { alert("Erro."); }});
  const batchRejectEdits = () => openConfirm('REJEITAR SELECIONADOS', `Rejeitar ${selectedEdits.length} correções?`, 'red', async () => { try { await Promise.all(selectedEdits.map(id => api.post(`/sales/${id}/reject-edit`))); somAlerta(); fetchVendasPlacar(); } catch (error) { alert("Erro."); }});
  const batchApproveSales = () => openConfirm('LIBERAR SELECIONADAS', `Liberar ${selectedSales.length} vendas?`, 'green', async () => { try { await Promise.all(selectedSales.map(id => api.post(`/sales/${id}/approve`))); somDinheiro(); lancarConfetes(); fetchVendasPlacar(); } catch (error) { alert("Erro."); }});
  const batchDeleteSales = () => openConfirm('EXCLUIR SELECIONADAS', `⚠️ ALERTA: APAGAR ${selectedSales.length} vendas?`, 'red', async () => { try { await Promise.all(selectedSales.map(id => api.delete(`/sales/${id}`))); somAlerta(); fetchVendasPlacar(); } catch (error) { alert("Erro."); }});

  const edicoesPendentes = todasVendas.filter(v => v.edit_status === 'pendente');
  const vendasPendentes = todasVendas.filter(v => v.status === 'pendente_liberacao' || v.status === 'pendente_boleto' || v.status === 'pendente');
  const toggleEditSelection = (id: string) => setSelectedEdits(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSaleSelection = (id: string) => setSelectedSales(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectAllEdits = () => setSelectedEdits(selectedEdits.length === edicoesPendentes.length ? [] : edicoesPendentes.map(e => e.id));
  const selectAllSales = () => setSelectedSales(selectedSales.length === vendasPendentes.length ? [] : vendasPendentes.map(v => v.id));
  function handleLogout() { localStorage.removeItem('user'); localStorage.removeItem('token'); navigate('/'); }
  function handleFiltrar(e: React.FormEvent) { e.preventDefault(); if (!dataInicio || !dataFim) { alert("Insira a data!"); return; } setVendedorSelecionado(''); setVisaoAtiva('periodo'); somSucesso(); }

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
  const vendedoresUnicos = Array.from(new Set(todasVendas.map(v => v.seller_name).filter(nome => nome && nome !== 'Desconhecido'))).sort();

  let tituloRelatorio = ''; let subTituloRelatorio = '';
  if (visaoAtiva === 'hoje') tituloRelatorio = 'Vendas de Hoje'; if (visaoAtiva === 'semana') tituloRelatorio = 'Vendas da Semana'; if (visaoAtiva === 'mes') tituloRelatorio = 'Acumulado do Mês';
  if (visaoAtiva === 'periodo') { tituloRelatorio = 'Relatório de Batalha'; subTituloRelatorio = `${dataInicio.split('-').reverse().join('/')} até ${dataFim.split('-').reverse().join('/')}`; }
  if (metodoPagamentoFiltro) subTituloRelatorio += subTituloRelatorio ? ` | Pagamento: ${metodoPagamentoFiltro}` : `Pagamento: ${metodoPagamentoFiltro}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-3 md:p-6 lg:p-8 font-sans relative">
      <ModalMensagemTatica />
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
            {/* Scanline decorativo */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.01)_2px,rgba(255,255,255,0.01)_4px)] pointer-events-none" />

            <div className="relative flex flex-wrap gap-2 items-center">

              {/* ── CTA Principal ── */}
              <button
                onMouseEnter={somHover}
                onClick={() => { somClick(); setIsModalVendaOpen(true); }}
                className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-black font-black px-5 py-2.5 rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] uppercase text-xs tracking-widest transition-all duration-200"
              >
                <span className="text-base">⚔️</span>
                <span>Registrar Venda</span>
              </button>

              {/* Separador */}
              <div className="h-8 w-px bg-zinc-800 mx-1 hidden sm:block" />

              {/* ── Gestão ── */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest hidden lg:block mr-1">Gestão</span>

                {[
                  { label: 'Temporadas', icon: '🏴', cor: 'hover:bg-orange-500/20 hover:border-orange-500/60 hover:text-orange-300 hover:shadow-[0_0_12px_rgba(249,115,22,0.3)]', acao: () => setIsModalDesafioOpen(true) },
                  { label: 'Produtos',   icon: '📦', cor: 'hover:bg-blue-500/20 hover:border-blue-500/60 hover:text-blue-300 hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]',   acao: () => setIsModalProdutoOpen(true) },
                  { label: 'Financeiro', icon: '💰', cor: 'hover:bg-emerald-500/20 hover:border-emerald-500/60 hover:text-emerald-300 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]', acao: () => setIsFinanceiroModalOpen(true) },
                  { label: 'Planilha',   icon: '📥', cor: 'hover:bg-green-500/20 hover:border-green-500/60 hover:text-green-300 hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]',   acao: () => setIsImportModalOpen(true) },
                ].map(({ label, icon, cor, acao }) => (
                  <button
                    key={label}
                    onMouseEnter={somHover}
                    onClick={() => { somClick(); acao(); }}
                    className={`flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/60 text-zinc-400 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-200 ${cor}`}
                  >
                    <span>{icon}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>

              {/* Separador */}
              <div className="h-8 w-px bg-zinc-800 mx-1 hidden sm:block" />

              {/* ── Operações ── */}
              <div className="flex flex-wrap gap-1.5 items-center sm:ml-auto">
                <span className="text-[8px] text-zinc-600 font-black uppercase tracking-widest hidden lg:block mr-1">Operações</span>

                {[
                  { label: 'Suporte',          icon: '🛡️', cor: 'hover:bg-purple-500/20 hover:border-purple-500/60 hover:text-purple-300 hover:shadow-[0_0_12px_rgba(168,85,247,0.3)]', acao: () => navigate('/liberacoes') },
                  { label: 'Recrutas',          icon: '🪖', cor: 'hover:bg-indigo-500/20 hover:border-indigo-500/60 hover:text-indigo-300 hover:shadow-[0_0_12px_rgba(99,102,241,0.3)]',  acao: () => navigate('/admin/recrutas') },
                  { label: 'Limpar Injetados', icon: '🧹', cor: 'hover:bg-red-500/20 hover:border-red-500/60 hover:text-red-300 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]',          acao: handleLimparFogoAmigo },
                ].map(({ label, icon, cor, acao }) => (
                  <button
                    key={label}
                    onMouseEnter={somHover}
                    onClick={() => { somClick(); acao(); }}
                    className={`flex items-center gap-1.5 bg-zinc-900 border border-zinc-700/60 text-zinc-400 px-3 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all duration-200 ${cor}`}
                  >
                    <span>{icon}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Linha decorativa fundo */}
          <div className="absolute -bottom-3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/40 to-transparent" />
        </div>

        {/* RADAR GLOBAL DE BUSCA */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><span className="text-zinc-500 text-lg">🔍</span></div>
              <input type="text" value={globalSearchTerm} onChange={(e) => setGlobalSearchTerm(e.target.value)} placeholder="Radar Global: Digite o nome do cliente, e-mail ou telefone para caçar a venda..." className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg pl-12 p-4 focus:outline-none focus:border-yellow-400 transition-colors shadow-inner placeholder:text-zinc-600" />
            </div>
            {globalSearchTerm && (
              <button onClick={() => setGlobalSearchTerm('')} className="w-full md:w-auto bg-zinc-800 hover:bg-red-900/50 hover:text-red-400 text-zinc-300 px-6 py-4 rounded-lg font-bold uppercase tracking-widest text-xs transition-colors border border-zinc-700 hover:border-red-500/50">Limpar Radar</button>
            )}
          </div>
          {globalSearchTerm.length > 2 && (
            <div className="mt-6 animate-in fade-in slide-in-from-top-4">
              <h3 className="text-yellow-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2">🎯 Alvos Localizados ({searchResults.length})</h3>
              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 border border-zinc-800 border-dashed rounded-lg bg-zinc-950/50 uppercase tracking-widest text-xs font-bold">Nenhum alvo encontrado.</div>
              ) : (
                <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                  <table className="w-full text-left">
                    <thead><tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest bg-zinc-950/80"><th className="p-4 font-black">Data</th><th className="p-4 font-black">Soldado</th><th className="p-4 font-black">Cliente / Contato</th><th className="p-4 font-black">Produto</th><th className="p-4 font-black">Pagamento</th><th className="p-4 font-black text-right">Valor</th><th className="p-4 font-black text-center">Status</th><th className="p-4 font-black text-center">Ações Táticas</th></tr></thead>
                    <tbody className="text-sm">
                      {searchResults.map(venda => (
                        <tr key={venda.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors bg-zinc-950/30">
                          <td className="p-4 text-zinc-400 whitespace-nowrap">{venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '--'}</td><td className="p-4 font-black text-blue-400 uppercase text-[10px]">{venda.seller_name}</td>
                          <td className="p-4 text-zinc-200"><span className="font-bold block">{venda.customer_name}</span><span className="text-[10px] text-zinc-500 block mt-1 cursor-pointer hover:text-white" onClick={()=>copiarTexto(venda.customer_email)}>📧 {venda.customer_email || '--'}</span><span className="text-[10px] text-zinc-500 block cursor-pointer hover:text-white" onClick={()=>copiarTexto(venda.customer_phone)}>📞 {venda.customer_phone || '--'}</span></td>
                          <td className="p-4 text-zinc-400 text-xs uppercase">{venda.product_name}</td><td className="p-4 text-zinc-400 text-[10px] uppercase font-bold">{venda.payment_method || '--'}</td><td className="p-4 font-black text-green-400 text-right whitespace-nowrap">{formataBRL(Number(venda.sale_value))}</td>
                          <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${venda.status === 'aprovada' ? 'bg-green-500/10 text-green-500' : venda.status === 'cancelada' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>{venda.status}</span></td>
                          <td className="p-4 text-center"><div className="flex justify-center gap-2"><button onClick={() => openAdminEditModal(venda)} title="Editar Venda" className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-600/30 px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all">✏️ Editar</button><button onClick={() => openRefundModal(venda)} title="Reembolsar" className="bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-600/30 px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all">🔴 Estorno</button><button onClick={() => handleDeleteVenda(venda.id)} title="Excluir" className="bg-zinc-800 text-zinc-500 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all">🗑️</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl flex flex-col xl:flex-row items-end gap-6">
          <div className="w-full xl:flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 text-yellow-400">🎯 Caçar Soldado</label><select value={vendedorSelecionado} onChange={(e) => { const nome = e.target.value; setVendedorSelecionado(nome); if (nome) { setVisaoAtiva('vendedor'); setDataInicio(''); setDataFim(''); } else { setVisaoAtiva(null); } }} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 cursor-pointer"><option value="">Selecione um soldado...</option>{vendedoresUnicos.map(nome => <option key={nome} value={nome}>{nome}</option>)}</select></div>
            <div><label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2 text-blue-400">💳 Método de Pagamento</label><select value={metodoPagamentoFiltro} onChange={(e) => setMetodoPagamentoFiltro(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 cursor-pointer"><option value="">Todos</option><option value="PIX">PIX</option><option value="Cartão">Cartões</option><option value="Boleto Parcelado">Boleto</option></select></div>
          </div>
          <div className="w-full xl:w-auto flex flex-col md:flex-row items-end gap-4 border-t xl:border-t-0 xl:border-l border-zinc-800 pt-4 xl:pt-0 xl:pl-6">
            <div className="w-full md:w-auto"><label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Inicial</label><input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 [color-scheme:dark]" /></div>
            <div className="w-full md:w-auto"><label className="block text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Final</label><input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-3 [color-scheme:dark]" /></div>
            <button onClick={handleFiltrar} className="w-full md:w-auto bg-zinc-800 hover:bg-yellow-400 hover:text-black text-white font-black py-3 px-8 rounded transition-all uppercase tracking-widest border border-zinc-700">Filtrar</button>
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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div onClick={() => { setVisaoAtiva('hoje'); setVendedorSelecionado(''); setDataInicio(''); setDataFim(''); }} className={`bg-zinc-900 border-l-4 p-6 rounded-lg shadow-2xl relative overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-[1.02] group ${visaoAtiva === 'hoje' ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-yellow-400 hover:border-yellow-300'}`}>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Vendas Hoje</p><h2 className="text-3xl font-black text-white">{formataBRL(vendasHoje)}</h2><p className="text-zinc-400 text-xs font-bold mt-2 text-yellow-400/80">🔥 {qtdHoje} vendas confirmadas</p>
          </div>
          <div onClick={() => { setVisaoAtiva('semana'); setVendedorSelecionado(''); setDataInicio(''); setDataFim(''); }} className={`bg-zinc-900 border-l-4 p-6 rounded-lg shadow-2xl relative overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-[1.02] group ${visaoAtiva === 'semana' ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-yellow-400 hover:border-yellow-300'}`}>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Esta Semana</p><h2 className="text-3xl font-black text-white">{formataBRL(vendasSemana)}</h2><p className="text-zinc-400 text-xs font-bold mt-2 text-yellow-400/80">🔥 {qtdSemana} vendas confirmadas</p>
          </div>
          <div onClick={() => { setVisaoAtiva('mes'); setVendedorSelecionado(''); setDataInicio(''); setDataFim(''); }} className={`bg-zinc-900 border-l-4 p-6 rounded-lg shadow-2xl relative overflow-hidden md:col-span-2 cursor-pointer transform transition-all duration-200 hover:scale-[1.02] group ${visaoAtiva === 'mes' ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-yellow-400 hover:border-yellow-300'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 text-yellow-400 text-8xl">🎯</div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Acumulado — {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mesSelecionado.mes]} {mesSelecionado.ano}</p>
            <div className="flex justify-between items-end"><h2 className="text-4xl font-black text-white">{formataBRL(vendasMes)}</h2><span className="text-zinc-500 text-sm font-bold mb-1">Meta: {formataBRL(META_MENSAL)}</span></div>
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded-full h-4 mt-4 overflow-hidden"><div className="bg-yellow-400 h-4 rounded-full relative transition-all duration-1000" style={{ width: `${progressoMeta}%` }}></div></div>
            <div className="flex justify-between mt-2"><p className="text-zinc-400 text-xs font-bold text-yellow-400/80">🔥 {qtdMes} vendas confirmadas</p><p className="text-right text-yellow-400/50 text-xs font-bold">{progressoMeta.toFixed(1)}% alcançado</p></div>
          </div>
          <div className="bg-zinc-900 border-l-4 border-green-500 p-6 rounded-lg shadow-2xl relative overflow-hidden group cursor-default">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-green-500 text-8xl">💰</div>
            <div className="flex justify-between items-center mb-1 relative z-10"><p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Sua Comissão (1%)</p><button onClick={() => setMostrarComissao(!mostrarComissao)} className="text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none">{mostrarComissao ? (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>)}</button></div>
            <h2 className="text-3xl font-black text-green-400 relative z-10">{mostrarComissao ? formataBRL(vendasMes * 0.01) : 'R$ •••••••'}</h2>
            <p className="text-zinc-500 text-[10px] font-bold mt-2 uppercase tracking-widest relative z-10">Ganhos da Operação</p>
          </div>
        </div>

        {visaoAtiva && visaoAtiva !== 'vendedor' && (<RelatorioBatalha vendas={vendasTabela} titulo={tituloRelatorio} subtitulo={subTituloRelatorio} onClose={() => { setVisaoAtiva(null); setVendedorSelecionado(''); setDataInicio(''); setDataFim(''); }} />)}
        
        {visaoAtiva === 'vendedor' && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800">
              <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2"><span className="text-yellow-400">⚡</span> Ficha Completa: {vendedorSelecionado}</h3>
              <button onClick={() => { setVisaoAtiva(null); setVendedorSelecionado(''); setDataInicio(''); setDataFim(''); }} className="text-zinc-500 hover:text-red-500 font-bold uppercase text-xs transition-colors px-3 py-1 border border-zinc-800 rounded hover:border-red-500">FECHAR X</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-widest"><th className="pb-4 font-black">Data</th><th className="pb-4 font-black">Cliente</th><th className="pb-4 font-black">E-mail</th><th className="pb-4 font-black">Produto</th><th className="pb-4 font-black text-right">Valor</th><th className="pb-4 font-black text-center">Pagamento</th><th className="pb-4 font-black text-center">Status</th><th className="pb-4 font-black text-center">Ações</th></tr></thead>
                <tbody className="text-sm">
                  {vendasTabela.length > 0 ? vendasTabela.map(venda => (
                    <tr key={venda.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/40 transition-colors">
                      <td className="py-4 text-zinc-400 whitespace-nowrap">{venda.created_at ? new Date(venda.created_at).toLocaleDateString('pt-BR') : '--'}</td><td className="py-4 text-zinc-200 font-medium">{venda.customer_name}</td><td className="py-4 text-zinc-400 select-all cursor-pointer hover:text-blue-300 transition-colors" title="Clique para copiar" onClick={()=>copiarTexto(venda.customer_email)}>{venda.customer_email || '--'}</td><td className="py-4 text-zinc-400 text-xs">{venda.product_name}</td><td className="py-4 text-green-400 font-black text-right whitespace-nowrap">{formataBRL(Number(venda.sale_value))}</td><td className="py-4 text-center text-zinc-400 text-[10px] font-bold uppercase">{venda.payment_method || '--'}</td>
                      <td className="py-4 text-center"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${venda.status === 'aprovada' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'}`}>{venda.status === 'aprovada' ? 'Aprovada' : 'Pendente'}</span></td>
                      <td className="py-4 text-center"><button onClick={() => handleDeleteVenda(venda.id)} className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded transition-colors" title="Excluir Venda">🗑️</button></td>
                    </tr>
                  )) : (<tr><td colSpan={8} className="py-12 text-center text-zinc-600 uppercase font-black tracking-widest italic">Nenhuma venda encontrada.</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        )}

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

    </div>
  );
}