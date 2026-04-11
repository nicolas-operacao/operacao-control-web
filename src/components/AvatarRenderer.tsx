// AvatarRenderer — SVG avatar construído em camadas
// Cada item usa style_data para definir cores e formas

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
  background: { type: 'solid', colors: ['#27272a'] },
  skin:       { faceColor: '#F1C27D', shadeColor: '#D4A96A' },
  eyes:       { shape: 'round', color: '#2d2d2d' },
  mouth:      { shape: 'smile', color: '#c0392b' },
  hair:       { style: 'short', color: '#1a1a1a' },
  clothes:    { style: 'shirt', color: '#1d4ed8', color2: '#1e40af' },
  hat:        { style: 'none', color: '#000' },
  accessory:  { style: 'none', color: '#000' },
};

function sd(equipped: AvatarEquipped, key: keyof AvatarEquipped) {
  return equipped[key]?.style_data ?? DEFAULT[key];
}

let uidCounter = 0;

export function AvatarRenderer({ equipped, size = 80, className = '' }: Props) {
  const uid = `av${++uidCounter}`;
  const bg   = sd(equipped, 'background');
  const skin = sd(equipped, 'skin');
  const eyes = sd(equipped, 'eyes');
  const mouth = sd(equipped, 'mouth');
  const hair  = sd(equipped, 'hair');
  const clothes = sd(equipped, 'clothes');
  const hat  = sd(equipped, 'hat');
  const acc  = sd(equipped, 'accessory');

  return (
    <svg width={size} height={size} viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg" className={className}
      style={{ borderRadius: '50%', flexShrink: 0 }}>
      <defs>
        {bg.type === 'gradient' && (
          <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bg.colors[0]} />
            <stop offset="100%" stopColor={bg.colors[1] ?? bg.colors[0]} />
          </linearGradient>
        )}
        <clipPath id={`cl${uid}`}><circle cx="60" cy="60" r="60" /></clipPath>
      </defs>

      <g clipPath={`url(#cl${uid})`}>
        {/* ── FUNDO ── */}
        {bg.type === 'solid' && <rect width="120" height="120" fill={bg.colors[0]} />}
        {bg.type === 'gradient' && <rect width="120" height="120" fill={`url(#bg${uid})`} />}
        {bg.type === 'stars' && <>
          <rect width="120" height="120" fill={bg.colors[0] ?? '#0f0f2d'} />
          {[[12,8],[40,6],[78,12],[22,28],[96,20],[8,52],[104,46],[28,68],[88,62],[52,82],[18,94],[92,88],[65,18],[35,50],[75,38]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r={i%3===0?1.5:0.9} fill="white" opacity={0.5+i%4*0.1} />
          ))}
        </>}

        {/* ── ROUPA / CORPO ── */}
        <Clothes c={clothes} skin={skin} />

        {/* ── CABELO ATRÁS (long) ── */}
        {hair.style === 'long' && <HairBack h={hair} />}

        {/* ── PESCOÇO ── */}
        <rect x="53" y="78" width="14" height="10" rx="3" fill={skin.faceColor} />

        {/* ── CABEÇA ── */}
        <circle cx="60" cy="56" r="28" fill={skin.faceColor} />
        <ellipse cx="68" cy="60" rx="12" ry="14" fill={skin.shadeColor} opacity="0.25" />

        {/* ── OLHOS ── */}
        <Eyes e={eyes} />

        {/* ── BOCA ── */}
        <Mouth m={mouth} />

        {/* ── CABELO FRENTE ── */}
        {hair.style !== 'long' ? <Hair h={hair} /> : <HairFront h={hair} />}

        {/* ── CHAPÉU ── */}
        {hat.style !== 'none' && <Hat h={hat} />}

        {/* ── ACESSÓRIO ── */}
        {acc.style !== 'none' && <Accessory a={acc} />}
      </g>
    </svg>
  );
}

/* ─── ROUPAS ─────────────────────────────────────────────────────────────── */
function Clothes({ c, skin }: { c: any; skin: any }) {
  const col = c.color ?? '#1d4ed8';
  const col2 = c.color2 ?? '#1e40af';
  switch (c.style) {
    case 'shirt': return (
      <g>
        <path d="M 20,88 Q 32,78 60,78 Q 88,78 100,88 L 110,120 L 10,120 Z" fill={col} />
        <path d="M 44,78 Q 50,86 60,87 Q 70,86 76,78 L 76,96 L 44,96 Z" fill={col2} />
      </g>
    );
    case 'suit': return (
      <g>
        <path d="M 20,88 Q 32,78 60,78 Q 88,78 100,88 L 110,120 L 10,120 Z" fill="#1e293b" />
        <path d="M 44,78 L 54,94 L 60,87 L 66,94 L 76,78 Q 70,82 60,83 Q 50,82 44,78 Z" fill="white" />
        <path d="M 57,88 L 63,88 L 65,106 L 60,110 L 55,106 Z" fill="#dc2626" />
      </g>
    );
    case 'hoodie': return (
      <g>
        <path d="M 18,88 Q 30,76 60,76 Q 90,76 102,88 L 112,120 L 8,120 Z" fill={col} />
        <path d="M 37,78 Q 40,68 60,67 Q 80,68 83,78 Q 72,80 60,80 Q 48,80 37,78 Z" fill={col2} />
        <rect x="43" y="98" width="34" height="14" rx="5" fill={col2} />
      </g>
    );
    case 'armor': return (
      <g>
        <path d="M 18,88 Q 28,76 60,76 Q 92,76 102,88 L 112,120 L 8,120 Z" fill="#6b7280" />
        <path d="M 37,76 L 37,106 Q 50,112 60,112 Q 70,112 83,106 L 83,76 Q 72,74 60,74 Q 48,74 37,76 Z" fill="#9ca3af" />
        <path d="M 49,80 L 71,80 L 71,100 Q 65,104 60,104 Q 55,104 49,100 Z" fill="#6b7280" />
        <ellipse cx="32" cy="82" rx="10" ry="6" fill="#9ca3af" />
        <ellipse cx="88" cy="82" rx="10" ry="6" fill="#9ca3af" />
        <path d="M 49,80 L 71,80" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      </g>
    );
    default: return (
      <path d="M 20,88 Q 32,78 60,78 Q 88,78 100,88 L 110,120 L 10,120 Z" fill={col} />
    );
  }
}

/* ─── OLHOS ──────────────────────────────────────────────────────────────── */
function Eyes({ e }: { e: any }) {
  const col = e.color ?? '#2d2d2d';
  const brow = '#4a3728';
  switch (e.shape) {
    case 'almond': return (
      <g>
        <path d="M 45,46 Q 51,43 57,46" stroke={brow} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 63,46 Q 69,43 75,46" stroke={brow} strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="51" cy="53" rx="6.5" ry="4.5" fill="white" />
        <ellipse cx="69" cy="53" rx="6.5" ry="4.5" fill="white" />
        <ellipse cx="51" cy="53" rx="4" ry="3" fill={col} />
        <ellipse cx="69" cy="53" rx="4" ry="3" fill={col} />
        <circle cx="52" cy="52" r="1.5" fill="black" /><circle cx="70" cy="52" r="1.5" fill="black" />
        <circle cx="53" cy="51" r="0.9" fill="white" /><circle cx="71" cy="51" r="0.9" fill="white" />
      </g>
    );
    case 'angry': return (
      <g>
        <path d="M 44,46 L 56,44" stroke={brow} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 64,44 L 76,46" stroke={brow} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="51" cy="53" r="5.5" fill="white" />
        <circle cx="69" cy="53" r="5.5" fill="white" />
        <circle cx="51" cy="53" r="3.5" fill={col} /><circle cx="69" cy="53" r="3.5" fill={col} />
        <circle cx="52" cy="52" r="1.5" fill="black" /><circle cx="70" cy="52" r="1.5" fill="black" />
      </g>
    );
    default: return ( /* round */
      <g>
        <path d="M 45,46 Q 51,43 57,46" stroke={brow} strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M 63,46 Q 69,43 75,46" stroke={brow} strokeWidth="2" fill="none" strokeLinecap="round" />
        <circle cx="51" cy="53" r="5.5" fill="white" /><circle cx="69" cy="53" r="5.5" fill="white" />
        <circle cx="51" cy="53" r="3.5" fill={col} /><circle cx="69" cy="53" r="3.5" fill={col} />
        <circle cx="52" cy="52" r="1.5" fill="black" /><circle cx="70" cy="52" r="1.5" fill="black" />
        <circle cx="53" cy="51" r="0.9" fill="white" /><circle cx="71" cy="51" r="0.9" fill="white" />
      </g>
    );
  }
}

/* ─── BOCA ───────────────────────────────────────────────────────────────── */
function Mouth({ m }: { m: any }) {
  const col = m.color ?? '#c0392b';
  switch (m.shape) {
    case 'bigsmile': return (
      <g>
        <path d="M 46,67 Q 60,78 74,67" stroke={col} strokeWidth="2" fill={col} strokeLinecap="round" />
        <path d="M 46,67 Q 60,77 74,67 Q 67,72 53,72 Z" fill="#fce4ec" />
        <path d="M 51,70 L 69,70" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      </g>
    );
    case 'smirk': return (
      <path d="M 52,68 Q 60,72 70,66" stroke={col} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    );
    case 'serious': return (
      <path d="M 49,68 L 71,68" stroke={col} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    );
    default: return ( /* smile */
      <path d="M 49,67 Q 60,75 71,67" stroke={col} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    );
  }
}

/* ─── CABELO ─────────────────────────────────────────────────────────────── */
function HairBack({ h }: { h: any }) {
  const col = h.color ?? '#1a1a1a';
  return (
    <g>
      <path d="M 31,52 Q 28,82 32,115 L 28,120 L 12,120 Q 18,90 20,55 Q 22,38 31,32 Z" fill={col} />
      <path d="M 89,52 Q 92,82 88,115 L 92,120 L 108,120 Q 102,90 100,55 Q 98,38 89,32 Z" fill={col} />
    </g>
  );
}

function Hair({ h }: { h: any }) {
  const col = h.color ?? '#1a1a1a';
  switch (h.style) {
    case 'short': return (
      <path d="M 32,52 Q 32,24 60,24 Q 88,24 88,52 Q 82,42 60,40 Q 38,42 32,52 Z" fill={col} />
    );
    case 'spiky': return (
      <g>
        <path d="M 32,52 Q 32,36 40,30 Q 46,40 60,40 Q 74,40 80,30 Q 88,36 88,52 Q 80,44 60,42 Q 40,44 32,52 Z" fill={col} />
        <path d="M 40,36 L 36,14 L 48,30 L 52,12 L 58,28 L 60,8 L 62,28 L 68,12 L 72,30 L 84,14 L 80,36 Z" fill={col} />
      </g>
    );
    case 'mohawk': return (
      <g>
        <path d="M 32,52 Q 32,38 40,32 Q 44,42 60,42 Q 76,42 80,32 Q 88,38 88,52 Q 80,44 60,42 Q 40,44 32,52 Z" fill={col} opacity="0.4" />
        <path d="M 52,40 L 50,8 Q 55,4 60,3 Q 65,4 70,8 L 68,40 Q 64,35 60,35 Q 56,35 52,40 Z" fill={col} />
      </g>
    );
    case 'bald': return null;
    default: return null;
  }
}

function HairFront({ h }: { h: any }) {
  const col = h.color ?? '#1a1a1a';
  return <path d="M 32,52 Q 32,24 60,24 Q 88,24 88,52 Q 82,42 60,40 Q 38,42 32,52 Z" fill={col} />;
}

/* ─── CHAPÉU ─────────────────────────────────────────────────────────────── */
function Hat({ h }: { h: any }) {
  const col = h.color ?? '#1d4ed8';
  switch (h.style) {
    case 'cap': return (
      <g>
        <path d="M 32,42 Q 32,20 60,20 Q 88,20 88,42 L 86,48 Q 70,44 60,44 Q 50,44 34,48 Z" fill={col} />
        <path d="M 32,46 Q 24,48 18,50 Q 30,54 60,52 Q 52,50 36,48 Z" fill={col} />
        <path d="M 32,44 Q 60,48 88,44" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" fill="none" />
        <circle cx="60" cy="21" r="2.5" fill={col} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
      </g>
    );
    case 'crown': return (
      <g>
        <path d="M 34,48 L 34,34 L 44,44 L 60,24 L 76,44 L 86,34 L 86,48 Z" fill={col} />
        <rect x="33" y="46" width="54" height="9" rx="2" fill={col} />
        <circle cx="60" cy="34" r="3.5" fill="#ef4444" />
        <circle cx="44" cy="44" r="2.5" fill="#22c55e" />
        <circle cx="76" cy="44" r="2.5" fill="#3b82f6" />
        <path d="M 36,48 L 84,48" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      </g>
    );
    case 'cowboy': return (
      <g>
        <ellipse cx="60" cy="38" rx="36" ry="6" fill={col} />
        <path d="M 34,38 Q 32,20 60,18 Q 88,20 86,38 Z" fill={col} />
        <path d="M 36,37 Q 60,41 84,37" stroke="rgba(0,0,0,0.35)" strokeWidth="3" fill="none" />
      </g>
    );
    case 'wizard': return (
      <g>
        <ellipse cx="60" cy="44" rx="28" ry="5" fill={col} />
        <path d="M 36,44 Q 40,26 54,14 Q 60,8 66,14 Q 80,26 84,44 Z" fill={col} />
        <text x="52" y="32" fontSize="9" fill="rgba(255,255,255,0.7)">★</text>
        <text x="63" y="23" fontSize="6" fill="rgba(255,255,255,0.5)">✦</text>
      </g>
    );
    default: return null;
  }
}

/* ─── ACESSÓRIO ──────────────────────────────────────────────────────────── */
function Accessory({ a }: { a: any }) {
  const col = a.color ?? '#4b5563';
  switch (a.style) {
    case 'glasses': return (
      <g>
        <circle cx="51" cy="54" r="7.5" fill="none" stroke={col} strokeWidth="2" />
        <circle cx="69" cy="54" r="7.5" fill="none" stroke={col} strokeWidth="2" />
        <path d="M 58.5,54 L 61.5,54" stroke={col} strokeWidth="2" />
        <path d="M 30,52 L 43.5,54" stroke={col} strokeWidth="2" />
        <path d="M 76.5,54 L 90,52" stroke={col} strokeWidth="2" />
      </g>
    );
    case 'sunglasses': return (
      <g>
        <rect x="40" y="49" width="20" height="12" rx="5" fill={col} />
        <rect x="60" y="49" width="20" height="12" rx="5" fill={col} />
        <path d="M 60,55 L 60,55" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
        <path d="M 30,51 L 40,53" stroke={col} strokeWidth="2" />
        <path d="M 80,53 L 90,51" stroke={col} strokeWidth="2" />
        <path d="M 43,52 L 47,52" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 63,52 L 67,52" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    );
    case 'earring': return (
      <g>
        <circle cx="90" cy="60" r="3.5" fill={col} />
        <path d="M 88,57 Q 91,54 93,57" stroke={col} strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    );
    case 'scar': return (
      <path d="M 63,50 L 69,64" stroke={col} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
    );
    default: return null;
  }
}
