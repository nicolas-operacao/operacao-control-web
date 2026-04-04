// AudioContext compartilhado — criado uma vez, reutilizado em todos os sons
// Evita o limite do browser de ~6 instâncias simultâneas

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!_ctx || _ctx.state === 'closed') {
      _ctx = new AudioContext();
    }
    if (_ctx.state === 'suspended') {
      _ctx.resume();
    }
    return _ctx;
  } catch {
    return null;
  }
}

function tocar(frequencia: number, tipo: OscillatorType, volume: number, duracao: number) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = tipo;
    osc.frequency.setValueAtTime(frequencia, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracao);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duracao);
  } catch { /* ignora */ }
}

/** Tick suave ao passar o mouse em cima de um botão */
export function somHover() {
  tocar(900, 'sine', 0.15, 0.07);
}

/** Beep curto ao clicar em um botão */
export function somClick() {
  tocar(600, 'square', 0.2, 0.1);
}
