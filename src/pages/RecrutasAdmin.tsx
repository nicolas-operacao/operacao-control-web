import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from '../services/toast';
import { somClick, somHover } from '../services/hudSounds';

type User = {
  id: string;
  name: string;
  email: string;
  status: string;
  role: string;
  equipe?: string;
  som_desativado?: boolean;
};

type ResetRequest = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  status: string;
  created_at: string;
  nova_senha_temp?: string;
};

const ROLE_LABEL: Record<string, string> = {
  vendedor: 'Vendedor',
  admin: 'Admin',
  suporte: 'Suporte',
};

const ROLE_COLOR: Record<string, string> = {
  vendedor: 'text-green-400 bg-green-500/10 border-green-500/30',
  admin: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  suporte: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

export function RecrutasAdmin() {
  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState<User[]>([]);
  const [aprovados, setAprovados] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editEquipe, setEditEquipe] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<'pendentes' | 'tropa' | 'senhas'>('pendentes');
  const [excluindo, setExcluindo] = useState<string | null>(null);

  // Reset de senhas
  const [resets, setResets] = useState<ResetRequest[]>([]);
  const [novaSenha, setNovaSenha] = useState('');
  const [resolvendoId, setResolvendoId] = useState<string | null>(null);
  const [salvandoReset, setSalvandoReset] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [pendRes, aprovRes, resetRes] = await Promise.all([
        api.get('/admin/pending'),
        api.get('/admin/users'),
        api.get('/auth/reset-requests'),
      ]);
      setPendentes(Array.isArray(pendRes.data) ? pendRes.data : []);
      setAprovados(Array.isArray(aprovRes.data) ? aprovRes.data : []);
      setResets(Array.isArray(resetRes.data) ? resetRes.data : []);
    } catch {
      toast.error('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }

  async function resolverReset(id: string) {
    if (!novaSenha.trim()) { toast.warning('Digite a nova senha.'); return; }
    setSalvandoReset(true);
    try {
      const res = await api.patch(`/auth/reset-requests/${id}/resolve`, { nova_senha: novaSenha });
      toast.success(res.data.message);
      setResets(prev => prev.filter(r => r.id !== id));
      setResolvendoId(null);
      setNovaSenha('');
    } catch {
      toast.error('Erro ao redefinir senha.');
    } finally {
      setSalvandoReset(false);
    }
  }

  async function aprovar(id: string) {
    try {
      await api.patch(`/admin/${id}/approve`);
      toast.success('Recruta aprovado!');
      setPendentes(prev => prev.filter(u => u.id !== id));
      fetchAll();
    } catch {
      toast.error('Erro ao aprovar usuário.');
    }
  }

  function abrirEdicao(u: User) {
    setEditandoId(u.id);
    setEditRole(u.role);
    setEditEquipe(u.equipe || 'A');
  }

  async function salvarEdicao(id: string) {
    setSalvando(true);
    try {
      await api.patch(`/admin/${id}/role`, { role: editRole, equipe: editEquipe });
      toast.success('Usuário atualizado!');
      setEditandoId(null);
      fetchAll();
    } catch {
      toast.error('Erro ao atualizar usuário.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluirUsuario(id: string) {
    if (!confirm('Tem certeza que quer remover este usuário da tropa? Essa ação não pode ser desfeita.')) return;
    setExcluindo(id);
    try {
      await api.delete(`/admin/${id}`);
      toast.success('Usuário removido da tropa.');
      setAprovados(prev => prev.filter(u => u.id !== id));
    } catch {
      toast.error('Erro ao remover usuário.');
    } finally {
      setExcluindo(null);
    }
  }

  const aprovadosFiltrados = aprovados.filter(u =>
    u.name.toLowerCase().includes(busca.toLowerCase()) ||
    u.email.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-purple-400 uppercase tracking-wider">
              🪖 Gestão de Tropa
            </h1>
            <p className="text-zinc-500 text-xs mt-1 uppercase tracking-widest">
              {pendentes.length} pendente(s) · {aprovados.length} na tropa
            </p>
          </div>
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); navigate('/dashboard'); }}
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white px-4 py-2 rounded-lg font-bold transition-all text-xs uppercase tracking-widest"
          >
            ← Voltar ao Comando
          </button>
        </div>

        {/* Abas */}
        <div className="flex gap-2">
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); setAba('pendentes'); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${aba === 'pendentes' ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            🚨 Pendentes
            {pendentes.length > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${aba === 'pendentes' ? 'bg-black/30' : 'bg-red-600 text-white'}`}>
                {pendentes.length}
              </span>
            )}
          </button>
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); setAba('tropa'); }}
            className={`px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${aba === 'tropa' ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            ⚔️ Tropa Ativa ({aprovados.length})
          </button>
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); setAba('senhas'); }}
            className={`relative px-5 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${aba === 'senhas' ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            🔑 Senhas
            {resets.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                {resets.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="text-center text-zinc-500 py-16 animate-pulse font-black uppercase tracking-widest">Carregando tropa...</div>
        ) : aba === 'senhas' ? (
          /* ── RESETS DE SENHA ── */
          <div className="space-y-3">
            {resets.length === 0 ? (
              <div className="border-2 border-dashed border-zinc-800 rounded-xl p-12 text-center">
                <p className="text-4xl mb-3">🔑</p>
                <p className="text-zinc-400 font-black uppercase tracking-widest">Nenhum pedido pendente</p>
                <p className="text-zinc-600 text-xs mt-1">Nenhum vendedor solicitou reset de senha.</p>
              </div>
            ) : (
              resets.map(r => (
                <div key={r.id} className="bg-zinc-900 border border-orange-500/20 rounded-xl p-4">
                  {resolvendoId === r.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-lg font-black text-zinc-400">
                          {r.user_name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-black text-sm">{r.user_name}</p>
                          <p className="text-zinc-500 text-xs">{r.user_email}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Nova Senha</label>
                        <input
                          type="text"
                          value={novaSenha}
                          onChange={e => setNovaSenha(e.target.value)}
                          placeholder="Digite a nova senha..."
                          className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500/60 text-white rounded-lg px-3 py-2 text-sm outline-none placeholder:text-zinc-600"
                        />
                        <p className="text-zinc-600 text-[10px] mt-1">Defina uma senha simples e informe ao vendedor pelo WhatsApp.</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onMouseEnter={somHover}
                          onClick={() => { somClick(); resolverReset(r.id); }}
                          disabled={salvandoReset}
                          className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-black py-2 rounded-lg text-xs uppercase tracking-widest transition-all"
                        >
                          {salvandoReset ? 'Salvando...' : '✓ Redefinir Senha'}
                        </button>
                        <button
                          onMouseEnter={somHover}
                          onClick={() => { somClick(); setResolvendoId(null); setNovaSenha(''); }}
                          className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-2 rounded-lg text-xs transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-orange-950/40 border border-orange-500/30 flex items-center justify-center text-lg font-black text-orange-400">
                          {r.user_name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-black text-sm truncate">{r.user_name}</p>
                          <p className="text-zinc-500 text-xs truncate">{r.user_email}</p>
                          <p className="text-orange-400/60 text-[10px] font-bold mt-0.5">
                            {new Date(r.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onMouseEnter={somHover}
                        onClick={() => { somClick(); setResolvendoId(r.id); setNovaSenha(''); }}
                        className="flex-shrink-0 bg-orange-500/10 hover:bg-orange-500 border border-orange-500/30 hover:border-orange-500 text-orange-400 hover:text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        🔑 Redefinir
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : aba === 'pendentes' ? (
          /* ── PENDENTES ── */
          pendentes.length === 0 ? (
            <div className="border-2 border-dashed border-zinc-800 rounded-xl p-12 text-center">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-zinc-400 font-black uppercase tracking-widest">Nenhum recruta pendente</p>
              <p className="text-zinc-600 text-xs mt-1">Sua tropa está toda aprovada!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendentes.map(u => (
                <div key={u.id} className="bg-zinc-900 border border-yellow-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-black">{u.name}</p>
                    <p className="text-zinc-500 text-xs">{u.email}</p>
                  </div>
                  <button
                    onMouseEnter={somHover}
                    onClick={() => { somClick(); aprovar(u.id); }}
                    className="bg-green-500 hover:bg-green-400 active:scale-95 text-black font-black px-5 py-2 rounded-lg uppercase tracking-widest text-xs transition-all shadow-[0_0_12px_rgba(34,197,94,0.25)]"
                  >
                    ✓ Aprovar
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ── TROPA ATIVA ── */
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-purple-500/60 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-600 transition-colors"
            />

            {aprovadosFiltrados.length === 0 ? (
              <div className="text-center text-zinc-600 py-8 font-black uppercase tracking-widest text-sm">Nenhum usuário encontrado.</div>
            ) : (
              aprovadosFiltrados.map(u => (
                <div key={u.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  {editandoId === u.id ? (
                    /* Formulário de edição inline */
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-lg font-black text-zinc-400">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-black text-sm">{u.name}</p>
                          <p className="text-zinc-500 text-xs">{u.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Função</label>
                          <select
                            value={editRole}
                            onChange={e => setEditRole(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500/60"
                          >
                            <option value="vendedor">Vendedor</option>
                            <option value="admin">Admin</option>
                            <option value="suporte">Suporte</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-zinc-500 text-[10px] font-black uppercase mb-1">Equipe</label>
                          <div className="flex gap-2">
                            {['A', 'B'].map(eq => (
                              <button
                                key={eq}
                                type="button"
                                onMouseEnter={somHover}
                                onClick={() => { somClick(); setEditEquipe(eq); }}
                                className={`flex-1 py-2 rounded-lg font-black text-sm border transition-all ${editEquipe === eq
                                  ? eq === 'A' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-red-600 border-red-500 text-white'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                                }`}
                              >
                                {eq === 'A' ? '⚡ A' : '🔴 B'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onMouseEnter={somHover}
                          onClick={() => { somClick(); salvarEdicao(u.id); }}
                          disabled={salvando}
                          className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black py-2 rounded-lg text-xs uppercase tracking-widest transition-all"
                        >
                          {salvando ? 'Salvando...' : '✓ Salvar'}
                        </button>
                        <button
                          onMouseEnter={somHover}
                          onClick={() => { somClick(); setEditandoId(null); }}
                          className="px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-2 rounded-lg text-xs transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Linha normal */
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-zinc-800 flex items-center justify-center text-lg font-black text-zinc-400">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-black text-sm truncate">{u.name}</p>
                          <p className="text-zinc-500 text-xs truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${ROLE_COLOR[u.role] ?? 'text-zinc-400 bg-zinc-800 border-zinc-700'}`}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                        {u.equipe && (
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${u.equipe.toUpperCase().includes('B') ? 'text-red-400 bg-red-500/10 border-red-500/30' : 'text-blue-400 bg-blue-500/10 border-blue-500/30'}`}>
                            Eq. {u.equipe.toUpperCase().replace('EQUIPE ', '')}
                          </span>
                        )}
                        <button
                          onMouseEnter={somHover}
                          onClick={() => { somClick(); abrirEdicao(u); }}
                          className="text-zinc-500 hover:text-purple-400 border border-zinc-700 hover:border-purple-600/50 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          Editar
                        </button>
                        <button
                          onMouseEnter={somHover}
                          onClick={async () => {
                            somClick();
                            const novoValor = !u.som_desativado;
                            try {
                              await api.patch(`/admin/${u.id}/som`, { som_desativado: novoValor });
                              setAprovados(prev => prev.map(x => x.id === u.id ? { ...x, som_desativado: novoValor } : x));
                            } catch { toast.error('Erro ao alterar som.'); }
                          }}
                          title={u.som_desativado ? 'Ativar som' : 'Desativar som'}
                          className="text-zinc-500 hover:text-yellow-400 border border-zinc-700 hover:border-yellow-400/50 px-2 py-1 rounded-lg text-[10px] font-black transition-all"
                        >
                          {u.som_desativado ? '🔇' : '🔊'}
                        </button>
                        <button
                          onMouseEnter={somHover}
                          onClick={() => { somClick(); excluirUsuario(u.id); }}
                          disabled={excluindo === u.id}
                          className="text-zinc-600 hover:text-red-400 border border-zinc-800 hover:border-red-500/40 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                        >
                          {excluindo === u.id ? '...' : 'Excluir'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
