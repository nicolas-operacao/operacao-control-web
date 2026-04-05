import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';

type Usuario = {
  id: string;
  name: string;
  email: string;
  role: string;
  equipe: string | null;
  foto_url?: string;
  meta_mensal?: number | null;
};

interface Props {
  onClose: () => void;
  onSalvo: () => void;
}

export function ModalGerenciarEquipes({ onClose, onSalvo }: Props) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [salvandoMeta, setSalvandoMeta] = useState<string | null>(null);
  const [metaEditando, setMetaEditando] = useState<string | null>(null);
  const [metaValor, setMetaValor] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');

  useEffect(() => {
    buscarUsuarios();
  }, []);

  async function buscarUsuarios() {
    try {
      setCarregando(true);
      const res = await api.get('/users');
      const vendedores = (res.data as Usuario[]).filter(u => u.role === 'vendedor');
      setUsuarios(vendedores);
      // Inicializa valores de meta
      const metas: Record<string, string> = {};
      vendedores.forEach(u => { metas[u.id] = String(u.meta_mensal ?? ''); });
      setMetaValor(metas);
    } catch {
      setErro('Erro ao carregar usuários.');
    } finally {
      setCarregando(false);
    }
  }

  async function salvarMeta(userId: string) {
    const meta = parseInt(metaValor[userId] ?? '0', 10);
    if (isNaN(meta) || meta < 0) return;
    setSalvandoMeta(userId);
    try {
      await api.patch(`/users/${userId}/meta`, { meta });
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, meta_mensal: meta } : u));
      setMetaEditando(null);
    } catch {
      setErro('Erro ao salvar meta.');
    } finally {
      setSalvandoMeta(null);
    }
  }

  async function moverParaEquipe(userId: string, novaEquipe: string) {
    setSalvando(userId);
    setErro('');
    try {
      await api.patch(`/users/${userId}/equipe`, { equipe: novaEquipe });
      setUsuarios(prev =>
        prev.map(u => u.id === userId ? { ...u, equipe: novaEquipe } : u)
      );
      onSalvo();
    } catch {
      setErro('Erro ao mover vendedor de equipe.');
    } finally {
      setSalvando(null);
    }
  }

  const equipeA = usuarios.filter(u => (u.equipe || '').toUpperCase() === 'A');
  const equipeB = usuarios.filter(u => (u.equipe || '').toUpperCase() === 'B');
  const semEquipe = usuarios.filter(u => !u.equipe || (u.equipe.toUpperCase() !== 'A' && u.equipe.toUpperCase() !== 'B'));

  const renderCard = (u: Usuario) => {
    const iniciais = u.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
    const estaEquipeA = (u.equipe || '').toUpperCase() === 'A';
    const estaEquipeB = (u.equipe || '').toUpperCase() === 'B';
    const carregandoEste = salvando === u.id;

    return (
      <div key={u.id} className="flex flex-col gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {u.foto_url ? (
              <img src={u.foto_url} alt={u.name} className="w-9 h-9 rounded-full object-cover border-2 border-zinc-700 flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0 border-2 border-zinc-600">
                <span className="text-xs font-black text-zinc-300">{iniciais}</span>
              </div>
            )}
            <div className="min-w-0">
              <span className="text-zinc-200 font-semibold text-sm truncate block">{u.name}</span>
              {u.meta_mensal ? (
                <span className="text-[10px] text-zinc-500">Meta: {u.meta_mensal} vendas/mês</span>
              ) : (
                <span className="text-[10px] text-zinc-700">Sem meta definida</span>
              )}
            </div>
          </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); moverParaEquipe(u.id, 'A'); }}
            disabled={carregandoEste || estaEquipeA}
            className={`px-3 py-1.5 rounded-md text-xs font-black transition-all border ${
              estaEquipeA
                ? 'bg-blue-600 border-blue-500 text-white cursor-default'
                : 'bg-zinc-800 border-zinc-700 text-blue-400 hover:bg-blue-950 hover:border-blue-700'
            } disabled:opacity-60`}
          >
            {carregandoEste ? '...' : estaEquipeA ? '✓ Time A' : 'Time A'}
          </button>
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); moverParaEquipe(u.id, 'B'); }}
            disabled={carregandoEste || estaEquipeB}
            className={`px-3 py-1.5 rounded-md text-xs font-black transition-all border ${
              estaEquipeB
                ? 'bg-red-600 border-red-500 text-white cursor-default'
                : 'bg-zinc-800 border-zinc-700 text-red-400 hover:bg-red-950 hover:border-red-700'
            } disabled:opacity-60`}
          >
            {carregandoEste ? '...' : estaEquipeB ? '✓ Time B' : 'Time B'}
          </button>
        </div>
        </div>

        {/* Meta mensal */}
        <div className="flex items-center gap-2">
          {metaEditando === u.id ? (
            <>
              <input
                type="number"
                min="1"
                value={metaValor[u.id] ?? ''}
                onChange={e => setMetaValor(prev => ({ ...prev, [u.id]: e.target.value }))}
                placeholder="Ex: 30"
                className="w-20 bg-zinc-800 border border-yellow-500/40 rounded-md px-2 py-1 text-white text-xs focus:outline-none"
                autoFocus
              />
              <span className="text-zinc-600 text-xs">vendas/mês</span>
              <button
                onMouseEnter={somHover}
                onClick={() => { somClick(); salvarMeta(u.id); }}
                disabled={salvandoMeta === u.id}
                className="px-2 py-1 rounded-md text-xs font-black bg-yellow-400 text-black hover:bg-yellow-300 disabled:opacity-50 transition-all"
              >
                {salvandoMeta === u.id ? '...' : '✓'}
              </button>
              <button
                onMouseEnter={somHover}
                onClick={() => { somClick(); setMetaEditando(null); }}
                className="px-2 py-1 rounded-md text-xs font-black border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
              >
                ✕
              </button>
            </>
          ) : (
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); setMetaEditando(u.id); }}
              className="text-[10px] font-black border border-zinc-700 text-zinc-600 hover:text-yellow-400 hover:border-yellow-700/50 px-2 py-1 rounded-md transition-all"
            >
              🎯 {u.meta_mensal ? `Meta: ${u.meta_mensal}` : 'Definir Meta'}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest">⚔️ Gerenciar Squads</h2>
            <p className="text-zinc-500 text-xs mt-0.5">Mova vendedores entre equipes e defina metas individuais</p>
          </div>
          <button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="text-zinc-500 hover:text-white text-2xl font-bold transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-6">
          {carregando ? (
            <div className="text-center text-zinc-500 py-10 animate-pulse">Carregando soldados...</div>
          ) : (
            <>
              {erro && (
                <div className="bg-red-950/50 border border-red-800 text-red-400 rounded-lg p-3 text-sm">{erro}</div>
              )}

              {/* Sem equipe */}
              {semEquipe.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-600 inline-block"></span>
                    Sem equipe ({semEquipe.length})
                  </h3>
                  <div className="space-y-2">{semEquipe.map(renderCard)}</div>
                </div>
              )}

              {/* Equipe A */}
              <div>
                <h3 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  Equipe A — {equipeA.length} soldado{equipeA.length !== 1 ? 's' : ''}
                </h3>
                {equipeA.length === 0 ? (
                  <p className="text-zinc-700 text-xs italic px-1">Nenhum soldado nesta equipe.</p>
                ) : (
                  <div className="space-y-2">{equipeA.map(renderCard)}</div>
                )}
              </div>

              {/* Equipe B */}
              <div>
                <h3 className="text-xs font-black text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                  Equipe B — {equipeB.length} soldado{equipeB.length !== 1 ? 's' : ''}
                </h3>
                {equipeB.length === 0 ? (
                  <p className="text-zinc-700 text-xs italic px-1">Nenhum soldado nesta equipe.</p>
                ) : (
                  <div className="space-y-2">{equipeB.map(renderCard)}</div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 text-center">
          <button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
