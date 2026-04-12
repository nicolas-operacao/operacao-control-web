// AvatarRenderer — Pixel Art sprite style
// Canvas 100×150, shapeRendering crispEdges

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
  skin:       { face: '#F5C18A', shade: '#D4895A', dark: '#B8733E' },
  eyes:       { shape: 'round', iris: '#2255CC', white: '#F0F0F0' },
  mouth:      { shape: 'smile', color: '#C04040' },
  hair:       { style: 'short', color: '#3B1F0E', shade: '#221008' },
  clothes:    { style: 'polo', body: '#1B3A6B', shade: '#112750', collar: '#EAEAEA', badge: '#C8A030', pant: '#1E2D40', pantShade: '#111E2C', shoe: '#1A1A2A' },
  hat:        { style: 'none', color: '#1B3A6B', shade: '#112750' },
  accessory:  { style: 'none', color: '#4B5563' },
};

function sd(eq: AvatarEquipped, key: keyof AvatarEquipped) {
  return { ...DEFAULT[key], ...(eq[key]?.style_data ?? {}) };
}

// ── pixel helpers ──────────────────────────────────────────────
const O = '#111111'; // outline
function r(x:number,y:number,w:number,h:number,fill:string,k?:string) {
  return <rect key={k??`${x},${y},${w},${h},${fill}`} x={x} y={y} width={w} height={h} fill={fill} />;
}
// rect with outline border
function rb(x:number,y:number,w:number,h:number,fill:string,k?:string) {
  return (
    <g key={k??`rb${x}${y}`}>
      {r(x-1,y-1,w+2,h+2,O)}
      {r(x,y,w,h,fill)}
    </g>
  );
}
// top-edge highlight inside a rect
function hi(x:number,y:number,w:number) {
  return r(x,y,w,2,'rgba(255,255,255,0.18)');
}
// bottom-edge shadow inside a rect
function sh(x:number,y:number,w:number,h:number) {
  return r(x,y+h-2,w,2,'rgba(0,0,0,0.22)');
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
      shapeRendering="crispEdges"
      style={{ borderRadius: '10px', flexShrink: 0, display: 'block', imageRendering: 'pixelated' }}
    >
      <defs>
        <clipPath id={`cp${uid}`}><rect width={W} height={H} rx="10" ry="10"/></clipPath>
      </defs>
      <g clipPath={`url(#cp${uid})`}>
        <Scene bg={bg} uid={uid} />
        <Character sk={sk} ey={ey} mo={mo} ha={ha} cl={cl} ht={ht} ac={ac} />
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// BACKGROUNDS
// ═══════════════════════════════════════════════════════════════
function Scene({ bg, uid }: { bg: any; uid: string }) {
  const type = bg.type ?? 'solid';

  if (type === 'office') return (
    <>
      {/* Wall */}
      {r(0,0,100,108,'#1C2B4A')}
      {r(0,0,100,108,'#243060',`w${uid}`)}
      {r(0,0,100,4,'#2D3C70')}
      {/* Baseboard */}
      {r(0,100,100,8,'#141E32')}
      {r(0,100,100,2,'rgba(255,255,255,0.06)')}
      {/* Floor */}
      {r(0,108,100,42,'#0D1520')}
      {r(0,108,100,2,'rgba(255,255,255,0.05)')}
      {/* Window */}
      {r(64,8,28,22,'#0a1830')}
      {r(64,8,28,22,'#7EC8E3',`wf${uid}`)}
      {r(64,8,28,1,'rgba(255,255,255,0.3)')}
      {r(64,8,1,22,'rgba(255,255,255,0.2)')}
      {r(77,8,1,22,'rgba(255,255,255,0.1)')}
      {r(64,19,28,1,'rgba(255,255,255,0.1)')}
      {r(64,8,28,22,'none',`wo${uid}`)}
      <rect x="64" y="8" width="28" height="22" fill="none" stroke={O} strokeWidth="1"/>
      {/* Reflection on floor */}
      {r(20,132,60,4,'rgba(255,255,255,0.03)')}
      {/* Shadow under character */}
      <ellipse cx="50" cy="142" rx="18" ry="4" fill="rgba(0,0,0,0.4)" />
    </>
  );

  if (type === 'arena') return (
    <>
      {r(0,0,100,108,'#1A0505')}
      {[10,25,40,55,70,85].map(x=> r(x,0,2,108,'rgba(200,30,30,0.06)',`al${x}`))}
      {r(0,100,100,8,'#0D0000')}
      {r(0,100,100,2,'#CC2222')}
      {r(0,108,100,42,'#080000')}
      {[0,12,24,36,48,60,72,84,96].map(x=> r(x,108,1,42,'rgba(180,20,20,0.08)',`ag${x}`))}
      <ellipse cx="50" cy="142" rx="18" ry="4" fill="rgba(0,0,0,0.5)" />
    </>
  );

  if (type === 'nature') return (
    <>
      {/* Sky gradient */}
      {r(0,0,100,108,'#1464A0')}
      {r(0,0,100,40,'#1A7AB8')}
      {/* Sun */}
      <circle cx="80" cy="18" r="12" fill="#FCD34D"/>
      <circle cx="80" cy="18" r="16" fill="#FCD34D" opacity="0.15"/>
      {/* Clouds */}
      {r(4,16,22,8,'rgba(255,255,255,0.75)')}
      {r(8,12,14,8,'rgba(255,255,255,0.75)')}
      {r(44,10,18,6,'rgba(255,255,255,0.6)')}
      {/* Mountains */}
      {[[0,78,20,30],[16,68,24,40],[36,58,28,50],[60,64,24,44],[78,72,22,36]].map(([x,y,w,h],i)=>
        r(x,y,w,h,i%2===0?'#0A4A2E':'#063D24',`mt${i}`)
      )}
      {/* Ground */}
      {r(0,100,100,8,'#166534')}
      {r(0,100,100,2,'#22C55E')}
      {r(0,108,100,42,'#14532D')}
      <ellipse cx="50" cy="142" rx="18" ry="4" fill="rgba(0,0,0,0.35)" />
    </>
  );

  if (type === 'stars') return (
    <>
      {r(0,0,100,150,'#030712')}
      {([[8,6],[22,4],[40,8],[60,5],[78,10],[90,4],[95,18],[85,28],[12,22],[30,32],[55,18],[72,25],[18,40],[45,35],[88,42],[5,55],[65,48],[15,85],[48,80],[75,88]] as [number,number][]).map(([x,y],i)=>
        <circle key={i} cx={x} cy={y} r={i%4===0?1.5:0.8} fill="white" opacity={0.3+i%5*0.12}/>
      )}
      <ellipse cx="70" cy="25" rx="22" ry="12" fill="#4F46E5" opacity="0.1"/>
      {r(0,100,100,8,'#050816')}
      {r(0,100,100,2,'rgba(139,92,246,0.3)')}
      {r(0,108,100,42,'#020510')}
      <ellipse cx="50" cy="142" rx="18" ry="4" fill="rgba(0,0,0,0.6)" />
    </>
  );

  if (type === 'neon') return (
    <>
      {r(0,0,100,150,'#05050F')}
      {[0,10,20,30,40,50,60,70,80,90,100].map(x=>
        <line key={`nv${x}`} x1={x} y1={0} x2={50} y2={108} stroke="#A855F7" strokeWidth="0.5" opacity="0.12"/>
      )}
      {[0.2,0.4,0.6,0.75,0.9].map((t,i)=>
        r(0,t*108,100,1,'rgba(168,85,247,0.15)',`nh${i}`)
      )}
      {r(0,108,100,2,'#A855F7',`nfl`)}
      {r(0,110,100,40,'#030308')}
      <ellipse cx="50" cy="142" rx="18" ry="4" fill="rgba(168,85,247,0.2)" />
    </>
  );

  if (type === 'gradient') {
    const c0 = bg.colors?.[0] ?? '#1e293b';
    const c1 = bg.colors?.[1] ?? '#0f172a';
    return (
      <>
        <defs>
          <linearGradient id={`bgG${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c0}/>
            <stop offset="100%" stopColor={c1}/>
          </linearGradient>
        </defs>
        <rect width="100" height="150" fill={`url(#bgG${uid})`}/>
        {r(0,100,100,8,'rgba(0,0,0,0.2)')}
        {r(0,100,100,2,'rgba(255,255,255,0.06)')}
        {r(0,108,100,42,'rgba(0,0,0,0.3)')}
        <ellipse cx="50" cy="142" rx="18" ry="4" fill="rgba(0,0,0,0.4)" />
      </>
    );
  }

  // solid fallback
  const c = bg.colors?.[0] ?? '#1e293b';
  return (
    <>
      {r(0,0,100,150,c)}
      {r(0,100,100,2,'rgba(255,255,255,0.06)')}
      <ellipse cx="50" cy="142" rx="18" ry="4" fill="rgba(0,0,0,0.4)" />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHARACTER  — pixel art sprite, full body
// Coordinate system: character fits from x≈18 to x≈82, y≈8 to y≈136
// ═══════════════════════════════════════════════════════════════
function Character({ sk, ey, mo, ha, cl, ht, ac }: {
  sk:any; ey:any; mo:any; ha:any; cl:any; ht:any; ac:any;
}) {
  const F  = sk.face  ?? '#F5C18A';
  const S  = sk.shade ?? '#D4895A';
  const D  = sk.dark  ?? '#B8733E';

  const CB  = cl.body      ?? '#1B3A6B';
  const CS  = cl.shade     ?? '#112750';
  const COL = cl.collar    ?? '#EAEAEA';
  const BDG = cl.badge     ?? '#C8A030';
  const PA  = cl.pant      ?? '#1E2D40';
  const PS  = cl.pantShade ?? '#111E2C';
  const SH  = cl.shoe      ?? '#1A1A2A';

  const HR  = ha.color ?? '#3B1F0E';
  const HRS = ha.shade ?? '#221008';

  // ── layout constants ──────────────────────────────────────
  // HEAD: x=33..67 (34 wide), y=18..50 (32 tall)
  const hx=33, hy=18, hw=34, hh=32;
  // NECK: x=43..57, y=50..58
  const nx=43, ny=50, nw=14, nh=8;
  // TORSO: x=28..72, y=58..94
  const tx=28, ty=58, tw=44, th=36;
  // LEFT ARM: x=16..28, y=58..90
  const lax=16, lay=58, law=12, lah=32;
  // RIGHT ARM: x=72..84, y=58..90
  const rax=72, ray=58, raw=12, rah=32;
  // LEFT LEG: x=33..47, y=94..126
  const llx=33, lly=94, llw=14, llh=32;
  // RIGHT LEG: x=53..67, y=94..126
  const rlx=53, rly=94, rlw=14, rlh=32;
  // LEFT FOOT: x=30..50, y=126..136
  const lfx=30, lfy=126, lfw=20, lfh=10;
  // RIGHT FOOT: x=50..70, y=126..136
  const rfx=50, rfy=126, rfw=20, rfh=10;

  return (
    <g>
      {/* ── LEGS ── */}
      {/* outlines */}
      {r(llx-1,lly-1,llw+2,llh+2,O,'llo')}
      {r(rlx-1,rly-1,rlw+2,rlh+2,O,'rlo')}
      {/* left leg */}
      {r(llx,lly,llw,llh,PA,'ll')}
      {r(llx,lly,4,llh,PS,'lls')}
      {hi(llx,lly,llw)}
      {/* right leg */}
      {r(rlx,rly,rlw,rlh,PA,'rl')}
      {r(rlx+rlw-4,rly,4,rlh,PS,'rls')}
      {hi(rlx,rly,rlw)}
      {/* gap between legs */}
      {r(llx+llw-1,lly,rlx-(llx+llw)+2,llh,O,'lg')}

      {/* ── FEET ── */}
      {r(lfx-1,lfy-1,lfw+2,lfh+2,O,'lfo')}
      {r(rfx-1,rfy-1,rfw+2,rfh+2,O,'rfo')}
      {r(lfx,lfy,lfw,lfh,SH,'lf')}
      {r(lfx,lfy,6,lfh,'rgba(255,255,255,0.08)')}
      {r(rfx,rfy,rfw,rfh,SH,'rf')}
      {r(rfx,rfy,6,rfh,'rgba(255,255,255,0.08)')}

      {/* ── LEFT ARM (behind torso in z) ── */}
      {r(lax-1,lay-1,law+2,lah+2,O,'lao')}
      {r(lax,lay,law,lah,CB,'la')}
      {r(lax,lay,4,lah,CS,'las')}
      {hi(lax,lay,law)}
      {/* left hand */}
      {r(lax-1,lay+lah-1,law+4,10,O,'lho')}
      {r(lax,lay+lah,law+2,8,F,'lh')}
      {r(lax,lay+lah,4,8,S,'lhs')}

      {/* ── RIGHT ARM ── */}
      {r(rax-1,ray-1,raw+2,rah+2,O,'rao')}
      {r(rax,ray,raw,rah,CB,'ra')}
      {r(rax+raw-4,ray,4,rah,CS,'ras')}
      {hi(rax,ray,raw)}
      {/* right hand */}
      {r(rax-3,ray+rah-1,raw+4,10,O,'rho')}
      {r(rax-2,ray+rah,raw+2,8,F,'rh')}
      {r(rax+raw-4,ray+rah,4,8,S,'rhs')}

      {/* ── TORSO ── */}
      <Torso cl={cl} tx={tx} ty={ty} tw={tw} th={th} CB={CB} CS={CS} COL={COL} BDG={BDG} />

      {/* ── NECK ── */}
      {r(nx-1,ny-1,nw+2,nh+2,O,'nko')}
      {r(nx,ny,nw,nh,F,'nk')}
      {r(nx,ny,4,nh,S,'nks')}

      {/* ── HAIR BACK (long) ── */}
      {ha.style === 'long' && <HairBack hr={HR} hrs={HRS} />}

      {/* ── HEAD ── */}
      {r(hx-1,hy-1,hw+2,hh+2,O,'hdo')}
      {r(hx,hy,hw,hh,F,'hd')}
      {/* face side shade */}
      {r(hx+hw-6,hy,6,hh,S,'hds')}
      {/* chin shade */}
      {r(hx,hy+hh-6,hw,6,D,'hdc')}
      {/* cheek blush */}
      {r(hx+2,hy+16,6,4,'rgba(220,120,100,0.15)')}
      {r(hx+hw-8,hy+16,6,4,'rgba(220,120,100,0.15)')}

      {/* ── EYEBROWS ── */}
      <Eyebrows ey={ey} hx={hx} hy={hy} HR={HR} HRS={HRS} />

      {/* ── EYES ── */}
      <EyesPixel ey={ey} hx={hx} hy={hy} />

      {/* ── NOSE ── */}
      {r(hx+hw/2-2,hy+20,2,2,S,'ns1')}
      {r(hx+4,hy+22,2,2,S,'ns2')}
      {r(hx+hw-6,hy+22,2,2,S,'ns3')}

      {/* ── MOUTH ── */}
      <MouthPixel mo={mo} hx={hx} hy={hy} hw={hw} hh={hh} />

      {/* ── HAIR FRONT ── */}
      {ha.style !== 'long' ? <HairFront ha={ha} hx={hx} hy={hy} hw={hw} HR={HR} HRS={HRS} /> : <HairFrontLong hr={HR} hrs={HRS} hx={hx} hy={hy} hw={hw} />}

      {/* ── HAT ── */}
      {ht.style !== 'none' && <HatPixel ht={ht} hx={hx} hy={hy} hw={hw} />}

      {/* ── ACCESSORY ── */}
      {ac.style !== 'none' && <AccessoryPixel ac={ac} hx={hx} hy={hy} hw={hw} />}
    </g>
  );
}

// ── TORSO ─────────────────────────────────────────────────────
function Torso({ cl, tx, ty, tw, th, CB, CS, COL, BDG }: any) {
  switch (cl.style) {
    case 'suit':
      return (
        <g>
          {r(tx-1,ty-1,tw+2,th+2,O,'to')}
          {r(tx,ty,tw,th,'#1C2C3E','tb')}
          {r(tx,ty,8,th,'#141F2C','ts')}
          {/* lapels */}
          {r(tx+8,ty,10,20,COL,'tll')}
          {r(tx+tw-18,ty,10,20,COL,'tlr')}
          {r(tx+14,ty+4,12,4,'#CC2222','tn')}
          {/* buttons */}
          {[0,8,16].map(d=> r(tx+tw/2-2,ty+22+d,4,4,'rgba(255,255,255,0.2)',`bt${d}`))}
          {hi(tx,ty,tw)}
        </g>
      );
    case 'hoodie':
      return (
        <g>
          {r(tx-1,ty-1,tw+2,th+2,O,'to')}
          {r(tx,ty,tw,th,CB,'tb')}
          {r(tx,ty,8,th,CS,'ts')}
          {/* hood */}
          {r(tx+4,ty-10,tw-8,14,CS,'hd')}
          {/* pocket */}
          {r(tx+10,ty+th-14,tw-20,12,CS,'pk')}
          {r(tx+tw/2-1,ty+th-14,2,12,'rgba(0,0,0,0.2)')}
          {hi(tx,ty,tw)}
        </g>
      );
    case 'armor':
      return (
        <g>
          {r(tx-1,ty-1,tw+2,th+2,O,'to')}
          {r(tx,ty,tw,th,'#6B7280','tb')}
          {r(tx+4,ty+2,tw-8,th-4,'#9CA3AF','ti')}
          {r(tx+10,ty+6,tw-20,th-12,'#6B7280','tc')}
          {/* shoulder pads */}
          {r(tx-2,ty,14,16,'#9CA3AF','spl')}
          {r(tx+tw-12,ty,14,16,'#9CA3AF','spr')}
          {hi(tx+4,ty+2,tw-8)}
        </g>
      );
    case 'shirt':
      return (
        <g>
          {r(tx-1,ty-1,tw+2,th+2,O,'to')}
          {r(tx,ty,tw,th,CB,'tb')}
          {r(tx,ty,8,th,CS,'ts')}
          {/* collar */}
          {r(tx+tw/2-8,ty,16,10,COL,'col')}
          {r(tx+tw/2-2,ty,4,th,'rgba(0,0,0,0.1)','btn')}
          {hi(tx,ty,tw)}
        </g>
      );
    default: /* polo */
      return (
        <g>
          {r(tx-1,ty-1,tw+2,th+2,O,'to')}
          {r(tx,ty,tw,th,CB,'tb')}
          {r(tx,ty,8,th,CS,'ts')}
          {hi(tx,ty,tw)}
          {/* collar left */}
          {r(tx+tw/2-12,ty,12,12,COL,'coll')}
          {/* collar right */}
          {r(tx+tw/2,ty,12,12,COL,'colr')}
          {r(tx+tw/2-2,ty,4,12,'rgba(0,0,0,0.15)','colc')}
          {/* badge */}
          {r(tx+tw-16,ty+16,14,10,O,'bgo')}
          {r(tx+tw-15,ty+17,12,8,BDG,'bg')}
          {r(tx+tw-13,ty+19,8,2,'rgba(0,0,0,0.3)','bgl')}
          {r(tx+tw-13,ty+22,6,2,'rgba(0,0,0,0.2)','bgl2')}
        </g>
      );
  }
}

// ── EYEBROWS ──────────────────────────────────────────────────
function Eyebrows({ ey, hx, hy, HR, HRS }: any) {
  const by = hy + 8;
  if (ey.shape === 'angry') {
    return (
      <>
        {r(hx+4, by,   12, 3, HRS, 'ebl')}
        {r(hx+4, by+1,  4, 2, HR,  'ebl2')}
        {r(hx+hw-16+12, by, 12, 3, HRS, 'ebr')}
        {r(hx+hw-12+12, by+1, 4, 2, HR, 'ebr2')}
      </>
    );
  }
  return (
    <>
      {r(hx+4,  by, 12, 3, HRS, 'ebl')}
      {r(hx+5,  by, 10, 2, HR,  'ebl2')}
      {r(hx+18, by, 12, 3, HRS, 'ebr')}
      {r(hx+19, by, 10, 2, HR,  'ebr2')}
    </>
  );
}
const hw = 34; // same as above, used in Eyebrows

// ── EYES ──────────────────────────────────────────────────────
function EyesPixel({ ey, hx, hy }: any) {
  const ew = '#F0F0F0';
  const iris = ey.iris ?? '#2255CC';
  const ey2 = hy + 12;
  const lx = hx + 5, rx = hx + 20;

  if (ey.shape === 'angry') {
    return (
      <>
        {/* left eye */}
        {r(lx,ey2,8,8,O,'leo')}
        {r(lx+1,ey2+1,6,6,ew,'le')}
        {r(lx+2,ey2+2,4,4,iris,'li')}
        {r(lx+3,ey2+3,2,2,'#060606','lp')}
        {r(lx+1,ey2+1,3,1,'rgba(255,255,255,0.5)','ll')}
        {r(lx,ey2,8,2,'rgba(0,0,0,0.3)','lel')}
        {/* right eye */}
        {r(rx,ey2,8,8,O,'reo')}
        {r(rx+1,ey2+1,6,6,ew,'re')}
        {r(rx+2,ey2+2,4,4,iris,'ri')}
        {r(rx+3,ey2+3,2,2,'#060606','rp')}
        {r(rx+1,ey2+1,3,1,'rgba(255,255,255,0.5)','rl')}
        {r(rx+8,ey2,0,2,'rgba(0,0,0,0.3)','rel')}
      </>
    );
  }
  if (ey.shape === 'almond') {
    return (
      <>
        {r(lx-1,ey2+1,10,6,O,'leo')}{r(lx,ey2+2,8,4,ew,'le')}
        {r(lx+2,ey2+2,4,4,iris,'li')}{r(lx+3,ey2+3,2,2,'#060606','lp')}
        {r(lx,ey2+2,3,1,'rgba(255,255,255,0.5)','ll')}
        {r(rx-1,ey2+1,10,6,O,'reo')}{r(rx,ey2+2,8,4,ew,'re')}
        {r(rx+2,ey2+2,4,4,iris,'ri')}{r(rx+3,ey2+3,2,2,'#060606','rp')}
        {r(rx,ey2+2,3,1,'rgba(255,255,255,0.5)','rl')}
      </>
    );
  }
  // round default
  return (
    <>
      {r(lx,ey2,8,8,O,'leo')}
      {r(lx+1,ey2+1,6,6,ew,'le')}
      {r(lx+2,ey2+2,4,4,iris,'li')}
      {r(lx+3,ey2+3,2,2,'#060606','lp')}
      {r(lx+1,ey2+1,3,2,'rgba(255,255,255,0.55)','ll')}

      {r(rx,ey2,8,8,O,'reo')}
      {r(rx+1,ey2+1,6,6,ew,'re')}
      {r(rx+2,ey2+2,4,4,iris,'ri')}
      {r(rx+3,ey2+3,2,2,'#060606','rp')}
      {r(rx+1,ey2+1,3,2,'rgba(255,255,255,0.55)','rl')}
    </>
  );
}

// ── MOUTH ─────────────────────────────────────────────────────
function MouthPixel({ mo, hx, hy, hw, hh }: any) {
  const c = mo.color ?? '#C04040';
  const my = hy + 24;
  switch (mo.shape) {
    case 'bigsmile':
      return (
        <>
          {r(hx+6,my,hw-12,6,O,'mo')}
          {r(hx+7,my+1,hw-14,4,c,'mb')}
          {r(hx+7,my+3,hw-14,2,'#F8E0E0','mt')}
          {r(hx+7,my+1,4,4,'rgba(255,255,255,0.1)')}
        </>
      );
    case 'smirk':
      return (
        <>
          {r(hx+8,my+2,hw-18,4,O,'mo')}
          {r(hx+9,my+3,hw-20,2,c,'mb')}
          {r(hx+hw-12,my,4,6,O,'mc')}
          {r(hx+hw-11,my+1,2,4,c,'mc2')}
        </>
      );
    case 'serious':
      return (
        <>
          {r(hx+7,my+2,hw-14,4,O,'mo')}
          {r(hx+8,my+3,hw-16,2,c,'mb')}
        </>
      );
    default: // smile
      return (
        <>
          {r(hx+7,my+2,hw-14,6,O,'mo')}
          {r(hx+8,my+3,hw-16,4,c,'mb')}
          {r(hx+8,my+5,hw-16,2,'rgba(255,255,255,0.15)','mh')}
        </>
      );
  }
}

// ── HAIR ──────────────────────────────────────────────────────
function HairFront({ ha, hx, hy, hw, HR, HRS }: any) {
  switch (ha.style) {
    case 'short':
      return (
        <>
          {r(hx-1,hy-13,hw+2,16,O,'hao')}
          {r(hx,hy-12,hw,14,HR,'ha')}
          {r(hx,hy-12,8,14,HRS,'has')}
          {hi(hx,hy-12,hw)}
          {r(hx-1,hy-1,6,16,HR,'hal')}
          {r(hx+hw-5,hy-1,6,16,HR,'har')}
        </>
      );
    case 'spiky':
      return (
        <>
          {/* spikes */}
          {[0,8,16,24].map(ox=>
            <g key={`sp${ox}`}>
              {r(hx+ox,hy-20,6,14,O,`spo${ox}`)}
              {r(hx+ox+1,hy-18,4,12,HR,`spi${ox}`)}
            </g>
          )}
          {r(hx-1,hy-6,hw+2,8,O,'hao')}
          {r(hx,hy-5,hw,6,HR,'ha')}
        </>
      );
    case 'mohawk':
      return (
        <>
          {r(hx+hw/2-5,hy-24,10,28,O,'mho')}
          {r(hx+hw/2-4,hy-22,8,26,HR,'mh')}
          {r(hx+hw/2-4,hy-22,3,26,HRS,'mhs')}
          {r(hx-1,hy-1,10,14,HR,'mhl')}
          {r(hx+hw-9,hy-1,10,14,HR,'mhr')}
        </>
      );
    case 'bald':
      return (
        <>{r(hx+4,hy-4,hw-8,6,'rgba(255,255,255,0.04)','bd')}</>
      );
    default:
      return null;
  }
}

function HairBack({ hr, hrs }: any) {
  return (
    <>
      {r(32,50,8,60,hr,'hbl')}
      {r(32,50,4,60,hrs,'hbls')}
      {r(60,50,8,60,hr,'hbr')}
      {r(64,50,4,60,hrs,'hbrs')}
    </>
  );
}

function HairFrontLong({ hr, hrs, hx, hy, hw }: any) {
  return (
    <>
      {r(hx-1,hy-13,hw+2,16,O,'hao')}
      {r(hx,hy-12,hw,14,hr,'ha')}
      {r(hx,hy-12,8,14,hrs,'has')}
      {hi(hx,hy-12,hw)}
    </>
  );
}

// ── HAT ───────────────────────────────────────────────────────
function HatPixel({ ht, hx, hy, hw }: any) {
  const c  = ht.color  ?? '#1B3A6B';
  const c2 = ht.shade  ?? '#112750';
  switch (ht.style) {
    case 'cap':
      return (
        <>
          {r(hx-1,hy-26,hw+2,20,O,'hto')}
          {r(hx,hy-25,hw,18,c,'ht')}
          {r(hx,hy-25,8,18,c2,'hts')}
          {hi(hx,hy-25,hw)}
          {r(hx-8,hy-10,hw+16,6,O,'hbo')}
          {r(hx-7,hy-9,hw+14,4,c2,'hb')}
        </>
      );
    case 'crown':
      return (
        <>
          {r(hx+2,hy-22,hw-4,10,O,'hto')}
          {r(hx+3,hy-21,hw-6,8,c,'ht')}
          {/* points */}
          {[[0,8],[12,14],[24,8]].map(([ox,h],i)=>
            <g key={i}>
              {r(hx+6+ox,hy-22-h,8,h+4,O,`cp${i}o`)}
              {r(hx+7+ox,hy-21-h,6,h+2,c,`cp${i}`)}
            </g>
          )}
          {[[2,'#EF4444'],[14,'#22C55E'],[26,'#3B82F6']].map(([ox,gc],i)=>
            r(hx+8+Number(ox),hy-30+i*2,4,4,gc as string,`gm${i}`)
          )}
        </>
      );
    case 'cowboy':
      return (
        <>
          {r(hx-12,hy-18,hw+24,6,O,'hbo')}
          {r(hx-11,hy-17,hw+22,4,c2,'hb')}
          {r(hx-1,hy-32,hw+2,18,O,'hto')}
          {r(hx,hy-31,hw,16,c,'ht')}
          {r(hx,hy-31,8,16,c2,'hts')}
          {hi(hx,hy-31,hw)}
        </>
      );
    case 'wizard':
      return (
        <>
          {r(hx+4,hy-12,hw-8,8,O,'hbo')}
          {r(hx+5,hy-11,hw-10,6,c2,'hb')}
          {r(hx+hw/2-5,hy-46,10,38,O,'hto')}
          {r(hx+hw/2-4,hy-44,8,36,c,'ht')}
          {r(hx+hw/2-4,hy-44,3,36,c2,'hts')}
          {r(hx+hw/2-2,hy-38,4,4,'#FBBF24','hts')}
        </>
      );
    default: return null;
  }
}

// ── ACCESSORY ─────────────────────────────────────────────────
function AccessoryPixel({ ac, hx, hy, hw }: any) {
  const c = ac.color ?? '#4B5563';
  const ey2 = hy + 12;
  switch (ac.style) {
    case 'glasses':
      return (
        <>
          {r(hx+3,ey2-1,12,10,O,'gl1o')}{r(hx+4,ey2,10,8,c,'gl1')}{r(hx+4,ey2,10,8,'rgba(255,255,255,0.06)')}
          {r(hx+19,ey2-1,12,10,O,'gl2o')}{r(hx+20,ey2,10,8,c,'gl2')}{r(hx+20,ey2,10,8,'rgba(255,255,255,0.06)')}
          {r(hx+15,ey2+3,4,2,c,'glb')}
          {r(hx-1,ey2+3,4,2,c,'gll')}{r(hx+hw-3,ey2+3,4,2,c,'glr')}
        </>
      );
    case 'sunglasses':
      return (
        <>
          {r(hx+3,ey2-1,12,10,O,'sg1o')}{r(hx+4,ey2,10,8,c,'sg1')}
          {r(hx+4,ey2,6,3,'rgba(255,255,255,0.15)','sg1h')}
          {r(hx+19,ey2-1,12,10,O,'sg2o')}{r(hx+20,ey2,10,8,c,'sg2')}
          {r(hx+20,ey2,6,3,'rgba(255,255,255,0.15)','sg2h')}
          {r(hx+15,ey2+3,4,2,c,'sgb')}
          {r(hx-1,ey2+3,4,2,c,'sgl')}{r(hx+hw-3,ey2+3,4,2,c,'sgr')}
        </>
      );
    case 'earring':
      return (
        <>
          {r(hx+hw-3,ey2+12,6,6,O,'ero')}
          {r(hx+hw-2,ey2+13,4,4,c,'er')}
          {r(hx+hw-2,ey2+13,2,2,'rgba(255,255,255,0.3)','erh')}
        </>
      );
    case 'scar':
      return (
        <>
          {r(hx+hw-12,ey2+2,4,16,O,'sco')}
          {r(hx+hw-11,ey2+3,2,14,c,'sc')}
        </>
      );
    default: return null;
  }
}
