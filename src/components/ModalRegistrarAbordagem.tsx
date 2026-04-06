import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';
import { toast } from '../services/toast';

interface Missao {
  id: string;
  titulo: string;
  icone: string;
  meta: number;
  descricao: string;
}

interface Props {
  missao: Missao;
  userId: string | number;
  userName: string;
  onClose: () => void;
}

export function ModalRegistrarAbordagem({ missao, userId, userName, onClose }: Props) {
  const [abordagens, setAbordagens] = useState('');
  const [vendas, setVendas] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [registroHoje, setRegistroHoje] = useState<{ abordagens: number; vendas: number } | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const res = await api.get(`/missions/${missao.id}/abordagem/meu?user_id=${userId}`);
        if (res.data) {
          setRegistroHoje(res.data);
          setAbordagens(String(res.data.abordagens));
          setVendas(String(res.data.vendas));
        }
      } catch { /* silencioso */ }
      finally { setCarregando(false); }
    }
    carregar();
  }, [missao.id, userId]);

  async function salvar() {
    const a = Number(abordagens);
    const v = Number(vendas);
    if (!abordagens || isNaN(a) || a < 0) { toast.warning('Informe o número de abordagens.'); return; }
    if (isNaN(v) || v < 0) { toast.warning('Número de vendas inválido.'); return; }
    if (v > a) { toast.warning('Vendas não pode ser maior que abordagens.'); return; }

    setSalvando(true);
    try {
      await api.post(`/missions/${missao.id}/abordagem`, {
        user_id: userId,
        user_name: userName,
        abordagens: a,
        vendas: v,
      });
      toast.success('Relatório registrado!');
      onClose();
    } catch {
      toast.error('Erro ao registrar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  const taxa = Number(abordagens) > 0 ? Math.round((Number(vendas) / Number(abordagens)) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-md flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{missao.icone}</span>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider leading-tight">{missao.titulo}</h2>
              <p className="text-zinc-500 text-xs">Relatório de hoje</p>
            </div>
          </div>
          <button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }} className="text-zinc-500 hover:text-white text-xl font-bold">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {carregando ? (
            <div className="text-center text-zinc-500 py-4 text-sm animate-pulse">Carregando...</div>
          ) : (
            <>
              {registroHoje && (
                <div className="bg-blue-950/20 border border-blue-800/30 rounded-xl p-3 text-xs text-blue-400">
                  📋 Você já registrou hoje: <strong>{registroHoje.abordagens} abordagens</strong> e <strong>{registroHoje.vendas} vendas</strong>. Atualize abaixo.
                </div>
              )}

              {/* Meta da missão */}
              <div className="flex items-center justify-between bg-zinc-900 rounded-xl p-3">
                <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Meta do dia</p>
                <p className="text-yellow-400 font-black text-lg">{missao.meta} abordagens</p>
              </div>

              {/* Input abordagens */}
              <div>
                <label className="block text-zinc-400 text-[10px] font-black uppercase mb-2 tracking-widest">
                  Quantas pessoas você abordou hoje?
                </label>
                <input
                  type="number"
                  min="0"
                  value={abordagens}
                  onChange={e => setAbordagens(e.target.value)}
                  placeholder="Ex: 85"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-2xl font-black text-center focus:outline-none focus:border-yellow-500/60 transition-all"
                />
              </div>

              {/* Input vendas */}
              <div>
                <label className="block text-zinc-400 text-[10px] font-black uppercase mb-2 tracking-widest">
                  Quantas vendas fechou?
                </label>
                <input
                  type="number"
                  min="0"
                  value={vendas}
                  onChange={e => setVendas(e.target.value)}
                  placeholder="Ex: 3"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-2xl font-black text-center focus:outline-none focus:border-yellow-500/60 transition-all"
                />
              </div>

              {/* Preview taxa de conversão */}
              {Number(abordagens) > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-zinc-900 rounded-xl p-3 text-center">
                    <p className="text-zinc-600 text-[9px] uppercase font-black">Abordagens</p>
                    <p className="text-white font-black text-xl">{abordagens || 0}</p>
                  </div>
                  <div className="bg-zinc-900 rounded-xl p-3 text-center">
                    <p className="text-zinc-600 text-[9px] uppercase font-black">Vendas</p>
                    <p className="text-green-400 font-black text-xl">{vendas || 0}</p>
                  </div>
                  <div className={`rounded-xl p-3 text-center ${taxa >= 10 ? 'bg-green-950/30' : taxa >= 5 ? 'bg-yellow-950/30' : 'bg-zinc-900'}`}>
                    <p className="text-zinc-600 text-[9px] uppercase font-black">Conversão</p>
                    <p className={`font-black text-xl ${taxa >= 10 ? 'text-green-400' : taxa >= 5 ? 'text-yellow-400' : 'text-zinc-400'}`}>{taxa}%</p>
                  </div>
                </div>
              )}

              <button
                onMouseEnter={somHover}
                onClick={() => { somClick(); salvar(); }}
                disabled={salvando || !abordagens}
                className="w-full py-3 rounded-xl font-black text-black uppercase tracking-wider text-sm transition-all active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #ca8a04, #facc15)' }}
              >
                {salvando ? 'Salvando...' : registroHoje ? '🔄 Atualizar Relatório' : '✅ Registrar Abordagens'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
