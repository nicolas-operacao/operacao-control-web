import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AvatarRenderer } from '../components/AvatarRenderer';

type Item = {
  id: number;
  name: string;
  category: string;
  price: number;
  style_data: Record<string, any>;
  sort_order: number;
};

const CATS = ['background','skin','eyes','mouth','hair','clothes','hat','accessory'];
const CAT_LABELS: Record<string, string> = {
  background:'Fundo', skin:'Pele', eyes:'Olhos', mouth:'Boca',
  hair:'Cabelo', clothes:'Roupa', hat:'Chapéu', accessory:'Acessório',
};

const EMPTY: Omit<Item,'id'> = {
  name: '', category: 'background', price: 0, style_data: {}, sort_order: 99,
};

export function LojaAdmin() {
  const [items, setItems] = useState<Item[]>([]);
  const [filterCat, setFilterCat] = useState('all');
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Item,'id'>>(EMPTY);
  const [sdText, setSdText] = useState('{}');
  const [sdErr, setSdErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.get('/avatar/admin/items');
      setItems(res.data ?? []);
    } catch { flash('Erro ao carregar itens.', false); }
  }

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  }

  function openCreate() {
    setForm(EMPTY); setSdText('{}'); setSdErr('');
    setCreating(true); setEditing(null);
  }

  function openEdit(item: Item) {
    setForm({ name: item.name, category: item.category, price: item.price, style_data: item.style_data, sort_order: item.sort_order });
    setSdText(JSON.stringify(item.style_data, null, 2)); setSdErr('');
    setEditing(item); setCreating(false);
  }

  function closeForm() { setCreating(false); setEditing(null); }

  function handleSdChange(val: string) {
    setSdText(val);
    try { JSON.parse(val); setSdErr(''); } catch { setSdErr('JSON inválido'); }
  }

  async function save() {
    if (sdErr) return;
    let sd: Record<string, any>;
    try { sd = JSON.parse(sdText); } catch { setSdErr('JSON inválido'); return; }
    setSaving(true);
    const payload = { ...form, style_data: sd };
    try {
      if (creating) {
        const res = await api.post('/avatar/admin/items', payload);
        setItems(prev => [...prev, res.data]);
        flash('Item criado!', true);
      } else if (editing) {
        const res = await api.put(`/avatar/admin/items/${editing.id}`, payload);
        setItems(prev => prev.map(i => i.id === editing.id ? res.data : i));
        flash('Item atualizado!', true);
      }
      closeForm();
    } catch (e: any) {
      flash(e.response?.data?.error ?? 'Erro ao salvar.', false);
    }
    setSaving(false);
  }

  async function del(id: number) {
    if (!confirm('Deletar este item?')) return;
    setDeleting(id);
    try {
      await api.delete(`/avatar/admin/items/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      flash('Item deletado.', true);
    } catch (e: any) { flash(e.response?.data?.error ?? 'Erro ao deletar.', false); }
    setDeleting(null);
  }

  const filtered = filterCat === 'all' ? items : items.filter(i => i.category === filterCat);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-widest">🏪 Loja de Avatar</h1>
            <p className="text-zinc-500 text-xs mt-0.5">{items.length} itens cadastrados</p>
          </div>
          <button onClick={openCreate}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-xl text-sm uppercase tracking-wider transition-all active:scale-95">
            + Novo Item
          </button>
        </div>

        {/* Feedback */}
        {msg && (
          <div className={`px-4 py-2.5 rounded-xl text-sm font-bold ${
            msg.ok ? 'bg-green-950/60 border border-green-700/60 text-green-400'
                   : 'bg-red-950/60 border border-red-800/60 text-red-400'
          }`}>{msg.text}</div>
        )}

        {/* Filtro de categoria */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCat('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
              filterCat === 'all' ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}>Todos</button>
          {CATS.map(c => (
            <button key={c} onClick={() => setFilterCat(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                filterCat === c ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}>{CAT_LABELS[c]}</button>
          ))}
        </div>

        {/* Formulário de criação/edição */}
        {(creating || editing) && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
            <h3 className="font-black uppercase text-sm tracking-wider text-yellow-400">
              {creating ? '+ Novo Item' : `✏️ Editando: ${editing!.name}`}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 font-black uppercase">Nome</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/60"
                  placeholder="Ex: Coroa de Ouro" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-black uppercase">Categoria</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/60">
                  {CATS.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-black uppercase">Preço (moedas)</label>
                <input type="number" min="0" value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: Number(e.target.value) }))}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/60" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-black uppercase">Ordem</label>
                <input type="number" min="1" value={form.sort_order}
                  onChange={e => setForm(p => ({ ...p, sort_order: Number(e.target.value) }))}
                  className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/60" />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 font-black uppercase">
                style_data (JSON) — define cores e forma do item
              </label>
              <textarea value={sdText} onChange={e => handleSdChange(e.target.value)} rows={5}
                className={`mt-1 w-full bg-zinc-800 border rounded-lg px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none resize-none ${
                  sdErr ? 'border-red-600' : 'border-zinc-700 focus:border-yellow-500/60'
                }`} />
              {sdErr && <p className="text-red-400 text-[10px] mt-0.5">{sdErr}</p>}
            </div>

            {/* Preview */}
            {!sdErr && (
              <div className="flex items-center gap-3">
                <AvatarRenderer equipped={{ [form.category]: { id: 0, category: form.category, style_data: JSON.parse(sdText || '{}') } as any }} size={72} />
                <p className="text-zinc-600 text-[10px]">Preview do item isolado</p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !!sdErr || !form.name.trim()}
                className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black rounded-lg text-sm uppercase transition-all active:scale-95">
                {saving ? 'Salvando...' : '✓ Salvar'}
              </button>
              <button onClick={closeForm}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-black rounded-lg text-sm transition-all">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Tabela de itens */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-8">Nenhum item nesta categoria.</p>
          )}
          {filtered.map(item => (
            <div key={item.id}
              className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 hover:border-zinc-700 transition-all">
              <AvatarRenderer equipped={{ [item.category]: item as any }} size={52} />
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{CAT_LABELS[item.category]}</span>
                  {item.price === 0
                    ? <span className="text-[10px] text-green-400 font-black">Grátis</span>
                    : <span className="text-[10px] text-yellow-400 font-black">🪙 {item.price}</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => openEdit(item)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-all">
                  ✏️ Editar
                </button>
                <button onClick={() => del(item.id)} disabled={deleting === item.id}
                  className="px-3 py-1.5 bg-red-950/50 hover:bg-red-900/60 border border-red-800/40 text-red-400 rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                  {deleting === item.id ? '...' : '🗑️'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
