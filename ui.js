'use strict';
// In-canvas pixel UI: HUD, mission board, buttons and touch controls are all drawn on the 640x330
// logical canvas, so they inherit the same nearest-neighbour upscale as the world. No DOM UI.

const UI_COLORS={
  void:'#0b0c09',plate:'#171a13',plateSoft:'#1f231a',bevelL:'#4f553f',bevelD:'#0f110c',line:'#2c3124',
  text:'#d8d4b8',muted:'#8d917b',brass:'#e0b64f',brassDim:'#9a7d33',blood:'#c2402a',health:'#a9c25b',stamina:'#86a9b3',route:'#d7c98a',ink:'#1c1a0f'
};
const UI_FONT_CN='"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
// K = device pixels per logical pixel (view.k from game.js). Every primitive snaps logical coordinates to whole device pixels.
let K=1;
function uiPix(){return K;}

// 5x7 bitmap font for digits, capitals and a few symbols. Drawn as rects so it stays crisp at any scale.
const PIXEL_GLYPHS=(()=>{
  const g={};
  const def=(ch,rows)=>{g[ch]=rows;};
  def('0',['.###.','#...#','#..##','#.#.#','##..#','#...#','.###.']);
  def('1',['..#..','.##..','..#..','..#..','..#..','..#..','.###.']);
  def('2',['.###.','#...#','....#','...#.','..#..','.#...','#####']);
  def('3',['.###.','#...#','....#','..##.','....#','#...#','.###.']);
  def('4',['...#.','..##.','.#.#.','#..#.','#####','...#.','...#.']);
  def('5',['#####','#....','####.','....#','....#','#...#','.###.']);
  def('6',['.###.','#....','#....','####.','#...#','#...#','.###.']);
  def('7',['#####','....#','...#.','..#..','..#..','..#..','..#..']);
  def('8',['.###.','#...#','#...#','.###.','#...#','#...#','.###.']);
  def('9',['.###.','#...#','#...#','.####','....#','....#','.###.']);
  def('A',['.###.','#...#','#...#','#####','#...#','#...#','#...#']);
  def('B',['####.','#...#','#...#','####.','#...#','#...#','####.']);
  def('C',['.###.','#...#','#....','#....','#....','#...#','.###.']);
  def('D',['####.','#...#','#...#','#...#','#...#','#...#','####.']);
  def('E',['#####','#....','#....','####.','#....','#....','#####']);
  def('F',['#####','#....','#....','####.','#....','#....','#....']);
  def('G',['.###.','#...#','#....','#.###','#...#','#...#','.####']);
  def('H',['#...#','#...#','#...#','#####','#...#','#...#','#...#']);
  def('I',['.###.','..#..','..#..','..#..','..#..','..#..','.###.']);
  def('J',['..###','...#.','...#.','...#.','...#.','#..#.','.##..']);
  def('K',['#...#','#..#.','#.#..','##...','#.#..','#..#.','#...#']);
  def('L',['#....','#....','#....','#....','#....','#....','#####']);
  def('M',['#...#','##.##','#.#.#','#.#.#','#...#','#...#','#...#']);
  def('N',['#...#','##..#','#.#.#','#..##','#...#','#...#','#...#']);
  def('O',['.###.','#...#','#...#','#...#','#...#','#...#','.###.']);
  def('P',['####.','#...#','#...#','####.','#....','#....','#....']);
  def('Q',['.###.','#...#','#...#','#...#','#.#.#','#..#.','.##.#']);
  def('R',['####.','#...#','#...#','####.','#.#..','#..#.','#...#']);
  def('S',['.####','#....','#....','.###.','....#','....#','####.']);
  def('T',['#####','..#..','..#..','..#..','..#..','..#..','..#..']);
  def('U',['#...#','#...#','#...#','#...#','#...#','#...#','.###.']);
  def('V',['#...#','#...#','#...#','#...#','.#.#.','.#.#.','..#..']);
  def('W',['#...#','#...#','#...#','#.#.#','#.#.#','##.##','#...#']);
  def('X',['#...#','#...#','.#.#.','..#..','.#.#.','#...#','#...#']);
  def('Y',['#...#','#...#','.#.#.','..#..','..#..','..#..','..#..']);
  def('Z',['#####','....#','...#.','..#..','.#...','#....','#####']);
  def(':',['.....','..#..','..#..','.....','..#..','..#..','.....']);
  def('/',['....#','...#.','...#.','..#..','.#...','.#...','#....']);
  def('.',['.....','.....','.....','.....','.....','..#..','..#..']);
  def('-',['.....','.....','.....','.###.','.....','.....','.....']);
  def('+',['.....','..#..','..#..','#####','..#..','..#..','.....']);
  def('%',['##..#','##.#.','...#.','..#..','.#...','.#.##','#..##']);
  def('>',['#....','.#...','..#..','...#.','..#..','.#...','#....']);
  def('<',['....#','...#.','..#..','.#...','..#..','...#.','....#']);
  def('!',['..#..','..#..','..#..','..#..','..#..','.....','..#..']);
  def(' ',['.....','.....','.....','.....','.....','.....','.....']);
  return g;
})();

function pixelTextWidth(text,scale=1){return text.length*6*scale-scale;}
function pixelText(c,text,x,y,scale=1,color=UI_COLORS.text,shadow=UI_COLORS.void,align='left'){
  text=String(text).toUpperCase();
  const width=pixelTextWidth(text,scale);
  if(align==='right')x-=width;else if(align==='center')x-=Math.floor(width/2);
  x=Math.round(x);y=Math.round(y);
  for(const pass of shadow?[[shadow,scale],[color,0]]:[[color,0]]){
    let cx=x;
    for(const ch of text){
      const rows=PIXEL_GLYPHS[ch];
      if(rows)for(let r=0;r<7;r++)for(let col=0;col<5;col++)if(rows[r][col]==='#')px(c,cx+col*scale+pass[1],y+r*scale+pass[1],scale,scale,pass[0]);
      cx+=6*scale;
    }
  }
  return width;
}
// Chinese is rendered once per string into a 1-bit bitmap (alpha threshold) and cached, so it reads
// like a pixel font instead of a blurry anti-aliased glyph after the nearest-neighbour upscale.
const cnCache=new Map();
function hexRgb(hex){const n=parseInt(hex.slice(1,7),16);return [(n>>16)&255,(n>>8)&255,n&255];}
function cnBitmap(c,text,size,color,weight){
  const key=`${text}|${size}|${color}|${weight}|${K.toFixed(3)}`;if(cnCache.has(key))return cnCache.get(key);
  if(cnCache.size>400)cnCache.clear();
  let entry=false;
  try{
    const k=uiPix(),fs=Math.round(size*k);if(fs<16)weight='normal';
    const w=Math.ceil(cnWidth(c,text,size,weight)*k)+4,h=Math.ceil(fs*1.35)+4;
    const off=document.createElement('canvas');off.width=Math.max(1,w);off.height=Math.max(1,h);
    const oc=off.getContext('2d');oc.font=`${weight} ${fs}px ${UI_FONT_CN}`;oc.textBaseline='top';oc.fillStyle='#fff';oc.fillText(text,2,2);
    const img=oc.getImageData(0,0,off.width,off.height);
    if(img&&img.data){const d=img.data,[r,g,b]=hexRgb(color);const cut=weight==='bold'?112:88;for(let i=0;i<d.length;i+=4){if(d[i+3]>=cut){d[i]=r;d[i+1]=g;d[i+2]=b;d[i+3]=255;}else d[i+3]=0;}oc.putImageData(img,0,0);entry={canvas:off,w:off.width,h:off.height,k};}
  }catch{entry=false;}
  cnCache.set(key,entry);return entry;
}
function cnText(c,text,x,y,size=9,color=UI_COLORS.text,align='left',weight='bold',shadow=UI_COLORS.void){
  if(!text)return;weight=weight||'bold';
  const width=cnWidth(c,text,size,weight);
  if(align==='right')x-=width;else if(align==='center')x-=width/2;
  const bitmap=cnBitmap(c,text,size,color,weight);
  if(bitmap){
    const dx=Math.round(x*K)-2,dy=Math.round(y*K)-2,so=Math.max(1,Math.round(K*.5));
    if(shadow){const sh=cnBitmap(c,text,size,shadow,weight);if(sh)c.drawImage(sh.canvas,dx+so,dy+so);}
    c.drawImage(bitmap.canvas,dx,dy);return;
  }
  c.font=`${weight} ${Math.round(size*K)}px ${UI_FONT_CN}`;c.textBaseline='top';c.textAlign='left';
  if(shadow){c.fillStyle=shadow;c.fillText(text,Math.round(x*K)+1,Math.round(y*K)+1);}
  c.fillStyle=color;c.fillText(text,Math.round(x*K),Math.round(y*K));
}
function cnWidth(c,text,size=8,weight='bold'){const fs=Math.round(size*K);if(fs<16)weight='normal';c.font=`${weight} ${fs}px ${UI_FONT_CN}`;const m=c.measureText(text);return (m&&Number.isFinite(m.width)?m.width:text.length*fs)/K;}
function px(c,x,y,w,h,color){const x0=Math.round(x*K),y0=Math.round(y*K),x1=Math.round((x+w)*K),y1=Math.round((y+h)*K);c.fillStyle=color;c.fillRect(x0,y0,Math.max(1,x1-x0),Math.max(1,y1-y0));}
// Worn metal plate: 1px void outline, fill, light top/left bevel, dark bottom/right bevel.
function plate(c,x,y,w,h,fill=UI_COLORS.plate,light=UI_COLORS.bevelL,dark=UI_COLORS.bevelD){
  px(c,x-1,y-1,w+2,h+2,UI_COLORS.void);px(c,x,y,w,h,fill);
  px(c,x,y,w,1,light);px(c,x,y,1,h,light);px(c,x,y+h-1,w,1,dark);px(c,x+w-1,y,1,h,dark);
}
function barTrack(c,x,y,w,h,fill,ratio,color){px(c,x-1,y-1,w+2,h+2,UI_COLORS.void);px(c,x,y,w,h,'#0f110c');const n=Math.round(w*Math.max(0,Math.min(1,ratio)));if(n>0)px(c,x,y,n,h,color);if(n>1&&h>2)px(c,x,y,n,1,'#ffffff22');}

// Tiny pixel weapon glyphs, 14x7.
function weaponGlyph(c,id,x,y,color){
  const r=(dx,dy,w,h,col=color)=>px(c,x+dx,y+dy,w,h,col);
  if(id==='rifle'){r(0,3,3,2,'#8b6942');r(3,2,7,2);r(10,2,4,1);r(5,4,2,2,'#8b6942');r(8,4,1,2);}
  else if(id==='smg'){r(0,2,2,2);r(2,2,7,2);r(9,2,4,1);r(4,4,2,3);r(8,4,1,2);}
  else if(id==='shotgun'){r(0,3,3,2,'#a97749');r(3,2,6,2);r(9,2,5,1);r(6,4,3,1,'#a97749');}
  else if(id==='pistol'){r(3,2,9,2,'#a9ad93');r(3,2,9,1);r(4,4,3,3);r(7,4,2,1);}
  else{r(1,5,10,1,'#a77952');r(10,2,1,4);r(8,2,3,1);r(0,5,2,2);}
}
function icon(c,name,x,y,color){
  const r=(dx,dy,w,h)=>px(c,x+dx,y+dy,w,h,color);
  if(name==='sound'){r(0,2,2,3);r(2,1,1,5);r(3,0,1,7);r(5,2,1,3);r(6,1,1,5);}
  else if(name==='muted'){r(0,2,2,3);r(2,1,1,5);r(3,0,1,7);r(5,2,1,1);r(6,3,1,1);r(5,4,1,1);r(7,2,1,1);r(6,3,1,1);r(7,4,1,1);}
  else if(name==='pause'){r(1,0,2,7);r(5,0,2,7);}
  else if(name==='play'){r(1,0,1,7);r(2,1,1,5);r(3,2,1,3);r(4,3,1,1);}
  else if(name==='full'){r(0,0,3,1);r(0,0,1,3);r(5,0,3,1);r(7,0,1,3);r(0,6,3,1);r(0,4,1,3);r(5,6,3,1);r(7,4,1,3);}
  else if(name==='cross'){r(2,0,2,6);r(0,2,6,2);}
  else if(name==='up'){r(3,1,2,1);r(2,2,4,1);r(1,3,6,1);r(3,4,2,3);}
  else if(name==='down'){r(3,1,2,3);r(1,4,6,1);r(2,5,4,1);r(3,6,2,1);}
  else if(name==='left'){r(1,3,1,2);r(2,2,1,4);r(3,1,1,6);r(4,3,3,2);}
  else if(name==='right'){r(1,3,3,2);r(4,1,1,6);r(5,2,1,4);r(6,3,1,2);}
}

// ---- hit regions --------------------------------------------------------------------------
const uiHits=[];const uiActive=new Map();
let uiTouch=false,uiFontsRequested=false;
function uiHit(x,y,w,h,handlers){uiHits.push({x,y,w,h,...handlers});}
function uiFind(x,y){for(let i=uiHits.length-1;i>=0;i--){const h=uiHits[i];if(x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h)return h;}return null;}
function uiPointer(type,x,y,id=0){
  if(type==='down'){const h=uiFind(x,y);if(!h)return false;uiActive.set(id,h);if(h.down)h.down();return true;}
  if(type==='move'){const h=uiActive.get(id);if(!h)return false;if(h.hold){const now=uiFind(x,y);if(now!==h&&now&&now.hold&&now.group===h.group){if(h.up)h.up();uiActive.set(id,now);if(now.down)now.down();}}return true;}
  if(type==='up'||type==='cancel'){const h=uiActive.get(id);if(!h)return false;uiActive.delete(id);if(h.up)h.up();return true;}
  return false;
}
function uiDetectTouch(){try{if(typeof window!=='undefined'&&window.matchMedia)uiTouch=window.matchMedia('(pointer:coarse)').matches;}catch{}}
function uiRequestFonts(){if(uiFontsRequested)return;uiFontsRequested=true;try{if(typeof document!=='undefined'&&document.fonts&&document.fonts.load){document.fonts.load(`bold 9px ${UI_FONT_CN}`).then(()=>cnCache.clear()).catch(()=>{});if(document.fonts.ready)document.fonts.ready.then(()=>cnCache.clear()).catch(()=>{});}}catch{}}
uiDetectTouch();
if(typeof window!=='undefined'&&typeof window.addEventListener==='function'){window.addEventListener('resize',uiDetectTouch);window.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')uiTouch=true;},{passive:true});}

// ---- HUD ----------------------------------------------------------------------------------
function drawUI(c,viewInfo){
  uiRequestFonts();uiHits.length=0;
  const vk=viewInfo&&viewInfo.k>0?viewInfo.k:1;if(vk!==K){K=vk;cnCache.clear();}
  const w=W,h=H,C=UI_COLORS,weapon=getWeapon(),melee=Boolean(weapon.melee),playing=state==='playing';
  c.save();c.setTransform(1,0,0,1,viewInfo?viewInfo.ox:0,viewInfo?viewInfo.oy:0);c.globalAlpha=1;c.imageSmoothingEnabled=false;

  // Vitals (top-left)
  const hp=Math.ceil(player.hp);
  icon(c,'cross',7,8,hp<30?C.blood:C.health);
  pixelText(c,String(hp),16,6,2,hp<30?C.blood:C.text);
  pixelText(c,'/100',16+pixelTextWidth(String(hp),2)+6,13,1,C.muted);
  barTrack(c,7,23,84,5,null,player.hp/100,hp<30?C.blood:C.health);
  barTrack(c,7,30,84,2,null,player.stamina/100,C.stamina);
  const sector=typeof currentSector==='function'?currentSector():getWorldSector(player.x);
  cnText(c,sector.name,7,35,9,C.muted);pixelText(c,'SECTOR '+sector.code,7+cnWidth(c,sector.name,9)+5,37,1,C.brassDim);

  // Mission (top-center): wave, status chip, route
  const cx=Math.round(w/2);
  cnText(c,'尸潮',cx-54,9,10,C.muted,'right');
  pixelText(c,String(wave).padStart(2,'0'),cx-48,5,2,C.brass);
  const status=HUD.waveStatus||'';const sw=Math.ceil(cnWidth(c,status,9))+10;
  px(c,cx-20,5,sw,14,C.void);px(c,cx-19,6,sw-2,12,C.blood);cnText(c,status,cx-15,7,9,'#f6e9dc','left','bold',null);
  cnText(c,'撤离路线',cx-60,20,9,C.muted);
  const meters=Math.floor(Math.max(0,Math.min(ROUTE_METERS,(furthestX-ROUTE_START)/10)));
  pixelText(c,`${meters}/${ROUTE_METERS}M`,cx+60,22,1,C.route,C.void,'right');
  barTrack(c,cx-60,31,120,3,null,(furthestX-ROUTE_START)/(EXTRACTION_X-ROUTE_START),C.route);
  px(c,cx+60,29,1,7,C.brass);px(c,cx+61,29,3,3,C.brass);

  // Score (top-right) + system buttons
  const sysX=w-7;
  const buttons=[
    {name:soundEnabled?'sound':'muted',act:()=>toggleSound(),tip:soundEnabled?'声音开':'声音关'},
    {name:state==='paused'?'play':'pause',act:()=>pauseGame()},
    {name:'full',act:()=>toggleFullscreen()}
  ];
  let bx=sysX;
  for(let i=buttons.length-1;i>=0;i--){bx-=13;const b=buttons[i];plate(c,bx,6,12,12,C.plate);icon(c,b.name,bx+2,6+2,C.text);uiHit(bx-1,5,14,14,{down:b.act});bx-=3;}
  const killColor=HUD.killPulse>0?C.brass:C.text;
  const timeText=formatTime(elapsed);
  pixelText(c,timeText,bx-4,6,2,C.text,C.void,'right');
  cnText(c,'生存',bx-4-pixelTextWidth(timeText,2),22,9,C.muted);
  const killsText=String(kills).padStart(3,'0');const killsX=bx-4-pixelTextWidth(timeText,2)-12;
  pixelText(c,killsText,killsX,6,2,killColor,C.void,'right');
  cnText(c,'击杀',killsX-pixelTextWidth(killsText,2),22,9,C.muted);

  // Notice (center)
  if(noticeTime>0&&HUD.notice){c.globalAlpha=Math.min(1,noticeTime*3);cnText(c,HUD.notice,cx,64,12,'#f3ebcc','center');c.globalAlpha=1;}

  // Portal prompt: floats over the player's head when a door / junction is in reach.
  if(playing&&HUD.prompt){
    const px0=Math.round(player.x-viewX),head=player.pose&&player.pose.head?player.pose.head.y:player.y-80,py=Math.round(head)-30+Math.round(Math.sin(worldTime*4)*1.5);
    const tw=Math.ceil(cnWidth(c,HUD.prompt,9))+(uiTouch?12:26),bx0=px0-Math.round(tw/2);
    plate(c,bx0,py,tw,15,C.plate,C.brass,C.brassDim);
    if(!uiTouch){px(c,bx0+4,py+3,9,9,C.brass);pixelText(c,'E',bx0+6,py+4,1,C.ink,null);cnText(c,HUD.prompt,bx0+18,py+3,9,C.text);}
    else cnText(c,HUD.prompt,bx0+6,py+3,9,C.text);
  }

  // Weapon rig (bottom-center)
  const slotW=uiTouch?26:46,slotH=uiTouch?16:20,gap=3,rigW=WEAPON_ORDER.length*slotW+(WEAPON_ORDER.length-1)*gap;
  let sx=Math.round(cx-rigW/2);const sy=uiTouch?h-22:h-28;
  WEAPON_ORDER.forEach((id,i)=>{
    const wdef=WEAPONS[id],active=id===selectedWeapon,stash=active?player:weaponInventory[id];
    plate(c,sx,sy,slotW,slotH,active?'#2b2814':C.plate,active?C.brass:C.bevelL,active?C.brassDim:C.bevelD);
    weaponGlyph(c,id,sx+3,sy+(uiTouch?4:3),active?C.brass:'#9ba08b');
    if(!uiTouch){
      pixelText(c,String(i+1),sx+slotW-7,sy+2,1,active?C.brass:C.muted,null);
      pixelText(c,wdef.melee?'STA':`${stash.ammo}/${stash.reserve}`,sx+3,sy+12,1,active?C.text:C.muted,null);
    }
    uiHit(sx,sy,slotW,slotH,{down:()=>switchWeapon(id)});
    sx+=slotW+gap;
  });

  // Magazine (bottom-right)
  const magRight=w-8,magBottom=uiTouch?h-58:h-8;
  const count=melee?String(Math.floor(player.stamina)):String(player.ammo).padStart(2,'0');
  const low=melee?player.stamina<16:player.ammo<6;
  const magSize=melee?100:weapon.magSize,fill=Math.max(0,Math.min(1,(melee?player.stamina:player.ammo)/magSize));
  const ticks=melee?20:Math.min(40,magSize),tickW=magSize>20?2:3,ticksW=ticks*(tickW+1)-1;
  for(let i=0;i<ticks;i++){const filled=i<Math.round(fill*ticks);px(c,magRight-ticksW+i*(tickW+1),magBottom-5,tickW,4,filled?C.brass:'#3a3b2c');}
  const reserveText=melee?'STA':`/${player.reserve}`;
  let numX=magRight;
  if(!melee&&!uiTouch){plate(c,magRight-11,magBottom-33,11,11,C.plate);pixelText(c,'R',magRight-9,magBottom-31,1,reloadTime>0?C.brass:C.text,null);numX-=15;}
  pixelText(c,reserveText,numX,magBottom-22,2,C.text,C.void,'right');numX-=pixelTextWidth(reserveText,2)+5;
  pixelText(c,count,numX,magBottom-30,3,low?'#e06a3c':C.brass,C.void,'right');
  const label=reloadTime>0?`换弹中 ${reloadTime.toFixed(1)}s`:weapon.label;
  if(!uiTouch||reloadTime>0)cnText(c,label,magRight,magBottom-45,9,C.muted,'right');
  if(reloadTime>0)barTrack(c,magRight-60,magBottom-35,60,2,null,1-reloadTime/getReloadDuration(),C.brass);

  // Status ticker (bottom-left, desktop only)
  if(!uiTouch){const rigLeft=Math.round(cx-rigW/2)-8;px(c,7,h-13,4,4,C.brass);cnText(c,HUD.mode,14,h-17,9,C.text);const statusX=14+cnWidth(c,HUD.mode,9)+8;if(statusX+cnWidth(c,HUD.status,9)<rigLeft)cnText(c,HUD.status,statusX,h-17,9,C.muted,'left','normal');}

  // Touch controls
  if(uiTouch){
    const size=26,g=3,dx=8,dy=h-8-size*2-g;
    const pad=[['w',dx+size+g,dy,'up'],['a',dx,dy+size+g,'left'],['s',dx+size+g,dy+size+g,'down'],['d',dx+size*2+g*2,dy+size+g,'right']];
    for(const [key,x,y,name] of pad){const held=keys.has(key);plate(c,x,y,size,size,held?'#2b2814':C.plate,held?C.brass:C.bevelL,held?C.brassDim:C.bevelD);icon(c,name,x+9,y+9,held?C.brass:C.text);uiHit(x,y,size,size,{hold:true,group:'dpad',down:()=>keys.add(key),up:()=>keys.delete(key)});}
    const fs=40,fx=w-8-fs,fy=h-8-fs;
    px(c,fx-1,fy-1,fs+2,fs+2,C.void);px(c,fx,fy,fs,fs,touchFiring?'#8f2c1c':C.blood);px(c,fx,fy,fs,1,'#e2735a');px(c,fx,fy,1,fs,'#e2735a');px(c,fx,fy+fs-1,fs,1,'#6e2114');px(c,fx+fs-1,fy,1,fs,'#6e2114');
    cnText(c,melee?'挥击':weapon.semiAuto?'点射':'开火',fx+fs/2,fy+fs/2-6,10,'#fff2e6','center');
    uiHit(fx,fy,fs,fs,{down:()=>touchFireStart(),up:()=>touchFireEnd()});
    if(!melee){const rx=fx-4-34,ry=fy+fs-18;plate(c,rx,ry,34,18,C.plate);cnText(c,'换弹',rx+17,ry+4,9,C.text,'center');uiHit(rx,ry,34,18,{down:()=>reload()});}
    if(HUD.prompt&&playing){const ex=fx-4-34,ey=fy-8;plate(c,ex,ey,34,18,'#2b2814',C.brass,C.brassDim);cnText(c,'进入',ex+17,ey+4,9,C.brass,'center');uiHit(ex,ey,34,18,{down:()=>typeof usePortal==='function'&&usePortal()});}
  }

  // Mission board
  if(!playing)drawBoard(c,w,h);
  c.restore();
}

function wrapCn(c,text,size,maxWidth){
  const lines=[];let line='';
  for(const ch of text){if(cnWidth(c,line+ch,size,'normal')>maxWidth&&line){lines.push(line);line=ch;}else line+=ch;}
  if(line)lines.push(line);return lines;
}
function drawBoard(c,w,h){
  const C=UI_COLORS,p=HUD.panel;
  px(c,0,0,w,h,'rgba(11,12,9,.62)');
  const bw=250,copyLines=wrapCn(c,p.copy||'',9,bw-24),bh=124+copyLines.length*12,bx=Math.round(w/2-bw/2),by=Math.round(h/2-bh/2);
  plate(c,bx,by,bw,bh,C.plate);
  px(c,bx,by,bw,1,C.brass);
  px(c,bx+12,by+11,14,11,C.brass);pixelText(c,'LL',bx+13,by+13,1,C.ink,null);
  cnText(c,'死线突围',bx+30,by+10,10,C.text);pixelText(c,'LAST LIGHT',bx+30+cnWidth(c,'死线突围',10)+6,by+14,1,C.muted,null);
  cnText(c,p.tag||'',bx+12,by+30,9,C.brass);
  cnText(c,p.title||'',bx+12,by+42,14,'#f0ead0');
  let y=by+64;for(const line of copyLines){cnText(c,line,bx+12,y,9,'#b6b49b','left','normal');y+=12;}
  const btnW=100,btnH=20,btnX=bx+12,btnY=y+6;
  px(c,btnX-1,btnY-1,btnW+2,btnH+2,C.void);px(c,btnX,btnY,btnW,btnH,C.brass);px(c,btnX,btnY,btnW,1,'#f3d77e');px(c,btnX,btnY,1,btnH,'#f3d77e');px(c,btnX,btnY+btnH-1,btnW,1,'#8a6f2b');px(c,btnX+btnW-1,btnY,1,btnH,'#8a6f2b');px(c,btnX,btnY+btnH,btnW,2,'#6d571f');
  cnText(c,p.button||'开始生存',btnX+btnW/2-6,btnY+4,11,C.ink,'center','bold',null);pixelText(c,'>',btnX+btnW-14,btnY+7,1,C.ink,null);
  uiHit(btnX,btnY,btnW,btnH+2,{down:()=>state==='paused'?pauseGame():startGame()});
  const hint=uiTouch?'方向键移动 · 开火按钮自动瞄准 · 点按武器切换':(p.hint||'');
  cnText(c,hint,bx+12,btnY+btnH+9,9,C.muted,'left','normal');
  cnText(c,'最佳击杀',bx+bw-12-pixelTextWidth(String(best).padStart(3,'0'),2)-5,btnY+3,9,C.muted,'right','normal');
  pixelText(c,String(best).padStart(3,'0'),bx+bw-12,btnY,2,C.brass,C.void,'right');
}
