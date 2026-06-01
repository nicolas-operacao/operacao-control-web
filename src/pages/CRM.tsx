import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from '../services/toast';
import { somClick, somHover } from '../services/hudSounds';

// ─── TIPOS ────────────────────────────────────────────────────────────────────

type Lead = {
  id: string;
  nome: string;
  empresa?: string;
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
  temperatura?: 'quente' | 'morno' | 'frio';
  prioridade?: 'alta' | 'media' | 'baixa';
  proxima_atividade?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  crm_tarefas?: { id: string; concluida: boolean }[];
};

type Atividade = {
  id: string; lead_id: string; user_id: string; user_nome: string;
  tipo: string; conteudo: string; created_at: string;
};

type Tarefa = {
  id: string; lead_id?: string; user_id: string; user_nome: string;
  titulo: string; descricao?: string; vencimento?: string; concluida: boolean;
  crm_leads?: { nome: string; estagio: string };
};

type Historico = {
  id: string; estagio_anterior?: string; estagio_novo: string;
  user_nome: string; observacao?: string; created_at: string;
};

type Mensagem = {
  id: string; lead_id: string; direcao: 'in' | 'out'; conteudo: string;
  created_at: string; status?: string;
};

type LeadDetalhe = Lead & {
  historico: Historico[]; atividades: Atividade[];
  tarefas: Tarefa[]; mensagens: Mensagem[];
};

type Membro = { id: string; name: string; role?: string };

type Analytics = {
  total: number; ativos: number; fechados: number; perdidos: number;
  semResponsavel?: number; valorPipeline: number; valorFechado: number;
  taxaConversao: number; idadeMediaDias?: number;
  porEstagio: Record<string, number>;
  porOrigem?: Record<string, number>;
  porTemperatura?: { quente: number; morno: number; frio: number };
  porMembro?: Array<{ nome: string; total: number; ativos: number; fechados: number; perdidos: number; valor: number }>;
};

// ─── CONSTANTES ──────────────────────────────────────────────────────────────

const COLUNAS_KANBAN = [
  { id: 'base',         label: 'Entrada',      cor: 'border-zinc-500',   bg: 'bg-zinc-900/40',  icone: '📥', corText: 'text-zinc-400' },
  { id: 'prospeccao',   label: 'Prospecção',   cor: 'border-blue-500',   bg: 'bg-blue-950/20',  icone: '🔍', corText: 'text-blue-400' },
  { id: 'conexao',      label: 'Conexão',      cor: 'border-cyan-500',   bg: 'bg-cyan-950/20',  icone: '📞', corText: 'text-cyan-400' },
  { id: 'qualificacao', label: 'Qualificação', cor: 'border-violet-500', bg: 'bg-violet-950/20',icone: '🎯', corText: 'text-violet-400' },
  { id: 'apresentacao', label: 'Apresentação', cor: 'border-orange-500', bg: 'bg-orange-950/20',icone: '🎤', corText: 'text-orange-400' },
  { id: 'negociacao',   label: 'Negociação',   cor: 'border-yellow-500', bg: 'bg-yellow-950/20',icone: '🤝', corText: 'text-yellow-400' },
  { id: 'followup',     label: 'Follow-up',    cor: 'border-pink-500',   bg: 'bg-pink-950/20',  icone: '🔄', corText: 'text-pink-400' },
  { id: 'fechamento',   label: 'Fechado',      cor: 'border-green-500',  bg: 'bg-green-950/20', icone: '🏆', corText: 'text-green-400' },
  { id: 'perdido',      label: 'Perdido',      cor: 'border-red-700',    bg: 'bg-red-950/20',   icone: '💀', corText: 'text-red-400' },
];

const ESTAGIOS_PERDIDO = ['perdido_sem_interesse','perdido_sem_contato','perdido_concorrente','perdido_preco','perdido_nao_qualificado'];
const ESTAGIOS_ATIVOS = COLUNAS_KANBAN.filter(c => c.id !== 'perdido' && c.id !== 'fechamento').map(c => c.id);

const MOTIVOS_PERDA: Record<string, string> = {
  perdido_sem_interesse: 'Sem interesse', perdido_sem_contato: 'Sem contato',
  perdido_concorrente: 'Concorrência', perdido_preco: 'Preço', perdido_nao_qualificado: 'Não qualificado',
};

const ORIGENS = ['Instagram','Facebook','Indicação','Google','YouTube','TikTok','WhatsApp','Site','Evento','Outro'];
const TIPOS_ATIVIDADE = [
  { id: 'nota',     label: 'Nota',     icone: '📝' },
  { id: 'ligacao',  label: 'Ligação',  icone: '📞' },
  { id: 'email',    label: 'E-mail',   icone: '✉️' },
  { id: 'reuniao',  label: 'Reunião',  icone: '🤝' },
  { id: 'whatsapp', label: 'WhatsApp', icone: '💬' },
  { id: 'outro',    label: 'Outro',    icone: '📌' },
];

const TEMPERATURA_CONFIG = {
  quente: { label: 'Quente', icone: '🔥', cor: 'text-red-400',    bg: 'bg-red-900/30',    border: 'border-red-700/50' },
  morno:  { label: 'Morno',  icone: '🌡️', cor: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-700/40' },
  frio:   { label: 'Frio',   icone: '❄️', cor: 'text-blue-400',   bg: 'bg-blue-900/20',   border: 'border-blue-700/40' },
};

const PRIORIDADE_CONFIG = {
  alta:  { label: 'Alta',  icone: '🔴', cor: 'text-red-400' },
  media: { label: 'Média', icone: '🟡', cor: 'text-yellow-400' },
  baixa: { label: 'Baixa', icone: '🔵', cor: 'text-blue-400' },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const fmtMoeda = (v?: number | null) =>
  v ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) : '—';

const fmtMoedaCompacto = (v: number) =>
  v >= 1000000 ? `R$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`;

const fmtData = (s: string) =>
  new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const fmtDataCurta = (s: string) =>
  new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const diasDesde = (s: string) =>
  Math.floor((Date.now() - new Date(s).getTime()) / 86400000);

const diasAte = (s: string) => {
  const d = new Date(s); d.setHours(0, 0, 0, 0);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - hoje.getTime()) / 86400000);
};

const labelEstagio = (e: string) =>
  COLUNAS_KANBAN.find(c => c.id === e || (c.id === 'perdido' && ESTAGIOS_PERDIDO.includes(e)))?.label ?? e;

const iconeAtividade = (tipo: string) =>
  TIPOS_ATIVIDADE.find(t => t.id === tipo)?.icone ?? '📌';

function proximoEstagio(estagioAtual: string): string | null {
  const idx = ESTAGIOS_ATIVOS.indexOf(estagioAtual);
  if (idx === -1 || idx >= ESTAGIOS_ATIVOS.length - 1) return null;
  return ESTAGIOS_ATIVOS[idx + 1] ?? null;
}

function calcularScore(lead: Lead): number {
  let score = 50;
  if (lead.temperatura === 'quente') score += 30;
  else if (lead.temperatura === 'frio') score -= 20;
  if (lead.prioridade === 'alta') score += 20;
  else if (lead.prioridade === 'baixa') score -= 10;
  const dias = diasDesde(lead.updated_at);
  if (dias === 0) score += 10;
  else if (dias > 14) score -= 20;
  else if (dias > 7) score -= 10;
  if (lead.proxima_atividade) {
    const d = diasAte(lead.proxima_atividade);
    if (d < 0) score -= 15;
    else if (d <= 1) score += 10;
  }
  if (lead.valor_estimado && lead.valor_estimado > 0) score += 5;
  return Math.max(0, Math.min(100, score));
}

function exportarCSVLocal(leads: Lead[]) {
  const header = ['Nome','Empresa','Telefone','Email','Produto','Valor','Estágio','Responsável','Origem','Temperatura','Prioridade','Tags','Criado em'];
  const rows = leads.map(l => [
    l.nome, l.empresa ?? '', l.telefone ?? '', l.email ?? '', l.produto_interesse ?? '',
    l.valor_estimado ?? '', l.estagio, l.responsavel_nome ?? '', l.origem ?? '',
    l.temperatura ?? '', l.prioridade ?? '',
    (l.tags ?? []).join('; '),
    new Date(l.created_at).toLocaleDateString('pt-BR'),
  ]);
  const csv = '﻿' + [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `crm-leads-${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function waMeUrl(tel: string) {
  const num = tel.replace(/\D/g, '');
  const comDDI = num.startsWith('55') ? num : `55${num}`;
  return `https://wa.me/${comDDI}`;
}

// ─── BADGE SCORE ─────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const cor = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1" title={`Score: ${score}/100`}>
      <div className="w-10 h-1 bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[9px] text-zinc-600 font-bold">{score}</span>
    </div>
  );
}

// ─── TAGS CHIPS ──────────────────────────────────────────────────────────────

function TagChips({ tags, max = 99 }: { tags?: string[]; max?: number }) {
  if (!tags || tags.length === 0) return null;
  const visíveis = tags.slice(0, max);
  const resto = tags.length - visíveis.length;
  return (
    <div className="flex flex-wrap gap-1">
      {visíveis.map(t => (
        <span key={t} className="text-[10px] bg-violet-900/30 border border-violet-700/40 text-violet-400 px-1.5 py-0.5 rounded font-medium">
          {t}
        </span>
      ))}
      {resto > 0 && <span className="text-[10px] text-zinc-600">+{resto}</span>}
    </div>
  );
}

// ─── CARD LEAD ────────────────────────────────────────────────────────────────

function CardLead({ lead, onClick, onMoverProximo, dragging, onDragStart, onDragEnd }: {
  lead: Lead; onClick: () => void; onMoverProximo?: () => void;
  dragging: boolean; onDragStart: () => void; onDragEnd: () => void;
}) {
  const dias = diasDesde(lead.updated_at);
  const temp = lead.temperatura ? TEMPERATURA_CONFIG[lead.temperatura] : null;
  const tarefasPendentes = lead.crm_tarefas?.filter(t => !t.concluida).length ?? 0;
  const proxEstagio = proximoEstagio(lead.estagio);
  const score = calcularScore(lead);
  const venceHoje = lead.proxima_atividade ? diasAte(lead.proxima_atividade) <= 0 : false;
  const quente = dias <= 1; const frio = dias > 7;

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart(); }}
      onDragEnd={onDragEnd}
      className={`group relative bg-zinc-900 border border-zinc-700/50 rounded-xl hover:border-yellow-400/40 hover:shadow-[0_0_12px_rgba(250,204,21,0.06)] transition-all cursor-grab active:cursor-grabbing select-none ${dragging ? 'opacity-40 scale-95' : ''}`}
    >
      {lead.prioridade === 'alta' && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-red-500 rounded-full" />
      )}

      <button onClick={() => { somClick(); onClick(); }} className="w-full text-left p-3">
        {/* Header */}
        <div className="flex items-start gap-1.5 mb-1.5">
          <span className="font-bold text-white text-sm leading-tight flex-1 min-w-0 line-clamp-2">{lead.nome}</span>
          <div className="flex items-center gap-1 shrink-0">
            {temp && <span title={temp.label} className="text-xs leading-none">{temp.icone}</span>}
            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${quente ? 'bg-green-500/15 text-green-400' : frio ? 'bg-red-500/15 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}>
              {dias === 0 ? 'hoje' : `${dias}d`}
            </span>
          </div>
        </div>

        {/* Empresa */}
        {lead.empresa && (
          <p className="text-[10px] text-zinc-500 truncate mb-1">{lead.empresa}</p>
        )}

        {/* Produto */}
        {lead.produto_interesse && (
          <p className="text-[11px] text-yellow-400/80 font-semibold truncate mb-1.5">{lead.produto_interesse}</p>
        )}

        {/* Tags */}
        {lead.tags && lead.tags.length > 0 && (
          <div className="mb-1.5">
            <TagChips tags={lead.tags} max={2} />
          </div>
        )}

        {/* Score bar */}
        <div className="mb-1.5">
          <ScoreBadge score={score} />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {lead.valor_estimado ? (
            <span className="text-[11px] text-green-400 font-bold bg-green-900/20 px-1.5 py-0.5 rounded">
              {fmtMoeda(lead.valor_estimado)}
            </span>
          ) : null}
          {tarefasPendentes > 0 && (
            <span className="text-[10px] text-orange-400 bg-orange-900/20 px-1.5 py-0.5 rounded font-bold">
              ✅ {tarefasPendentes}
            </span>
          )}
          {venceHoje && (
            <span className="text-[10px] text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded font-bold animate-pulse">
              ⏰
            </span>
          )}
          {lead.responsavel_nome && (
            <span className="text-[10px] text-zinc-600 ml-auto truncate max-w-[80px]">
              {lead.responsavel_nome.split(' ')[0]}
            </span>
          )}
        </div>
      </button>

      {/* Ações hover */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        {lead.telefone && (
          <a
            href={waMeUrl(lead.telefone)}
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            title="Abrir WhatsApp"
            className="bg-green-700/80 hover:bg-green-600 text-white text-[10px] font-black px-2 py-1 rounded-md"
          >
            WA
          </a>
        )}
        {proxEstagio && onMoverProximo && (
          <button
            onClick={e => { e.stopPropagation(); somClick(); onMoverProximo(); }}
            onMouseEnter={somHover}
            title={`→ ${labelEstagio(proxEstagio)}`}
            className="bg-zinc-700 hover:bg-yellow-400 hover:text-black text-zinc-400 text-[10px] font-black px-2 py-1 rounded-md"
          >
            → {labelEstagio(proxEstagio)}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MODAL CRIAR/EDITAR LEAD ──────────────────────────────────────────────────

function ModalLead({ lead, membros, isManager, userId, onSalvar, onFechar }: {
  lead?: Lead | null; membros: Membro[]; isManager: boolean; userId: string;
  onSalvar: (data: Partial<Lead>) => Promise<void>; onFechar: () => void;
}) {
  const [nome, setNome]           = useState(lead?.nome ?? '');
  const [empresa, setEmpresa]     = useState(lead?.empresa ?? '');
  const [telefone, setTelefone]   = useState(lead?.telefone ?? '');
  const [email, setEmail]         = useState(lead?.email ?? '');
  const [produto, setProduto]     = useState(lead?.produto_interesse ?? '');
  const [valor, setValor]         = useState(lead?.valor_estimado ? String(lead.valor_estimado) : '');
  const [origem, setOrigem]       = useState(lead?.origem ?? '');
  const [obs, setObs]             = useState(lead?.observacoes ?? '');
  const [temperatura, setTemperatura] = useState<string>(lead?.temperatura ?? 'morno');
  const [prioridade, setPrioridade]   = useState<string>(lead?.prioridade ?? 'media');
  const [proximaAtividade, setProximaAtividade] = useState(lead?.proxima_atividade ?? '');
  const [tagsInput, setTagsInput] = useState((lead?.tags ?? []).join(', '));
  const [responsavelId, setResponsavelId] = useState(lead?.responsavel_id ?? '');
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return toast.error('Nome é obrigatório');
    setSalvando(true);
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const membro = membros.find(m => String(m.id) === responsavelId);
      await onSalvar({
        nome: nome.trim(),
        empresa: empresa.trim() || undefined,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        produto_interesse: produto.trim() || undefined,
        valor_estimado: valor ? parseFloat(valor.replace(',', '.')) : undefined,
        origem: origem || undefined,
        observacoes: obs.trim() || undefined,
        temperatura: temperatura as Lead['temperatura'],
        prioridade: prioridade as Lead['prioridade'],
        proxima_atividade: proximaAtividade || undefined,
        tags: tags.length ? tags : undefined,
        responsavel_id: responsavelId || undefined,
        responsavel_nome: membro?.name,
      });
    } finally { setSalvando(false); }
  }

  const inputCls = "w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-yellow-400 outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onFechar}>
      <form onClick={e => e.stopPropagation()} onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-yellow-400 font-black text-lg">{lead ? '✏️ Editar Lead' : '➕ Novo Lead'}</h2>
          <button type="button" onClick={onFechar} className="text-zinc-500 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Nome */}
          <div>
            <label className="text-xs text-zinc-400 font-bold mb-1.5 block">Nome *</label>
            <input value={nome} onChange={e => setNome(e.target.value)} required autoFocus className={inputCls} placeholder="Nome do lead" />
          </div>

          {/* Empresa */}
          <div>
            <label className="text-xs text-zinc-400 font-bold mb-1.5 block">🏢 Empresa</label>
            <input value={empresa} onChange={e => setEmpresa(e.target.value)} className={inputCls} placeholder="Nome da empresa (opcional)" />
          </div>

          {/* Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-bold mb-1.5 block">📞 Telefone</label>
              <input value={telefone} onChange={e => setTelefone(e.target.value)} className={inputCls} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-bold mb-1.5 block">✉️ E-mail</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" className={inputCls} placeholder="email@exemplo.com" />
            </div>
          </div>

          {/* Produto + Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-bold mb-1.5 block">🎯 Produto / Interesse</label>
              <input value={produto} onChange={e => setProduto(e.target.value)} className={inputCls} placeholder="Ex: Mentoria Premium" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-bold mb-1.5 block">💰 Valor Estimado (R$)</label>
              <input value={valor} onChange={e => setValor(e.target.value)} type="number" min="0" step="0.01" className={inputCls} placeholder="0,00" />
            </div>
          </div>

          {/* Origem + Próxima atividade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-bold mb-1.5 block">📡 Origem</label>
              <select value={origem} onChange={e => setOrigem(e.target.value)} className={inputCls}>
                <option value="">Selecione...</option>
                {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-bold mb-1.5 block">⏰ Próximo Contato</label>
              <input value={proximaAtividade} onChange={e => setProximaAtividade(e.target.value)} type="date" className={inputCls} />
            </div>
          </div>

          {/* Temperatura + Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-bold mb-1.5 block">Temperatura</label>
              <div className="flex gap-2">
                {(Object.entries(TEMPERATURA_CONFIG) as [string, typeof TEMPERATURA_CONFIG['quente']][]).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setTemperatura(k)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${temperatura === k ? `${v.bg} ${v.border} ${v.cor}` : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                    {v.icone}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-bold mb-1.5 block">Prioridade</label>
              <div className="flex gap-2">
                {(Object.entries(PRIORIDADE_CONFIG) as [string, typeof PRIORIDADE_CONFIG['alta']][]).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setPrioridade(k)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${prioridade === k ? `bg-zinc-700 border-zinc-500 ${v.cor}` : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                    {v.icone}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-zinc-400 font-bold mb-1.5 block">🏷️ Tags <span className="font-normal text-zinc-600">(separadas por vírgula)</span></label>
            <input value={tagsInput} onChange={e => setTagsInput(e.target.value)} className={inputCls} placeholder="Ex: vip, urgente, parceiro" />
          </div>

          {/* Responsável (manager only) */}
          {isManager && (
            <div>
              <label className="text-xs text-zinc-400 font-bold mb-1.5 block">👤 Responsável</label>
              <select value={responsavelId} onChange={e => setResponsavelId(e.target.value)} className={inputCls}>
                <option value="">⚡ Auto-distribuir</option>
                {membros.map(m => <option key={m.id} value={m.id}>{m.name}{m.role ? ` (${m.role})` : ''}</option>)}
              </select>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="text-xs text-zinc-400 font-bold mb-1.5 block">📋 Observações</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3}
              className="w-full bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-yellow-400 outline-none resize-none transition-colors"
              placeholder="Informações relevantes sobre o lead..." />
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button type="button" onClick={onFechar}
            className="flex-1 py-3 rounded-xl border border-zinc-600 text-zinc-400 text-sm font-bold hover:bg-zinc-800 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={salvando}
            className="flex-1 py-3 rounded-xl bg-yellow-400 text-black font-black text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50">
            {salvando ? 'Salvando...' : lead ? 'Salvar Alterações' : 'Criar Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── PAINEL DETALHE DO LEAD ───────────────────────────────────────────────────

function PainelLead({ leadId, onFechar, onAtualizar, onDeletar, isManager, membros }: {
  leadId: string; onFechar: () => void; onAtualizar: () => void;
  onDeletar: (id: string) => void; isManager: boolean; membros: Membro[];
}) {
  const [lead, setLead] = useState<LeadDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<'atividades' | 'tarefas' | 'historico' | 'whatsapp'>('atividades');
  const [editando, setEditando] = useState(false);

  // Atividade
  const [novaAtv, setNovaAtv] = useState(''); const [tipoAtv, setTipoAtv] = useState('nota'); const [salvandoAtv, setSalvandoAtv] = useState(false);
  // Tarefa
  const [novaTarefa, setNovaTarefa] = useState(''); const [vencTarefa, setVencTarefa] = useState(''); const [salvandoTarefa, setSalvandoTarefa] = useState(false);
  // Mover
  const [novoEstagio, setNovoEstagio] = useState(''); const [motivoPerda, setMotivoPerda] = useState(''); const [obsMove, setObsMove] = useState(''); const [showMove, setShowMove] = useState(false); const [movendo, setMovendo] = useState(false);
  // Atribuir
  const [novoResponsavel, setNovoResponsavel] = useState(''); const [atribuindo, setAtribuindo] = useState(false);
  // Confirmar deletar
  const [confirmDeletar, setConfirmDeletar] = useState(false);
  // WhatsApp send
  const [msgWA, setMsgWA] = useState(''); const [enviandoWA, setEnviandoWA] = useState(false);

  const carregarLead = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/crm/leads/${leadId}`);
      setLead(data); setNovoEstagio(data.estagio);
    } catch { toast.error('Erro ao carregar lead'); }
    finally { setLoading(false); }
  }, [leadId]);

  useEffect(() => { carregarLead(); }, [carregarLead]);

  // Fechar com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onFechar]);

  async function salvarEdicao(dados: Partial<Lead>) {
    try {
      await api.put(`/crm/leads/${leadId}`, dados);
      toast.success('Lead atualizado!'); setEditando(false); carregarLead(); onAtualizar();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
  }

  async function handleMover() {
    if (!novoEstagio) return;
    if (novoEstagio.startsWith('perdido') && !motivoPerda) return toast.error('Selecione o motivo da perda');
    setMovendo(true);
    try {
      await api.patch(`/crm/leads/${leadId}/move`, {
        estagio: novoEstagio,
        observacao: obsMove,
        motivo_perda: novoEstagio.startsWith('perdido') ? motivoPerda : undefined,
      });
      toast.success('Lead movido!'); setShowMove(false); setObsMove(''); setMotivoPerda(''); onAtualizar(); carregarLead();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro ao mover'); }
    finally { setMovendo(false); }
  }

  async function handleAtribuir() {
    const membro = membros.find(m => String(m.id) === novoResponsavel);
    if (!membro) return;
    setAtribuindo(true);
    try {
      await api.patch(`/crm/leads/${leadId}/atribuir`, { vendedor_id: membro.id, vendedor_nome: membro.name });
      toast.success(`Lead atribuído para ${membro.name}`); setNovoResponsavel(''); onAtualizar(); carregarLead();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
    finally { setAtribuindo(false); }
  }

  async function handleAtividade(e: React.FormEvent) {
    e.preventDefault(); if (!novaAtv.trim()) return;
    setSalvandoAtv(true);
    try {
      await api.post(`/crm/leads/${leadId}/atividades`, { tipo: tipoAtv, conteudo: novaAtv.trim() });
      setNovaAtv(''); carregarLead();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
    finally { setSalvandoAtv(false); }
  }

  async function handleTarefa(e: React.FormEvent) {
    e.preventDefault(); if (!novaTarefa.trim()) return;
    setSalvandoTarefa(true);
    try {
      await api.post('/crm/tarefas', { lead_id: leadId, titulo: novaTarefa.trim(), vencimento: vencTarefa || undefined });
      setNovaTarefa(''); setVencTarefa(''); carregarLead();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
    finally { setSalvandoTarefa(false); }
  }

  async function handleCompletarTarefa(id: string) {
    try { await api.patch(`/crm/tarefas/${id}/done`); carregarLead(); }
    catch { toast.error('Erro'); }
  }

  async function handleDeletarTarefa(id: string) {
    try { await api.delete(`/crm/tarefas/${id}`); carregarLead(); toast.success('Tarefa removida'); }
    catch { toast.error('Erro ao remover tarefa'); }
  }

  async function handleDeletar() {
    try {
      await api.delete(`/crm/leads/${leadId}`);
      toast.success('Lead deletado'); onDeletar(leadId); onFechar();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
  }

  async function handleEnviarWA(e: React.FormEvent) {
    e.preventDefault();
    if (!msgWA.trim() || !lead?.telefone) return;
    setEnviandoWA(true);
    try {
      await api.post('/crm/whatsapp/send', {
        to: lead.telefone,
        message: msgWA.trim(),
        lead_id: leadId,
      });
      toast.success('Mensagem enviada!'); setMsgWA(''); carregarLead();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao enviar. Configure uma conta WhatsApp primeiro.');
    }
    finally { setEnviandoWA(false); }
  }

  if (loading) return (
    <div className="fixed inset-0 z-40 flex" onClick={onFechar}>
      <div className="ml-auto w-full max-w-lg h-full bg-zinc-950 border-l border-zinc-800 flex items-center justify-center">
        <div className="text-yellow-400 animate-pulse text-2xl">⟳</div>
      </div>
    </div>
  );
  if (!lead) return null;

  if (editando) return (
    <div className="fixed inset-0 z-50">
      <ModalLead lead={lead} membros={membros} isManager={isManager} userId=""
        onSalvar={async (dados) => { await salvarEdicao(dados); }}
        onFechar={() => setEditando(false)} />
    </div>
  );

  const isPerdido = lead.estagio.startsWith('perdido');
  const isFechado = lead.estagio === 'fechamento';
  const temp = lead.temperatura ? TEMPERATURA_CONFIG[lead.temperatura] : null;
  const prio = lead.prioridade ? PRIORIDADE_CONFIG[lead.prioridade] : null;
  const proxAtiv = lead.proxima_atividade;
  const diasProx = proxAtiv ? diasAte(proxAtiv) : null;
  const tarefasVencidas = lead.tarefas.filter(t => !t.concluida && t.vencimento && new Date(t.vencimento) < new Date());
  const tarefasPendentes = lead.tarefas.filter(t => !t.concluida);
  const score = calcularScore(lead);

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onFechar}>
      <div className="ml-auto w-full max-w-lg h-full bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className={`p-4 border-b border-zinc-800 shrink-0 ${isPerdido ? 'bg-red-950/10' : isFechado ? 'bg-green-950/10' : ''}`}>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${isPerdido ? 'bg-red-900/40 text-red-400' : isFechado ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-yellow-400'}`}>
                  {labelEstagio(lead.estagio)}
                </span>
                {temp && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${temp.bg} ${temp.border} ${temp.cor}`}>
                    {temp.icone} {temp.label}
                  </span>
                )}
                {prio && prio.label !== 'Média' && (
                  <span className={`text-[11px] font-bold ${prio.cor}`}>{prio.icone} {prio.label}</span>
                )}
              </div>
              <h2 className="text-white font-black text-xl leading-tight">{lead.nome}</h2>
              {lead.empresa && <p className="text-zinc-400 text-xs mt-0.5">🏢 {lead.empresa}</p>}
              {lead.responsavel_nome && <p className="text-zinc-500 text-xs mt-0.5">👤 {lead.responsavel_nome}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => setEditando(true)} title="Editar"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors text-sm">
                ✏️
              </button>
              {isManager && (
                <button onClick={() => setConfirmDeletar(true)} title="Deletar"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-red-900/40 text-zinc-400 hover:text-red-400 transition-colors text-sm">
                  🗑️
                </button>
              )}
              <button onClick={onFechar}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors text-lg font-bold">
                ✕
              </button>
            </div>
          </div>

          {/* Stats rápidos */}
          <div className="flex gap-3 mt-3 text-xs flex-wrap items-center">
            <span className="text-zinc-500">📅 {fmtDataCurta(lead.created_at)}</span>
            <span className="text-zinc-500">🔄 {diasDesde(lead.updated_at)}d</span>
            {lead.valor_estimado && <span className="text-green-400 font-bold">{fmtMoeda(lead.valor_estimado)}</span>}
            {proxAtiv && (
              <span className={`font-bold ${diasProx !== null && diasProx < 0 ? 'text-red-400' : diasProx === 0 ? 'text-orange-400' : 'text-blue-400'}`}>
                ⏰ {diasProx !== null && diasProx < 0 ? `${Math.abs(diasProx)}d atrasado` : diasProx === 0 ? 'hoje' : `em ${diasProx}d`}
              </span>
            )}
            <ScoreBadge score={score} />
          </div>

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div className="mt-2">
              <TagChips tags={lead.tags} />
            </div>
          )}
        </div>

        {/* ── Info do lead ── */}
        <div className="p-4 border-b border-zinc-800 shrink-0 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {lead.telefone && (
            <div className="flex items-center gap-2">
              <a href={`tel:${lead.telefone}`} className="flex items-center gap-1 text-white hover:text-yellow-400 transition-colors group">
                <span className="text-zinc-500">📞</span>
                <span className="text-sm group-hover:underline">{lead.telefone}</span>
              </a>
              <a href={waMeUrl(lead.telefone)} target="_blank" rel="noreferrer"
                className="text-[10px] bg-green-700/30 hover:bg-green-700/60 text-green-400 px-1.5 py-0.5 rounded font-bold transition-colors">
                WA
              </a>
            </div>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-white hover:text-yellow-400 transition-colors group truncate">
              <span className="text-zinc-500">✉️</span>
              <span className="text-xs truncate group-hover:underline">{lead.email}</span>
            </a>
          )}
          {lead.produto_interesse && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">🎯</span>
              <span className="text-yellow-400 text-sm font-medium">{lead.produto_interesse}</span>
            </div>
          )}
          {lead.origem && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">📡</span>
              <span className="text-zinc-300">{lead.origem}</span>
            </div>
          )}
          {lead.observacoes && (
            <div className="col-span-2 bg-zinc-900 rounded-xl p-3 text-zinc-400 text-xs mt-1 border border-zinc-800 leading-relaxed">
              {lead.observacoes}
            </div>
          )}
        </div>

        {/* ── Alertas ── */}
        {tarefasVencidas.length > 0 && (
          <div className="mx-4 mt-3 shrink-0 bg-red-900/20 border border-red-700/40 rounded-xl px-3 py-2 text-red-400 text-xs font-bold">
            ⚠️ {tarefasVencidas.length} tarefa(s) vencida(s)
          </div>
        )}

        {/* ── Ações: Mover + Atribuir ── */}
        <div className="p-4 border-b border-zinc-800 flex flex-col gap-2 shrink-0">
          <button onClick={() => setShowMove(v => !v)}
            className="w-full py-2.5 rounded-xl border border-zinc-600 text-zinc-300 text-sm font-bold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
            {showMove ? '✕ Fechar' : '↪️ Mover Estágio'}
          </button>

          {showMove && (
            <div className="flex flex-col gap-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
              <select value={novoEstagio} onChange={e => { setNovoEstagio(e.target.value); setMotivoPerda(''); }}
                className="bg-zinc-800 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
                {COLUNAS_KANBAN.filter(c => c.id !== 'perdido').map(c => (
                  <option key={c.id} value={c.id}>{c.icone} {c.label}</option>
                ))}
                {ESTAGIOS_PERDIDO.map(e => (
                  <option key={e} value={e}>💀 {MOTIVOS_PERDA[e]}</option>
                ))}
              </select>
              {novoEstagio.startsWith('perdido') && (
                <select value={motivoPerda} onChange={e => setMotivoPerda(e.target.value)}
                  className="bg-zinc-800 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
                  <option value="">Motivo da perda...</option>
                  {ESTAGIOS_PERDIDO.map(e => <option key={e} value={e}>{MOTIVOS_PERDA[e]}</option>)}
                </select>
              )}
              <input value={obsMove} onChange={e => setObsMove(e.target.value)}
                className="bg-zinc-800 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none"
                placeholder="Observação (opcional)" />
              <button onClick={handleMover} disabled={movendo}
                className="py-2.5 rounded-xl bg-yellow-400 text-black font-black text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50">
                {movendo ? 'Movendo...' : '✓ Confirmar'}
              </button>
            </div>
          )}

          {isManager && (
            <div className="flex gap-2">
              <select value={novoResponsavel} onChange={e => setNovoResponsavel(e.target.value)}
                className="flex-1 bg-zinc-800 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
                <option value="">👤 Atribuir responsável...</option>
                {membros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button onClick={handleAtribuir} disabled={atribuindo || !novoResponsavel}
                className="px-4 rounded-xl bg-zinc-700 text-white text-sm font-bold hover:bg-zinc-600 transition-colors disabled:opacity-50">
                {atribuindo ? '...' : 'Atribuir'}
              </button>
            </div>
          )}
        </div>

        {/* ── Abas ── */}
        <div className="flex border-b border-zinc-800 bg-zinc-950 shrink-0 overflow-x-auto">
          {([
            { id: 'atividades', label: '📝', title: 'Notas',    count: lead.atividades.length },
            { id: 'tarefas',    label: '✅', title: 'Tarefas',  count: tarefasPendentes.length },
            { id: 'historico',  label: '📋', title: 'Histórico',count: lead.historico.length },
            { id: 'whatsapp',   label: '💬', title: 'WhatsApp', count: lead.mensagens.length },
          ] as const).map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`flex-1 py-3 text-xs font-bold transition-colors relative whitespace-nowrap px-2 ${aba === a.id ? 'text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {a.label} {a.title}
              {a.count > 0 && <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${aba === a.id ? 'bg-yellow-400/20 text-yellow-400' : 'bg-zinc-800 text-zinc-500'}`}>{a.count}</span>}
              {aba === a.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400 rounded-full" />}
            </button>
          ))}
        </div>

        {/* ── Conteúdo ── */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

          {/* ATIVIDADES */}
          {aba === 'atividades' && (
            <>
              <form onSubmit={handleAtividade} className="flex flex-col gap-2">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {TIPOS_ATIVIDADE.map(t => (
                    <button key={t.id} type="button" onClick={() => setTipoAtv(t.id)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${tipoAtv === t.id ? 'bg-yellow-400/20 border-yellow-400/40 text-yellow-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
                      <span>{t.icone}</span> {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea value={novaAtv} onChange={e => setNovaAtv(e.target.value)} rows={2}
                    className="flex-1 bg-zinc-800 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none resize-none"
                    placeholder="Registrar atividade..." />
                  <button type="submit" disabled={salvandoAtv || !novaAtv.trim()}
                    className="px-3 rounded-xl bg-zinc-700 text-white text-sm font-bold hover:bg-zinc-600 transition-colors disabled:opacity-50 self-end py-2">
                    {salvandoAtv ? '...' : '▶'}
                  </button>
                </div>
              </form>
              <div className="flex flex-col gap-2">
                {lead.atividades.length === 0 && (
                  <div className="text-center py-8 text-zinc-600">
                    <div className="text-3xl mb-2">📝</div>
                    <p className="text-sm">Sem atividades registradas</p>
                  </div>
                )}
                {lead.atividades.map(atv => (
                  <div key={atv.id} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">{iconeAtividade(atv.tipo)}</span>
                      <span className="text-xs font-bold text-yellow-400 capitalize">{atv.tipo}</span>
                      <span className="text-xs text-zinc-500">{atv.user_nome}</span>
                      <span className="text-xs text-zinc-600 ml-auto">{fmtData(atv.created_at)}</span>
                    </div>
                    <p className="text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed">{atv.conteudo}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* TAREFAS */}
          {aba === 'tarefas' && (
            <>
              <form onSubmit={handleTarefa} className="flex flex-col gap-2">
                <input value={novaTarefa} onChange={e => setNovaTarefa(e.target.value)}
                  className="bg-zinc-800 border border-zinc-600 rounded-xl px-4 py-2.5 text-white text-sm focus:border-yellow-400 outline-none"
                  placeholder="Título da tarefa..." />
                <div className="flex gap-2">
                  <input value={vencTarefa} onChange={e => setVencTarefa(e.target.value)} type="date"
                    className="flex-1 bg-zinc-800 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none" />
                  <button type="submit" disabled={salvandoTarefa || !novaTarefa.trim()}
                    className="px-4 py-2 rounded-xl bg-zinc-700 text-white text-sm font-bold hover:bg-zinc-600 transition-colors disabled:opacity-50">
                    {salvandoTarefa ? '...' : '+ Adicionar'}
                  </button>
                </div>
              </form>
              <div className="flex flex-col gap-2">
                {lead.tarefas.length === 0 && (
                  <div className="text-center py-8 text-zinc-600">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-sm">Sem tarefas</p>
                  </div>
                )}
                {lead.tarefas.map(t => {
                  const vencida = !t.concluida && t.vencimento && new Date(t.vencimento) < new Date();
                  return (
                    <div key={t.id} className={`flex items-start gap-3 p-3 rounded-xl border group ${t.concluida ? 'border-zinc-800 opacity-40' : vencida ? 'border-red-700/40 bg-red-950/10' : 'border-zinc-700 bg-zinc-900'}`}>
                      <button onClick={() => !t.concluida && handleCompletarTarefa(t.id)}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${t.concluida ? 'border-green-500 bg-green-500/20' : vencida ? 'border-red-500 hover:border-red-400' : 'border-zinc-500 hover:border-yellow-400'}`}>
                        {t.concluida && <span className="text-green-400 text-xs font-black">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug ${t.concluida ? 'line-through text-zinc-500' : vencida ? 'text-red-300' : 'text-white'}`}>{t.titulo}</p>
                        {t.vencimento && (
                          <p className={`text-xs mt-0.5 ${vencida ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>
                            {vencida ? '⚠️ ' : '⏰ '} Vence: {new Date(t.vencimento).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <button onClick={() => handleDeletarTarefa(t.id)}
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-all text-xs shrink-0">
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* HISTÓRICO */}
          {aba === 'historico' && (
            <div className="flex flex-col gap-1">
              {lead.historico.length === 0 && (
                <div className="text-center py-8 text-zinc-600">
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-sm">Sem histórico</p>
                </div>
              )}
              {lead.historico.map((h, i) => (
                <div key={h.id} className="flex gap-3 items-start py-2">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 mt-1 shrink-0" />
                    {i < lead.historico.length - 1 && <div className="w-0.5 flex-1 bg-zinc-800 mt-1" style={{ minHeight: '24px' }} />}
                  </div>
                  <div className="flex-1 pb-1">
                    <p className="text-zinc-300 text-sm">
                      {h.estagio_anterior
                        ? <><span className="text-zinc-500">{labelEstagio(h.estagio_anterior)}</span> → <span className="text-yellow-400 font-bold">{labelEstagio(h.estagio_novo)}</span></>
                        : <span className="text-yellow-400 font-bold">{labelEstagio(h.estagio_novo)}</span>
                      }
                    </p>
                    {h.observacao && <p className="text-zinc-500 text-xs mt-0.5 italic">"{h.observacao}"</p>}
                    <p className="text-zinc-600 text-xs mt-0.5">{h.user_nome} · {fmtData(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* WHATSAPP */}
          {aba === 'whatsapp' && (
            <div className="flex flex-col gap-3 h-full">
              {/* wa.me button */}
              {lead.telefone && (
                <a href={waMeUrl(lead.telefone)} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-700/20 border border-green-700/40 text-green-400 text-sm font-bold hover:bg-green-700/30 transition-colors">
                  💬 Abrir WhatsApp ({lead.telefone})
                </a>
              )}

              {/* Mensagens */}
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                {lead.mensagens.length === 0 && (
                  <div className="text-center py-8 text-zinc-600">
                    <div className="text-3xl mb-2">💬</div>
                    <p className="text-sm">Sem mensagens registradas</p>
                    <p className="text-xs mt-1 text-zinc-700">As mensagens trocadas via WhatsApp aparecerão aqui</p>
                  </div>
                )}
                {lead.mensagens.map(msg => (
                  <div key={msg.id} className={`max-w-[85%] ${msg.direcao === 'out' ? 'ml-auto' : 'mr-auto'}`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm ${msg.direcao === 'out' ? 'bg-green-700/30 text-green-100 rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'}`}>
                      {msg.conteudo}
                    </div>
                    <p className={`text-[10px] text-zinc-600 mt-0.5 ${msg.direcao === 'out' ? 'text-right' : ''}`}>
                      {fmtData(msg.created_at)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Enviar mensagem via API */}
              {lead.telefone && (
                <form onSubmit={handleEnviarWA} className="flex gap-2 pt-2 border-t border-zinc-800">
                  <input value={msgWA} onChange={e => setMsgWA(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-600 rounded-xl px-3 py-2 text-white text-sm focus:border-green-500 outline-none"
                    placeholder="Enviar via WhatsApp integrado..." />
                  <button type="submit" disabled={enviandoWA || !msgWA.trim()}
                    className="px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-600 transition-colors disabled:opacity-50">
                    {enviandoWA ? '...' : '▶'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal confirmação deletar */}
      {confirmDeletar && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmDeletar(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-80 mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-black text-lg mb-2">🗑️ Deletar Lead</h3>
            <p className="text-zinc-400 text-sm mb-4">Tem certeza que deseja deletar <strong className="text-white">{lead.nome}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeletar(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-600 text-zinc-400 font-bold text-sm hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button onClick={handleDeletar} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-black text-sm hover:bg-red-500 transition-colors">Deletar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAINEL ANALYTICS ─────────────────────────────────────────────────────────

function PainelAnalytics({ analytics, onFechar }: { analytics: Analytics; onFechar: () => void }) {
  const maxEstagio = Math.max(...Object.values(analytics.porEstagio), 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={onFechar}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h2 className="text-yellow-400 font-black text-xl">📊 Analytics do CRM</h2>
          <button onClick={onFechar} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total',    valor: analytics.total,    cor: 'text-white',    bg: 'bg-zinc-800' },
              { label: 'Ativos',   valor: analytics.ativos,   cor: 'text-blue-400',  bg: 'bg-blue-950/30' },
              { label: 'Fechados', valor: analytics.fechados, cor: 'text-green-400', bg: 'bg-green-950/30' },
              { label: 'Perdidos', valor: analytics.perdidos, cor: 'text-red-400',   bg: 'bg-red-950/30' },
            ].map(c => (
              <div key={c.label} className={`${c.bg} rounded-xl p-4 text-center`}>
                <p className={`text-3xl font-black ${c.cor}`}>{c.valor}</p>
                <p className="text-xs text-zinc-500 font-bold mt-1 uppercase tracking-wider">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Pipeline + Conversão */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Pipeline</p>
              <p className="text-xl font-black text-yellow-400">{fmtMoeda(analytics.valorPipeline)}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Fechado</p>
              <p className="text-xl font-black text-green-400">{fmtMoeda(analytics.valorFechado)}</p>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Conversão</p>
              <p className="text-xl font-black text-white">{analytics.taxaConversao}%</p>
              <div className="mt-2 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(analytics.taxaConversao, 100)}%` }} />
              </div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Idade Média</p>
              <p className="text-xl font-black text-white">{analytics.idadeMediaDias ?? 0} dias</p>
            </div>
          </div>

          {/* Alerta sem responsável */}
          {!!analytics.semResponsavel && analytics.semResponsavel > 0 && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-red-400 font-bold text-sm">{analytics.semResponsavel} lead(s) sem responsável</p>
                <p className="text-red-400/60 text-xs">Use o botão "Distribuir" para atribuí-los automaticamente</p>
              </div>
            </div>
          )}

          {/* Funil visual */}
          <div>
            <h3 className="text-zinc-400 font-bold text-sm mb-3 uppercase tracking-wider">Funil de Vendas</h3>
            <div className="flex flex-col gap-1.5">
              {COLUNAS_KANBAN.filter(c => c.id !== 'perdido').map(col => {
                const count = analytics.porEstagio[col.id] ?? 0;
                const pct = (count / maxEstagio) * 100;
                return (
                  <div key={col.id} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 w-24 shrink-0 text-right">{col.label}</span>
                    <div className="flex-1 h-5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${col.cor.replace('border-', 'bg-')}`}
                        style={{ width: `${pct}%`, opacity: 0.7 }} />
                    </div>
                    <span className={`text-xs font-bold w-8 ${col.corText}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Temperatura */}
          {analytics.porTemperatura && (
            <div>
              <h3 className="text-zinc-400 font-bold text-sm mb-3 uppercase tracking-wider">Temperatura dos Leads</h3>
              <div className="grid grid-cols-3 gap-3">
                {(Object.entries(TEMPERATURA_CONFIG) as [string, typeof TEMPERATURA_CONFIG['quente']][]).map(([k, v]) => (
                  <div key={k} className={`${v.bg} border ${v.border} rounded-xl p-3 text-center`}>
                    <p className="text-2xl">{v.icone}</p>
                    <p className={`text-xl font-black mt-1 ${v.cor}`}>{analytics.porTemperatura?.[k as keyof typeof analytics.porTemperatura] ?? 0}</p>
                    <p className="text-xs text-zinc-500">{v.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Por origem */}
          {analytics.porOrigem && Object.keys(analytics.porOrigem).length > 0 && (
            <div>
              <h3 className="text-zinc-400 font-bold text-sm mb-3 uppercase tracking-wider">Por Origem</h3>
              <div className="flex flex-col gap-2">
                {Object.entries(analytics.porOrigem).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([orig, count]) => {
                  const pct = analytics.total > 0 ? (count / analytics.total) * 100 : 0;
                  return (
                    <div key={orig} className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400 w-24 shrink-0 text-right truncate">{orig}</span>
                      <div className="flex-1 h-4 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-zinc-400 font-bold w-8">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Por membro */}
          {analytics.porMembro && analytics.porMembro.length > 0 && (
            <div>
              <h3 className="text-zinc-400 font-bold text-sm mb-3 uppercase tracking-wider">Ranking por Membro</h3>
              <div className="flex flex-col gap-2">
                {analytics.porMembro.map((m, i) => (
                  <div key={m.nome} className="bg-zinc-800 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-zinc-300' : i === 2 ? 'text-orange-400' : 'text-zinc-500'}`}>
                          {i + 1}°
                        </span>
                        <span className="text-white font-bold text-sm">{m.nome}</span>
                      </div>
                      <span className="text-zinc-400 text-xs">{m.total} leads</span>
                    </div>
                    <div className="flex gap-3 text-xs mb-2 flex-wrap">
                      <span className="text-blue-400">⚡ {m.ativos} ativos</span>
                      <span className="text-green-400">✅ {m.fechados} fechados</span>
                      <span className="text-red-400">❌ {m.perdidos} perdidos</span>
                      {m.valor > 0 && <span className="text-yellow-400 font-bold ml-auto">{fmtMoeda(m.valor)}</span>}
                    </div>
                    {m.total > 0 && (
                      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
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
    </div>
  );
}

// ─── VIEW DE TAREFAS ──────────────────────────────────────────────────────────

function ViewTarefas({ isManager, onAbrirLead }: {
  isManager: boolean; onAbrirLead: (id: string) => void;
}) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    try {
      const params = isManager ? { all: 'true' } : {};
      const { data } = await api.get('/crm/tarefas', { params });
      setTarefas(data);
    } catch { toast.error('Erro ao carregar tarefas'); }
    finally { setLoading(false); }
  }, [isManager]);

  useEffect(() => { carregar(); }, [carregar]);

  async function completar(id: string) {
    try { await api.patch(`/crm/tarefas/${id}/done`); carregar(); }
    catch { toast.error('Erro'); }
  }

  async function deletar(id: string) {
    try { await api.delete(`/crm/tarefas/${id}`); carregar(); toast.success('Tarefa removida'); }
    catch { toast.error('Erro'); }
  }

  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje); amanha.setDate(amanha.getDate() + 1);
  const semana = new Date(hoje); semana.setDate(semana.getDate() + 7);

  const vencidas = tarefas.filter(t => t.vencimento && new Date(t.vencimento) < hoje);
  const hojeArr  = tarefas.filter(t => t.vencimento && new Date(t.vencimento) >= hoje && new Date(t.vencimento) < amanha);
  const futuras  = tarefas.filter(t => t.vencimento && new Date(t.vencimento) >= amanha && new Date(t.vencimento) <= semana);
  const semData  = tarefas.filter(t => !t.vencimento);

  if (loading) return <div className="flex items-center justify-center h-64 text-yellow-400 animate-pulse">Carregando tarefas...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 flex flex-col gap-5">
      {tarefas.length === 0 && (
        <div className="text-center py-20 text-zinc-600">
          <div className="text-5xl mb-3">✅</div>
          <p className="font-bold text-lg">Nenhuma tarefa pendente</p>
          <p className="text-sm mt-1">Você está em dia!</p>
        </div>
      )}
      {vencidas.length > 0 && (
        <div>
          <h3 className="text-red-400 font-black text-sm mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" /> ⚠️ VENCIDAS ({vencidas.length})
          </h3>
          <TarefaLista tarefas={vencidas} onCompletar={completar} onDeletar={deletar} onAbrirLead={onAbrirLead} vencida />
        </div>
      )}
      {hojeArr.length > 0 && (
        <div>
          <h3 className="text-orange-400 font-black text-sm mb-2">⏰ HOJE ({hojeArr.length})</h3>
          <TarefaLista tarefas={hojeArr} onCompletar={completar} onDeletar={deletar} onAbrirLead={onAbrirLead} />
        </div>
      )}
      {futuras.length > 0 && (
        <div>
          <h3 className="text-blue-400 font-black text-sm mb-2">📅 ESTA SEMANA ({futuras.length})</h3>
          <TarefaLista tarefas={futuras} onCompletar={completar} onDeletar={deletar} onAbrirLead={onAbrirLead} />
        </div>
      )}
      {semData.length > 0 && (
        <div>
          <h3 className="text-zinc-500 font-black text-sm mb-2">📌 SEM DATA ({semData.length})</h3>
          <TarefaLista tarefas={semData} onCompletar={completar} onDeletar={deletar} onAbrirLead={onAbrirLead} />
        </div>
      )}
    </div>
  );
}

function TarefaLista({ tarefas, onCompletar, onDeletar, onAbrirLead, vencida }: {
  tarefas: Tarefa[]; onCompletar: (id: string) => void; onDeletar: (id: string) => void;
  onAbrirLead: (id: string) => void; vencida?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      {tarefas.map(t => (
        <div key={t.id} className={`flex items-start gap-3 p-3.5 rounded-xl border group ${vencida ? 'border-red-700/40 bg-red-950/10' : 'border-zinc-700 bg-zinc-900'}`}>
          <button onClick={() => onCompletar(t.id)}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${vencida ? 'border-red-500 hover:border-red-400 hover:bg-red-900/20' : 'border-zinc-500 hover:border-yellow-400'}`}>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium leading-snug">{t.titulo}</p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {t.vencimento && (
                <span className={`text-xs ${vencida ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>
                  {vencida ? '⚠️ ' : '⏰ '}{new Date(t.vencimento).toLocaleDateString('pt-BR')}
                </span>
              )}
              {t.crm_leads && (
                <button onClick={() => t.lead_id && onAbrirLead(t.lead_id)}
                  className="text-xs text-yellow-400/70 hover:text-yellow-400 transition-colors underline">
                  {t.crm_leads.nome}
                </button>
              )}
              {t.user_nome && <span className="text-xs text-zinc-600">{t.user_nome}</span>}
            </div>
          </div>
          <button onClick={() => onDeletar(t.id)}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-zinc-600 hover:text-red-400 hover:bg-red-900/20 transition-all text-xs shrink-0">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export function Crm() {
  const navigate = useNavigate();
  const userStr  = localStorage.getItem('user');
  const user = useMemo(() => userStr ? JSON.parse(userStr) : { id: '', name: '', role: 'vendedor' }, [userStr]);
  const isManager = ['admin', 'suporte'].includes(user.role);

  // ─ Estado global ─
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  // ─ Filtros ─
  const [busca, setBusca]                         = useState('');
  const [filtroEstagio, setFiltroEstagio]         = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [filtroOrigem, setFiltroOrigem]           = useState('');
  const [filtroTemperatura, setFiltroTemperatura] = useState('');
  const [filtroPrioridade, setFiltroPrioridade]   = useState('');
  const [ordenar, setOrdenar]                     = useState('updated_at');
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState(false);

  // ─ UI ─
  const [view, setView]             = useState<'kanban' | 'lista' | 'tarefas'>('kanban');
  const [leadSelecionadoId, setLeadSelecionadoId] = useState<string | null>(null);
  const [showModalLead, setShowModalLead]         = useState(false);
  const [showAnalytics, setShowAnalytics]         = useState(false);
  const [distribuindo, setDistribuindo]           = useState(false);

  // ─ Drag & Drop ─
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // ─ Auto-refresh ─
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const carregarLeads = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filtroEstagio)     params.estagio       = filtroEstagio;
      if (filtroResponsavel) params.responsavel_id = filtroResponsavel;
      if (busca)             params.busca          = busca;
      if (filtroOrigem)      params.origem         = filtroOrigem;
      if (filtroTemperatura) params.temperatura    = filtroTemperatura;
      if (filtroPrioridade)  params.prioridade     = filtroPrioridade;
      params.ordenar = ordenar;
      const { data } = await api.get('/crm/leads', { params });
      setLeads(data);
    } catch { toast.error('Erro ao carregar leads'); }
    finally { setLoading(false); }
  }, [filtroEstagio, filtroResponsavel, busca, filtroOrigem, filtroTemperatura, filtroPrioridade, ordenar]);

  const carregarAnalytics = useCallback(async () => {
    try { const { data } = await api.get('/crm/analytics'); setAnalytics(data); } catch { /* silencioso */ }
  }, []);

  const carregarMembros = useCallback(async () => {
    if (!isManager) return;
    try { const { data } = await api.get('/crm/membros'); setMembros(data); } catch { /* silencioso */ }
  }, [isManager]);

  useEffect(() => {
    carregarLeads(); carregarAnalytics(); carregarMembros();
    pollingRef.current = setInterval(() => { carregarLeads(); carregarAnalytics(); }, 30000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [carregarLeads, carregarAnalytics, carregarMembros]);

  useEffect(() => {
    const t = setTimeout(carregarLeads, 400);
    return () => clearTimeout(t);
  }, [busca, carregarLeads]);

  async function handleCriarLead(data: Partial<Lead>) {
    try {
      await api.post('/crm/leads', data);
      toast.success('Lead criado!'); setShowModalLead(false); carregarLeads(); carregarAnalytics();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
  }

  async function handleDeletar(id: string) {
    setLeads(prev => prev.filter(l => l.id !== id)); carregarAnalytics();
  }

  async function handleQuickMove(lead: Lead) {
    const prox = proximoEstagio(lead.estagio);
    if (!prox) return;
    try {
      await api.patch(`/crm/leads/${lead.id}/move`, { estagio: prox, observacao: 'Movido via quick-move' });
      toast.success(`→ ${labelEstagio(prox)}`); carregarLeads();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
  }

  async function handleDragDrop(leadId: string, destColId: string) {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const estagioAtual = ESTAGIOS_PERDIDO.includes(lead.estagio) ? 'perdido' : lead.estagio;
    if (estagioAtual === destColId) return;

    const novoEstagio = destColId === 'perdido' ? 'perdido_sem_interesse' : destColId;

    // Atualização otimista
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estagio: novoEstagio } : l));

    try {
      await api.patch(`/crm/leads/${leadId}/move`, {
        estagio: novoEstagio,
        observacao: 'Movido via drag & drop',
        motivo_perda: destColId === 'perdido' ? 'perdido_sem_interesse' : undefined,
      });
      if (destColId === 'perdido') toast.success('Lead marcado como perdido. Abra para definir o motivo.');
      else toast.success(`→ ${labelEstagio(novoEstagio)}`);
      carregarLeads(); carregarAnalytics();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Erro ao mover'); carregarLeads();
    }
  }

  async function handleAutoDistribuir() {
    setDistribuindo(true);
    try {
      const { data } = await api.post('/crm/leads/distribuir');
      toast.success(`⚡ ${data.distribuidos} leads distribuídos!`); carregarLeads();
    } catch (e: any) { toast.error(e.response?.data?.error || 'Erro'); }
    finally { setDistribuindo(false); }
  }

  function limparTodosFiltros() {
    setBusca(''); setFiltroEstagio(''); setFiltroResponsavel('');
    setFiltroOrigem(''); setFiltroTemperatura(''); setFiltroPrioridade('');
    setShowFiltrosAvancados(false);
  }

  // ─ Computados ─
  const leadsPorColuna = useMemo(() => {
    const g: Record<string, Lead[]> = {};
    COLUNAS_KANBAN.forEach(c => { g[c.id] = []; });
    leads.forEach(lead => {
      const col = ESTAGIOS_PERDIDO.includes(lead.estagio) ? 'perdido' : lead.estagio;
      if (g[col]) g[col].push(lead);
    });
    return g;
  }, [leads]);

  const valorPorColuna = useMemo(() => {
    const v: Record<string, number> = {};
    COLUNAS_KANBAN.forEach(c => { v[c.id] = 0; });
    leads.forEach(lead => {
      const col = ESTAGIOS_PERDIDO.includes(lead.estagio) ? 'perdido' : lead.estagio;
      if (col in v) v[col] += Number(lead.valor_estimado) || 0;
    });
    return v;
  }, [leads]);

  const alertasProxAtiv = useMemo(() => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return leads.filter(l =>
      l.proxima_atividade && new Date(l.proxima_atividade) < hoje
    ).length;
  }, [leads]);

  const filtrosAtivos = [filtroEstagio, filtroResponsavel, filtroOrigem, filtroTemperatura, filtroPrioridade, busca].filter(Boolean).length;

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* ── TOP BAR ── */}
      <div className="shrink-0 bg-zinc-950/98 backdrop-blur border-b border-zinc-800">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-zinc-500 hover:text-white transition-colors text-sm shrink-0">←</button>
          <h1 className="text-yellow-400 font-black text-lg shrink-0">🎯 CRM</h1>

          {analytics && (
            <div className="hidden lg:flex items-center gap-4 text-xs border-l border-zinc-800 pl-4 ml-1">
              <span className="text-zinc-400">Pipeline <span className="text-yellow-400 font-bold">{fmtMoeda(analytics.valorPipeline)}</span></span>
              <span className="text-zinc-400">Fechado <span className="text-green-400 font-bold">{fmtMoeda(analytics.valorFechado)}</span></span>
              <span className="text-zinc-400">Conv. <span className="text-white font-bold">{analytics.taxaConversao}%</span></span>
              <span className="text-zinc-400">Ativos <span className="text-blue-400 font-bold">{analytics.ativos}</span></span>
            </div>
          )}

          <div className="flex-1" />

          {/* Ações */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Views toggle */}
            <div className="flex bg-zinc-900 rounded-xl border border-zinc-800 p-0.5">
              {([
                { id: 'kanban',  label: '⊞', title: 'Kanban' },
                { id: 'lista',   label: '≡', title: 'Lista' },
                {
                  id: 'tarefas', title: 'Tarefas',
                  label: alertasProxAtiv > 0
                    ? <span className="relative"><span>✅</span><span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">{alertasProxAtiv > 9 ? '9+' : alertasProxAtiv}</span></span>
                    : '✅',
                },
              ] as { id: 'kanban' | 'lista' | 'tarefas'; label: React.ReactNode; title: string }[]).map(v => (
                <button key={v.id} onClick={() => setView(v.id)} title={v.title}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${view === v.id ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  {v.label}
                </button>
              ))}
            </div>

            <button onClick={() => { somClick(); setShowAnalytics(true); carregarAnalytics(); }}
              className="px-3 py-1.5 rounded-xl border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-zinc-800 transition-colors" title="Analytics">
              📊
            </button>
            <button onClick={() => exportarCSVLocal(leads)} title="Exportar CSV"
              className="px-3 py-1.5 rounded-xl border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-zinc-800 transition-colors">
              ⬇️
            </button>
            {isManager && (
              <button onClick={() => { somClick(); handleAutoDistribuir(); }} disabled={distribuindo}
                className="px-3 py-1.5 rounded-xl border border-zinc-600 text-zinc-300 text-xs font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50">
                {distribuindo ? '...' : '⚡ Distribuir'}
              </button>
            )}
            <button onClick={() => { somClick(); setShowModalLead(true); }}
              className="px-4 py-1.5 rounded-xl bg-yellow-400 text-black text-xs font-black hover:bg-yellow-300 transition-colors">
              + Novo Lead
            </button>
          </div>
        </div>

        {/* ─ Filtros ─ */}
        <div className="px-4 pb-3 flex gap-2 flex-wrap items-center">
          {/* Busca */}
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar nome, telefone, email, empresa..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-9 pr-8 py-2 text-white text-sm focus:border-yellow-400 outline-none transition-colors" />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">✕</button>
            )}
          </div>

          <select value={filtroEstagio} onChange={e => setFiltroEstagio(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none transition-colors">
            <option value="">Todos estágios</option>
            {COLUNAS_KANBAN.map(c => <option key={c.id} value={c.id}>{c.icone} {c.label}</option>)}
          </select>

          {isManager && membros.length > 0 && (
            <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none transition-colors">
              <option value="">Todos membros</option>
              {membros.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}

          <button onClick={() => setShowFiltrosAvancados(v => !v)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${showFiltrosAvancados || filtrosAtivos > 0 ? 'border-yellow-400/40 bg-yellow-400/10 text-yellow-400' : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}>
            ⚙️ {filtrosAtivos > 0 && <span className="ml-1 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">{filtrosAtivos}</span>}
          </button>

          {filtrosAtivos > 0 && (
            <button onClick={limparTodosFiltros}
              className="px-3 py-2 rounded-xl border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-zinc-800 hover:text-white transition-colors">
              ✕ Limpar tudo
            </button>
          )}

          <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none transition-colors">
            <option value="updated_at">↕ Atividade</option>
            <option value="created_at">↕ Criação</option>
            <option value="valor_estimado">↕ Valor</option>
            <option value="nome">↕ Nome A-Z</option>
          </select>
        </div>

        {/* Filtros avançados */}
        {showFiltrosAvancados && (
          <div className="px-4 pb-3 flex gap-2 flex-wrap border-t border-zinc-800 pt-3">
            <select value={filtroTemperatura} onChange={e => setFiltroTemperatura(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
              <option value="">Toda temperatura</option>
              <option value="quente">🔥 Quente</option>
              <option value="morno">🌡️ Morno</option>
              <option value="frio">❄️ Frio</option>
            </select>
            <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
              <option value="">Toda prioridade</option>
              <option value="alta">🔴 Alta</option>
              <option value="media">🟡 Média</option>
              <option value="baixa">🔵 Baixa</option>
            </select>
            <select value={filtroOrigem} onChange={e => setFiltroOrigem(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white text-sm focus:border-yellow-400 outline-none">
              <option value="">Toda origem</option>
              {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── CONTEÚDO ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-yellow-400 text-4xl mb-3 animate-pulse">🎯</div>
              <p className="text-zinc-500 text-sm">Carregando leads...</p>
            </div>
          </div>
        ) : view === 'tarefas' ? (
          <ViewTarefas isManager={isManager} onAbrirLead={id => { setLeadSelecionadoId(id); setView('kanban'); }} />
        ) : view === 'kanban' ? (
          // ─── KANBAN ──────────────────────────────────────────────────────────
          <div className="flex gap-3 p-4 h-full" style={{ minWidth: 'max-content' }}>
            {COLUNAS_KANBAN.map(col => {
              const colLeads = leadsPorColuna[col.id] || [];
              const totalVal = valorPorColuna[col.id] || 0;
              const isDragTarget = dragOverCol === col.id && draggingId !== null;

              return (
                <div
                  key={col.id}
                  onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(col.id); }}
                  onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null); }}
                  onDrop={e => { e.preventDefault(); if (draggingId) { handleDragDrop(draggingId, col.id); } setDragOverCol(null); }}
                  className={`w-[240px] shrink-0 flex flex-col rounded-2xl border-t-2 ${col.cor} ${col.bg} overflow-hidden transition-all ${isDragTarget ? 'ring-2 ring-yellow-400/40 ring-offset-1 ring-offset-zinc-950 scale-[1.01]' : ''}`}
                >
                  {/* Header coluna */}
                  <div className="p-3 border-b border-zinc-800/60 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{col.icone}</span>
                      <span className={`font-bold text-sm flex-1 ${col.corText}`}>{col.label}</span>
                      <span className="text-xs font-black text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-full">{colLeads.length}</span>
                    </div>
                    {totalVal > 0 && (
                      <p className="text-xs text-green-400/70 font-bold mt-1 pl-7">{fmtMoedaCompacto(totalVal)}</p>
                    )}
                  </div>

                  {/* Zona drop + cards */}
                  <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                    {isDragTarget && (
                      <div className="border-2 border-dashed border-yellow-400/40 rounded-xl h-16 flex items-center justify-center">
                        <span className="text-yellow-400/60 text-xs font-bold">Soltar aqui</span>
                      </div>
                    )}
                    {colLeads.length === 0 && !isDragTarget && (
                      <div className="text-zinc-700 text-xs text-center py-10 italic">Vazio</div>
                    )}
                    {colLeads.map(lead => (
                      <CardLead
                        key={lead.id}
                        lead={lead}
                        onClick={() => setLeadSelecionadoId(lead.id)}
                        onMoverProximo={() => handleQuickMove(lead)}
                        dragging={draggingId === lead.id}
                        onDragStart={() => setDraggingId(lead.id)}
                        onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ─── LISTA ───────────────────────────────────────────────────────────
          <div className="max-w-4xl mx-auto p-4">
            {leads.length === 0 && (
              <div className="text-center py-24 text-zinc-600">
                <div className="text-5xl mb-3">🎯</div>
                <p className="font-bold text-lg">Nenhum lead encontrado</p>
                <p className="text-sm mt-1">Ajuste os filtros ou crie um novo lead</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {leads.map(lead => {
                const isPerdido = lead.estagio.startsWith('perdido');
                const dias = diasDesde(lead.updated_at);
                const temp = lead.temperatura ? TEMPERATURA_CONFIG[lead.temperatura] : null;
                const tarefasPendentesLead = lead.crm_tarefas?.filter(t => !t.concluida).length ?? 0;
                const score = calcularScore(lead);
                return (
                  <button key={lead.id} onClick={() => setLeadSelecionadoId(lead.id)}
                    className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-yellow-400/30 hover:bg-zinc-800/60 transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-white text-base">{lead.nome}</span>
                          {lead.empresa && <span className="text-xs text-zinc-500">🏢 {lead.empresa}</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isPerdido ? 'bg-red-900/40 text-red-400' : lead.estagio === 'fechamento' ? 'bg-green-900/40 text-green-400' : 'bg-zinc-800 text-zinc-300'}`}>
                            {labelEstagio(lead.estagio)}
                          </span>
                          {temp && <span className="text-sm">{temp.icone}</span>}
                          {lead.responsavel_nome && <span className="text-xs text-zinc-500">👤 {lead.responsavel_nome}</span>}
                          {lead.valor_estimado && <span className="text-sm text-green-400 font-bold">{fmtMoeda(lead.valor_estimado)}</span>}
                          {tarefasPendentesLead > 0 && <span className="text-xs text-orange-400 bg-orange-900/20 px-2 py-0.5 rounded-full font-bold">✅ {tarefasPendentesLead}</span>}
                          <span className={`ml-auto text-xs font-bold ${dias === 0 ? 'text-green-400' : dias > 7 ? 'text-red-400' : 'text-zinc-500'}`}>
                            {dias === 0 ? 'hoje' : `${dias}d`}
                          </span>
                        </div>
                        {(lead.telefone || lead.produto_interesse || lead.origem) && (
                          <div className="flex gap-3 text-xs text-zinc-500 flex-wrap mb-1">
                            {lead.telefone && <span>📞 {lead.telefone}</span>}
                            {lead.produto_interesse && <span>🎯 {lead.produto_interesse}</span>}
                            {lead.origem && <span>📡 {lead.origem}</span>}
                          </div>
                        )}
                        {lead.tags && lead.tags.length > 0 && (
                          <TagChips tags={lead.tags} max={4} />
                        )}
                      </div>
                      <ScoreBadge score={score} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAIS E PAINÉIS ── */}
      {showModalLead && (
        <ModalLead membros={membros} isManager={isManager} userId={user.id}
          onSalvar={handleCriarLead} onFechar={() => setShowModalLead(false)} />
      )}

      {leadSelecionadoId && (
        <PainelLead
          leadId={leadSelecionadoId}
          onFechar={() => setLeadSelecionadoId(null)}
          onAtualizar={carregarLeads}
          onDeletar={handleDeletar}
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
