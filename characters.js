'use strict';

const TAU = Math.PI * 2;
const mix = (a, b, t) => a + (b - a) * t;
const pointMix = (a, b, t) => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Each outfit has a different silhouette and gait, not just a palette swap.
// size scales the whole skeleton, head the skull, limb the limb thickness; all of them are applied
// inside makeZombiePose/draw so hitShapes follow, and never through z.scale (owned by specials.js).
const ZOMBIE_FORMS = [
  {leg:1.08,torso:1.03,width:.86,hunch:3,drag:2,reach:1.05,tilt:-.12},
  {leg:.97,torso:1.02,width:1.15,hunch:5,drag:5,reach:.96,tilt:.09},
  {leg:1.04,torso:1.05,width:.92,hunch:2,drag:3,reach:1.02,tilt:-.08},
  {leg:.94,torso:.98,width:1.12,hunch:9,drag:2,reach:.96,tilt:.15},
  {leg:1.2,torso:1.02,width:.7,hunch:6,drag:7,reach:1.12,tilt:-.16,head:.92,limb:.85},   // tall: stretched legs, narrow
  {leg:1.04,torso:.96,width:.87,hunch:7,drag:2,reach:1.03,tilt:.12},
  {leg:1,torso:1.04,width:1,hunch:1,drag:6,reach:1,tilt:-.06},
  {leg:.85,torso:.9,width:1.4,hunch:4,drag:3,reach:.94,tilt:.1,head:1.08,limb:1.25}     // fat: short, wide, thick limbs
];
const SPECIAL_ZOMBIE_FORMS = {
  runner: {leg:1.02,torso:.94,width:.8,hunch:20,drag:16,reach:1.06,tilt:.22,size:.85,head:1,limb:.9,bound:true},
  brute: {leg:.92,torso:1.05,width:1.35,hunch:5,drag:4,reach:1.08,tilt:-.04,size:1.3,head:1.3,limb:1.6},   // ×1.45 overall with the 1.12 z.scale from specials.js
  spitter: {leg:1.02,torso:1.07,width:1.12,hunch:10,drag:3,reach:.9,tilt:.18,head:1.1}
};
const zombieForm = z => SPECIAL_ZOMBIE_FORMS[z.kind] || ZOMBIE_FORMS[z.type % ZOMBIE_FORMS.length];
const spriteScale = z => z.scale * (zombieForm(z).size || 1);
// Proximal loss also disables its distal segment; distal loss keeps the upper limb.
function limbDisabled(z,part,side){const m=z.missing||{};return Boolean(m[part+side]||m[(part==='arm'?'forearm':'shin')+side]);}
function limbThreshold(z,part){const base=part.startsWith('forearm')?1.15:part.startsWith('shin')?1.45:part.startsWith('arm')?1.7:2.2;return base*(z.limbThreshold||1);}
function drawStump(c,p,s,color){rect(c,p.x-4*s,p.y-3*s,8*s,5*s,color);rect(c,p.x-s,p.y-3*s,2*s,4*s,'#c6b48a');rect(c,p.x-2*s,p.y+2*s,3*s,3*s,'#642016');}
const playerWeaponArt = () => typeof getWeapon === 'function' ? getWeapon() : {id:'rifle',barrelLength:50,gripX:32,triggerX:13,stockLength:12,reloadDuration:1.85};
const smoothStep = t => (t=clamp(t,0,1),t*t*(3-2*t));
const gameTime = () => typeof worldTime === 'number' ? worldTime : 0;
// Derived palette entries (cheeks, sockets, lips) follow each outfit's skin instead of hardcoded olive.
const tintCache = new Map();
function tint(hex, factor) {
  const key = hex + factor; let value = tintCache.get(key); if (value) return value;
  const n = parseInt(hex.slice(1, 7), 16);
  const channel = shift => clamp(Math.round(((n >> shift) & 255) * factor), 0, 255).toString(16).padStart(2, '0');
  value = '#' + channel(16) + channel(8) + channel(0); tintCache.set(key, value); return value;
}
function shotgunPumpOffset(progress, reloading, kick) {
  if(!reloading)return Math.max(0,kick)*.5;
  // Grip is back on the fore-end before the chambering stroke starts.
  return progress>.86?Math.sin(smoothStep((progress-.86)/.14)*Math.PI)*6:0;
}

// One shared offscreen buffer pair adds the 1 px outline and the full-silhouette hit flash to every actor.
// Cost per actor: 4 stamps for the dilated mask + 2 composites = 6 drawImage calls, sized to the sprite bounds.
const SPRITE_BUFFER = 256;
let spriteDepth = 0, spriteBuffers = null;
function getSpriteBuffers() {
  if (spriteBuffers !== null) return spriteBuffers;
  spriteBuffers = false;
  try {
    if (typeof document !== 'undefined' && document.createElement) {
      const make = () => { const canvas = document.createElement('canvas'); canvas.width = SPRITE_BUFFER; canvas.height = SPRITE_BUFFER; const ctx = canvas.getContext('2d'); if (!ctx) throw Error('no 2d context'); ctx.imageSmoothingEnabled = false; return { canvas, ctx }; };
      spriteBuffers = { sprite: make(), mask: make() };
    }
  } catch (e) { spriteBuffers = false; }
  return spriteBuffers;
}
function poseBounds(pose, pad) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of Object.values(pose)) { if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue; x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  return x0 === Infinity ? null : { x0: x0 - pad, y0: y0 - pad, x1: x1 + pad, y1: y1 + pad };
}
const hitFlash = z => z.hit > .07 ? (z.kind === 'brute' ? '#ffb09a' : '#fff6e0') : null;
function drawOutlined(c, bounds, paint, flash = null, outline = '#141a14') {
  const buffers = spriteDepth === 0 && bounds ? getSpriteBuffers() : false;
  const x0 = Math.floor(bounds ? bounds.x0 : 0) - 2, y0 = Math.floor(bounds ? bounds.y0 : 0) - 2;
  const w = Math.min(SPRITE_BUFFER, Math.ceil(bounds ? bounds.x1 : 0) - x0 + 3), h = Math.min(SPRITE_BUFFER, Math.ceil(bounds ? bounds.y1 : 0) - y0 + 3);
  if (!buffers || !(w > 0 && h > 0) || !Number.isFinite(x0 + y0 + w + h)) { paint(c); return; }
  const sc = buffers.sprite.ctx, mc = buffers.mask.ctx;
  spriteDepth++;
  sc.save(); sc.globalAlpha = 1; sc.globalCompositeOperation = 'source-over'; sc.clearRect(0, 0, w, h); sc.translate(-x0, -y0);
  try { paint(sc); } finally { sc.restore(); spriteDepth--; }
  if (flash) { sc.save(); sc.globalCompositeOperation = 'source-atop'; sc.globalAlpha = .9; sc.fillStyle = flash; sc.fillRect(0, 0, w, h); sc.restore(); }
  mc.save(); mc.globalAlpha = 1; mc.globalCompositeOperation = 'source-over'; mc.clearRect(0, 0, w, h);
  mc.drawImage(buffers.sprite.canvas, 0, 0, w, h, 1, 0, w, h); mc.drawImage(buffers.sprite.canvas, 0, 0, w, h, -1, 0, w, h);
  mc.drawImage(buffers.sprite.canvas, 0, 0, w, h, 0, 1, w, h); mc.drawImage(buffers.sprite.canvas, 0, 0, w, h, 0, -1, w, h);
  mc.globalCompositeOperation = 'source-in'; mc.fillStyle = outline; mc.fillRect(0, 0, w, h); mc.restore();
  c.drawImage(buffers.mask.canvas, 0, 0, w, h, x0, y0, w, h);
  c.drawImage(buffers.sprite.canvas, 0, 0, w, h, x0, y0, w, h);
}

// Two-bone IK keeps knees and elbows connected throughout the animation.
function solveJoint(a, b, upper, lower, bend = -1) {
  const raw = distance(a, b), d = clamp(raw, Math.abs(upper-lower)+.001, upper + lower - .001);
  const ux = (b.x - a.x) / (raw || 1), uy = (b.y - a.y) / (raw || 1);
  const along = (upper * upper - lower * lower + d * d) / (2 * d);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  return { x: a.x + ux * along - uy * height * bend, y: a.y + uy * along + ux * height * bend };
}
function footCycle(phase, span, lift, stance = .62) {
  const t = ((phase / TAU) % 1 + 1) % 1;
  if (t < stance) return { x: mix(span, -span, t / stance), y: 0 };
  const p = (t - stance) / (1 - stance);
  return { x: mix(-span, span, smoothStep(p)), y: -Math.sin(p * Math.PI) * lift };
}
function toWorld(pose, entity, scale) {
  const result = {};
  for (const [name, p] of Object.entries(pose)) result[name] = { x: entity.x + p.x * entity.face * scale, y: entity.y + p.y * scale };
  return result;
}
// Attack timeline (shared with game.js): total .72 s; wind-up while attackTime>.42, lunge .42→.30, recovery .30→0.
function attackCurves(attackTime) {
  const at = attackTime > 0 ? attackTime : 0;
  if (at <= 0) return { lean: 0, arm: 0, crouch: 0, head: 0 };
  if (at > .42) { const w = smoothStep((.72 - at) / .30); return { lean: -12 * w, arm: -14 * w, crouch: 6 * w, head: -3 * w }; }
  if (at > .30) { const l = smoothStep((.42 - at) / .12); return { lean: mix(-12, 16, l), arm: mix(-14, 24, l), crouch: mix(6, 1, l), head: mix(-3, 6, l) }; }
  const r = (.30 - at) / .30, e = smoothStep(r), over = Math.sin(r * Math.PI);
  return { lean: 16 * (1 - e) - 4 * over, arm: 24 * (1 - e) - 6 * over, crouch: 2 * over, head: 6 * (1 - e) - 2 * over };
}
function makeZombiePose(z) {
  const form=zombieForm(z), phase = z.phase, stride = Math.sin(phase), recoil = z.flinch || 0, size=form.size||1;
  const t=gameTime(), idle=Math.sin(t*2.6+z.type), idle2=Math.sin(t*2.6+z.type+1.1);
  const bob = Math.sin(phase * 2) * .9 + Math.sin(phase+z.type)*.55;
  const plant = Math.pow(Math.max(0, Math.cos(phase * 2)), 8);   // squash when a foot lands
  const attack=attackCurves(z.attackTime);
  const stagger=smoothStep(clamp(z.stagger||0,0,.35)/.35), climb=clamp(z.climb||0,0,1), airY=Math.max(0,z.airY||0), downed=Math.max(0,z.downed||0);
  const specialProgress=clamp(z.specialProgress||0,0,1),winding=z.specialState==='windup',charging=z.specialState==='charge';
  const brace=winding?smoothStep(specialProgress):charging?1:0;
  const specialLean=z.kind==='brute'?(winding?-6*brace:charging?17:0):z.kind==='spitter'&&winding?-8*brace:0;
  const lean = form.hunch + Math.sin(phase + z.type) * 2.5 + attack.lean + recoil * z.face * 7 + specialLean + idle*1.5 - 14*stagger + 6*climb;
  const armUpper=19*form.reach, armLower=20*form.reach, legUpper=28*form.leg, legLower=28*form.leg;
  let pose;
  if (z.crawling) {
    const shoulder = { x: 10 + stride * 2 + recoil * z.face * 3, y: -22 + bob + idle2*.6 };
    pose = {
      hip: { x: -16, y: -11 }, shoulder, head: { x: shoulder.x + 12 + idle*.8, y: shoulder.y - 9 },
      footL: { x: -44, y: 0 }, footR: { x: -38, y: -2 },
      handL: { x: 22 + stride * 14, y: -1 - Math.max(0, stride) * 6 }, handR: { x: 30 - stride * 15, y: -1 - Math.max(0, -stride) * 6 }
    };
    pose.kneeL = { x: -32, y: -8 }; pose.kneeR = { x: -30, y: -3 };
    pose.elbowL = solveJoint(shoulder, pose.handL, armUpper, armLower, 1);
    pose.elbowR = solveJoint(shoulder, pose.handR, armUpper, armLower, -1);
  } else {
    const hip = { x: Math.sin(phase) * (z.limping?3:1.7), y: -50*form.leg + bob + plant*1.5 + Math.abs(recoil)*1.8 + (z.limping?4+Math.abs(stride)*3:0) + attack.crouch - 22*climb };
    const shoulder = { x: hip.x + lean, y: hip.y-27*form.torso + Math.abs(recoil) * 3 + plant*1.2 + Math.sin(phase*2-.6)*.8 + idle2 };
    const bounding=Boolean(form.bound), strideSpan=bounding?24:16;
    const left = footCycle(phase, strideSpan*form.leg, bounding?16:5, bounding?.45:.7), right = footCycle(phase + Math.PI, (strideSpan-1)*form.leg, bounding?16:form.drag, bounding?.45:.78);
    pose = {
      hip, shoulder,
      head: { x: shoulder.x + 2 + form.hunch*.26 + recoil * z.face * 9 + Math.sin(phase * .7+z.type) * 2 + idle2*1.2 + attack.head - 6*stagger, y: shoulder.y - 17 + Math.sin(phase+.5)*.8 + 2*stagger },
      footL: { x: left.x - 3 - 10*stagger, y: left.y }, footR: { x: right.x + 3, y: right.y },
      handL: { x: shoulder.x + (26 + Math.sin(phase + 1) * 4)*form.reach + attack.arm + idle*2 - 6*stagger + 10*climb, y: shoulder.y + 10 + Math.cos(phase) * 6 - attack.arm*.5 - 18*stagger - 14*climb },
      handR: { x: shoulder.x + (28 + Math.sin(phase + z.type) * 5)*form.reach + attack.arm + idle*2 - 6*stagger + 10*climb, y: shoulder.y + 19 + Math.sin(phase + .8) * 8 - attack.arm*.6 - 18*stagger - 14*climb }
    };
    pose.kneeL = solveJoint(hip, pose.footL, legUpper, legLower, -1);
    pose.kneeR = solveJoint(hip, pose.footR, legUpper, legLower, -1);
    pose.elbowL = solveJoint(shoulder, pose.handL, armUpper, armLower, 1);
    pose.elbowR = solveJoint(shoulder, pose.handR, armUpper, armLower, 1);
  }
  if(!z.crawling&&z.kind==='brute'&&(winding||charging)) {
    for(const side of ['L','R']) {
      const front=side==='R';
      const target={x:pose.shoulder.x+(charging?30:10)+(front?3:0),y:pose.shoulder.y+(charging?6:20)};
      pose['hand'+side]=pointMix(pose['hand'+side],target,brace);
      pose['elbow'+side]=solveJoint(pose.shoulder,pose['hand'+side],armUpper,armLower,1);
    }
    pose.head.x+=charging?7:0;pose.head.y+=brace*2;
  }
  if(!z.crawling&&z.kind==='spitter'&&winding) {
    pose.head.x-=brace*4;pose.head.y-=brace*5;
    pose.handR=pointMix(pose.handR,{x:pose.shoulder.x+10,y:pose.shoulder.y+19},brace);
    pose.elbowR=solveJoint(pose.shoulder,pose.handR,armUpper,armLower,1);
  }
  if(downed>0&&!z.crawling) {
    // Knocked flat on the back, head away from the player; rises during the last .35 s.
    const rise=downed<.35?smoothStep(1-downed/.35):0, twitch=Math.sin(t*9+z.type)*(1-rise);
    const lying={hip:{x:-2,y:-8},shoulder:{x:-26,y:-11},head:{x:-42,y:-10+twitch*.6},footL:{x:16,y:0},footR:{x:24,y:-2},handL:{x:-14,y:-2+twitch},handR:{x:-6,y:-4-twitch}};
    lying.kneeL=solveJoint(lying.hip,lying.footL,legUpper,legLower,-1);lying.kneeR=solveJoint(lying.hip,lying.footR,legUpper,legLower,-1);
    lying.elbowL=solveJoint(lying.shoulder,lying.handL,armUpper,armLower,-1);lying.elbowR=solveJoint(lying.shoulder,lying.handR,armUpper,armLower,-1);
    for(const name of Object.keys(pose))pose[name]=pointMix(lying[name],pose[name],rise);
  }
  const world=toWorld(pose, z, z.scale*size);
  if(airY>0)for(const p of Object.values(world))p.y-=airY;
  return world;
}
function makePlayerPose() {
  const p = player, weapon=playerWeaponArt(), movement = clamp(Math.hypot(p.vx, p.vy) / 55, 0, 1), t=gameTime();
  const flinch=clamp(p.flinch||0,-1,1), flinchLean=flinch*p.face;   // positive flinch = pushed toward +x world
  const breathe=Math.sin(t*1.9)*1.2*(1-movement), headBreathe=Math.sin(t*1.9-.55)*1.2*(1-movement), sprint=p.sprinting?movement:0;
  const movingLean = p.vx * p.face / 55 * 2, bob = Math.sin(p.walk * 2) * .65 * movement;
  const hip = { x: -2 - p.kick*.12 + flinchLean*3, y: -60 + bob + p.kick*.08 };
  const shoulder = { x: 4 + movingLean - p.kick * .66 + sprint*8 + flinchLean*8, y: -94 + bob + p.kick*.13 + breathe + sprint*2 };
  const stride=p.sprinting?24:18, lift=p.sprinting?11:7;
  const left = footCycle(p.walk, stride, lift), right = footCycle(p.walk + Math.PI, stride, lift);
  const pose = {
    hip, shoulder, head: { x: shoulder.x + 4 - p.kick*.22 + sprint*2 + flinchLean*2, y: shoulder.y - 19 + p.kick*.12 + headBreathe + sprint*3 },
    footL: { x: mix(-17, left.x - 3, movement), y: left.y * movement },
    footR: { x: mix(16, right.x + 3, movement), y: right.y * movement }
  };
  pose.kneeL = solveJoint(hip, pose.footL, 32, 32, -1);
  pose.kneeR = solveJoint(hip, pose.footR, 32, 32, -1);
  const world = toWorld(pose, p, PLAYER_SCALE);
  const pivot={x:shoulder.x-2,y:shoulder.y+3};
  const shoulderWorld = toWorld({pivot},p,PLAYER_SCALE).pivot;
  const aim = Math.atan2(pointer.y - shoulderWorld.y, (pointer.x - shoulderWorld.x)*p.face);
  const progress = reloadTime > 0 ? 1 - reloadTime / (typeof getReloadDuration==='function'?getReloadDuration():weapon.reloadDuration) : 0;
  const tilt = reloadTime > 0 ? Math.sin(progress * Math.PI) * .5 : 0;
  const sway=Math.sin(p.walk)*movement*.005+Math.sin(t*1.5)*.01;
  let angle = aim - (p.climb||0) - p.kick*.009 + tilt + sway + .15*Math.abs(flinch);
  const swing=weapon.melee&&meleeSwing,phase=swing?clamp(swing.elapsed/weapon.swingDuration,0,1):0;
  if(weapon.melee){
    const lockedAim=swing?(p.face===1?swing.angle:Math.PI-swing.angle):aim,backswing=-weapon.arc-.4,followThrough=weapon.arc-.4;
    angle=lockedAim+(swing?(phase<.26?mix(-.65,backswing,smoothStep(phase/.26)):phase<.64?mix(backswing,followThrough,smoothStep((phase-.26)/.38)):mix(followThrough,-.65,smoothStep((phase-.64)/.36))):-.65);
  }
  // Rotate around the buttstock, so the stock remains against the shoulder.
  const reach=weapon.id==='pistol'?23:weapon.melee?19:(weapon.stockLength||12)-Math.min(3,p.kick*.35);
  const gunOrigin = { x: pivot.x + Math.cos(angle)*reach, y: pivot.y + Math.sin(angle)*reach + tilt*3+(weapon.melee?7:0) };
  const gunPoint = (x, y) => ({ x: gunOrigin.x + Math.cos(angle) * x - Math.sin(angle) * y, y: gunOrigin.y + Math.sin(angle) * x + Math.cos(angle) * y });
  const pump=weapon.id==='shotgun'?shotgunPumpOffset(progress,reloadTime>0,p.kick):0;
  const trigger = gunPoint(weapon.triggerX ?? 13, 6), grip = gunPoint((weapon.gripX ?? 32)-pump, 2);
  pose.handR = trigger;
  if (reloadTime > 0) {
    const magazine = gunPoint(weapon.id==='shotgun'?22:19, weapon.id==='shotgun'?6:15), belt = { x: hip.x + 9, y: hip.y - 3 };
    const reach = progress < .25 ? smoothStep(progress / .25) : progress < .52 ? 1 : progress < .76 ? 1 - smoothStep((progress - .52) / .24) : 0;
    const loadingHand=pointMix(magazine,belt,clamp(reach,0,1));
    if(progress<.08)pose.handL=pointMix(grip,loadingHand,smoothStep(progress/.08));
    else if(progress<=.76)pose.handL=loadingHand;
    else if(weapon.id==='shotgun')pose.handL=pointMix(magazine,grip,smoothStep((progress-.76)/.1));
    else {
      const boltStroke=progress>.86&&progress<.92?Math.sin(smoothStep((progress-.86)/.06)*Math.PI)*3:0;
      const bolt=gunPoint(8-boltStroke,-3);
      pose.handL=progress<.86?pointMix(magazine,bolt,smoothStep((progress-.76)/.1)):
        progress<.92?bolt:pointMix(bolt,grip,smoothStep((progress-.92)/.08));
    }
  } else pose.handL = weapon.melee?{x:shoulder.x+8,y:shoulder.y+23}:grip;
  pose.elbowL = solveJoint(shoulder, pose.handL, 22, 23, 1);
  pose.elbowR = solveJoint({ x: shoulder.x - 4, y: shoulder.y + 3 }, pose.handR, 21, 23, 1);
  const result = toWorld(pose, p, PLAYER_SCALE);
  const origin = toWorld({ origin: gunOrigin }, p, PLAYER_SCALE).origin;
  return { pose: result, gun: { origin, angle, face: p.face, progress, pump, localPoint: gunPoint }, weapon };
}

function bone(c, a, b, width, color) { limb(c, a.x, a.y, b.x, b.y, width, color); }
function taperedBone(c,a,b,startWidth,endWidth,color,highlight){
  const d=distance(a,b)||1,nx=-(b.y-a.y)/d,ny=(b.x-a.x)/d;
  poly(c,[[a.x+nx*startWidth/2,a.y+ny*startWidth/2],[b.x+nx*endWidth/2,b.y+ny*endWidth/2],[b.x-nx*endWidth/2,b.y-ny*endWidth/2],[a.x-nx*startWidth/2,a.y-ny*startWidth/2]],color);
  if(highlight)bone(c,{x:a.x+nx*startWidth*.25,y:a.y+ny*startWidth*.25},{x:b.x+nx*endWidth*.25,y:b.y+ny*endWidth*.25},Math.max(1,startWidth*.18),highlight);
}
function bonePatch(c,a,b,t,length,width,color,offset=0){
  c.save();const p=pointMix(a,b,t);c.translate(p.x,p.y);c.rotate(Math.atan2(b.y-a.y,b.x-a.x));rect(c,0,-width/2+offset,length,width,color);c.restore();
}
function drawBoot(c, p, scale, face, color, angle = 0) {
  c.save(); c.translate(p.x, p.y); c.rotate(angle); c.scale(face * scale, scale);
  poly(c,[[-4,-4],[3,-4],[4,-2],[8,-1],[9,2],[-4,2]],color);rect(c,-3,-3,5,1,'#68533b');rect(c,-4,1,13,2,'#252820');rect(c,5,0,3,1,'#76543b');c.restore();
}
// Head art lives in "skull units": the skull polygon spans x ±10, y -14..12 before the head multiplier.
function paintZombieHead(c, z, center, angle, detached) {
  const o = outfits[z.type % outfits.length], form=zombieForm(z), s=spriteScale(z)*(form.head||1);
  const cheek=tint(o.skin,1.16), socket=tint(o.shade,.55), lip=tint(o.shade,.42), gum='#5a1c18', eye=detached?'#8da33b':'#e6ff3a';
  c.save(); c.translate(center.x, center.y); c.rotate(angle+(z.ragdoll?0:form.tilt*z.face)); c.scale(z.face * s, s);
  const jaw=detached?3:z.attackTime>.42?5:z.attackTime>0?2:z.type%3===0?1:0;
  poly(c,[[-10,-12],[-4,-14],[7,-14],[10,-10],[10,3],[8,10],[2,12],[-6,11],[-10,5]],o.skin);
  rect(c,-10,-4,3,11,o.shade);rect(c,-7,-9,6,7,cheek);
  rect(c,8,-3,3,7,o.skin);rect(c,9,2,2,3,o.shade);
  rect(c,-10,-17,20,6,o.hair);rect(c,-10,-12,4,13,o.hair);rect(c,-4,-16,7,2,tint(o.hair,1.3));
  if (z.type === 3) { rect(c,-12,-17,25,8,'#c4501a');rect(c,-12,-10,5,19,'#b94816');rect(c,-9,9,24,5,'#ad4715'); }
  if (z.type === 5) { rect(c,-13,-15,5,33,o.hair);rect(c,10,-11,4,28,o.hair); }
  if (z.type === 7) { rect(c,-13,-19,26,10,'#122745');rect(c,-13,-10,8,22,'#182e4b');rect(c,-9,9,24,7,'#132847'); }
  if (z.type === 1) { rect(c,-12,-19,25,8,'#272b23');rect(c,8,-12,11,4,'#25291f'); }
  if(z.kind==='runner') {rect(c,-11,-13,23,4,'#9b3525');poly(c,[[-10,-11],[-22,-7],[-17,0],[-10,-6]],'#843226');}
  if(z.kind==='brute') {poly(c,[[-14,-13],[-10,-21],[9,-21],[15,-13],[15,-8],[-14,-8]],'#8e752c');rect(c,-8,-20,2,9,'#c0a443');rect(c,-14,-8,30,4,'#3b4136');rect(c,-10,3,22,9,'#3f4a41');rect(c,-6,5,15,3,'#768276');}
  if(z.kind==='spitter') {const swell=z.specialState==='windup'?Math.sin((z.specialProgress||0)*Math.PI)*3:0;poly(c,[[-12-swell,0],[-17,5],[-14,15],[-5,18],[0,10]],'#596e37');rect(c,-14-swell,5,6+swell,6,'#abc449');rect(c,-12,8,3,3,'#d2db73');rect(c,9,9,5,9,'#6d913e');}
  rect(c,-5,-7,8,7,socket);rect(c,5,-7,6,7,socket);
  rect(c,-3,-6,5,5,eye);rect(c,6,-6,4,5,eye);
  rect(c,-1,-5,2,3,'#1e2a1c');rect(c,7,-5,2,3,'#1e2a1c');
  rect(c,-3,-6,1,1,detached?'#b7c56a':'#ffffb0');rect(c,6,-6,1,1,detached?'#b7c56a':'#ffffb0');
  if (z.type % 3 === 0) { rect(c,-6,-3,4,10,o.blood);rect(c,-2,-1,2,3,'#dfff3c'); }
  if(z.headTrauma>0&&!detached){rect(c,3,-11,3,10,o.blood);rect(c,4,-3,5,3,'#641e17');if(z.kind==='brute'){rect(c,2,-17,6,3,'#383c30');rect(c,5,-14,2,6,'#bda879');}}
  rect(c,0,6,10,4+jaw,lip);if(jaw>2)rect(c,1,8,8,jaw-1,gum);
  rect(c,1,6,3,2,'#e5dcb4');rect(c,5,6,2,2,'#e5dcb4');rect(c,2,8+jaw,3,2,'#e5dcb4');rect(c,4,10+jaw,6,2,o.shade);
  if(z.type%2===0){rect(c,8,2,3,6,o.blood);rect(c,6,10+jaw,3,3,o.blood);}
  if(detached){rect(c,-4,11,9,3,o.blood);rect(c,-1,12,3,3,'#641e17');}
  c.restore();
}
function drawZombieHead(c, z, center, angle, flash = false, detached = false) {
  if (spriteDepth > 0) { paintZombieHead(c, z, center, angle, detached); return; }
  const r = 23 * spriteScale(z) * (zombieForm(z).head || 1);
  drawOutlined(c, { x0: center.x - r, y0: center.y - r, x1: center.x + r, y1: center.y + r }, cc => paintZombieHead(cc, z, center, angle, detached), flash ? '#fff6e0' : hitFlash(z));
}
function paintZombiePart(c,z,pose,side,part,alpha=1){
  const o=outfits[z.type%outfits.length],form=zombieForm(z),s=spriteScale(z),lm=form.limb||1,far=side==='L',width=form.width;
  const arm=part==='arm',root=pose[arm?'shoulder':'hip'],joint=pose[(arm?'elbow':'knee')+side],end=pose[(arm?'hand':'foot')+side];
  const distal=(arm?'forearm':'shin')+side,upper=part+side,m=z.missing||{};
  const skin=far?o.shade:o.skin,pants=far?tint(o.pants,.78):o.pants,shirt=far?tint(o.shirt,.8):o.shirt;
  // Detached segments have only the nodes that still existed at the moment of severing.
  const upperVisible=Boolean(root&&joint),lowerVisible=Boolean(joint&&end&&!m[distal]);
  c.save();c.globalAlpha*=alpha;
  if(upperVisible){
    if(arm){
      taperedBone(c,root,joint,9*s*lm,7*s*lm,skin,far?null:o.shade);
      taperedBone(c,root,pointMix(root,joint,z.type===2?.4:.66),11*s*lm*width,8.5*s*lm,shirt);
      bonePatch(c,root,joint,.42,2*s,6*s*lm,'#333c3070');
      if(z.kind==='brute')taperedBone(c,root,pointMix(root,joint,.62),13*s,11*s,'#515c4c',far?null:'#79816b');
      if(z.kind==='runner')bonePatch(c,root,joint,.35,4*s,8*s*lm,'#a4412b');
    }else{
      taperedBone(c,root,joint,12*s*lm*width,9*s*lm,pants,far?null:tint(o.pants,1.22));
      bonePatch(c,root,joint,.55,4*s,5*s*lm,o.shade);bonePatch(c,root,joint,.57,2*s,3.5*s*lm,o.skin);
    }
    if((z.limbHits?.[upper]||0)>0){bonePatch(c,root,joint,.57,4*s,(arm?7:10)*s*lm,o.blood);bonePatch(c,root,joint,.6,2*s,2*s,'#c0ad84');}
    if(m[distal])drawStump(c,joint,s*lm,o.blood);
  }
  if(lowerVisible){
    if(arm){
      taperedBone(c,joint,end,8*s*lm,6*s*lm,skin,far?null:o.shade);
      rect(c,joint.x-2.5*s*lm,joint.y-2.5*s*lm,5*s*lm,4*s*lm,o.shade);
      bone(c,pointMix(joint,end,.28),pointMix(joint,end,.47),7*s*lm,o.blood);
      if(z.kind==='brute'){taperedBone(c,pointMix(joint,end,.15),pointMix(joint,end,.8),9*s,7.5*s,'#3b493d',far?null:'#69755d');bonePatch(c,joint,end,.23,2*s,9.5*s,'#a68c42');}
      if(z.kind==='spitter')bonePatch(c,joint,end,.57,4*s,7*s*lm,'#a0b44f');
      // Chunky 7x6 hand with two splayed fingers.
      c.save();c.translate(end.x,end.y);c.rotate(Math.atan2(end.y-joint.y,end.x-joint.x));c.scale(s*lm,s*lm);
      rect(c,-2,-3,7,6,o.skin);rect(c,4,-3,4,2,o.skin);rect(c,4,0,5,2,o.shade);rect(c,1,3,4,2,o.shade);rect(c,-1,-3,2,2,tint(o.skin,1.16));
      c.restore();
    }else{
      taperedBone(c,joint,end,9*s*lm,7*s*lm,skin,far?null:o.shade);
      bone(c,joint,pointMix(joint,end,.3+z.type%3*.17),9.5*s*lm,pants);
      bonePatch(c,joint,end,.31,2*s,9.6*s*lm,o.blood);bone(c,pointMix(joint,end,.7),pointMix(joint,end,.83),8*s*lm,o.blood);
      drawBoot(c,end,s*lm,z.face,z.type%3?'#4b2520':'#202c3b',z.ragdoll?Math.atan2(end.y-joint.y,end.x-joint.x)-Math.PI/2:0);
    }
    if((z.limbHits?.[distal]||0)>0){bonePatch(c,joint,end,.54,5*s,7*s*lm,o.blood);bonePatch(c,joint,end,.58,2*s,2*s,'#c8b088');}
    if(!root)drawStump(c,joint,s*lm,o.blood);
  }
  c.restore();
}
function drawZombiePart(c,z,pose,side,part,alpha=1){
  if(spriteDepth>0){paintZombiePart(c,z,pose,side,part,alpha);return;}
  const arm=part==='arm',nodes={root:pose[arm?'shoulder':'hip'],joint:pose[(arm?'elbow':'knee')+side],end:pose[(arm?'hand':'foot')+side]};
  const bounds=poseBounds(nodes,(10+8*(zombieForm(z).limb||1))*spriteScale(z));
  drawOutlined(c,bounds,cc=>paintZombiePart(cc,z,pose,side,part,alpha),hitFlash(z));
}
function paintZombie(c, z, p) {
  const s = spriteScale(z), o = outfits[z.type % outfits.length], missing = z.missing || {}, width=zombieForm(z).width;
  if (!missing.legL) drawZombiePart(c, z, p, 'L', 'leg');
  if (!missing.armL) drawZombiePart(c, z, p, 'L', 'arm');
  if (!missing.legR) drawZombiePart(c, z, p, 'R', 'leg');
  const torsoAngle = Math.atan2(p.hip.y - p.shoulder.y, p.hip.x - p.shoulder.x) - Math.PI / 2;
  c.save(); c.translate(p.shoulder.x, p.shoulder.y); c.rotate(torsoAngle); c.scale(z.face * s, s);
  const torsoLength = distance(p.shoulder, p.hip) / s;
  poly(c,[[-11*width,-3],[9*width,-3],[12*width,9],[10*width,torsoLength-5],[13*width,torsoLength+1],[-10*width,torsoLength+3],[-12*width,12]],o.shirt);
  poly(c,[[-11*width,1],[-6*width,2],[-6*width,torsoLength],[-11*width,torsoLength]],'#20291c40');
  rect(c,-7,4,5,8,'#e8e4c022');rect(c,-5,torsoLength-5,12,2,'#20251d60');
  poly(c,[[-6,-2],[0,4],[6,-2],[3,8],[-3,8]],o.shade);
  rect(c,-9,torsoLength-1,6,5,o.shirt);rect(c,5,torsoLength-1,6,6,o.shirt);
  rect(c,1,9,6,10,o.blood);rect(c,-2,18,6,8,o.blood);rect(c,7,3,3,5,o.blood);
  if(z.type===1||z.type===7){rect(c,-9,5,18,2,'#223337');rect(c,-9,17,19,2,'#223337');rect(c,-1,0,2,torsoLength,'#45574c');}
  if(z.type===1||z.type===7){rect(c,3,8,6,6,'#4c6151');rect(c,-8,9,5,5,'#172d30');rect(c,-8,22,16,3,'#172b29');rect(c,1,22,3,2,'#888566');}
  if(z.type===2){poly(c,[[-7,-1],[0,5],[-3,10]],'#d4c8a5');poly(c,[[6,-1],[0,5],[3,10]],'#a39674');rect(c,0,9,1,torsoLength-9,'#8e8566');for(let i=0;i<3;i++)rect(c,1,12+i*5,1,1,'#534f3b');rect(c,-8,12,5,5,'#a79a77');}
  if(z.type===3){rect(c,-9,-2,4,9,'#c06b28');rect(c,6,-1,5,8,'#bd6324');rect(c,-2,4,1,10,'#cfb17a');rect(c,4,6,1,7,'#c0a476');rect(c,-6,torsoLength-6,14,2,'#783e22');}
  if(z.type===6){rect(c,3,10,6,5,'#8b9862');rect(c,-6,torsoLength-4,5,4,o.skin);rect(c,7,torsoLength,4,3,o.skin);}
  if(z.kind==='runner') {
    poly(c,[[-8,-2],[-5,-3],[8,torsoLength-5],[4,torsoLength]],'#b2482c');
    rect(c,-8,8,4,9,'#595e3e');rect(c,-7,9,3,1,'#c0b68a');
    poly(c,[[-7,torsoLength-4],[-18,torsoLength+9+Math.sin(z.phase)*3],[-8,torsoLength+4],[0,torsoLength]],'#8e3023');
  }
  if(z.kind==='brute') {
    poly(c,[[-17,-2],[-6,-5],[9,-4],[18,1],[16,8],[-17,8]],'#414b42');
    rect(c,-18,-1,9,8,'#666c51');rect(c,10,-1,9,9,'#6d7256');
    poly(c,[[-12,7],[12,7],[11,torsoLength-5],[-11,torsoLength-4]],'#414b3c');
    rect(c,-10,10,20,2,'#747860');rect(c,-10,17,20,2,'#707157');
    rect(c,-9,torsoLength-7,8,7,'#292f28');rect(c,2,torsoLength-7,8,7,'#292f28');
    rect(c,-2,4,4,8,'#b99943');rect(c,-1,6,2,3,'#d2ba6c');
    rect(c,5,12,5,6,o.blood);rect(c,7,17,2,6,o.blood);
  }
  if(z.kind==='spitter') {
    poly(c,[[-12,4],[-17,9],[-17,21],[-13,torsoLength+1],[-8,torsoLength-1],[-7,10]],'#53693a');
    rect(c,-16,11,6,8,'#91a34a');rect(c,-15,12,3,4,'#b7c567');
    poly(c,[[5,4],[12,7],[15,16],[12,torsoLength],[4,torsoLength+2],[2,19]],'#5e783c');
    rect(c,6,9,5,8,'#91b44b');rect(c,7,10,2,3,'#d0e579');rect(c,7,20,3,4,'#b0c756');
    rect(c,-3,3,3,torsoLength-8,'#385331');
  }
  for(const wound of z.wounds||[]){const yy=wound.t*torsoLength;rect(c,wound.x,yy,wound.size,3,o.blood);rect(c,wound.x+1,yy+2,2,5,'#5f1911');}
  if(missing.head){rect(c,-4,-6,9,6,'#7c1e16');rect(c,-1,-6,2,4,'#b89e78');}
  if(missing.armL)rect(c,-12,0,6,6,o.blood);if(missing.armR)rect(c,7,0,6,6,o.blood);
  if(missing.legL||missing.legR){rect(c,-7,torsoLength-1,14,5,o.blood);rect(c,-2,torsoLength,3,3,'#bba782');}
  c.restore();
  if(!missing.head&&p.head){
    bone(c,p.shoulder,p.head,8*s,o.shade);
    const angle = Math.atan2(p.head.y-p.shoulder.y,p.head.x-p.shoulder.x)+Math.PI/2;
    drawZombieHead(c,z,p.head,angle,false,z.ragdoll);
  }
  if(!missing.armR)drawZombiePart(c,z,p,'R','arm');
}
const zombiePad = z => { const form = zombieForm(z); return Math.max(23 * (form.head || 1), 13 + 9 * (form.limb || 1)) * spriteScale(z); };
// Settled corpses never change, so their outlined sprite is rendered once into a per-corpse canvas and blitted afterwards.
const corpseSprites = new WeakMap();
function drawCachedCorpse(c, z, p) {
  const key = Math.round(p.hip.x) + ',' + Math.round(p.hip.y) + ',' + Math.round(p.shoulder.x) + ',' + Math.round(p.shoulder.y) + ',' + Object.keys(p).length;
  let cache = corpseSprites.get(z);
  if (!cache || cache.key !== key) {
    const bounds = poseBounds(p, zombiePad(z)); if (!bounds) return false;
    const x0 = Math.floor(bounds.x0) - 2, y0 = Math.floor(bounds.y0) - 2, w = Math.ceil(bounds.x1) - x0 + 3, h = Math.ceil(bounds.y1) - y0 + 3;
    if (!(w > 0 && h > 0 && w <= SPRITE_BUFFER && h <= SPRITE_BUFFER)) return false;
    const canvas = cache ? cache.canvas : document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const cc = canvas.getContext('2d'); if (!cc) return false; cc.imageSmoothingEnabled = false;
    cc.save(); cc.translate(-x0, -y0); drawOutlined(cc, bounds, ctx => paintZombie(ctx, z, p), null); cc.restore();
    cache = { canvas, key, x0, y0 }; corpseSprites.set(z, cache);
  }
  c.drawImage(cache.canvas, cache.x0, cache.y0);
  return true;
}
function drawZombie(c, z, pose = z.pose) {
  const p = pose || makeZombiePose(z);
  c.save(); c.globalAlpha = z.alpha ?? 1;
  const settled = z.ragdoll && z.part === 'body' && (z.age || 0) > 2.5 && spriteDepth === 0 && getSpriteBuffers();
  if (!(settled && drawCachedCorpse(c, z, p))) drawOutlined(c, poseBounds(p, zombiePad(z)), cc => paintZombie(cc, z, p), hitFlash(z));
  c.restore();
}

function drawPlayerPalm(c,hand,near=true) {
  const s=PLAYER_SCALE;
  rect(c,hand.x-2*s,hand.y-2*s,4*s,4*s,near?'#d5ad79':'#b88e59');
  rect(c,hand.x-s,hand.y-s,2*s,s,near?'#e6bd86':'#cba46d');
}
function drawPlayerArm(c,pose,side,withPalm=false) {
  const p=player,s=PLAYER_SCALE,near=side==='R';
  const shoulder=near?{x:pose.shoulder.x-p.face*4*s,y:pose.shoulder.y+3*s}:pose.shoulder;
  const elbow=pose['elbow'+side],hand=pose['hand'+side];
  taperedBone(c,shoulder,elbow,7.8*s,6.7*s,near?'#d4a775':'#bb945f',near?'#e0b681':null);
  bone(c,shoulder,pointMix(shoulder,elbow,.43),9*s,near?'#969780':'#68705e');
  bonePatch(c,shoulder,elbow,.36,1.2*s,8*s,near?'#b1ae90':'#80856c');
  taperedBone(c,elbow,hand,6.6*s,4.6*s,near?'#d7ae7c':'#c29b68',near?'#e5bd87':null);
  if(near)bonePatch(c,elbow,hand,.79,2.5*s,5.7*s,'#333a2d');
  if(withPalm)drawPlayerPalm(c,hand,near);
}
function drawWeapon(c,gun,weapon=playerWeaponArt()) {
  const p=player,s=PLAYER_SCALE,id=weapon.id,barrel=weapon.barrelLength??50;
  const stock=weapon.stockLength??12,progress=gun.progress;
  c.save();c.translate(gun.origin.x,gun.origin.y);c.scale(p.face*s,s);c.rotate(gun.angle);
  if(id==='crowbar') {
    // Red oxide shaft, scraped steel hook and a wrapped lower grip.
    limb(c,-5,0,barrel-9,0,3,'#77392c');limb(c,1,-1,barrel-10,-1,1,'#c07756');
    poly(c,[[barrel-10,-2],[barrel-4,-7],[barrel+1,-7],[barrel+5,-3],[barrel+3,3],[barrel,4],[barrel+1,-2],[barrel-2,-4],[barrel-6,-3],[barrel-8,1]],'#a8ada0');
    rect(c,-6,-2,13,4,'#30382f');for(let i=0;i<4;i++)rect(c,-5+i*3,-2,1,4,'#636b59');
    c.restore();return;
  } else if(id==='pistol') {
    const slide=Math.min(4,p.kick*.6);rect(c,-2-slide,-5,22,6,'#656f65');rect(c,-1-slide,-5,19,2,'#a3a58d');rect(c,17-slide,-4,5,3,'#303930');
    for(let i=0;i<4;i++)rect(c,i*2-slide,-3,1,3,'#353e36');rect(c,-1,-7,3,2,'#333c33');rect(c,18-slide,-7,2,2,'#c7c197');
    poly(c,[[-1,1],[7,1],[5,13],[-2,12]],'#3e372c');rect(c,0,3,4,7,'#8e6340');rect(c,1,4,2,1,'#b29163');rect(c,6,2,7,1,'#93967e');rect(c,12,2,1,5,'#626b5a');rect(c,5,6,8,1,'#6a725f');
    if(!(reloadTime>0&&progress>.22&&progress<.68))rect(c,-2,12,7,2,'#7b8373');
  } else if(id==='smg') {
    // Compact wire stock, vented receiver, straight magazine and short barrel.
    poly(c,[[-stock,-2],[0,-3],[0,1],[-stock,4]],'#363f39');rect(c,-stock,-1,3,6,'#4d5849');
    rect(c,0,-5,23,8,'#39433d');rect(c,2,-5,22,2,'#7b8170');
    rect(c,7,-8,10,3,'#2a342e');rect(c,10,-7,5,1,'#9da28a');
    rect(c,23,-3,barrel-23,4,'#29342d');rect(c,barrel-3,-5,2,7,'#1f2924');
    for(let i=0;i<3;i++)rect(c,16+i*3,-3,1,3,'#192821');
    rect(c,6,2,5,8,'#28342b');rect(c,7,4,3,1,'#4e5c47');
    if(!(reloadTime>0&&progress>.22&&progress<.68)){rect(c,16,3,5,17,'#273b33');rect(c,17,5,1,13,'#71816a');rect(c,16,19,6,2,'#192c26');}
  } else if(id==='shotgun') {
    // Long twin-tone pump shotgun with tubular magazine and shoulder stock.
    poly(c,[[-stock,-3],[-2,-2],[2,0],[-5,5],[-stock,6]],'#805131');rect(c,-stock+1,-1,7,4,'#a77547');
    rect(c,-stock-1,-3,2,10,'#292e26');rect(c,0,-4,25,7,'#4d5147');rect(c,2,-4,19,1,'#92917b');
    rect(c,24,-3,barrel-24,3,'#242d27');rect(c,25,1,barrel-30,2,'#50574b');
    rect(c,barrel-2,-5,2,3,'#a59a73');
    const pump=gun.pump??shotgunPumpOffset(progress,reloadTime>0,p.kick);
    rect(c,27-pump,-1,14,6,'#945f35');rect(c,28-pump,0,12,1,'#b07c49');
    for(let i=0;i<4;i++)rect(c,29+i*3-pump,1,1,4,'#613c25');
    rect(c,5,2,5,7,'#765032');rect(c,9,3,8,1,'#77765e');
    if(reloadTime>0&&progress>.4&&progress<.76){rect(c,19,5,6,3,'#8e3022');rect(c,24,5,2,3,'#c4a557');}
  } else {
    poly(c,[[-stock,-2],[1,-3],[2,2],[-stock,6]],'#79502b');rect(c,-stock+2,-1,stock-2,4,'#87592f');
    rect(c,0,-4,25,6,'#282e27');rect(c,9,-4,12,2,'#92907c');rect(c,7,-7,8,3,'#3c4134');
    rect(c,24,-3,12,5,'#824722');rect(c,25,-2,10,1,'#9e6130');rect(c,35,-2,barrel-35,3,'#252b24');rect(c,barrel-2,-5,2,6,'#222820');
    rect(c,1,-5,23,1,'#555b49');rect(c,27,-1,1,3,'#62371e');rect(c,32,-2,1,3,'#62371e');rect(c,36,-3,10,1,'#5e6250');rect(c,barrel-4,-2,2,3,'#171e19');
    rect(c,6,2,4,7,'#31382b');rect(c,11,2,4,1,'#807d65');
    if(!(reloadTime>0&&progress>.22&&progress<.68)){
      poly(c,[[16,1],[22,1],[23,8],[27,13],[22,16],[18,10]],'#3b4134');limb(c,19,4,22,12,1,'#6b6d53');limb(c,21,4,24,12,1,'#202b23');
    }
  }
  rect(c,10-p.kick*.5,-2,5,2,'#b0a78d');
  c.restore();
}
// The muzzle flash is composited after the outline pass so it stays a bright, unoutlined burst.
function drawMuzzleFlash(c,gun,weapon=playerWeaponArt()) {
  if(!(muzzle>0)||weapon.melee)return;
  const p=player,s=PLAYER_SCALE,id=weapon.id,barrel=weapon.barrelLength??50;
  c.save();c.translate(gun.origin.x,gun.origin.y);c.scale(p.face*s,s);c.rotate(gun.angle);
  const f=shotSerial%3,life=weapon.muzzleLife||.047,intensity=clamp(muzzle/life,0,1),length=(id==='shotgun'?34:id==='pistol'?18:id==='smg'?15:24)+f*5;
  const l=length*(.55+intensity*.45),width=id==='shotgun'?10:6;
  poly(c,[[barrel,-1],[barrel+6,-width-f],[barrel+7,-3],[barrel+l,-2],[barrel+9,2],[barrel+6,width+f],[barrel+4,2]],'#e89030');
  poly(c,[[barrel,-1],[barrel+6,-4],[barrel+4,-1],[barrel+l*.7,0],[barrel+5,2],[barrel+3,4]],'#ffda73');rect(c,barrel,-1,6,2,'#fff3b9');
  c.restore();
}

function paintPlayer(c,pose,gun,weapon) {
  const p=player,s=PLAYER_SCALE;
  for(const side of ['L','R']){
    const k=pose['knee'+side],f=pose['foot'+side];
    taperedBone(c,pose.hip,k,10*s,8*s,side==='L'?'#ad895d':'#cfac79',side==='L'?null:'#dfbe8b');taperedBone(c,k,f,8*s,6.6*s,side==='L'?'#b58f60':'#caa272',side==='L'?null:'#d5b180');
    bonePatch(c,pose.hip,k,.26,8*s,4*s,'#b38f60');bonePatch(c,pose.hip,k,.26,s,4*s,'#ddbb84');
    bonePatch(c,k,f,.05,5*s,7.8*s,'#b29262');bonePatch(c,k,f,.12,s,5*s,'#d1af7a');bonePatch(c,k,f,.75,2*s,6*s,'#ab885e');drawBoot(c,f,s,p.face,'#4c2a22');
  }
  drawPlayerArm(c,pose,'L',true);
  const bodyAngle=Math.atan2(pose.hip.y-pose.shoulder.y,pose.hip.x-pose.shoulder.x)-Math.PI/2;
  c.save();c.translate(pose.shoulder.x,pose.shoulder.y);c.rotate(bodyAngle);c.scale(p.face*s,s);
  poly(c,[[-13,1],[-8,0],[-10,34],[-21,31],[-20,10]],'#292e26');rect(c,-20,11,5,15,'#373c2f');rect(c,-16,2,3,25,'#4e5140');
  rect(c,-19,9,6,2,'#62614b');rect(c,-20,26,7,2,'#53543f');rect(c,-18,13,1,10,'#73715a');rect(c,-19,29,5,4,'#22281f');rect(c,-18,-1,8,4,'#605e45');rect(c,-21,13,2,13,'#1f261f');
  poly(c,[[-9,-2],[8,0],[11,30],[-11,35]],'#7c7d6d');poly(c,[[-5,1],[1,3],[0,25],[-8,30]],'#a09f8a');
  rect(c,-10,30,22,5,'#383b2e');rect(c,-8,35,17,4,'#b5a782');rect(c,-10,37,6,16,'#33372d');rect(c,-10,52,9,3,'#33372d');
  rect(c,-9,0,3,22,'#42473b');rect(c,-4,12,7,8,'#5c6251');rect(c,-6,8,4,3,'#ada78b');
  rect(c,-3,13,5,1,'#8f9079');rect(c,-1,16,2,2,'#2d392e');rect(c,3,22,5,7,'#555e4b');rect(c,3,23,5,1,'#899078');rect(c,-7,30,2,5,'#a59d7e');rect(c,2,31,5,3,'#9e987a');
  c.restore();
  bone(c,pose.shoulder,pose.head,6*s,'#bb925f');
  c.save();c.translate(pose.head.x,pose.head.y);c.rotate(p.face*.07);c.scale(p.face*s,s);
  rect(c,-6,-8,13,15,'#cba16e');rect(c,6,-4,4,5,'#cea571');rect(c,-5,-4,3,4,'#ac8052');
  rect(c,-9,-13,18,6,'#30342b');rect(c,-9,-7,19,4,'#414439');rect(c,7,-5,12,3,'#292e26');
  rect(c,-6,-12,12,2,'#4d4e3e');rect(c,-8,-9,3,2,'#242b24');rect(c,8,-5,9,1,'#5d5d49');
  rect(c,2,-3,6,3,'#282e27');rect(c,-5,3,16,8,'#743c20');rect(c,-2,10,10,12,'#753b1c');rect(c,-1,11,3,8,'#894521');
  rect(c,3,-3,3,1,'#737763');rect(c,-4,4,13,2,'#925231');rect(c,-1,8,10,1,'#5e311c');
  poly(c,[[-3,10],[-8-p.vx*p.face*.025,13+Math.sin(p.walk)*1.4],[-6,18],[-1,14]],'#804322');
  c.restore();
  // Near arm crosses the chest; its palm wraps over the weapon below.
  drawPlayerArm(c,pose,'R',false);
  drawWeapon(c,gun,weapon);
  // The distant arm and palm were already painted behind the torso. During
  // reload they must never be redrawn over the vest, belt or near forearm.
  if(reloadTime<=0)drawPlayerPalm(c,pose.handL,false);
  drawPlayerPalm(c,pose.handR,true);
}
function drawPlayer(c) {
  const p=player,s=PLAYER_SCALE, art=makePlayerPose(), pose=art.pose, gun=art.gun;
  c.save();if(p.inv>0&&Math.floor(p.inv*18)%2)c.globalAlpha=.68;
  const bounds=poseBounds(pose,34*s);
  if(bounds){if(p.face>0)bounds.x1+=80*s;else bounds.x0-=80*s;bounds.y0-=12*s;}
  drawOutlined(c,bounds,cc=>paintPlayer(cc,pose,gun,art.weapon),null,'#1c1a12');
  drawMuzzleFlash(c,gun,art.weapon);
  c.restore();
}

// The collision capsules are built from the same joints as the visible sprite.
function hitShapes(z) {
  const p=z.pose,s=spriteScale(z),m=z.missing,result=[],form=zombieForm(z),lm=form.limb||1,head=form.head||1;
  const add=(part,a,b,r)=>result.push({part,a:p[a],b:p[b],r:r*s});
  if(!m.head)add('head','head','head',12*head);
  add('body','shoulder','hip',9*form.width);
  for(const side of ['L','R']){
    if(!m['arm'+side]){add('arm'+side,'shoulder','elbow'+side,4*lm);if(!m['forearm'+side])add('forearm'+side,'elbow'+side,'hand'+side,3.2*lm);}
    if(!m['leg'+side]){add('leg'+side,'hip','knee'+side,5*form.width*lm);if(!m['shin'+side])add('shin'+side,'knee'+side,'foot'+side,3.6*lm);}
  }
  return result;
}
function rayCircle(a,b,c,r){
  const dx=b.x-a.x,dy=b.y-a.y,fx=a.x-c.x,fy=a.y-c.y,A=dx*dx+dy*dy,C=fx*fx+fy*fy-r*r;
  if(C<=0)return 0;if(A<.00001)return Infinity;
  const B=2*(fx*dx+fy*dy),D=B*B-4*A*C;if(D<0)return Infinity;
  const t=(-B-Math.sqrt(D))/(2*A);return t>=0&&t<=1?t:Infinity;
}
function rayCapsule(a,b,shape){
  const u=shape.a,v=shape.b,r=shape.r,len=distance(u,v);
  let best=Math.min(rayCircle(a,b,u,r),rayCircle(a,b,v,r));if(len<.01)return best;
  const ux=(v.x-u.x)/len,uy=(v.y-u.y)/len;
  const x=(a.x-u.x)*ux+(a.y-u.y)*uy,y=-(a.x-u.x)*uy+(a.y-u.y)*ux;
  const dx=(b.x-a.x)*ux+(b.y-a.y)*uy,dy=-(b.x-a.x)*uy+(b.y-a.y)*ux;
  let lo=0,hi=1;
  for(const [origin,delta,min,max] of [[x,dx,0,len],[y,dy,-r,r]]){
    if(Math.abs(delta)<1e-8){if(origin<min||origin>max)return best;}
    else{let t1=(min-origin)/delta,t2=(max-origin)/delta;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return best;}
  }
  return Math.min(best,lo);
}
