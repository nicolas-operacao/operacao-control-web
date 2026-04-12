// AvatarRenderer — Personagem corpo inteiro estilo cartoon 3D

interface AvatarItem {
  id: number;
  category: string;
  style_data: Record<string, any>;
}

export interface AvatarEquipped {
  background?: AvatarItem | null;
  skin?: AvatarItem | null;
  eyes?: AvatarItem | null;
  mouth?: AvatarItem | null;
  hair?: AvatarItem | null;
  clothes?: AvatarItem | null;
  hat?: AvatarItem | null;
  accessory?: AvatarItem | null;
}

interface Props {
  equipped: AvatarEquipped;
  size?: number;
  className?: string;
}

const DEFAULT: Record<string, Record<string, any>> = {
  background: { type: 'office',   colors: ['#1a2744', '#0f172a'] },
  skin:       { faceColor: '#F5C5A3', shadeColor: '#D4977A', lightColor: '#FFE0C4' },
  eyes:       { shape: 'round',   color: '#3d2b1f', browColor: '#2c1810' },
  mouth:      { shape: 'smile',   color: '#b03030', lipTop: '#e06060' },
  hair:       { style: 'short',   color: '#2c1810' },
  clothes:    { style: 'polo',    color: '#1d3461', color2: '#152845', badge: '#c8a951', collar: '#ffffff' },
  hat:        { style: 'none',    color: '#1d3461' },
  accessory:  { style: 'none',    color: '#4b5563' },
};

function sd(eq: AvatarEquipped, key: keyof AvatarEquipped) {
  return eq[key]?.style_data ?? DEFAULT[key];
}

let _uid = 0;

// viewBox: 0 0 100 150 — proporção retrato corpo inteiro
export function AvatarRenderer({ equipped, size = 80, className = '' }: Props) {
  const uid = `a${++_uid}`;
  const bg = sd(equipped, 'background');
  const sk = sd(equipped, 'skin');
  const ey = sd(equipped, 'eyes');
  const mo = sd(equipped, 'mouth');
  const ha = sd(equipped, 'hair');
  const cl = sd(equipped, 'clothes');
  const ht = sd(equipped, 'hat');
  const ac = sd(equipped, 'accessory');

  const F  = sk.faceColor  ?? '#F5C5A3';
  const S  = sk.shadeColor ?? '#D4977A';
  const L  = sk.lightColor ?? '#FFE0C4';

  const W = 100;
  const H = 150;
  const displayH = Math.round(size * (H / W));

  return (
    <svg
      width={size} height={displayH}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ borderRadius: '12px', flexShrink: 0, display: 'block' }}
    >
      <defs>
        <radialGradient id={`skF${uid}`} cx="38%" cy="32%" r="65%">
          <stop offset="0%"   stopColor={L} />
          <stop offset="50%"  stopColor={F} />
          <stop offset="100%" stopColor={S} />
        </radialGradient>
        <linearGradient id={`skN${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={S} />
          <stop offset="40%"  stopColor={F} />
          <stop offset="100%" stopColor={S} />
        </linearGradient>
        <linearGradient id={`skL${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={F} />
          <stop offset="100%" stopColor={S} />
        </linearGradient>
        <clipPath id={`cp${uid}`}>
          <rect width={W} height={H} rx="12" ry="12" />
        </clipPath>
      </defs>

      <g clipPath={`url(#cp${uid})`}>

        {/* ── CENÁRIO / FUNDO ── */}
        <SceneBackground bg={bg} uid={uid} W={W} H={H} />

        {/* ── SOMBRA NO CHÃO ── */}
        <ellipse cx="50" cy="145" rx="20" ry="3.5" fill="rgba(0,0,0,0.35)" />

        {/* ── CORPO INTEIRO ── */}
        <FullBody cl={cl} sk={sk} ha={ha} ht={ht} ey={ey} mo={mo} ac={ac} uid={uid} F={F} S={S} L={L} />

      </g>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CENÁRIOS DE FUNDO
═══════════════════════════════════════════════════════════════ */
function SceneBackground({ bg, uid, W, H }: { bg: any; uid: string; W: number; H: number }) {
  switch (bg.type) {

    case 'office': return (
      <g>
        {/* Parede */}
        <rect width={W} height={H * 0.72} fill="#1a2744" />
        <rect width={W} height={H * 0.72} fill="url(#offWall)" />
        <defs>
          <linearGradient id="offWall" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#243060" />
            <stop offset="100%" stopColor="#111827" />
          </linearGradient>
        </defs>
        {/* Faixa decorativa parede */}
        <rect x="0" y={H * 0.15} width={W} height="1.5" fill="rgba(255,255,255,0.06)" />
        {/* Janela */}
        <rect x="62" y="8" width="28" height="20" rx="2" fill="#0ea5e9" opacity="0.25" />
        <rect x="62" y="8" width="28" height="20" rx="2" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        <line x1="76" y1="8" x2="76" y2="28" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
        <line x1="62" y1="18" x2="90" y2="18" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
        {/* Chão */}
        <rect x="0" y={H * 0.72} width={W} height={H * 0.28} fill="#0f172a" />
        <rect x="0" y={H * 0.72} width={W} height="2" fill="rgba(255,255,255,0.07)" />
        {/* Reflexo no chão */}
        <ellipse cx="50" cy={H * 0.78} rx="35" ry="4" fill="rgba(255,255,255,0.03)" />
      </g>
    );

    case 'stars': return (
      <g>
        <rect width={W} height={H} fill={bg.colors?.[0] ?? '#030712'} />
        {[[8,6],[22,4],[40,8],[60,5],[78,10],[90,4],[95,18],[85,28],[12,22],[30,32],[55,18],[72,25],[18,40],[45,35],[88,42],[5,55],[25,58],[65,48],[92,60],[10,72],[35,68],[58,62],[80,70],[15,85],[48,80],[75,88],[3,95],[28,92],[62,96],[85,100]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r={i%4===0?1.4:i%3===0?1.0:0.6} fill="white" opacity={0.3+i%5*0.13} />
        ))}
        {/* Nebulosa sutil */}
        <ellipse cx="70" cy="25" rx="25" ry="15" fill="#4f46e5" opacity="0.08" />
        <ellipse cx="20" cy="60" rx="20" ry="12" fill="#7c3aed" opacity="0.06" />
        {/* Chão */}
        <rect x="0" y={H * 0.72} width={W} height={H * 0.28} fill="#060818" />
        <rect x="0" y={H * 0.72} width={W} height="1.5" fill="rgba(139,92,246,0.2)" />
      </g>
    );

    case 'arena': return (
      <g>
        <defs>
          <linearGradient id={`arG${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0000" />
            <stop offset="60%" stopColor="#3d0000" />
            <stop offset="100%" stopColor="#1a0000" />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#arG${uid})`} />
        {/* Raios de luz */}
        {[15,30,50,70,85].map((x,i) => (
          <path key={i} d={`M ${x} 0 L ${x-8} ${H*0.72} L ${x+8} ${H*0.72} Z`}
            fill="rgba(255,100,0,0.04)" />
        ))}
        {/* Grade no chão */}
        <rect x="0" y={H * 0.72} width={W} height={H * 0.28} fill="#0d0000" />
        <rect x="0" y={H * 0.72} width={W} height="2" fill="rgba(239,68,68,0.4)" />
        {[10,20,30,40,50,60,70,80,90].map(x => (
          <line key={x} x1={x} y1={H*0.72} x2={x} y2={H} stroke="rgba(239,68,68,0.08)" strokeWidth="0.5" />
        ))}
        {/* Partículas */}
        {[[15,50],[40,30],[75,45],[88,20],[8,35],[55,15]].map(([x,y],i) => (
          <circle key={i} cx={x} cy={y} r="1" fill="#ef4444" opacity={0.3+i*0.08} />
        ))}
      </g>
    );

    case 'nature': return (
      <g>
        <defs>
          <linearGradient id={`skyG${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0c4a6e" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <rect width={W} height={H * 0.72} fill={`url(#skyG${uid})`} />
        {/* Sol */}
        <circle cx="80" cy="18" r="10" fill="#fbbf24" opacity="0.9" />
        <circle cx="80" cy="18" r="14" fill="#fbbf24" opacity="0.2" />
        {/* Nuvens */}
        <ellipse cx="20" cy="20" rx="12" ry="5" fill="white" opacity="0.7" />
        <ellipse cx="28" cy="17" rx="8" ry="5" fill="white" opacity="0.7" />
        <ellipse cx="55" cy="12" rx="10" ry="4" fill="white" opacity="0.5" />
        {/* Montanhas */}
        <path d="M 0 78 L 18 45 L 36 78 Z" fill="#065f46" opacity="0.8" />
        <path d="M 25 78 L 48 38 L 70 78 Z" fill="#064e3b" />
        <path d="M 55 78 L 75 50 L 100 78 Z" fill="#065f46" opacity="0.9" />
        {/* Chão/grama */}
        <rect x="0" y={H * 0.72} width={W} height={H * 0.28} fill="#14532d" />
        <rect x="0" y={H * 0.72} width={W} height="3" fill="#16a34a" />
      </g>
    );

    case 'neon': return (
      <g>
        <rect width={W} height={H} fill="#050510" />
        {/* Grade perspectiva */}
        {[0,10,20,30,40,50,60,70,80,90,100].map(x => (
          <line key={`v${x}`} x1={x} y1={0} x2={50} y2={H*0.72}
            stroke="#a855f7" strokeWidth="0.4" opacity="0.15" />
        ))}
        {[0.2,0.35,0.5,0.62,0.72].map((t,i) => (
          <line key={`h${i}`} x1={0} y1={H*t} x2={W} y2={H*t}
            stroke="#a855f7" strokeWidth="0.4" opacity="0.15" />
        ))}
        {/* Brilhos neon */}
        <ellipse cx="15" cy="30" rx="12" ry="4" fill="#a855f7" opacity="0.12" />
        <ellipse cx="85" cy="20" rx="10" ry="3" fill="#06b6d4" opacity="0.15" />
        <path d="M 0 0 L 0 40" stroke="#06b6d4" strokeWidth="1.5" opacity="0.3" />
        <path d="M 100 0 L 100 50" stroke="#a855f7" strokeWidth="1.5" opacity="0.3" />
        {/* Chão neon */}
        <rect x="0" y={H * 0.72} width={W} height={H * 0.28} fill="#030308" />
        <rect x="0" y={H * 0.72} width={W} height="1.5" fill="#a855f7" opacity="0.6" />
        <ellipse cx="50" cy={H * 0.75} rx="40" ry="4" fill="#a855f7" opacity="0.06" />
      </g>
    );

    case 'gradient': return (
      <g>
        <defs>
          <linearGradient id={`bgG${uid}`} x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%"   stopColor={bg.colors?.[0] ?? '#1e293b'} />
            <stop offset="100%" stopColor={bg.colors?.[1] ?? '#0f172a'} />
          </linearGradient>
        </defs>
        <rect width={W} height={H} fill={`url(#bgG${uid})`} />
        <rect x="0" y={H * 0.72} width={W} height={H * 0.28} fill="rgba(0,0,0,0.3)" />
        <rect x="0" y={H * 0.72} width={W} height="1.5" fill="rgba(255,255,255,0.08)" />
      </g>
    );

    default: return (
      <g>
        <rect width={W} height={H} fill={bg.colors?.[0] ?? '#1e293b'} />
        <rect x="0" y={H * 0.72} width={W} height={H * 0.28} fill="rgba(0,0,0,0.25)" />
        <rect x="0" y={H * 0.72} width={W} height="1.5" fill="rgba(255,255,255,0.07)" />
      </g>
    );
  }
}

/* ═══════════════════════════════════════════════════════════════
   CORPO INTEIRO
   Cabeça centro: (50, 30), r~18
   Pescoço: y 47-54
   Torso: y 54-95
   Braços: y 54-88
   Pernas: y 95-138
   Pés: y 138-146
═══════════════════════════════════════════════════════════════ */
function FullBody({ cl, sk, ha, ht, ey, mo, ac, uid, F, S, L }: {
  cl: any; sk: any; ha: any; ht: any; ey: any; mo: any; ac: any;
  uid: string; F: string; S: string; L: string;
}) {
  const CC  = cl.color  ?? '#1d3461';
  const CC2 = cl.color2 ?? '#152845';
  const pantColor  = cl.pantColor  ?? '#1e293b';
  const pantColor2 = cl.pantColor2 ?? '#0f172a';
  const shoeColor  = cl.shoeColor  ?? '#1c1c2e';

  return (
    <g>
      {/* ── PERNAS ── */}
      <Legs pant={pantColor} pant2={pantColor2} shoe={shoeColor} skin={F} />

      {/* ── BRAÇO ESQUERDO (atrás do corpo) ── */}
      <ArmLeft cl={cl} F={F} S={S} />

      {/* ── TORSO ── */}
      <Torso cl={cl} F={F} S={S} uid={uid} />

      {/* ── BRAÇO DIREITO (na frente) ── */}
      <ArmRight cl={cl} F={F} S={S} />

      {/* ── PESCOÇO ── */}
      <path d="M 44,47 Q 50,51 56,47 L 57,55 Q 50,58 43,55 Z"
        fill={`url(#skN${uid})`} />

      {/* ── ORELHAS ── */}
      <ellipse cx="31" cy="30" rx="5"   ry="6.5" fill={F} />
      <ellipse cx="31" cy="30" rx="2.8" ry="3.8" fill={S} opacity="0.4" />
      <ellipse cx="69" cy="30" rx="5"   ry="6.5" fill={F} />
      <ellipse cx="69" cy="30" rx="2.8" ry="3.8" fill={S} opacity="0.4" />

      {/* ── CABELO ATRÁS (long) ── */}
      {ha.style === 'long' && <HairBack h={ha} />}

      {/* ── CABEÇA ── */}
      <path
        d="M 50,11 C 72,11 74,22 73,32 C 71,42 64,48 50,48
           C 36,48 29,42 27,32 C 26,22 28,11 50,11 Z"
        fill={`url(#skF${uid})`}
      />
      {/* Sombra lateral rosto */}
      <ellipse cx="62" cy="36" rx="13" ry="9" fill={S} opacity="0.14" />
      {/* Bochechas */}
      <ellipse cx="35" cy="36" rx="7" ry="4.5" fill="#d05050" opacity="0.09" />
      <ellipse cx="65" cy="36" rx="7" ry="4.5" fill="#d05050" opacity="0.09" />

      {/* ── SOBRANCELHAS ── */}
      <Eyebrows e={ey} />

      {/* ── OLHOS ── */}
      <Eyes e={ey} />

      {/* ── NARIZ ── */}
      <g>
        <path d="M 47,30 Q 48,36 47,39" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M 45.5,39 Q 50,43 54.5,39" stroke={S} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <circle cx="46.5" cy="39.5" r="1" fill={S} opacity="0.55" />
        <circle cx="53.5" cy="39.5" r="1" fill={S} opacity="0.55" />
      </g>

      {/* ── BOCA ── */}
      <Mouth m={mo} />

      {/* ── CABELO FRENTE ── */}
      {ha.style !== 'long' ? <Hair h={ha} /> : <HairFront h={ha} />}

      {/* ── CHAPÉU ── */}
      {ht.style !== 'none' && <Hat h={ht} />}

      {/* ── ACESSÓRIO ── */}
      {ac.style !== 'none' && <Accessory a={ac} />}
    </g>
  );
}

/* ─── PERNAS ────────────────────────────────────────────────── */
function Legs({ pant, pant2, shoe, skin }: { pant: string; pant2: string; shoe: string; skin: string }) {
  return (
    <g>
      {/* Calça esquerda */}
      <path d="M 36,94 L 34,128 Q 34,132 40,133 L 44,133 Q 46,132 46,128 L 46,94 Z" fill={pant} />
      <path d="M 37,94 L 35,128 Q 35,131 40,132 L 43,132 Q 45,131 46,128 L 47,94 Z" fill={pant2} opacity="0.5" />
      {/* Calça direita */}
      <path d="M 54,94 L 54,128 Q 54,132 56,133 L 60,133 Q 66,132 66,128 L 64,94 Z" fill={pant} />
      <path d="M 55,94 L 55,128 Q 55,131 57,132 L 60,132 Q 64,131 65,128 L 64,94 Z" fill={pant2} opacity="0.5" />
      {/* Divisão entre pernas */}
      <line x1="50" y1="94" x2="50" y2="128" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
      {/* Sapato esquerdo */}
      <path d="M 32,133 Q 31,140 33,143 Q 37,146 44,145 Q 48,144 48,141 L 46,133 Z" fill={shoe} />
      <path d="M 33,136 Q 37,134 45,136" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />
      <ellipse cx="37" cy="142" rx="4" ry="1.5" fill="rgba(255,255,255,0.07)" />
      {/* Sapato direito */}
      <path d="M 54,133 L 52,141 Q 52,144 56,145 Q 63,146 67,143 Q 69,140 68,133 Z" fill={shoe} />
      <path d="M 55,136 Q 59,134 67,136" stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />
      <ellipse cx="63" cy="142" rx="4" ry="1.5" fill="rgba(255,255,255,0.07)" />
    </g>
  );
}

/* ─── BRAÇO ESQUERDO ─────────────────────────────────────────── */
function ArmLeft({ cl, F, S }: { cl: any; F: string; S: string }) {
  const CC = cl.color ?? '#1d3461';
  return (
    <g>
      {/* Manga */}
      <path d="M 36,56 Q 26,60 22,74 Q 20,82 24,86 Q 28,90 32,88 Q 34,86 35,82 L 38,68 Z" fill={CC} />
      {/* Punho/mão */}
      <path d="M 24,84 Q 20,88 22,92 Q 24,96 28,95 Q 32,94 33,90 L 32,86 Z" fill={F} />
      <ellipse cx="27" cy="92" rx="4.5" ry="3.5" fill={F} />
      <path d="M 23,90 Q 27,94 32,91" stroke={S} strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ─── BRAÇO DIREITO ──────────────────────────────────────────── */
function ArmRight({ cl, F, S }: { cl: any; F: string; S: string }) {
  const CC = cl.color ?? '#1d3461';
  return (
    <g>
      {/* Manga */}
      <path d="M 64,56 Q 74,60 78,74 Q 80,82 76,86 Q 72,90 68,88 Q 66,86 65,82 L 62,68 Z" fill={CC} />
      {/* Punho/mão */}
      <path d="M 76,84 Q 80,88 78,92 Q 76,96 72,95 Q 68,94 67,90 L 68,86 Z" fill={F} />
      <ellipse cx="73" cy="92" rx="4.5" ry="3.5" fill={F} />
      <path d="M 77,90 Q 73,94 68,91" stroke={S} strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ─── TORSO ──────────────────────────────────────────────────── */
function Torso({ cl, F, S, uid }: { cl: any; F: string; S: string; uid: string }) {
  const CC  = cl.color  ?? '#1d3461';
  const CC2 = cl.color2 ?? '#152845';
  const badge  = cl.badge  ?? '#c8a951';
  const collar = cl.collar ?? '#ffffff';

  switch (cl.style) {

    case 'suit':
      return (
        <g>
          {/* Corpo do terno */}
          <path d="M 29,54 Q 35,52 50,52 Q 65,52 71,54 L 69,95 L 31,95 Z" fill="#1e293b" />
          {/* Lapelas */}
          <path d="M 38,54 L 44,70 L 50,64 L 50,52 Q 42,52 38,54 Z" fill="white" opacity="0.9" />
          <path d="M 62,54 L 56,70 L 50,64 L 50,52 Q 58,52 62,54 Z" fill="white" opacity="0.9" />
          {/* Gravata */}
          <path d="M 47,60 L 53,60 L 55,85 L 50,90 L 45,85 Z" fill="#dc2626" />
          <path d="M 48,60 L 50,72" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" fill="none" />
          {/* Botões */}
          {[68,74,80].map(y => <circle key={y} cx="50" cy={y} r="1.2" fill="rgba(255,255,255,0.3)" />)}
          {/* Sombra lateral */}
          <path d="M 69,54 L 71,95 L 65,95 L 67,54 Z" fill="rgba(0,0,0,0.15)" />
        </g>
      );

    case 'hoodie':
      return (
        <g>
          <path d="M 29,54 Q 35,50 50,50 Q 65,50 71,54 L 69,95 L 31,95 Z" fill={CC} />
          {/* Capuz */}
          <path d="M 32,54 Q 33,44 50,43 Q 67,44 68,54 Q 60,50 50,50 Q 40,50 32,54 Z" fill={CC2} />
          {/* Bolso canguru */}
          <rect x="38" y="76" width="24" height="15" rx="4" fill={CC2} />
          <line x1="50" y1="76" x2="50" y2="91" stroke={CC} strokeWidth="0.8" opacity="0.5" />
          {/* Zíper */}
          <line x1="50" y1="52" x2="50" y2="76" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
          {/* Sombra */}
          <path d="M 67,54 L 69,95 L 64,95 L 66,54 Z" fill="rgba(0,0,0,0.12)" />
        </g>
      );

    case 'shirt':
      return (
        <g>
          <path d="M 29,54 Q 35,52 50,52 Q 65,52 71,54 L 69,95 L 31,95 Z" fill={CC} />
          {/* Botões */}
          {[60,68,76,84].map(y => <circle key={y} cx="50" cy={y} r="1.3" fill={CC2} />)}
          {/* Bottoneira */}
          <line x1="50" y1="56" x2="50" y2="94" stroke={CC2} strokeWidth="1.5" opacity="0.5" />
          {/* Colarinho */}
          <path d="M 40,54 L 48,62 L 50,56 L 52,62 L 60,54 Q 55,52 50,52 Q 45,52 40,54 Z" fill="white" opacity="0.9" />
          {/* Sombra */}
          <path d="M 67,54 L 69,95 L 64,95 L 66,54 Z" fill="rgba(0,0,0,0.1)" />
        </g>
      );

    case 'armor':
      return (
        <g>
          {/* Placa central */}
          <path d="M 29,54 Q 35,52 50,52 Q 65,52 71,54 L 69,95 L 31,95 Z" fill="#6b7280" />
          <path d="M 36,54 L 36,90 Q 43,95 50,95 Q 57,95 64,90 L 64,54 Q 57,51 50,51 Q 43,51 36,54 Z" fill="#9ca3af" />
          <path d="M 42,57 L 58,57 L 58,86 Q 54,90 50,90 Q 46,90 42,86 Z" fill="#6b7280" />
          {/* Detalhes */}
          <line x1="42" y1="57" x2="58" y2="57" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
          <line x1="42" y1="68" x2="58" y2="68" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
          <ellipse cx="50" cy="63" rx="4" ry="3" fill="rgba(255,255,255,0.1)" />
          {/* Ombros */}
          <ellipse cx="31" cy="57" rx="8" ry="5" fill="#9ca3af" />
          <ellipse cx="69" cy="57" rx="8" ry="5" fill="#9ca3af" />
        </g>
      );

    default: /* polo */
      return (
        <g>
          {/* Torso */}
          <path d="M 29,54 Q 35,52 50,52 Q 65,52 71,54 L 69,95 L 31,95 Z" fill={CC} />
          {/* Gola polo esquerda */}
          <path d="M 38,54 Q 42,62 50,60 L 50,52 Q 43,52 38,54 Z" fill={collar} opacity="0.92" />
          {/* Gola polo direita */}
          <path d="M 62,54 Q 58,62 50,60 L 50,52 Q 57,52 62,54 Z" fill={collar} opacity="0.92" />
          {/* Sombra gola */}
          <path d="M 40,54 Q 45,58 50,57 Q 55,58 60,54" stroke="rgba(0,0,0,0.18)" strokeWidth="0.8" fill="none" />
          {/* Linha de costura ombros */}
          <path d="M 29,54 Q 35,54 50,53 Q 65,54 71,54"
            stroke="rgba(255,255,255,0.1)" strokeWidth="1" fill="none" />
          {/* Sombra lateral */}
          <path d="M 67,54 L 69,95 L 64,95 L 65,54 Z" fill="rgba(0,0,0,0.12)" />
          {/* Crachá */}
          <rect x="55" y="66" width="13" height="9" rx="2" fill={badge} />
          <path d="M 57,70 L 66,70" stroke="rgba(0,0,0,0.4)" strokeWidth="0.9" strokeLinecap="round" />
          <path d="M 57,73 L 64,73" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" strokeLinecap="round" />
        </g>
      );
  }
}

/* ─── SOBRANCELHAS ──────────────────────────────────────────── */
function Eyebrows({ e }: { e: any }) {
  const col = e.browColor ?? '#3d2614';
  if (e.shape === 'angry') {
    return (
      <g>
        <path d="M 32,20 L 44,23" stroke={col} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M 56,23 L 68,20" stroke={col} strokeWidth="2.4" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <path d="M 31,21 Q 37,17 45,20" stroke={col} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M 55,20 Q 63,17 69,21" stroke={col} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ─── OLHOS ─────────────────────────────────────────────────── */
function Eyes({ e }: { e: any }) {
  const iris = e.color ?? '#3d2b1f';

  if (e.shape === 'almond') {
    return (
      <g>
        <path d="M 30,28 Q 38,23 46,28 Q 38,33 30,28 Z" fill="white" />
        <circle cx="38" cy="28" r="3.5" fill={iris} /><circle cx="38" cy="28" r="2" fill="#080808" />
        <circle cx="39.2" cy="26.8" r="1.1" fill="white" />
        <path d="M 30,28 Q 38,23 46,28" stroke="#1a0e08" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M 54,28 Q 62,23 70,28 Q 62,33 54,28 Z" fill="white" />
        <circle cx="62" cy="28" r="3.5" fill={iris} /><circle cx="62" cy="28" r="2" fill="#080808" />
        <circle cx="63.2" cy="26.8" r="1.1" fill="white" />
        <path d="M 54,28 Q 62,23 70,28" stroke="#1a0e08" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (e.shape === 'angry') {
    return (
      <g>
        <ellipse cx="38" cy="28" rx="6.5" ry="5.5" fill="white" />
        <circle cx="38" cy="28" r="3.5" fill={iris} /><circle cx="38" cy="28" r="2" fill="#080808" />
        <circle cx="39.2" cy="26.8" r="1.1" fill="white" />
        <path d="M 31.5,25 L 44.5,28" stroke="#1a0e08" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="62" cy="28" rx="6.5" ry="5.5" fill="white" />
        <circle cx="62" cy="28" r="3.5" fill={iris} /><circle cx="62" cy="28" r="2" fill="#080808" />
        <circle cx="63.2" cy="26.8" r="1.1" fill="white" />
        <path d="M 55.5,28 L 68.5,25" stroke="#1a0e08" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <ellipse cx="38" cy="28" rx="6.5" ry="5.5" fill="white" />
      <circle cx="38" cy="28" r="3.5" fill={iris} /><circle cx="38" cy="28" r="2.1" fill="#080808" />
      <circle cx="39.4" cy="26.6" r="1.2" fill="white" />
      <path d="M 31.5,28 Q 38,22.5 44.5,28" stroke="#1a0e08" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M 32.5,30.5 Q 38,34 43.5,30.5" stroke="#1a0e08" strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.3" />

      <ellipse cx="62" cy="28" rx="6.5" ry="5.5" fill="white" />
      <circle cx="62" cy="28" r="3.5" fill={iris} /><circle cx="62" cy="28" r="2.1" fill="#080808" />
      <circle cx="63.4" cy="26.6" r="1.2" fill="white" />
      <path d="M 55.5,28 Q 62,22.5 68.5,28" stroke="#1a0e08" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M 56.5,30.5 Q 62,34 67.5,30.5" stroke="#1a0e08" strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.3" />
    </g>
  );
}

/* ─── BOCA ──────────────────────────────────────────────────── */
function Mouth({ m }: { m: any }) {
  const lc = m.color  ?? '#b03030';
  const lt = m.lipTop ?? '#e06060';
  switch (m.shape) {
    case 'bigsmile':
      return (
        <g>
          <path d="M 38,43 Q 50,53 62,43" fill={lc} stroke={lc} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 38,43 Q 50,52 62,43 Q 57,48 50,48 Q 43,48 38,43 Z" fill="#3a0808" />
          <path d="M 40,44 Q 50,50 60,44 Q 56,47 50,47 Q 44,47 40,44 Z" fill="white" opacity="0.85" />
          <path d="M 38,43 Q 44,40 50,41 Q 56,40 62,43" stroke={lt} strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'smirk':
      return (
        <g>
          <path d="M 42,44 Q 49,49 58,43" stroke={lc} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 42,44 Q 49,48 58,43" stroke={lt} strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.5" />
        </g>
      );
    case 'serious':
      return (
        <g>
          <path d="M 40,44 L 60,44" stroke={lc} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M 40,43 Q 50,41 60,43" stroke={lt} strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.4" />
        </g>
      );
    default:
      return (
        <g>
          <path d="M 40,43 Q 50,51 60,43" stroke={lc} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d="M 40,43 Q 45,40 50,41 Q 55,40 60,43" stroke={lt} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.5" />
        </g>
      );
  }
}

/* ─── CABELO ────────────────────────────────────────────────── */
function Hair({ h }: { h: any }) {
  const c = h.color ?? '#2c1810';
  switch (h.style) {
    case 'short':
      return (
        <g>
          <path d="M 27,30 C 26,13 30,8 50,8 C 70,8 74,13 73,30 Q 68,20 50,18 Q 32,20 27,30 Z" fill={c} />
          <path d="M 27,30 Q 26,36 28,40 Q 29,34 30,30 Z" fill={c} />
          <path d="M 73,30 Q 74,36 72,40 Q 71,34 70,30 Z" fill={c} />
          <path d="M 35,15 Q 50,9 65,15 Q 57,12 50,11 Q 43,12 35,15 Z" fill="rgba(255,255,255,0.1)" />
        </g>
      );
    case 'spiky':
      return (
        <g>
          <path d="M 27,30 C 26,16 30,8 50,8 C 70,8 74,16 73,30 Q 66,21 50,19 Q 34,21 27,30 Z" fill={c} />
          <path d="M 32,22 L 28,4 L 38,18 L 42,3 L 47,17 L 50,1 L 53,17 L 58,3 L 62,18 L 72,4 L 68,22 Z" fill={c} />
        </g>
      );
    case 'mohawk':
      return (
        <g>
          <path d="M 28,30 C 27,20 28,10 36,8 Q 36,16 40,20 Q 33,23 28,30 Z" fill={c} opacity="0.4" />
          <path d="M 72,30 C 73,20 72,10 64,8 Q 64,16 60,20 Q 67,23 72,30 Z" fill={c} opacity="0.4" />
          <path d="M 42,26 L 40,4 Q 45,1 50,1 Q 55,1 60,4 L 58,26 Q 54,22 50,21 Q 46,22 42,26 Z" fill={c} />
        </g>
      );
    case 'bald':
      return <ellipse cx="42" cy="15" rx="11" ry="7" fill="rgba(255,255,255,0.05)" />;
    default: return null;
  }
}

function HairBack({ h }: { h: any }) {
  const c = h.color ?? '#2c1810';
  return (
    <g>
      <path d="M 27,32 Q 20,55 22,90 L 18,95 L 8,95 Q 14,68 15,42 Q 17,26 27,20 Z" fill={c} />
      <path d="M 73,32 Q 80,55 78,90 L 82,95 L 92,95 Q 86,68 85,42 Q 83,26 73,20 Z" fill={c} />
    </g>
  );
}

function HairFront({ h }: { h: any }) {
  const c = h.color ?? '#2c1810';
  return (
    <g>
      <path d="M 27,30 C 26,13 30,8 50,8 C 70,8 74,13 73,30 Q 66,20 50,18 Q 34,20 27,30 Z" fill={c} />
      <path d="M 35,15 Q 50,9 65,15 Q 57,12 50,11 Q 43,12 35,15 Z" fill="rgba(255,255,255,0.1)" />
    </g>
  );
}

/* ─── CHAPÉU ────────────────────────────────────────────────── */
function Hat({ h }: { h: any }) {
  const c  = h.color  ?? '#1d3461';
  const c2 = h.color2 ?? '#152845';
  switch (h.style) {
    case 'cap':
      return (
        <g>
          <path d="M 27,28 C 26,10 30,6 50,6 C 70,6 74,10 73,28 Q 66,18 50,16 Q 34,18 27,28 Z" fill={c} />
          <path d="M 27,27 Q 22,28 16,30 Q 28,35 50,33 Q 44,31 32,29 Z" fill={c2} />
          <path d="M 27,27 Q 50,31 73,27" stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" fill="none" />
          <circle cx="50" cy="7" r="2.5" fill={c2} />
        </g>
      );
    case 'crown':
      return (
        <g>
          <rect x="30" y="26" width="40" height="8" rx="2" fill={c} />
          <path d="M 30,26 L 30,14 L 38,22 L 50,6 L 62,22 L 70,14 L 70,26 Z" fill={c} />
          <circle cx="50" cy="12" r="3.5" fill="#ef4444" /><circle cx="50" cy="12" r="2" fill="#ff8080" />
          <circle cx="36" cy="22" r="2.5" fill="#22c55e" />
          <circle cx="64" cy="22" r="2.5" fill="#3b82f6" />
        </g>
      );
    case 'cowboy':
      return (
        <g>
          <ellipse cx="50" cy="22" rx="32" ry="5.5" fill={c2} />
          <path d="M 28,22 C 26,10 30,5 50,4 C 70,5 74,10 72,22 Z" fill={c} />
          <path d="M 30,21 Q 50,26 70,21" stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" fill="none" />
        </g>
      );
    case 'wizard':
      return (
        <g>
          <ellipse cx="50" cy="28" rx="24" ry="4.5" fill={c2} />
          <path d="M 28,28 Q 32,16 42,8 Q 46,4 50,3 Q 54,4 58,8 Q 68,16 72,28 Z" fill={c} />
          <text x="44" y="18" fontSize="7" fill="rgba(255,255,255,0.75)">★</text>
          <text x="54" y="11" fontSize="5" fill="rgba(255,255,255,0.5)">✦</text>
        </g>
      );
    default: return null;
  }
}

/* ─── ACESSÓRIO ─────────────────────────────────────────────── */
function Accessory({ a }: { a: any }) {
  const c = a.color ?? '#4b5563';
  switch (a.style) {
    case 'glasses':
      return (
        <g>
          <circle cx="38" cy="28" r="8" fill="none" stroke={c} strokeWidth="1.8" />
          <circle cx="62" cy="28" r="8" fill="none" stroke={c} strokeWidth="1.8" />
          <path d="M 46,28 L 54,28" stroke={c} strokeWidth="1.8" />
          <path d="M 22,26 L 30,28" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 70,28 L 78,26" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="38" cy="28" r="8" fill={c} fillOpacity="0.07" />
          <circle cx="62" cy="28" r="8" fill={c} fillOpacity="0.07" />
        </g>
      );
    case 'sunglasses':
      return (
        <g>
          <rect x="29" y="23" width="18" height="12" rx="5" fill={c} />
          <rect x="53" y="23" width="18" height="12" rx="5" fill={c} />
          <rect x="47" y="27"  width="6"  height="3"  rx="1.5" fill={c} />
          <path d="M 22,25 L 29,27" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 71,27 L 78,25" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 31,25 Q 35,23 39,25" stroke="rgba(255,255,255,0.25)" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M 55,25 Q 59,23 63,25" stroke="rgba(255,255,255,0.25)" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'earring':
      return (
        <g>
          <circle cx="70" cy="34" r="3.5" fill="none" stroke={c} strokeWidth="1.8" />
          <circle cx="70" cy="39" r="2.2" fill={c} />
          <circle cx="69.4" cy="33.4" r="0.9" fill="rgba(255,255,255,0.4)" />
        </g>
      );
    case 'scar':
      return (
        <path d="M 54,24 Q 57,31 55,38" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8" />
      );
    default: return null;
  }
}
