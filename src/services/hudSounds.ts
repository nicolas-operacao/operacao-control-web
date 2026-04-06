// =============================================
// HUD SOUNDS — Sons modernos para Operação Control
// AudioContext singleton para evitar limite do browser
// =============================================

let _ctx: AudioContext | null = null;

// ── Controle de som — fonte única de verdade é o banco ───────────────────────
// _somDesativado é sincronizado pelo PainelVendedor via stats do banco
let _somDesativado = false;

export function isSomAtivo(): boolean {
  return !_somDesativado;
}

export function setSomAtivo(ativo: boolean) {
  _somDesativado = !ativo;
}

// Chamado pelo PainelVendedor ao carregar stats e no polling
export function setSomAtivoParaUsuario(_userId: string | number, ativo: boolean) {
  _somDesativado = !ativo;
}
// ─────────────────────────────────────────────────────────────────────────────

function getCtx(): AudioContext | null {
  if (!isSomAtivo()) return null;
  try {
    if (!_ctx || _ctx.state === 'closed') _ctx = new AudioContext();
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  } catch { return null; }
}

function note(
  ctx: AudioContext,
  freq: number,
  type: OscillatorType,
  startTime: number,
  duration: number,
  peakVol: number,
  peakAt = 0.01,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(peakVol, startTime + peakAt);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

/** Hover: tick suave tipo interface futurista — dois harmônicos curtos */
export function somHover() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  note(ctx, 1200, 'sine', t,        0.06, 0.06, 0.005);
  note(ctx, 2400, 'sine', t + 0.01, 0.04, 0.05, 0.005);
}

/** Click: confirmação tipo HUD militar — trio descendente rápido */
export function somClick() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  note(ctx, 880, 'sine', t,        0.12, 0.08, 0.008);
  note(ctx, 660, 'sine', t + 0.05, 0.10, 0.08, 0.008);
  note(ctx, 440, 'sine', t + 0.09, 0.14, 0.12, 0.008);
}

/** Venda aprovada: fanfarra ascendente vibrante */
export function somVendaAprovada() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  // Acorde ascendente tipo victory jingle
  note(ctx, 523, 'sine', t,        0.20, 0.18);
  note(ctx, 659, 'sine', t + 0.10, 0.20, 0.18);
  note(ctx, 784, 'sine', t + 0.20, 0.22, 0.22);
  note(ctx, 1046,'sine', t + 0.30, 0.25, 0.35);
  // Harmônico suave junto com a nota final
  note(ctx, 1568,'sine', t + 0.30, 0.10, 0.30);
}

/** Erro / cancelamento: tom descendente grave */
export function somErro() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  note(ctx, 300, 'sawtooth', t,        0.12, 0.15);
  note(ctx, 200, 'sawtooth', t + 0.12, 0.14, 0.20);
}

/** Login success: dois bipes curtos tipo "acesso liberado" */
export function somLogin() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  note(ctx, 880,  'sine', t,        0.15, 0.12);
  note(ctx, 1100, 'sine', t + 0.15, 0.18, 0.18);
}

/** Sucesso genérico: ding suave tipo confirmação */
export function somSucesso() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  note(ctx, 660, 'sine', t,        0.14, 0.12);
  note(ctx, 880, 'sine', t + 0.10, 0.16, 0.16);
}

/** Alerta / cancelamento: buzz descendente */
export function somAlerta() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  note(ctx, 320, 'sawtooth', t,        0.10, 0.12);
  note(ctx, 220, 'sawtooth', t + 0.10, 0.12, 0.18);
}

/** Level Up: trilha de ação épica — bass hit + fanfarra ascendente + shimmer final */
export function somLevelUp() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;

  // ── Bass punch ───────────────────────────────────────────
  note(ctx,  60, 'sawtooth', t,        0.40, 0.18, 0.005);
  note(ctx,  80, 'sine',     t,        0.30, 0.18, 0.005);

  // ── Batida de tambor (burst de ruído via buffer) ─────────
  try {
    const bufLen = Math.floor(ctx.sampleRate * 0.12);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(g);
    g.connect(ctx.destination);
    src.start(t);
  } catch { /* silencioso */ }

  // ── Acorde de tensão (t+0.10) ───────────────────────────
  note(ctx, 220, 'sawtooth', t + 0.10, 0.18, 0.25, 0.02);
  note(ctx, 277, 'sawtooth', t + 0.10, 0.14, 0.25, 0.02);
  note(ctx, 330, 'sawtooth', t + 0.10, 0.12, 0.25, 0.02);

  // ── Fanfarra ascendente (t+0.35) ────────────────────────
  note(ctx, 392, 'sine', t + 0.35, 0.22, 0.20, 0.01);
  note(ctx, 523, 'sine', t + 0.52, 0.24, 0.20, 0.01);
  note(ctx, 659, 'sine', t + 0.68, 0.26, 0.22, 0.01);
  note(ctx, 784, 'sine', t + 0.83, 0.30, 0.28, 0.01);

  // ── Acorde vitória + harmônicos (t+1.10) ────────────────
  note(ctx,  784, 'sine',     t + 1.10, 0.28, 0.55, 0.01);
  note(ctx,  988, 'sine',     t + 1.10, 0.20, 0.55, 0.01);
  note(ctx, 1175, 'sine',     t + 1.10, 0.16, 0.55, 0.01);
  note(ctx, 1568, 'sine',     t + 1.10, 0.10, 0.50, 0.01);
  note(ctx,  392, 'triangle', t + 1.10, 0.14, 0.55, 0.02);

  // ── Shimmer final (t+1.50) ───────────────────────────────
  note(ctx, 2093, 'sine', t + 1.50, 0.08, 0.40, 0.01);
  note(ctx, 2637, 'sine', t + 1.65, 0.06, 0.35, 0.01);
  note(ctx, 3136, 'sine', t + 1.80, 0.04, 0.30, 0.01);
}

/** Dinheiro: caixa registradora — bipe agudo + shimmer */
export function somDinheiro() {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  note(ctx, 1200, 'sine', t,        0.18, 0.10);
  note(ctx, 1600, 'sine', t + 0.06, 0.14, 0.10);
  note(ctx, 2000, 'sine', t + 0.12, 0.10, 0.14);
}
