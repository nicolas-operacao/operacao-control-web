import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { GuerraEquipes } from '../components/GuerraEquipes'; 
import { RelatorioBatalha } from '../components/RelatorioBatalha'; 
import { ModalGerenciarProdutos } from '../components/ModalGerenciarProdutos'; 
import { ModalRegistrarVenda } from '../components/ModalRegistrarVenda'; 
import { ModalGerenciarDesafios } from '../components/ModalGerenciarDesafios'; 

import { ModalConfirmacao } from '../components/ModalConfirmacao';
import { ModalReembolsoAdmin } from '../components/ModalReembolsoAdmin';
import { ModalEdicaoAdmin } from '../components/ModalEdicaoAdmin';
import { ModalImportarPlanilha } from '../components/ModalImportarPlanilha'; 

import confetti from 'canvas-confetti'; 

type Produto = { id: number; nome: string; valor: number; };
type Venda = { id: string; product_name: string; customer_name: string; customer_phone?: string; customer_email?: string; payment_method?: string; sale_value: number; status: string; created_at: string; seller_name?: string; edit_status?: string; edit_reason?: string; edit_data?: any; };

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

  const [mainRefreshTrigger, setMainRefreshTrigger] = useState(0);

  const [desafioAtivo, setDesafioAtivo] = useState<any>(null);
  const META_MENSAL = desafioAtivo ? Number(desafioAtivo.goal_amount) : 400000;

  const [vendasHoje, setVendasHoje] = useState(0);
  const [vendasSemana, setVendasSemana] = useState(0);
  const [vendasMes, setVendasMes] = useState(0);
  const [qtdHoje, setQtdHoje] = useState(0);
  const [qtdSemana, setQtdSemana] = useState(0);
  const [qtdMes, setQtdMes] = useState(0);

  const [todasVendas, setTodasVendas] = useState<Venda[]>([]);
  
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
      const response = await api.get('/sales'); setTodasVendas(response.data);
      const vendasAprovadas = response.data.filter((v: Venda) => v.status === 'aprovada');
      const hojeData = new Date(); hojeData.setHours(0, 0, 0, 0);
      const inicioSemana = new Date(hojeData); inicioSemana.setDate(hojeData.getDate() - hojeData.getDay()); 
      const inicioMes = new Date(hojeData.getFullYear(), hojeData.getMonth(), 1); 

      let tHoje = 0, tSemana = 0, tMes = 0, qHoje = 0, qSemana = 0, qMes = 0;
      vendasAprovadas.forEach((v: Venda) => {
        const dataVenda = new Date(v.created_at); const valor = Number(v.sale_value);
        if (dataVenda >= inicioMes) { tMes += valor; qMes++; }
        if (dataVenda >= inicioSemana) { tSemana += valor; qSemana++; }
        if (dataVenda >= hojeData) { tHoje += valor; qHoje++; }
      });
      setVendasHoje(tHoje); setVendasSemana(tSemana); setVendasMes(tMes); setQtdHoje(qHoje); setQtdSemana(qSemana); setQtdMes(qMes);
      setSelectedEdits([]); setSelectedSales([]);
    } catch (error) {}
  }

  // 🔥 BOTÃO DE PÂNICO: LIMPAR FOGO AMIGO (Apaga todas as vendas do "Checkout Automático")
  const handleLimparFogoAmigo = async () => {
    const vendasDoRobo = todasVendas.filter(v => v.seller_name === 'Checkout Automático');
    if (vendasDoRobo.length === 0) {
      alert("Nenhuma venda do robô encontrada!"); return;
    }
    const confirma = window.confirm(`⚠️ ATENÇÃO: Isso vai apagar TODAS as ${vendasDoRobo.length} vendas importadas pelo Checkout Automático. Suas vendas originais estão seguras. Deseja prosseguir?`);
    if (!confirma) return;

    try {
      for (const venda of vendasDoRobo) {
        await api.delete(`/sales/${venda.id}`);
      }
      somSucesso();
      alert("🧹 Base limpa! As vendas importadas erradas foram removidas.");
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col xl:flex-row justify-between items-center pb-6 border-b border-zinc-800 gap-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl md:text-4xl font-black text-yellow-400 uppercase tracking-wider leading-none text-center xl:text-left">Operação Control</h1>
            <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] px-3 py-1.5 rounded-md font-black uppercase tracking-widest hidden md:block">Admin</span>
          </div>
          <div className="flex flex-wrap justify-center xl:justify-end gap-3 w-full xl:w-auto">
            {/* 🔥 BOTÃO DE PÂNICO AQUI (Temporário para limpar) */}
            {todasVendas.some(v => v.seller_name === 'Checkout Automático') && (
              <button onClick={handleLimparFogoAmigo} className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2.5 rounded shadow-[0_0_15px_rgba(220,38,38,0.5)] uppercase text-[10px] tracking-widest transition-all animate-pulse">
                🧹 Apagar Checkouts Injetados
              </button>
            )}

            <button onClick={() => setIsImportModalOpen(true)} className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2.5 rounded shadow-[0_0_15px_rgba(34,197,94,0.3)] uppercase text-[10px] tracking-widest transition-all">📥 Sincronizar Planilha</button>
            <button onClick={() => setIsModalDesafioOpen(true)} className="border border-red-500 text-red-400 hover:bg-red-500 hover:text-white px-4 py-2.5 rounded font-bold shadow-[0_0_10px_rgba(220,38,38,0.1)] uppercase text-[10px] tracking-widest transition-all">⚔️ Temporadas</button>
            <button onClick={() => navigate('/liberacoes')} className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2.5 rounded shadow-[0_0_15px_rgba(147,51,234,0.3)] uppercase text-[10px] tracking-widest transition-all">🛡️ Suporte</button>
            <button onClick={() => navigate('/admin/recrutas')} className="border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white px-4 py-2.5 rounded font-bold shadow-[0_0_10px_rgba(147,51,234,0.1)] uppercase text-[10px] tracking-widest transition-all">⚠️ Recrutas</button>
            <button onClick={() => setIsModalProdutoOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded shadow-[0_0_15px_rgba(37,99,235,0.3)] uppercase text-[10px] tracking-widest transition-all">⚙️ Produtos</button>
            <button onClick={() => setIsModalVendaOpen(true)} className="bg-yellow-400 hover:bg-yellow-300 text-black font-black px-6 py-2.5 rounded shadow-[0_0_15px_rgba(250,204,21,0.4)] uppercase text-xs tracking-widest transition-transform hover:scale-105 active:scale-95">+ Registrar Venda</button>
            <button onClick={handleLogout} className="bg-zinc-900 border border-zinc-700 hover:bg-red-600 hover:border-red-500 text-zinc-400 hover:text-white px-5 py-2.5 rounded font-bold uppercase text-[10px] tracking-widest transition-all">Sair</button>
          </div>
        </div>

        {/* RESTO DO DASHBOARD FICA IGUAL... */}
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
            <div className="bg-yellow-900/10 border border-yellow-500/30 rounded-xl p-6 shadow-2xl animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b border-yellow-500/20 pb-4">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={selectedSales.length === vendasPendentes.length} onChange={selectAllSales} className="w-5 h-5 accent-yellow-500 rounded cursor-pointer" />
                  <h2 className="text-xl font-black text-yellow-400 uppercase tracking-widest cursor-pointer" onClick={selectAllSales}>⚠️ Vendas Aguardando Liberação ({vendasPendentes.length})</h2>
                </div>
                {selectedSales.length > 0 && (
                  <div className="flex gap-2 w-full md:w-auto"><button onClick={batchDeleteSales} className="flex-1 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-6 py-2 rounded font-bold text-[10px] uppercase tracking-widest transition-all">Excluir {selectedSales.length}</button><button onClick={batchApproveSales} className="flex-1 bg-green-600 hover:bg-green-500 text-black px-6 py-2 rounded font-black text-[10px] uppercase tracking-widest shadow-lg transition-all">Liberar {selectedSales.length}</button></div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4">
                {vendasPendentes.map(venda => {
                  const isChecked = selectedSales.includes(venda.id);
                  return (
                    <div key={venda.id} className={`bg-zinc-950 border ${isChecked ? 'border-yellow-500' : 'border-zinc-800'} rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors`}>
                      <div className="flex items-center gap-4 flex-1 w-full"><input type="checkbox" checked={isChecked} onChange={() => toggleSaleSelection(venda.id)} className="w-5 h-5 accent-yellow-500 rounded cursor-pointer" /><div className="flex-1"><p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Vendedor: <span className="text-white">{venda.seller_name}</span></p><p className="text-zinc-300 text-sm mt-1">Cliente: <span className="font-bold text-white">{venda.customer_name}</span> | Produto: <span className="font-bold text-yellow-400">{venda.product_name}</span></p><p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">Valor: {formataBRL(Number(venda.sale_value))} | Pagamento: {venda.payment_method}</p></div></div>
                      <div className="flex gap-2 w-full md:w-auto"><button onClick={() => handleDeleteVenda(venda.id)} className="flex-1 md:flex-none border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded font-bold text-xs uppercase tracking-widest transition-colors">Excluir</button><button onClick={() => handleAprovarVenda(venda.id)} className="flex-1 md:flex-none bg-green-600 hover:bg-green-500 text-black px-6 py-2 rounded font-black text-xs uppercase tracking-widest shadow-lg transition-colors">Liberar</button></div>
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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div onClick={() => { setVisaoAtiva('hoje'); setVendedorSelecionado(''); setDataInicio(''); setDataFim(''); }} className={`bg-zinc-900 border-l-4 p-6 rounded-lg shadow-2xl relative overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-[1.02] group ${visaoAtiva === 'hoje' ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-yellow-400 hover:border-yellow-300'}`}>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Vendas Hoje</p><h2 className="text-3xl font-black text-white">{formataBRL(vendasHoje)}</h2><p className="text-zinc-400 text-xs font-bold mt-2 text-yellow-400/80">🔥 {qtdHoje} vendas confirmadas</p>
          </div>
          <div onClick={() => { setVisaoAtiva('semana'); setVendedorSelecionado(''); setDataInicio(''); setDataFim(''); }} className={`bg-zinc-900 border-l-4 p-6 rounded-lg shadow-2xl relative overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-[1.02] group ${visaoAtiva === 'semana' ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-yellow-400 hover:border-yellow-300'}`}>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Esta Semana</p><h2 className="text-3xl font-black text-white">{formataBRL(vendasSemana)}</h2><p className="text-zinc-400 text-xs font-bold mt-2 text-yellow-400/80">🔥 {qtdSemana} vendas confirmadas</p>
          </div>
          <div onClick={() => { setVisaoAtiva('mes'); setVendedorSelecionado(''); setDataInicio(''); setDataFim(''); }} className={`bg-zinc-900 border-l-4 p-6 rounded-lg shadow-2xl relative overflow-hidden md:col-span-2 cursor-pointer transform transition-all duration-200 hover:scale-[1.02] group ${visaoAtiva === 'mes' ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-yellow-400 hover:border-yellow-300'}`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 text-yellow-400 text-8xl">🎯</div>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Acumulado ({desafioAtivo ? desafioAtivo.name : 'Geral'})</p>
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

        <div className="w-full"><GuerraEquipes refreshTrigger={mainRefreshTrigger} /></div>
      </div>

      <ModalGerenciarDesafios isOpen={isModalDesafioOpen} onClose={() => setIsModalDesafioOpen(false)} onAtualizar={() => { fetchDesafioAtivo(); setMainRefreshTrigger(prev => prev + 1); }} />
      <ModalGerenciarProdutos isOpen={isModalProdutoOpen} onClose={() => setIsModalProdutoOpen(false)} produtos={produtos} onAtualizarLista={fetchProdutos} />
      <ModalRegistrarVenda isOpen={isModalVendaOpen} onClose={() => setIsModalVendaOpen(false)} produtos={produtos} user={user} onVendaRegistrada={() => { setIsModalVendaOpen(false); fetchVendasPlacar(); }} />
      
      <ModalImportarPlanilha isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} vendasAtuais={todasVendas} onSuccess={() => { setIsImportModalOpen(false); fetchVendasPlacar(); }} />
      <ModalEdicaoAdmin isOpen={isAdminEditModalOpen} onClose={() => setIsAdminEditModalOpen(false)} venda={selectedSaleToAction} produtos={produtos} onSuccess={() => { setIsAdminEditModalOpen(false); setSelectedSaleToAction(null); fetchVendasPlacar(); }} />
      <ModalReembolsoAdmin isOpen={isRefundModalOpen} onClose={() => setIsRefundModalOpen(false)} venda={selectedSaleToAction} onSuccess={() => { setIsRefundModalOpen(false); setSelectedSaleToAction(null); fetchVendasPlacar(); }} />
      <ModalConfirmacao isOpen={confirmDialog.isOpen} title={confirmDialog.title} message={confirmDialog.message} type={confirmDialog.type} onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} onConfirm={executeConfirm} />
    </div>
  );
}