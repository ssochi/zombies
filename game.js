'use strict';

// All artwork is drawn at a native 330 px tall frame; the logical width follows the viewport aspect (640..1280) so fullscreen never letterboxes.
const canvas = document.getElementById('game');           // on-screen canvas at device resolution
const screenCtx = canvas.getContext('2d', { alpha: false });
const worldCanvas = document.createElement('canvas');      // logical 640..1280 x 330 frame, all world art
const ctx = worldCanvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;
// present() blits the world frame with nearest-neighbour scaling (view.k) into the screen canvas, then ui.js
// draws the interface on top at native resolution so text stays sharp on any monitor.
const view = { k: 1, ox: 0, oy: 0, dpr: 1, sw: 640, sh: 330 };
let W = 640;
const H = 330, PLAYER_SCALE = 1, WORLD_LENGTH = 6400;
const HORDE_TUNING={maxActive:14,maxWave:20,baseHp:8.5,hpPerWave:.35,maxHpBonus:3.5,bodyImpactCooldown:.32};
const EDGE_CAMERA={minZoom:.86,band:.18,maxLook:72,response:6};
const cameraView={zoom:1,look:0};
function cameraWidth(){return W/cameraView.zoom;}
function cameraRenderWidth(){return Math.ceil(W/EDGE_CAMERA.minZoom/32)*32;}
function cameraTop(){return H-H/cameraView.zoom;}
function screenToWorld(x,y){return{x:Math.round(viewX)+x/cameraView.zoom,y:cameraTop()+y/cameraView.zoom};}
function worldToScreen(x,y){return{x:(x-Math.round(viewX))*cameraView.zoom,y:(y-cameraTop())*cameraView.zoom};}
function syncPointerWorld(){if(!touchFiring){const p=screenToWorld(pointer.screenX,pointer.screenY);pointer.x=p.x;pointer.y=p.y;}}
function resetCameraView(){cameraView.zoom=1;cameraView.look=0;}
function updateEdgeCamera(dt){
  let strength=0,side=0;
  if(pointer.inside&&pointer.kind==='mouse'&&!touchFiring&&state==='playing'){
    const x=clamp(pointer.screenX/W,0,1),edge=Math.min(x,1-x);
    strength=smoothStep(1-edge/EDGE_CAMERA.band);side=x<.5?-1:1;
  }
  const minZoom=Math.min(1,Math.max(EDGE_CAMERA.minZoom,W/areaLength()));
  const target=1-(1-minZoom)*strength,blend=1-Math.exp(-EDGE_CAMERA.response*dt);
  cameraView.zoom=mix(cameraView.zoom,target,blend);
  cameraView.look=mix(cameraView.look,side*strength*Math.min(EDGE_CAMERA.maxLook,W*.1),blend);
  if(Math.abs(cameraView.zoom-target)<.0001)cameraView.zoom=target;
  if(Math.abs(cameraView.look)<.01&&strength===0)cameraView.look=0;
}
// Side-view actors share one human scale; lane depth must not shrink only the zombies.
const LANE_TOP = 246, LANE_BOTTOM = 312;
const ROUTE_START = 142, EXTRACTION_X = 6292, ROUTE_METERS = (EXTRACTION_X - ROUTE_START) / 10;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => min + Math.random() * (max - min);
// Dynamic logical width: W = round(H * viewportAspect) clamped to [640, 1280] and kept even, so a 16:9 or wider
// screen fills edge to edge while portrait phones keep the classic 640 frame (bars top/bottom).
function measureViewport(){
  // The page is canvas-only, so the window itself is the viewport.
  let w=NaN,h=NaN;
  const ok=(v)=>typeof v==='number'&&Number.isFinite(v)&&v>0;
  try{if(typeof window!=='undefined'){w=window.innerWidth;h=window.innerHeight;}}catch{}
  return ok(w)&&ok(h)?{w,h}:null;
}
function resizeGame(){
  const box=measureViewport();
  let width=640;
  if(box){width=Math.round(H*box.w/box.h);width=Math.max(640,Math.min(1280,width));width-=width%2;}
  if(width!==W||worldCanvas.width!==W||worldCanvas.height!==H){
    W=width;worldCanvas.width=W;worldCanvas.height=H;
    // Resizing the bitmap resets context state, so restore crisp pixel scaling.
    ctx.imageSmoothingEnabled=false;
    if(typeof setWorldWidth==='function')setWorldWidth(cameraRenderWidth());
  }
  let dpr=1;try{if(typeof window!=='undefined'&&Number.isFinite(window.devicePixelRatio))dpr=Math.min(3,Math.max(1,window.devicePixelRatio));}catch{}
  const sw=box?Math.max(1,Math.round(box.w*dpr)):W,sh=box?Math.max(1,Math.round(box.h*dpr)):H;
  if(canvas.width!==sw||canvas.height!==sh){canvas.width=sw;canvas.height=sh;}
  const k=Math.min(sw/W,sh/H);
  Object.assign(view,{k,dpr,sw,sh,ox:Math.round((sw-W*k)/2),oy:Math.round((sh-H*k)/2)});
  viewX=clampAreaCamera(viewX);
}
let seed = 42;
function seeded(min, max) { seed = (seed * 16807) % 2147483647; return min + (seed / 2147483647) * (max - min); }
function rect(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); }
function poly(c, points, color) { c.fillStyle = color; c.beginPath(); points.forEach(([x,y],i)=>i ? c.lineTo(Math.round(x),Math.round(y)) : c.moveTo(Math.round(x),Math.round(y))); c.closePath(); c.fill(); }
function limb(c, x1, y1, x2, y2, width, color) { c.save(); c.translate(Math.round(x1),Math.round(y1)); c.rotate(Math.atan2(y2-y1,x2-x1)); rect(c,0,-width/2,Math.hypot(x2-x1,y2-y1),width,color); c.restore(); }

const outfits = [
  {skin:'#8e9b6c',shade:'#727e53',shirt:'#3b3b30',pants:'#62643b',hair:'#8f3e17',blood:'#850f0b'},
  {skin:'#9b9e6c',shade:'#7f8456',shirt:'#233e45',pants:'#253b3d',hair:'#252720',blood:'#850e09'},
  {skin:'#8e9e76',shade:'#728365',shirt:'#c0b593',pants:'#20283a',hair:'#345c56',blood:'#91120e'},
  {skin:'#8d996b',shade:'#6d7c50',shirt:'#a85a1d',pants:'#464738',hair:'#b14512',blood:'#840f0c'},
  {skin:'#a0a16e',shade:'#7c8655',shirt:'#142b42',pants:'#9c9259',hair:'#24231c',blood:'#8a100c'},
  {skin:'#8c9976',shade:'#6d805b',shirt:'#686353',pants:'#703025',hair:'#943c20',blood:'#890d08'},
  {skin:'#929975',shade:'#727f59',shirt:'#242722',pants:'#354744',hair:'#9b581b',blood:'#7e0e08'},
  {skin:'#81976b',shade:'#657e53',shirt:'#345254',pants:'#34494a',hair:'#1c292b',blood:'#900f0b'}
];

const RELOAD_DURATION=1.85;
let selectedWeapon='rifle',weaponInventory={};
function getWeapon(){return weaponById(selectedWeapon);}
function getReloadDuration(){return getWeapon().reloadDuration;}
function resetArsenal(){weaponInventory={};for(const weapon of Object.values(WEAPONS))weaponInventory[weapon.id]={ammo:weapon.magSize,reserve:weapon.reserve};selectedWeapon='rifle';}
resetArsenal();
let viewX=0,furthestX=142,nextEncounterX=900,evacuation=false;
const claimedSupplyStops=new Set();
// ---- Areas -------------------------------------------------------------------------------------
// The road is one area; interiors (world.js INTERIORS) are others. Portals join them: a door on the road
// leads into a store, the store's exit leads back to the door. Every area keeps its own actors, corpses,
// blood and loot, so a cleared room stays cleared and the horde outside waits where you left it.
// Door positions come from world.js (WORLD_PORTALS) so they follow the landmark art; this is the fallback.
const ROAD_PORTALS_FALLBACK=[{x:1903,w:44,target:'store',targetX:110,label:'进入商店'}];
function roadPortals(){return typeof WORLD_PORTALS!=='undefined'&&Array.isArray(WORLD_PORTALS)&&WORLD_PORTALS.length?WORLD_PORTALS:ROAD_PORTALS_FALLBACK;}
let area='road',areaTransition=null;
const areaStates={};
function interiorDef(id){return HOUSE_ROOMS[id]||(typeof INTERIORS!=='undefined'&&INTERIORS&&INTERIORS[id])||null;}
function areaLength(){if(area==='road')return WORLD_LENGTH;const def=interiorDef(area);return def?def.length:640;}
function clampAreaCamera(x){const length=areaLength(),width=cameraWidth();return isHouseArea(area)&&length<width?(length-width)/2:clamp(x,0,Math.max(0,length-width));}
function areaPortals(){
  if(area==='road')return roadPortals();
  const def=interiorDef(area),back=areaStates[area]&&areaStates[area].returnX;
  const exits=def&&def.exits&&def.exits.length?def.exits:[{x:60,w:44,label:'离开'}];
  return exits.map(e=>({...e,target:e.target||'road',targetX:Number.isFinite(e.targetX)?e.targetX:Number.isFinite(back)?back:roadPortals()[0].x,label:e.kind==='barricade'&&houseState.doors.miller_utility?'进入洗衣维修间':e.kind==='window'&&houseState.shortcut?'穿过窗户':e.label}));
}
function nearPortal(){if(state!=='playing'||areaTransition||houseReading)return null;return areaPortals().filter(p=>Math.abs(player.x-p.x)<=p.w/2+12).sort((a,b)=>Math.abs(a.x-player.x)-Math.abs(b.x-player.x))[0]||null;}
function nearInteraction(){if(state!=='playing'||areaTransition||houseReading)return null;const portal=nearPortal(),clue=houseNearbyClue();if(clue&&(!portal||Math.abs(clue.x-player.x)<Math.abs(portal.x-player.x)))return {...clue,kind:'clue',label:'查看 · '+clue.title};return portal;}
function currentSector(){if(area==='road')return getWorldSector(player.x);const def=interiorDef(area);return def?{name:def.name,code:def.code}:{name:'室内',code:'--'};}
function saveArea(){areaStates[area]=Object.assign(areaStates[area]||{},{zombies,corpses,rigs,decals,pickups,particles,viewX,spawnLeft,spawnTimer,waveBreak,packLeft});}
function loadArea(id,x,returnX){
  let s=areaStates[id];
  if(!s){s={zombies:[],corpses:[],rigs:[],decals:[],pickups:[],particles:[],spawnLeft:0,spawnTimer:999,waveBreak:0,packLeft:0,viewX:0,seeded:false};areaStates[id]=s;}
  if(Number.isFinite(returnX))s.returnX=returnX;
  area=id;resetCameraView();zombies=s.zombies;corpses=s.corpses;rigs=s.rigs;decals=s.decals;pickups=s.pickups;particles=s.particles;bullets=[];resetSpecials();resetMelee();
  if(id==='road'){spawnLeft=s.spawnLeft;spawnTimer=s.spawnTimer;waveBreak=s.waveBreak;packLeft=s.packLeft;}else{spawnLeft=0;spawnTimer=999;waveBreak=0;}
  player.x=x;if(isHouseArea(id)){houseState.visited.add(id);player.y=292;player.face=1;}player.vx=0;player.vy=0;player.flinch=0;
  viewX=clampAreaCamera(player.x-cameraLead());syncPointerWorld();
  const def=interiorDef(id);
  if(def&&!s.seeded){
    s.seeded=true;
    for(const sp of def.spawns||[]){const z=addZombie(false,0,sp.kind);z.x=sp.x;z.y=clamp(sp.y,LANE_TOP,LANE_BOTTOM);if(Number.isFinite(sp.type))z.type=sp.type;if(isHouseArea(id)){z.houseResident=true;z.awake=Boolean(sp.awake);}z.pose=makeZombiePose(z);}
    for(const l of def.loot||[])pickups.push({x:l.x,y:l.y,type:l.type,amount:l.amount,life:1e9});
  }
  player.pose=makePlayerPose().pose;
}
function usePortal(){
  if(houseReading){houseCloseReading();return true;}
  const p=nearInteraction();if(!p)return false;
  if(p.kind==='clue'){houseReadClue(p.id);return true;}
  // A visible route cannot be used to escape an enemy already within striking distance.
  if((isHouseArea(area)||isHouseArea(p.target))&&zombies.some(z=>!z.dead&&!z.immobilized&&Math.hypot(z.x-player.x,z.y-player.y)<90)){
    announce(p.kind==='stairs'?'楼梯被阻挡 · 先拉开距离':'门口有危险 · 先拉开距离',1.6);sound('empty');return false;
  }
  const kind=p.kind||'door',duration=kind==='stairs'?1.2:kind==='ladder'?1.3:kind==='barricade'&&!houseState.doors[p.doorKey]?.9:.55;
  areaTransition={t:0,duration,kind,direction:p.direction||1,portalX:p.x,target:p.target,x:p.targetX,y:p.targetY,face:p.targetFace,returnX:area==='road'?player.x:null,switched:false,fromX:player.x,fromY:player.y,doorKey:p.doorKey,step:0};
  if(p.doorKey){houseState.doors[p.doorKey]=true;houseState.doorMotion={key:p.doorKey,progress:0};}
  if(kind==='window')houseState.shortcut=true;
  houseStopInput();resetMelee();reloadTime=0;sound(kind==='stairs'?'houseStep':kind==='barricade'?'houseDrag':'houseDoor');return true;
}
function updateAreaTransition(rawDt){
  const tr=areaTransition;if(!tr)return;tr.t+=rawDt;const progress=clamp(tr.t/tr.duration,0,1),half=progress<.5?progress*2:(progress-.5)*2;
  if(houseState.doorMotion)houseState.doorMotion.progress=Math.min(1,progress*2);
  if(!tr.switched&&progress>=.5){
    tr.switched=true;saveArea();loadArea(tr.target,tr.x,tr.returnX);if(Number.isFinite(tr.y))player.y=tr.y;if(tr.face)player.face=tr.face;
    announce(currentSector().name,2);
  }
  if(tr.kind==='stairs'){
    const up=tr.direction>0;
    if(!tr.switched){player.face=up?1:-1;player.x=tr.portalX+(up?90:-50)*half;player.y=tr.fromY+(up?-60:44)*half;}
    else{player.face=up?1:-1;player.x=tr.x+(up?-50:90)*(1-half);player.y=(tr.y||292)+(up?44:-60)*(1-half);}
    player.vx=player.face*48;player.walk+=rawDt*15;player.traversal={kind:'stairs',progress};
    const step=Math.floor(progress*6);if(step>tr.step){tr.step=step;sound('houseStep');}
  }else if(tr.kind==='ladder'){
    player.face=1;player.x=tr.switched?tr.x:mix(tr.fromX,tr.portalX,Math.min(1,half*3));
    player.y=tr.switched?mix(226,tr.y||292,half):tr.fromY+half*70;player.vx=16;player.walk+=rawDt*10;player.traversal={kind:'ladder',progress};
  }else{player.traversal={kind:'door',progress};player.vx=0;}
  viewX=clampAreaCamera(player.x-cameraLead());syncPointerWorld();player.pose=makePlayerPose().pose;
  if(progress>=1){player.x=tr.x;if(Number.isFinite(tr.y))player.y=tr.y;else player.y=clamp(player.y,LANE_TOP,LANE_BOTTOM);if(tr.face)player.face=tr.face;player.vx=player.vy=0;player.traversal=null;houseState.doorMotion=null;areaTransition=null;player.pose=makePlayerPose().pose;}
}
function switchWeapon(id){
  if(areaTransition||houseReading||!WEAPONS[id]||id===selectedWeapon||state==='over'||state==='won')return;
  weaponInventory[selectedWeapon]={ammo:player.ammo,reserve:player.reserve};selectedWeapon=id;
  player.ammo=weaponInventory[id].ammo;player.reserve=weaponInventory[id].reserve;
  reloadTime=0;reloadStage=0;muzzle=0;resetMelee();shotCooldown=Math.max(shotCooldown,.22);pointer.down=false;touchFiring=false;triggerLatched=false;
  player.kick=0;player.kickVelocity=0;player.climb=0;player.climbVelocity=0;player.heat=0;updateHUD();sound('rack');
}
function supplyAmmo(multiplier=1){
  for(const weapon of Object.values(WEAPONS)){if(weapon.melee)continue;const amount=Math.ceil(weapon.magSize*1.5*multiplier);if(weapon.id===selectedWeapon)player.reserve+=amount;else weaponInventory[weapon.id].reserve+=amount;}
}
function damagePlayer(amount,sourceX){
  if(player.inv>0||state!=='playing')return false;
  player.hp=Math.max(0,player.hp-amount);player.inv=.65;shake=Math.max(shake,3.2);cameraVX+=Math.sign(player.x-sourceX)*20;
  // Flinch spring: lean away from the hit, then critically damped recovery (characters.js reads player.flinch).
  player.flinch=Math.sign(player.x-sourceX)||1;player.flinchV=0;hurtFlash=.09;
  bloodBurst(player.x,player.y-75,Math.PI*.5,player.y,12,.9);sound('hurt');
  if(player.hp<=0){updateHUD();gameOver();}return true;
}
function specialAPI(){return {player,cameraLeft:viewX,cameraRight:viewX+cameraWidth(),damagePlayer,emit,dust,sound};}
function immobilized(z){return (limbDisabled(z,'leg','L')||limbDisabled(z,'leg','R'))&&(limbDisabled(z,'arm','L')||limbDisabled(z,'arm','R'));}
function refreshLimbState(z){
  const wasCrawling=z.crawling,legs=Number(limbDisabled(z,'leg','L'))+Number(limbDisabled(z,'leg','R'));
  z.baseSpeed??=z.speed;z.crawling=Boolean(z.missing.legL||z.missing.legR||legs===2);z.limping=legs===1&&!z.crawling;
  if(z.crawling&&!wasCrawling)z.crawlBlend=0;
  z.immobilized=immobilized(z);z.speed=z.baseSpeed*(z.crawling?.34:z.limping?.62:1);
  if(z.immobilized){z.attackTime=0;z.specialState='idle';z.specialTimer=0;}
}

const player={x:142,y:296,hp:100,ammo:WEAPONS.rifle.magSize,reserve:WEAPONS.rifle.reserve,stamina:100,walk:0,moving:false,face:1,inv:0,vx:0,vy:0,kick:0,kickVelocity:0,climb:0,climbVelocity:0,heat:0,smokeTimer:0,sprinting:false,flinch:0,flinchV:0};
let pointer={x:465,y:184,screenX:465,screenY:184,down:false,inside:false,kind:'mouse'};
let keys=new Set(),zombies=[],bullets=[],particles=[],corpses=[],pickups=[],touchFiring=false;
let meleeSwing=null,meleeComboStep=0,meleeComboTimer=0,triggerLatched=false;
let state='ready',lastTime=0,worldTime=0,elapsed=0,kills=0,wave=1,spawnLeft=0,spawnTimer=0,waveBreak=0;
let shotCooldown=0,reloadTime=0,shake=0,muzzle=0,noticeTime=0,hitMarker=0,hitStop=0,shotSerial=0,reloadStage=0;
let cameraX=0,cameraY=0,cameraVX=0,cameraVY=0,killFlash=0,headshotMarker=false;
// rawTime never stalls during hit-stop so screen shake keeps oscillating; slowMo is the wave-clear beat.
let rawTime=0,slowMo=0,hurtFlash=0,killFlashHead=false,lastKillTime=-9,killStreak=0,packLeft=0;
// KNOCKDOWN_ENABLED stays off while characters.js has no lying pose (original art style).
// HIT_STOP_ENABLED=false: hits and kills no longer freeze time (user found the stutter unpleasant).
const HIT_STOP_ENABLED=false,KNOCKDOWN_ENABLED=false,KNOCK_MAX=420,KNOCKDOWN_SPEED=300,AIR_GRAVITY=420,ATTACK_TOTAL=.72;
function cameraLead(){try{if(typeof window!=='undefined'&&window.matchMedia&&window.matchMedia('(max-width:600px)').matches)return Math.round(W*.17);}catch{}return Math.round(W*.23);}
let best=0,soundEnabled=true,audioCtx=null;
let stats={shots:0,hits:0,headshots:0,severed:0};
try{best=Number(localStorage.getItem('last-light-best'))||0;}catch{}
// All UI-facing state lives here; ui.js draws it inside the canvas (the page has no other DOM).
const HUD={prompt:'',mode:'等待部署',status:'向东突围 · 每个区域边界提供补给',waveStatus:'保持警戒',notice:'',killPulse:0,panel:{tag:'四个区域。一条撤离路线。',title:'穿过这片死地。',copy:'向东突围，沿途补给。注意疾行者、重装暴君与腐液。',button:'开始生存',hint:'WASD 移动 · 左键攻击 · 1–5 / Q 切换武器'}};
resizeGame();
if(typeof window!=='undefined'&&typeof window.addEventListener==='function'){window.addEventListener('resize',resizeGame);window.addEventListener('orientationchange',resizeGame);}
if(typeof document!=='undefined'&&typeof document.addEventListener==='function')document.addEventListener('fullscreenchange',()=>{resizeGame();if(typeof requestAnimationFrame==='function')requestAnimationFrame(resizeGame);});

function playerMuzzle(){
  const art=makePlayerPose(),g=art.gun,raw=g.face===1?g.angle:Math.PI-g.angle,angle=Math.atan2(Math.sin(raw),Math.cos(raw));
  return{x:g.origin.x+Math.cos(angle)*getWeapon().barrelLength*PLAYER_SCALE,y:g.origin.y+Math.sin(angle)*getWeapon().barrelLength*PLAYER_SCALE,angle,origin:g.origin};
}
function announce(message,duration=2){HUD.notice=message;noticeTime=duration;}
function addZombie(preview=false,index=0,forcedKind){
  const y=preview?LANE_TOP+(index%4)*17:rand(LANE_TOP,LANE_BOTTOM);
  const z={x:preview?384+Math.floor(index/4)*77+(index%4)*23:(wave>1&&Math.random()<.24?viewX-rand(35,95):viewX+cameraWidth()+rand(30,90)),y,type:preview?index%8:Math.floor(rand(0,8)),scale:PLAYER_SCALE,speed:preview?28:(rand(12,18)+wave*1.15)*2*1.18,phase:rand(0,TAU),hp:HORDE_TUNING.baseHp+Math.min(HORDE_TUNING.maxHpBonus,(wave-1)*HORDE_TUNING.hpPerWave),hit:0,attack:rand(.2,.7),attackTime:0,attackDone:false,face:-1,dead:false,missing:{},wounds:[],limbHits:{},crawling:false,flinch:0,flinchV:0,knockVX:0,knockVY:0,pose:null,
    // Crowd/hit-reaction fields read by characters.js (stagger, airY, climb, downed); pace replaces the shared hesitate sine.
    stagger:0,bodyImpactCooldown:0,airY:0,airVY:0,climb:0,climbT:0,climbCool:rand(0,.8),downed:0,pace:.73*rand(.8,1.2)};
  configureSpecial(z,forcedKind||(preview?(index===7?'brute':index===9?'spitter':index===3?'runner':'normal'):chooseZombieKind(wave,index||shotSerial+zombies.length)));z.immobilized=false;z.baseSpeed=z.speed;z.pose=makeZombiePose(z);zombies.push(z);return z;
}
for(let i=0;i<6;i++)addZombie(true,i);
player.pose=makePlayerPose().pose;
function saveBest(){if(kills>best){best=kills;try{localStorage.setItem('last-light-best',best);}catch{}}}
function beginWave(){spawnLeft=Math.min(HORDE_TUNING.maxWave,8+wave*2);spawnTimer=.1;packLeft=Math.floor(rand(2,4));waveBreak=0;shake=Math.max(shake,3.5);cameraVY-=70;announce(`第 ${String(wave).padStart(2,'0')} 波 · 尸潮来袭`,2.6);HUD.waveStatus='尸潮来袭';}
function startGame(){
  resizeGame();initAudio();resetArsenal();resetSpecials();resetHouse();player.traversal=null;resetCameraView();area='road';areaTransition=null;for(const k of Object.keys(areaStates))delete areaStates[k];viewX=0;furthestX=142;nextEncounterX=900;evacuation=false;claimedSupplyStops.clear();Object.assign(player,{x:142,y:296,hp:100,ammo:WEAPONS.rifle.magSize,reserve:WEAPONS.rifle.reserve,stamina:100,walk:0,moving:false,face:1,inv:0,vx:0,vy:0,kick:0,kickVelocity:0,climb:0,climbVelocity:0,heat:0,smokeTimer:0,sprinting:false});
  keys.clear();pointer.down=false;touchFiring=false;triggerLatched=false;zombies=[];bullets=[];particles=[];corpses=[];pickups=[];rigs=[];decals=[];physicsAccumulator=0;
  elapsed=0;kills=0;wave=1;resetMelee();triggerLatched=false;shotCooldown=0;reloadTime=0;shake=0;hitStop=0;muzzle=0;shotSerial=0;cameraX=cameraY=cameraVX=cameraVY=0;killFlash=0;slowMo=0;hurtFlash=0;lastKillTime=-9;killStreak=0;
  stats={shots:0,hits:0,headshots:0,severed:0};
  player.ammo=getWeapon().magSize;player.reserve=getWeapon().reserve;state='playing';HUD.mode='战区实时';HUD.status='向东突围 → · 1–5 切换武器 · 断脚＋断手可定身';
  beginWave();for(let i=0;i<3;i++){const z=addZombie(false,i,i===2?'runner':'normal');z.x=455+i*85+(i%2)*18;z.pose=makeZombiePose(z);spawnLeft--;}
  player.pose=makePlayerPose().pose;updateHUD();canvas.focus({preventScroll:true});
}
function pauseGame(){
  if(state==='ready'||state==='over'||state==='won')return;pointer.down=false;touchFiring=false;triggerLatched=false;keys.clear();
  if(state==='playing'){
    state='paused';Object.assign(HUD.panel,{tag:'喘口气，检查弹匣。',title:'行动已暂停',copy:'战区已冻结。准备好后，继续守住公路。',button:'继续行动',hint:'按 ESC 或点击继续'});HUD.mode='行动暂停';
  }else{
    state='playing';HUD.mode='战区实时';canvas.focus({preventScroll:true});
  }
}
function gameOver(){state='over';pointer.down=false;touchFiring=false;triggerLatched=false;keys.clear();saveBest();Object.assign(HUD.panel,{tag:'信号丢失 · 行动结束',title:'这一枪，还不算终点。',copy:`坚持 ${formatTime(elapsed)} · 击杀 ${kills} · 爆头 ${stats.headshots} · 断肢 ${stats.severed}`,button:'再次突围',hint:`最佳纪录 ${best} 击杀 · 按 ENTER 重新开始`});HUD.mode='信号丢失';HUD.status='行动结束。整装，再次出发。';}
function reload(automatic=false){
  if(areaTransition||houseReading||state!=='playing'||getWeapon().melee||reloadTime>0||player.ammo===getWeapon().magSize)return;
  if(player.reserve<=0){if(shotCooldown<=0){announce('弹药不足 · 寻找补给',1.5);sound('empty');shotCooldown=.5;}return;}
  reloadTime=getReloadDuration();reloadStage=0;if(!automatic)pointer.down=false;sound('reload');
}
function shoot(){
  if(areaTransition||houseReading)return;
  if(state!=='playing'||shotCooldown>0||reloadTime>0)return;
  const w=getWeapon();if(w.melee){beginMelee();return;}
  if(w.semiAuto&&triggerLatched)return;
  if(player.ammo<=0){reload(true);return;}
  triggerLatched=true;const m=playerMuzzle();player.ammo--;shotCooldown=w.fireInterval;muzzle=w.muzzleLife;shotSerial++;stats.shots++;
  const spread=(player.sprinting?w.sprintSpread:player.moving?w.movingSpread:w.spread)+player.heat*w.heatSpread;
  for(let i=0;i<w.pellets;i++){
    const offset=w.pellets>1?((i/(w.pellets-1)-.5)*2*spread+rand(-spread*.14,spread*.14)):rand(-spread,spread),angle=m.angle+offset;
    bullets.push({x:m.x,y:m.y,px:m.origin.x,py:m.origin.y,vx:Math.cos(angle)*w.projectileSpeed,vy:Math.sin(angle)*w.projectileSpeed,damage:w.damage,weaponId:w.id,shotId:shotSerial,life:w.range/w.projectileSpeed,first:true});
    // One ghost streak per round at the muzzle (not per frame) so the SMG cannot flood the particle budget.
    emit({kind:'tracerGhost',x:m.x+Math.cos(angle)*18,y:m.y+Math.sin(angle)*18,vx:0,vy:0,direction:angle,length:40,life:.08,size:1,color:'#efcf7b'});
  }
  // A same-frame kick makes every shot readable; the springs then absorb the impact.
  player.kick=Math.min(w.maxKick,player.kick+w.kickSnap);player.kickVelocity=Math.min(w.kickImpulse*1.35,player.kickVelocity+w.kickImpulse);
  player.climb=Math.min(w.maxClimb,player.climb+w.climbSnap);player.climbVelocity=Math.min(w.climbImpulse*1.5,player.climbVelocity+w.climbImpulse);
  player.heat=Math.min(1,player.heat+w.heatPerShot);hitStop=Math.max(hitStop,w.shotStop);
  cameraX=clamp(cameraX-Math.cos(m.angle)*w.cameraSnap,-6,6);cameraY=clamp(cameraY-w.cameraSnap*.3,-4,4);
  cameraVX-=Math.cos(m.angle)*w.cameraKick;cameraVY-=Math.sin(m.angle)*8+4;shake=Math.max(shake,w.shake);
  houseWakeEnemies();muzzleEffects(m);sound(w.shotSound);if(player.ammo===0)reload(true);
}
function resetMelee(){meleeSwing=null;meleeComboStep=0;meleeComboTimer=0;}
function beginMelee(){
  const w=getWeapon();if(meleeSwing||shotCooldown>0)return;
  if(meleeComboTimer<=0)meleeComboStep=0;
  const move=MELEE_MOVES[meleeComboStep%MELEE_MOVES.length];
  if(player.stamina<move.stamina){shotCooldown=.2;announce('体力不足 · 拉开距离恢复',.8);sound('empty');return;}
  const shoulder=makePlayerPose().pose.shoulder;
  player.stamina-=move.stamina;shotCooldown=move.duration+.08;shotSerial++;stats.shots++;
  meleeSwing={moveId:move.id,duration:move.duration,elapsed:0,angle:Math.atan2(pointer.y-shoulder.y,pointer.x-shoulder.x),face:player.face,hits:new Set(),shotId:shotSerial,trail:[],impactHold:0,impactUsed:false,whoosh:false};
  meleeComboStep=(meleeComboStep+1)%MELEE_MOVES.length;meleeComboTimer=move.duration+.65;
}
function updateMelee(dt,rawDt=dt){
  meleeComboTimer=Math.max(0,meleeComboTimer-rawDt);
  if(!meleeSwing)return;
  const swing=meleeSwing,w=getWeapon(),move=meleeMove(swing.moveId);
  swing.trail=swing.trail.filter(p=>(p.life-=rawDt)>0);
  // Contact resistance affects only the wielder's action; the world keeps moving.
  if(swing.impactHold>0){swing.impactHold=Math.max(0,swing.impactHold-rawDt);player.pose=makePlayerPose().pose;return;}
  const old=swing.elapsed,next=Math.min(move.duration,old+dt),steps=Math.max(1,Math.ceil((next-old)/.006));let stopped=false;
  for(let i=1;i<=steps;i++){
    swing.elapsed=mix(old,next,i/steps);const phase=swing.elapsed/move.duration;
    if(!swing.whoosh&&phase>=move.activeStart){sound(move.twoHand?'heavySwing':'swing');swing.whoosh=true;}
    if(phase<move.activeStart||phase>move.activeEnd)continue;
    const g=makePlayerPose().gun,angle=g.face===1?g.angle:Math.PI-g.angle;
    const tip={x:g.origin.x+Math.cos(angle)*(w.barrelLength+9)*PLAYER_SCALE,y:g.origin.y+Math.sin(angle)*(w.barrelLength+9)*PLAYER_SCALE};
    swing.trail.push({tip,base:pointMix(g.origin,tip,.60),life:.075});if(swing.trail.length>14)swing.trail.shift();
    if(swing.hits.size>=w.maxTargets)continue;
    const contacts=[];
    for(const z of zombies){
      if(z.dead||swing.hits.has(z)||swing.face*(z.x-player.x)<-8||Math.abs(z.y-player.y)>32||Math.abs(z.x-player.x)>w.range+20)continue;
      let best=null,tBest=Infinity;
      for(const shape of hitShapes(z)){const t=rayCapsule(g.origin,tip,{...shape,r:shape.r+4});if(t<tBest){best=shape;tBest=t;}}
      if(best)contacts.push({z,part:best.part,t:tBest,point:pointMix(g.origin,tip,tBest)});
    }
    contacts.sort((a,b)=>a.t-b.t);
    for(const contact of contacts){
      if(swing.hits.size>=w.maxTargets)break;swing.hits.add(contact.z);
      const z=contact.z,brute=z.kind==='brute',direction=Math.atan2(Math.sin(angle)*.45,swing.face);
      hitZombie(z,contact.part,contact.point,{vx:Math.cos(direction)*100,vy:Math.sin(direction)*100,damage:w.damage*move.damage,weaponId:w.id,shotId:swing.shotId});
      z.knockVX=clamp(z.knockVX+swing.face*move.impulse*(brute?.32:1),-KNOCK_MAX,KNOCK_MAX);
      if(!brute&&!z.dead&&z.airY<=0)z.airVY=Math.max(z.airVY,move.lift);
      for(let n=0;n<(move.twoHand?8:5);n++){const a=direction+rand(-.8,.8),v=rand(45,115);emit({kind:'impact',x:contact.point.x,y:contact.point.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-12,life:rand(.05,.11),size:rand(1,2),color:n%2?'#b5aa87':'#e6d4a5',drag:7});}
      if(!swing.impactUsed){
        swing.impactUsed=true;swing.impactHold=move.hitPause;stopped=true;
        cameraVX-=swing.face*w.cameraKick*(move.twoHand?1.5:1);cameraVY+=move.twoHand?18:-5;
        shake=Math.max(shake,w.shake*(move.twoHand?1.25:.8));dust(player.x,player.y,move.twoHand?5:2);
        if(move.twoHand)sound('meleeHeavy');
      }
    }
    if(stopped)break;
  }
  if(!stopped)swing.elapsed=next;
  player.pose=makePlayerPose().pose;
  if(swing.elapsed>=move.duration)meleeSwing=null;
}
function drawMeleeTrail(c){
  if(!meleeSwing||meleeSwing.trail.length<2)return;
  const trail=meleeSwing.trail;c.save();
  for(let i=1;i<trail.length;i++){
    const a=trail[i-1],b=trail[i];c.globalAlpha=Math.min(a.life,b.life)/.075*.25;
    poly(c,[[a.base.x,a.base.y],[a.tip.x,a.tip.y],[b.tip.x,b.tip.y],[b.base.x,b.base.y]],'#c8c2a7');
    c.globalAlpha*=1.5;bone(c,a.tip,b.tip,1,'#e4dbb7');
  }
  c.restore();
}
const KILL_LAUNCH={rifle:1.6,smg:1.2,pistol:2.2,shotgun:2.8,crowbar:3.2};
function killZombie(z,part,dir,weaponId=z.lastWeaponId){
  if(z.dead)return;z.dead=true;
  const w=weaponById(weaponId),head=part==='head'&&!z.missing.head,headPoint={x:z.pose.head.x,y:z.pose.head.y},brute=z.kind==='brute';
  if(head){sever(z,'head',dir);stats.headshots++;stats.severed++;textParticle(headPoint.x,headPoint.y-14,'HEADSHOT');}
  // Special deaths (brute dismemberment, spitter acid burst) live in specials.js; they may override the punch numbers.
  const special=typeof onSpecialDeath==='function'?onSpecialDeath(z,{...specialAPI(),dir,part,bloodBurst,sever,textParticle,addDecal,headPoint}):null;
  makeRig(z,'body',dir,(KILL_LAUNCH[w.id]||1.6)+(head?.5:0));
  if(head)bloodBurst(headPoint.x,headPoint.y,dir,z.y,40,1.6,{up:rand(40,110),chunks:true});
  kills++;saveBest();
  hitStop=Math.max(hitStop,special&&special.hitStop||(head?.11:.07));killFlash=special&&special.killFlash||(head?.22:.15);killFlashHead=head;
  shake=Math.max(shake,special&&special.shake||(brute?3.8:head?2.6:1.8));
  // Kill streak: chained kills within 1.4 s stack a counter over the body.
  killStreak=elapsed-lastKillTime<1.4?killStreak+1:1;lastKillTime=elapsed;
  if(killStreak>=2)textParticle(headPoint.x,headPoint.y-26,`x${killStreak}`,killStreak>=5?'#ff7a4a':'#ffd58a',9+Math.min(4,killStreak));
  HUD.killPulse=.16;
  if(kills%5===0)pickups.push({x:clamp(z.x,22,areaLength()-22),y:z.y,type:kills%10===0?'health':'ammo',life:25});
  // Last body of a wave: brief slow motion (separate from hit-stop) so the final fling plays out.
  if(spawnLeft<=0&&zombies.every(o=>o.dead)){slowMo=.9;killFlash=Math.max(killFlash,.3);shake=Math.max(shake,3);}
}
function hitZombie(z,part,point,bullet){
  if(z.houseResident)z.awake=true;
  const dir=Math.atan2(bullet.vy,bullet.vx),damage=bullet.damage??1,w=weaponById(bullet.weaponId),brute=z.kind==='brute';stats.hits++;z.lastWeaponId=w.id;z.hit=brute?.12:.16;hitMarker=.17;headshotMarker=part==='head';
  const mass=brute?.28:z.kind==='runner'?.68:.58,pellet=w.pellets>1,limbPart=/^(forearm|arm|shin|leg)[LR]$/.test(part),heavy=w.melee||w.id==='shotgun';
  z.flinch=clamp(z.flinch+Math.cos(dir)*(pellet?.07:.18)*mass,-1.1,1.1);
  z.flinchV=clamp(z.flinchV+Math.cos(dir)*(pellet?11:30)*mass,-38,38);
  // Body impacts still flinch visually, but automatic fire cannot refresh a full stun on every bullet.
  const lightBody=!heavy&&part==='body',react=!lightBody||(z.bodyImpactCooldown||0)<=0;
  if(react){
    const impulse=w.impactImpulse*mass*(lightBody?.4:1);
    z.knockVX=clamp(z.knockVX+Math.cos(dir)*impulse,-KNOCK_MAX,KNOCK_MAX);z.knockVY+=Math.sin(dir)*5*mass;
    z.stagger=Math.max(z.stagger||0,heavy||part==='head'?.35:lightBody?.06:.15);
    if(lightBody)z.bodyImpactCooldown=HORDE_TUNING.bodyImpactCooldown;
  }
  if(heavy&&!brute&&(z.airY||0)<=0&&(z.airVY||0)<=0)z.airVY=rand(70,100);
  if(heavy||part==='head'){z.attackTime=0;z.attack=Math.max(z.attack,brute?.16:.34);}hitStop=Math.max(hitStop,w.impactStop);
  if(z.lastImpactShot!==bullet.shotId||bullet.shotId===undefined){sound(w.melee?'meleeHit':part==='head'?'headshot':'hit',z.x);z.lastImpactShot=bullet.shotId;}
  bloodBurst(point.x,point.y,dir,z.y,pellet?7:part==='head'?23:14,pellet?1.45:1.15);
  impactFragments(z,point,dir,part);
  const hpBefore=z.hp;
  if(part==='head'){z.hp-=damage*(z.headDamageMultiplier??3)*(w.headshotScale||1);z.headTrauma=(z.headTrauma||0)+damage;}
  else if(limbPart){
    z.limbHits[part]=(z.limbHits[part]||0)+damage*(w.melee?1.2:1);z.hp-=damage*.33;
    if(!z.missing[part]&&z.limbHits[part]>=limbThreshold(z,part)){sever(z,part,dir);stats.severed++;z.stagger=Math.max(z.stagger,.35);hitStop=Math.max(hitStop,.018);if(/^(leg|shin)/.test(part))textParticle(point.x,point.y-8,'CRIPPLED','#d6bd86');}
    refreshLimbState(z);
  }else{z.hp-=damage*(z.bodyDamageMultiplier??1);const torso=pointMix(z.pose.shoulder,z.pose.hip,.5);z.wounds.push({x:clamp((point.x-torso.x)/z.scale*z.face,-6,5),t:clamp((point.y-z.pose.shoulder.y)/(z.pose.hip.y-z.pose.shoulder.y||1),.15,.85),size:rand(3,6)});if(z.wounds.length>5)z.wounds.shift();hitStop=Math.max(hitStop,.013);}
  // Damage numbers use tenths of HP; headshots remain a clearly stronger response.
  textParticle(point.x,point.y-6,String(Math.max(1,Math.round((hpBefore-z.hp)*10))),part==='head'?'#ffcf6b':limbPart?'#d6bd86':'#f0e6c8',7);
  z.immobilized=immobilized(z);
  if(z.hp<=0)killZombie(z,part,dir,w.id);
  // Non-lethal knockdown: a hard shove floors anything but a brute for .9 s (still hittable while down).
  else if(KNOCKDOWN_ENABLED&&!brute&&Math.abs(z.knockVX)>KNOCKDOWN_SPEED&&(z.downed||0)<=0){z.downed=.9;z.stagger=0;hitStop=Math.max(hitStop,.05);}
}
function textWidth(t){try{const m=ctx.measureText(t);return m&&Number.isFinite(m.width)?m.width:t.length*5.5;}catch{return t.length*5.5;}}
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
// The HUD is drawn by ui.js straight from game state (player, kills, wave, elapsed, HUD, ...); nothing to sync here.
function updateHUD(){}
function victory(){
  state='won';pointer.down=false;touchFiring=false;triggerLatched=false;keys.clear();saveBest();
  Object.assign(HUD.panel,{tag:'撤离信号确认 · 行动完成',title:'你穿过了死线。',copy:`穿越四个区域 · 击杀 ${kills} · 用时 ${formatTime(elapsed)}`,button:'再次出发',hint:'按 ENTER 重新开始'});HUD.mode='撤离成功';
}
function updateJourney(){
  for(const stop of [1480,3010,4660])if(player.x>=stop&&!claimedSupplyStops.has(stop)){
    claimedSupplyStops.add(stop);supplyAmmo(2);player.hp=Math.min(100,player.hp+25);announce(`${getWorldSector(stop+50).name} · 补给已获取`,2.7);sound('pickup');
  }
  if(!evacuation&&furthestX>nextEncounterX){wave++;spawnLeft=Math.min(HORDE_TUNING.maxWave,spawnLeft+3+Math.min(Math.ceil(wave/2),3));waveBreak=0;nextEncounterX+=750;spawnTimer=.2;HUD.waveStatus='增援逼近';announce('前方出现新的尸群',2);}
  if(!evacuation&&player.x>=EXTRACTION_X){evacuation=true;spawnLeft=Math.min(spawnLeft,5);announce('抵达撤离点 · 清空最后尸群',3);}
  if(evacuation&&!spawnLeft&&!zombies.length)victory();
}
// Exact critically damped spring: recoil recovery is consistent at 30/60/120 Hz.
function springStep(position,velocity,frequency,dt){const j=velocity+frequency*position,e=Math.exp(-frequency*dt);return [(position+j*dt)*e,(velocity-frequency*j*dt)*e];}
let hudAccumulator=0;
function updatePlayer(dt,recoilDt=dt){
  let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  const p=player;p.sprinting=keys.has('shift')&&p.stamina>1&&Boolean(dx||dy);const speed=p.sprinting?106:64;
  p.stamina=clamp(p.stamina+(p.sprinting?-32:19)*dt,0,100);if(dx&&dy){dx*=.707;dy*=.707;}
  const response=1-Math.exp(-17*dt);p.vx=mix(p.vx,dx*speed,response);p.vy=mix(p.vy,dy*speed*.68,response);
  p.x=clamp(p.x+p.vx*dt,24,areaLength()-30);p.y=clamp(p.y+p.vy*dt,LANE_TOP,LANE_BOTTOM+2);p.moving=Math.hypot(p.vx,p.vy)>3;
  const previousStep=Math.floor(p.walk/Math.PI);p.walk+=Math.hypot(p.vx,p.vy)*dt/79*TAU*(p.vx*p.face<-.1?-1:1);
  if(Math.floor(p.walk/Math.PI)!==previousStep&&p.moving){dust(p.x,p.y+1,p.sprinting?4:2);sound('step');}
  if(area==='road')furthestX=Math.max(furthestX,p.x);
  updateEdgeCamera(recoilDt);
  const cameraTarget=clampAreaCamera(p.x-cameraLead()/cameraView.zoom+cameraView.look);
  viewX=clampAreaCamera(mix(viewX,cameraTarget,1-Math.exp(-7*recoilDt)));syncPointerWorld();
  [p.flinch,p.flinchV]=springStep(p.flinch,p.flinchV,14,dt);if(Math.abs(p.flinch)<.002)p.flinch=0;
  if(meleeSwing)p.face=meleeSwing.face;else if(Math.abs(pointer.x-p.x)>5)p.face=pointer.x>=p.x?1:-1;
  const weapon=getWeapon();
  [p.kick,p.kickVelocity]=springStep(p.kick,p.kickVelocity,weapon.kickSpring,recoilDt);
  p.kick=Math.min(p.kick,weapon.maxKick);
  [p.climb,p.climbVelocity]=springStep(p.climb,p.climbVelocity,weapon.climbSpring,recoilDt);
  p.climb=Math.min(p.climb,weapon.maxClimb);
  p.heat=Math.max(0,p.heat-dt*.42);
  p.smokeTimer-=dt;if(p.heat>.5&&p.smokeTimer<=0&&shotCooldown<.05){p.smokeTimer=.11;const m=playerMuzzle();emit({kind:'smoke',x:m.x,y:m.y,vx:rand(-2,4),vy:-rand(7,12),life:.45,size:1.4,color:'#b2b19a',drag:2});}
  p.pose=makePlayerPose().pose;
}
const DOWNED_SPECIAL={movementMultiplier:0,suppressMelee:true};
function separateZombies(dt){
  // Soft body separation keeps a horde from collapsing into one silhouette; climbers are allowed to overlap.
  for(let i=0;i<zombies.length;i++){
    const a=zombies[i];if(a.dead||a.climb>0)continue;
    for(let j=i+1;j<zombies.length;j++){
      const b=zombies[j];if(b.dead||b.climb>0)continue;
      const dx=b.x-a.x,dy=b.y-a.y,reach=6*(a.scale+b.scale);
      if(Math.abs(dx)>=reach||Math.abs(dy)>=6)continue;
      const dir=dx>0?1:dx<0?-1:(i&1?1:-1),push=24*dt*(1-Math.abs(dx)/reach);
      if(!a.immobilized&&a.downed<=0)a.x-=dir*push;
      if(!b.immobilized&&b.downed<=0)b.x+=dir*push;
    }
  }
}
function blockedAhead(z){
  for(const o of zombies){
    if(o===z||o.dead||o.downed>0)continue;
    const gap=(o.x-z.x)*z.face;
    if(gap>1&&gap<14&&Math.abs(o.y-z.y)<8)return true;
  }
  return false;
}
function updateZombies(dt){
  for(const z of zombies){
    z.bodyImpactCooldown=Math.max(0,(z.bodyImpactCooldown||0)-dt);z.hit=Math.max(0,z.hit-dt);z.attack=Math.max(0,z.attack-dt);z.stagger=Math.max(0,(z.stagger||0)-dt);z.downed=Math.max(0,(z.downed||0)-dt);
    z.flinchV+=(-z.flinch*110-z.flinchV*14)*dt;z.flinch+=z.flinchV*dt;
    z.x+=z.knockVX*dt;z.y=clamp(z.y+z.knockVY*dt,LANE_TOP-6,LANE_BOTTOM+4);z.knockVX*=Math.exp(-6*dt);z.knockVY*=Math.exp(-6*dt);
    // Vertical hop from heavy hits: a simple parabola above the lane, dust on landing.
    if(z.airY>0||z.airVY>0){z.airY+=z.airVY*dt;z.airVY-=AIR_GRAVITY*dt;if(z.airY<=0){z.airY=0;z.airVY=0;dust(z.x,z.y,6);}}
    const ex=player.x-z.x,ey=player.y-z.y,dist=Math.hypot(ex,ey);z.face=ex>=0?1:-1;
    if(z.houseResident&&!z.awake){if(dist<260)z.awake=true;else{z.phase+=dt*.5;z.pose=makeZombiePose(z);continue;}}
    z.immobilized=immobilized(z);const down=z.downed>0,special=down?DOWNED_SPECIAL:updateSpecial(z,dt,specialAPI());if(state!=='playing')return;let movement=0;
    const canMove=!z.immobilized&&!down&&z.stagger<=0&&dist>22&&z.attackTime<=0;
    if(canMove){
      // Fake climb-over: blocked by the zombie ahead → rise over .4 s, hold, drop with dust.
      z.climbCool=Math.max(0,z.climbCool-dt);
      if(z.climbT<=0&&z.climbCool<=0&&!z.crawling&&blockedAhead(z))z.climbT=1e-6;
      const speed=z.speed*(z.pace||.73)*(z.hit>0?.68:1)*(special.movementMultiplier??1)*(z.climb>0?.75:1);
      z.x+=ex/dist*speed*dt;z.y+=ey/dist*speed*.6*dt;movement=speed;
    }
    if(z.climbT>0){
      z.climbT+=dt;
      z.climb=z.climbT<.4?z.climbT/.4:z.climbT<.6?1:Math.max(0,1-(z.climbT-.6)/.2);
      if(z.climbT>=.8){z.climb=0;z.climbT=0;z.climbCool=rand(.9,1.6);dust(z.x,z.y,3);}
    }else z.climb=0;
    const oldStep=Math.floor(z.phase/Math.PI);
    z.phase+=movement*dt/(z.crawling?38:62)*TAU;
    if(Math.floor(z.phase/Math.PI)!==oldStep&&z.x>viewX&&z.x<viewX+cameraWidth()) dust(z.x,z.y,1);
    if(!special.suppressMelee&&dist<33&&Math.abs(ey)<18&&z.attack<=0&&z.attackTime<=0){z.attackTime=ATTACK_TOTAL;z.attackDone=false;z.attack=1.05;}
    // Attack timeline (shared with characters.js): wind-up >.42, lunge at .42, damage at .30, recovery to 0.
    if(z.attackTime>0&&!down){
      const before=z.attackTime;z.attackTime=Math.max(0,z.attackTime-dt);
      if(before>.42&&z.attackTime<=.42&&!z.immobilized)z.x+=z.face*20;
      if(before>.30&&z.attackTime<=.30&&!z.attackDone){
        z.attackDone=true;
        if(Math.hypot(player.x-z.x,player.y-z.y)<36&&player.inv<=0){
          const arms=Number(limbDisabled(z,'arm','L'))+Number(limbDisabled(z,'arm','R'));const damage=arms===2?10:arms===1?17:25;
          damagePlayer(damage,z.x);if(state!=='playing')return;
        }
      }
    }
    // A short transition prevents a severed leg from teleporting the torso down.
    const next=makeZombiePose(z);
    if(z.crawling&&z.crawlBlend<1){z.crawlBlend=Math.min(1,z.crawlBlend+dt*4);for(const name of Object.keys(next))next[name]=pointMix(z.pose[name],next[name],1-Math.exp(-11*dt));}
    z.pose=next;
  }
  separateZombies(dt);
}
function updateBullets(dt){
  for(const b of bullets){
    if(!b.first){b.px=b.x;b.py=b.y;}b.first=false;b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    const a={x:b.px,y:b.py},end={x:b.x,y:b.y};let nearest=null,nearestT=Infinity;
    for(const z of zombies){if(z.dead||Math.abs(z.x-b.x)>Math.abs(b.x-b.px)+100)continue;
      for(const shape of hitShapes(z)){const t=rayCapsule(a,end,shape);if(t<nearestT){nearestT=t;nearest={z,part:shape.part};}}
    }
    if(nearest){const point=pointMix(a,end,nearestT);b.x=point.x;b.y=point.y;hitZombie(nearest.z,nearest.part,point,b);b.life=0;}
    else if(b.y>H-9&&b.vy>60){dust(b.x,b.y,4);b.life=0;}
  }
  zombies=zombies.filter(z=>!z.dead);bullets=bullets.filter(b=>b.life>0&&b.x>viewX-100&&b.x<viewX+cameraWidth()+100&&b.y>-20&&b.y<H+20);
}
function update(rawDt){
  if(state==='ready'){worldTime+=rawDt;for(const z of zombies){z.phase+=rawDt*.75;z.pose=makeZombiePose(z);}return;}
  if(state!=='playing'||houseReading)return;
  let dt=rawDt;if(hitStop>0){hitStop=Math.max(0,hitStop-rawDt);if(HIT_STOP_ENABLED)dt*=.12;}
  if(slowMo>0){slowMo=Math.max(0,slowMo-rawDt);dt*=.25;}
  if(areaTransition){worldTime+=rawDt;rawTime+=rawDt;elapsed+=rawDt;updateAreaTransition(rawDt);return;}updateHouseAmbience(rawDt);
  elapsed+=rawDt;rawTime+=rawDt;worldTime+=dt;shotCooldown=Math.max(0,shotCooldown-rawDt);muzzle=Math.max(0,muzzle-rawDt);hitMarker=Math.max(0,hitMarker-rawDt);killFlash=Math.max(0,killFlash-rawDt);hurtFlash=Math.max(0,hurtFlash-rawDt);
  shake=Math.max(0,shake-rawDt*11);player.inv=Math.max(0,player.inv-dt);
  cameraVX+=(-cameraX*150-cameraVX*20)*rawDt;cameraVY+=(-cameraY*150-cameraVY*20)*rawDt;cameraX+=cameraVX*rawDt;cameraY+=cameraVY*rawDt;
  if(noticeTime>0){noticeTime-=rawDt;if(noticeTime<=0)HUD.notice='';}
  HUD.killPulse=Math.max(0,HUD.killPulse-rawDt);
  if(reloadTime>0){
    reloadTime=Math.max(0,reloadTime-rawDt);const progress=1-reloadTime/getReloadDuration();
    if(progress>.23&&reloadStage===0){reloadStage=1;const g=makePlayerPose().gun;emit({kind:getWeapon().id==='shotgun'?'shell':'magazine',x:g.origin.x+player.face*22,y:g.origin.y+15,vx:-player.face*15,vy:15,life:5,size:4,color:'#343b2e',spin:3,gravity:220,floor:player.y+2});sound('reload');}
    if(progress>.69&&reloadStage===1){reloadStage=2;sound('reload');}
    if(progress>.9&&reloadStage===2){reloadStage=3;sound('rack');}
    if(reloadTime<=0){const n=Math.min(getWeapon().magSize-player.ammo,player.reserve);player.ammo+=n;player.reserve-=n;}
  }
  if(touchFiring){let nearest=null,bestDistance=Infinity;for(const z of zombies){const d=Math.hypot(z.x-player.x,z.y-player.y);if(d<bestDistance){nearest=z;bestDistance=d;}}if(nearest){pointer.x=nearest.pose.shoulder.x;pointer.y=(nearest.pose.shoulder.y+nearest.pose.hip.y)/2;}pointer.down=true;}
  updatePlayer(dt,rawDt);if(pointer.down)shoot();updateMelee(dt,rawDt);
  // Fewer, tougher enemies arrive in groups of 2-3; later waves stay bounded.
  if(area==='road'&&spawnLeft>0&&zombies.length<HORDE_TUNING.maxActive){spawnTimer-=dt;if(spawnTimer<=0){
    const z=addZombie();spawnLeft--;
    if(z.kind==='brute'){shake=Math.max(shake,3.5);cameraVY-=70;sound('growl',z.x);}
    if(packLeft>1){packLeft--;spawnTimer=.24;}else{packLeft=Math.floor(rand(2,4));spawnTimer=rand(3,4.2)-Math.min(.6,wave*.06);}
  }}
  updateZombies(dt);if(state!=='playing')return;updateBullets(dt);updateEffects(dt);updateHostileProjectiles(dt,specialAPI());if(state!=='playing')return;
  zombies=zombies.filter(z=>Math.abs(z.x-player.x)<1300);
  for(const p of pickups){p.life-=dt;if(Math.hypot(player.x-p.x,player.y-p.y)<28){if(p.type==='ammo'){supplyAmmo(p.amount||1);announce('全武器弹药补给',1.2);}else{player.hp=Math.min(100,player.hp+35);announce('生命值 +35',1.2);}p.life=0;sound('pickup');}}pickups=pickups.filter(p=>p.life>0);
  if(area==='road')updateJourney();
  const portal=nearInteraction();HUD.prompt=portal?portal.label:'';
  if(area==='road'&&!evacuation&&!spawnLeft&&!zombies.length){if(!waveBreak){waveBreak=3.5;supplyAmmo();player.hp=Math.min(100,player.hp+15);announce('区域肃清 · 全武器补给 / 生命 +15',3);HUD.waveStatus='整备时间';}waveBreak-=dt;if(waveBreak<=0){wave++;beginWave();}}
  hudAccumulator+=rawDt;if(hudAccumulator>.08){updateHUD();hudAccumulator=0;}
}
function draw(){
  ctx.save();ctx.fillStyle='#403e31';ctx.fillRect(0,0,W,H);
  // Shake rides rawTime (hit-stop would freeze worldTime) and stays sub-pixel; the camera offset itself is rounded.
  ctx.save();
  if(state==='playing')ctx.translate(Math.round(cameraX)+Math.sin(rawTime*95)*shake,Math.round(cameraY)+Math.cos(rawTime*113)*shake*.55);
  ctx.translate(0,H*(1-cameraView.zoom));ctx.scale(cameraView.zoom,cameraView.zoom);
  if(area==='road')drawWorld(ctx,viewX,worldTime);else if(isHouseArea(area))houseArt.draw(ctx,area,viewX,worldTime,cameraRenderWidth());else if(typeof drawInterior==='function')drawInterior(ctx,area,viewX,worldTime);else{ctx.fillStyle='#1a1d17';ctx.fillRect(0,0,W,H);}
  sceneLighting.begin(area,viewX,worldTime,cameraRenderWidth());sceneLighting.ground(ctx);
  ctx.save();ctx.translate(-Math.round(viewX),0);
  // Portal markers: a bobbing brass chevron over each door / junction.
  for(const p of areaPortals()){const bob=Math.round(Math.sin(worldTime*3)*2);rect(ctx,p.x-1,228+bob,3,6,'#e0b64f');rect(ctx,p.x-3,234+bob,7,2,'#e0b64f');rect(ctx,p.x-2,236+bob,5,1,'#e0b64f');rect(ctx,p.x-1,237+bob,3,1,'#e0b64f');}
  if(isHouseArea(area))for(const clue of HOUSE_CLUES.filter(q=>q.area===area)){rect(ctx,clue.x-3,217,6,8,houseState.read.has(clue.id)?'#7b8264':'#d4b75f');rect(ctx,clue.x-1,219,3,1,'#3d3a2b');rect(ctx,clue.x-1,222,3,1,'#3d3a2b');}
  drawSpecialProjectiles(ctx,'ground');
  if(typeof drawDecals==='function')drawDecals(ctx);else for(const d of decals)rect(ctx,d.x,d.y,d.size*1.5,Math.max(1,d.size*.45),d.color);
  for(const p of pickups){const bob=Math.sin(worldTime*4)*2;rect(ctx,p.x-7,p.y-8+bob,14,9,'#303b24');rect(ctx,p.x-6,p.y-7+bob,12,7,p.type==='health'?'#91a15c':'#a78f52');if(p.type==='health'){rect(ctx,p.x-1,p.y-7+bob,2,7,'#e4e8bf');rect(ctx,p.x-3,p.y-5+bob,6,2,'#e4e8bf');}else{for(let i=0;i<3;i++)rect(ctx,p.x-4+i*3,p.y-6+bob,1,5,'#e5cb87');}}
  const renderables=[...zombies.map(z=>({depth:z.y,type:'zombie',data:z})),...corpses.map(r=>({depth:r.floor,type:'rig',data:r})),...rigs.map(r=>({depth:r.floor,type:'rig',data:r})),{depth:player.y,type:'player',data:player}].sort((a,b)=>a.depth-b.depth);
  for(const item of renderables){
    const e=item.data;
    if(e.x<viewX-220||e.x>viewX+cameraWidth()+220)continue;
    if(item.type!=='rig'){sceneLighting.shadow(ctx,e);ctx.fillStyle='#1a201888';ctx.beginPath();ctx.ellipse(e.x,e.y+3,item.type==='player'?24:e.crawling?30:20,3.2,0,0,TAU);ctx.fill();}
    if(item.type==='player'){drawPlayer(ctx);sceneLighting.actor(ctx,e,c=>drawPlayer(c));}else if(item.type==='zombie'){drawZombie(ctx,e);sceneLighting.actor(ctx,e,c=>drawZombie(c,e));}else drawRig(ctx,e);
  }
  drawMeleeTrail(ctx);
  // Fat tracers: 3 px warm outer streak with a 2 px hot core so every round reads at horde scale.
  for(const b of bullets){const length=Math.min(34,Math.hypot(b.x-b.px,b.y-b.py));const angle=Math.atan2(b.vy,b.vx),tail={x:b.x-Math.cos(angle)*length,y:b.y-Math.sin(angle)*length};bone(ctx,{x:b.x,y:b.y},tail,3,'#efcf7b');bone(ctx,{x:b.x,y:b.y},pointMix({x:b.x,y:b.y},tail,.55),2,'#fff3b1');rect(ctx,b.x-1,b.y-1,3,2,'#fff3b1');}
  drawSpecialProjectiles(ctx,'air');drawParticles(ctx);

  ctx.restore();
  if(area==='road')drawWorldForeground(ctx,viewX,worldTime);else if(isHouseArea(area))houseArt.foreground(ctx,area,viewX,worldTime,cameraRenderWidth());else if(typeof drawInteriorForeground==='function')drawInteriorForeground(ctx,area,viewX,worldTime);
  if(area==='road'){if(typeof drawWorldGrade==='function')drawWorldGrade(ctx);}else if(isHouseArea(area))houseArt.grade(ctx,area,cameraRenderWidth());else if(typeof interiorGrade==='function')interiorGrade(ctx,area);else if(typeof drawWorldGrade==='function')drawWorldGrade(ctx);
  sceneLighting.finish(ctx);
  if(state==='playing'&&reloadTime>0){
    ctx.save();ctx.translate(-Math.round(viewX),0);const y=player.pose.head.y-23;
    rect(ctx,player.x-16,y-1,32,5,'#141a12');rect(ctx,player.x-15,y,30,3,'#313828');rect(ctx,player.x-15,y,30*(1-reloadTime/getReloadDuration()),3,'#dde89a');ctx.restore();
  }
  ctx.restore(); // World zoom and shake end here; reticle and HUD remain screen-sized.
  if(state==='playing'){
    const aim=touchFiring?worldToScreen(pointer.x,pointer.y):{x:pointer.screenX,y:pointer.screenY};
    const x=Math.round(aim.x),y=Math.round(aim.y),col=hitMarker>0?(headshotMarker?'#efb267':'#fffbc2'):'#e5e9b2',gap=3+Math.round(player.kick*.7+player.heat*2);
    const arms=[[x-gap-4,y-1,4,2],[x+gap+1,y-1,4,2],[x-1,y-gap-4,2,4],[x-1,y+gap+1,2,4]];
    for(const [ax,ay,aw,ah] of arms)rect(ctx,ax-1,ay-1,aw+2,ah+2,'#1c2119');rect(ctx,x-1,y-1,3,3,'#1c2119');
    for(const [ax,ay,aw,ah] of arms)rect(ctx,ax,ay,aw,ah,col);rect(ctx,x,y,1,1,col);
    if(hitMarker>0){for(const sx of [-1,1])for(const sy of [-1,1])bone(ctx,{x:x+sx*7,y:y+sy*7},{x:x+sx*3,y:y+sy*3},1,col);}
  }
  if(areaTransition){const t=areaTransition.t/areaTransition.duration,a=areaTransition.kind==='stairs'||areaTransition.kind==='ladder'?Math.max(0,1-Math.abs(t-.5)/.11)*.65:1-Math.abs(t-.5)*2;ctx.fillStyle=`rgba(11,12,9,${clamp(a,0,1).toFixed(3)})`;ctx.fillRect(0,0,W,H);}
  // Kill flash: a brief warm wash (peach tint on headshots) that punches every kill.
  if(killFlash>0){const a=Math.min(1,killFlash/.15)*.22;ctx.fillStyle=killFlashHead?`rgba(255,180,140,${a})`:`rgba(255,240,210,${a})`;ctx.fillRect(0,0,W,H);}
  // Player damage: 90 ms full red flash, then a fading tint through the invulnerability window.
  const hurt=hurtFlash>0?.28:clamp((player.inv-.4)*.6,0,.15);
  if(hurt>0){ctx.fillStyle=`rgba(154,48,25,${hurt})`;ctx.fillRect(0,0,W,H);}
  const behind=zombies.filter(z=>z.x<viewX-20&&!z.immobilized).length;
  const ahead=zombies.filter(z=>z.x>viewX+cameraWidth()+20).length;
  if(state==='playing'){
    ctx.font='bold 9px monospace';
    if(behind){const t=`◀ ${behind}`,w=textWidth(t);rect(ctx,4,219,w+8,13,'#141a12aa');ctx.fillStyle='#ffd58a';ctx.fillText(t,8,228);}
    if(ahead){const t=`${ahead} ▶`,w=textWidth(t);rect(ctx,W-12-w,219,w+8,13,'#141a12aa');ctx.fillStyle='#ffd58a';ctx.fillText(t,W-8-w,228);}
  }
  ctx.restore();
  // Screen-space UI (HUD, menus, touch controls) is drawn last by ui.js, outside the camera-shake transform.
}
let resizePoll=0;
// Poll the viewport box twice a second as well: mobile browser chrome and CSS changes resize it without a resize event on the window.
function present(){
  const s=screenCtx;s.setTransform(1,0,0,1,0,0);s.imageSmoothingEnabled=false;
  s.fillStyle='#0b0c09';s.fillRect(0,0,canvas.width,canvas.height);
  s.drawImage(worldCanvas,0,0,W,H,view.ox,view.oy,Math.round(W*view.k),Math.round(H*view.k));
  if(typeof drawUI==='function')drawUI(s,view);
}
function frame(time){const dt=Math.min((time-lastTime)/1000||0,.035);lastTime=time;resizePoll+=dt;if(resizePoll>.5){resizePoll=0;resizeGame();}update(dt);draw();present();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
function pointerPosition(e){const r=canvas.getBoundingClientRect();const sx=canvas.width/(r.width||1),sy=canvas.height/(r.height||1);pointer.screenX=((e.clientX-r.left)*sx-view.ox)/view.k;pointer.screenY=((e.clientY-r.top)*sy-view.oy)/view.k;pointer.kind=e.pointerType||'mouse';pointer.inside=pointer.screenX>=0&&pointer.screenX<=W&&pointer.screenY>=0&&pointer.screenY<=H;syncPointerWorld();}
// Pointer events go through ui.js first (uiPointer returns true when a button/d-pad/menu consumed them); the rest is aiming and firing.
const uiConsumes=(type,e)=>typeof uiPointer==='function'&&uiPointer(type,pointer.screenX,pointer.screenY,e.pointerId)===true;
canvas.addEventListener('pointermove',e=>{pointerPosition(e);uiConsumes('move',e);});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')e.preventDefault();if(e.button!==0)return;pointerPosition(e);if(uiConsumes('down',e)){try{canvas.setPointerCapture(e.pointerId);}catch{}return;}if(state==='playing'&&!houseReading&&!areaTransition){pointer.down=true;player.face=pointer.x>=player.x?1:-1;player.pose=makePlayerPose().pose;shoot();canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});}});
window.addEventListener('pointerup',e=>{if(uiConsumes('up',e))return;if(e.target===canvas){pointer.down=false;touchFiring=false;triggerLatched=false;}});
window.addEventListener('pointercancel',e=>{if(uiConsumes('cancel',e))return;pointer.inside=false;pointer.down=false;touchFiring=false;triggerLatched=false;keys.clear();});
canvas.addEventListener('pointerleave',()=>{pointer.inside=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if(e.repeat&&['e','j'].includes(key))return;if(houseReading){if(['escape','e','j',' '].includes(key)){e.preventDefault();houseCloseReading();}return;}if(key==='j'&&state==='playing'){e.preventDefault();houseOpenJournal();return;}if(areaTransition)return;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();if(e.repeat&&['escape',' ','r','enter'].includes(key))return;if(key==='escape'||key===' '){pauseGame();return;}if(key==='enter'&&(state==='ready'||state==='over'||state==='won')){startGame();return;}if(state!=='playing')return;keys.add(key);if(key==='r')reload();if(key==='e')usePortal();if(key==='k')debugKillAll();if(['1','2','3','4','5'].includes(key))switchWeapon(WEAPON_ORDER[Number(key)-1]);if(key==='q'&&!e.repeat)switchWeapon(WEAPON_ORDER[(WEAPON_ORDER.indexOf(selectedWeapon)+1)%WEAPON_ORDER.length]);});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{pointer.inside=false;keys.clear();pointer.down=false;triggerLatched=false;if(state==='playing')pauseGame();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pauseGame();});
// Entry points for the canvas-drawn controls in ui.js (sound / fullscreen buttons, touch fire button).
function toggleSound(){soundEnabled=!soundEnabled;if(soundEnabled){initAudio();sound('pickup');}}
async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{announce('当前浏览器暂不支持全屏',2);}}
function touchFireStart(){if(areaTransition||houseReading)return;touchFiring=true;pointer.down=true;const target=[...zombies].sort((a,b)=>distance(a,player)-distance(b,player))[0];if(target){pointer.x=target.pose.shoulder.x;pointer.y=(target.pose.shoulder.y+target.pose.hip.y)/2;player.face=pointer.x>=player.x?1:-1;player.pose=makePlayerPose().pose;}shoot();}
// Debug: wipe every zombie in the current area (button in ui.js, K key).
function debugKillAll(){if(state!=='playing')return 0;let n=0;for(const z of [...zombies]){if(!z.dead){killZombie(z,'body',z.face>0?Math.PI:0,'crowbar');n++;}}if(n)announce(`DEBUG · 清除 ${n} 只僵尸`,1.5);return n;}
function touchFireEnd(){pointer.down=false;touchFiring=false;triggerLatched=false;}

function openWardrobe(){
  if(state==='playing')pauseGame();
  window.open('wardrobe.html','_blank','noopener');
}
// A saved outfit is shared with an already-open game without restarting the run.
window.addEventListener('storage',e=>{if(e.key==='last-light-wardrobe-v1')wardrobe.load();});
window.addEventListener('focus',()=>wardrobe.load());

updateHUD();
