import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
  closestCorners, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { crmApi, ESTAGIOS_ATIVOS, ESTAGIOS_PERDA } from '../services/crm/crmApi';
import type { Lead } from '../services/crm/crmApi';
import { somClick, somHover } from '../services/hudSounds';
import { toast } from '../services/toast';
import { LeadModal } from '../components/crm/LeadModal';
import { NovoLeadModal } from '../components/crm/NovoLeadModal';
import { WhatsappPanel } from '../components/crm/WhatsappPanel';
import { CrmAnalytics } from '../components/crm/CrmAnalytics';
import { BottomNav } from '../components/BottomNav';

// ─── CARD ARRASTÁVEL ──────────────────────────────────────────────────────────

function SortableLead({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });

  const diasNoEstagio = Math.floor((Date.now() - new Date(lead.updated_at).getTime()) / 86400000);
  const atrasado = diasNoEstagio >= 3;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      onClick={() => { somClick(); onClick(); }}
      onMouseEnter={somHover}
      className="group rounded-xl border bg-zinc-900/90 border-zinc-800 hover:border-zinc-600 p-3 cursor-pointer transition-all select-none touch-none"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-white font-black text-sm leading-tight truncate">{lead.nome}</p>
        {lead.valor_estimado ? (
          <span className="text-green-400 font-black text-xs whitespace-nowrap flex-shrink-0">{fmt(Number(lead.valor_estimado))}</span>
        ) : null}
      </div>
      {lead.produto_interesse && (
        <p className="text-zinc-600 text-[10px] uppercase tracking-wider truncate mb-2">{lead.produto_interesse}</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {lead.responsavel_nome && (
            <span className="text-[9px] text-zinc-600 font-bold truncate max-w-[80px]">{lead.responsavel_nome.split(' ')[0]}</span>
          )}
          {lead.origem && lead.origem !== 'Manual' && (
            <span className="text-[8px] text-zinc-700 border border-zinc-800 px-1 rounded">{lead.origem}</span>
          )}
        </div>
        {atrasado && (
          <span className="text-[8px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
            {diasNoEstagio}d parado
          </span>
        )}
      </div>
    </div>
  );
}

// ─── COLUNA DO KANBAN ─────────────────────────────────────────────────────────

function KanbanColuna({
  estagio, leads, onLeadClick,
}: {
  estagio: typeof ESTAGIOS_ATIVOS[number];
  leads: Lead[];
  onLeadClick: (id: string) => void;
}) {
  const valorTotal = leads.reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-zinc-800/60 bg-zinc-950/60 w-64 flex-shrink-0 max-h-[calc(100vh-180px)]">
      {/* Header da coluna */}
      <div className="px-3 py-3 flex-shrink-0 border-b border-zinc-800/60"
        style={{ background: estagio.cor + '12', borderTopColor: estagio.cor + '40' }}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider" style={{ color: estagio.cor }}>
            {estagio.emoji} {estagio.label}
          </span>
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{leads.length}</span>
        </div>
        {valorTotal > 0 && (
          <p className="text-[10px] font-bold mt-0.5" style={{ color: estagio.cor + 'aa' }}>{fmt(valorTotal)}</p>
        )}
      </div>
      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <SortableLead key={lead.id} lead={lead} onClick={() => onLeadClick(lead.id)} />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="text-center py-6 text-zinc-800 text-xs italic">Sem leads</div>
        )}
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export function CRM() {
  const navigate = useNavigate();
  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);
  const isAdmin = user.role === 'admin';
  const isAdminOrSuporte = isAdmin || user.role === 'suporte';

  const [aba, setAba] = useState<'kanban' | 'lista' | 'tarefas' | 'whatsapp' | 'analytics'>('kanban');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [leadModalId, setLeadModalId] = useState<string | null>(null);
  const [novoLeadModal, setNovoLeadModal] = useState(false);
  const [filtroPerdidos, setFiltroPerdidos] = useState(false);

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const carregarLeads = useCallback(async () => {
    try {
      const data = await crmApi.leads.list();
      setLeads(data);
    } catch { toast.error('Erro ao carregar leads'); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregarLeads(); }, [carregarLeads]);

  // Agrupar leads por estágio
  const leadsPorEstagio = useMemo(() => {
    const filtrado = busca
      ? leads.filter(l =>
          l.nome.toLowerCase().includes(busca.toLowerCase()) ||
          l.produto_interesse?.toLowerCase().includes(busca.toLowerCase()) ||
          l.telefone?.includes(busca) ||
          l.responsavel_nome?.toLowerCase().includes(busca.toLowerCase())
        )
      : leads;

    if (filtroPerdidos) {
      const perdidos = filtrado.filter(l => l.estagio.startsWith('perdido'));
      return { perdidos };
    }

    const mapa: Record<string, Lead[]> = {};
    ESTAGIOS_ATIVOS.forEach(e => { mapa[e.key] = []; });
    filtrado.filter(l => !l.estagio.startsWith('perdido')).forEach(l => {
      if (mapa[l.estagio]) mapa[l.estagio].push(l);
    });
    return mapa;
  }, [leads, busca, filtroPerdidos]);

  const leadAtivo = activeId ? leads.find(l => l.id === activeId) : null;

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over) return;

    const leadId = active.id as string;
    const overId = over.id as string;

    // Verifica se soltou em uma coluna (id de estágio) ou em outro lead
    const novoEstagio = ESTAGIOS_ATIVOS.find(e => e.key === overId)?.key
      ?? leads.find(l => l.id === overId)?.estagio;

    if (!novoEstagio) return;
    const leadAtualEstagio = leads.find(l => l.id === leadId)?.estagio;
    if (leadAtualEstagio === novoEstagio) return;

    // Atualiza otimisticamente
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estagio: novoEstagio, updated_at: new Date().toISOString() } : l));

    try {
      await crmApi.leads.move(leadId, novoEstagio);
    } catch {
      toast.error('Erro ao mover lead');
      carregarLeads();
    }
  }

  // ─── TAREFAS ───────────────────────────────────────────────────────────────

  const [tarefas, setTarefas] = useState<any[]>([]);
  const [tituloTarefa, setTituloTarefa] = useState('');
  const [vencTarefa, setVencTarefa] = useState('');

  useEffect(() => {
    if (aba === 'tarefas') {
      crmApi.tarefas.list().then(setTarefas).catch(() => {});
    }
  }, [aba]);

  async function criarTarefa() {
    if (!tituloTarefa.trim()) return;
    try {
      await crmApi.tarefas.create({ titulo: tituloTarefa, vencimento: vencTarefa || undefined });
      setTituloTarefa(''); setVencTarefa('');
      crmApi.tarefas.list().then(setTarefas);
      toast.success('Tarefa criada');
    } catch { toast.error('Erro ao criar tarefa'); }
  }

  async function concluirTarefa(id: string) {
    try {
      await crmApi.tarefas.complete(id);
      setTarefas(prev => prev.map(t => t.id === id ? { ...t, concluida: true } : t));
    } catch { toast.error('Erro'); }
  }

  async function deletarTarefa(id: string) {
    try {
      await crmApi.tarefas.delete(id);
      setTarefas(prev => prev.filter(t => t.id !== id));
    } catch { toast.error('Erro'); }
  }

  const tarefasHoje = tarefas.filter(t => !t.concluida && t.vencimento && new Date(t.vencimento).toDateString() === new Date().toDateString());
  const tarefasAtrasadas = tarefas.filter(t => !t.concluida && t.vencimento && new Date(t.vencimento) < new Date() && new Date(t.vencimento).toDateString() !== new Date().toDateString());
  const tarefasFuturas = tarefas.filter(t => !t.concluida && (!t.vencimento || new Date(t.vencimento) > new Date()));
  const tarefasConcluidas = tarefas.filter(t => t.concluida);

  // Totais para header
  const totalAtivos = leads.filter(l => !l.estagio.startsWith('perdido')).length;
  const totalFechados = leads.filter(l => l.estagio === 'fechamento').length;
  const valorPipeline = leads.filter(l => !l.estagio.startsWith('perdido')).reduce((s, l) => s + (Number(l.valor_estimado) || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans relative pb-28 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-full px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onMouseEnter={somHover} onClick={() => { somClick(); navigate(-1); }}
              className="text-zinc-500 hover:text-white transition-colors text-lg">←</button>
            <div>
              <h1 className="text-base font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
                🎯 CRM
              </h1>
              <p className="text-zinc-600 text-[10px] font-bold">
                {totalAtivos} ativos · {totalFechados} fechados · {valorPipeline.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(aba === 'kanban' || aba === 'lista') && (
              <div className="relative hidden sm:block">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs pointer-events-none">🔍</span>
                <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
                  className="bg-zinc-900 border border-zinc-700 focus:border-yellow-400/60 text-white rounded-lg pl-7 pr-3 py-1.5 text-xs outline-none w-40 transition-colors" />
              </div>
            )}
            <button onMouseEnter={somHover} onClick={() => { somClick(); setNovoLeadModal(true); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-xs uppercase tracking-widest rounded-lg transition-all">
              + Lead
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex overflow-x-auto scrollbar-hide border-t border-zinc-800/60">
          {([
            { key: 'kanban',    label: '⚡ Kanban'   },
            { key: 'lista',     label: '📋 Lista'    },
            { key: 'tarefas',   label: `✅ Tarefas${tarefasAtrasadas.length > 0 ? ` (${tarefasAtrasadas.length}!)` : ''}` },
            ...(isAdminOrSuporte ? [{ key: 'whatsapp', label: '📱 WhatsApp' }] : []),
            ...(isAdminOrSuporte ? [{ key: 'analytics', label: '📊 Analytics' }] : []),
          ] as const).map(a => (
            <button key={a.key} onClick={() => { somClick(); setAba(a.key as any); }}
              className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap flex-shrink-0 ${
                aba === a.key ? 'border-b-2 border-yellow-400 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}>{a.label}</button>
          ))}
        </div>
      </div>

      {/* ── KANBAN ─────────────────────────────────────────────────────────────── */}
      {aba === 'kanban' && (
        <div className="p-3">
          {/* Busca mobile */}
          <div className="sm:hidden mb-3 relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">🔍</span>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar leads..."
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-400/60 text-white rounded-lg pl-7 pr-3 py-2 text-xs outline-none" />
          </div>

          {/* Toggle perdidos */}
          <div className="flex gap-2 mb-3">
            <button onClick={() => { somClick(); setFiltroPerdidos(false); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!filtroPerdidos ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
              ⚡ Pipeline
            </button>
            <button onClick={() => { somClick(); setFiltroPerdidos(true); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filtroPerdidos ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
              ❌ Perdidos ({leads.filter(l => l.estagio.startsWith('perdido')).length})
            </button>
          </div>

          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-zinc-800 border-t-yellow-400 rounded-full animate-spin" />
            </div>
          ) : filtroPerdidos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(leadsPorEstagio.perdidos || []).map(lead => (
                <div key={lead.id} onClick={() => { somClick(); setLeadModalId(lead.id); }}
                  className="bg-zinc-900 border border-red-900/30 rounded-xl p-3 cursor-pointer hover:border-red-700/50 transition-all">
                  <p className="text-white font-black text-sm">{lead.nome}</p>
                  <p className="text-red-500 text-[10px] font-black uppercase mt-0.5">
                    {ESTAGIOS_PERDA.find(e => e.key === lead.estagio)?.emoji} {ESTAGIOS_PERDA.find(e => e.key === lead.estagio)?.label || lead.estagio}
                  </p>
                  {lead.responsavel_nome && <p className="text-zinc-600 text-[10px] mt-1">{lead.responsavel_nome}</p>}
                </div>
              ))}
              {(leadsPorEstagio.perdidos || []).length === 0 && (
                <div className="col-span-3 text-center py-12 text-zinc-700 italic">Nenhum lead perdido. 🛡️</div>
              )}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                {ESTAGIOS_ATIVOS.map(estagio => (
                  <KanbanColuna
                    key={estagio.key}
                    estagio={estagio}
                    leads={leadsPorEstagio[estagio.key] || []}
                    onLeadClick={id => setLeadModalId(id)}
                  />
                ))}
              </div>
              <DragOverlay>
                {leadAtivo ? (
                  <div className="rounded-xl border-2 border-yellow-400/60 bg-zinc-800 p-3 shadow-2xl w-60 rotate-2 opacity-90">
                    <p className="text-white font-black text-sm truncate">{leadAtivo.nome}</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      )}

      {/* ── LISTA ──────────────────────────────────────────────────────────────── */}
      {aba === 'lista' && (
        <div className="p-4 max-w-4xl mx-auto">
          {/* Busca mobile */}
          <div className="sm:hidden mb-4 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar leads..."
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-400/60 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            {carregando ? (
              <div className="text-center py-12"><div className="w-8 h-8 border-4 border-zinc-800 border-t-yellow-400 rounded-full animate-spin mx-auto" /></div>
            ) : (Object.values(leadsPorEstagio).flat() as Lead[]).length === 0 ? (
              <div className="text-center py-16 text-zinc-700 italic">
                {busca ? 'Nenhum lead encontrado para esta busca.' : 'Nenhum lead cadastrado ainda.'}
              </div>
            ) : (Object.values(leadsPorEstagio).flat() as Lead[]).map(lead => {
              const e = ESTAGIOS_ATIVOS.find(es => es.key === lead.estagio);
              const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              return (
                <div key={lead.id} onClick={() => { somClick(); setLeadModalId(lead.id); }}
                  className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-3 cursor-pointer transition-all">
                  <span className="text-lg flex-shrink-0">{e?.emoji || '🎯'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm truncate">{lead.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded" style={{ color: e?.cor, backgroundColor: (e?.cor || '#71717a') + '15' }}>{e?.label || lead.estagio}</span>
                      {lead.produto_interesse && <span className="text-zinc-600 text-[10px] truncate">{lead.produto_interesse}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {lead.valor_estimado ? <p className="text-green-400 font-black text-sm">{fmt(Number(lead.valor_estimado))}</p> : null}
                    {lead.responsavel_nome && <p className="text-zinc-600 text-[10px]">{lead.responsavel_nome.split(' ')[0]}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAREFAS ────────────────────────────────────────────────────────────── */}
      {aba === 'tarefas' && (
        <div className="p-4 max-w-2xl mx-auto space-y-5">
          {/* Nova tarefa */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">+ Nova Tarefa</p>
            <input value={tituloTarefa} onChange={e => setTituloTarefa(e.target.value)}
              placeholder="Ex: Ligar para João amanhã"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2 text-sm outline-none" />
            <div className="flex gap-2">
              <input type="datetime-local" value={vencTarefa} onChange={e => setVencTarefa(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2 text-sm outline-none [color-scheme:dark]" />
              <button onClick={() => { somClick(); criarTarefa(); }} disabled={!tituloTarefa.trim()}
                className="px-4 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-black rounded-lg text-sm uppercase tracking-widest transition-all">
                + Criar
              </button>
            </div>
          </div>

          {tarefasAtrasadas.length > 0 && (
            <div>
              <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-2">⚠️ Atrasadas ({tarefasAtrasadas.length})</p>
              <TarefaLista tarefas={tarefasAtrasadas} onConcluir={concluirTarefa} onDeletar={deletarTarefa} atrasada />
            </div>
          )}
          {tarefasHoje.length > 0 && (
            <div>
              <p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-2">📅 Hoje ({tarefasHoje.length})</p>
              <TarefaLista tarefas={tarefasHoje} onConcluir={concluirTarefa} onDeletar={deletarTarefa} />
            </div>
          )}
          {tarefasFuturas.length > 0 && (
            <div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">📆 Próximas ({tarefasFuturas.length})</p>
              <TarefaLista tarefas={tarefasFuturas} onConcluir={concluirTarefa} onDeletar={deletarTarefa} />
            </div>
          )}
          {tarefasConcluidas.length > 0 && (
            <details>
              <summary className="text-zinc-700 text-[10px] font-black uppercase tracking-widest cursor-pointer">✓ Concluídas ({tarefasConcluidas.length})</summary>
              <div className="mt-2"><TarefaLista tarefas={tarefasConcluidas} onConcluir={() => {}} onDeletar={deletarTarefa} /></div>
            </details>
          )}
          {tarefas.length === 0 && <p className="text-center text-zinc-700 italic py-8">Nenhuma tarefa pendente. 🎯</p>}
        </div>
      )}

      {/* ── WHATSAPP ───────────────────────────────────────────────────────────── */}
      {aba === 'whatsapp' && isAdminOrSuporte && (
        <div className="p-4 max-w-2xl mx-auto">
          <WhatsappPanel />
        </div>
      )}

      {/* ── ANALYTICS ─────────────────────────────────────────────────────────── */}
      {aba === 'analytics' && isAdminOrSuporte && (
        <div className="p-4 max-w-2xl mx-auto">
          <CrmAnalytics />
        </div>
      )}

      {/* Modais */}
      {leadModalId && (
        <LeadModal
          leadId={leadModalId}
          onClose={() => setLeadModalId(null)}
          onUpdated={carregarLeads}
        />
      )}
      {novoLeadModal && (
        <NovoLeadModal
          onClose={() => setNovoLeadModal(false)}
          onCriado={carregarLeads}
        />
      )}

      <BottomNav activeTab="crm" />
    </div>
  );
}

// ─── COMPONENTE AUXILIAR: LISTA DE TAREFAS ────────────────────────────────────

function TarefaLista({ tarefas, onConcluir, onDeletar, atrasada }: {
  tarefas: any[];
  onConcluir: (id: string) => void;
  onDeletar: (id: string) => void;
  atrasada?: boolean;
}) {
  return (
    <div className="space-y-2">
      {tarefas.map(t => (
        <div key={t.id} className={`flex items-start gap-3 border rounded-xl p-3 transition-all ${t.concluida ? 'opacity-50 border-zinc-800' : atrasada ? 'border-red-800/50 bg-red-950/10' : 'border-zinc-800 bg-zinc-900/60'}`}>
          <button onClick={() => { somClick(); if (!t.concluida) onConcluir(t.id); }}
            className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${t.concluida ? 'bg-green-600 border-green-600' : 'border-zinc-600 hover:border-green-500'}`}>
            {t.concluida && <span className="text-white text-xs">✓</span>}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${t.concluida ? 'line-through text-zinc-600' : 'text-white'}`}>{t.titulo}</p>
            {t.crm_leads?.nome && <p className="text-zinc-600 text-[10px] mt-0.5">Lead: {t.crm_leads.nome}</p>}
            {t.vencimento && (
              <p className={`text-[10px] mt-0.5 ${atrasada ? 'text-red-400 font-black' : 'text-zinc-600'}`}>
                {atrasada ? '⚠️ ' : '📅 '}
                {new Date(t.vencimento).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}
              </p>
            )}
          </div>
          <button onClick={() => { somClick(); onDeletar(t.id); }}
            className="text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0 text-sm mt-0.5">🗑️</button>
        </div>
      ))}
    </div>
  );
}
