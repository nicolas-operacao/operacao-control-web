import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from '../services/toast';
import { somClick, somHover } from '../services/hudSounds';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type Lead = {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  produto_interesse?: string;
  valor_estimado?: number;
  origem?: string;
  observacoes?: string;
  estagio: string;
  motivo_perda?: string;
  responsavel_id?: string;
  responsavel_nome?: string;
  created_at: string;
  updated_at: string;
};

type Atividade = {
  id: string;
  lead_id: string;
  user_id: string;
  user_nome: string;
  tipo: string;
  conteudo: string;
  created_at: string;
};

type Tarefa = {
  id: string;
  lead_id?: string;
  user_id: string;
  user_nome: string;
  titulo: string;
  descricao?: string;
  vencimento?: string;
  concluida: boolean;
  crm_leads?: { nome: string; estagio: string };
};

type Historico = {
  id: string;
  estagio_anterior?: string;
  estagio_novo: string;
  user_nome: string;
  observacao?: string;
  created_at: string;
};

type LeadDetalhe = Lead & {
  historico: Historico[];
  atividades: Atividade[];
  tarefas: Tarefa[];
};

type Membro = { id: string; name: string; role?: string };

type Analytics = {
  total: number;
  ativos: number;
  fechados: number;
  perdidos: number;
  semResponsavel?: number;
  valorPipeline: number;
  valorFechado: number;
  taxaConversao: number;
  idadeMediaDias?: number;
  porEstagio: Record<string, number>;
  funil?: Record<string, number>;
  porMembro?: Array<{ nome: string; total: number; ativos: number; fechados: number; perdidos: number; valor: number }>;
};

// ─── CONFIGURAÇÃO DE ESTÁGIOS ─────────────────────────────────────────────────

const COLUNAS_KANBAN = [
  { id: 'base',          label: 'Entrada',      cor: 'border-zinc-600',   icone: '📥' },
  { id: 'prospeccao',    label: 'Prospecção',   cor: 'border-blue-500',   icone: '🔍' },
  { id: 'conexao',       label: 'Conexão',      cor: 'border-cyan-500',   icone: '📞' },
  { id: 'qualificacao',  label: 'Qualificação', cor: 'border-violet-500', icone: '🎯' },
  { id: 'apresentacao',  label: 'Apresentação', cor: 'border-orange-500', icone: '🎤' },
  { id: 'negociacao',    label: 'Negociação',   cor: 'border-yellow-500', icone: '🤝' },
  { id: 'followup',      label: 'Follow-up',    cor: 'border-pink-500',   icone: '🔄' },
  { id: 'fechamento',    label: 'Fechado ✅',   cor: 'border-green-500',  icone: '🏆' },
  { id: 'perdido',       label: 'Perdidos ❌',  cor: 'border-red-700',    icone: '💀' },
];

const ESTAGIOS_PERDIDO = ['perdido_sem_interesse','perdido_sem_contato','perdido_concorrente','perdido_preco','perdido_nao_qualificado'];

const MOTIVOS_PERDA: Record<string, string> = {
  perdido_sem_interesse: 'Sem interesse',
  perdido_sem_contato:   'Sem contato',
  perdido_concorrente:   'Concorrência',
  perdido_preco:         'Preço',
  perdido_nao_qualificado: 'Não qualificado',
};

const ORIGENS = ['Instagram','Facebook','Indicação','Google','YouTube','TikTok','WhatsApp','Site','Evento','Outro'];
const TIPOS_ATIVIDADE = ['nota','ligacao','email','reuniao','whatsapp','outro'];

function fmtMoeda(v?: number) {
  if (!v) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtData(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtDataCurta(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function diasDesde(s: string) {
  return Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
}

function labelEstagio(e: string) {
  return COLUNAS_KANBAN.find(c => c.id === e || (c.id === 'perdido' && ESTAGIOS_PERDIDO.includes(e)))?.label ?? e;
}

// ─── COMPONENTE CARD LEAD ─────────────────────────────────────────────────────

function CardLead({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const dias = diasDesde(lead.updated_at);
  const quente = dias <= 1;
  const frio   = dias > 5;

  return (
    <button
      onClick={() => { somClick(); onClick(); }}
      onMouseEnter={somHover}
      className="w-full text-left bg-zinc-900 border border-zinc-700/60 rounded-lg p-3 hover:border-yellow-400/40 hover:bg-zinc-800/80 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <span className="font-bold text-white text-sm leading-tight line-clamp-1">{lead.nome}</span>
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ${quente ? 'bg-green-500/20 text-green-400' : frio ? 'bg-red-500/20 text-red-400' : 'bg-zinc-700 text-zinc-400'}`}>
          {dias === 0 ? 'hoje' : `${dias}d`}
        </span>
      </div>
      {lead.produto_interesse && (
        <p className="text-[11px] text-yellow-400/80 font-medium truncate mb-1">{lead.produto_interesse}</p>
      )}
      <div className="flex items-center justify-between">
        {lead.valor_estimado ? (
          <span className="text-[11px] text-green-400 font-bold">{fmtMoeda(lead.valor_estimado)}</span>
        ) : <span />}
        {lead.responsavel_nome && (
          <span className="text-[10px] text-zinc-500 truncate max-w-[90px]">{lead.responsavel_nome.split(' ')[0]}</span>
        )}
      </div>
    </button>
  );
}

// ─── MODAL CRIAR/EDITAR LEAD ──────────────────────────────────────────────────

function ModalLead({
  lead,
  membros,
  isManager,
  onSalvar,
  onFechar,
}: {
  lead?: Lead | null;
  membros: Membro[];
  isManager: boolean;
  onSalvar: (data: Partial<Lead>) => Promise<void>;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(lead?.nome ?? '');
  const [telefone, setTelefone] = useState(lead?.telefone ?? '');
  const [email, setEmail] = useState(lead?.email ?? '');
  const [produto, setProduto] = useState(lead?.produto_interesse ?? '');
  const [valor, setValor] = useState(lead?.valor_estimado ? String(lead.valor_estimado) : '');
  const [origem, setOrigem] = useState(lead?.origem ?? '');
  const [obs, setObs] = useState(lead?.observacoes ?? '');
  const [responsavelId, setResponsavelId] = useState(lead?.responsavel_id ?? '');
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return toast.error('Nome é obrigatório');
    setSalvando(true);
    try {
      const membro = membros.find(m => String(m.id) === responsavelId);
      await onSalvar({
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        produto_interesse: produto.trim() || undefined,
        valor_estimado: valor ? Number(valor.replace(',', '.')) : undefined,
        origem: origem || undefined,
        observacoes: obs.trim() || undefined,
        responsavel_id: responsavelId || undefined,
        responsavel_nome: membro?.name,
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <form
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-3"
      >
        <h2 className="text-yellow-400 font-black text-lg">{lead ? '✏️ Editar Lead' : '➕ Novo Lead'}</h2>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400 font-bold">Nome *</span>
          <input
            value={nome} onChange={e => setNome(e.target.value)} required
            className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none"
            placeholder="Nome do lead"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400 font-bold">Telefone</span>
            <input value={telefone} onChange={e => setTelefone(e.target.value)}
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none"
              placeholder="(00) 00000-0000" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400 font-bold">E-mail</span>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none"
              placeholder="email@exemplo.com" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400 font-bold">Produto / Interesse</span>
            <input value={produto} onChange={e => setProduto(e.target.value)}
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none"
              placeholder="Ex: Mentoria Premium" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400 font-bold">Valor estimado (R$)</span>
            <input value={valor} onChange={e => setValor(e.target.value)} type="number" min="0" step="0.01"
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none"
              placeholder="0,00" />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400 font-bold">Origem</span>
          <select value={origem} onChange={e => setOrigem(e.target.value)}
            className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
            <option value="">Selecione...</option>
            {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </label>

        {isManager && membros.length > 0 && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-zinc-400 font-bold">Responsável</span>
            <select value={responsavelId} onChange={e => setResponsavelId(e.target.value)}
              className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
              <option value="">Auto-distribuir</option>
              {membros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400 font-bold">Observações</span>
          <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
            className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none resize-none"
            placeholder="Informações relevantes sobre o lead..." />
        </label>

        <div className="flex gap-3 mt-1">
          <button type="button" onClick={onFechar}
            className="flex-1 py-2.5 rounded-lg border border-zinc-600 text-zinc-400 text-sm font-bold hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="flex-1 py-2.5 rounded-lg bg-yellow-400 text-black font-black text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50">
            {salvando ? 'Salvando...' : lead ? 'Salvar' : 'Criar Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── PAINEL DETALHE DO LEAD ───────────────────────────────────────────────────

function PainelLead({
  leadId,
  onFechar,
  onAtualizar,
  isManager,
  membros,
}: {
  leadId: string;
  onFechar: () => void;
  onAtualizar: () => void;
  isManager: boolean;
  membros: Membro[];
}) {
  const [lead, setLead] = useState<LeadDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<'atividades' | 'tarefas' | 'historico'>('atividades');
  const [novaAtv, setNovaAtv] = useState('');
  const [tipoAtv, setTipoAtv] = useState('nota');
  const [salvandoAtv, setSalvandoAtv] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState('');
  const [vencTarefa, setVencTarefa] = useState('');
  const [salvandoTarefa, setSalvandoTarefa] = useState(false);
  const [movendo, setMovendo] = useState(false);
  const [novoEstagio, setNovoEstagio] = useState('');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [obsMove, setObsMove] = useState('');
  const [showMove, setShowMove] = useState(false);
  const [atribuindo, setAtribuindo] = useState(false);
  const [novoResponsavel, setNovoResponsavel] = useState('');

  const carregarLead = useCallback(async () => {
    try {
      const { data } = await api.get(`/crm/leads/${leadId}`);
      setLead(data);
      setNovoEstagio(data.estagio);
    } catch { toast.error('Erro ao carregar lead'); }
    finally { setLoading(false); }
  }, [leadId]);

  useEffect(() => { carregarLead(); }, [carregarLead]);

  async function handleMover() {
    if (!novoEstagio) return;
    const isPerdido = novoEstagio.startsWith('perdido');
    if (isPerdido && !motivoPerda) return toast.error('Selecione o motivo da perda');
    setMovendo(true);
    try {
      await api.patch(`/crm/leads/${leadId}/move`, {
        estagio: novoEstagio,
        observacao: obsMove,
        motivo_perda: isPerdido ? motivoPerda : undefined,
      });
      toast.success('Lead movido!');
      setShowMove(false);
      setObsMove('');
      setMotivoPerda('');
      onAtualizar();
      carregarLead();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro ao mover'); }
    finally { setMovendo(false); }
  }

  async function handleAtribuir() {
    if (!novoResponsavel) return;
    const membro = membros.find(m => String(m.id) === novoResponsavel);
    if (!membro) return;
    setAtribuindo(true);
    try {
      await api.patch(`/crm/leads/${leadId}/atribuir`, { vendedor_id: membro.id, vendedor_nome: membro.name });
      toast.success(`Lead atribuído para ${membro.name}`);
      onAtualizar();
      carregarLead();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
    finally { setAtribuindo(false); }
  }

  async function handleAtividade(e: React.FormEvent) {
    e.preventDefault();
    if (!novaAtv.trim()) return;
    setSalvandoAtv(true);
    try {
      await api.post(`/crm/leads/${leadId}/atividades`, { tipo: tipoAtv, conteudo: novaAtv.trim() });
      setNovaAtv('');
      carregarLead();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
    finally { setSalvandoAtv(false); }
  }

  async function handleTarefa(e: React.FormEvent) {
    e.preventDefault();
    if (!novaTarefa.trim()) return;
    setSalvandoTarefa(true);
    try {
      await api.post('/crm/tarefas', {
        lead_id: leadId,
        titulo: novaTarefa.trim(),
        vencimento: vencTarefa || undefined,
      });
      setNovaTarefa('');
      setVencTarefa('');
      carregarLead();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
    finally { setSalvandoTarefa(false); }
  }

  async function handleCompletarTarefa(tarefaId: string) {
    try {
      await api.patch(`/crm/tarefas/${tarefaId}/done`);
      carregarLead();
    } catch { toast.error('Erro'); }
  }

  if (loading) return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
      <div className="text-yellow-400 text-2xl animate-pulse">Carregando...</div>
    </div>
  );

  if (!lead) return null;

  const isPerdido = lead.estagio.startsWith('perdido');

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onFechar}>
      <div className="ml-auto w-full max-w-lg h-full bg-zinc-950 border-l border-zinc-800 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-black text-lg leading-tight truncate">{lead.nome}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPerdido ? 'bg-red-900/50 text-red-400' : lead.estagio === 'fechamento' ? 'bg-green-900/50 text-green-400' : 'bg-zinc-800 text-yellow-400'}`}>
                {labelEstagio(lead.estagio)}
              </span>
              {lead.responsavel_nome && (
                <span className="text-xs text-zinc-500">👤 {lead.responsavel_nome}</span>
              )}
            </div>
          </div>
          <button onClick={onFechar} className="text-zinc-500 hover:text-white text-xl font-bold shrink-0">✕</button>
        </div>

        {/* Detalhes */}
        <div className="p-4 border-b border-zinc-800 grid grid-cols-2 gap-2 text-sm">
          {lead.telefone && <div><span className="text-zinc-500">📞</span> <span className="text-white">{lead.telefone}</span></div>}
          {lead.email && <div><span className="text-zinc-500">✉️</span> <span className="text-zinc-300 text-xs break-all">{lead.email}</span></div>}
          {lead.produto_interesse && <div><span className="text-zinc-500">🎯</span> <span className="text-yellow-400">{lead.produto_interesse}</span></div>}
          {lead.valor_estimado && <div><span className="text-zinc-500">💰</span> <span className="text-green-400 font-bold">{fmtMoeda(lead.valor_estimado)}</span></div>}
          {lead.origem && <div><span className="text-zinc-500">📡</span> <span className="text-zinc-300">{lead.origem}</span></div>}
          <div><span className="text-zinc-500">📅</span> <span className="text-zinc-400 text-xs">{fmtData(lead.created_at)}</span></div>
          {lead.observacoes && (
            <div className="col-span-2 mt-1 text-zinc-400 text-xs bg-zinc-900 rounded p-2">{lead.observacoes}</div>
          )}
        </div>

        {/* Ações: mover + atribuir */}
        <div className="p-4 border-b border-zinc-800 flex flex-col gap-3">
          <button
            onClick={() => setShowMove(v => !v)}
            className="w-full py-2 rounded-lg border border-zinc-600 text-zinc-300 text-sm font-bold hover:bg-zinc-800 transition-colors"
          >
            {showMove ? '✕ Fechar' : '↪️ Mover Estágio'}
          </button>

          {showMove && (
            <div className="flex flex-col gap-2">
              <select value={novoEstagio} onChange={e => { setNovoEstagio(e.target.value); setMotivoPerda(''); }}
                className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
                {COLUNAS_KANBAN.filter(c => c.id !== 'perdido').map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
                {ESTAGIOS_PERDIDO.map(e => (
                  <option key={e} value={e}>❌ {MOTIVOS_PERDA[e]}</option>
                ))}
              </select>
              {novoEstagio.startsWith('perdido') && (
                <select value={motivoPerda} onChange={e => setMotivoPerda(e.target.value)}
                  className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
                  <option value="">Motivo da perda...</option>
                  {ESTAGIOS_PERDIDO.map(e => <option key={e} value={e}>{MOTIVOS_PERDA[e]}</option>)}
                </select>
              )}
              <input value={obsMove} onChange={e => setObsMove(e.target.value)}
                className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none"
                placeholder="Observação (opcional)" />
              <button onClick={handleMover} disabled={movendo}
                className="py-2 rounded-lg bg-yellow-400 text-black font-black text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50">
                {movendo ? 'Movendo...' : 'Confirmar Movimento'}
              </button>
            </div>
          )}

          {isManager && (
            <div className="flex gap-2">
              <select value={novoResponsavel} onChange={e => setNovoResponsavel(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
                <option value="">Atribuir responsável...</option>
                {membros.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button onClick={handleAtribuir} disabled={atribuindo || !novoResponsavel}
                className="px-4 py-2 rounded-lg bg-zinc-700 text-white text-sm font-bold hover:bg-zinc-600 transition-colors disabled:opacity-50">
                {atribuindo ? '...' : 'OK'}
              </button>
            </div>
          )}
        </div>

        {/* Abas */}
        <div className="flex border-b border-zinc-800">
          {(['atividades', 'tarefas', 'historico'] as const).map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`flex-1 py-2.5 text-xs font-bold capitalize transition-colors ${aba === a ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {a === 'atividades' ? `📝 Notas (${lead.atividades.length})` : a === 'tarefas' ? `✅ Tarefas (${lead.tarefas.filter(t => !t.concluida).length})` : `📋 Histórico`}
            </button>
          ))}
        </div>

        {/* Conteúdo das abas */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {aba === 'atividades' && (
            <>
              <form onSubmit={handleAtividade} className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <select value={tipoAtv} onChange={e => setTipoAtv(e.target.value)}
                    className="bg-zinc-800 border border-zinc-600 rounded-lg px-2 py-2 text-white text-xs focus:border-yellow-400 outline-none">
                    {TIPOS_ATIVIDADE.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <textarea value={novaAtv} onChange={e => setNovaAtv(e.target.value)} rows={2}
                    className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none resize-none"
                    placeholder="Registrar uma atividade..." />
                </div>
                <button type="submit" disabled={salvandoAtv || !novaAtv.trim()}
                  className="self-end px-4 py-2 rounded-lg bg-zinc-700 text-white text-sm font-bold hover:bg-zinc-600 transition-colors disabled:opacity-50">
                  {salvandoAtv ? '...' : 'Registrar'}
                </button>
              </form>
              <div className="flex flex-col gap-2">
                {lead.atividades.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">Nenhuma atividade registrada</p>}
                {lead.atividades.map(atv => (
                  <div key={atv.id} className="bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-yellow-400 capitalize">{atv.tipo}</span>
                      <span className="text-xs text-zinc-500">{atv.user_nome}</span>
                      <span className="text-xs text-zinc-600 ml-auto">{fmtDataCurta(atv.created_at)}</span>
                    </div>
                    <p className="text-zinc-300 text-sm whitespace-pre-wrap">{atv.conteudo}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {aba === 'tarefas' && (
            <>
              <form onSubmit={handleTarefa} className="flex flex-col gap-2">
                <input value={novaTarefa} onChange={e => setNovaTarefa(e.target.value)}
                  className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none"
                  placeholder="Nova tarefa..." />
                <div className="flex gap-2">
                  <input value={vencTarefa} onChange={e => setVencTarefa(e.target.value)} type="date"
                    className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none" />
                  <button type="submit" disabled={salvandoTarefa || !novaTarefa.trim()}
                    className="px-4 py-2 rounded-lg bg-zinc-700 text-white text-sm font-bold hover:bg-zinc-600 transition-colors disabled:opacity-50">
                    {salvandoTarefa ? '...' : '+ Adicionar'}
                  </button>
                </div>
              </form>
              <div className="flex flex-col gap-2">
                {lead.tarefas.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">Nenhuma tarefa</p>}
                {lead.tarefas.map(t => (
                  <div key={t.id} className={`flex items-start gap-3 p-3 rounded-lg border ${t.concluida ? 'border-zinc-800 opacity-50' : 'border-zinc-700 bg-zinc-900'}`}>
                    <button onClick={() => !t.concluida && handleCompletarTarefa(t.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${t.concluida ? 'border-green-500 bg-green-500/20' : 'border-zinc-500 hover:border-yellow-400'}`}>
                      {t.concluida && <span className="text-green-400 text-xs">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${t.concluida ? 'line-through text-zinc-500' : 'text-white'}`}>{t.titulo}</p>
                      {t.vencimento && (
                        <p className={`text-xs ${new Date(t.vencimento) < new Date() && !t.concluida ? 'text-red-400' : 'text-zinc-500'}`}>
                          Vence: {new Date(t.vencimento).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {aba === 'historico' && (
            <div className="flex flex-col gap-2">
              {lead.historico.length === 0 && <p className="text-zinc-600 text-sm text-center py-4">Sem histórico</p>}
              {lead.historico.map(h => (
                <div key={h.id} className="flex gap-3 items-start">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-zinc-300 text-sm">
                      {h.estagio_anterior
                        ? <><span className="text-zinc-500">{labelEstagio(h.estagio_anterior)}</span> → <span className="text-yellow-400">{labelEstagio(h.estagio_novo)}</span></>
                        : <span className="text-yellow-400">{labelEstagio(h.estagio_novo)}</span>
                      }
                    </p>
                    {h.observacao && <p className="text-zinc-500 text-xs mt-0.5">{h.observacao}</p>}
                    <p className="text-zinc-600 text-xs">{h.user_nome} · {fmtData(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PAINEL DE ANALYTICS ──────────────────────────────────────────────────────

function PainelAnalytics({ analytics, onFechar }: { analytics: Analytics; onFechar: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onFechar}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-yellow-400 font-black text-xl">📊 Analytics do CRM</h2>
          <button onClick={onFechar} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total', valor: analytics.total, cor: 'text-white' },
            { label: 'Ativos', valor: analytics.ativos, cor: 'text-blue-400' },
            { label: 'Fechados', valor: analytics.fechados, cor: 'text-green-400' },
            { label: 'Perdidos', valor: analytics.perdidos, cor: 'text-red-400' },
          ].map(c => (
            <div key={c.label} className="bg-zinc-800 rounded-lg p-3 text-center">
              <p className={`text-2xl font-black ${c.cor}`}>{c.valor}</p>
              <p className="text-xs text-zinc-500 font-bold mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500 font-bold">PIPELINE</p>
            <p className="text-lg font-black text-yellow-400">{fmtMoeda(analytics.valorPipeline)}</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500 font-bold">FECHADO</p>
            <p className="text-lg font-black text-green-400">{fmtMoeda(analytics.valorFechado)}</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500 font-bold">CONVERSÃO</p>
            <p className="text-lg font-black text-white">{analytics.taxaConversao}%</p>
          </div>
          {analytics.idadeMediaDias !== undefined && (
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 font-bold">IDADE MÉDIA</p>
              <p className="text-lg font-black text-white">{analytics.idadeMediaDias} dias</p>
            </div>
          )}
          {analytics.semResponsavel !== undefined && analytics.semResponsavel > 0 && (
            <div className="col-span-2 bg-red-900/30 border border-red-700/50 rounded-lg p-3">
              <p className="text-xs text-red-400 font-bold">⚠️ SEM RESPONSÁVEL</p>
              <p className="text-lg font-black text-red-400">{analytics.semResponsavel} leads</p>
            </div>
          )}
        </div>

        {/* Por membro */}
        {analytics.porMembro && analytics.porMembro.length > 0 && (
          <div>
            <h3 className="text-zinc-400 font-bold text-sm mb-3">Por Membro</h3>
            <div className="flex flex-col gap-2">
              {analytics.porMembro.map(m => (
                <div key={m.nome} className="bg-zinc-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-bold text-sm">{m.nome}</span>
                    <span className="text-zinc-400 text-xs">{m.total} leads</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-blue-400">⚡ {m.ativos} ativos</span>
                    <span className="text-green-400">✅ {m.fechados} fechados</span>
                    <span className="text-red-400">❌ {m.perdidos} perdidos</span>
                    {m.valor > 0 && <span className="text-yellow-400 ml-auto">{fmtMoeda(m.valor)}</span>}
                  </div>
                  {m.total > 0 && (
                    <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${(m.fechados / m.total) * 100}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL DO CRM ──────────────────────────────────────────────────

export function Crm() {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = useMemo(() => userStr ? JSON.parse(userStr) : { id: '', name: '', role: 'vendedor' }, [userStr]);
  const isManager = ['admin', 'suporte'].includes(user.role);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroEstagio, setFiltroEstagio] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');

  const [leadSelecionadoId, setLeadSelecionadoId] = useState<string | null>(null);
  const [showModalLead, setShowModalLead] = useState(false);
  const [editandoLead, setEditandoLead] = useState<Lead | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [distribuindo, setDistribuindo] = useState(false);
  const [view, setView] = useState<'kanban' | 'lista'>('kanban');

  const carregarLeads = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filtroEstagio) params.estagio = filtroEstagio;
      if (filtroResponsavel) params.responsavel_id = filtroResponsavel;
      if (busca) params.busca = busca;
      const { data } = await api.get('/crm/leads', { params });
      setLeads(data);
    } catch { toast.error('Erro ao carregar leads'); }
    finally { setLoading(false); }
  }, [filtroEstagio, filtroResponsavel, busca]);

  const carregarAnalytics = useCallback(async () => {
    try {
      const { data } = await api.get('/crm/analytics');
      setAnalytics(data);
    } catch { /* silencioso */ }
  }, []);

  const carregarMembros = useCallback(async () => {
    if (!isManager) return;
    try {
      const { data } = await api.get('/crm/membros');
      setMembros(data);
    } catch { /* silencioso */ }
  }, [isManager]);

  useEffect(() => {
    carregarLeads();
    carregarAnalytics();
    carregarMembros();
  }, [carregarLeads, carregarAnalytics, carregarMembros]);

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(carregarLeads, 350);
    return () => clearTimeout(t);
  }, [busca, carregarLeads]);

  async function handleCriarLead(data: Partial<Lead>) {
    try {
      await api.post('/crm/leads', data);
      toast.success('Lead criado!');
      setShowModalLead(false);
      carregarLeads();
      carregarAnalytics();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro ao criar'); }
  }

  async function handleEditarLead(data: Partial<Lead>) {
    if (!editandoLead) return;
    try {
      await api.put(`/crm/leads/${editandoLead.id}`, data);
      toast.success('Lead atualizado!');
      setEditandoLead(null);
      carregarLeads();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro ao atualizar'); }
  }

  async function handleAutoDistribuir() {
    if (!isManager) return;
    setDistribuindo(true);
    try {
      const { data } = await api.post('/crm/leads/distribuir');
      toast.success(`${data.distribuidos} leads distribuídos!`);
      carregarLeads();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
    finally { setDistribuindo(false); }
  }

  // Leads agrupados por coluna do kanban
  const leadsPorColuna = useMemo(() => {
    const grupos: Record<string, Lead[]> = {};
    COLUNAS_KANBAN.forEach(c => { grupos[c.id] = []; });
    leads.forEach(lead => {
      const col = ESTAGIOS_PERDIDO.includes(lead.estagio) ? 'perdido' : lead.estagio;
      if (grupos[col]) grupos[col].push(lead);
      else grupos['base']?.push(lead); // fallback
    });
    return grupos;
  }, [leads]);

  const leadsVisiveis = useMemo(() => leads, [leads]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-white transition-colors text-sm">
            ← Voltar
          </button>
          <h1 className="text-yellow-400 font-black text-lg flex-1">🎯 CRM</h1>

          {/* Stats rápidos */}
          {analytics && (
            <div className="hidden md:flex items-center gap-4 text-xs">
              <span className="text-zinc-400"><span className="text-white font-bold">{analytics.ativos}</span> ativos</span>
              <span className="text-zinc-400"><span className="text-green-400 font-bold">{analytics.fechados}</span> fechados</span>
              <span className="text-zinc-400"><span className="text-yellow-400 font-bold">{analytics.taxaConversao}%</span> conversão</span>
            </div>
          )}

          <div className="flex gap-2">
            {/* Toggle view */}
            <button onClick={() => setView(v => v === 'kanban' ? 'lista' : 'kanban')}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-zinc-800 transition-colors">
              {view === 'kanban' ? '≡ Lista' : '⊞ Kanban'}
            </button>
            {/* Analytics */}
            <button onClick={() => { somClick(); setShowAnalytics(true); carregarAnalytics(); }}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-zinc-800 transition-colors">
              📊
            </button>
            {/* Auto-distribuir */}
            {isManager && (
              <button onClick={() => { somClick(); handleAutoDistribuir(); }} disabled={distribuindo}
                className="px-3 py-1.5 rounded-lg border border-zinc-600 text-zinc-300 text-xs font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50">
                {distribuindo ? '...' : '⚡ Distribuir'}
              </button>
            )}
            {/* Novo Lead */}
            <button onClick={() => { somClick(); setShowModalLead(true); }}
              className="px-4 py-1.5 rounded-lg bg-yellow-400 text-black text-xs font-black hover:bg-yellow-300 transition-colors">
              + Novo Lead
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <input
            value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="🔍 Buscar por nome, telefone, email..."
            className="flex-1 min-w-[180px] bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none placeholder-zinc-600"
          />
          <select value={filtroEstagio} onChange={e => setFiltroEstagio(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
            <option value="">Todos os estágios</option>
            {COLUNAS_KANBAN.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          {isManager && membros.length > 0 && (
            <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
              <option value="">Todos os membros</option>
              {membros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-yellow-400 text-xl animate-pulse">Carregando leads...</p>
          </div>
        ) : view === 'kanban' ? (
          // ─── KANBAN ──────────────────────────────────────────────────────────
          <div className="flex gap-3 p-4 min-w-max">
            {COLUNAS_KANBAN.map(col => {
              const colLeads = leadsPorColuna[col.id] || [];
              return (
                <div key={col.id} className={`w-60 shrink-0 flex flex-col rounded-xl border-t-2 ${col.cor} bg-zinc-900/50`}>
                  <div className="p-3 flex items-center gap-2">
                    <span>{col.icone}</span>
                    <span className="text-white font-bold text-sm flex-1">{col.label}</span>
                    <span className="text-xs font-black text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">{colLeads.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] p-2 flex flex-col gap-2">
                    {colLeads.length === 0 && (
                      <p className="text-zinc-700 text-xs text-center py-8">Vazio</p>
                    )}
                    {colLeads.map(lead => (
                      <CardLead key={lead.id} lead={lead} onClick={() => setLeadSelecionadoId(lead.id)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ─── LISTA ───────────────────────────────────────────────────────────
          <div className="p-4">
            {leadsVisiveis.length === 0 && (
              <div className="text-center py-20 text-zinc-600">
                <p className="text-4xl mb-3">🎯</p>
                <p className="font-bold">Nenhum lead encontrado</p>
                <p className="text-sm mt-1">Crie um novo lead para começar</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {leadsVisiveis.map(lead => {
                const isPerdido = lead.estagio.startsWith('perdido');
                const dias = diasDesde(lead.updated_at);
                return (
                  <button key={lead.id} onClick={() => setLeadSelecionadoId(lead.id)}
                    className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-yellow-400/30 hover:bg-zinc-800/60 transition-all">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-white">{lead.nome}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isPerdido ? 'bg-red-900/40 text-red-400' : lead.estagio === 'fechamento' ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-yellow-400'}`}>
                        {labelEstagio(lead.estagio)}
                      </span>
                      {lead.responsavel_nome && (
                        <span className="text-xs text-zinc-500">👤 {lead.responsavel_nome}</span>
                      )}
                      {lead.valor_estimado && (
                        <span className="text-xs text-green-400 font-bold">{fmtMoeda(lead.valor_estimado)}</span>
                      )}
                      <span className={`ml-auto text-xs font-bold ${dias === 0 ? 'text-green-400' : dias > 5 ? 'text-red-400' : 'text-zinc-500'}`}>
                        {dias === 0 ? 'hoje' : `${dias}d atrás`}
                      </span>
                    </div>
                    {(lead.telefone || lead.produto_interesse) && (
                      <div className="flex gap-3 mt-1 text-xs text-zinc-500">
                        {lead.telefone && <span>{lead.telefone}</span>}
                        {lead.produto_interesse && <span>🎯 {lead.produto_interesse}</span>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modais e painéis */}
      {showModalLead && (
        <ModalLead
          membros={membros}
          isManager={isManager}
          onSalvar={handleCriarLead}
          onFechar={() => setShowModalLead(false)}
        />
      )}

      {editandoLead && (
        <ModalLead
          lead={editandoLead}
          membros={membros}
          isManager={isManager}
          onSalvar={handleEditarLead}
          onFechar={() => setEditandoLead(null)}
        />
      )}

      {leadSelecionadoId && (
        <PainelLead
          leadId={leadSelecionadoId}
          onFechar={() => setLeadSelecionadoId(null)}
          onAtualizar={carregarLeads}
          isManager={isManager}
          membros={membros}
        />
      )}

      {showAnalytics && analytics && (
        <PainelAnalytics analytics={analytics} onFechar={() => setShowAnalytics(false)} />
      )}
    </div>
  );
}
