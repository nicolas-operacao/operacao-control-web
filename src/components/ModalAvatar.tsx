import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AvatarRenderer, type AvatarEquipped } from './AvatarRenderer';
import { somClick, somHover } from '../services/hudSounds';

type AvatarItem = {
  id: number;
  name: string;
  category: string;
  price: number;
  style_data: Record<string, any>;
  owned: boolean;
};

const CATS = [
  { key: 'background', label: 'Fundo',     icon: '🖼️' },
  { key: 'skin',       label: 'Pele',      icon: '👤' },
  { key: 'eyes',       label: 'Olhos',     icon: '👁️' },
  { key: 'mouth',      label: 'Boca',      icon: '👄' },
  { key: 'hair',       label: 'Cabelo',    icon: '💇' },
  { key: 'clothes',    label: 'Roupa',     icon: '👕' },
  { key: 'hat',        label: 'Chapéu',    icon: '🎩' },
  { key: 'accessory',  label: 'Acessório', icon: '💍' },
] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
}

export function ModalAvatar({ isOpen, onClose, userRole }: Props) {
  const [tab, setTab] = useState<'avatar' | 'shop'>('avatar');
  const [cat, setCat] = useState<string>('background');
  const [balance, setBalance] = useState(0);
  const [equipped, setEquipped] = useState<AvatarEquipped>({});
  const [items, setItems] = useState<AvatarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  async function load() {
    setLoading(true);
    try {
      const [w, s] = await Promise.all([api.get('/avatar/wallet'), api.get('/avatar/shop')]);
      setBalance(w.data.balance ?? 0);
      setEquipped(w.data.equipped ?? {});
      setItems(s.data ?? []);
    } catch { flash('Erro ao carregar avatar.', false); }
    setLoading(false);
  }

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  }

  async function handleEquip(item: AvatarItem) {
    somClick();
    const isFree = item.price === 0;
    const isOwned = item.owned || isFree;

    if (!isOwned) {
      // comprar primeiro
      if (userRole !== 'admin' && balance < item.price) {
        flash(`Precisa de ${item.price} moedas. Você tem ${balance}.`, false);
        return;
      }
      setBuying(item.id);
      try {
        await api.post(`/avatar/purchase/${item.id}`);
        setBalance(prev => userRole === 'admin' ? prev : prev - item.price);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, owned: true } : i));
      } catch (e: any) {
        flash(e.response?.data?.error ?? 'Erro na compra.', false);
        setBuying(null);
        return;
      }
      setBuying(null);
    }

    try {
      await api.post('/avatar/equip', { category: item.category, itemId: item.id });
      setEquipped(prev => ({ ...prev, [item.category]: item }));
      if (!isOwned) flash(`${item.name} comprado e equipado! 🎉`, true);
    } catch (e: any) {
      flash(e.response?.data?.error ?? 'Erro ao equipar.', false);
    }
  }

  const catItems = items.filter(i => i.category === cat);
  const equippedId = (equipped as any)[cat]?.id;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-xl max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">🧙</span>
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Meu Avatar</h2>
              <div className="flex items-center gap-1.5">
                <span className="text-yellow-400">🪙</span>
                <span className="text-yellow-400 font-black text-xs">
                  {userRole === 'admin' ? '∞ (Admin)' : balance.toLocaleString('pt-BR')}
                </span>
                <span className="text-zinc-600 text-[10px]">moedas</span>
              </div>
            </div>
          </div>
          <button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }}
            className="text-zinc-500 hover:text-white text-2xl font-bold w-8 h-8 flex items-center justify-center transition-colors">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 flex-shrink-0">
          {([['avatar', '🧙 Avatar'], ['shop', '🏪 Loja']] as const).map(([key, label]) => (
            <button key={key} onMouseEnter={somHover} onClick={() => { somClick(); setTab(key); }}
              className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
                tab === key ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}>{label}</button>
          ))}
        </div>

        {/* Feedback */}
        {msg && (
          <div className={`mx-4 mt-2 px-3 py-2 rounded-lg text-xs font-bold flex-shrink-0 ${
            msg.ok ? 'bg-green-950/60 border border-green-700/60 text-green-400'
                   : 'bg-red-950/60 border border-red-800/60 text-red-400'
          }`}>{msg.text}</div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">Carregando...</div>
        ) : tab === 'avatar' ? (

          /* ── ABA AVATAR ── */
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Preview central */}
            <div className="flex justify-center">
              <div className="relative inline-block">
                <AvatarRenderer equipped={equipped} size={150} />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 rounded-full px-3 py-0.5 whitespace-nowrap">
                  <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Preview</span>
                </div>
              </div>
            </div>

            {/* Slots por categoria */}
            <div className="grid grid-cols-4 gap-2 pt-2">
              {CATS.map(c => {
                const eq = (equipped as any)[c.key];
                return (
                  <button key={c.key} onMouseEnter={somHover}
                    onClick={() => { somClick(); setCat(c.key); setTab('shop'); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-all">
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-[9px] text-zinc-500 font-black uppercase">{c.label}</span>
                    {eq && <span className="text-[8px] text-yellow-400 truncate w-full text-center leading-tight">{eq.name}</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-zinc-700 text-[10px]">Toque numa categoria para ir à loja</p>
          </div>

        ) : (

          /* ── ABA LOJA ── */
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Seletor de categoria */}
            <div className="flex gap-1.5 px-3 py-2.5 overflow-x-auto border-b border-zinc-800 flex-shrink-0">
              {CATS.map(c => (
                <button key={c.key} onMouseEnter={somHover} onClick={() => { somClick(); setCat(c.key); }}
                  className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                    cat === c.key ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* Conteúdo da loja */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="flex gap-3">
                {/* Preview + equipado atual */}
                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                  <AvatarRenderer equipped={equipped} size={108} />
                  <div className="text-center">
                    <p className="text-[9px] text-zinc-600 font-black uppercase">Equipado</p>
                    <p className="text-[10px] text-yellow-400 font-bold max-w-[90px] truncate">
                      {(equipped as any)[cat]?.name ?? '—'}
                    </p>
                  </div>
                </div>

                {/* Grid de itens */}
                <div className="flex-1 grid grid-cols-2 gap-2">
                  {catItems.map(item => {
                    const isEq = equippedId === item.id;
                    const isFree = item.price === 0;
                    const canAfford = userRole === 'admin' || balance >= item.price;

                    return (
                      <button key={item.id} onMouseEnter={somHover}
                        onClick={() => handleEquip(item)}
                        disabled={buying === item.id}
                        className={`p-2 rounded-xl border text-left transition-all active:scale-95 ${
                          isEq
                            ? 'bg-yellow-950/30 border-yellow-400/60 shadow-[0_0_10px_rgba(250,204,21,0.15)]'
                            : item.owned || isFree
                            ? 'bg-zinc-900 border-zinc-700 hover:border-zinc-500'
                            : canAfford
                            ? 'bg-zinc-900 border-zinc-800 hover:border-yellow-400/40'
                            : 'bg-zinc-900/40 border-zinc-800 opacity-50'
                        }`}>
                        {/* mini preview */}
                        <div className="flex justify-center mb-1.5">
                          <AvatarRenderer equipped={{ ...equipped, [item.category]: item }} size={56} />
                        </div>
                        <p className="text-white text-[10px] font-black leading-tight truncate">{item.name}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          {isFree ? (
                            <span className="text-[9px] text-green-400 font-black">Grátis</span>
                          ) : item.owned ? (
                            <span className="text-[9px] text-zinc-500 font-black">Possuído</span>
                          ) : (
                            <span className={`text-[9px] font-black ${canAfford ? 'text-yellow-400' : 'text-zinc-600'}`}>
                              🪙 {item.price}
                            </span>
                          )}
                          {isEq && <span className="text-[9px] text-yellow-400 font-black">✓ Ativo</span>}
                          {buying === item.id && <span className="text-[9px] text-zinc-500 animate-pulse">...</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-3 border-t border-zinc-800 flex-shrink-0">
          <button onMouseEnter={somHover} onClick={() => { somClick(); onClose(); }}
            className="w-full sm:w-auto sm:float-right px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-semibold transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
