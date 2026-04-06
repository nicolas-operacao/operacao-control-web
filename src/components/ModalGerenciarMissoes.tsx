import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';
import { toast } from '../services/toast';
import { ModalDashboardAbordagem } from './ModalDashboardAbordagem';

type Missao = {
  id: string;
  titulo: string;
  descricao: string;
  icone: string;
  tipo: 'hoje' | 'semana' | 'mes' | 'valor' | 'abordagem';
  meta: number;
  recompensa_xp?: number;
  ativa: boolean;
  data_fim: string;
};

const TIPO_LABEL: Record<string, string> = {
  hoje: 'Vendas hoje',
  semana: 'Vendas na semana',
  mes: 'Vendas no mês',
  valor: 'Valor vendido (R$)',
  abordagem: 'Abordagem diária',
};

const ICONES_SUGERIDOS = ['🎯', '🔥', '⚡', '💰', '🏆', '⚔️', '🚀', '💪', '🎖️', '🌟', '💎', '🛡️'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ModalGerenciarMissoes({ isOpen, onClose }: Props) {
  const [missoes, setMissoes] = useState<Missao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Missao | null>(null);
  const [dashboardMissao, setDashboardMissao] = useState<Missao | null>(null);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [icone, setIcone] = useState('🎯');
  const [tipo, setTipo] = useState<'hoje' | 'semana' | 'mes' | 'valor' | 'abordagem'>('hoje');
  const [meta, setMeta] = useState('5');
  const [recompensaXp, setRecompensaXp] = useState('100');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    if (isOpen) fetchMissoes();
  }, [isOpen]);

  async function fetchMissoes() {
    setCarregando(true);
    try {
      const res = await api.get('/missions');
      setMissoes(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar missões.');
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovaForm() {
    setEditando(null);
    setTitulo('');
    setDescricao('');
    setIcone('🎯');
    setTipo('hoje');
    setMeta('5');
    setRecompensaXp('100');
    // data_fim = fim do mês atual por padrão
    const hoje = new Date();
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    setDataFim(ultimoDia.toISOString().slice(0, 10));
    setShowForm(true);
  }

  function abrirEditForm(m: Missao) {
    setEditando(m);
    setTitulo(m.titulo);
    setDescricao(m.descricao);
    setIcone(m.icone);
    setTipo(m.tipo);
    setMeta(String(m.meta));
    setRecompensaXp(String(m.recompensa_xp ?? 100));
    setDataFim(m.data_fim.slice(0, 10));
    setShowForm(true);
  }

  async function salvar() {
    if (!titulo.trim()) { toast.warning('Título é obrigatório.'); return; }
    if (!dataFim) { toast.warning('Data de encerramento é obrigatória.'); return; }
    setSalvando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        icone,
        tipo,
        meta: Number(meta),
        recompensa_xp: Number(recompensaXp),
        ativa: true,
        data_fim: dataFim,
      };
      if (editando) {
        await api.put(`/missions/${editando.id}`, payload);
      } else {
        await api.post('/missions', payload);
      }
      toast.success(editando ? 'Missão atualizada!' : 'Missão criada!');
      await fetchMissoes();
      setShowForm(false);
    } catch {
      toast.error('Erro ao salvar missão.');
    } finally {
      setSalvando(false);
    }
  }

  async function deletar(id: string) {
    setDeletando(id);
    try {
      await api.delete(`/missions/${id}`);
      setMissoes(prev => prev.filter(m => m.id !== id));
      toast.success('Missão removida.');
    } catch {
      toast.error('Erro ao deletar missão.');
    } finally {
      setDeletando(null);
    }
  }

  async function toggleAtiva(m: Missao) {
    try {
      await api.put(`/missions/${m.id}`, { ...m, ativa: !m.ativa });
      setMissoes(prev => prev.map(x => x.id === m.id ? { ...x, ativa: !x.ativa } : x));
    } catch {
      toast.error('Erro ao atualizar missão.');
    }
  }

  if (!isOpen) return null;

  return (
    <>
    {dashboardMissao && (
      <ModalDashboardAbordagem
        missao={dashboardMissao}
        onClose={() => setDashboardMissao(null)}
      />
    )}
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[95dvh] sm:max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest">🎯 Missões Diárias</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Crie desafios para motivar seus vendedores</p>
          </div>
          <button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="text-zinc-500 hover:text-white text-2xl font-bold transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Form criar/editar */}
          {showForm && (
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
              <p className="text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">
                {editando ? '✏️ Editar Missão' : '➕ Nova Missão'}
              </p>

              {/* Ícone */}
              <div>
                <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1.5">Ícone</label>
                <div className="flex flex-wrap gap-2">
                  {ICONES_SUGERIDOS.map(ic => (
                    <button
                      key={ic}
                      onMouseEnter={somHover}
                      onClick={() => { somClick(); setIcone(ic); }}
                      className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center border transition-all ${
                        icone === ic
                          ? 'bg-yellow-400/20 border-yellow-400/60 shadow-[0_0_8px_rgba(250,204,21,0.3)]'
                          : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Título da Missão</label>
                <input
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ex: Caçador de Ouro"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/60"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Descrição</label>
                <input
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="Ex: Faça 5 vendas hoje"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Tipo */}
                <div>
                  <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Tipo</label>
                  <select
                    value={tipo}
                    onChange={e => setTipo(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/60"
                  >
                    <option value="hoje">Vendas hoje</option>
                    <option value="semana">Vendas na semana</option>
                    <option value="mes">Vendas no mês</option>
                    <option value="valor">Valor vendido (R$)</option>
                    <option value="abordagem">🎯 Abordagem diária</option>
                  </select>
                </div>

                {/* Meta */}
                <div>
                  <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">
                    Meta ({tipo === 'valor' ? 'R$' : tipo === 'abordagem' ? 'abordagens/dia' : 'vendas'})
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={meta}
                    onChange={e => setMeta(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Recompensa XP */}
                <div>
                  <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Recompensa XP</label>
                  <input
                    type="number"
                    min="0"
                    value={recompensaXp}
                    onChange={e => setRecompensaXp(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/60"
                  />
                </div>

                {/* Data fim */}
                <div>
                  <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Encerra em</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500/60"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onMouseEnter={somHover}
                  onClick={() => { somClick(); salvar(); }}
                  disabled={salvando}
                  className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black py-2 rounded-lg text-sm uppercase tracking-wider transition-all active:scale-95"
                >
                  {salvando ? 'Salvando...' : editando ? '✓ Salvar Alterações' : '✓ Criar Missão'}
                </button>
                <button
                  onMouseEnter={somHover}
                  onClick={() => { somClick(); setShowForm(false); }}
                  className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-2 rounded-lg text-sm transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Botão nova missão */}
          {!showForm && (
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); abrirNovaForm(); }}
              className="w-full border border-dashed border-zinc-700 hover:border-yellow-400/50 rounded-xl p-3 text-zinc-500 hover:text-yellow-400 text-sm font-black uppercase tracking-wider transition-all"
            >
              + Nova Missão
            </button>
          )}

          {/* Lista de missões */}
          {carregando ? (
            <div className="text-center text-zinc-500 py-8 animate-pulse">Carregando missões...</div>
          ) : missoes.length === 0 ? (
            <div className="text-center text-zinc-600 py-8 text-sm">
              <p className="text-3xl mb-2">🎯</p>
              <p>Nenhuma missão ativa.</p>
              <p className="text-zinc-700 text-xs mt-1">Crie missões para desafiar seus vendedores!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {missoes.map(m => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${
                    m.ativa ? 'bg-zinc-900 border-zinc-700' : 'bg-zinc-950 border-zinc-800 opacity-50'
                  }`}
                >
                  <span className="text-2xl flex-shrink-0 mt-0.5">{m.icone}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white text-sm font-black">{m.titulo}</p>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${
                        m.ativa ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-zinc-800 text-zinc-600 border-zinc-700'
                      }`}>
                        {m.ativa ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-0.5">{m.descricao || `Meta: ${m.meta} ${TIPO_LABEL[m.tipo]?.toLowerCase()}`}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600">
                      <span>🎯 {m.meta} {m.tipo === 'valor' ? 'reais' : 'vendas'}</span>
                      {m.recompensa_xp && <span>⚡ {m.recompensa_xp} XP</span>}
                      <span>📅 até {new Date(m.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button
                      onMouseEnter={somHover}
                      onClick={() => { somClick(); toggleAtiva(m); }}
                      className={`px-2 py-1 rounded-md text-[10px] font-black border transition-all ${
                        m.ativa
                          ? 'text-zinc-500 border-zinc-700 hover:text-red-400 hover:border-red-700/50'
                          : 'text-green-400 border-green-700/50 hover:bg-green-950/30'
                      }`}
                    >
                      {m.ativa ? '⏸ Pausar' : '▶ Ativar'}
                    </button>
                    <button
                      onMouseEnter={somHover}
                      onClick={() => { somClick(); abrirEditForm(m); }}
                      className="px-2 py-1 rounded-md text-[10px] font-black border border-zinc-700 text-zinc-500 hover:text-yellow-400 hover:border-yellow-700/50 transition-all"
                    >
                      ✏️ Editar
                    </button>
                    {m.tipo === 'abordagem' && (
                      <button
                        onMouseEnter={somHover}
                        onClick={() => { somClick(); setDashboardMissao(m); }}
                        className="px-2 py-1 rounded-md text-[10px] font-black border border-blue-800/50 text-blue-400 hover:bg-blue-950/30 transition-all"
                      >
                        📊 Stats
                      </button>
                    )}
                    <button
                      onMouseEnter={somHover}
                      onClick={() => { somClick(); deletar(m.id); }}
                      disabled={deletando === m.id}
                      className="px-2 py-1 rounded-md text-[10px] font-black border border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-800/50 transition-all disabled:opacity-50"
                    >
                      {deletando === m.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-zinc-600 text-xs">{missoes.filter(m => m.ativa).length} missão(ões) ativa(s)</p>
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); onClose(); }}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
