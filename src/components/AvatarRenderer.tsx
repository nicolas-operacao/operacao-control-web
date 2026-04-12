// AvatarRenderer — Flat 2D cartoon illustration style
// ViewBox 100×150, smooth curves with SVG paths

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
  skin:       { faceColor: '#F5C18A', shadeColor: '#D4895A', lightColor: '#FFF0E0' },
  eyes:       { shape: 'round', color: '#2255CC', browColor: '#2c1810' },
  mouth:      { shape: 'smile', color: '#b03030', lipTop: '#e06060' },
  hair:       { style: 'short', color: '#3B1F0E' },
  clothes:    { style: 'polo', color: '#1B3A6B', color2: '#112750', badge: '#C8A030', collar: '#EAEAEA', pantColor: '#1E2D40', pantColor2: '#0f172a', shoeColor: '#1A1A2A' },
  hat:        { style: 'none', color: '#1B3A6B', color2: '#112750' },
  accessory:  { style: 'none', color: '#4B5563' },
};

function sd(eq: AvatarEquipped, key: keyof AvatarEquipped) {
  return { ...DEFAULT[key], ...(eq[key]?.style_data ?? {}) };
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

  const W = 100, H = 150;
  const displayH = Math.round(size * (H / W));

  return (
    <svg
      width={size} height={displayH}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ borderRadius: '10px', flexShrink: 0, display: 'block' }}
    >
      <defs>
        <clipPath id={`cp${uid}`}><rect width={W} height={H} rx="10" ry="10"/></clipPath>
      </defs>
      <g clipPath={`url(#cp${uid})`}>
        <Background bg={bg} uid={uid} />
        <Body sk={sk} cl={cl} />
        <Face sk={sk} ey={ey} mo={mo} ha={ha} ac={ac} uid={uid} />
        <HatLayer ha={ha} ht={ht} sk={sk} uid={uid} />
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND
// ═══════════════════════════════════════════════════════════════
function Background({ bg, uid }: { bg: any; uid: string }) {
  const type = bg.type ?? 'solid';

  if (type === 'office') return (
    <g>
      <rect width="100" height="150" fill="#1C2B4A"/>
      <rect width="100" height="100" fill="#243060"/>
      {/* Floor */}
      <rect y="100" width="100" height="50" fill="#0D1520"/>
      <rect y="100" width="100" height="2" fill="rgba(255,255,255,0.06)"/>
      {/* Window */}
      <rect x="64" y="8" width="28" height="22" rx="2" fill="#7EC8E3" opacity="0.7"/>
      <rect x="64" y="8" width="28" height="22" rx="2" fill="none" stroke="#111" strokeWidth="1"/>
      <line x1="78" y1="8" x2="78" y2="30" stroke="#111" strokeWidth="0.8"/>
      <line x1="64" y1="19" x2="92" y2="19" stroke="#111" strokeWidth="0.8"/>
      {/* Shadow */}
      <ellipse cx="50" cy="144" rx="22" ry="4" fill="rgba(0,0,0,0.35)"/>
    </g>
  );

  if (type === 'arena') return (
    <g>
      <rect width="100" height="150" fill="#1A0505"/>
      <rect y="100" width="100" height="2" fill="#CC2222"/>
      <rect y="102" width="100" height="48" fill="#080000"/>
      <ellipse cx="50" cy="144" rx="22" ry="4" fill="rgba(0,0,0,0.5)"/>
    </g>
  );

  if (type === 'nature') return (
    <g>
      <rect width="100" height="150" fill="#1464A0"/>
      <circle cx="80" cy="18" r="12" fill="#FCD34D"/>
      <ellipse cx="15" cy="20" rx="12" ry="7" fill="rgba(255,255,255,0.75)"/>
      <ellipse cx="50" cy="14" rx="10" ry="5" fill="rgba(255,255,255,0.6)"/>
      <rect y="95" width="100" height="55" fill="#14532D"/>
      <rect y="95" width="100" height="3" fill="#22C55E"/>
      <ellipse cx="50" cy="144" rx="22" ry="4" fill="rgba(0,0,0,0.3)"/>
    </g>
  );

  if (type === 'stars') return (
    <g>
      <rect width="100" height="150" fill="#030712"/>
      {([[8,6],[22,4],[40,8],[60,5],[78,10],[90,4],[12,22],[30,32],[55,18],[72,25],[18,40],[45,35],[88,42],[5,55],[65,48],[15,85],[48,80],[75,88]] as [number,number][]).map(([x,y],i)=>
        <circle key={i} cx={x} cy={y} r={i%4===0?1.5:0.8} fill="white" opacity={0.3+i%5*0.12}/>
      )}
      <ellipse cx="50" cy="144" rx="22" ry="4" fill="rgba(0,0,0,0.6)"/>
    </g>
  );

  if (type === 'neon') return (
    <g>
      <rect width="100" height="150" fill="#05050F"/>
      <rect y="100" width="100" height="2" fill="#A855F7"/>
      <rect y="102" width="100" height="48" fill="#030308"/>
      <ellipse cx="50" cy="144" rx="22" ry="4" fill="rgba(168,85,247,0.2)"/>
    </g>
  );

  if (type === 'gradient') {
    const c0 = bg.colors?.[0] ?? '#1e293b';
    const c1 = bg.colors?.[1] ?? '#0f172a';
    return (
      <g>
        <defs>
          <linearGradient id={`bgG${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c0}/>
            <stop offset="100%" stopColor={c1}/>
          </linearGradient>
        </defs>
        <rect width="100" height="150" fill={`url(#bgG${uid})`}/>
        <ellipse cx="50" cy="144" rx="22" ry="4" fill="rgba(0,0,0,0.4)"/>
      </g>
    );
  }

  const c = bg.colors?.[0] ?? '#1e293b';
  return (
    <g>
      <rect width="100" height="150" fill={c}/>
      <ellipse cx="50" cy="144" rx="22" ry="4" fill="rgba(0,0,0,0.35)"/>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// BODY (clothes, legs, shoes) — drawn BELOW face
// Character center x=50; character top of torso y≈68, bottom y≈148
// ═══════════════════════════════════════════════════════════════
function Body({ sk, cl }: { sk: any; cl: any }) {
  const clr  = cl.color      ?? '#1B3A6B';
  const clr2 = cl.color2     ?? '#112750';
  const pant = cl.pantColor  ?? '#1E2D40';
  const pant2= cl.pantColor2 ?? '#0f172a';
  const shoe = cl.shoeColor  ?? '#1A1A2A';
  const collar = cl.collar   ?? '#EAEAEA';
  const badge  = cl.badge    ?? '#C8A030';
  const style  = cl.style    ?? 'polo';
  const skin   = sk.faceColor ?? '#F5C18A';
  const skinS  = sk.shadeColor ?? '#D4895A';

  // Arms (behind torso)
  // Left arm
  const leftArmPath = `M 25,70 C 18,72 16,85 18,100 C 19,105 24,105 26,100 C 27,88 28,78 32,72 Z`;
  // Right arm
  const rightArmPath = `M 75,70 C 82,72 84,85 82,100 C 81,105 76,105 74,100 C 73,88 72,78 68,72 Z`;

  // Hands
  const leftHandPath  = `M 18,100 C 15,104 14,110 17,113 C 20,116 25,114 26,110 C 27,106 25,101 22,100 Z`;
  const rightHandPath = `M 82,100 C 85,104 86,110 83,113 C 80,116 75,114 74,110 C 73,106 75,101 78,100 Z`;

  // Torso shape
  const torsoPath = `M 32,68 C 30,68 28,70 28,73 L 28,106 C 28,108 30,110 32,110 L 68,110 C 70,110 72,108 72,106 L 72,73 C 72,70 70,68 68,68 Z`;

  // Legs
  const leftLegPath  = `M 32,108 C 30,108 28,110 28,112 L 28,138 C 28,140 30,141 33,141 L 45,141 C 48,141 50,140 50,138 L 50,112 C 50,110 48,108 46,108 Z`;
  const rightLegPath = `M 54,108 C 52,108 50,110 50,112 L 50,138 C 50,140 52,141 55,141 L 67,141 C 70,141 72,140 72,138 L 72,112 C 72,110 70,108 68,108 Z`;

  // Shoes
  const leftShoePath  = `M 26,138 C 24,138 22,140 22,143 C 22,146 24,147 27,147 L 48,147 C 51,147 52,145 52,143 C 52,140 50,138 48,138 Z`;
  const rightShoePath = `M 52,138 C 50,138 48,140 48,143 C 48,145 49,147 52,147 L 73,147 C 76,147 78,146 78,143 C 78,140 76,138 74,138 Z`;

  return (
    <g>
      {/* ── Left Arm ── */}
      <path d={leftArmPath} fill={clr} stroke="#111" strokeWidth="1" strokeLinejoin="round"/>
      <path d={leftArmPath} fill={clr2} opacity="0.35"/>
      {/* ── Right Arm ── */}
      <path d={rightArmPath} fill={clr} stroke="#111" strokeWidth="1" strokeLinejoin="round"/>

      {/* ── Torso ── */}
      <path d={torsoPath} fill={clr} stroke="#111" strokeWidth="1" strokeLinejoin="round"/>
      {/* Torso shade on sides */}
      <path d={`M 28,73 L 28,106 C 28,108 30,110 32,110 L 38,110 L 38,68 L 32,68 C 30,68 28,70 28,73 Z`} fill={clr2} opacity="0.5"/>
      <path d={`M 62,68 L 72,73 L 72,106 C 72,108 70,110 68,110 L 62,110 Z`} fill={clr2} opacity="0.35"/>

      {/* Polo collar */}
      {(style === 'polo' || style === 'shirt') && (
        <>
          <path d={`M 42,68 L 46,78 L 50,74 L 54,78 L 58,68`} fill={collar} stroke="#111" strokeWidth="0.8"/>
          <path d={`M 46,78 L 50,74 L 54,78 L 52,80 L 50,77 L 48,80 Z`} fill="rgba(0,0,0,0.1)"/>
        </>
      )}
      {/* Suit lapels */}
      {(style === 'suit') && (
        <>
          <path d={`M 40,68 L 44,85 L 50,80 L 56,85 L 60,68`} fill={collar} stroke="#111" strokeWidth="0.8"/>
          <path d={`M 44,85 L 50,80 L 56,85 L 52,110 L 48,110 Z`} fill="rgba(255,255,255,0.08)"/>
        </>
      )}
      {/* Hoodie front pocket */}
      {style === 'hoodie' && (
        <>
          <rect x="37" y="90" width="26" height="16" rx="3" fill={clr2} stroke="#111" strokeWidth="0.6"/>
          <path d={`M 42,68 C 44,75 44,82 50,86 C 56,82 56,75 58,68`} fill={collar} stroke="#111" strokeWidth="0.8"/>
        </>
      )}
      {/* Shirt: no collar, just buttons */}
      {style === 'shirt' && (
        <line x1="50" y1="74" x2="50" y2="108" stroke={clr2} strokeWidth="0.8" strokeDasharray="2,3"/>
      )}
      {/* Armor chest plate */}
      {style === 'armor' && (
        <>
          <rect x="33" y="70" width="34" height="32" rx="4" fill={cl.color2 ?? '#9ca3af'} stroke="#111" strokeWidth="1"/>
          <path d={`M 33,80 L 50,75 L 67,80`} fill="none" stroke="#111" strokeWidth="0.8"/>
          <rect x="44" y="82" width="12" height="8" rx="2" fill={cl.color ?? '#6b7280'}/>
        </>
      )}
      {/* Badge (polo/suit) */}
      {(style === 'polo' || style === 'suit') && (
        <circle cx="38" cy="78" r="3" fill={badge} stroke="#111" strokeWidth="0.5"/>
      )}

      {/* Hands */}
      <path d={leftHandPath} fill={skin} stroke="#111" strokeWidth="0.8"/>
      <path d={rightHandPath} fill={skin} stroke="#111" strokeWidth="0.8"/>
      {/* Hand shade */}
      <path d={leftHandPath} fill={skinS} opacity="0.2"/>
      <path d={rightHandPath} fill={skinS} opacity="0.2"/>

      {/* ── Legs ── */}
      <path d={leftLegPath} fill={pant} stroke="#111" strokeWidth="1"/>
      <path d={leftLegPath} fill={pant2} opacity="0.3" />
      <path d={rightLegPath} fill={pant} stroke="#111" strokeWidth="1"/>
      {/* gap between legs (inner shadow) */}
      <rect x="49" y="108" width="2" height="30" fill="#111"/>

      {/* ── Shoes ── */}
      <path d={leftShoePath} fill={shoe} stroke="#111" strokeWidth="1"/>
      <path d={rightShoePath} fill={shoe} stroke="#111" strokeWidth="1"/>
      {/* Shoe highlight */}
      <path d={`M 26,140 C 28,138 38,137 44,139`} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round"/>
      <path d={`M 54,140 C 56,138 66,137 72,139`} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round"/>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// FACE  (neck, head, features) — drawn ABOVE body
// Head center: cx=50, cy=46; rx=18, ry=20
// ═══════════════════════════════════════════════════════════════
function Face({ sk, ey, mo, ha, ac, uid }: { sk: any; ey: any; mo: any; ha: any; ac: any; uid: string }) {
  const face  = sk.faceColor  ?? '#F5C18A';
  const shade = sk.shadeColor ?? '#D4895A';
  const light = sk.lightColor ?? '#FFF0E0';

  const CX = 50, CY = 46;

  return (
    <g>
      {/* ── Hair behind head ── */}
      <HairBack ha={ha} cx={CX} cy={CY} uid={uid}/>

      {/* ── Neck ── */}
      <rect x="44" y="62" width="12" height="10" rx="3" fill={face} stroke="#111" strokeWidth="0.8"/>
      <rect x="44" y="62" width="4" height="10" fill={shade} opacity="0.3" rx="2"/>

      {/* ── Head ── */}
      <ellipse cx={CX} cy={CY} rx="19" ry="21" fill="#111"/>
      <ellipse cx={CX} cy={CY} rx="18" ry="20" fill={face}/>
      {/* Cheek shading */}
      <ellipse cx={CX-8} cy={CY+7} rx="5" ry="4" fill={shade} opacity="0.18"/>
      <ellipse cx={CX+8} cy={CY+7} rx="5" ry="4" fill={shade} opacity="0.18"/>
      {/* Forehead light */}
      <ellipse cx={CX} cy={CY-8} rx="9" ry="5" fill={light} opacity="0.2"/>
      {/* Blush */}
      <ellipse cx={CX-10} cy={CY+9} rx="4" ry="2.5" fill="#E07070" opacity="0.18"/>
      <ellipse cx={CX+10} cy={CY+9} rx="4" ry="2.5" fill="#E07070" opacity="0.18"/>

      {/* ── Eyebrows ── */}
      <EyeBrows ey={ey} cx={CX} cy={CY}/>

      {/* ── Eyes ── */}
      <Eyes ey={ey} cx={CX} cy={CY} uid={uid}/>

      {/* ── Nose ── */}
      <ellipse cx={CX} cy={CY+7} rx="2" ry="1.5" fill={shade} opacity="0.5"/>

      {/* ── Mouth ── */}
      <Mouth mo={mo} cx={CX} cy={CY}/>

      {/* ── Accessory ── */}
      <Accessory ac={ac} cx={CX} cy={CY}/>

      {/* ── Hair front ── */}
      <HairFront ha={ha} cx={CX} cy={CY} uid={uid}/>
    </g>
  );
}

// ── EYEBROWS ───────────────────────────────────────────────────
function EyeBrows({ ey, cx, cy }: { ey: any; cx: number; cy: number }) {
  const bc = ey.browColor ?? '#3d2b1f';
  const shape = ey.shape ?? 'round';
  if (shape === 'angry') {
    return (
      <g>
        <path d={`M ${cx-12},${cy-9} C ${cx-10},${cy-11} ${cx-6},${cy-9} ${cx-4},${cy-8}`} stroke={bc} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d={`M ${cx+4},${cy-8} C ${cx+6},${cy-9} ${cx+10},${cy-11} ${cx+12},${cy-9}`} stroke={bc} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </g>
    );
  }
  return (
    <g>
      <path d={`M ${cx-12},${cy-10} C ${cx-9},${cy-12} ${cx-5},${cy-11} ${cx-4},${cy-10}`} stroke={bc} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      <path d={`M ${cx+4},${cy-10} C ${cx+5},${cy-11} ${cx+9},${cy-12} ${cx+12},${cy-10}`} stroke={bc} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </g>
  );
}

// ── EYES ───────────────────────────────────────────────────────
function Eyes({ ey, cx, cy, uid }: { ey: any; cx: number; cy: number; uid: string }) {
  const iris  = ey.color  ?? '#2255CC';
  const shape = ey.shape  ?? 'round';

  const lx = cx - 8, rx = cx + 8, ey2 = cy - 2;

  if (shape === 'almond') {
    return (
      <g>
        {/* Left */}
        <path d={`M ${lx-5},${ey2} C ${lx-3},${ey2-3} ${lx+3},${ey2-3} ${lx+5},${ey2} C ${lx+3},${ey2+2} ${lx-3},${ey2+2} Z`} fill="white" stroke="#111" strokeWidth="0.8"/>
        <circle cx={lx} cy={ey2} r="2.5" fill={iris}/>
        <circle cx={lx} cy={ey2} r="1" fill="#111"/>
        <circle cx={lx+1} cy={ey2-1} r="0.7" fill="white"/>
        {/* Right */}
        <path d={`M ${rx-5},${ey2} C ${rx-3},${ey2-3} ${rx+3},${ey2-3} ${rx+5},${ey2} C ${rx+3},${ey2+2} ${rx-3},${ey2+2} Z`} fill="white" stroke="#111" strokeWidth="0.8"/>
        <circle cx={rx} cy={ey2} r="2.5" fill={iris}/>
        <circle cx={rx} cy={ey2} r="1" fill="#111"/>
        <circle cx={rx+1} cy={ey2-1} r="0.7" fill="white"/>
      </g>
    );
  }

  if (shape === 'angry') {
    return (
      <g>
        <path d={`M ${lx-4.5},${ey2+2} C ${lx-2},${ey2-2} ${lx+2},${ey2-2} ${lx+4.5},${ey2+2} C ${lx+2},${ey2+4} ${lx-2},${ey2+4} Z`} fill="white" stroke="#111" strokeWidth="0.8"/>
        <circle cx={lx} cy={ey2+1} r="2.5" fill={iris}/>
        <circle cx={lx} cy={ey2+1} r="1" fill="#111"/>
        <circle cx={lx+1} cy={ey2} r="0.6" fill="white"/>
        <path d={`M ${rx-4.5},${ey2+2} C ${rx-2},${ey2-2} ${rx+2},${ey2-2} ${rx+4.5},${ey2+2} C ${rx+2},${ey2+4} ${rx-2},${ey2+4} Z`} fill="white" stroke="#111" strokeWidth="0.8"/>
        <circle cx={rx} cy={ey2+1} r="2.5" fill={iris}/>
        <circle cx={rx} cy={ey2+1} r="1" fill="#111"/>
        <circle cx={rx+1} cy={ey2} r="0.6" fill="white"/>
      </g>
    );
  }

  // round (default)
  return (
    <g>
      <circle cx={lx} cy={ey2} r="4.5" fill="white" stroke="#111" strokeWidth="0.8"/>
      <circle cx={lx} cy={ey2} r="3" fill={iris}/>
      <circle cx={lx} cy={ey2} r="1.4" fill="#111"/>
      <circle cx={lx+1.2} cy={ey2-1.2} r="0.8" fill="white"/>
      <circle cx={rx} cy={ey2} r="4.5" fill="white" stroke="#111" strokeWidth="0.8"/>
      <circle cx={rx} cy={ey2} r="3" fill={iris}/>
      <circle cx={rx} cy={ey2} r="1.4" fill="#111"/>
      <circle cx={rx+1.2} cy={ey2-1.2} r="0.8" fill="white"/>
    </g>
  );
}

// ── MOUTH ──────────────────────────────────────────────────────
function Mouth({ mo, cx, cy }: { mo: any; cx: number; cy: number }) {
  const lipBot = mo.color  ?? '#b03030';
  const lipTop = mo.lipTop ?? '#e06060';
  const shape  = mo.shape  ?? 'smile';
  const my = cy + 13;

  if (shape === 'bigsmile') {
    return (
      <g>
        <path d={`M ${cx-7},${my} C ${cx-6},${my+5} ${cx+6},${my+5} ${cx+7},${my} Z`} fill={lipBot} stroke="#111" strokeWidth="0.8"/>
        <path d={`M ${cx-7},${my} C ${cx-5},${my+2} ${cx+5},${my+2} ${cx+7},${my}`} fill={lipTop} stroke="#111" strokeWidth="0.8"/>
        <path d={`M ${cx-6},${my+2} C ${cx-4},${my+4} ${cx+4},${my+4} ${cx+6},${my+2}`} fill="rgba(255,255,255,0.25)" strokeWidth="0"/>
        {/* teeth hint */}
        <path d={`M ${cx-5},${my+0.5} L ${cx+5},${my+0.5} L ${cx+4},${my+3} L ${cx-4},${my+3} Z`} fill="rgba(255,255,255,0.7)"/>
      </g>
    );
  }

  if (shape === 'smirk') {
    return (
      <g>
        <path d={`M ${cx-5},${my+1} C ${cx},${my} ${cx+5},${my+3} ${cx+7},${my+1}`} fill="none" stroke="#111" strokeWidth="1.2" strokeLinecap="round"/>
        <path d={`M ${cx-5},${my+1} C ${cx},${my+0.5} ${cx+5},${my+2.5} ${cx+7},${my+1}`} fill="none" stroke={lipTop} strokeWidth="0.8" strokeLinecap="round"/>
      </g>
    );
  }

  if (shape === 'serious') {
    return (
      <g>
        <path d={`M ${cx-6},${my+1} L ${cx+6},${my+1}`} fill="none" stroke="#111" strokeWidth="1.5" strokeLinecap="round"/>
        <path d={`M ${cx-5},${my} L ${cx+5},${my}`} fill="none" stroke={lipTop} strokeWidth="0.8" strokeLinecap="round"/>
      </g>
    );
  }

  // smile (default)
  return (
    <g>
      <path d={`M ${cx-6},${my} C ${cx-5},${my+4} ${cx+5},${my+4} ${cx+6},${my}`} fill={lipBot} stroke="#111" strokeWidth="0.8"/>
      <path d={`M ${cx-6},${my} C ${cx-4},${my+1} ${cx+4},${my+1} ${cx+6},${my}`} fill={lipTop}/>
    </g>
  );
}

// ── ACCESSORY ──────────────────────────────────────────────────
function Accessory({ ac, cx, cy }: { ac: any; cx: number; cy: number }) {
  const style = ac.style ?? 'none';
  const color = ac.color ?? '#4b5563';
  const ey2 = cy - 2;

  if (style === 'glasses') {
    return (
      <g>
        <circle cx={cx-8} cy={ey2} r="5.5" fill="none" stroke={color} strokeWidth="1.2"/>
        <circle cx={cx+8} cy={ey2} r="5.5" fill="none" stroke={color} strokeWidth="1.2"/>
        <line x1={cx-2.5} y1={ey2} x2={cx+2.5} y2={ey2} stroke={color} strokeWidth="1"/>
        <line x1={cx-13.5} y1={ey2} x2={cx-18} y2={ey2-1} stroke={color} strokeWidth="1"/>
        <line x1={cx+13.5} y1={ey2} x2={cx+18} y2={ey2-1} stroke={color} strokeWidth="1"/>
      </g>
    );
  }

  if (style === 'sunglasses') {
    return (
      <g>
        <rect x={cx-15} y={ey2-4.5} width="13" height="9" rx="4.5" fill={color} stroke="#111" strokeWidth="0.8" opacity="0.9"/>
        <rect x={cx+2} y={ey2-4.5} width="13" height="9" rx="4.5" fill={color} stroke="#111" strokeWidth="0.8" opacity="0.9"/>
        <line x1={cx-2} y1={ey2} x2={cx+2} y2={ey2} stroke="#111" strokeWidth="1"/>
        <line x1={cx-15} y1={ey2} x2={cx-19} y2={ey2-1} stroke="#111" strokeWidth="1"/>
        <line x1={cx+15} y1={ey2} x2={cx+19} y2={ey2-1} stroke="#111" strokeWidth="1"/>
        <path d={`M ${cx-13},${ey2-3} C ${cx-11},${ey2-4} ${cx-8},${ey2-4} ${cx-7},${ey2-3}`} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" fill="none"/>
      </g>
    );
  }

  if (style === 'earring') {
    return (
      <g>
        <circle cx={cx-18.5} cy={cy+3} r="2" fill={color} stroke="#111" strokeWidth="0.5"/>
        <line x1={cx-18.5} y1={cy+1} x2={cx-18.5} y2={cy-1} stroke={color} strokeWidth="0.8"/>
      </g>
    );
  }

  if (style === 'scar') {
    return (
      <path d={`M ${cx+3},${cy-5} C ${cx+5},${cy-2} ${cx+4},${cy+2} ${cx+6},${cy+5}`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// HAIR (back — drawn behind head)
// ═══════════════════════════════════════════════════════════════
function HairBack({ ha, cx, cy, uid }: { ha: any; cx: number; cy: number; uid: string }) {
  const style = ha.style ?? 'short';
  const color = ha.color ?? '#3B1F0E';

  if (style === 'bald') return null;

  if (style === 'long') {
    // Long hair falls behind body
    return (
      <g>
        <path d={`M ${cx-18},${cy} C ${cx-22},${cy+20} ${cx-20},${cy+50} ${cx-16},${cy+60} C ${cx-10},${cy+65} ${cx-5},${cy+60} ${cx-5},${cy+55}`} fill={color} stroke="#111" strokeWidth="0.8"/>
        <path d={`M ${cx+18},${cy} C ${cx+22},${cy+20} ${cx+20},${cy+50} ${cx+16},${cy+60} C ${cx+10},${cy+65} ${cx+5},${cy+60} ${cx+5},${cy+55}`} fill={color} stroke="#111" strokeWidth="0.8"/>
        <rect x={cx-18} y={cy-6} width="36" height="14" rx="2" fill={color}/>
      </g>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// HAIR (front — drawn above face features)
// ═══════════════════════════════════════════════════════════════
function HairFront({ ha, cx, cy, uid }: { ha: any; cx: number; cy: number; uid: string }) {
  const style = ha.style ?? 'short';
  const color = ha.color ?? '#3B1F0E';

  if (style === 'bald') return null;

  // Short hair — sits on top of head, slight cap shape
  if (style === 'short') {
    return (
      <g>
        <path d={`M ${cx-18},${cy} C ${cx-19},${cy-16} ${cx-14},${cy-22} ${cx},${cy-24} C ${cx+14},${cy-22} ${cx+19},${cy-16} ${cx+18},${cy}`} fill={color} stroke="#111" strokeWidth="1"/>
        {/* side sideburn */}
        <rect x={cx-19} y={cy-2} width="4" height="8" rx="2" fill={color}/>
        <rect x={cx+15} y={cy-2} width="4" height="8" rx="2" fill={color}/>
        {/* highlight */}
        <path d={`M ${cx-8},${cy-22} C ${cx},${cy-26} ${cx+8},${cy-22}`} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round"/>
      </g>
    );
  }

  if (style === 'long') {
    return (
      <g>
        <path d={`M ${cx-18},${cy} C ${cx-19},${cy-16} ${cx-14},${cy-22} ${cx},${cy-24} C ${cx+14},${cy-22} ${cx+19},${cy-16} ${cx+18},${cy}`} fill={color} stroke="#111" strokeWidth="1"/>
        <rect x={cx-19} y={cy-2} width="4" height="12" rx="2" fill={color}/>
        <rect x={cx+15} y={cy-2} width="4" height="12" rx="2" fill={color}/>
        <path d={`M ${cx-8},${cy-22} C ${cx},${cy-26} ${cx+8},${cy-22}`} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round"/>
      </g>
    );
  }

  // Spiky hair
  if (style === 'spiky') {
    return (
      <g>
        {/* base */}
        <path d={`M ${cx-18},${cy} C ${cx-18},${cy-14} ${cx-12},${cy-20} ${cx},${cy-22} C ${cx+12},${cy-20} ${cx+18},${cy-14} ${cx+18},${cy}`} fill={color}/>
        {/* spikes */}
        <path d={`M ${cx-14},${cy-16} L ${cx-18},${cy-30} L ${cx-10},${cy-22}`} fill={color} stroke="#111" strokeWidth="0.8" strokeLinejoin="round"/>
        <path d={`M ${cx-5},${cy-20} L ${cx-6},${cy-34} L ${cx+3},${cy-22}`} fill={color} stroke="#111" strokeWidth="0.8" strokeLinejoin="round"/>
        <path d={`M ${cx+5},${cy-20} L ${cx+7},${cy-34} L ${cx+14},${cy-20}`} fill={color} stroke="#111" strokeWidth="0.8" strokeLinejoin="round"/>
        <path d={`M ${cx+12},${cy-18} L ${cx+18},${cy-28} L ${cx+20},${cy-16}`} fill={color} stroke="#111" strokeWidth="0.8" strokeLinejoin="round"/>
        <path d={`M ${cx-18},${cy} C ${cx-18},${cy-14} ${cx-12},${cy-20} ${cx},${cy-22} C ${cx+12},${cy-20} ${cx+18},${cy-14} ${cx+18},${cy}`} fill={color} stroke="#111" strokeWidth="1"/>
        <rect x={cx-19} y={cy-2} width="4" height="8" rx="2" fill={color}/>
        <rect x={cx+15} y={cy-2} width="4" height="8" rx="2" fill={color}/>
      </g>
    );
  }

  // Mohawk
  if (style === 'mohawk') {
    return (
      <g>
        {/* sides shaved */}
        <path d={`M ${cx-18},${cy} C ${cx-18},${cy-10} ${cx-14},${cy-16} ${cx-8},${cy-18}`} fill={color} stroke="#111" strokeWidth="1"/>
        <path d={`M ${cx+18},${cy} C ${cx+18},${cy-10} ${cx+14},${cy-16} ${cx+8},${cy-18}`} fill={color} stroke="#111" strokeWidth="1"/>
        {/* mohawk strip */}
        <path d={`M ${cx-4},${cy-18} L ${cx-5},${cy-40} L ${cx},${cy-44} L ${cx+5},${cy-40} L ${cx+4},${cy-18} Z`} fill={color} stroke="#111" strokeWidth="0.8"/>
        <rect x={cx-19} y={cy-2} width="4" height="8" rx="2" fill={color}/>
        <rect x={cx+15} y={cy-2} width="4" height="8" rx="2" fill={color}/>
      </g>
    );
  }

  // Afro (black power)
  if (style === 'afro') {
    const shade = shadeHex(color, -30);
    return (
      <g>
        {/* Large rounded afro puff */}
        <circle cx={cx} cy={cy-18} r="26" fill={color} stroke="#111" strokeWidth="1.2"/>
        {/* texture bumps */}
        {([[-12,-6],[-6,-12],[0,-8],[6,-12],[12,-6],[-14,2],[-4,-2],[4,-2],[14,2],[0,0],[-8,8],[8,8]] as [number,number][]).map(([dx,dy],i) => (
          <circle key={i} cx={cx+dx} cy={cy-18+dy} r="3.5" fill={shade} opacity="0.4"/>
        ))}
        {/* Cover sides of face */}
        <circle cx={cx-17} cy={cy} r="7" fill={color} stroke="#111" strokeWidth="1"/>
        <circle cx={cx+17} cy={cy} r="7" fill={color} stroke="#111" strokeWidth="1"/>
        {/* highlight */}
        <circle cx={cx-6} cy={cy-26} r="5" fill="rgba(255,255,255,0.1)"/>
      </g>
    );
  }

  // Topete (quiff/pompadour)
  if (style === 'topete') {
    return (
      <g>
        {/* base */}
        <path d={`M ${cx-18},${cy} C ${cx-19},${cy-14} ${cx-12},${cy-20} ${cx},${cy-22} C ${cx+12},${cy-20} ${cx+19},${cy-14} ${cx+18},${cy}`} fill={color} stroke="#111" strokeWidth="1"/>
        {/* swept-up front quiff */}
        <path d={`M ${cx-8},${cy-20} C ${cx-10},${cy-28} ${cx-6},${cy-36} ${cx},${cy-38} C ${cx+6},${cy-36} ${cx+10},${cy-28} ${cx+8},${cy-20} C ${cx+4},${cy-22} ${cx-4},${cy-22} Z`} fill={color} stroke="#111" strokeWidth="0.9"/>
        {/* quiff shape line */}
        <path d={`M ${cx-6},${cy-22} C ${cx-4},${cy-32} ${cx+4},${cy-32} ${cx+6},${cy-22}`} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" strokeLinecap="round"/>
        <rect x={cx-19} y={cy-2} width="4" height="8" rx="2" fill={color}/>
        <rect x={cx+15} y={cy-2} width="4" height="8" rx="2" fill={color}/>
      </g>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// HAT — drawn last (topmost)
// ═══════════════════════════════════════════════════════════════
function HatLayer({ ha, ht, sk, uid }: { ha: any; ht: any; sk: any; uid: string }) {
  const style  = ht.style  ?? 'none';
  const color  = ht.color  ?? '#1B3A6B';
  const color2 = ht.color2 ?? '#112750';
  const cx = 50, cy = 46;

  if (style === 'none') return null;

  if (style === 'cap') {
    return (
      <g>
        {/* bill */}
        <path d={`M ${cx-20},${cy-16} C ${cx-10},${cy-12} ${cx+10},${cy-12} ${cx+20},${cy-16} L ${cx+24},${cy-14} C ${cx+10},${cy-8} ${cx-10},${cy-8} ${cx-24},${cy-14} Z`} fill={color2} stroke="#111" strokeWidth="0.8"/>
        {/* cap dome */}
        <path d={`M ${cx-18},${cy-14} C ${cx-20},${cy-26} ${cx-10},${cy-34} ${cx},${cy-34} C ${cx+10},${cy-34} ${cx+20},${cy-26} ${cx+18},${cy-14} Z`} fill={color} stroke="#111" strokeWidth="1"/>
        {/* band */}
        <path d={`M ${cx-18},${cy-14} C ${cx-10},${cy-12} ${cx+10},${cy-12} ${cx+18},${cy-14}`} stroke={color2} strokeWidth="2.5" fill="none"/>
        {/* highlight */}
        <path d={`M ${cx-8},${cy-32} C ${cx},${cy-36} ${cx+8},${cy-32}`} stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </g>
    );
  }

  if (style === 'crown') {
    return (
      <g>
        {/* base band */}
        <rect x={cx-16} y={cy-26} width="32" height="8" rx="2" fill={color} stroke="#111" strokeWidth="0.8"/>
        {/* points */}
        <path d={`M ${cx-14},${cy-26} L ${cx-14},${cy-36} L ${cx-8},${cy-28}`} fill={color} stroke="#111" strokeWidth="0.8"/>
        <path d={`M ${cx},${cy-26} L ${cx},${cy-40} L ${cx+6},${cy-28}`} fill={color} stroke="#111" strokeWidth="0.8"/>
        <path d={`M ${cx+14},${cy-26} L ${cx+14},${cy-36} L ${cx+8},${cy-28}`} fill={color} stroke="#111" strokeWidth="0.8"/>
        <path d={`M ${cx-14},${cy-26} L ${cx-8},${cy-28} L ${cx},${cy-26} L ${cx+8},${cy-28} L ${cx+14},${cy-26}`} fill={color} stroke="#111" strokeWidth="0.8"/>
        {/* gems */}
        <circle cx={cx-11} cy={cy-22} r="2" fill="#E84848"/>
        <circle cx={cx} cy={cy-22} r="2" fill="#4BE84B"/>
        <circle cx={cx+11} cy={cy-22} r="2" fill="#4848E8"/>
      </g>
    );
  }

  if (style === 'cowboy') {
    return (
      <g>
        {/* brim */}
        <ellipse cx={cx} cy={cy-20} rx="24" ry="5" fill={color2} stroke="#111" strokeWidth="0.8"/>
        {/* crown */}
        <path d={`M ${cx-14},${cy-20} C ${cx-16},${cy-32} ${cx-8},${cy-40} ${cx},${cy-40} C ${cx+8},${cy-40} ${cx+16},${cy-32} ${cx+14},${cy-20} Z`} fill={color} stroke="#111" strokeWidth="1"/>
        {/* indent top */}
        <path d={`M ${cx-6},${cy-38} C ${cx-2},${cy-42} ${cx+2},${cy-42} ${cx+6},${cy-38}`} fill="none" stroke={color2} strokeWidth="1.5" strokeLinecap="round"/>
        {/* band */}
        <path d={`M ${cx-14},${cy-20} C ${cx-8},${cy-22} ${cx+8},${cy-22} ${cx+14},${cy-20}`} stroke={color2} strokeWidth="2" fill="none"/>
      </g>
    );
  }

  if (style === 'wizard') {
    return (
      <g>
        {/* brim */}
        <ellipse cx={cx} cy={cy-22} rx="22" ry="5" fill={color2} stroke="#111" strokeWidth="0.8"/>
        {/* cone */}
        <path d={`M ${cx-14},${cy-22} C ${cx-8},${cy-34} ${cx-4},${cy-50} ${cx},${cy-58} C ${cx+4},${cy-50} ${cx+8},${cy-34} ${cx+14},${cy-22} Z`} fill={color} stroke="#111" strokeWidth="1"/>
        {/* stars on hat */}
        <circle cx={cx-4} cy={cy-34} r="1.5" fill="#FCD34D"/>
        <circle cx={cx+5} cy={cy-40} r="1" fill="#FCD34D"/>
        {/* highlight */}
        <path d={`M ${cx-5},${cy-52} C ${cx-2},${cy-56} ${cx+2},${cy-52}`} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeLinecap="round"/>
      </g>
    );
  }

  return null;
}

// ── helper: darken a hex color ─────────────────────────────────
function shadeHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
