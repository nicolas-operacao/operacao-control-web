// AvatarRenderer — baseado no estilo flat design do Gemini SVG
// ViewBox 200×220, personagem com cabeça arredondada, orelhas, cabelo variável

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
  skin:       { faceColor: '#FFC898', shadeColor: '#D4895A', lightColor: '#FFE8D6' },
  eyes:       { shape: 'round', color: '#333333', browColor: '#3D2314' },
  mouth:      { shape: 'smile', color: '#b03030', lipTop: '#e06060' },
  hair:       { style: 'short', color: '#3D2314' },
  clothes:    { style: 'polo', color: '#2C3E50', color2: '#1a2533', badge: '#C8A030', collar: '#ffffff', pantColor: '#1e293b', pantColor2: '#0f172a', shoeColor: '#1a1a2e' },
  hat:        { style: 'none', color: '#1B3A6B', color2: '#112750' },
  accessory:  { style: 'none', color: '#4B5563' },
};

function sd(eq: AvatarEquipped, key: keyof AvatarEquipped) {
  return { ...DEFAULT[key], ...(eq[key]?.style_data ?? {}) };
}

// darken/lighten a hex color
function adjustHex(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
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

  // ViewBox 200x220 (proporção do Gemini SVG)
  const W = 200, H = 220;
  const displayH = Math.round(size * (H / W));

  const skin     = sk.faceColor  ?? '#FFC898';
  const skinS    = sk.shadeColor ?? '#D4895A';
  const hairC    = ha.color ?? '#3D2314';
  const shirtC   = cl.color  ?? '#2C3E50';
  const shirtC2  = cl.color2 ?? '#1a2533';
  const pantC    = cl.pantColor  ?? '#1e293b';
  const shoeC    = cl.shoeColor  ?? '#1a1a2e';

  return (
    <svg
      width={size}
      height={displayH}
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ borderRadius: '10px', flexShrink: 0, display: 'block' }}
    >
      <defs>
        <clipPath id={`cp${uid}`}><rect width={W} height={H} rx="12" ry="12"/></clipPath>
      </defs>
      <g clipPath={`url(#cp${uid})`}>

        {/* ── FUNDO ── */}
        <Background bg={bg} W={W} H={H} uid={uid} />

        {/* ── SOMBRA NO CHÃO ── */}
        <ellipse cx="100" cy="212" rx="40" ry="6" fill="rgba(0,0,0,0.25)" />

        {/* ── ROUPA / CORPO ── */}
        <Body cl={cl} skin={skin} skinS={skinS} shirtC={shirtC} shirtC2={shirtC2} pantC={pantC} shoeC={shoeC} uid={uid} />

        {/* ── PESCOÇO ── */}
        <rect x="85" y="148" width="30" height="22" rx="6" fill={skin} />
        <rect x="85" y="148" width="30" height="10" rx="6" fill="rgba(0,0,0,0.08)" />

        {/* ── ORELHAS ── */}
        <circle cx="60" cy="108" r="14" fill={skin} />
        <circle cx="140" cy="108" r="14" fill={skin} />
        <circle cx="60"  cy="108" r="8"  fill="rgba(0,0,0,0.08)" />
        <circle cx="140" cy="108" r="8"  fill="rgba(0,0,0,0.08)" />

        {/* ── CABELO (atrás da cabeça) ── */}
        <HairBack ha={ha} hairC={hairC} uid={uid} />

        {/* ── CABEÇA ── */}
        <rect x="60" y="55" width="80" height="100" rx="35" fill={skin} />
        {/* sombra lateral esquerda */}
        <rect x="60" y="55" width="12" height="100" rx="6" fill="rgba(0,0,0,0.06)" />
        {/* luz testa */}
        <ellipse cx="100" cy="68" rx="25" ry="12" fill="rgba(255,255,255,0.12)" />
        {/* bochecha esquerda */}
        <ellipse cx="73" cy="120" rx="9" ry="6" fill="rgba(220,100,100,0.12)" />
        {/* bochecha direita */}
        <ellipse cx="127" cy="120" rx="9" ry="6" fill="rgba(220,100,100,0.12)" />

        {/* ── SOBRANCELHAS ── */}
        <Eyebrows ey={ey} hairC={hairC} />

        {/* ── OLHOS ── */}
        <Eyes ey={ey} uid={uid} />

        {/* ── NARIZ ── */}
        <path d="M 100 113 L 95 125 L 102 125" stroke="rgba(0,0,0,0.18)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* ── BOCA ── */}
        <Mouth mo={mo} />

        {/* ── ACESSÓRIO ── */}
        <Accessory ac={ac} />

        {/* ── CABELO (frente) ── */}
        <HairFront ha={ha} hairC={hairC} uid={uid} />

        {/* ── CHAPÉU ── */}
        <Hat ht={ht} uid={uid} />

      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUND  (200×220)
// ═══════════════════════════════════════════════════════════════
function Background({ bg, W, H, uid }: { bg: any; W: number; H: number; uid: string }) {
  const type = bg.type ?? 'solid';

  if (type === 'office') return (
    <g>
      <rect width={W} height={H} fill="#1C2B4A"/>
      <rect width={W} height={170} fill="#243060"/>
      <rect y="160" width={W} height="60" fill="#0D1520"/>
      <rect y="160" width={W} height="3" fill="rgba(255,255,255,0.05)"/>
      {/* janela */}
      <rect x="130" y="12" width="55" height="40" rx="4" fill="#7EC8E3" opacity="0.65"/>
      <rect x="130" y="12" width="55" height="40" rx="4" fill="none" stroke="#0a0a0a" strokeWidth="1.5"/>
      <line x1="157" y1="12" x2="157" y2="52" stroke="#0a0a0a" strokeWidth="1.2"/>
      <line x1="130" y1="32" x2="185" y2="32" stroke="#0a0a0a" strokeWidth="1.2"/>
    </g>
  );

  if (type === 'arena') return (
    <g>
      <rect width={W} height={H} fill="#1A0505"/>
      <rect y="160" width={W} height="3" fill="#CC2222"/>
      <rect y="163" width={W} height="57" fill="#080000"/>
    </g>
  );

  if (type === 'nature') return (
    <g>
      <rect width={W} height={H} fill="#1464A0"/>
      <circle cx="160" cy="30" r="22" fill="#FCD34D"/>
      <ellipse cx="35" cy="35" rx="22" ry="12" fill="rgba(255,255,255,0.7)"/>
      <ellipse cx="100" cy="22" rx="18" ry="10" fill="rgba(255,255,255,0.55)"/>
      <rect y="155" width={W} height="65" fill="#14532D"/>
      <rect y="155" width={W} height="5" fill="#22C55E"/>
    </g>
  );

  if (type === 'stars') return (
    <g>
      <rect width={W} height={H} fill="#030712"/>
      {([[16,12],[44,8],[80,16],[120,10],[156,20],[180,8],[190,36],[170,56],[24,44],[60,64],[110,36],[144,50],[36,80],[90,70],[176,84],[10,110],[130,96],[30,170],[96,160],[150,176]] as [number,number][]).map(([x,y],i)=>
        <circle key={i} cx={x} cy={y} r={i%4===0?2:1.2} fill="white" opacity={0.3+i%5*0.12}/>
      )}
    </g>
  );

  if (type === 'neon') return (
    <g>
      <rect width={W} height={H} fill="#05050F"/>
      <rect y="160" width={W} height="3" fill="#A855F7"/>
      <rect y="163" width={W} height="57" fill="#030308"/>
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
        <rect width={W} height={H} fill={`url(#bgG${uid})`}/>
      </g>
    );
  }

  const c = bg.colors?.[0] ?? '#1e293b';
  return <rect width={W} height={H} fill={c}/>;
}

// ═══════════════════════════════════════════════════════════════
// BODY — roupa, braços, pernas, sapatos
// ═══════════════════════════════════════════════════════════════
function Body({ cl, skin, skinS, shirtC, shirtC2, pantC, shoeC, uid }: {
  cl: any; skin: string; skinS: string; shirtC: string; shirtC2: string;
  pantC: string; shoeC: string; uid: string;
}) {
  const style  = cl.style  ?? 'polo';
  const collar = cl.collar ?? '#ffffff';
  const badge  = cl.badge  ?? '#C8A030';
  const pant2  = cl.pantColor2 ?? adjustHex(pantC, -20);

  return (
    <g>
      {/* ── Braço esquerdo ── */}
      <path d={`M 58,168 C 42,170 34,185 36,202 C 38,212 46,214 50,208 C 52,198 55,182 65,172 Z`}
        fill={shirtC} stroke="#111" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d={`M 58,168 C 42,170 34,185 36,202 C 38,212 46,214 50,208 C 52,198 55,182 65,172 Z`}
        fill={shirtC2} opacity="0.3"/>
      {/* Mão esquerda */}
      <ellipse cx="40" cy="208" rx="9" ry="7" fill={skin} stroke="#111" strokeWidth="1"/>
      <ellipse cx="40" cy="208" rx="9" ry="7" fill="rgba(0,0,0,0.1)"/>

      {/* ── Braço direito ── */}
      <path d={`M 142,168 C 158,170 166,185 164,202 C 162,212 154,214 150,208 C 148,198 145,182 135,172 Z`}
        fill={shirtC} stroke="#111" strokeWidth="1.2" strokeLinejoin="round"/>
      {/* Mão direita */}
      <ellipse cx="160" cy="208" rx="9" ry="7" fill={skin} stroke="#111" strokeWidth="1"/>
      <ellipse cx="160" cy="208" rx="9" ry="7" fill="rgba(0,0,0,0.1)"/>

      {/* ── Torso ── */}
      <path d={`M 55,167 C 52,167 48,170 48,174 L 48,210 C 48,213 51,215 55,215 L 145,215 C 149,215 152,213 152,210 L 152,174 C 152,170 148,167 145,167 Z`}
        fill={shirtC} stroke="#111" strokeWidth="1.2"/>
      {/* Sombra lateral torso */}
      <path d={`M 48,174 L 48,210 C 48,213 51,215 55,215 L 65,215 L 65,167 L 55,167 C 52,167 48,170 48,174 Z`}
        fill={shirtC2} opacity="0.45"/>
      <path d={`M 135,167 L 152,174 L 152,210 C 152,213 149,215 145,215 L 135,215 Z`}
        fill={shirtC2} opacity="0.3"/>

      {/* ── Gola / detalhes de roupa ── */}
      {(style === 'polo' || style === 'shirt') && (
        <>
          <path d={`M 82,167 L 88,180 L 100,174 L 112,180 L 118,167`}
            fill={collar} stroke="#111" strokeWidth="1"/>
          <path d={`M 88,180 L 100,174 L 112,180 L 109,184 L 100,179 L 91,184 Z`}
            fill="rgba(0,0,0,0.1)"/>
        </>
      )}
      {style === 'suit' && (
        <>
          <path d={`M 78,167 L 86,192 L 100,184 L 114,192 L 122,167`}
            fill={collar} stroke="#111" strokeWidth="1"/>
          <path d={`M 86,192 L 100,184 L 114,192 L 110,215 L 90,215 Z`}
            fill="rgba(255,255,255,0.07)"/>
          {/* gravata */}
          <path d={`M 97,178 L 100,184 L 103,178 L 101,215 L 99,215 Z`}
            fill={adjustHex(shirtC, -30)} stroke="#111" strokeWidth="0.7"/>
        </>
      )}
      {style === 'hoodie' && (
        <>
          <path d={`M 82,167 C 86,178 86,186 100,190 C 114,186 114,178 118,167`}
            fill={collar} stroke="#111" strokeWidth="1"/>
          <rect x="74" y="192" width="52" height="20" rx="5"
            fill={shirtC2} stroke="#111" strokeWidth="0.8"/>
        </>
      )}
      {style === 'armor' && (
        <>
          <rect x="60" y="170" width="80" height="42" rx="6"
            fill={cl.color2 ?? '#9ca3af'} stroke="#111" strokeWidth="1.2"/>
          <path d={`M 60,182 L 100,175 L 140,182`}
            fill="none" stroke="#111" strokeWidth="1"/>
          <rect x="88" y="186" width="24" height="16" rx="3"
            fill={shirtC}/>
        </>
      )}

      {/* Badge (polo/suit) */}
      {(style === 'polo' || style === 'suit') && (
        <circle cx="72" cy="180" r="5" fill={badge} stroke="#111" strokeWidth="0.8"/>
      )}

      {/* ── Pernas ── */}
      {/* perna esquerda */}
      <rect x="60" y="213" width="34" height="45" rx="6"
        fill={pantC} stroke="#111" strokeWidth="1"/>
      <rect x="60" y="213" width="10" height="45" rx="4"
        fill={pant2} opacity="0.4"/>
      {/* perna direita */}
      <rect x="106" y="213" width="34" height="45" rx="6"
        fill={pantC} stroke="#111" strokeWidth="1"/>
      <rect x="130" y="213" width="10" height="45" rx="4"
        fill={pant2} opacity="0.4"/>
      {/* gap entre pernas */}
      <rect x="93" y="213" width="14" height="45" fill="#111"/>

      {/* ── Sapatos ── */}
      <path d={`M 54,254 C 50,254 46,257 46,261 C 46,265 49,267 54,267 L 96,267 C 100,267 102,265 102,261 C 102,257 99,254 95,254 Z`}
        fill={shoeC} stroke="#111" strokeWidth="1"/>
      <path d={`M 104,254 C 100,254 98,257 98,261 C 98,265 100,267 104,267 L 146,267 C 151,267 154,265 154,261 C 154,257 150,254 146,254 Z`}
        fill={shoeC} stroke="#111" strokeWidth="1"/>
      {/* brilho sapato */}
      <path d={`M 54,257 C 58,255 72,254 80,256`}
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
      <path d={`M 106,257 C 110,255 124,254 132,256`}
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// SOBRANCELHAS
// ═══════════════════════════════════════════════════════════════
function Eyebrows({ ey, hairC }: { ey: any; hairC: string }) {
  const shape = ey.shape ?? 'round';
  const bc = ey.browColor ?? hairC;

  if (shape === 'angry') {
    return (
      <g>
        <path d="M 72 88 Q 82 82 92 88" stroke={bc} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
        <path d="M 108 88 Q 118 82 128 88" stroke={bc} strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      </g>
    );
  }
  return (
    <g>
      <path d="M 70 90 Q 80 84 90 90" stroke={bc} strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M 110 90 Q 120 84 130 90" stroke={bc} strokeWidth="3" fill="none" strokeLinecap="round"/>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// OLHOS
// ═══════════════════════════════════════════════════════════════
function Eyes({ ey, uid }: { ey: any; uid: string }) {
  const iris  = ey.color ?? '#333333';
  const shape = ey.shape ?? 'round';

  if (shape === 'almond') {
    return (
      <g>
        <path d="M 68 108 C 72 102 88 102 92 108 C 88 113 72 113 68 108 Z" fill="white" stroke="#222" strokeWidth="1"/>
        <circle cx="80" cy="108" r="5" fill={iris}/>
        <circle cx="80" cy="108" r="2.5" fill="#111"/>
        <circle cx="82" cy="106" r="1.5" fill="white"/>
        <path d="M 108 108 C 112 102 128 102 132 108 C 128 113 112 113 108 108 Z" fill="white" stroke="#222" strokeWidth="1"/>
        <circle cx="120" cy="108" r="5" fill={iris}/>
        <circle cx="120" cy="108" r="2.5" fill="#111"/>
        <circle cx="122" cy="106" r="1.5" fill="white"/>
      </g>
    );
  }

  if (shape === 'angry') {
    return (
      <g>
        <circle cx="80" cy="108" r="10" fill="white" stroke="#222" strokeWidth="1"/>
        <circle cx="80" cy="109" r="6" fill={iris}/>
        <circle cx="80" cy="109" r="3" fill="#111"/>
        <circle cx="82" cy="106" r="2" fill="white"/>
        <circle cx="120" cy="108" r="10" fill="white" stroke="#222" strokeWidth="1"/>
        <circle cx="120" cy="109" r="6" fill={iris}/>
        <circle cx="120" cy="109" r="3" fill="#111"/>
        <circle cx="122" cy="106" r="2" fill="white"/>
      </g>
    );
  }

  // round (padrão — fiel ao Gemini SVG)
  return (
    <g>
      <circle cx="78" cy="107" r="10" fill="white" stroke="#222" strokeWidth="1"/>
      <circle cx="78" cy="107" r="6" fill={iris}/>
      <circle cx="78" cy="107" r="3" fill="#111"/>
      <circle cx="80" cy="105" r="2" fill="white"/>
      <circle cx="122" cy="107" r="10" fill="white" stroke="#222" strokeWidth="1"/>
      <circle cx="122" cy="107" r="6" fill={iris}/>
      <circle cx="122" cy="107" r="3" fill="#111"/>
      <circle cx="124" cy="105" r="2" fill="white"/>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// BOCA
// ═══════════════════════════════════════════════════════════════
function Mouth({ mo }: { mo: any }) {
  const shape  = mo.shape  ?? 'smile';
  const lipBot = mo.color  ?? '#b03030';
  const lipTop = mo.lipTop ?? '#e06060';

  if (shape === 'bigsmile') {
    return (
      <g>
        <path d="M 84 138 Q 100 152 116 138 Z" fill={lipBot} stroke="#222" strokeWidth="1"/>
        <path d="M 84 138 Q 100 142 116 138" fill={lipTop} stroke="#222" strokeWidth="1"/>
        <path d="M 86 139 Q 100 148 114 139 L 112 145 Q 100 149 88 145 Z" fill="rgba(255,255,255,0.55)"/>
      </g>
    );
  }
  if (shape === 'smirk') {
    return (
      <path d="M 88 140 C 96 138 108 142 116 139"
        stroke="#222" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    );
  }
  if (shape === 'serious') {
    return (
      <path d="M 86 140 L 114 140"
        stroke="#222" strokeWidth="3" fill="none" strokeLinecap="round"/>
    );
  }
  // smile (padrão — fiel ao Gemini SVG)
  return (
    <g>
      <path d="M 88 137 Q 100 150 112 137" stroke="#222" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════
// ACESSÓRIO
// ═══════════════════════════════════════════════════════════════
function Accessory({ ac }: { ac: any }) {
  const style = ac.style ?? 'none';
  const color = ac.color ?? '#4b5563';

  if (style === 'glasses') {
    return (
      <g>
        <circle cx="78" cy="107" r="13" fill="none" stroke={color} strokeWidth="2.5"/>
        <circle cx="122" cy="107" r="13" fill="none" stroke={color} strokeWidth="2.5"/>
        <line x1="91" y1="107" x2="109" y2="107" stroke={color} strokeWidth="2"/>
        <line x1="65" y1="107" x2="56" y2="105" stroke={color} strokeWidth="2"/>
        <line x1="135" y1="107" x2="144" y2="105" stroke={color} strokeWidth="2"/>
      </g>
    );
  }
  if (style === 'sunglasses') {
    return (
      <g>
        <rect x="64" y="100" width="28" height="15" rx="7" fill={color} stroke="#111" strokeWidth="1.5" opacity="0.92"/>
        <rect x="108" y="100" width="28" height="15" rx="7" fill={color} stroke="#111" strokeWidth="1.5" opacity="0.92"/>
        <line x1="92" y1="107" x2="108" y2="107" stroke="#111" strokeWidth="2"/>
        <line x1="64" y1="107" x2="55" y2="105" stroke="#111" strokeWidth="2"/>
        <line x1="136" y1="107" x2="145" y2="105" stroke="#111" strokeWidth="2"/>
        <path d="M 67 103 C 72 100 84 100 88 103" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      </g>
    );
  }
  if (style === 'earring') {
    return (
      <g>
        <circle cx="47" cy="114" r="4" fill={color} stroke="#111" strokeWidth="1"/>
        <line x1="47" y1="110" x2="47" y2="106" stroke={color} strokeWidth="1.5"/>
      </g>
    );
  }
  if (style === 'scar') {
    return (
      <path d="M 110 90 C 114 98 112 108 115 116"
        stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    );
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// CABELO — partes de trás (atrás da cabeça)
// ═══════════════════════════════════════════════════════════════
function HairBack({ ha, hairC, uid }: { ha: any; hairC: string; uid: string }) {
  const style = ha.style ?? 'short';
  if (style === 'bald') return null;

  if (style === 'long') {
    const shade = adjustHex(hairC, -25);
    return (
      <g>
        {/* Cabelo longo cai atrás dos ombros */}
        <path d={`M 64,95 C 50,118 44,152 48,182 C 51,196 62,200 66,192 C 63,172 61,138 66,108 Z`}
          fill={hairC} stroke="#111" strokeWidth="1"/>
        <path d={`M 136,95 C 150,118 156,152 152,182 C 149,196 138,200 134,192 C 137,172 139,138 134,108 Z`}
          fill={hairC} stroke="#111" strokeWidth="1"/>
        {/* mechas */}
        <path d={`M 64,108 C 58,130 56,160 60,185`} fill="none" stroke={shade} strokeWidth="2.5" strokeLinecap="round"/>
        <path d={`M 136,108 C 142,130 144,160 140,185`} fill="none" stroke={shade} strokeWidth="2.5" strokeLinecap="round"/>
      </g>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// CABELO — partes da frente (sobre a cabeça)
// ═══════════════════════════════════════════════════════════════
function HairFront({ ha, hairC, uid }: { ha: any; hairC: string; uid: string }) {
  const style = ha.style ?? 'short';
  if (style === 'bald') return null;

  const shade  = adjustHex(hairC, -30);
  const light  = adjustHex(hairC, +28);

  // ── Short ────────────────────────────────────────────────────
  if (style === 'short') {
    return (
      <g>
        {/* Faixa de cabelo fina seguindo a curvatura do crânio */}
        {/* Parte de cima: do topo da cabeça até a hairline */}
        <path d={`M 63 96 C 60 88 59 76 62 64 C 68 44 82 36 100 35 C 118 36 132 44 138 64 C 141 76 140 88 137 96 C 132 86 122 80 100 79 C 78 80 68 86 63 96 Z`}
          fill={hairC} stroke="#111" strokeWidth="0.8"/>

        {/* Camada de sombra para dar volume/profundidade */}
        <path d={`M 63 96 C 68 86 78 80 100 79 C 78 80 68 86 63 96 Z`}
          fill={shade} opacity="0.3"/>
        <path d={`M 137 96 C 132 86 122 80 100 79 C 122 80 132 86 137 96 Z`}
          fill={shade} opacity="0.15"/>

        {/* Mechas desenhadas com strokes — dão textura de cabelo */}
        <path d={`M 80 38 C 76 50 74 62 74 74`} fill="none" stroke={shade} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>
        <path d={`M 92 36 C 90 48 89 60 90 72`} fill="none" stroke={shade} strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>
        <path d={`M 108 36 C 110 48 111 60 110 72`} fill="none" stroke={shade} strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>
        <path d={`M 120 38 C 124 50 126 62 126 74`} fill="none" stroke={shade} strokeWidth="2" strokeLinecap="round" opacity="0.7"/>

        {/* Costeleta/lateral cobrindo as têmporas */}
        <path d={`M 62 64 C 60 74 60 86 62 96 C 64 104 68 110 70 106 C 68 96 66 84 66 72 Z`} fill={hairC}/>
        <path d={`M 138 64 C 140 74 140 86 138 96 C 136 104 132 110 130 106 C 132 96 134 84 134 72 Z`} fill={hairC}/>

        {/* Reflexo de luz no topo */}
        <path d={`M 82 38 C 90 33 110 33 118 38`}
          fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeLinecap="round"/>
      </g>
    );
  }

  // ── Long ─────────────────────────────────────────────────────
  if (style === 'long') {
    return (
      <g>
        {/* Mesma faixa do short mas com mechas mais longas */}
        <path d={`M 63 96 C 60 88 59 76 62 64 C 68 44 82 36 100 35 C 118 36 132 44 138 64 C 141 76 140 88 137 96 C 132 86 122 80 100 79 C 78 80 68 86 63 96 Z`}
          fill={hairC} stroke="#111" strokeWidth="0.8"/>

        {/* Mechas caindo pelo rosto */}
        <path d={`M 63 96 C 60 106 62 118 66 124 C 68 120 68 108 66 96 Z`} fill={hairC}/>
        <path d={`M 137 96 C 140 106 138 118 134 124 C 132 120 132 108 134 96 Z`} fill={hairC}/>

        {/* Mechas textura topo */}
        <path d={`M 76 56 C 82 46 91 42 100 42 C 109 42 118 46 124 56`}
          fill="none" stroke={shade} strokeWidth="2.5" strokeLinecap="round"/>
        <path d={`M 70 70 C 76 60 87 54 100 53 C 113 54 124 60 130 70`}
          fill="none" stroke={shade} strokeWidth="2" strokeLinecap="round"/>

        {/* Partição */}
        <path d={`M 100 34 C 100 42 100 50 100 58`}
          fill="none" stroke={shade} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>

        {/* Reflexo */}
        <path d={`M 78 44 C 86 37 100 35 114 42`}
          fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3.5" strokeLinecap="round"/>
      </g>
    );
  }

  // ── Spiky ────────────────────────────────────────────────────
  if (style === 'spiky') {
    return (
      <g>
        {/* Faixa base fina */}
        <path d={`M 63 96 C 60 88 59 76 62 64 C 68 44 82 36 100 35 C 118 36 132 44 138 64 C 141 76 140 88 137 96 C 132 86 122 80 100 79 C 78 80 68 86 63 96 Z`}
          fill={hairC} stroke="#111" strokeWidth="0.8"/>
        {/* Laterais */}
        <path d={`M 62 64 C 60 76 60 90 63 100 C 65 108 68 110 70 106 C 68 96 66 82 66 70 Z`} fill={hairC}/>
        <path d={`M 138 64 C 140 76 140 90 137 100 C 135 108 132 110 130 106 C 132 96 134 82 134 70 Z`} fill={hairC}/>
        {/* Espinhos saindo da faixa base */}
        <path d={`M 70 68 L 62 26 L 82 60 Z`} fill={hairC} stroke="#111" strokeWidth="1" strokeLinejoin="round"/>
        <path d={`M 88 52 L 83 10 L 104 50 Z`} fill={hairC} stroke="#111" strokeWidth="1" strokeLinejoin="round"/>
        <path d={`M 112 52 L 117 10 L 130 56 Z`} fill={hairC} stroke="#111" strokeWidth="1" strokeLinejoin="round"/>
        <path d={`M 128 64 L 138 26 L 142 66 Z`} fill={hairC} stroke="#111" strokeWidth="1" strokeLinejoin="round"/>
      </g>
    );
  }

  // ── Mohawk ───────────────────────────────────────────────────
  if (style === 'mohawk') {
    return (
      <g>
        {/* Lados muito curtos */}
        <path d={`M 60 76 C 58 88 58 100 62 108 C 65 114 70 116 72 110 C 70 100 68 88 68 76 Z`} fill={hairC}/>
        <path d={`M 140 76 C 142 88 142 100 138 108 C 135 114 130 116 128 110 C 130 100 132 88 132 76 Z`} fill={hairC}/>
        {/* Crista central */}
        <path d={`M 90 68 L 86 8 L 100 -4 L 114 8 L 110 68 C 106 58 94 58 90 68 Z`}
          fill={hairC} stroke="#111" strokeWidth="1.2"/>
        {/* Textura da crista */}
        <path d={`M 95 64 C 97 44 100 32 100 16`}
          fill="none" stroke={shade} strokeWidth="2" strokeLinecap="round"/>
        <path d={`M 96 56 C 98 38 100 28 102 16`}
          fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
    );
  }

  // ── Afro (Black Power) ───────────────────────────────────────
  if (style === 'afro') {
    const dark = adjustHex(hairC, -45);
    return (
      <g>
        {/* Massa grande do afro — forma orgânica, não círculo perfeito */}
        <path d={`
          M 46 90
          C 42 72 44 52 56 38
          C 64 28 78 20 100 18
          C 122 20 136 28 144 38
          C 156 52 158 72 154 90
          C 148 82 142 78 140 72
          C 136 58 122 46 100 44
          C 78 46 64 58 60 72
          C 58 78 52 82 46 90 Z
        `} fill={hairC} stroke="#111" strokeWidth="1.2"/>

        {/* Textura de cachos — pequenos círculos irregulares */}
        {([
          [-30,10],[-20,-4],[-10,-16],[0,-20],[10,-16],[20,-4],[30,10],
          [-34,26],[-22,14],[-10,6],[0,2],[10,6],[22,14],[34,26],
          [-28,40],[-14,30],[0,26],[14,30],[28,40],
        ] as [number,number][]).map(([dx,dy],i) => (
          <circle key={i} cx={100+dx} cy={66+dy} r={5+i%3} fill={dark} opacity="0.3"/>
        ))}

        {/* Mechas laterais cobrindo as orelhas */}
        <path d={`M 46 88 C 42 96 44 106 50 112 C 54 116 60 116 62 110 C 58 104 54 96 52 88 Z`}
          fill={hairC}/>
        <path d={`M 154 88 C 158 96 156 106 150 112 C 146 116 140 116 138 110 C 142 104 146 96 148 88 Z`}
          fill={hairC}/>

        {/* Reflexo de luz */}
        <path d={`M 72 32 C 82 24 100 20 118 28`}
          fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" strokeLinecap="round"/>
      </g>
    );
  }

  // ── Topete ───────────────────────────────────────────────────
  if (style === 'topete') {
    return (
      <g>
        {/* Base lateral — cobre acima das orelhas */}
        <path d={`M 60 98 C 58 88 57 78 58 70 C 62 58 70 52 78 50 C 74 58 72 68 72 78 C 72 86 66 92 60 98 Z`} fill={hairC}/>
        <path d={`M 140 98 C 142 88 143 78 142 70 C 138 58 130 52 122 50 C 126 58 128 68 128 78 C 128 86 134 92 140 98 Z`} fill={hairC}/>
        {/* Base traseira do crânio */}
        <path d={`M 60 72 C 62 58 72 50 100 48 C 128 50 138 58 140 72 C 128 64 112 60 100 60 C 88 60 72 64 60 72 Z`} fill={hairC}/>
        {/* Topete levantado com forma mais orgânica */}
        <path d={`M 80 62 C 76 44 80 16 100 8 C 120 16 124 44 120 62 C 114 52 88 52 80 62 Z`}
          fill={hairC} stroke="#111" strokeWidth="1.2"/>
        {/* Textura interna do topete */}
        <path d={`M 88 58 C 90 42 96 28 100 16`}
          fill="none" stroke={shade} strokeWidth="2.5" strokeLinecap="round"/>
        <path d={`M 112 58 C 110 42 104 28 100 16`}
          fill="none" stroke={shade} strokeWidth="2" strokeLinecap="round"/>
        {/* Reflexo */}
        <path d={`M 86 50 C 90 34 100 18 100 18`}
          fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" strokeLinecap="round"/>
        {/* Hairline */}
        <path d={`M 62 84 C 68 76 80 70 100 69 C 120 70 132 76 138 84`}
          fill="none" stroke={shade} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
      </g>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// CHAPÉU
// ═══════════════════════════════════════════════════════════════
function Hat({ ht, uid }: { ht: any; uid: string }) {
  const style  = ht.style  ?? 'none';
  const color  = ht.color  ?? '#1B3A6B';
  const color2 = ht.color2 ?? '#112750';

  if (style === 'none') return null;

  if (style === 'cap') {
    return (
      <g>
        {/* aba */}
        <path d={`M 40 76 C 60 68 140 68 160 76 L 166 80 C 140 72 60 72 34 80 Z`}
          fill={color2} stroke="#111" strokeWidth="1"/>
        {/* cúpula */}
        <path d={`M 58 74 C 56 28 100 12 144 28 C 156 38 158 60 156 74 Z`}
          fill={color} stroke="#111" strokeWidth="1.5"/>
        {/* faixa */}
        <path d={`M 58 74 C 80 68 120 68 156 74`}
          stroke={color2} strokeWidth="5" fill="none"/>
        {/* brilho */}
        <path d={`M 80 32 C 100 20 120 24 130 38`}
          stroke="rgba(255,255,255,0.18)" strokeWidth="3" fill="none" strokeLinecap="round"/>
      </g>
    );
  }

  if (style === 'crown') {
    return (
      <g>
        <rect x="68" y="42" width="64" height="20" rx="4" fill={color} stroke="#111" strokeWidth="1"/>
        <path d={`M 70 42 L 68 20 L 82 36 L 100 16 L 118 36 L 132 20 L 130 42 Z`}
          fill={color} stroke="#111" strokeWidth="1.2"/>
        {/* gemas */}
        <circle cx="80" cy="52" r="4" fill="#E84848"/>
        <circle cx="100" cy="52" r="4" fill="#4BE84B"/>
        <circle cx="120" cy="52" r="4" fill="#4848E8"/>
      </g>
    );
  }

  if (style === 'cowboy') {
    return (
      <g>
        {/* aba */}
        <ellipse cx="100" cy="72" rx="56" ry="12" fill={color2} stroke="#111" strokeWidth="1.2"/>
        {/* copa */}
        <path d={`M 70 72 C 66 32 100 18 134 32 C 142 44 144 62 138 72 Z`}
          fill={color} stroke="#111" strokeWidth="1.5"/>
        {/* amassado no topo */}
        <path d={`M 88 28 C 92 18 108 18 112 28`}
          stroke={color2} strokeWidth="3" fill="none" strokeLinecap="round"/>
        {/* faixa */}
        <path d={`M 72 72 C 85 65 115 65 130 72`}
          stroke={color2} strokeWidth="4" fill="none"/>
      </g>
    );
  }

  if (style === 'wizard') {
    return (
      <g>
        {/* aba */}
        <ellipse cx="100" cy="72" rx="48" ry="10" fill={color2} stroke="#111" strokeWidth="1"/>
        {/* cone */}
        <path d={`M 70 72 C 60 48 80 24 100 8 C 120 24 140 48 130 72 Z`}
          fill={color} stroke="#111" strokeWidth="1.5"/>
        {/* estrelas */}
        <circle cx="90" cy="48" r="3.5" fill="#FCD34D"/>
        <circle cx="110" cy="36" r="2.5" fill="#FCD34D"/>
        <circle cx="96" cy="30" r="1.8" fill="#FCD34D"/>
      </g>
    );
  }

  return null;
}
