// AvatarRenderer v5 — flat cartoon portrait (busto)
// Estilo igual ao da referência: oval head, mechas separadas, ombros largos
// ViewBox 200×200

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
  background: { type: 'office' },
  skin:       { faceColor: '#FDDBB4', shadeColor: '#E8B48A', lightColor: '#FFF0E0' },
  eyes:       { shape: 'round', color: '#3D2B1F', browColor: '#3D2B1F' },
  mouth:      { shape: 'smile', color: '#C47A6A', lipTop: '#E8927F' },
  hair:       { style: 'short', color: '#6B3D1A' },
  clothes:    { style: 'polo', color: '#2C3E50', color2: '#1a2533', badge: '#C8A030', collar: '#ffffff', pantColor: '#1e293b', pantColor2: '#0f172a', shoeColor: '#1a1a2e' },
  hat:        { style: 'none', color: '#1B3A6B', color2: '#112750' },
  accessory:  { style: 'none', color: '#4B5563' },
};

function sd(eq: AvatarEquipped, key: keyof AvatarEquipped) {
  return { ...DEFAULT[key], ...(eq[key]?.style_data ?? {}) };
}

function adj(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

let _uid = 0;

export function AvatarRenderer({ equipped, size = 80, className = '' }: Props) {
  const uid = `av${++_uid}`;
  const bg = sd(equipped, 'background');
  const sk = sd(equipped, 'skin');
  const ey = sd(equipped, 'eyes');
  const mo = sd(equipped, 'mouth');
  const ha = sd(equipped, 'hair');
  const cl = sd(equipped, 'clothes');
  const ht = sd(equipped, 'hat');
  const ac = sd(equipped, 'accessory');

  const W = 200, H = 200;
  const displayH = Math.round(size * (H / W));

  const skin  = sk.faceColor  ?? '#FDDBB4';
  const skinS = sk.shadeColor ?? '#E8B48A';
  const skinL = sk.lightColor ?? '#FFF0E0';
  const hairC = ha.color ?? '#6B3D1A';

  // Head center
  const HX = 100, HY = 92;
  const HRX = 50, HRY = 56;

  return (
    <svg
      width={size} height={displayH}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ borderRadius: '10px', flexShrink: 0, display: 'block' }}
    >
      <defs>
        <clipPath id={`cp${uid}`}><rect width={W} height={H} rx="12" ry="12"/></clipPath>
        {/* Gradient para o fundo da cabeça na hairline */}
        <radialGradient id={`sg${uid}`} cx="50%" cy="30%" r="60%">
          <stop offset="0%" stopColor={skinL} stopOpacity="0.4"/>
          <stop offset="100%" stopColor={skinS} stopOpacity="0"/>
        </radialGradient>
      </defs>
      <g clipPath={`url(#cp${uid})`}>

        {/* ── FUNDO ── */}
        <BG bg={bg} uid={uid} />

        {/* ── TORSO / OMBROS (desenhado primeiro, atrás de tudo) ── */}
        <Torso cl={cl} skin={skin} uid={uid} />

        {/* ── PESCOÇO ── */}
        <path d={`M 86 ${HY+HRY-4} C 84 ${HY+HRY+12} 84 ${HY+HRY+22} 86 ${HY+HRY+28} L 114 ${HY+HRY+28} C 116 ${HY+HRY+22} 116 ${HY+HRY+12} 114 ${HY+HRY-4} Z`}
          fill={skin}/>
        {/* sombra pescoço */}
        <path d={`M 86 ${HY+HRY-4} C 84 ${HY+HRY+8} 84 ${HY+HRY+16} 85 ${HY+HRY+24} L 90 ${HY+HRY+28} L 86 ${HY+HRY+28} C 84 ${HY+HRY+22} 84 ${HY+HRY+12} 86 ${HY+HRY-4} Z`}
          fill={skinS} opacity="0.3"/>

        {/* ── ORELHAS ── */}
        <ellipse cx={HX-HRX+2} cy={HY+4} rx="11" ry="14" fill={skin}/>
        <ellipse cx={HX-HRX+5} cy={HY+4} rx="7" ry="9" fill={skinS} opacity="0.25"/>
        <ellipse cx={HX+HRX-2} cy={HY+4} rx="11" ry="14" fill={skin}/>
        <ellipse cx={HX+HRX-5} cy={HY+4} rx="7" ry="9" fill={skinS} opacity="0.25"/>

        {/* ── CABELO ATRÁS DA CABEÇA ── */}
        <HairBack ha={ha} hairC={hairC} HX={HX} HY={HY} HRX={HRX} HRY={HRY} />

        {/* ── CABEÇA ── */}
        <ellipse cx={HX} cy={HY} rx={HRX} ry={HRY} fill={skin}/>
        {/* luz suave na testa */}
        <ellipse cx={HX} cy={HY-22} rx="28" ry="18" fill={`url(#sg${uid})`}/>
        {/* sombra nas bochechas */}
        <ellipse cx={HX-22} cy={HY+16} rx="14" ry="10" fill={skinS} opacity="0.15"/>
        <ellipse cx={HX+22} cy={HY+16} rx="14" ry="10" fill={skinS} opacity="0.15"/>
        {/* blush rosado */}
        <ellipse cx={HX-24} cy={HY+20} rx="10" ry="6" fill="#E07070" opacity="0.1"/>
        <ellipse cx={HX+24} cy={HY+20} rx="10" ry="6" fill="#E07070" opacity="0.1"/>

        {/* ── SOBRANCELHAS ── */}
        <Brows ey={ey} HX={HX} HY={HY} />

        {/* ── OLHOS ── */}
        <Eyes ey={ey} HX={HX} HY={HY} uid={uid} />

        {/* ── NARIZ ── */}
        <path d={`M ${HX} ${HY+12} C ${HX-4} ${HY+18} ${HX-5} ${HY+22} ${HX-2} ${HY+24}`}
          stroke={skinS} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.7"/>
        <path d={`M ${HX-2} ${HY+24} C ${HX} ${HY+25} ${HX+2} ${HY+24}`}
          stroke={skinS} strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.6"/>

        {/* ── BOCA ── */}
        <Mouth mo={mo} HX={HX} HY={HY} />

        {/* ── ACESSÓRIO ── */}
        <Acc ac={ac} HX={HX} HY={HY} />

        {/* ── CABELO FRENTE ── */}
        <HairFront ha={ha} hairC={hairC} HX={HX} HY={HY} HRX={HRX} HRY={HRY} />

        {/* ── CHAPÉU ── */}
        <Hat ht={ht} HX={HX} HY={HY} uid={uid} />

      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND
// ═══════════════════════════════════════════════════════════════
function BG({ bg, uid }: { bg: any; uid: string }) {
  const type = bg.type ?? 'solid';
  if (type === 'office') return (
    <g>
      <rect width="200" height="200" fill="#243060"/>
      <rect y="150" width="200" height="50" fill="#0D1520"/>
      <rect y="150" width="200" height="2" fill="rgba(255,255,255,0.06)"/>
      <rect x="130" y="14" width="54" height="38" rx="4" fill="#7EC8E3" opacity="0.6"/>
      <rect x="130" y="14" width="54" height="38" rx="4" fill="none" stroke="#0a0a1a" strokeWidth="1.5"/>
      <line x1="157" y1="14" x2="157" y2="52" stroke="#0a0a1a" strokeWidth="1.2"/>
      <line x1="130" y1="33" x2="184" y2="33" stroke="#0a0a1a" strokeWidth="1.2"/>
    </g>
  );
  if (type === 'arena') return (
    <g>
      <rect width="200" height="200" fill="#1A0505"/>
      <rect y="150" width="200" height="2" fill="#CC2222"/>
      <rect y="152" width="200" height="48" fill="#080000"/>
    </g>
  );
  if (type === 'nature') return (
    <g>
      <rect width="200" height="200" fill="#1464A0"/>
      <circle cx="160" cy="30" r="22" fill="#FCD34D"/>
      <ellipse cx="30" cy="30" rx="22" ry="12" fill="rgba(255,255,255,0.7)"/>
      <ellipse cx="90" cy="20" rx="16" ry="9" fill="rgba(255,255,255,0.55)"/>
      <rect y="148" width="200" height="52" fill="#14532D"/>
      <rect y="148" width="200" height="5" fill="#22C55E"/>
    </g>
  );
  if (type === 'stars') return (
    <g>
      <rect width="200" height="200" fill="#030712"/>
      {([[15,10],[40,7],[75,15],[115,9],[150,18],[178,7],[188,34],[168,54],[22,42],[58,62],[108,34],[142,48],[34,78],[88,68],[174,82],[9,108],[128,94],[28,168],[94,158],[148,174]] as [number,number][]).map(([x,y],i)=>
        <circle key={i} cx={x} cy={y} r={i%4===0?2:1.2} fill="white" opacity={0.3+i%5*0.12}/>
      )}
    </g>
  );
  if (type === 'neon') return (
    <g>
      <rect width="200" height="200" fill="#05050F"/>
      <rect y="150" width="200" height="2" fill="#A855F7"/>
      <rect y="152" width="200" height="48" fill="#030308"/>
    </g>
  );
  if (type === 'gradient') {
    const c0 = bg.colors?.[0] ?? '#1e293b';
    const c1 = bg.colors?.[1] ?? '#0f172a';
    return (
      <g>
        <defs>
          <linearGradient id={`bgG${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c0}/><stop offset="100%" stopColor={c1}/>
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill={`url(#bgG${uid})`}/>
      </g>
    );
  }
  return <rect width="200" height="200" fill={bg.colors?.[0] ?? '#1e293b'}/>;
}

// ═══════════════════════════════════════════════════════════════
// TORSO / OMBROS  — busto estilo da imagem
// ═══════════════════════════════════════════════════════════════
function Torso({ cl, skin, uid }: { cl: any; skin: string; uid: string }) {
  const c1     = cl.color   ?? '#2C3E50';
  const c2     = cl.color2  ?? '#1a2533';
  const style  = cl.style   ?? 'polo';
  const collar = cl.collar  ?? '#ffffff';
  const badge  = cl.badge   ?? '#C8A030';

  // Ombros largos estilo flat cartoon
  const shoulderPath = `M 0 200 C 0 170 30 156 100 152 C 170 156 200 170 200 200 Z`;

  return (
    <g>
      <path d={shoulderPath} fill={c1}/>
      {/* Sombra lateral nos ombros */}
      <path d={`M 0 200 C 0 170 30 156 60 154 L 50 200 Z`} fill={c2} opacity="0.4"/>
      <path d={`M 200 200 C 200 170 170 156 140 154 L 150 200 Z`} fill={c2} opacity="0.3"/>

      {/* Gola / detalhe de roupa */}
      {style === 'polo' || style === 'shirt' ? (
        <>
          {/* gola careca arredondada */}
          <path d={`M 78 152 C 78 162 86 170 100 171 C 114 170 122 162 122 152 C 114 156 86 156 78 152 Z`}
            fill={c2} opacity="0.6"/>
          <path d={`M 80 153 C 82 160 90 166 100 167 C 110 166 118 160 120 153`}
            fill="none" stroke={c2} strokeWidth="2.5" strokeLinecap="round"/>
        </>
      ) : style === 'suit' ? (
        <>
          <path d={`M 72 153 C 74 165 84 172 100 173 C 116 172 126 165 128 153`}
            fill={collar} stroke="#111" strokeWidth="1"/>
          <path d={`M 84 165 L 100 158 L 116 165`}
            fill="none" stroke="#111" strokeWidth="1"/>
          <circle cx="86" cy="162" r="4" fill={badge} stroke="#111" strokeWidth="0.8"/>
        </>
      ) : style === 'hoodie' ? (
        <>
          <path d={`M 75 152 C 78 164 86 172 100 174 C 114 172 122 164 125 152`}
            fill={collar} opacity="0.9"/>
          <path d={`M 80 153 C 84 161 92 168 100 169 C 108 168 116 161 120 153`}
            fill="none" stroke={c2} strokeWidth="2.5" strokeLinecap="round"/>
        </>
      ) : style === 'armor' ? (
        <>
          <path d={shoulderPath} fill={c2}/>
          <path d={`M 60 165 C 80 158 120 158 140 165 L 130 200 L 70 200 Z`}
            fill={cl.color2 ?? '#9ca3af'}/>
          <path d={`M 70 170 C 80 164 120 164 130 170`}
            fill="none" stroke="#111" strokeWidth="1.5"/>
        </>
      ) : null}

      {/* Pele visível no decote */}
      <ellipse cx="100" cy="152" rx="22" ry="6" fill={skin} opacity="0.4"/>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// SOBRANCELHAS
// ═══════════════════════════════════════════════════════════════
function Brows({ ey, HX, HY }: { ey: any; HX: number; HY: number }) {
  const bc    = ey.browColor ?? '#3D2B1F';
  const shape = ey.shape ?? 'round';
  const by    = HY - 20;

  if (shape === 'angry') return (
    <g>
      <path d={`M ${HX-24} ${by-2} C ${HX-16} ${by-6} ${HX-8} ${by-4} ${HX-4} ${by}`}
        stroke={bc} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d={`M ${HX+4} ${by} C ${HX+8} ${by-4} ${HX+16} ${by-6} ${HX+24} ${by-2}`}
        stroke={bc} strokeWidth="3" fill="none" strokeLinecap="round"/>
    </g>
  );
  return (
    <g>
      <path d={`M ${HX-24} ${by} C ${HX-16} ${by-5} ${HX-8} ${by-5} ${HX-4} ${by-2}`}
        stroke={bc} strokeWidth="2.8" fill="none" strokeLinecap="round"/>
      <path d={`M ${HX+4} ${by-2} C ${HX+8} ${by-5} ${HX+16} ${by-5} ${HX+24} ${by}`}
        stroke={bc} strokeWidth="2.8" fill="none" strokeLinecap="round"/>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// OLHOS
// ═══════════════════════════════════════════════════════════════
function Eyes({ ey, HX, HY, uid }: { ey: any; HX: number; HY: number; uid: string }) {
  const iris  = ey.color ?? '#3D2B1F';
  const shape = ey.shape ?? 'round';
  const ey2   = HY - 4;
  const lx = HX - 16, rx = HX + 16;

  // Olho base helper
  function Eye({ cx }: { cx: number }) {
    if (shape === 'almond') return (
      <g>
        <path d={`M ${cx-11} ${ey2} C ${cx-7} ${ey2-7} ${cx+7} ${ey2-7} ${cx+11} ${ey2} C ${cx+7} ${ey2+5} ${cx-7} ${ey2+5} Z`}
          fill="white" stroke="#2a1a0a" strokeWidth="0.8"/>
        <circle cx={cx} cy={ey2} r="5.5" fill={iris}/>
        <circle cx={cx} cy={ey2} r="3" fill="#111"/>
        <circle cx={cx+1.5} cy={ey2-1.5} r="1.8" fill="white"/>
      </g>
    );
    if (shape === 'angry') return (
      <g>
        <ellipse cx={cx} cy={ey2} rx="9" ry="7" fill="white" stroke="#2a1a0a" strokeWidth="0.8"/>
        <circle cx={cx} cy={ey2+1} r="5.5" fill={iris}/>
        <circle cx={cx} cy={ey2+1} r="3" fill="#111"/>
        <circle cx={cx+1.5} cy={ey2-0.5} r="1.8" fill="white"/>
      </g>
    );
    // round (default)
    return (
      <g>
        <ellipse cx={cx} cy={ey2} rx="9" ry="9.5" fill="white" stroke="#2a1a0a" strokeWidth="0.8"/>
        <circle cx={cx} cy={ey2} r="6" fill={iris}/>
        <circle cx={cx} cy={ey2} r="3.2" fill="#111"/>
        <circle cx={cx+2} cy={ey2-2} r="2" fill="white"/>
        <circle cx={cx-2} cy={ey2+3} r="1" fill="rgba(255,255,255,0.4)"/>
      </g>
    );
  }

  return <g><Eye cx={lx}/><Eye cx={rx}/></g>;
}

// ═══════════════════════════════════════════════════════════════
// BOCA
// ═══════════════════════════════════════════════════════════════
function Mouth({ mo, HX, HY }: { mo: any; HX: number; HY: number }) {
  const shape  = mo.shape  ?? 'smile';
  const lip    = mo.lipTop ?? '#E8927F';
  const my = HY + 32;

  if (shape === 'bigsmile') return (
    <g>
      <path d={`M ${HX-14} ${my} C ${HX-12} ${my+10} ${HX+12} ${my+10} ${HX+14} ${my} Z`}
        fill={mo.color ?? '#C47A6A'} stroke="#2a1a0a" strokeWidth="0.8"/>
      <path d={`M ${HX-13} ${my+1} C ${HX-9} ${my+4} ${HX+9} ${my+4} ${HX+13} ${my+1}`}
        fill="rgba(255,255,255,0.6)" stroke="none"/>
      <path d={`M ${HX-14} ${my} C ${HX-10} ${my+2} ${HX+10} ${my+2} ${HX+14} ${my}`}
        fill={lip} stroke="#2a1a0a" strokeWidth="0.8"/>
    </g>
  );
  if (shape === 'smirk') return (
    <path d={`M ${HX-10} ${my+2} C ${HX-4} ${my} ${HX+6} ${my+4} ${HX+12} ${my+1}`}
      stroke="#2a1a0a" strokeWidth="2.2" fill="none" strokeLinecap="round"/>
  );
  if (shape === 'serious') return (
    <path d={`M ${HX-12} ${my+1} L ${HX+12} ${my+1}`}
      stroke="#2a1a0a" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  );
  // smile (default) — igual ao da imagem: sorriso suave, fechado
  return (
    <g>
      <path d={`M ${HX-12} ${my} C ${HX-8} ${my+6} ${HX+8} ${my+6} ${HX+12} ${my}`}
        stroke="#2a1a0a" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d={`M ${HX-12} ${my} C ${HX-8} ${my+1.5} ${HX+8} ${my+1.5} ${HX+12} ${my}`}
        stroke={lip} strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.7"/>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACESSÓRIO
// ═══════════════════════════════════════════════════════════════
function Acc({ ac, HX, HY }: { ac: any; HX: number; HY: number }) {
  const style = ac.style ?? 'none';
  const color = ac.color ?? '#4b5563';
  const ey2 = HY - 4;

  if (style === 'glasses') return (
    <g>
      <circle cx={HX-16} cy={ey2} r="12" fill="none" stroke={color} strokeWidth="2.2"/>
      <circle cx={HX+16} cy={ey2} r="12" fill="none" stroke={color} strokeWidth="2.2"/>
      <line x1={HX-4} y1={ey2} x2={HX+4} y2={ey2} stroke={color} strokeWidth="1.8"/>
      <line x1={HX-28} y1={ey2} x2={HX-36} y2={ey2-2} stroke={color} strokeWidth="1.8"/>
      <line x1={HX+28} y1={ey2} x2={HX+36} y2={ey2-2} stroke={color} strokeWidth="1.8"/>
    </g>
  );
  if (style === 'sunglasses') return (
    <g>
      <rect x={HX-28} y={ey2-8} width="24" height="16" rx="8" fill={color} opacity="0.92" stroke="#111" strokeWidth="1.2"/>
      <rect x={HX+4} y={ey2-8} width="24" height="16" rx="8" fill={color} opacity="0.92" stroke="#111" strokeWidth="1.2"/>
      <line x1={HX-4} y1={ey2} x2={HX+4} y2={ey2} stroke="#111" strokeWidth="1.8"/>
      <line x1={HX-28} y1={ey2} x2={HX-36} y2={ey2-2} stroke="#111" strokeWidth="1.8"/>
      <line x1={HX+28} y1={ey2} x2={HX+36} y2={ey2-2} stroke="#111" strokeWidth="1.8"/>
      <path d={`M ${HX-26} ${ey2-5} C ${HX-20} ${ey2-8} ${HX-12} ${ey2-8} ${HX-8} ${ey2-5}`}
        stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </g>
  );
  if (style === 'earring') return (
    <g>
      <line x1={HX-50} y1={HY+6} x2={HX-50} y2={HY+2} stroke={color} strokeWidth="1.5"/>
      <circle cx={HX-50} cy={HY+10} r="4" fill={color} stroke="#111" strokeWidth="0.8"/>
    </g>
  );
  if (style === 'scar') return (
    <path d={`M ${HX+12} ${HY-16} C ${HX+16} ${HY-6} ${HX+14} ${HY+6} ${HX+17} ${HY+16}`}
      stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  );
  return null;
}

// ═══════════════════════════════════════════════════════════════
// CABELO ATRÁS
// ═══════════════════════════════════════════════════════════════
function HairBack({ ha, hairC, HX, HY, HRX, HRY }: {
  ha: any; hairC: string; HX: number; HY: number; HRX: number; HRY: number;
}) {
  const style = ha.style ?? 'short';
  if (style === 'bald') return null;

  if (style === 'long') {
    const shade = adj(hairC, -20);
    return (
      <g>
        <path d={`M ${HX-HRX+4} ${HY-10} C ${HX-HRX-14} ${HY+20} ${HX-HRX-16} ${HY+60} ${HX-HRX-10} ${HY+90}`}
          stroke={hairC} strokeWidth="22" strokeLinecap="round" fill="none"/>
        <path d={`M ${HX+HRX-4} ${HY-10} C ${HX+HRX+14} ${HY+20} ${HX+HRX+16} ${HY+60} ${HX+HRX+10} ${HY+90}`}
          stroke={hairC} strokeWidth="22" strokeLinecap="round" fill="none"/>
        <path d={`M ${HX-HRX+4} ${HY-10} C ${HX-HRX-8} ${HY+20} ${HX-HRX-10} ${HY+60} ${HX-HRX-4} ${HY+88}`}
          stroke={shade} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.4"/>
        <path d={`M ${HX+HRX-4} ${HY-10} C ${HX+HRX+8} ${HY+20} ${HX+HRX+10} ${HY+60} ${HX+HRX+4} ${HY+88}`}
          stroke={shade} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.4"/>
      </g>
    );
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// CABELO FRENTE — uma forma única + strokes de textura
// ═══════════════════════════════════════════════════════════════
function HairFront({ ha, hairC, HX, HY, HRX, HRY }: {
  ha: any; hairC: string; HX: number; HY: number; HRX: number; HRY: number;
}) {
  const style = ha.style ?? 'short';
  if (style === 'bald') return null;

  const dark  = adj(hairC, -28);
  const light = adj(hairC, +22);

  // Hairline: onde o cabelo encontra a testa (y ≈ HY - 30)
  const HL = HY - 30; // ≈ 62
  // Topo da cabeça
  const topY = HY - HRY; // ≈ 36

  // ── Helper: forma base do cabelo curto (cobre topo da cabeça até a hairline) ──
  // É UMA forma única com silhueta levemente orgânica — não chunks separados
  function ShortBase() {
    return (
      <path d={`
        M ${HX-38} ${HL+4}
        C ${HX-46} ${HL-4} ${HX-50} ${topY+14} ${HX-48} ${topY+4}
        C ${HX-46} ${topY-8} ${HX-36} ${topY-16} ${HX-22} ${topY-12}
        C ${HX-12} ${topY-18} ${HX-2} ${topY-22} ${HX+10} ${topY-18}
        C ${HX+26} ${topY-14} ${HX+44} ${topY-2} ${HX+48} ${topY+8}
        C ${HX+50} ${topY+18} ${HX+44} ${HL-2} ${HX+36} ${HL+4}
        C ${HX+26} ${HL+8} ${HX-26} ${HL+8} Z
      `} fill={hairC}/>
    );
  }

  // ── SHORT ─────────────────────────────────────────────────────
  if (style === 'short') {
    return (
      <g>
        <ShortBase/>
        {/* Costeletas finas descendo pelas têmporas */}
        <path d={`M ${HX-38} ${HL+4} C ${HX-44} ${HL+14} ${HX-44} ${HL+22} ${HX-40} ${HL+28} C ${HX-36} ${HL+20} ${HX-34} ${HL+10} Z`} fill={hairC}/>
        <path d={`M ${HX+38} ${HL+4} C ${HX+44} ${HL+14} ${HX+44} ${HL+22} ${HX+40} ${HL+28} C ${HX+36} ${HL+20} ${HX+34} ${HL+10} Z`} fill={hairC}/>
        {/* 3 linhas de textura — direção do cabelo varrido */}
        <path d={`M ${HX-30} ${HL+2} C ${HX-20} ${topY+2} ${HX-8} ${topY-12} ${HX+4} ${topY-16}`}
          stroke={dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.55"/>
        <path d={`M ${HX-14} ${HL} C ${HX-6} ${topY+4} ${HX+4} ${topY-10} ${HX+16} ${topY-14}`}
          stroke={dark} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4"/>
        <path d={`M ${HX+4} ${HL+2} C ${HX+12} ${topY+6} ${HX+22} ${topY-4} ${HX+34} ${topY+2}`}
          stroke={dark} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.35"/>
        {/* Brilho no topo */}
        <path d={`M ${HX-18} ${topY-8} C ${HX-6} ${topY-18} ${HX+10} ${topY-16}`}
          stroke="rgba(255,255,255,0.22)" strokeWidth="4" fill="none" strokeLinecap="round"/>
      </g>
    );
  }

  // ── LONG ──────────────────────────────────────────────────────
  if (style === 'long') {
    return (
      <g>
        <ShortBase/>
        {/* Costeletas longas */}
        <path d={`M ${HX-38} ${HL+4} C ${HX-46} ${HL+20} ${HX-46} ${HY+10} ${HX-40} ${HY+20} C ${HX-36} ${HY+10} ${HX-34} ${HL+14} Z`} fill={hairC}/>
        <path d={`M ${HX+38} ${HL+4} C ${HX+46} ${HL+20} ${HX+46} ${HY+10} ${HX+40} ${HY+20} C ${HX+36} ${HY+10} ${HX+34} ${HL+14} Z`} fill={hairC}/>
        <path d={`M ${HX-28} ${HL+6} C ${HX-18} ${topY+4} ${HX} ${topY-12}`}
          stroke={dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
        <path d={`M ${HX+10} ${HL+2} C ${HX+20} ${topY+6} ${HX+32} ${topY-2}`}
          stroke={dark} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.35"/>
        <path d={`M ${HX-12} ${topY-10} C ${HX} ${topY-18} ${HX+14} ${topY-12}`}
          stroke="rgba(255,255,255,0.2)" strokeWidth="4" fill="none" strokeLinecap="round"/>
      </g>
    );
  }

  // ── SPIKY ─────────────────────────────────────────────────────
  if (style === 'spiky') {
    // Espinhos como triângulos saindo do topo da ShortBase
    const spikes = [
      [HX-30, topY+2, HX-38, topY-28, HX-18, topY-2],
      [HX-10, topY-4, HX-14, topY-36, HX+4,  topY-8],
      [HX+8,  topY-6, HX+6,  topY-38, HX+22, topY-4],
      [HX+26, topY+2, HX+30, topY-26, HX+42, topY+4],
    ];
    return (
      <g>
        <ShortBase/>
        {spikes.map(([x1,y1,tx,ty,x2,y2], i) => (
          <path key={i} d={`M ${x1} ${y1} L ${tx} ${ty} L ${x2} ${y2} Z`}
            fill={i % 2 === 0 ? hairC : adj(hairC,-12)} stroke="#111" strokeWidth="0.8" strokeLinejoin="round"/>
        ))}
        <path d={`M ${HX-28} ${HL+2} C ${HX-16} ${topY+4} ${HX} ${topY-10}`}
          stroke={dark} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5"/>
        <path d={`M ${HX-22} ${topY-18} C ${HX-16} ${topY-30} ${HX-10} ${topY-34}`}
          stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </g>
    );
  }

  // ── MOHAWK ────────────────────────────────────────────────────
  if (style === 'mohawk') {
    return (
      <g>
        {/* Costeletas rasas nos lados */}
        <path d={`M ${HX-48} ${topY+10} C ${HX-50} ${HL-4} ${HX-46} ${HL+12} ${HX-38} ${HL+18} C ${HX-34} ${HL+8} ${HX-34} ${topY+18} Z`} fill={adj(hairC,-8)}/>
        <path d={`M ${HX+48} ${topY+10} C ${HX+50} ${HL-4} ${HX+46} ${HL+12} ${HX+38} ${HL+18} C ${HX+34} ${HL+8} ${HX+34} ${topY+18} Z`} fill={adj(hairC,-8)}/>
        {/* Crista: uma forma simples */}
        <path d={`M ${HX-10} ${topY+8} C ${HX-12} ${topY-20} ${HX-8} ${topY-48} ${HX} ${topY-52} C ${HX+8} ${topY-48} ${HX+12} ${topY-20} ${HX+10} ${topY+8} C ${HX+4} ${topY+4} ${HX-4} ${topY+4} Z`}
          fill={hairC} stroke="#111" strokeWidth="1"/>
        <path d={`M ${HX-2} ${topY+4} C ${HX-1} ${topY-20} ${HX} ${topY-44}`}
          stroke={dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6"/>
        <path d={`M ${HX-2} ${topY-10} C ${HX} ${topY-32} ${HX+1} ${topY-44}`}
          stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      </g>
    );
  }

  // ── AFRO ──────────────────────────────────────────────────────
  if (style === 'afro') {
    const darkA = adj(hairC, -38);
    return (
      <g>
        {/* Massa grande do afro — forma orgânica em torno de toda a cabeça */}
        <path d={`
          M ${HX-HRX+4} ${HY}
          C ${HX-HRX-22} ${HY-10} ${HX-HRX-30} ${HY-46} ${HX-HRX-10} ${topY-24}
          C ${HX-32} ${topY-54} ${HX-10} ${topY-62} ${HX} ${topY-62}
          C ${HX+10} ${topY-62} ${HX+32} ${topY-54} ${HX+HRX+10} ${topY-24}
          C ${HX+HRX+30} ${HY-46} ${HX+HRX+22} ${HY-10} ${HX+HRX-4} ${HY}
          C ${HX+HRX-10} ${HY+12} ${HX+HRX-6} ${HY+18}
          C ${HX+20} ${HY+22} ${HX-20} ${HY+22} ${HX-HRX+6} ${HY+18}
          C ${HX-HRX+10} ${HY+12} Z
        `} fill={hairC}/>
        {/* Textura de cachos com círculos */}
        {([[-26,-4],[-16,-20],[-4,-26],[8,-24],[20,-16],[30,-2],[-32,14],[-18,6],[-4,2],[10,4],[22,8],[34,16],[-24,28],[-8,22],[8,22],[22,26]] as [number,number][]).map(([dx,dy],i)=>(
          <circle key={i} cx={HX+dx} cy={HY-28+dy} r={5+i%3} fill={darkA} opacity="0.25"/>
        ))}
        <path d={`M ${HX-20} ${topY-50} C ${HX} ${topY-60} ${HX+20} ${topY-50}`}
          stroke="rgba(255,255,255,0.12)" strokeWidth="8" fill="none" strokeLinecap="round"/>
      </g>
    );
  }

  // ── TOPETE (pompadour varrido) ────────────────────────────────
  if (style === 'topete') {
    return (
      <g>
        {/* Base lateral (mesma do short) */}
        <ShortBase/>
        {/* Costeletas */}
        <path d={`M ${HX-38} ${HL+4} C ${HX-44} ${HL+14} ${HX-44} ${HL+22} ${HX-40} ${HL+28} C ${HX-36} ${HL+20} ${HX-34} ${HL+10} Z`} fill={hairC}/>
        <path d={`M ${HX+38} ${HL+4} C ${HX+44} ${HL+14} ${HX+44} ${HL+22} ${HX+40} ${HL+28} C ${HX+36} ${HL+20} ${HX+34} ${HL+10} Z`} fill={hairC}/>
        {/* Pompadour: elevação central varrida para trás */}
        <path d={`
          M ${HX-20} ${topY+6}
          C ${HX-26} ${topY-14} ${HX-18} ${topY-40} ${HX} ${topY-46}
          C ${HX+18} ${topY-40} ${HX+26} ${topY-14} ${HX+20} ${topY+2}
          C ${HX+10} ${topY-2} ${HX} ${topY-4} ${HX-10} ${topY-2} Z
        `} fill={light}/>
        {/* 2 linhas de textura no pompadour */}
        <path d={`M ${HX-8} ${topY+2} C ${HX-10} ${topY-20} ${HX-4} ${topY-40}`}
          stroke={dark} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5"/>
        <path d={`M ${HX+6} ${topY} C ${HX+6} ${topY-18} ${HX+10} ${topY-36}`}
          stroke={dark} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.4"/>
        <path d={`M ${HX-4} ${topY-30} C ${HX+2} ${topY-44} ${HX+8} ${topY-40}`}
          stroke="rgba(255,255,255,0.25)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      </g>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// CHAPÉU
// ═══════════════════════════════════════════════════════════════
function Hat({ ht, HX, HY, uid }: { ht: any; HX: number; HY: number; uid: string }) {
  const style  = ht.style  ?? 'none';
  const color  = ht.color  ?? '#1B3A6B';
  const color2 = ht.color2 ?? '#112750';
  const topY   = HY - 56;

  if (style === 'none') return null;

  if (style === 'cap') return (
    <g>
      <path d={`M ${HX-46} ${HY-28} C ${HX-24} ${HY-22} ${HX+24} ${HY-22} ${HX+46} ${HY-28} L ${HX+52} ${HY-24} C ${HX+24} ${HY-16} ${HX-24} ${HY-16} ${HX-52} ${HY-24} Z`}
        fill={color2} stroke="#111" strokeWidth="1"/>
      <path d={`M ${HX-HX+54} ${HY-26} C ${HX-48} ${HY-44} ${HX-28} ${topY+2} ${HX} ${topY} C ${HX+28} ${topY+2} ${HX+48} ${HY-44} ${HX+46} ${HY-26} Z`}
        fill={color} stroke="#111" strokeWidth="1.2"/>
      <path d={`M ${HX-46} ${HY-26} C ${HX-24} ${HY-20} ${HX+24} ${HY-20} ${HX+46} ${HY-26}`}
        stroke={color2} strokeWidth="4" fill="none"/>
      <path d={`M ${HX-22} ${topY+4} C ${HX-8} ${topY-4} ${HX+8} ${topY-4} ${HX+22} ${topY+4}`}
        stroke="rgba(255,255,255,0.18)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
    </g>
  );

  if (style === 'crown') return (
    <g>
      <rect x={HX-32} y={HY-48} width="64" height="16" rx="3" fill={color} stroke="#111" strokeWidth="1"/>
      <path d={`M ${HX-30} ${HY-48} L ${HX-28} ${HY-70} L ${HX-14} ${HY-52}`} fill={color} stroke="#111" strokeWidth="1"/>
      <path d={`M ${HX-4} ${HY-48} L ${HX} ${HY-76} L ${HX+4} ${HY-48}`} fill={color} stroke="#111" strokeWidth="1"/>
      <path d={`M ${HX+14} ${HY-52} L ${HX+28} ${HY-70} L ${HX+30} ${HY-48}`} fill={color} stroke="#111" strokeWidth="1"/>
      <circle cx={HX-20} cy={HY-40} r="4" fill="#E84848"/>
      <circle cx={HX}    cy={HY-40} r="4" fill="#4BE84B"/>
      <circle cx={HX+20} cy={HY-40} r="4" fill="#4848E8"/>
    </g>
  );

  if (style === 'cowboy') return (
    <g>
      <ellipse cx={HX} cy={HY-32} rx="56" ry="10" fill={color2} stroke="#111" strokeWidth="1"/>
      <path d={`M ${HX-30} ${HY-32} C ${HX-34} ${HY-50} ${HX-18} ${topY-12} ${HX} ${topY-14} C ${HX+18} ${topY-12} ${HX+34} ${HY-50} ${HX+30} ${HY-32} Z`}
        fill={color} stroke="#111" strokeWidth="1.2"/>
      <path d={`M ${HX-18} ${topY-14} C ${HX-6} ${topY-20} ${HX+6} ${topY-20} ${HX+18} ${topY-14}`}
        stroke={color2} strokeWidth="3" fill="none" strokeLinecap="round"/>
    </g>
  );

  if (style === 'wizard') return (
    <g>
      <ellipse cx={HX} cy={HY-36} rx="46" ry="9" fill={color2} stroke="#111" strokeWidth="1"/>
      <path d={`M ${HX-28} ${HY-36} C ${HX-18} ${HY-56} ${HX-8} ${topY-16} ${HX} ${topY-36} C ${HX+8} ${topY-16} ${HX+18} ${HY-56} ${HX+28} ${HY-36} Z`}
        fill={color} stroke="#111" strokeWidth="1.2"/>
      <circle cx={HX-10} cy={HY-58} r="3.5" fill="#FCD34D"/>
      <circle cx={HX+8}  cy={HY-68} r="2.5" fill="#FCD34D"/>
    </g>
  );

  return null;
}
