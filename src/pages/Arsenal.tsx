import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { toast } from '../services/toast';
import { somClick, somHover, somSucesso } from '../services/hudSounds';
import { BottomNav } from '../components/BottomNav';
import { ModalRegistrarVenda } from '../components/ModalRegistrarVenda';

// ─── TIPOS ─────────────────────────────────────────────────────────────────────

type Script = {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string;
  criado_por: string;
  criado_por_nome: string;
  global: boolean;
  created_at: string;
};

type PaymentLinkItem = { label: string; url: string };
type PaymentLink = {
  id: string;
  produto: string;
  descricao?: string;
  links: PaymentLinkItem[];
  created_at: string;
};

// ─── CATEGORIAS DE SCRIPTS ─────────────────────────────────────────────────────

const CATEGORIAS = ['Geral', 'Abordagem', 'Objeção', 'Fechamento', 'Pós-venda', 'Reengajamento'];
const CATEGORIA_EMOJIS: Record<string, string> = {
  'Geral': '📋',
  'Abordagem': '👋',
  'Objeção': '🛡️',
  'Fechamento': '🤝',
  'Pós-venda': '⭐',
  'Reengajamento': '🔥',
};

// ─── COMPONENTE FORM DE SCRIPT ─────────────────────────────────────────────────

function FormScript({
  inicial,
  onSalvar,
  onCancelar,
  salvando,
  isAdmin,
}: {
  inicial?: Partial<Script>;
  onSalvar: (d: { titulo: string; conteudo: string; categoria: string; global: boolean }) => void;
  onCancelar: () => void;
  salvando: boolean;
  isAdmin: boolean;
}) {
  const [titulo, setTitulo] = useState(inicial?.titulo ?? '');
  const [conteudo, setConteudo] = useState(inicial?.conteudo ?? '');
  const [categoria, setCategoria] = useState(inicial?.categoria ?? 'Geral');
  const [isGlobal, setIsGlobal] = useState(inicial?.global ?? false);

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Título do script (ex: Abordagem Inicial)"
        value={titulo}
        onChange={e => setTitulo(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 focus:border-yellow-400/60 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-600 transition-colors"
      />

      <div className="flex gap-2 flex-wrap">
        {CATEGORIAS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => { somClick(); setCategoria(c); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide transition-all ${
              categoria === c
                ? 'bg-yellow-400 text-black'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
            }`}
          >
            {CATEGORIA_EMOJIS[c]} {c}
          </button>
        ))}
      </div>

      <textarea
        placeholder="Escreva o script aqui... Use {NOME_CLIENTE} para variáveis."
        value={conteudo}
        onChange={e => setConteudo(e.target.value)}
        rows={8}
        className="w-full bg-zinc-800 border border-zinc-700 focus:border-yellow-400/60 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-600 transition-colors resize-none leading-relaxed"
      />

      {isAdmin && (
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            onClick={() => { somClick(); setIsGlobal(!isGlobal); }}
            className={`relative w-10 h-5 rounded-full transition-all ${isGlobal ? 'bg-yellow-400' : 'bg-zinc-700'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isGlobal ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <span className="text-zinc-400 text-sm font-bold">
            Script Global <span className="text-zinc-600 font-normal">(visível para todos os vendedores, não editável por eles)</span>
          </span>
        </label>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSalvar({ titulo, conteudo, categoria, global: isGlobal })}
          disabled={salvando || !titulo.trim() || !conteudo.trim()}
          className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest transition-all active:scale-95"
        >
          {salvando ? 'Salvando...' : '✓ Salvar Script'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-3 rounded-xl text-sm transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── CARD DE SCRIPT ─────────────────────────────────────────────────────────────

function CardScript({
  script,
  userId,
  isAdmin,
  onEditar,
  onDeletar,
}: {
  script: Script;
  userId: string;
  isAdmin: boolean;
  onEditar: (s: Script) => void;
  onDeletar: (id: string) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const [expandido, setExpandido] = useState(false);

  const podeEditar = isAdmin || script.criado_por === userId;
  const linhas = script.conteudo.split('\n');
  const preview = linhas.slice(0, 3).join('\n');
  const temMais = linhas.length > 3;

  function copiar() {
    navigator.clipboard.writeText(script.conteudo).then(() => {
      setCopiado(true);
      somSucesso();
      toast.success('Script copiado!');
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div className={`rounded-xl border transition-all ${
      script.global
        ? 'bg-yellow-950/10 border-yellow-500/20'
        : 'bg-zinc-900 border-zinc-800'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-base">{CATEGORIA_EMOJIS[script.categoria] ?? '📋'}</span>
            <h3 className="text-white font-black text-sm leading-tight">{script.titulo}</h3>
            {script.global && (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                ⭐ Global
              </span>
            )}
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
              {script.categoria}
            </span>
          </div>
          <p className="text-zinc-600 text-[10px]">por {script.global ? 'Admin' : script.criado_por_nome}</p>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {podeEditar && (
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); onEditar(script); }}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-yellow-400 flex items-center justify-center text-sm transition-all"
              title="Editar"
            >
              ✏️
            </button>
          )}
          {(isAdmin || script.criado_por === userId) && (
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); onDeletar(script.id); }}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-red-900/40 text-zinc-500 hover:text-red-400 flex items-center justify-center text-sm transition-all"
              title="Excluir"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="px-4 pb-3">
        <div
          className="bg-zinc-950/80 rounded-lg p-3 text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-mono border border-zinc-800/60 cursor-pointer"
          onClick={() => setExpandido(!expandido)}
        >
          {expandido ? script.conteudo : preview}
          {!expandido && temMais && (
            <span className="text-zinc-500 ml-1">...</span>
          )}
        </div>
        {temMais && (
          <button
            onClick={() => setExpandido(!expandido)}
            className="text-zinc-600 hover:text-zinc-400 text-[10px] font-black uppercase tracking-widest mt-1.5 transition-colors"
          >
            {expandido ? '▲ Ver menos' : '▼ Ver mais'}
          </button>
        )}
      </div>

      {/* Footer: botão copiar */}
      <div className="px-4 pb-4">
        <button
          onMouseEnter={somHover}
          onClick={() => { somClick(); copiar(); }}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${
            copiado
              ? 'bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.3)]'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-zinc-500'
          }`}
        >
          {copiado ? '✓ Copiado!' : '📋 Copiar Script'}
        </button>
      </div>
    </div>
  );
}

// ─── ABA SCRIPTS ──────────────────────────────────────────────────────────────

function AbaScripts({ userId, userName, isAdmin }: { userId: string; userName: string; isAdmin: boolean }) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<Script | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [catFiltro, setCatFiltro] = useState('Todos');

  useEffect(() => { fetchScripts(); }, []);

  async function fetchScripts() {
    setLoading(true);
    try {
      const res = await api.get('/scripts');
      setScripts(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar scripts.');
    } finally {
      setLoading(false);
    }
  }

  async function salvar(dados: { titulo: string; conteudo: string; categoria: string; global: boolean }) {
    if (!dados.titulo.trim() || !dados.conteudo.trim()) {
      toast.warning('Preencha título e conteúdo.');
      return;
    }
    setSalvando(true);
    try {
      if (editando) {
        await api.put(`/scripts/${editando.id}`, dados);
        toast.success('Script atualizado!');
      } else {
        await api.post('/scripts', {
          ...dados,
          criado_por: userId,
          criado_por_nome: userName,
        });
        toast.success('Script criado!');
      }
      setShowForm(false);
      setEditando(null);
      fetchScripts();
    } catch {
      toast.error('Erro ao salvar script.');
    } finally {
      setSalvando(false);
    }
  }

  async function deletar(id: string) {
    try {
      await api.delete(`/scripts/${id}`);
      setScripts(prev => prev.filter(s => s.id !== id));
      toast.success('Script removido.');
    } catch {
      toast.error('Erro ao remover script.');
    }
  }

  function abrirEditar(s: Script) {
    setEditando(s);
    setShowForm(true);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  }

  const scriptsFiltrados = useMemo(() => {
    return scripts.filter(s => {
      const matchCat = catFiltro === 'Todos' || s.categoria === catFiltro;
      const termo = busca.toLowerCase();
      const matchBusca = !busca || s.titulo.toLowerCase().includes(termo) || s.conteudo.toLowerCase().includes(termo);
      return matchCat && matchBusca;
    });
  }, [scripts, catFiltro, busca]);

  // Separa globais dos meus
  const globais = scriptsFiltrados.filter(s => s.global);
  const meus = scriptsFiltrados.filter(s => !s.global && s.criado_por === userId);
  const outrosSemGlobal = scriptsFiltrados.filter(s => !s.global && s.criado_por !== userId);

  return (
    <div className="space-y-4">
      {/* Barra de ações */}
      {!showForm && (
        <button
          onMouseEnter={somHover}
          onClick={() => { somClick(); setEditando(null); setShowForm(true); }}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-zinc-700 hover:border-yellow-400/50 rounded-xl py-4 text-zinc-500 hover:text-yellow-400 font-black text-sm uppercase tracking-widest transition-all active:scale-95"
        >
          ➕ Novo Script
        </button>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 space-y-3">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
            {editando ? '✏️ Editar Script' : '➕ Novo Script'}
          </p>
          <FormScript
            inicial={editando ?? undefined}
            onSalvar={salvar}
            onCancelar={() => { setShowForm(false); setEditando(null); }}
            salvando={salvando}
            isAdmin={isAdmin}
          />
        </div>
      )}

      {/* Filtros */}
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Buscar script..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400/40 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-600 transition-colors"
        />
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['Todos', ...CATEGORIAS].map(c => (
            <button
              key={c}
              onClick={() => { somClick(); setCatFiltro(c); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide transition-all ${
                catFiltro === c
                  ? 'bg-yellow-400 text-black'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {c === 'Todos' ? '📋 Todos' : `${CATEGORIA_EMOJIS[c]} ${c}`}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-zinc-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Scripts globais (do admin) */}
          {globais.length > 0 && (
            <div>
              <p className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                ⭐ Scripts do Comando ({globais.length})
              </p>
              <div className="space-y-3">
                {globais.map(s => (
                  <CardScript key={s.id} script={s} userId={userId} isAdmin={isAdmin} onEditar={abrirEditar} onDeletar={deletar} />
                ))}
              </div>
            </div>
          )}

          {/* Meus scripts */}
          {meus.length > 0 && (
            <div>
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                👤 Meus Scripts ({meus.length})
              </p>
              <div className="space-y-3">
                {meus.map(s => (
                  <CardScript key={s.id} script={s} userId={userId} isAdmin={isAdmin} onEditar={abrirEditar} onDeletar={deletar} />
                ))}
              </div>
            </div>
          )}

          {/* Scripts de outros (visível para admin) */}
          {isAdmin && outrosSemGlobal.length > 0 && (
            <div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                👥 Scripts da Tropa ({outrosSemGlobal.length})
              </p>
              <div className="space-y-3">
                {outrosSemGlobal.map(s => (
                  <CardScript key={s.id} script={s} userId={userId} isAdmin={isAdmin} onEditar={abrirEditar} onDeletar={deletar} />
                ))}
              </div>
            </div>
          )}

          {/* Vazio */}
          {scriptsFiltrados.length === 0 && !loading && (
            <div className="py-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">Nenhum script encontrado.</p>
              <p className="text-zinc-700 text-xs mt-1">Crie seu primeiro script acima.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE LINK DE PAGAMENTO ──────────────────────────────────────────────

function CardPaymentLink({
  pl,
  isAdmin,
  onEditar,
  onDeletar,
}: {
  pl: PaymentLink;
  isAdmin: boolean;
  onEditar: (p: PaymentLink) => void;
  onDeletar: (id: string) => void;
}) {
  const [copiados, setCopiados] = useState<Record<string, boolean>>({});

  function copiar(url: string, label: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopiados(prev => ({ ...prev, [label]: true }));
      somSucesso();
      toast.success(`Link "${label}" copiado!`);
      setTimeout(() => setCopiados(prev => ({ ...prev, [label]: false })), 2000);
    });
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-white font-black text-base leading-tight">{pl.produto}</h3>
          {pl.descricao && <p className="text-zinc-500 text-xs mt-0.5">{pl.descricao}</p>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); onEditar(pl); }}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-yellow-400 flex items-center justify-center text-sm transition-all"
          >
            ✏️
          </button>
          {isAdmin && (
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); onDeletar(pl.id); }}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-red-900/40 text-zinc-500 hover:text-red-400 flex items-center justify-center text-sm transition-all"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {(pl.links || []).map((lk, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-wide mb-0.5">{lk.label}</p>
              <p className="text-zinc-300 text-xs truncate font-mono">{lk.url}</p>
            </div>
            <button
              onMouseEnter={somHover}
              onClick={() => { somClick(); copiar(lk.url, lk.label); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${
                copiados[lk.label]
                  ? 'bg-green-500 text-black'
                  : 'bg-zinc-800 hover:bg-yellow-400 text-zinc-300 hover:text-black border border-zinc-700 hover:border-yellow-400'
              }`}
            >
              {copiados[lk.label] ? '✓' : '📋'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FORM DE LINK DE PAGAMENTO ─────────────────────────────────────────────────

function FormPaymentLink({
  inicial,
  onSalvar,
  onCancelar,
  salvando,
}: {
  inicial?: Partial<PaymentLink>;
  onSalvar: (d: { produto: string; descricao: string; links: PaymentLinkItem[] }) => void;
  onCancelar: () => void;
  salvando: boolean;
}) {
  const [produto, setProduto] = useState(inicial?.produto ?? '');
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [links, setLinks] = useState<PaymentLinkItem[]>(
    inicial?.links?.length ? inicial.links : [{ label: 'PIX', url: '' }]
  );

  function addLink() {
    setLinks(prev => [...prev, { label: '', url: '' }]);
  }
  function removeLink(i: number) {
    setLinks(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateLink(i: number, field: keyof PaymentLinkItem, value: string) {
    setLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Nome do curso/produto"
        value={produto}
        onChange={e => setProduto(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 focus:border-yellow-400/60 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-600"
      />
      <input
        type="text"
        placeholder="Descrição opcional (ex: Acesso vitalício)"
        value={descricao}
        onChange={e => setDescricao(e.target.value)}
        className="w-full bg-zinc-800 border border-zinc-700 focus:border-yellow-400/60 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-600"
      />

      <div className="space-y-2">
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Links de Pagamento</p>
        {links.map((lk, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Label (ex: PIX, Cartão)"
              value={lk.label}
              onChange={e => updateLink(i, 'label', e.target.value)}
              className="w-28 bg-zinc-800 border border-zinc-700 focus:border-yellow-400/60 text-white rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-zinc-600"
            />
            <input
              type="text"
              placeholder="URL de pagamento"
              value={lk.url}
              onChange={e => updateLink(i, 'url', e.target.value)}
              className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-yellow-400/60 text-white rounded-lg px-3 py-2.5 text-sm outline-none placeholder:text-zinc-600 font-mono"
            />
            {links.length > 1 && (
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-red-900/40 text-zinc-500 hover:text-red-400 flex items-center justify-center transition-all flex-shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addLink}
          className="w-full border border-dashed border-zinc-700 hover:border-zinc-600 rounded-lg py-2 text-zinc-600 hover:text-zinc-400 text-xs font-black uppercase tracking-widest transition-all"
        >
          + Adicionar Link
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onSalvar({ produto, descricao, links })}
          disabled={salvando || !produto.trim() || links.some(l => !l.url.trim())}
          className="flex-1 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black py-3 rounded-xl text-sm uppercase tracking-widest transition-all active:scale-95"
        >
          {salvando ? 'Salvando...' : '✓ Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black py-3 rounded-xl text-sm transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── ABA LINKS DE PAGAMENTO ────────────────────────────────────────────────────

function AbaLinks({ isAdmin }: { isAdmin: boolean }) {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editando, setEditando] = useState<PaymentLink | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');

  useEffect(() => { fetchLinks(); }, []);

  async function fetchLinks() {
    setLoading(true);
    try {
      const res = await api.get('/payment-links');
      setLinks(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Erro ao carregar links.');
    } finally {
      setLoading(false);
    }
  }

  async function salvar(dados: { produto: string; descricao: string; links: PaymentLinkItem[] }) {
    if (!dados.produto.trim()) { toast.warning('Informe o produto.'); return; }
    if (dados.links.some(l => !l.url.trim())) { toast.warning('Preencha todas as URLs.'); return; }
    setSalvando(true);
    try {
      if (editando) {
        await api.put(`/payment-links/${editando.id}`, dados);
        toast.success('Links atualizados!');
      } else {
        await api.post('/payment-links', dados);
        toast.success('Links adicionados!');
      }
      setShowForm(false);
      setEditando(null);
      fetchLinks();
    } catch {
      toast.error('Erro ao salvar links.');
    } finally {
      setSalvando(false);
    }
  }

  async function deletar(id: string) {
    try {
      await api.delete(`/payment-links/${id}`);
      setLinks(prev => prev.filter(l => l.id !== id));
      toast.success('Removido.');
    } catch {
      toast.error('Erro ao remover.');
    }
  }

  const linksFiltrados = links.filter(l =>
    !busca || l.produto.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Botão adicionar — disponível para todos */}
      {!showForm && (
        <button
          onMouseEnter={somHover}
          onClick={() => { somClick(); setEditando(null); setShowForm(true); }}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-zinc-700 hover:border-yellow-400/50 rounded-xl py-4 text-zinc-500 hover:text-yellow-400 font-black text-sm uppercase tracking-widest transition-all active:scale-95"
        >
          ➕ Adicionar Curso e Links
        </button>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-3">
            {editando ? '✏️ Editar Links' : '➕ Novo Curso'}
          </p>
          <FormPaymentLink
            inicial={editando ?? undefined}
            onSalvar={salvar}
            onCancelar={() => { setShowForm(false); setEditando(null); }}
            salvando={salvando}
          />
        </div>
      )}

      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar curso..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 focus:border-yellow-400/40 text-white rounded-xl px-4 py-3 text-sm outline-none placeholder:text-zinc-600 transition-colors"
      />

      {/* Aviso para vendedores */}
      {!isAdmin && (
        <div className="flex items-start gap-3 bg-blue-950/30 border border-blue-500/20 rounded-xl p-4">
          <span className="text-xl flex-shrink-0">💡</span>
          <p className="text-blue-300 text-xs font-bold">
            Clique em <strong>📋</strong> ao lado de qualquer link para copiar e enviar ao cliente no WhatsApp.
          </p>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-32 bg-zinc-800/40 rounded-xl animate-pulse" />)}
        </div>
      ) : linksFiltrados.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-4xl mb-3">🔗</p>
          <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">
            {isAdmin ? 'Nenhum link cadastrado.' : 'Nenhum link disponível ainda.'}
          </p>
          {isAdmin && <p className="text-zinc-700 text-xs mt-1">Adicione os links de pagamento dos cursos acima.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {linksFiltrados.map(pl => (
            <CardPaymentLink
              key={pl.id}
              pl={pl}
              isAdmin={isAdmin}
              onEditar={p => { setEditando(p); setShowForm(true); }}
              onDeletar={deletar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────

export function Arsenal() {
  const navigate = useNavigate();
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : { id: '', name: '', role: 'vendedor' };
  const isAdmin = user.role === 'admin';
  const [produtos, setProdutos] = useState<{ id: number; nome: string; valor: number }[]>([]);
  const [isModalVendaOpen, setIsModalVendaOpen] = useState(false);

  const [aba, setAba] = useState<'scripts' | 'links'>('scripts');

  useEffect(() => {
    if (user.role !== 'vendedor' && user.role !== 'admin') return;
    api.get('/products').then(r => setProdutos(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-28 md:pb-8">

      {/* Header */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-yellow-400 uppercase tracking-wider flex items-center gap-2">
              ⚡ Arsenal
            </h1>
            <p className="text-zinc-600 text-[10px] uppercase tracking-widest">Scripts & Links de Pagamento</p>
          </div>
          <button
            onMouseEnter={somHover}
            onClick={() => { somClick(); navigate(isAdmin ? '/dashboard' : '/vendas'); }}
            className="border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-white px-3 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
          >
            ← Voltar
          </button>
        </div>

        {/* Abas */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-3">
          <button
            onClick={() => { somClick(); setAba('scripts'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              aba === 'scripts'
                ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
            }`}
          >
            📋 Scripts
          </button>
          <button
            onClick={() => { somClick(); setAba('links'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
              aba === 'links'
                ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.3)]'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
            }`}
          >
            🔗 Links Pgto
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {aba === 'scripts' ? (
          <AbaScripts userId={String(user.id)} userName={user.name} isAdmin={isAdmin} />
        ) : (
          <AbaLinks isAdmin={isAdmin} />
        )}
      </div>

      {/* Modal nova venda (para o BottomNav) */}
      <ModalRegistrarVenda
        isOpen={isModalVendaOpen}
        onClose={() => setIsModalVendaOpen(false)}
        produtos={produtos}
        user={{ id: String(user.id), name: user.name }}
        onVendaRegistrada={() => setIsModalVendaOpen(false)}
      />

      <BottomNav activeTab="arsenal" onNovaVenda={() => setIsModalVendaOpen(true)} />
    </div>
  );
}
