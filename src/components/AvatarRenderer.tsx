// AvatarRenderer — SVG avatar estilo cartoon 3D em camadas

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
  background: { type: 'solid',  colors: ['#1e293b'] },
  skin:       { faceColor: '#F5C5A3', shadeColor: '#D4977A', lightColor: '#FFE0C4' },
  eyes:       { shape: 'round', color: '#3d2b1f' },
  mouth:      { shape: 'smile', color: '#b03030' },
  hair:       { style: 'short', color: '#2c1810' },
  clothes:    { style: 'polo',  color: '#1d3461', color2: '#152845', badge: '#c8a951', collar: '#ffffff' },
  hat:        { style: 'none',  color: '#1d3461' },
  accessory:  { style: 'none',  color: '#4b5563' },
};

function sd(eq: AvatarEquipped, key: keyof AvatarEquipped) {
  return eq[key]?.style_data ?? DEFAULT[key];
}

let _uid = 0;

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
  const CC  = cl.color  ?? '#1d3461';
  const CC2 = cl.color2 ?? '#152845';

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 120 120"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ borderRadius: '14px', flexShrink: 0, display: 'block' }}
    >
      <defs>
        {bg.type === 'gradient' && (
          <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={bg.colors?.[0] ?? '#1e293b'} />
            <stop offset="100%" stopColor={bg.colors?.[1] ?? bg.colors?.[0] ?? '#1e293b'} />
          </linearGradient>
        )}
        <radialGradient id={`skF${uid}`} cx="40%" cy="34%" r="62%">
          <stop offset="0%"   stopColor={L} />
          <stop offset="52%"  stopColor={F} />
          <stop offset="100%" stopColor={S} />
        </radialGradient>
        <linearGradient id={`skN${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={S} />
          <stop offset="45%"  stopColor={F} />
          <stop offset="100%" stopColor={S} />
        </linearGradient>
        <linearGradient id={`clB${uid}`} x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%"   stopColor={CC} />
          <stop offset="100%" stopColor={CC2} />
        </linearGradient>
        <clipPath id={`cp${uid}`}>
          <rect width="120" height="120" rx="14" ry="14" />
        </clipPath>
      </defs>

      <g clipPath={`url(#cp${uid})`}>

        {/* ── BACKGROUND ── */}
        {bg.type === 'solid'    && <rect width="120" height="120" fill={bg.colors?.[0] ?? '#1e293b'} />}
        {bg.type === 'gradient' && <rect width="120" height="120" fill={`url(#bg${uid})`} />}
        {bg.type === 'stars'    && <StarsBg bg={bg} />}
        {bg.type === 'grid'     && <GridBg  bg={bg} />}
        {!['solid','gradient','stars','grid'].includes(bg.type ?? '') && (
          <rect width="120" height="120" fill="#1e293b" />
        )}

        {/* ── BODY / ROUPA ── */}
        <ClothesBody cl={cl} uid={uid} F={F} S={S} />

        {/* ── PESCOÇO ── */}
        <ellipse cx="60" cy="83" rx="11" ry="5" fill="rgba(0,0,0,0.13)" />
        <path d="M 50,72 Q 60,77 70,72 L 71,86 Q 60,90 49,86 Z" fill={`url(#skN${uid})`} />

        {/* ── ORELHAS ── */}
        <ellipse cx="29" cy="46" rx="6"   ry="8"   fill={F} />
        <ellipse cx="29" cy="46" rx="3.5" ry="5"   fill={S} opacity="0.45" />
        <ellipse cx="91" cy="46" rx="6"   ry="8"   fill={F} />
        <ellipse cx="91" cy="46" rx="3.5" ry="5"   fill={S} opacity="0.45" />

        {/* ── CABELO ATRÁS ── */}
        {ha.style === 'long' && <HairBack h={ha} />}

        {/* ── CABEÇA ── */}
        <path
          d="M 60,14 C 91,14 93,33 92,50 C 90,65 79,74 60,74
             C 41,74 30,65 28,50 C 27,33 29,14 60,14 Z"
          fill={`url(#skF${uid})`}
        />
        {/* sombra lateral */}
        <ellipse cx="74" cy="60" rx="17" ry="11" fill={S} opacity="0.16" />
        {/* bochechas */}
        <ellipse cx="37" cy="57" rx="9" ry="5.5" fill="#d05050" opacity="0.09" />
        <ellipse cx="83" cy="57" rx="9" ry="5.5" fill="#d05050" opacity="0.09" />

        {/* ── SOBRANCELHAS ── */}
        <Eyebrows e={ey} />

        {/* ── OLHOS ── */}
        <Eyes e={ey} />

        {/* ── NARIZ ── */}
        <Nose S={S} />

        {/* ── BOCA ── */}
        <Mouth m={mo} />

        {/* ── CABELO FRENTE ── */}
        {ha.style !== 'long' ? <Hair h={ha} /> : <HairFront h={ha} />}

        {/* ── CHAPÉU ── */}
        {ht.style !== 'none' && <Hat h={ht} />}

        {/* ── ACESSÓRIO ── */}
        {ac.style !== 'none' && <Accessory a={ac} />}

      </g>
    </svg>
  );
}

/* ─── BACKGROUND HELPERS ────────────────────────────────────── */
function StarsBg({ bg }: { bg: any }) {
  const base = bg.colors?.[0] ?? '#0f0f2d';
  const pts: [number,number,number][] = [
    [12,8,1.5],[40,6,0.9],[78,12,1.3],[22,28,0.8],[96,20,1.1],
    [8,52,0.9],[104,46,1.4],[28,68,0.8],[88,62,1.2],[52,82,0.9],
    [18,94,1.0],[92,88,1.3],[65,18,0.7],[35,50,1.1],[75,38,0.8],
  ];
  return (
    <>
      <rect width="120" height="120" fill={base} />
      {pts.map(([x,y,r],i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="white" opacity={0.4 + (i % 4) * 0.12} />
      ))}
    </>
  );
}
function GridBg({ bg }: { bg: any }) {
  const base = bg.colors?.[0] ?? '#0a0a1a';
  const line = bg.colors?.[1] ?? '#1a2040';
  return (
    <>
      <rect width="120" height="120" fill={base} />
      {[0,20,40,60,80,100,120].map(x => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="120" stroke={line} strokeWidth="0.5" />
      ))}
      {[0,20,40,60,80,100,120].map(y => (
        <line key={`h${y}`} x1="0" y1={y} x2="120" y2={y} stroke={line} strokeWidth="0.5" />
      ))}
    </>
  );
}

/* ─── ROUPA / CORPO ─────────────────────────────────────────── */
function ClothesBody({ cl, uid, F, S }: { cl: any; uid: string; F: string; S: string }) {
  const CC  = cl.color  ?? '#1d3461';
  const CC2 = cl.color2 ?? '#152845';
  const badge = cl.badge ?? '#c8a951';

  const arm = `url(#clB${uid})`;
  const body = `url(#clB${uid})`;

  switch (cl.style) {

    case 'suit':
      return (
        <g>
          <path d="M 3,120 L 7,93 Q 19,83 30,83 L 30,96 Q 20,99 15,120 Z" fill="#1e293b" />
          <path d="M 117,120 L 113,93 Q 101,83 90,83 L 90,96 Q 100,99 105,120 Z" fill="#1e293b" />
          <path d="M 15,120 L 20,93 Q 38,80 60,79 Q 82,80 100,93 L 105,120 Z" fill="#1e293b" />
          <path d="M 48,79 L 56,98 L 60,93 L 64,98 L 72,79 Q 67,82 60,83 Q 53,82 48,79 Z" fill="white" opacity="0.95" />
          <path d="M 57,87 L 63,87 L 65,112 L 60,116 L 55,112 Z" fill="#dc2626" />
          <path d="M 58,87 L 60,100" stroke="rgba(0,0,0,0.2)" strokeWidth="0.8" fill="none" />
          <path d="M 20,93 Q 40,82 60,81 Q 80,82 100,93" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" fill="none" />
        </g>
      );

    case 'hoodie':
      return (
        <g>
          <path d="M 2,120 L 6,91 Q 18,80 30,80 L 30,94 Q 19,97 14,120 Z" fill={CC} />
          <path d="M 118,120 L 114,91 Q 102,80 90,80 L 90,94 Q 101,97 106,120 Z" fill={CC} />
          <path d="M 14,120 L 18,91 Q 36,78 60,77 Q 84,78 102,91 L 106,120 Z" fill={CC} />
          <path d="M 34,82 Q 36,66 60,65 Q 84,66 86,82 Q 74,78 60,78 Q 46,78 34,82 Z" fill={CC2} />
          <rect x="40" y="100" width="40" height="16" rx="5" fill={CC2} />
          <line x1="60" y1="100" x2="60" y2="116" stroke={CC} strokeWidth="1" opacity="0.5" />
          <rect x="12" y="93" width="18" height="5" rx="2" fill={CC2} />
          <rect x="90" y="93" width="18" height="5" rx="2" fill={CC2} />
        </g>
      );

    case 'shirt':
      return (
        <g>
          <path d="M 3,120 L 7,93 Q 19,83 30,83 L 30,96 Q 20,99 15,120 Z" fill={arm} />
          <path d="M 117,120 L 113,93 Q 101,83 90,83 L 90,96 Q 100,99 105,120 Z" fill={arm} />
          <path d="M 15,120 L 20,93 Q 38,80 60,79 Q 82,80 100,93 L 105,120 Z" fill={body} />
          <path d="M 50,79 Q 60,83 70,79 L 70,102 Q 60,106 50,102 Z" fill={CC2} />
          <circle cx="60" cy="87" r="1.5" fill="rgba(255,255,255,0.5)" />
          <circle cx="60" cy="93" r="1.5" fill="rgba(255,255,255,0.5)" />
          <circle cx="60" cy="99" r="1.5" fill="rgba(255,255,255,0.5)" />
          <path d="M 20,93 Q 40,82 60,81 Q 80,82 100,93" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none" />
        </g>
      );

    case 'armor':
      return (
        <g>
          <ellipse cx="22" cy="88" rx="16" ry="9" fill="#9ca3af" />
          <ellipse cx="98" cy="88" rx="16" ry="9" fill="#9ca3af" />
          <path d="M 15,120 L 20,91 Q 38,80 60,79 Q 82,80 100,91 L 105,120 Z" fill="#6b7280" />
          <path d="M 36,79 L 36,109 Q 48,117 60,117 Q 72,117 84,109 L 84,79 Q 72,76 60,76 Q 48,76 36,79 Z" fill="#9ca3af" />
          <path d="M 48,82 L 72,82 L 72,105 Q 66,109 60,109 Q 54,109 48,105 Z" fill="#6b7280" />
          <path d="M 48,82 L 72,82" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
          <ellipse cx="22" cy="85" rx="10" ry="5" fill="rgba(255,255,255,0.15)" />
          <ellipse cx="98" cy="85" rx="10" ry="5" fill="rgba(255,255,255,0.15)" />
        </g>
      );

    default: /* polo */
      return (
        <g>
          {/* Braços */}
          <path d="M 3,120 L 7,93 Q 19,83 30,83 L 30,96 Q 20,99 15,120 Z" fill={arm} />
          <path d="M 117,120 L 113,93 Q 101,83 90,83 L 90,96 Q 100,99 105,120 Z" fill={arm} />
          {/* Torso */}
          <path d="M 15,120 L 20,93 Q 38,80 60,79 Q 82,80 100,93 L 105,120 Z" fill={body} />
          {/* Destaque ombro */}
          <path d="M 20,93 Q 40,82 60,81 Q 80,82 100,93" stroke="rgba(255,255,255,0.13)" strokeWidth="1.5" fill="none" />
          {/* Gola polo esquerda */}
          <path d="M 48,79 Q 52,92 60,90 L 60,79 Z" fill={cl.collar ?? 'white'} opacity="0.93" />
          {/* Gola polo direita */}
          <path d="M 72,79 Q 68,92 60,90 L 60,79 Z" fill={cl.collar ?? 'white'} opacity="0.93" />
          {/* Sombra gola */}
          <path d="M 50,79 Q 55,86 60,85 Q 65,86 70,79" stroke="rgba(0,0,0,0.2)" strokeWidth="1" fill="none" />
          {/* Sombra manga */}
          <ellipse cx="22" cy="90" rx="9" ry="3.5" fill="rgba(0,0,0,0.12)" />
          <ellipse cx="98" cy="90" rx="9" ry="3.5" fill="rgba(0,0,0,0.12)" />
          {/* Crachá */}
          <rect x="66" y="95" width="18" height="13" rx="3" fill="rgba(0,0,0,0.2)" />
          <rect x="66" y="94" width="18" height="13" rx="3" fill={badge} />
          <path d="M 70,99 L 80,99" stroke="rgba(0,0,0,0.45)" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 70,102 L 78,102" stroke="rgba(0,0,0,0.3)"  strokeWidth="1"   strokeLinecap="round" />
          {/* Pele braços (punhos visíveis) */}
          <path d="M 7,108 Q 10,110 16,112 L 15,120 L 3,120 Z"  fill={F} opacity="0.6" />
          <path d="M 113,108 Q 110,110 104,112 L 105,120 L 117,120 Z" fill={F} opacity="0.6" />
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
        <path d="M 38,30 L 54,33" stroke={col} strokeWidth="3"   strokeLinecap="round" />
        <path d="M 66,33 L 82,30" stroke={col} strokeWidth="3"   strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <path d="M 37,31 Q 45,27 55,30" stroke={col} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M 65,30 Q 75,27 83,31" stroke={col} strokeWidth="2.6" fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ─── OLHOS ─────────────────────────────────────────────────── */
function Eyes({ e }: { e: any }) {
  const iris = e.color ?? '#3d2b1f';

  if (e.shape === 'almond') {
    return (
      <g>
        <path d="M 37,41 Q 45,36 53,41 Q 45,46 37,41 Z" fill="white" />
        <circle cx="45" cy="41" r="3.8" fill={iris} />
        <circle cx="45" cy="41" r="2.2" fill="#080808" />
        <circle cx="46.5" cy="39.2" r="1.1" fill="white" />
        <path d="M 37,41 Q 45,36 53,41" stroke="#1a0e08" strokeWidth="1.6" fill="none" strokeLinecap="round" />

        <path d="M 67,41 Q 75,36 83,41 Q 75,46 67,41 Z" fill="white" />
        <circle cx="75" cy="41" r="3.8" fill={iris} />
        <circle cx="75" cy="41" r="2.2" fill="#080808" />
        <circle cx="76.5" cy="39.2" r="1.1" fill="white" />
        <path d="M 67,41 Q 75,36 83,41" stroke="#1a0e08" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    );
  }

  if (e.shape === 'angry') {
    return (
      <g>
        <ellipse cx="45" cy="42" rx="7.5" ry="6" fill="white" />
        <circle  cx="45" cy="42" r="4"   fill={iris} />
        <circle  cx="45" cy="42" r="2.4" fill="#080808" />
        <circle  cx="46.5" cy="40.2" r="1.2" fill="white" />
        <path d="M 38,39 L 52,42" stroke="#1a0e08" strokeWidth="2" strokeLinecap="round" />

        <ellipse cx="75" cy="42" rx="7.5" ry="6" fill="white" />
        <circle  cx="75" cy="42" r="4"   fill={iris} />
        <circle  cx="75" cy="42" r="2.4" fill="#080808" />
        <circle  cx="76.5" cy="40.2" r="1.2" fill="white" />
        <path d="M 68,42 L 82,39" stroke="#1a0e08" strokeWidth="2" strokeLinecap="round" />
      </g>
    );
  }

  /* round (padrão) */
  return (
    <g>
      <ellipse cx="45" cy="41" rx="7.5" ry="6" fill="white" />
      <circle  cx="45" cy="41" r="4"   fill={iris} />
      <circle  cx="45" cy="41" r="2.3" fill="#080808" />
      <circle  cx="46.8" cy="39.2" r="1.3" fill="white" />
      <circle  cx="43.8" cy="42.2" r="0.7" fill="rgba(255,255,255,0.4)" />
      <path d="M 37.5,41 Q 45,35.5 52.5,41" stroke="#1a0e08" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M 38.5,43 Q 45,46.5 51.5,43"  stroke="#1a0e08" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.35" />

      <ellipse cx="75" cy="41" rx="7.5" ry="6" fill="white" />
      <circle  cx="75" cy="41" r="4"   fill={iris} />
      <circle  cx="75" cy="41" r="2.3" fill="#080808" />
      <circle  cx="76.8" cy="39.2" r="1.3" fill="white" />
      <circle  cx="73.8" cy="42.2" r="0.7" fill="rgba(255,255,255,0.4)" />
      <path d="M 67.5,41 Q 75,35.5 82.5,41" stroke="#1a0e08" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M 68.5,43 Q 75,46.5 81.5,43"  stroke="#1a0e08" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.35" />
    </g>
  );
}

/* ─── NARIZ ─────────────────────────────────────────────────── */
function Nose({ S }: { S: string }) {
  return (
    <g>
      <path d="M 56,44 Q 57,51 56,56" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 54,57 Q 60,61 66,57"  stroke={S}  strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <circle cx="55.5" cy="57" r="1.2" fill={S} opacity="0.55" />
      <circle cx="64.5" cy="57" r="1.2" fill={S} opacity="0.55" />
    </g>
  );
}

/* ─── BOCA ──────────────────────────────────────────────────── */
function Mouth({ m }: { m: any }) {
  const lc = m.color ?? '#b03030';
  const lt = m.lipTop ?? '#e06060';

  switch (m.shape) {
    case 'bigsmile':
      return (
        <g>
          <path d="M 44,65 Q 60,79 76,65" fill={lc} stroke={lc} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 44,65 Q 60,78 76,65 Q 70,71 60,71 Q 50,71 44,65 Z" fill="#3a0808" />
          <path d="M 47,66 Q 60,74 73,66 Q 67,69 60,69 Q 53,69 47,66 Z" fill="white" opacity="0.88" />
          <path d="M 44,65 Q 52,62 60,63 Q 68,62 76,65" stroke={lt} strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'smirk':
      return (
        <g>
          <path d="M 50,67 Q 58,73 70,64" stroke={lc} strokeWidth="2.3" fill="none" strokeLinecap="round" />
          <path d="M 50,67 Q 58,72 70,64" stroke={lt} strokeWidth="0.9" fill="none" strokeLinecap="round" opacity="0.5" />
        </g>
      );
    case 'serious':
      return (
        <g>
          <path d="M 47,67 L 73,67" stroke={lc} strokeWidth="2.3" fill="none" strokeLinecap="round" />
          <path d="M 47,66 Q 60,64 73,66" stroke={lt} strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.45" />
        </g>
      );
    default: /* smile */
      return (
        <g>
          <path d="M 47,65 Q 60,75 73,65" stroke={lc} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 47,65 Q 54,62 60,63 Q 66,62 73,65" stroke={lt} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.55" />
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
          <path d="M 29,47 C 28,22 34,12 60,12 C 86,12 92,22 91,47 Q 84,37 60,35 Q 36,37 29,47 Z" fill={c} />
          <path d="M 29,47 Q 28,55 30,59 Q 32,51 33,47 Z" fill={c} />
          <path d="M 91,47 Q 92,55 90,59 Q 88,51 87,47 Z" fill={c} />
          <path d="M 40,22 Q 60,15 80,22 Q 70,19 60,18 Q 50,19 40,22 Z" fill="rgba(255,255,255,0.11)" />
        </g>
      );
    case 'spiky':
      return (
        <g>
          <path d="M 30,47 C 28,28 34,12 60,12 C 86,12 92,28 90,47 Q 82,39 60,37 Q 38,39 30,47 Z" fill={c} />
          <path d="M 38,30 L 32,6 L 46,26 L 50,5 L 57,24 L 60,3 L 63,24 L 70,5 L 74,26 L 88,6 L 82,30 Z" fill={c} />
          <path d="M 60,20 L 60,6 M 50,22 L 48,10 M 70,22 L 72,10"
            stroke="rgba(255,255,255,0.09)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'mohawk':
      return (
        <g>
          <path d="M 30,47 C 29,33 32,16 44,14 Q 44,23 50,29 Q 42,33 30,47 Z" fill={c} opacity="0.4" />
          <path d="M 90,47 C 91,33 88,16 76,14 Q 76,23 70,29 Q 78,33 90,47 Z" fill={c} opacity="0.4" />
          <path d="M 50,38 L 48,7 Q 54,3 60,3 Q 66,3 72,7 L 70,38 Q 65,34 60,33 Q 55,34 50,38 Z" fill={c} />
          <path d="M 55,35 L 54,12 Q 57,8 60,7 L 62,12 L 58,35 Z" fill="rgba(255,255,255,0.09)" />
        </g>
      );
    case 'bald':
      return (
        <ellipse cx="52" cy="24" rx="13" ry="8" fill="rgba(255,255,255,0.06)" />
      );
    default:
      return null;
  }
}

function HairBack({ h }: { h: any }) {
  const c = h.color ?? '#2c1810';
  return (
    <g>
      <path d="M 29,49 Q 22,72 24,112 L 20,120 L 8,120 Q 14,90 16,58 Q 18,38 29,32 Z" fill={c} />
      <path d="M 91,49 Q 98,72 96,112 L 100,120 L 112,120 Q 106,90 104,58 Q 102,38 91,32 Z" fill={c} />
      <path d="M 23,52 Q 20,78 22,104" stroke="rgba(255,255,255,0.07)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 97,52 Q 100,78 98,104" stroke="rgba(255,255,255,0.07)" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function HairFront({ h }: { h: any }) {
  const c = h.color ?? '#2c1810';
  return (
    <g>
      <path d="M 29,48 C 28,22 34,12 60,12 C 86,12 92,22 91,48 Q 84,38 60,36 Q 36,38 29,48 Z" fill={c} />
      <path d="M 40,22 Q 60,15 80,22 Q 70,19 60,18 Q 50,19 40,22 Z" fill="rgba(255,255,255,0.1)" />
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
          <path d="M 29,44 C 28,20 34,10 60,10 C 86,10 92,20 91,44 Q 84,34 60,32 Q 36,34 29,44 Z" fill={c} />
          <path d="M 29,43 Q 24,45 16,47 Q 30,53 60,51 Q 53,49 36,47 Z" fill={c2} />
          <path d="M 29,43 Q 60,48 91,43" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" fill="none" />
          <circle cx="60" cy="11" r="3" fill={c2} />
          <path d="M 40,20 Q 60,14 80,20 Q 70,17 60,16 Q 50,17 40,20 Z" fill="rgba(255,255,255,0.1)" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <rect x="32" y="44" width="56" height="10" rx="2" fill={c} />
          <path d="M 32,44 L 32,28 L 44,40 L 60,18 L 76,40 L 88,28 L 88,44 Z" fill={c} />
          <circle cx="60" cy="26" r="4.5" fill="#ef4444" /><circle cx="60" cy="26" r="2.5" fill="#ff8080" />
          <circle cx="42" cy="40" r="3" fill="#22c55e" />
          <circle cx="78" cy="40" r="3" fill="#3b82f6" />
          <path d="M 35,46 L 85,46" stroke="rgba(255,255,255,0.2)" strokeWidth="1" fill="none" />
        </g>
      );
    case 'cowboy':
      return (
        <g>
          <ellipse cx="60" cy="38" rx="42" ry="7" fill={c2} />
          <path d="M 32,38 C 30,18 34,10 60,8 C 86,10 90,18 88,38 Z" fill={c} />
          <path d="M 34,36 Q 60,42 86,36" stroke="rgba(0,0,0,0.4)" strokeWidth="3.5" fill="none" />
          <path d="M 32,38 Q 60,40 88,38" stroke={c2} strokeWidth="2" fill="none" opacity="0.8" />
        </g>
      );
    case 'wizard':
      return (
        <g>
          <ellipse cx="60" cy="44" rx="30" ry="5.5" fill={c2} />
          <path d="M 33,44 Q 38,26 50,14 Q 56,8 60,6 Q 64,8 70,14 Q 82,26 87,44 Z" fill={c} />
          <text x="50" y="30" fontSize="9" fill="rgba(255,255,255,0.75)" textAnchor="middle">★</text>
          <text x="65" y="20" fontSize="6"  fill="rgba(255,255,255,0.55)" textAnchor="middle">✦</text>
          <path d="M 46,40 Q 52,20 60,10" stroke="rgba(255,255,255,0.1)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

/* ─── ACESSÓRIO ─────────────────────────────────────────────── */
function Accessory({ a }: { a: any }) {
  const c = a.color ?? '#4b5563';

  switch (a.style) {
    case 'glasses':
      return (
        <g>
          <circle cx="45" cy="42" r="9.5" fill="none" stroke={c} strokeWidth="2.2" />
          <circle cx="75" cy="42" r="9.5" fill="none" stroke={c} strokeWidth="2.2" />
          <path d="M 54.5,42 L 65.5,42" stroke={c} strokeWidth="2" />
          <path d="M 28,40 L 35.5,42" stroke={c} strokeWidth="2" strokeLinecap="round" />
          <path d="M 84.5,42 L 92,40"  stroke={c} strokeWidth="2" strokeLinecap="round" />
          <circle cx="45" cy="42" r="9.5" fill={c} fillOpacity="0.07" />
          <circle cx="75" cy="42" r="9.5" fill={c} fillOpacity="0.07" />
          <path d="M 38,36 Q 41,34 44,36" stroke="rgba(255,255,255,0.5)" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M 68,36 Q 71,34 74,36" stroke="rgba(255,255,255,0.5)" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'sunglasses':
      return (
        <g>
          <rect x="35.5" y="35" width="19" height="14" rx="6" fill={c} />
          <rect x="65.5" y="35" width="19" height="14" rx="6" fill={c} />
          <rect x="54.5" y="40"  width="11" height="3"  rx="1.5" fill={c} />
          <path d="M 28,38 L 35.5,40" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 84.5,40 L 92,38"  stroke={c} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 38,37 Q 42,35 46,37" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <path d="M 68,37 Q 72,35 76,37" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'earring':
      return (
        <g>
          <circle cx="91" cy="50" r="4" fill="none" stroke={c} strokeWidth="2" />
          <circle cx="91" cy="55" r="2.5" fill={c} />
          <circle cx="90.2" cy="49.2" r="1" fill="rgba(255,255,255,0.4)" />
        </g>
      );
    case 'scar':
      return (
        <path d="M 65,46 Q 68,54 66,63" stroke={c} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.8" />
      );
    default:
      return null;
  }
}
