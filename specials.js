'use strict';

// Self-contained special enemy AI. Coordinates are world coordinates, with y
// representing the feet/depth lane. Inject damagePlayer/emit/dust/sound through api.
let hostileProjectiles = [];
const MAX_HOSTILE_PROJECTILES = 36;
const specialClamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

function chooseZombieKind(wave, index) {
  const n = Math.max(0, index | 0);
  if (wave >= 2 && n % 8 === 5) return 'brute';
  if (wave >= 2 ? n % 6 === 3 : n % 10 === 7) return 'spitter';
  if (wave >= 3 ? n % 3 === 1 : n % 5 === 2) return 'runner';
  return 'normal';
}
function configureSpecial(z, kind = 'normal') {
  z.kind = kind;
  z.specialState = 'idle'; z.specialTimer = 0; z.specialDuration = 0; z.specialProgress = 0;
  z.specialCooldown = .95 + (z.phase || 0) * .12;
  z.headDamageMultiplier = 3; z.bodyDamageMultiplier = 1; z.limbThreshold = 1;
  if (kind === 'runner') {
    z.speed *= 1.28; z.scale *= .94; z.hp = Math.max(5.3, z.hp * 1.03);
    z.specialName = '疾行者';
  } else if (kind === 'brute') {
    z.speed *= .8; z.scale *= 1.12; z.hp = Math.max(18, z.hp * 3);
    z.headDamageMultiplier = 1.5; z.bodyDamageMultiplier = .68; z.limbThreshold = 3.2;
    z.specialName = '重装暴君';
  } else if (kind === 'spitter') {
    z.speed *= .9; z.hp = Math.max(8.5, z.hp * 1.45); z.specialName = '腐液喷吐者';
  }
  z.maxHp = z.hp;
  return z;
}
function resetSpecials() { hostileProjectiles.length = 0; }
function specialStage(z, state, seconds) {
  z.specialState = state; z.specialTimer = seconds; z.specialDuration = seconds; z.specialProgress = 0;
}
function specialsDisabled(z) {
  const m = z.missing || {};
  return z.dead || z.hp <= 0 || m.head || z.immobilized ||
    ((limbDisabled(z,'leg','L') || limbDisabled(z,'leg','R')) &&
      (limbDisabled(z,'arm','L') || limbDisabled(z,'arm','R')));
}
function specialDust(api, x, y, count) { if (api.dust) api.dust(x,y,count); }
function specialDamage(api, amount, sourceX) { if (api.damagePlayer) api.damagePlayer(amount,sourceX); }
function addHostile(projectile) {
  if (hostileProjectiles.length >= MAX_HOSTILE_PROJECTILES) hostileProjectiles.shift();
  hostileProjectiles.push(projectile);
}
function spitAcid(z, api) {
  const target = z.specialTarget || {x:api.player.x, y:api.player.y};
  const origin = z.pose && z.pose.head ? z.pose.head : {x:z.x, y:z.y-106*z.scale};
  const flight = specialClamp(Math.abs(target.x-origin.x)/235,.68,1.15);
  const gravity = 240;
  addHostile({kind:'acid',x:origin.x,y:origin.y,px:origin.x,py:origin.y,
    vx:(target.x-origin.x)/flight,vy:(target.y-origin.y-.5*gravity*flight*flight)/flight,
    gravity,groundY:target.y,targetX:target.x,life:flight+.15,age:0,damage:19});
  if (api.sound) api.sound('acid',z.x);
}
function updateSpecial(z, dt, api) {
  const out = {movementMultiplier:1, suppressMelee:false};
  if (specialsDisabled(z)) {
    z.specialState='idle';z.specialTimer=0;z.specialProgress=0;
    return {movementMultiplier:0,suppressMelee:true};
  }
  if (!z.kind || z.kind === 'normal') return out;
  const p = api.player, dx=p.x-z.x, dy=p.y-z.y, distance=Math.hypot(dx,dy);
  const legsLost=z.crawling||limbDisabled(z,'leg','L')||limbDisabled(z,'leg','R');
  z.specialCooldown=Math.max(0,z.specialCooldown-dt);
  if (legsLost && z.kind !== 'spitter') {
    z.specialState='idle';z.specialTimer=0;return out;
  }
  if (z.specialState === 'idle') {
    if (z.specialCooldown>0 || z.attackTime>0) return out;
    if (z.kind === 'spitter' && distance>92 && distance<420) {
      z.specialTarget={x:p.x+(p.vx||0)*.2,y:specialClamp(p.y+(p.vy||0)*.18,LANE_TOP-6,LANE_BOTTOM+4)};
      specialStage(z,'windup',.95);z.attackTime=0;
    } else if (z.kind === 'runner' && distance>58 && distance<205 && Math.abs(dy)<42) {
      z.specialTarget={x:p.x,y:p.y};specialStage(z,'windup',.47);z.attackTime=0;
    } else if (z.kind === 'brute' && distance>78 && distance<285 && Math.abs(dy)<48) {
      z.specialTarget={x:p.x,y:p.y};specialStage(z,'windup',1.0);z.attackTime=0;
    } else return out;
  }
  out.movementMultiplier=0;out.suppressMelee=true;
  z.specialTimer=Math.max(0,z.specialTimer-dt);
  z.specialProgress=1-z.specialTimer/(z.specialDuration||1);
  if (z.specialState === 'windup') {
    if (z.specialTimer>0) return out;
    if (z.kind === 'spitter') {
      spitAcid(z,api);specialStage(z,'recover',.58);z.specialCooldown=2.65;
    } else {
      const tx=z.specialTarget.x-z.x,ty=z.specialTarget.y-z.y,len=Math.hypot(tx,ty)||1;
      z.chargeX=tx/len;z.chargeY=ty/len;z.chargeHit=false;
      const chargeSpeed=z.kind==='brute'?198:238;
      specialStage(z,'charge',specialClamp(len/chargeSpeed+.08,.4,z.kind==='brute'?1.5:.95));
      z.specialCooldown=z.kind==='brute'?3.5:2.05;
      z.chargeDust=0;
      if (api.sound) api.sound('growl',z.x);
    }
  } else if (z.specialState === 'charge') {
    const speed=z.kind==='brute'?198:238, oldX=z.x, oldY=z.y;
    z.x+=z.chargeX*speed*dt;z.y=specialClamp(z.y+z.chargeY*speed*dt,LANE_TOP-6,LANE_BOTTOM+4);
    z.face=z.chargeX>=0?1:-1;z.phase+=dt*(z.kind==='brute'?13:21);
    z.chargeDust-=dt;if(z.chargeDust<=0){z.chargeDust=.075;specialDust(api,z.x,z.y,z.kind==='brute'?3:1);}
    // Swept collision avoids skipping the player at low frame rates.
    const sx=z.x-oldX,sy=z.y-oldY,len2=sx*sx+sy*sy;
    const t=len2?specialClamp(((p.x-oldX)*sx+(p.y-oldY)*sy)/len2,0,1):0;
    if (!z.chargeHit&&Math.hypot(p.x-oldX-sx*t,p.y-oldY-sy*t)<30) {
      z.chargeHit=true;specialDamage(api,z.kind==='brute'?33:22,z.x);
      specialStage(z,'recover',z.kind==='brute'?1.05:.62);
    } else if (z.specialTimer<=0) specialStage(z,'recover',z.kind==='brute'?1.05:.62);
  } else if (z.specialState === 'recover' && z.specialTimer<=0) {
    specialStage(z,'idle',0);
  }
  return out;
}
function acidSplash(projectile, api) {
  for(let i=0;i<9;i++) if(api.emit) api.emit({kind:'dust',x:projectile.x,y:projectile.groundY,
    vx:(Math.random()-.5)*65,vy:-12-Math.random()*30,life:.3+Math.random()*.3,
    size:1+Math.random()*2,color:i%2?'#c8d36b':'#738540',gravity:120,drag:2,floor:projectile.groundY});
  return {kind:'pool',x:projectile.x,y:projectile.groundY,life:4.2,age:0,radius:23,tick:.1};
}
function updateHostileProjectiles(dt, api) {
  const additions=[];
  for(const a of hostileProjectiles) {
    a.life-=dt;a.age+=dt;
    if(a.kind==='pool') {
      a.tick-=dt;
      if(a.tick<=0) {
        a.tick=.65;
        if(Math.abs(api.player.x-a.x)<a.radius&&Math.abs(api.player.y-a.y)<10)specialDamage(api,9,a.x);
      }
      continue;
    }
    a.px=a.x;a.py=a.y;a.x+=a.vx*dt;a.y+=a.vy*dt+.5*a.gravity*dt*dt;a.vy+=a.gravity*dt;
    const p=api.player;
    const minX=Math.min(a.px,a.x),maxX=Math.max(a.px,a.x);
    if(a.age>.22&&Math.abs(p.y-a.groundY)<17&&p.x+12>=minX&&p.x-12<=maxX&&a.y>p.y-128&&a.y<p.y-10) {
      specialDamage(api,a.damage,a.x);a.life=0;additions.push(acidSplash(a,api));
    } else if(a.y>=a.groundY||a.life<=0) {
      a.life=0;additions.push(acidSplash(a,api));
    }
  }
  const left=Number.isFinite(api.cameraLeft)?api.cameraLeft-480:-Infinity;
  const right=Number.isFinite(api.cameraRight)?api.cameraRight+480:Infinity;
  hostileProjectiles=hostileProjectiles.filter(a=>a.life>0&&a.x>left&&a.x<right);
  for(const a of additions)if(a.x>left&&a.x<right)addHostile(a);
}
function drawSpecialProjectiles(c, layer = 'all') {
  c.save();
  for(const a of hostileProjectiles) {
    if(layer==='ground'&&a.kind!=='pool')continue;
    if(layer==='air'&&a.kind==='pool')continue;
    const x=Math.round(a.x),y=Math.round(a.y);
    if(a.kind==='pool') {
      const radius=Math.round(a.radius*Math.min(1,a.age*5+.45));
      c.globalAlpha=Math.min(1,a.life)*.8;
      c.fillStyle='#515f2e';c.fillRect(x-radius,y-3,radius*2,6);c.fillRect(x-radius+5,y-5,radius*2-10,10);
      c.fillStyle='#95a44a';c.fillRect(x-radius+4,y-1,radius*2-8,3);
      c.fillStyle='#c0c866';
      for(let i=0;i<4;i++) {const bx=x+Math.round(Math.sin(i*8.3)*radius*.8),by=y-2-Math.round((a.age*11+i*2)%5);c.fillRect(bx,by,2,2);}
    } else {
      c.globalAlpha=.3;c.fillStyle='#aaba50';
      c.fillRect(Math.round(a.px)-2,Math.round(a.py)-2,4,4);
      c.globalAlpha=1;c.fillStyle='#6b8132';c.fillRect(x-4,y-2,8,4);c.fillRect(x-2,y-4,4,8);
      c.fillStyle='#d2db74';c.fillRect(x-2,y-2,4,3);
      // Fixed destination marker makes the lob readable before it lands.
      c.globalAlpha=.34;c.fillStyle='#b0c057';c.fillRect(Math.round(a.targetX)-10,Math.round(a.groundY),20,1);
    }
  }
  c.restore();
}
// Death hooks called by killZombie before the body rig is built. api carries the effect helpers
// (bloodBurst, sever, textParticle, addDecal, emit, dir, headPoint); return punch overrides or null.
function onSpecialDeath(z, api = {}) {
  const dir = api.dir || 0, x = z.x, y = z.y, head = api.headPoint || (z.pose && z.pose.head) || {x, y: y - 40};
  if (z.kind === 'brute') {
    // Tyrant: tear off both arms and the head, then the torso flies. Bigger burst, longer freeze.
    if (typeof api.sever === 'function') {
      for (const part of ['armL', 'armR']) if (!z.missing[part]) api.sever(z, part, dir + (part === 'armL' ? -.4 : .4), 2.4);
      if (!z.missing.head) { api.sever(z, 'head', dir, 2.8); }
    }
    if (typeof api.bloodBurst === 'function') api.bloodBurst(head.x, head.y + 8, dir, y, 46, 1.7, {up: 90, chunks: true});
    if (typeof api.textParticle === 'function') api.textParticle(head.x, head.y - 24, 'TYRANT DOWN', '#ffb09a', 11);
    if (api.sound) api.sound('fall', x);
    return {hitStop: .16, shake: 5, killFlash: .26};
  }
  if (z.kind === 'spitter') {
    // Acid sac ruptures: a green splash that stains the road.
    for (let i = 0; i < 12; i++) if (api.emit) api.emit({kind: 'blood', x: head.x + (Math.random() - .5) * 6, y: head.y + 10,
      vx: Math.cos(dir) * 30 + (Math.random() - .5) * 120, vy: -40 - Math.random() * 70, life: .7 + Math.random() * .5,
      size: 1 + Math.random() * 2.2, color: i % 3 ? '#abc449' : '#d2db74', gravity: 200, drag: .5, floor: y + (Math.random() - .5) * 6});
    if (typeof api.addDecal === 'function') for (let i = 0; i < 7; i++) api.addDecal(x + (Math.random() - .5) * 30, y + (Math.random() - .5) * 6, 2 + Math.random() * 4, '#6d913e');
    if (api.sound) api.sound('acid', x);
    return {hitStop: .09, shake: 2.4};
  }
  return null;
}
