import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { somClick, somHover } from '../services/hudSounds';

// ─── SISTEMA DE NÍVEIS (igual ao GuerraEquipes) ────────────────────────────────
const VENDAS_POR_NIVEL   = 5;
const VENDAS_POR_PATENTE = 20;
const TIER_INICIO = [0, 20, 40, 60, 80];
const PATENTES = [
  { nome: 'Iniciante', icone: '🪖', cor: '#71717a',   glow: 'rgba(113,113,122,0.4)',  corClass: 'text-zinc-400',   bg: 'bg-zinc-800',    borda: 'border-zinc-600' },
  { nome: 'Vendedor',  icone: '⚔️',  cor: '#22c55e',   glow: 'rgba(34,197,94,0.5)',    corClass: 'text-green-400',  bg: 'bg-green-950',   borda: 'border-green-700' },
  { nome: 'Veterano',  icone: '🛡️',  cor: '#3b82f6',   glow: 'rgba(59,130,246,0.5)',   corClass: 'text-blue-400',   bg: 'bg-blue-950',    borda: 'border-blue-700' },
  { nome: 'Elite',     icone: '🌟',  cor: '#facc15',   glow: 'rgba(250,204,21,0.5)',   corClass: 'text-yellow-400', bg: 'bg-yellow-950',  borda: 'border-yellow-700' },
  { nome: 'Lendário',  icone: '💎',  cor: '#a855f7',   glow: 'rgba(168,85,247,0.5)',   corClass: 'text-purple-400', bg: 'bg-purple-950',  borda: 'border-purple-600' },
];

function calcNivel(count: number) {
  const c = Math.max(0, count);
  let ti = 0;
  for (let i = TIER_INICIO.length - 1; i >= 0; i--) { if (c >= TIER_INICIO[i]) { ti = i; break; } }
  const pat = PATENTES[ti];
  const prox = ti < 4 ? PATENTES[ti + 1] : null;
  const noTier = c - TIER_INICIO[ti];
  const nivel  = Math.floor(noTier / VENDAS_POR_NIVEL) + 1;
  const xp     = noTier % VENDAS_POR_NIVEL;
  return { pat, prox, nivel, xp, xpMax: VENDAS_POR_NIVEL, ti };
}

// ─── FRASES MOTIVACIONAIS ──────────────────────────────────────────────────────
function fraseMotivacional(vendasHoje: number, posicao: number, totalVendedores: number): { texto: string; emoji: string; cor: string } {
  if (vendasHoje === 0) return { texto: 'Primeiro passo é o mais importante. Vai pra cima!', emoji: '🎯', cor: 'text-zinc-400' };
  if (vendasHoje === 1) return { texto: 'Boa abertura! Mantém o ritmo.', emoji: '⚡', cor: 'text-yellow-400' };
  if (vendasHoje >= 5) return { texto: 'Monstro! Você está dominando o campo de batalha!', emoji: '🔥', cor: 'text-orange-400' };
  if (posicao === 1)   return { texto: 'Você está no topo! Agora segura o trono.', emoji: '👑', cor: 'text-yellow-400' };
  if (posicao <= 3)    return { texto: `Top ${posicao}! Um passo do pódio mais alto.`, emoji: '🏆', cor: 'text-yellow-300' };
  if (posicao > totalVendedores - 2) return { texto: 'Hora de virar o jogo. Você consegue!', emoji: '💪', cor: 'text-red-400' };
  return { texto: 'Cada venda conta. Não para agora!', emoji: '🚀', cor: 'text-blue-400' };
}

// ─── CONQUISTAS ────────────────────────────────────────────────────────────────
type Conquista = { id: string; nome: string; desc: string; icone: string; desbloqueada: boolean };
function calcConquistas(stats: any, rankPos: number): Conquista[] {
  const mesCount  = stats?.mes?.count   ?? 0;
  const hojeCount = stats?.hoje?.count  ?? 0;
  const semCount  = stats?.semana?.count ?? 0;
  const mesValor  = stats?.mes?.valor   ?? 0;
  return [
    { id: 'first',    nome: 'Primeiro Sangue',  desc: '1ª venda aprovada',              icone: '🩸', desbloqueada: mesCount >= 1 },
    { id: 'hot',      nome: 'Dia de Fogo',       desc: '3+ vendas em um dia',            icone: '🔥', desbloqueada: hojeCount >= 3 },
    { id: 'machine',  nome: 'Máquina de Guerra', desc: '10 vendas no mês',               icone: '⚙️', desbloqueada: mesCount >= 10 },
    { id: 'weekly',   nome: 'Semana Perfeita',   desc: '10+ vendas na semana',           icone: '📅', desbloqueada: semCount >= 10 },
    { id: 'bigshot',  nome: 'Sniper',            desc: '20 vendas no mês',               icone: '🎯', desbloqueada: mesCount >= 20 },
    { id: 'top3',     nome: 'Pódio',             desc: 'Top 3 no ranking',               icone: '🏆', desbloqueada: rankPos > 0 && rankPos <= 3 },
    { id: 'leader',   nome: 'General',           desc: '1º lugar no ranking',            icone: '👑', desbloqueada: rankPos === 1 },
    { id: 'rich',     nome: 'Cofre de Ouro',     desc: 'R$ 10.000+ vendidos no mês',    icone: '💰', desbloqueada: mesValor >= 10000 },
    { id: 'ultra',    nome: 'Lendário',          desc: 'R$ 50.000+ vendidos no mês',    icone: '💎', desbloqueada: mesValor >= 50000 },
  ];
}

// ─── TIPOS ─────────────────────────────────────────────────────────────────────
type Stats = {
  hoje:  { valor: number; count: number };
  semana:{ valor: number; count: number };
  mes:   { valor: number; count: number };
  ultimos7dias: { label: string; valor: number; count: number }[];
  ultimos6meses?: { label: string; valor: number; count: number }[];
};

interface Props {
  userId: string;
  userName: string;
  equipe: string;
}

// ─── SKELETON ──────────────────────────────────────────────────────────────────
function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

export function PainelVendedor({ userId, userName, equipe }: Props) {
  const [stats, setStats]     = useState<Stats | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const isB = (equipe || '').trim().toUpperCase() === 'B';
  const corEquipe = isB ? '#ef4444' : '#3b82f6';
  const corEquipeClass = isB ? 'text-red-400' : 'text-blue-400';
  const corBorderClass = isB ? 'border-red-700/50' : 'border-blue-700/50';
  const corBgClass = isB ? 'bg-red-950/30' : 'bg-blue-950/30';
  const nomeEquipe = isB ? 'Equipe B 🔴' : 'Equipe A ⚡';

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, rankRes] = await Promise.all([
          api.get(`/sellers/${userId}/stats`),
          api.get('/ranking'),
        ]);
        setStats(statsRes.data);
        setRanking(Array.isArray(rankRes.data) ? rankRes.data : (rankRes.data?.data ?? []));
      } catch { /* silencioso */ }
      finally { setLoading(false); }
    }
    load();
  }, [userId]);

  const { nivelInfo, rankPos, mesmaEquipe, lider, deltaPrimeiro, conquistas, frase } = useMemo(() => {
    const mesCount = stats?.mes?.count ?? 0;
    const nivelInfo = calcNivel(mesCount);

    // Ranking da equipe do vendedor
    const meusDados = ranking.find(r => String(r.id) === String(userId));
    const meuTotal  = meusDados?.total_vendido ?? 0;

    // Posição geral
    const sortedGeral = [...ranking].sort((a, b) => b.total_vendido - a.total_vendido);
    const rankPos = sortedGeral.findIndex(r => String(r.id) === String(userId)) + 1;

    // Mesma equipe (ranking filtrado)
    const mesmaEquipe = ranking.filter(r => {
      const eq = (r.equipe || '').toUpperCase().replace('EQUIPE ', '');
      const minha = (equipe || '').toUpperCase().replace('EQUIPE ', '');
      return eq === minha;
    }).sort((a, b) => b.total_vendido - a.total_vendido);

    const lider = sortedGeral[0] ?? null;
    const deltaPrimeiro = lider ? Math.max(0, lider.total_vendido - meuTotal) : 0;

    const conquistas = calcConquistas(stats, rankPos);
    const frase = fraseMotivacional(stats?.hoje?.count ?? 0, rankPos, ranking.length);

    return { nivelInfo, rankPos, mesmaEquipe, lider, deltaPrimeiro, conquistas, frase };
  }, [stats, ranking, userId, equipe]);

  // ─── BARRA 7 DIAS ──────────────────────────────────────────────────────────
  const dias7 = stats?.ultimos7dias ?? [];
  const maxDia = Math.max(...dias7.map(d => d.valor), 1);

  if (loading) return (
    <div className="space-y-4 mb-8">
      <Sk className="h-32 w-full" />
      <div className="grid grid-cols-3 gap-3"><Sk className="h-20" /><Sk className="h-20" /><Sk className="h-20" /></div>
      <Sk className="h-40 w-full" />
    </div>
  );

  return (
    <div className="space-y-4 mb-8">

      {/* ── HERO: Patente + Frase ── */}
      <div
        className="relative rounded-2xl overflow-hidden border p-5 md:p-6"
        style={{ borderColor: nivelInfo.pat.cor + '40', boxShadow: `0 0 30px ${nivelInfo.pat.glow}20` }}
      >
        {/* Fundo sutil */}
        <div className="absolute inset-0 opacity-5" style={{ background: `radial-gradient(ellipse at top left, ${nivelInfo.pat.cor}, transparent 60%)` }} />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">

          {/* Ícone + patente */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-4xl sm:text-5xl flex-shrink-0"
              style={{ background: `${nivelInfo.pat.cor}15`, border: `2px solid ${nivelInfo.pat.cor}50`, boxShadow: `0 0 20px ${nivelInfo.pat.glow}` }}
            >
              {nivelInfo.pat.icone}
            </div>

            <div className="min-w-0">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Sua Patente</p>
              <h2 className="text-2xl sm:text-3xl font-black leading-tight" style={{ color: nivelInfo.pat.cor }}>
                {nivelInfo.pat.nome}
              </h2>
              <p className="text-zinc-400 text-xs font-bold mt-0.5">
                Nível {nivelInfo.nivel} · {stats?.mes?.count ?? 0} vendas este mês
              </p>

              {/* Barra de XP */}
              <div className="mt-2 w-48 sm:w-64">
                <div className="flex justify-between text-[10px] font-black uppercase text-zinc-600 mb-1">
                  <span>{nivelInfo.xp}/{nivelInfo.xpMax} para nível {nivelInfo.nivel + 1}</span>
                  {nivelInfo.prox && <span style={{ color: nivelInfo.prox.cor }}>{nivelInfo.prox.icone} {nivelInfo.prox.nome}</span>}
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-1000"
                    style={{
                      width: `${(nivelInfo.xp / nivelInfo.xpMax) * 100}%`,
                      background: `linear-gradient(90deg, ${nivelInfo.pat.cor}80, ${nivelInfo.pat.cor})`,
                      boxShadow: `0 0 8px ${nivelInfo.pat.glow}`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-zinc-700 mt-1">
                  {nivelInfo.xpMax - nivelInfo.xp} venda{nivelInfo.xpMax - nivelInfo.xp !== 1 ? 's' : ''} para o próximo nível
                </p>
              </div>
            </div>
          </div>

          {/* Frase + ranking */}
          <div className="flex flex-col items-start sm:items-end gap-2 sm:text-right">
            <div className={`px-3 py-1.5 rounded-lg border ${corBorderClass} ${corBgClass}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${corEquipeClass}`}>{nomeEquipe}</p>
            </div>
            {rankPos > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">{rankPos === 1 ? '👑' : rankPos <= 3 ? '🏆' : '🎖️'}</span>
                <div>
                  <p className="text-zinc-500 text-[10px] font-black uppercase">Ranking Geral</p>
                  <p className="text-white font-black text-lg">{rankPos}º lugar</p>
                </div>
              </div>
            )}
            <p className={`text-xs font-bold italic ${frase.cor} flex items-center gap-1`}>
              <span>{frase.emoji}</span> {frase.texto}
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards: Hoje / Semana / Mês ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Hoje', valor: stats?.hoje?.valor ?? 0, count: stats?.hoje?.count ?? 0, cor: 'yellow', emoji: '⚡' },
          { label: 'Semana', valor: stats?.semana?.valor ?? 0, count: stats?.semana?.count ?? 0, cor: 'blue', emoji: '📅' },
          { label: 'Mês', valor: stats?.mes?.valor ?? 0, count: stats?.mes?.count ?? 0, cor: 'green', emoji: '🗓️' },
        ].map(({ label, valor, count, cor, emoji }) => (
          <div key={label} className={`rounded-xl border p-3 md:p-4 relative overflow-hidden ${
            cor === 'yellow' ? 'bg-yellow-950/20 border-yellow-800/40' :
            cor === 'blue'   ? 'bg-blue-950/20 border-blue-800/40' :
                               'bg-green-950/20 border-green-800/40'
          }`}>
            <div className="absolute top-2 right-2 text-2xl opacity-10">{emoji}</div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-base md:text-xl font-black leading-tight ${
              cor === 'yellow' ? 'text-yellow-400' : cor === 'blue' ? 'text-blue-400' : 'text-green-400'
            }`}>{fmt(valor)}</p>
            <p className="text-zinc-600 text-[10px] font-bold mt-1">{count} venda{count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* ── Delta do 1º lugar + posição na equipe ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* vs Líder */}
        {lider && String(lider.id) !== String(userId) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow-950 border-2 border-yellow-400/50 flex items-center justify-center text-2xl flex-shrink-0">
              👑
            </div>
            <div className="min-w-0">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Distância do Líder</p>
              <p className="text-white font-black truncate">{lider.nome}</p>
              <p className="text-red-400 font-black text-base">{fmt(deltaPrimeiro)} atrás</p>
            </div>
          </div>
        )}

        {lider && String(lider.id) === String(userId) && (
          <div className="bg-yellow-950/20 border border-yellow-400/40 rounded-xl p-4 flex items-center gap-4 shadow-[0_0_20px_rgba(250,204,21,0.1)]">
            <span className="text-4xl">👑</span>
            <div>
              <p className="text-yellow-400 font-black uppercase tracking-widest text-sm">Você é o Líder!</p>
              <p className="text-zinc-400 text-xs">Segura o trono, guerreiro.</p>
            </div>
          </div>
        )}

        {/* Posição na equipe */}
        <div className={`rounded-xl border p-4 ${corBgClass} ${corBorderClass}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${corEquipeClass}`}>Sua {nomeEquipe}</p>
          <div className="space-y-1.5">
            {mesmaEquipe.slice(0, 4).map((v, i) => {
              const isMe = String(v.id) === String(userId);
              return (
                <div key={v.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${isMe ? 'bg-white/10 ring-1 ring-white/20' : ''}`}>
                  <span className="text-zinc-600 text-[10px] font-black w-4">{i + 1}º</span>
                  <span className={`text-xs font-bold flex-1 truncate ${isMe ? 'text-white' : 'text-zinc-400'}`}>{isMe ? '⚡ ' : ''}{v.nome}</span>
                  <span className={`text-xs font-black ${isMe ? corEquipeClass : 'text-zinc-500'}`}>
                    {fmt(v.total_vendido)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Gráfico 7 dias ── */}
      {dias7.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5">
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-4">📊 Últimos 7 dias</p>
          <div className="flex items-end gap-2 h-24">
            {dias7.map(({ label, valor, count }) => {
              const pct = maxDia > 0 ? (valor / maxDia) * 100 : 0;
              const hasData = valor > 0;
              const isBest = valor === maxDia && valor > 0;
              return (
                <div key={label} className="flex-1 flex flex-col items-center gap-1 group relative">
                  {hasData && (
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-[9px] font-black whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                      <span className="text-yellow-400 block">{fmt(valor)}</span>
                      <span className="text-zinc-400">{count}x</span>
                    </div>
                  )}
                  <div className="w-full flex items-end" style={{ height: '80px' }}>
                    <div
                      className="w-full rounded-t-sm transition-all duration-700"
                      style={{
                        height: `${Math.max(hasData ? pct : 2, hasData ? 8 : 2)}%`,
                        background: isBest ? corEquipe : hasData ? corEquipe + '60' : '#27272a',
                        boxShadow: isBest ? `0 -4px 12px ${corEquipe}60` : 'none',
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-bold text-zinc-600">{label.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Conquistas ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 md:p-5">
        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-4">🏅 Conquistas do Mês</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {conquistas.map(c => (
            <div
              key={c.id}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                c.desbloqueada
                  ? 'bg-yellow-950/30 border-yellow-400/40 shadow-[0_0_12px_rgba(250,204,21,0.15)]'
                  : 'bg-zinc-950 border-zinc-800 opacity-40 grayscale'
              }`}
              title={c.desc}
            >
              <span className="text-2xl">{c.icone}</span>
              <span className={`text-[9px] font-black uppercase leading-tight ${c.desbloqueada ? 'text-yellow-400' : 'text-zinc-600'}`}>
                {c.nome}
              </span>
              {c.desbloqueada && <span className="text-[8px] text-zinc-500">{c.desc}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Meta Diária gamificada ── */}
      {(() => {
        const vendas = stats?.hoje?.count ?? 0;
        const metas = [3, 5, 10];
        const metaAtual = metas.find(m => vendas < m) ?? metas[metas.length - 1];
        const pct = Math.min((vendas / metaAtual) * 100, 100);
        const atingiu = vendas >= metaAtual;
        return (
          <div className={`rounded-xl border p-4 md:p-5 ${atingiu ? 'bg-green-950/20 border-green-400/30 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                🎯 Meta do Dia
              </p>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${atingiu ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-zinc-800 text-zinc-500'}`}>
                {vendas} / {metaAtual} vendas
              </span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-3 rounded-full transition-all duration-1000"
                style={{
                  width: `${pct}%`,
                  background: atingiu
                    ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                    : `linear-gradient(90deg, ${corEquipe}80, ${corEquipe})`,
                  boxShadow: atingiu ? '0 0 10px rgba(34,197,94,0.5)' : undefined,
                }}
              />
            </div>
            <p className={`text-xs font-bold ${atingiu ? 'text-green-400' : 'text-zinc-500'}`}>
              {atingiu
                ? `🎉 Meta atingida! Você já fez ${vendas} vendas hoje — continua!`
                : `Faltam ${metaAtual - vendas} venda${metaAtual - vendas !== 1 ? 's' : ''} para atingir a meta de ${metaAtual}`}
            </p>
          </div>
        );
      })()}

    </div>
  );
}
