'use strict';

// All artwork is drawn at a native 640 × 330 resolution, including articulated sprites.
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;
const W = 640, H = 330, PLAYER_SCALE = 1.38, WORLD_LENGTH = 6400;
const ROUTE_START = 142, EXTRACTION_X = 6292, ROUTE_METERS = (EXTRACTION_X - ROUTE_START) / 10;
const $ = id => document.getElementById(id);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => min + Math.random() * (max - min);
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
function switchWeapon(id){
  if(!WEAPONS[id]||id===selectedWeapon||state==='over'||state==='won')return;
  weaponInventory[selectedWeapon]={ammo:player.ammo,reserve:player.reserve};selectedWeapon=id;
  player.ammo=weaponInventory[id].ammo;player.reserve=weaponInventory[id].reserve;
  reloadTime=0;reloadStage=0;muzzle=0;meleeSwing=null;shotCooldown=Math.max(shotCooldown,.22);pointer.down=false;touchFiring=false;triggerLatched=false;
  player.kick=0;player.kickVelocity=0;player.climb=0;player.climbVelocity=0;player.heat=0;updateHUD();sound('rack');
}
function supplyAmmo(multiplier=1){
  for(const weapon of Object.values(WEAPONS)){if(weapon.melee)continue;const amount=Math.ceil(weapon.magSize*1.5*multiplier);if(weapon.id===selectedWeapon)player.reserve+=amount;else weaponInventory[weapon.id].reserve+=amount;}
}
function damagePlayer(amount,sourceX){
  if(player.inv>0||state!=='playing')return false;
  player.hp=Math.max(0,player.hp-amount);player.inv=.65;shake=2.1;cameraVX+=Math.sign(player.x-sourceX)*20;
  bloodBurst(player.x,player.y-75,Math.PI*.5,player.y,5,.4);sound('hurt');
  if(player.hp<=0){updateHUD();gameOver();}return true;
}
function specialAPI(){return {player,cameraLeft:viewX,cameraRight:viewX+W,damagePlayer,emit,dust,sound};}
function immobilized(z){return (limbDisabled(z,'leg','L')||limbDisabled(z,'leg','R'))&&(limbDisabled(z,'arm','L')||limbDisabled(z,'arm','R'));}
function refreshLimbState(z){
  const wasCrawling=z.crawling,legs=Number(limbDisabled(z,'leg','L'))+Number(limbDisabled(z,'leg','R'));
  z.baseSpeed??=z.speed;z.crawling=Boolean(z.missing.legL||z.missing.legR||legs===2);z.limping=legs===1&&!z.crawling;
  if(z.crawling&&!wasCrawling)z.crawlBlend=0;
  z.immobilized=immobilized(z);z.speed=z.baseSpeed*(z.crawling?.34:z.limping?.62:1);
  if(z.immobilized){z.attackTime=0;z.specialState='idle';z.specialTimer=0;}
}

const player={x:142,y:288,hp:100,ammo:WEAPONS.rifle.magSize,reserve:WEAPONS.rifle.reserve,stamina:100,walk:0,moving:false,face:1,inv:0,vx:0,vy:0,kick:0,kickVelocity:0,climb:0,climbVelocity:0,heat:0,smokeTimer:0,sprinting:false};
let pointer={x:465,y:184,screenX:465,screenY:184,down:false};
let keys=new Set(),zombies=[],bullets=[],particles=[],corpses=[],pickups=[],touchFiring=false;
let meleeSwing=null,triggerLatched=false;
let state='ready',lastTime=0,worldTime=0,elapsed=0,kills=0,wave=1,spawnLeft=0,spawnTimer=0,waveBreak=0;
let shotCooldown=0,reloadTime=0,shake=0,muzzle=0,noticeTime=0,hitMarker=0,hitStop=0,shotSerial=0,reloadStage=0;
let cameraX=0,cameraY=0,cameraVX=0,cameraVY=0,killFlash=0,headshotMarker=false;
let best=0,soundEnabled=true,audioCtx=null;
let stats={shots:0,hits:0,headshots:0,severed:0};
try{best=Number(localStorage.getItem('last-light-best'))||0;}catch{}
$('best').textContent=String(best).padStart(3,'0');

function playerMuzzle(){
  const art=makePlayerPose(),g=art.gun,angle=g.face===1?g.angle:Math.PI-g.angle;
  return{x:g.origin.x+Math.cos(angle)*getWeapon().barrelLength*PLAYER_SCALE,y:g.origin.y+Math.sin(angle)*getWeapon().barrelLength*PLAYER_SCALE,angle,origin:g.origin};
}
function announce(message,duration=2){$('notice').textContent=message;noticeTime=duration;}
function addZombie(preview=false,index=0,forcedKind){
  const y=preview?239+(index%4)*20:rand(239,306);
  const z={x:preview?384+Math.floor(index/4)*77+(index%4)*23:(wave>1&&Math.random()<.24?viewX-rand(35,95):viewX+W+rand(30,90)),y,type:preview?index%8:Math.floor(rand(0,8)),scale:1.12+(y-239)/330,speed:preview?28:(rand(12,18)+wave*1.15)*2*1.18,phase:rand(0,TAU),hp:5.5+Math.min(6,(wave-1)*.65),hit:0,attack:rand(.2,.7),attackTime:0,attackDone:false,face:-1,dead:false,missing:{},wounds:[],limbHits:{},crawling:false,flinch:0,flinchV:0,knockVX:0,knockVY:0,pose:null};
  configureSpecial(z,forcedKind||(preview?(index===7?'brute':index===9?'spitter':index===3?'runner':'normal'):chooseZombieKind(wave,index||shotSerial+zombies.length)));z.immobilized=false;z.baseSpeed=z.speed;z.pose=makeZombiePose(z);zombies.push(z);return z;
}
for(let i=0;i<12;i++)addZombie(true,i);
player.pose=makePlayerPose().pose;
function saveBest(){if(kills>best){best=kills;$('best').textContent=String(best).padStart(3,'0');try{localStorage.setItem('last-light-best',best);}catch{}}}
function beginWave(){spawnLeft=9+wave*4;spawnTimer=.1;waveBreak=0;announce(`第 ${String(wave).padStart(2,'0')} 波 · 尸潮来袭`,2.6);$('wave-status').textContent='尸潮来袭';}
function startGame(){
  initAudio();resetArsenal();resetSpecials();viewX=0;furthestX=142;nextEncounterX=900;evacuation=false;claimedSupplyStops.clear();Object.assign(player,{x:142,y:288,hp:100,ammo:WEAPONS.rifle.magSize,reserve:WEAPONS.rifle.reserve,stamina:100,walk:0,moving:false,face:1,inv:0,vx:0,vy:0,kick:0,kickVelocity:0,climb:0,climbVelocity:0,heat:0,smokeTimer:0,sprinting:false});
  keys.clear();pointer.down=false;touchFiring=false;triggerLatched=false;zombies=[];bullets=[];particles=[];corpses=[];pickups=[];rigs=[];decals=[];physicsAccumulator=0;
  elapsed=0;kills=0;wave=1;meleeSwing=null;triggerLatched=false;shotCooldown=0;reloadTime=0;shake=0;hitStop=0;muzzle=0;shotSerial=0;cameraX=cameraY=cameraVX=cameraVY=0;killFlash=0;
  stats={shots:0,hits:0,headshots:0,severed:0};
  player.ammo=getWeapon().magSize;player.reserve=getWeapon().reserve;state='playing';$('overlay').classList.add('hidden');$('mode-label').textContent='战区实时';$('bottom-status').textContent='向东突围 → · 1–5 切换武器 · 断脚＋断手可定身';$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','暂停游戏');
  beginWave();for(let i=0;i<3;i++){const z=addZombie(false,i,i===2?'runner':'normal');z.x=455+i*66;z.pose=makeZombiePose(z);spawnLeft--;}
  player.pose=makePlayerPose().pose;updateHUD();canvas.focus({preventScroll:true});
}
function pauseGame(){
  if(state==='ready'||state==='over'||state==='won')return;pointer.down=false;touchFiring=false;triggerLatched=false;keys.clear();
  if(state==='playing'){
    state='paused';$('overlay').classList.remove('hidden');$('panel-tag').textContent='喘口气，检查弹匣。';$('panel-title').textContent='行动已暂停';$('panel-copy').textContent='战区已冻结。准备好后，继续守住公路。';$('start').querySelector('span').textContent='继续行动';$('start-hint').textContent='按 ESC 或点击继续';$('mode-label').textContent='行动暂停';$('pause').textContent='▷';$('pause').setAttribute('aria-label','继续游戏');
  }else{
    state='playing';$('overlay').classList.add('hidden');$('mode-label').textContent='战区实时';$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','暂停游戏');canvas.focus({preventScroll:true});
  }
}
function gameOver(){state='over';pointer.down=false;touchFiring=false;triggerLatched=false;keys.clear();saveBest();$('overlay').classList.remove('hidden');$('panel-tag').textContent='信号丢失 · 行动结束';$('panel-title').textContent='这一枪，还不算终点。';$('panel-copy').textContent=`坚持 ${formatTime(elapsed)} · 击杀 ${kills} · 爆头 ${stats.headshots} · 断肢 ${stats.severed}`;$('start').querySelector('span').textContent='再次突围';$('start-hint').textContent=`最佳纪录 ${best} 击杀 · 按 ENTER 重新开始`;$('mode-label').textContent='信号丢失';$('bottom-status').textContent='行动结束。整装，再次出发。';}
function reload(automatic=false){
  if(state!=='playing'||getWeapon().melee||reloadTime>0||player.ammo===getWeapon().magSize)return;
  if(player.reserve<=0){if(shotCooldown<=0){announce('弹药不足 · 寻找补给',1.5);sound('empty');shotCooldown=.5;}return;}
  reloadTime=getReloadDuration();reloadStage=0;if(!automatic)pointer.down=false;sound('reload');
}
function shoot(){
  if(state!=='playing'||shotCooldown>0||reloadTime>0)return;
  const w=getWeapon();if(w.melee){beginMelee();return;}
  if(w.semiAuto&&triggerLatched)return;
  if(player.ammo<=0){reload(true);return;}
  triggerLatched=true;const m=playerMuzzle();player.ammo--;shotCooldown=w.fireInterval;muzzle=w.muzzleLife;shotSerial++;stats.shots++;
  const spread=(player.sprinting?w.sprintSpread:player.moving?w.movingSpread:w.spread)+player.heat*w.heatSpread;
  for(let i=0;i<w.pellets;i++){
    const offset=w.pellets>1?((i/(w.pellets-1)-.5)*2*spread+rand(-spread*.14,spread*.14)):rand(-spread,spread),angle=m.angle+offset;
    bullets.push({x:m.x,y:m.y,px:m.origin.x,py:m.origin.y,vx:Math.cos(angle)*w.projectileSpeed,vy:Math.sin(angle)*w.projectileSpeed,damage:w.damage,weaponId:w.id,shotId:shotSerial,life:w.range/w.projectileSpeed,first:true});
  }
  // A same-frame kick makes every shot readable; the springs then absorb the impact.
  player.kick=Math.min(w.maxKick,player.kick+w.kickSnap);player.kickVelocity=Math.min(w.kickImpulse*1.35,player.kickVelocity+w.kickImpulse);
  player.climb=Math.min(w.maxClimb,player.climb+w.climbSnap);player.climbVelocity=Math.min(w.climbImpulse*1.5,player.climbVelocity+w.climbImpulse);
  player.heat=Math.min(1,player.heat+w.heatPerShot);hitStop=Math.max(hitStop,w.shotStop);
  cameraX=clamp(cameraX-Math.cos(m.angle)*w.cameraSnap,-6,6);cameraY=clamp(cameraY-w.cameraSnap*.3,-4,4);
  cameraVX-=Math.cos(m.angle)*w.cameraKick;cameraVY-=Math.sin(m.angle)*8+4;shake=Math.max(shake,w.shake);
  muzzleEffects(m);sound(w.shotSound);if(player.ammo===0)reload(true);
}
function beginMelee(){
  const w=getWeapon();if(meleeSwing||shotCooldown>0)return;
  if(player.stamina<w.staminaCost){shotCooldown=.2;announce('体力不足 · 拉开距离恢复',.8);sound('empty');return;}
  const shoulder=makePlayerPose().pose.shoulder;
  player.stamina-=w.staminaCost;shotCooldown=w.fireInterval;shotSerial++;stats.shots++;
  meleeSwing={elapsed:0,angle:Math.atan2(pointer.y-shoulder.y,pointer.x-shoulder.x),face:player.face,hits:new Set(),shotId:shotSerial};
  sound('swing');
}
function updateMelee(dt){
  if(!meleeSwing)return;const swing=meleeSwing,w=getWeapon(),old=swing.elapsed,next=Math.min(w.swingDuration,old+dt);
  // Sweep the visible shaft through intermediate poses so a fast arc cannot tunnel.
  for(let i=1;i<=6;i++){
    swing.elapsed=mix(old,next,i/6);const phase=swing.elapsed/w.swingDuration;
    if(phase<.26||phase>.64||swing.hits.size>=w.maxTargets)continue;
    const g=makePlayerPose().gun,angle=g.face===1?g.angle:Math.PI-g.angle;
    const tip={x:g.origin.x+Math.cos(angle)*(w.barrelLength+4)*PLAYER_SCALE,y:g.origin.y+Math.sin(angle)*(w.barrelLength+4)*PLAYER_SCALE};
    const contacts=[];
    for(const z of zombies){
      if(z.dead||swing.hits.has(z)||Math.abs(z.y-player.y)>32||Math.abs(z.x-player.x)>w.range+20)continue;
      let best=null,tBest=Infinity;
      for(const shape of hitShapes(z)){const t=rayCapsule(g.origin,tip,{...shape,r:shape.r+5});if(t<tBest){best=shape;tBest=t;}}
      if(best)contacts.push({z,part:best.part,t:tBest,point:pointMix(g.origin,tip,tBest)});
    }
    contacts.sort((a,b)=>a.t-b.t);
    for(const contact of contacts){
      if(swing.hits.size>=w.maxTargets)break;swing.hits.add(contact.z);
      hitZombie(contact.z,contact.part,contact.point,{vx:Math.cos(swing.angle)*100,vy:Math.sin(swing.angle)*100,damage:w.damage,weaponId:w.id,shotId:swing.shotId});
      cameraVX-=swing.face*w.cameraKick;shake=Math.max(shake,w.shake);player.kickVelocity+=w.kickImpulse*.35;
    }
  }
  swing.elapsed=next;if(next>=w.swingDuration)meleeSwing=null;
}
function drawMeleeTrail(c){
  if(!meleeSwing)return;const phase=meleeSwing.elapsed/getWeapon().swingDuration;if(phase<.26||phase>.68)return;
  const g=makePlayerPose().gun,angle=g.face===1?g.angle:Math.PI-g.angle,r=getWeapon().barrelLength*PLAYER_SCALE;
  c.save();for(let i=1;i<5;i++){const a=angle-i*.11*g.face;c.globalAlpha=(5-i)*.09;bone(c,{x:g.origin.x+Math.cos(a)*r*.68,y:g.origin.y+Math.sin(a)*r*.68},{x:g.origin.x+Math.cos(a)*r,y:g.origin.y+Math.sin(a)*r},2,'#dbcfa7');}c.restore();
}
function killZombie(z,part,dir){
  if(z.dead)return;z.dead=true;
  if(part==='head'&&!z.missing.head){sever(z,'head',dir);stats.headshots++;stats.severed++;textParticle(z.pose.head.x,z.pose.head.y-14,'HEADSHOT');}
  makeRig(z,'body',dir);kills++;saveBest();hitStop=Math.max(hitStop,part==='head'?.065:.045);killFlash=.15;
  if(kills%5===0)pickups.push({x:clamp(z.x,22,WORLD_LENGTH-22),y:z.y,type:kills%10===0?'health':'ammo',life:25});
}
function hitZombie(z,part,point,bullet){
  const dir=Math.atan2(bullet.vy,bullet.vx),damage=bullet.damage??1,w=weaponById(bullet.weaponId);stats.hits++;z.hit=.13;hitMarker=.17;headshotMarker=part==='head';
  const mass=z.kind==='brute'?.28:z.kind==='runner'?.68:.58,pellet=w.pellets>1;
  z.flinch=clamp(z.flinch+Math.cos(dir)*(pellet?.07:.18)*mass,-1.1,1.1);
  z.flinchV=clamp(z.flinchV+Math.cos(dir)*(pellet?11:30)*mass,-38,38);
  z.knockVX=clamp(z.knockVX+Math.cos(dir)*w.impactImpulse*mass,-210,210);z.knockVY+=Math.sin(dir)*5*mass;
  if(w.melee||w.id==='shotgun'||part==='head'){z.attackTime=0;z.attack=Math.max(z.attack,z.kind==='brute'?.16:.34);}hitStop=Math.max(hitStop,w.impactStop);
  if(z.lastImpactShot!==bullet.shotId||bullet.shotId===undefined){sound(w.melee?'meleeHit':part==='head'?'headshot':'hit',z.x);z.lastImpactShot=bullet.shotId;}
  bloodBurst(point.x,point.y,dir,z.y,pellet?7:part==='head'?23:14,pellet?1.45:1.15);
  impactFragments(z,point,dir,part);
  if(part==='head'){z.hp-=damage*(z.headDamageMultiplier??3)*(w.headshotScale||1);z.headTrauma=(z.headTrauma||0)+damage;}
  else if(/^(forearm|arm|shin|leg)[LR]$/.test(part)){
    z.limbHits[part]=(z.limbHits[part]||0)+damage*(w.melee?1.2:1);z.hp-=damage*.33;
    if(!z.missing[part]&&z.limbHits[part]>=limbThreshold(z,part)){sever(z,part,dir);stats.severed++;hitStop=Math.max(hitStop,.018);if(/^(leg|shin)/.test(part))textParticle(point.x,point.y-8,'CRIPPLED','#d6bd86');}
    refreshLimbState(z);
  }else{z.hp-=damage*(z.bodyDamageMultiplier??1);const torso=pointMix(z.pose.shoulder,z.pose.hip,.5);z.wounds.push({x:clamp((point.x-torso.x)/z.scale*z.face,-6,5),t:clamp((point.y-z.pose.shoulder.y)/(z.pose.hip.y-z.pose.shoulder.y||1),.15,.85),size:rand(3,6)});if(z.wounds.length>5)z.wounds.shift();hitStop=Math.max(hitStop,.013);}
  z.immobilized=immobilized(z);
  if(z.hp<=0)killZombie(z,part,dir);
}
function formatTime(t){return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
function updateHUD(){
  $('health').innerHTML=`${Math.ceil(player.hp)} <span>/ 100</span>`;$('health-bar').style.width=`${player.hp}%`;$('health-bar').style.background=player.hp<30?'#e4805c':'#d9eaa1';$('stamina-bar').style.width=`${player.stamina}%`;
  $('ammo').textContent=getWeapon().melee?String(Math.floor(player.stamina)):String(player.ammo).padStart(2,'0');$('ammo').style.color=(getWeapon().melee?player.stamina<16:player.ammo<6)?'#edaa70':'';$('ammo').nextElementSibling.textContent=getWeapon().melee?'体力':`/ ${player.reserve}`;
  $('reload-key').style.visibility=getWeapon().melee?'hidden':'visible';$('touch-fire').textContent=getWeapon().melee?'挥击':getWeapon().semiAuto?'点射':'开火';$('touch-reload').disabled=Boolean(getWeapon().melee);$('touch-reload').style.opacity=getWeapon().melee?'.35':'1';$('kills').textContent=String(kills).padStart(3,'0');$('wave').textContent=String(wave).padStart(2,'0');$('time').textContent=formatTime(elapsed);
  $('reload-label').textContent=reloadTime>0?`换弹中 · ${reloadTime.toFixed(1)}s`:getWeapon().label;
  const sector=getWorldSector(player.x);
  $('sector-name').textContent=sector.name;
  $('sector-code').textContent=`SECTOR ${sector.code}`;
  $('route-distance').textContent=`${Math.floor(clamp((furthestX-ROUTE_START)/10,0,ROUTE_METERS))} / ${ROUTE_METERS} m`;
  $('route-progress').style.width=`${clamp((furthestX-ROUTE_START)/(EXTRACTION_X-ROUTE_START),0,1)*100}%`;
  for(const button of document.querySelectorAll('[data-weapon]')){
    const active=button.dataset.weapon===selectedWeapon;
    button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));
    const stash=active?player:weaponInventory[button.dataset.weapon];button.querySelector('.weapon-count').textContent=WEAPONS[button.dataset.weapon].melee?'16 体力 / 次':`${stash.ammo} / ${stash.reserve}`;
  }
}
function victory(){
  state='won';pointer.down=false;touchFiring=false;triggerLatched=false;keys.clear();saveBest();
  $('overlay').classList.remove('hidden');$('panel-tag').textContent='撤离信号确认 · 行动完成';$('panel-title').textContent='你穿过了死线。';
  $('panel-copy').textContent=`穿越四个区域 · 击杀 ${kills} · 用时 ${formatTime(elapsed)}`;
  $('start').querySelector('span').textContent='再次出发';$('start-hint').textContent='按 ENTER 重新开始';$('mode-label').textContent='撤离成功';
}
function updateJourney(){
  for(const stop of [1480,3010,4660])if(player.x>=stop&&!claimedSupplyStops.has(stop)){
    claimedSupplyStops.add(stop);supplyAmmo(2);player.hp=Math.min(100,player.hp+25);announce(`${getWorldSector(stop+50).name} · 补给已获取`,2.7);sound('pickup');
  }
  if(!evacuation&&furthestX>nextEncounterX){wave++;spawnLeft+=5+Math.min(wave,8);waveBreak=0;nextEncounterX+=750;spawnTimer=.2;$('wave-status').textContent='增援逼近';announce('前方出现新的尸群',2);}
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
  p.x=clamp(p.x+p.vx*dt,24,WORLD_LENGTH-30);p.y=clamp(p.y+p.vy*dt,239,308);p.moving=Math.hypot(p.vx,p.vy)>3;
  const previousStep=Math.floor(p.walk/Math.PI);p.walk+=Math.hypot(p.vx,p.vy)*dt/79*TAU*(p.vx*p.face<-.1?-1:1);
  if(Math.floor(p.walk/Math.PI)!==previousStep&&p.moving){dust(p.x,p.y+1,p.sprinting?4:2);sound('step');}
  furthestX=Math.max(furthestX,p.x);viewX=mix(viewX,clamp(p.x-235,0,WORLD_LENGTH-W),1-Math.exp(-7*dt));if(!touchFiring)pointer.x=pointer.screenX+viewX;
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
function updateZombies(dt){
  for(const z of zombies){
    z.hit=Math.max(0,z.hit-dt);z.attack=Math.max(0,z.attack-dt);
    z.flinchV+=(-z.flinch*110-z.flinchV*14)*dt;z.flinch+=z.flinchV*dt;
    z.x+=z.knockVX*dt;z.y=clamp(z.y+z.knockVY*dt,232,312);z.knockVX*=Math.exp(-9*dt);z.knockVY*=Math.exp(-9*dt);
    const ex=player.x-z.x,ey=player.y-z.y,dist=Math.hypot(ex,ey);z.face=ex>=0?1:-1;
    z.immobilized=immobilized(z);const special=updateSpecial(z,dt,specialAPI());if(state!=='playing')return;let movement=0;
    if(!z.immobilized&&dist>28&&z.attackTime<=0){
      const hesitate=.73+Math.sin(z.phase)*.21,speed=z.speed*hesitate*(z.hit>0?.68:1)*(special.movementMultiplier??1);
      z.x+=ex/dist*speed*dt;z.y+=ey/dist*speed*.6*dt;movement=speed;
    }
    const oldStep=Math.floor(z.phase/Math.PI);
    z.phase+=movement*dt/(z.crawling?38:62)*TAU;
    if(Math.floor(z.phase/Math.PI)!==oldStep&&z.x>viewX&&z.x<viewX+W) dust(z.x,z.y,1);
    if(!special.suppressMelee&&dist<43&&Math.abs(ey)<23&&z.attack<=0&&z.attackTime<=0){z.attackTime=.65;z.attackDone=false;z.attack=1.05;}
    if(z.attackTime>0){
      const before=z.attackTime;z.attackTime=Math.max(0,z.attackTime-dt);
      if(before>.4&&z.attackTime<=.4&&!z.attackDone){
        z.attackDone=true;if(!z.immobilized)z.x+=z.face*5;
        if(Math.hypot(player.x-z.x,player.y-z.y)<46&&player.inv<=0){
          const arms=Number(limbDisabled(z,'arm','L'))+Number(limbDisabled(z,'arm','R'));const damage=arms===2?7:arms===1?12:18;
          damagePlayer(damage,z.x);if(state!=='playing')return;
        }
      }
    }
    // A short transition prevents a severed leg from teleporting the torso down.
    const next=makeZombiePose(z);
    if(z.crawling&&z.crawlBlend<1){z.crawlBlend=Math.min(1,z.crawlBlend+dt*4);for(const name of Object.keys(next))next[name]=pointMix(z.pose[name],next[name],1-Math.exp(-11*dt));}
    z.pose=next;
  }
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
  zombies=zombies.filter(z=>!z.dead);bullets=bullets.filter(b=>b.life>0&&b.x>viewX-100&&b.x<viewX+W+100&&b.y>-20&&b.y<H+20);
}
function update(rawDt){
  if(state==='ready'){worldTime+=rawDt;for(const z of zombies){z.phase+=rawDt*.75;z.pose=makeZombiePose(z);}return;}
  if(state!=='playing')return;
  let dt=rawDt;if(hitStop>0){hitStop=Math.max(0,hitStop-rawDt);dt*=.12;}
  elapsed+=rawDt;worldTime+=dt;shotCooldown=Math.max(0,shotCooldown-rawDt);muzzle=Math.max(0,muzzle-rawDt);hitMarker=Math.max(0,hitMarker-rawDt);killFlash=Math.max(0,killFlash-rawDt);
  shake=Math.max(0,shake-rawDt*8);player.inv=Math.max(0,player.inv-dt);
  cameraVX+=(-cameraX*150-cameraVX*20)*rawDt;cameraVY+=(-cameraY*150-cameraVY*20)*rawDt;cameraX+=cameraVX*rawDt;cameraY+=cameraVY*rawDt;
  if(noticeTime>0){noticeTime-=rawDt;if(noticeTime<=0)$('notice').textContent='';}
  if(reloadTime>0){
    reloadTime=Math.max(0,reloadTime-rawDt);const progress=1-reloadTime/getReloadDuration();
    if(progress>.23&&reloadStage===0){reloadStage=1;const g=makePlayerPose().gun;emit({kind:getWeapon().id==='shotgun'?'shell':'magazine',x:g.origin.x+player.face*22,y:g.origin.y+15,vx:-player.face*15,vy:15,life:5,size:4,color:'#343b2e',spin:3,gravity:220,floor:player.y+2});sound('reload');}
    if(progress>.69&&reloadStage===1){reloadStage=2;sound('reload');}
    if(progress>.9&&reloadStage===2){reloadStage=3;sound('rack');}
    if(reloadTime<=0){const n=Math.min(getWeapon().magSize-player.ammo,player.reserve);player.ammo+=n;player.reserve-=n;}
  }
  if(touchFiring){let nearest=null,bestDistance=Infinity;for(const z of zombies){const d=Math.hypot(z.x-player.x,z.y-player.y);if(d<bestDistance){nearest=z;bestDistance=d;}}if(nearest){pointer.x=nearest.pose.shoulder.x;pointer.y=(nearest.pose.shoulder.y+nearest.pose.hip.y)/2;}pointer.down=true;}
  updatePlayer(dt,rawDt);if(pointer.down)shoot();updateMelee(dt);
  if(spawnLeft>0&&zombies.length<32){spawnTimer-=dt;if(spawnTimer<=0){addZombie();spawnLeft--;spawnTimer=Math.max(.36,.98-wave*.065);}}
  updateZombies(dt);if(state!=='playing')return;updateBullets(dt);updateEffects(dt);updateHostileProjectiles(dt,specialAPI());if(state!=='playing')return;
  zombies=zombies.filter(z=>Math.abs(z.x-player.x)<1300);
  for(const p of pickups){p.life-=dt;if(Math.hypot(player.x-p.x,player.y-p.y)<28){if(p.type==='ammo'){supplyAmmo();announce('全武器弹药补给',1.2);}else{player.hp=Math.min(100,player.hp+35);announce('生命值 +35',1.2);}p.life=0;sound('pickup');}}pickups=pickups.filter(p=>p.life>0);
  updateJourney();
  if(!evacuation&&!spawnLeft&&!zombies.length){if(!waveBreak){waveBreak=3.5;supplyAmmo();player.hp=Math.min(100,player.hp+15);announce('区域肃清 · 全武器补给 / 生命 +15',3);$('wave-status').textContent='整备时间';}waveBreak-=dt;if(waveBreak<=0){wave++;beginWave();}}
  hudAccumulator+=rawDt;if(hudAccumulator>.08){updateHUD();hudAccumulator=0;}
}
const vignette=ctx.createRadialGradient(320,165,120,320,165,380);vignette.addColorStop(0,'#191d1100');vignette.addColorStop(1,'#191d1138');
function draw(){
  ctx.save();ctx.fillStyle='#403e31';ctx.fillRect(0,0,W,H);
  if(state==='playing')ctx.translate(Math.round(cameraX+Math.sin(worldTime*95)*shake),Math.round(cameraY+Math.cos(worldTime*113)*shake*.55));
  drawWorld(ctx,viewX,worldTime);
  ctx.save();ctx.translate(-Math.round(viewX),0);
  drawSpecialProjectiles(ctx,'ground');
  for(const d of decals)rect(ctx,d.x,d.y,d.size*1.5,Math.max(1,d.size*.45),d.color);
  for(const p of pickups){const bob=Math.sin(worldTime*4)*2;rect(ctx,p.x-7,p.y-8+bob,14,9,'#303b24');rect(ctx,p.x-6,p.y-7+bob,12,7,p.type==='health'?'#91a15c':'#a78f52');if(p.type==='health'){rect(ctx,p.x-1,p.y-7+bob,2,7,'#e4e8bf');rect(ctx,p.x-3,p.y-5+bob,6,2,'#e4e8bf');}else{for(let i=0;i<3;i++)rect(ctx,p.x-4+i*3,p.y-6+bob,1,5,'#e5cb87');}}
  const renderables=[...zombies.map(z=>({depth:z.y,type:'zombie',data:z})),...corpses.map(r=>({depth:r.floor,type:'rig',data:r})),...rigs.map(r=>({depth:r.floor,type:'rig',data:r})),{depth:player.y,type:'player',data:player}].sort((a,b)=>a.depth-b.depth);
  for(const item of renderables){
    const e=item.data;
    if(e.x<viewX-220||e.x>viewX+W+220)continue;
    if(item.type!=='rig'){ctx.fillStyle='#22281f55';ctx.beginPath();ctx.ellipse(e.x,e.y+3,item.type==='player'?24:e.crawling?30:20,3.2,0,0,TAU);ctx.fill();}
    if(item.type==='player')drawPlayer(ctx);else if(item.type==='zombie')drawZombie(ctx,e);else drawRig(ctx,e);
  }
  drawMeleeTrail(ctx);drawWeaponLight(ctx);
  for(const b of bullets){const length=Math.min(19,Math.hypot(b.x-b.px,b.y-b.py));const angle=Math.atan2(b.vy,b.vx);bone(ctx,{x:b.x,y:b.y},{x:b.x-Math.cos(angle)*length,y:b.y-Math.sin(angle)*length},1,'#efcf7b');rect(ctx,b.x,b.y,2,1,'#fff3b1');}
  drawSpecialProjectiles(ctx,'air');drawParticles(ctx);
  if(state==='playing'){
    const x=Math.round(pointer.x),y=Math.round(pointer.y),col=hitMarker>0?(headshotMarker?'#efb267':'#fffbc2'):'#e5e9b2',gap=3+Math.round(player.kick*.7+player.heat*2);
    rect(ctx,x-gap-4,y,4,1,col);rect(ctx,x+gap+1,y,4,1,col);rect(ctx,x,y-gap-4,1,4,col);rect(ctx,x,y+gap+1,1,4,col);rect(ctx,x,y,1,1,col);
    if(hitMarker>0){for(const sx of [-1,1])for(const sy of [-1,1])bone(ctx,{x:x+sx*7,y:y+sy*7},{x:x+sx*3,y:y+sy*3},1,col);}
    if(reloadTime>0){const y=player.pose.head.y-23;rect(ctx,player.x-15,y,30,3,'#313828');rect(ctx,player.x-15,y,30*(1-reloadTime/getReloadDuration()),3,'#dde89a');}

  }
  ctx.restore();
  drawWorldForeground(ctx,viewX,worldTime);
  if(player.inv>.4){ctx.fillStyle=`rgba(154,48,25,${(player.inv-.4)*.32})`;ctx.fillRect(0,0,W,H);}
  const behind=zombies.filter(z=>z.x<viewX-20&&!z.immobilized).length;
  const ahead=zombies.filter(z=>z.x>viewX+W+20).length;
  if(state==='playing'){ctx.font='bold 7px monospace';ctx.fillStyle='#e3aa6b';if(behind)ctx.fillText(`◀ ${behind}`,8,175);if(ahead)ctx.fillText(`${ahead} ▶`,W-29,175);}
  ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);ctx.restore();
}
function frame(time){const dt=Math.min((time-lastTime)/1000||0,.035);lastTime=time;update(dt);draw();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
function pointerPosition(e){const r=canvas.getBoundingClientRect();let scaleX=r.width/W,scaleY=r.height/H,offsetX=0,offsetY=0;const fit=getComputedStyle(canvas).objectFit;if(fit==='cover'||fit==='contain'){const scale=fit==='cover'?Math.max(scaleX,scaleY):Math.min(scaleX,scaleY);const pos=getComputedStyle(canvas).objectPosition.split(' ');offsetX=(r.width-W*scale)*(parseFloat(pos[0])/100);offsetY=(r.height-H*scale)*(parseFloat(pos[1]||'50')/100);scaleX=scaleY=scale;}pointer.screenX=(e.clientX-r.left-offsetX)/scaleX;pointer.screenY=(e.clientY-r.top-offsetY)/scaleY;pointer.x=pointer.screenX+viewX;pointer.y=pointer.screenY;}
canvas.addEventListener('pointermove',pointerPosition);
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;pointerPosition(e);if(state==='playing'){pointer.down=true;player.face=pointer.x>=player.x?1:-1;player.pose=makePlayerPose().pose;shoot();canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});}});
window.addEventListener('pointerup',e=>{if(e.target===canvas||e.target===$('touch-fire')){pointer.down=false;touchFiring=false;triggerLatched=false;}});window.addEventListener('pointercancel',()=>{pointer.down=false;touchFiring=false;triggerLatched=false;keys.clear();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();if(e.repeat&&['escape',' ','r','enter'].includes(key))return;if(key==='escape'||key===' '){pauseGame();return;}if(key==='enter'&&(state==='ready'||state==='over'||state==='won')){startGame();return;}if(state!=='playing')return;keys.add(key);if(key==='r')reload();if(['1','2','3','4','5'].includes(key))switchWeapon(WEAPON_ORDER[Number(key)-1]);if(key==='q'&&!e.repeat)switchWeapon(WEAPON_ORDER[(WEAPON_ORDER.indexOf(selectedWeapon)+1)%WEAPON_ORDER.length]);});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();pointer.down=false;triggerLatched=false;if(state==='playing')pauseGame();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pauseGame();});
$('start').addEventListener('click',()=>state==='paused'?pauseGame():startGame());$('pause').addEventListener('click',pauseGame);
$('sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;$('sound').innerHTML=`♫ <span>声音${soundEnabled?'开启':'关闭'}</span>`;$('sound').setAttribute('aria-label',soundEnabled?'关闭声音':'开启声音');$('sound').title=soundEnabled?'关闭声音':'开启声音';if(soundEnabled){initAudio();sound('pickup');}});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('viewport').requestFullscreen();}catch{announce('当前浏览器暂不支持全屏',2);}});
for(const button of document.querySelectorAll('[data-move]')){button.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(button.dataset.move);button.setPointerCapture(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>keys.delete(button.dataset.move));}
$('touch-reload').addEventListener('click',()=>reload());
for(const button of document.querySelectorAll('[data-weapon]'))button.addEventListener('click',()=>switchWeapon(button.dataset.weapon));
$('touch-fire').addEventListener('pointerdown',e=>{e.preventDefault();touchFiring=true;pointer.down=true;const target=[...zombies].sort((a,b)=>distance(a,player)-distance(b,player))[0];if(target){pointer.x=target.pose.shoulder.x;pointer.y=(target.pose.shoulder.y+target.pose.hip.y)/2;player.face=pointer.x>=player.x?1:-1;player.pose=makePlayerPose().pose;}shoot();$('touch-fire').setPointerCapture(e.pointerId);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('touch-fire').addEventListener(event,()=>{pointer.down=false;touchFiring=false;triggerLatched=false;});

updateHUD();
