import { useState, useEffect, useRef } from 'react';
import { crmApi, ESTAGIOS_ATIVOS, ESTAGIOS_PERDA } from '../../services/crm/crmApi';
import type { LeadDetalhe, WaMensagem } from '../../services/crm/crmApi';
import { somClick, somHover } from '../../services/hudSounds';
import { toast } from '../../services/toast';

interface Props {
  leadId: string;
  onClose: () => void;
  onUpdated: () => void;
}

const ORIGENS = ['Manual', 'Instagram', 'Facebook', 'WhatsApp', 'Indicação', 'Site', 'Google Ads', 'Outro'];
const TIPOS_ATIVIDADE = [
  { key: 'nota',     label: '📝 Nota',      },
  { key: 'ligacao',  label: '📞 Ligação',   },
  { key: 'whatsapp', label: '📲 WhatsApp',  },
  { key: 'email',    label: '📧 E-mail',    },
  { key: 'reuniao',  label: '🎥 Reunião',   },
];

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function LeadModal({ leadId, onClose, onUpdated }: Props) {
  const [lead, setLead] = useState<LeadDetalhe | null>(null);
  const [aba, setAba] = useState<'info' | 'atividades' | 'tarefas' | 'historico' | 'whatsapp'>('info');
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [movendo, setMovendo] = useState(false);
  const [mostrarPerda, setMostrarPerda] = useState(false);

  // Form edição
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', produto_interesse: '', valor_estimado: '', origem: '', observacoes: '', responsavel_nome: '' });

  // Nova atividade
  const [tipoAtv, setTipoAtv] = useState('nota');
  const [conteudoAtv, setConteudoAtv] = useState('');
  const [enviandoAtv, setEnviandoAtv] = useState(false);

  // Nova tarefa
  const [tituloTarefa, setTituloTarefa] = useState('');
  const [vencimentoTarefa, setVencimentoTarefa] = useState('');

  // Atribuição (admin/suporte)
  const [vendedores, setVendedores] = useState<{ id: string; name: string }[]>([]);
  const [vendedorSelecionado, setVendedorSelecionado] = useState('');
  const [atribuindo, setAtribuindo] = useState(false);

  // WA contas
  const [waContas, setWaContas] = useState<any[]>([]);
  const [waContaSelecionada, setWaContaSelecionada] = useState('');
  const [waMensagem, setWaMensagem] = useState('');
  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [enviandoWa, setEnviandoWa] = useState(false);

  // WA chat
  const [waMensagens, setWaMensagens] = useState<WaMensagem[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';
  const isAdminOrSuporte = isAdmin || user.role === 'suporte';

  useEffect(() => {
    if (isAdminOrSuporte) {
      crmApi.vendedores.list().then(setVendedores).catch(() => {});
    }
  }, [isAdminOrSuporte]);

  async function atribuirLead() {
    const v = vendedores.find(x => String(x.id) === vendedorSelecionado);
    if (!v) return;
    setAtribuindo(true);
    try {
      await crmApi.leads.atribuir(leadId, String(v.id), v.name);
      setVendedorSelecionado('');
      carregarLead();
      onUpdated();
      toast.success(`Lead atribuído para ${v.name}`);
    } catch (e: any) { toast.error(e.message || 'Erro ao atribuir'); }
    finally { setAtribuindo(false); }
  }

  useEffect(() => {
    carregarLead();
    crmApi.whatsapp.contas().then(c => {
      setWaContas(c);
      const online = c.find((x: any) => x.status === 'open' || x.status === 'connected');
      if (online) setWaContaSelecionada(online.instance_name);
    }).catch(() => {});
    crmApi.whatsapp.templates().then(setWaTemplates).catch(() => {});
  }, [leadId]);

  // Carrega mensagens + abre stream SSE em tempo real quando a aba chat está aberta
  useEffect(() => {
    if (aba !== 'whatsapp') return;

    const scrollBottom = () => setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    // Carga inicial
    crmApi.whatsapp.mensagens(leadId).then(m => { setWaMensagens(m); scrollBottom(); }).catch(() => {});

    // Stream SSE — recebe cada nova mensagem instantaneamente
    const token = localStorage.getItem('token') || '';
    const es = new EventSource(
      `https://operacao-control-production.up.railway.app/crm/whatsapp/stream/${leadId}?token=${encodeURIComponent(token)}`
    );

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setWaMensagens(prev => {
          // evita duplicar se já estiver na lista
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        scrollBottom();
      } catch {}
    };

    es.onerror = () => es.close();

    return () => es.close();
  }, [aba, leadId]);

  async function carregarLead() {
    try {
      const data = await crmApi.leads.get(leadId);
      setLead(data);
      setForm({
        nome: data.nome || '',
        telefone: data.telefone || '',
        email: data.email || '',
        produto_interesse: data.produto_interesse || '',
        valor_estimado: data.valor_estimado ? String(data.valor_estimado) : '',
        origem: data.origem || 'Manual',
        observacoes: data.observacoes || '',
        responsavel_nome: data.responsavel_nome || '',
      });
    } catch { toast.error('Erro ao carregar lead'); }
  }

  async function salvarEdicao() {
    if (!form.nome.trim()) return toast.error('Nome é obrigatório');
    setSalvando(true);
    try {
      await crmApi.leads.update(leadId, { ...form, valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : 0 });
      setEditando(false);
      carregarLead();
      onUpdated();
      toast.success('Lead atualizado');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSalvando(false); }
  }

  async function moverLead(novoEstagio: string, motivo?: string) {
    setMovendo(true);
    try {
      await crmApi.leads.move(leadId, novoEstagio, '', motivo);
      setMostrarPerda(false);
      carregarLead();
      onUpdated();
    } catch { toast.error('Erro ao mover lead'); }
    finally { setMovendo(false); }
  }

  async function enviarAtividade() {
    if (!conteudoAtv.trim()) return;
    setEnviandoAtv(true);
    try {
      await crmApi.leads.addAtividade(leadId, tipoAtv, conteudoAtv);
      setConteudoAtv('');
      carregarLead();
    } catch { toast.error('Erro ao registrar atividade'); }
    finally { setEnviandoAtv(false); }
  }

  async function criarTarefa() {
    if (!tituloTarefa.trim()) return;
    try {
      await crmApi.tarefas.create({ lead_id: leadId, titulo: tituloTarefa, vencimento: vencimentoTarefa || undefined });
      setTituloTarefa(''); setVencimentoTarefa('');
      carregarLead();
      toast.success('Tarefa criada');
    } catch { toast.error('Erro ao criar tarefa'); }
  }

  async function concluirTarefa(id: string) {
    try { await crmApi.tarefas.complete(id); carregarLead(); } catch { toast.error('Erro'); }
  }

  async function enviarWhatsApp() {
    if (!lead?.telefone || !waMensagem.trim() || !waContaSelecionada) return;
    const conta = waContas.find(c => c.instance_name === waContaSelecionada);
    setEnviandoWa(true);
    try {
      await crmApi.whatsapp.enviar({
        instanceName: waContaSelecionada,
        telefone: lead.telefone,
        mensagem: waMensagem,
        lead_id: leadId,
        conta_id: conta?.id,
        conta_nome: conta?.nome,
      });
      setWaMensagem('');
      carregarLead();
      crmApi.whatsapp.mensagens(leadId).then(m => {
        setWaMensagens(m);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }).catch(() => {});
      toast.success('Mensagem enviada!');
    } catch (e: any) { toast.error(e.message || 'Erro ao enviar'); }
    finally { setEnviandoWa(false); }
  }

  const estagioInfo = ESTAGIOS_ATIVOS.find(e => e.key === lead?.estagio);
  const isPerdido = lead?.estagio.startsWith('perdido');

  if (!lead) return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-zinc-800 border-t-yellow-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-zinc-800 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" title={estagioInfo?.label || lead.estagio}>
                {isPerdido ? '❌' : (estagioInfo?.emoji || '🎯')}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border"
                style={{ color: estagioInfo?.cor || '#71717a', borderColor: (estagioInfo?.cor || '#71717a') + '40', backgroundColor: (estagioInfo?.cor || '#71717a') + '10' }}>
                {estagioInfo?.label || lead.estagio.replace(/_/g,' ')}
              </span>
            </div>
            <h2 className="text-white font-black text-xl mt-1 truncate">{lead.nome}</h2>
            {lead.valor_estimado ? (
              <span className="text-green-400 font-black">{fmt(Number(lead.valor_estimado))}</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdmin && (
              <button
                onMouseEnter={somHover}
                onClick={async () => {
                  somClick();
                  if (!confirm(`Excluir permanentemente o lead "${lead.nome}"? Esta ação não pode ser desfeita.`)) return;
                  try {
                    await crmApi.leads.delete(leadId);
                    toast.success('Lead excluído');
                    onUpdated();
                    onClose();
                  } catch (e: any) { toast.error(e.response?.data?.error || e.message || 'Erro ao excluir'); }
                }}
                className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-500 hover:text-red-300 text-xs font-black rounded-lg border border-red-900/40 transition-all uppercase tracking-widest"
                title="Excluir lead"
              >
                🗑 Excluir
              </button>
            )}
            <button onClick={() => { somClick(); onClose(); }} className="text-zinc-500 hover:text-white transition-colors text-2xl">&times;</button>
          </div>
        </div>

        {/* Pipeline rápido */}
        {!isPerdido && (
          <div className="px-4 py-2 border-b border-zinc-800/60 flex gap-1 overflow-x-auto flex-shrink-0 scrollbar-hide">
            {ESTAGIOS_ATIVOS.map(e => (
              <button
                key={e.key}
                onMouseEnter={somHover}
                onClick={() => { somClick(); if (e.key !== lead.estagio) moverLead(e.key); }}
                disabled={movendo}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex-shrink-0 whitespace-nowrap ${
                  e.key === lead.estagio
                    ? 'text-black'
                    : 'bg-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                }`}
                style={e.key === lead.estagio ? { background: e.cor, color: '#000' } : {}}
              >
                {e.emoji} {e.label}
              </button>
            ))}
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); setMostrarPerda(v => !v); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-red-950/40 text-red-500 hover:bg-red-900/60 transition-all flex-shrink-0"
            >❌ Perda</button>
          </div>
        )}

        {/* Modal de perda */}
        {mostrarPerda && (
          <div className="px-4 py-3 border-b border-red-900/40 bg-red-950/20 flex-shrink-0">
            <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-2">Motivo da perda:</p>
            <div className="flex flex-wrap gap-2">
              {ESTAGIOS_PERDA.map(p => (
                <button key={p.key} onClick={() => { somClick(); moverLead(p.key, p.label); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 border border-red-800/50 hover:bg-red-900 text-red-300 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all">
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Abas */}
        <div className="flex border-b border-zinc-800 flex-shrink-0 overflow-x-auto scrollbar-hide">
          {([
            { key: 'info',       label: '📋 Info'       },
            { key: 'whatsapp',   label: '💬 Chat'       },
            { key: 'atividades', label: '📌 Atividades' },
            { key: 'tarefas',    label: '✅ Tarefas'    },
            { key: 'historico',  label: '🕒 Histórico'  },
          ] as const).map(a => (
            <button
              key={a.key}
              onClick={() => { somClick(); setAba(a.key); }}
              className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                aba === a.key ? 'border-b-2 border-yellow-400 text-yellow-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >{a.label}</button>
          ))}
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── INFO ─────────────────────────────────────────────────────────── */}
          {aba === 'info' && (
            <div>
              {editando ? (
                <div className="space-y-3">
                  {[
                    { label: 'Nome', key: 'nome', type: 'text' },
                    { label: 'Telefone', key: 'telefone', type: 'text' },
                    { label: 'E-mail', key: 'email', type: 'email' },
                    { label: 'Produto de interesse', key: 'produto_interesse', type: 'text' },
                    { label: 'Valor estimado (R$)', key: 'valor_estimado', type: 'number' },
                    { label: 'Responsável', key: 'responsavel_nome', type: 'text' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">{f.label}</label>
                      <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Origem</label>
                    <select value={form.origem} onChange={e => setForm(v => ({ ...v, origem: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2 text-sm outline-none">
                      {ORIGENS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Observações</label>
                    <textarea value={form.observacoes} onChange={e => setForm(v => ({ ...v, observacoes: e.target.value }))}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-400 text-white rounded-lg px-3 py-2 text-sm outline-none min-h-[80px]" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => { somClick(); salvarEdicao(); }} disabled={salvando}
                      className="flex-1 bg-yellow-400 hover:bg-yellow-300 text-black font-black py-2.5 rounded-lg text-sm uppercase tracking-widest transition-all disabled:opacity-50">
                      {salvando ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button onClick={() => { somClick(); setEditando(false); }}
                      className="px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-2.5 rounded-lg text-sm transition-all">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Telefone', value: lead.telefone },
                      { label: 'E-mail', value: lead.email },
                      { label: 'Produto', value: lead.produto_interesse },
                      { label: 'Valor estimado', value: lead.valor_estimado ? fmt(Number(lead.valor_estimado)) : null },
                      { label: 'Origem', value: lead.origem },
                      { label: 'Responsável', value: lead.responsavel_nome },
                    ].map(item => item.value ? (
                      <div key={item.label} className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/50">
                        <p className="text-zinc-600 text-[9px] font-black uppercase tracking-widest mb-0.5">{item.label}</p>
                        <p className="text-white text-sm font-bold truncate">{item.value}</p>
                      </div>
                    ) : null)}
                  </div>
                  {lead.observacoes && (
                    <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/50">
                      <p className="text-zinc-600 text-[9px] font-black uppercase tracking-widest mb-1">Observações</p>
                      <p className="text-zinc-300 text-sm whitespace-pre-wrap">{lead.observacoes}</p>
                    </div>
                  )}
                  {/* WhatsApp rápido */}
                  {lead.telefone && waContas.filter(c => c.status === 'open' || c.status === 'connected').length > 0 && (
                    <div className="bg-green-950/20 border border-green-900/30 rounded-xl p-4">
                      <p className="text-green-400 text-[10px] font-black uppercase tracking-widest mb-3">📲 Enviar WhatsApp</p>
                      <select value={waContaSelecionada} onChange={e => setWaContaSelecionada(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none mb-2">
                        <option value="">Selecionar conta...</option>
                        {waContas.filter(c => c.status === 'open' || c.status === 'connected').map(c => (
                          <option key={c.instance_name} value={c.instance_name}>{c.nome} — {c.numero_telefone || 'conectado'}</option>
                        ))}
                      </select>
                      {waTemplates.length > 0 && (
                        <select onChange={e => {
                          const t = waTemplates.find((t: any) => String(t.id) === e.target.value);
                          if (t) setWaMensagem(t.texto.replace('{nome}', lead.nome.split(' ')[0]));
                          e.target.value = '';
                        }} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-lg px-3 py-2 text-sm outline-none mb-2">
                          <option value="">Usar template...</option>
                          {waTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </select>
                      )}
                      <textarea value={waMensagem} onChange={e => setWaMensagem(e.target.value)}
                        placeholder="Digite a mensagem..."
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-green-500 text-white rounded-lg px-3 py-2 text-sm outline-none min-h-[80px] mb-2" />
                      <button onClick={() => { somClick(); enviarWhatsApp(); }} disabled={enviandoWa || !waContaSelecionada || !waMensagem.trim()}
                        className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-black py-2.5 rounded-lg text-sm uppercase tracking-widest transition-all">
                        {enviandoWa ? 'Enviando...' : '📲 Enviar Mensagem'}
                      </button>
                    </div>
                  )}
                  {/* Atribuição — visível apenas para admin/suporte */}
                  {isAdminOrSuporte && vendedores.length > 0 && (
                    <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-3">
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-2">👤 Atribuir Lead</p>
                      <div className="flex gap-2">
                        <select value={vendedorSelecionado} onChange={e => setVendedorSelecionado(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm outline-none">
                          <option value="">Selecionar vendedor...</option>
                          {vendedores.map(v => (
                            <option key={v.id} value={String(v.id)}>
                              {v.name}{lead.responsavel_id === String(v.id) ? ' ✓ atual' : ''}
                            </option>
                          ))}
                        </select>
                        <button onClick={() => { somClick(); atribuirLead(); }} disabled={atribuindo || !vendedorSelecionado}
                          className="px-3 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-black rounded-lg text-sm transition-all">
                          {atribuindo ? '...' : 'Atribuir'}
                        </button>
                      </div>
                    </div>
                  )}

                  <button onMouseEnter={somHover} onClick={() => { somClick(); setEditando(true); }}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-black text-xs uppercase tracking-widest rounded-lg transition-all">
                    ✏️ Editar Lead
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── ATIVIDADES ───────────────────────────────────────────────────── */}
          {aba === 'atividades' && (
            <div className="space-y-4">
              {/* Nova atividade */}
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4">
                <div className="flex gap-2 mb-3 flex-wrap">
                  {TIPOS_ATIVIDADE.map(t => (
                    <button key={t.key} onClick={() => { somClick(); setTipoAtv(t.key); }}
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all ${tipoAtv === t.key ? 'bg-yellow-400/20 border-yellow-500/50 text-yellow-400' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <textarea value={conteudoAtv} onChange={e => setConteudoAtv(e.target.value)}
                  placeholder="Descreva a atividade..."
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-400 text-white rounded-lg px-3 py-2 text-sm outline-none min-h-[72px] mb-2" />
                <button onClick={() => { somClick(); enviarAtividade(); }} disabled={enviandoAtv || !conteudoAtv.trim()}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-black py-2.5 rounded-lg text-sm uppercase tracking-widest transition-all">
                  {enviandoAtv ? 'Registrando...' : '+ Registrar'}
                </button>
              </div>
              {/* Lista */}
              {lead.atividades.length === 0 ? (
                <p className="text-zinc-700 text-center text-sm italic py-6">Nenhuma atividade registrada.</p>
              ) : lead.atividades.map(a => (
                <div key={a.id} className="flex gap-3 bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-3">
                  <span className="text-lg flex-shrink-0">
                    {a.tipo === 'ligacao' ? '📞' : a.tipo === 'whatsapp' ? '📲' : a.tipo === 'email' ? '📧' : a.tipo === 'reuniao' ? '🎥' : '📝'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-zinc-300 text-sm whitespace-pre-wrap break-words">{a.conteudo}</p>
                    <p className="text-zinc-700 text-[10px] mt-1">{a.user_nome || ''} · {new Date(a.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── TAREFAS ──────────────────────────────────────────────────────── */}
          {aba === 'tarefas' && (
            <div className="space-y-4">
              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-2">
                <input value={tituloTarefa} onChange={e => setTituloTarefa(e.target.value)}
                  placeholder="Ex: Ligar para confirmar interesse"
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-400 text-white rounded-lg px-3 py-2 text-sm outline-none" />
                <input type="datetime-local" value={vencimentoTarefa} onChange={e => setVencimentoTarefa(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-400 text-white rounded-lg px-3 py-2 text-sm outline-none [color-scheme:dark]" />
                <button onClick={() => { somClick(); criarTarefa(); }} disabled={!tituloTarefa.trim()}
                  className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-black font-black py-2.5 rounded-lg text-sm uppercase tracking-widest transition-all">
                  + Criar Tarefa
                </button>
              </div>
              {lead.tarefas.length === 0 ? (
                <p className="text-zinc-700 text-center text-sm italic py-6">Nenhuma tarefa para este lead.</p>
              ) : lead.tarefas.map(t => {
                const atrasada = !t.concluida && t.vencimento && new Date(t.vencimento) < new Date();
                return (
                  <div key={t.id} className={`flex items-start gap-3 border rounded-xl p-3 transition-all ${t.concluida ? 'opacity-50 border-zinc-800' : atrasada ? 'border-red-800/50 bg-red-950/10' : 'border-zinc-800 bg-zinc-950/40'}`}>
                    <button onClick={() => { somClick(); if (!t.concluida) concluirTarefa(t.id); }}
                      className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${t.concluida ? 'bg-green-600 border-green-600' : 'border-zinc-600 hover:border-green-500'}`}>
                      {t.concluida && <span className="text-white text-xs">✓</span>}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold ${t.concluida ? 'line-through text-zinc-600' : 'text-white'}`}>{t.titulo}</p>
                      {t.vencimento && (
                        <p className={`text-[10px] mt-0.5 ${atrasada ? 'text-red-400 font-black' : 'text-zinc-600'}`}>
                          {atrasada ? '⚠️ ' : '📅 '}{new Date(t.vencimento).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── WHATSAPP CHAT ────────────────────────────────────────────── */}
          {aba === 'whatsapp' && (
            <div className="flex flex-col h-full" style={{ minHeight: 360 }}>
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto space-y-2 pb-2" style={{ maxHeight: 340 }}>
                {waMensagens.length === 0 ? (
                  <div className="text-center py-10 text-zinc-700 italic text-sm">Nenhuma mensagem ainda.</div>
                ) : waMensagens.map(m => {
                  const enviada = m.direcao === 'enviada';
                  const hora = new Date(m.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
                  return (
                    <div key={m.id} className={`flex ${enviada ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${enviada ? 'bg-green-700 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'}`}>
                        {m.conta_nome && !enviada && (
                          <p className="text-[9px] font-black uppercase text-zinc-500 mb-1">{m.conta_nome}</p>
                        )}

                        {/* Mídia inline */}
                        {m.media_url && m.media_type === 'image' && (
                          <img src={m.media_url} alt="imagem" className="rounded-xl max-w-full mb-1 max-h-60 object-cover cursor-pointer" onClick={() => window.open(m.media_url!, '_blank')} />
                        )}
                        {m.media_url && m.media_type === 'sticker' && (
                          <img src={m.media_url} alt="figurinha" className="w-24 h-24 object-contain mb-1" />
                        )}
                        {m.media_url && m.media_type === 'audio' && (
                          <audio controls src={m.media_url} className="w-full mb-1" style={{ height: 36 }} />
                        )}
                        {m.media_url && m.media_type === 'video' && (
                          <video controls src={m.media_url} className="rounded-xl max-w-full max-h-48 mb-1" />
                        )}
                        {m.media_url && m.media_type === 'document' && (
                          <a href={m.media_url} download={m.conteudo} className={`flex items-center gap-2 mb-1 underline text-xs ${enviada ? 'text-green-200' : 'text-blue-400'}`}>
                            📄 {m.conteudo}
                          </a>
                        )}

                        {/* Legenda ou texto */}
                        {(!m.media_type || m.media_type === 'image' || m.media_type === 'video') && m.conteudo && !['[imagem]','[vídeo]','[mídia]'].includes(m.conteudo) && (
                          <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>
                        )}
                        {!m.media_url && !['image','audio','video','document','sticker'].includes(m.media_type || '') && (
                          <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>
                        )}
                        {m.media_type && !m.media_url && (
                          <p className="italic opacity-60 text-xs">{m.conteudo}</p>
                        )}

                        <p className={`text-[9px] mt-1 text-right ${enviada ? 'text-green-300' : 'text-zinc-600'}`}>{hora}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Envio */}
              {lead.telefone && waContas.filter(c => c.status === 'open' || c.status === 'connected').length > 0 ? (
                <div className="border-t border-zinc-800 pt-3 mt-2 space-y-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <select value={waContaSelecionada} onChange={e => setWaContaSelecionada(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-800 text-white rounded-lg px-2 py-1.5 text-xs outline-none">
                      <option value="">Conta...</option>
                      {waContas.filter(c => c.status === 'open' || c.status === 'connected').map(c => (
                        <option key={c.instance_name} value={c.instance_name}>{c.nome}</option>
                      ))}
                    </select>
                    {waTemplates.length > 0 && (
                      <select onChange={e => {
                        const t = waTemplates.find((t: any) => String(t.id) === e.target.value);
                        if (t) setWaMensagem(t.texto.replace('{nome}', lead.nome.split(' ')[0]));
                        e.target.value = '';
                      }} className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded-lg px-2 py-1.5 text-xs outline-none">
                        <option value="">Template...</option>
                        {waTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <textarea value={waMensagem} onChange={e => setWaMensagem(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!enviandoWa && waContaSelecionada && waMensagem.trim()) enviarWhatsApp(); } }}
                      placeholder="Digite a mensagem... (Enter para enviar)"
                      rows={2}
                      className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-green-500 text-white rounded-xl px-3 py-2 text-sm outline-none resize-none" />
                    <button onClick={() => { somClick(); enviarWhatsApp(); }} disabled={enviandoWa || !waContaSelecionada || !waMensagem.trim()}
                      className="px-4 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-black rounded-xl text-sm transition-all flex-shrink-0">
                      {enviandoWa ? '...' : '▶'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-600 text-xs text-center pt-3 border-t border-zinc-800">
                  {lead.telefone ? 'Nenhuma conta WhatsApp conectada.' : 'Lead sem telefone cadastrado.'}
                </p>
              )}
            </div>
          )}

          {/* ── HISTÓRICO ────────────────────────────────────────────────────── */}
          {aba === 'historico' && (
            <div className="space-y-2">
              {lead.historico.length === 0 ? (
                <p className="text-zinc-700 text-center text-sm italic py-6">Sem histórico.</p>
              ) : lead.historico.map(h => {
                const eSrc = ESTAGIOS_ATIVOS.find(e => e.key === h.estagio_anterior);
                const eDst = ESTAGIOS_ATIVOS.find(e => e.key === h.estagio_novo);
                return (
                  <div key={h.id} className="flex gap-3 bg-zinc-950/40 border border-zinc-800/50 rounded-xl p-3">
                    <span className="text-base flex-shrink-0 mt-0.5">{eDst?.emoji || '🔄'}</span>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs flex-wrap">
                        {h.estagio_anterior && <span className="text-zinc-500">{eSrc?.label || h.estagio_anterior}</span>}
                        {h.estagio_anterior && <span className="text-zinc-700">→</span>}
                        <span className="font-black" style={{ color: eDst?.cor || '#22c55e' }}>{eDst?.label || h.estagio_novo}</span>
                      </div>
                      {h.observacao && <p className="text-zinc-500 text-xs mt-0.5">{h.observacao}</p>}
                      <p className="text-zinc-700 text-[10px] mt-1">{h.user_nome || ''} · {new Date(h.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
