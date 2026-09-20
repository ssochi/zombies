'use strict';

const TAU = Math.PI * 2;
const mix = (a, b, t) => a + (b - a) * t;
const pointMix = (a, b, t) => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Each outfit has a different silhouette and gait, not just a palette swap.
const ZOMBIE_FORMS = [
  {leg:1.08,torso:1.03,width:.86,hunch:3,drag:2,reach:1.05,tilt:-.12},
  {leg:.97,torso:1.02,width:1.15,hunch:5,drag:5,reach:.96,tilt:.09},
  {leg:1.04,torso:1.05,width:.92,hunch:2,drag:3,reach:1.02,tilt:-.08},
  {leg:.94,torso:.98,width:1.12,hunch:9,drag:2,reach:.96,tilt:.15},
  {leg:1.1,torso:1.04,width:.84,hunch:5,drag:7,reach:1.1,tilt:-.16},
  {leg:1.04,torso:.96,width:.87,hunch:7,drag:2,reach:1.03,tilt:.12},
  {leg:1,torso:1.04,width:1,hunch:1,drag:6,reach:1,tilt:-.06},
  {leg:.98,torso:1.03,width:1.16,hunch:6,drag:3,reach:.98,tilt:.1}
];
const SPECIAL_ZOMBIE_FORMS = {
  runner: {leg:1.1,torso:.96,width:.77,hunch:13,drag:10,reach:1.04,tilt:.19},
  brute: {leg:.96,torso:1.15,width:1.65,hunch:5,drag:4,reach:1.08,tilt:-.04},
  spitter: {leg:1.02,torso:1.07,width:1.12,hunch:10,drag:3,reach:.9,tilt:.18}
};
const zombieForm = z => SPECIAL_ZOMBIE_FORMS[z.kind] || ZOMBIE_FORMS[z.type % ZOMBIE_FORMS.length];
// Proximal loss also disables its distal segment; distal loss keeps the upper limb.
function limbDisabled(z,part,side){const m=z.missing||{};return Boolean(m[part+side]||m[(part==='arm'?'forearm':'shin')+side]);}
function limbThreshold(z,part){const base=part.startsWith('forearm')?1.15:part.startsWith('shin')?1.45:part.startsWith('arm')?1.7:2.2;return base*(z.limbThreshold||1);}
function drawStump(c,p,s,color){rect(c,p.x-3*s,p.y-2*s,6*s,4*s,color);rect(c,p.x-s,p.y-2*s,2*s,3*s,'#c6b48a');rect(c,p.x-2*s,p.y+2*s,2*s,3*s,'#642016');}
const playerWeaponArt = () => typeof getWeapon === 'function' ? getWeapon() : {id:'rifle',barrelLength:50,gripX:32,triggerX:13,stockLength:12,reloadDuration:1.85};
const smoothStep = t => (t=clamp(t,0,1),t*t*(3-2*t));
function shotgunPumpOffset(progress, reloading, kick) {
  if(!reloading)return Math.max(0,kick)*.5;
  // Grip is back on the fore-end before the chambering stroke starts.
  return progress>.86?Math.sin(smoothStep((progress-.86)/.14)*Math.PI)*6:0;
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
function makeZombiePose(z) {
  const form=zombieForm(z), phase = z.phase, stride = Math.sin(phase), recoil = z.flinch || 0;
  const bob = Math.sin(phase * 2) * .9 + Math.sin(phase+z.type)*.55;
  const attackProgress=z.attackTime>0?1-z.attackTime/.65:0;
  const lunging=z.attackTime>0?(attackProgress<.36?-Math.sin(attackProgress/.36*Math.PI)*.32:Math.sin((attackProgress-.36)/.64*Math.PI)):0;
  const specialProgress=clamp(z.specialProgress||0,0,1),winding=z.specialState==='windup',charging=z.specialState==='charge';
  const brace=winding?smoothStep(specialProgress):charging?1:0;
  const specialLean=z.kind==='brute'?(winding?-6*brace:charging?17:0):z.kind==='spitter'&&winding?-8*brace:0;
  const lean = form.hunch + Math.sin(phase + z.type) * 2.5 + lunging * 12 + recoil * z.face * 7 + specialLean;
  let pose;
  if (z.crawling) {
    const shoulder = { x: 9 + stride * 2 + recoil * z.face * 3, y: -24 + bob };
    pose = {
      hip: { x: -17, y: -12 }, shoulder, head: { x: shoulder.x + 11, y: shoulder.y - 9 },
      footL: { x: -44, y: 0 }, footR: { x: -39, y: -2 },
      handL: { x: 18 + stride * 11, y: 0 }, handR: { x: 25 - stride * 12, y: -Math.max(0, stride) * 3 }
    };
    pose.kneeL = { x: -32, y: -8 }; pose.kneeR = { x: -30, y: -3 };
    pose.elbowL = solveJoint(shoulder, pose.handL, 18, 20, 1);
    pose.elbowR = solveJoint(shoulder, pose.handR, 18, 20, -1);
  } else {
    const hip = { x: Math.sin(phase) * (z.limping?3:1.7), y: -57*form.leg + bob + Math.abs(recoil)*1.8 + (z.limping?4+Math.abs(stride)*3:0) };
    const shoulder = { x: hip.x + lean, y: hip.y-31*form.torso + Math.abs(recoil) * 3 };
    const running=z.kind==='runner', strideSpan=running?23:16;
    const left = footCycle(phase, strideSpan*form.leg, running?12:5, running?.55:.7), right = footCycle(phase + Math.PI, (strideSpan-1)*form.leg, form.drag, running?.59:.78);
    pose = {
      hip, shoulder,
      head: { x: shoulder.x + 2 + form.hunch*.26 + recoil * z.face * 9 + Math.sin(phase * .7+z.type) * 2, y: shoulder.y - 19.5 + Math.sin(phase+.5)*.8 },
      footL: { x: left.x - 3, y: left.y }, footR: { x: right.x + 3, y: right.y },
      handL: { x: shoulder.x + (30 + Math.sin(phase + 1) * 4)*form.reach + lunging * 9, y: shoulder.y + 12 + Math.cos(phase) * 6 - lunging * 7 },
      handR: { x: shoulder.x + (32 + Math.sin(phase + z.type) * 5)*form.reach + lunging * 8, y: shoulder.y + 22 + Math.sin(phase + .8) * 8 - lunging * 17 }
    };
    pose.kneeL = solveJoint(hip, pose.footL, 30*form.leg, 31*form.leg, -1);
    pose.kneeR = solveJoint(hip, pose.footR, 30*form.leg, 31*form.leg, -1);
    pose.elbowL = solveJoint(shoulder, pose.handL, 21*form.reach, 22*form.reach, 1);
    pose.elbowR = solveJoint(shoulder, pose.handR, 22*form.reach, 23*form.reach, 1);
  }
  if(!z.crawling&&z.kind==='brute'&&(winding||charging)) {
    for(const side of ['L','R']) {
      const front=side==='R';
      const target={x:pose.shoulder.x+(charging?32:11)+(front?3:0),y:pose.shoulder.y+(charging?8:23)};
      pose['hand'+side]=pointMix(pose['hand'+side],target,brace);
      pose['elbow'+side]=solveJoint(pose.shoulder,pose['hand'+side],22*form.reach,23*form.reach,1);
    }
    pose.head.x+=charging?7:0;pose.head.y+=brace*2;
  }
  if(!z.crawling&&z.kind==='spitter'&&winding) {
    pose.head.x-=brace*4;pose.head.y-=brace*5;
    pose.handR=pointMix(pose.handR,{x:pose.shoulder.x+10,y:pose.shoulder.y+21},brace);
    pose.elbowR=solveJoint(pose.shoulder,pose.handR,22*form.reach,23*form.reach,1);
  }
  return toWorld(pose, z, z.scale);
}
// Authored local-space key poses keep the fist on the grip throughout the arc.
// Each row: time, shaft angle, fist X/Y, torso lean, crouch, planted-step weight.
const MELEE_POSES={
  slash:[[0,-1.05,19,-69,0,0,0],[.28,-2.08,3,-99,-4,-1,-.3],[.46,-.12,33,-85,8,2,1],[.64,.96,23,-62,10,4,.8],[1,-1.05,19,-69,0,0,0]],
  overhead:[[0,-1.05,19,-69,0,0,0],[.40,-2.32,1,-112,-6,-3,-.4],[.56,.02,34,-83,11,5,1],[.72,1.30,26,-61,12,7,1],[1,-1.05,19,-69,0,0,0]]
};
function sampleMeleePose(swing){
  const move=meleeMove(swing&&swing.moveId),phase=swing?clamp(swing.elapsed/(swing.duration||move.duration),0,1):0,frames=MELEE_POSES[move.id];
  let a=frames[0],b=frames[1];for(let i=1;i<frames.length;i++){b=frames[i];if(phase<=b[0]){a=frames[i-1];break;}}
  const t=smoothStep((phase-a[0])/(b[0]-a[0]));
  return {move,phase,angle:mix(a[1],b[1],t),handX:mix(a[2],b[2],t),handY:mix(a[3],b[3],t),lean:mix(a[4],b[4],t),crouch:mix(a[5],b[5],t),step:mix(a[6],b[6],t)};
}
function makePlayerMeleePose(p,weapon,movement){
  const swing=meleeSwing,m=sampleMeleePose(swing),bob=Math.sin(p.walk*2)*.55*movement;
  const hip={x:-2+m.lean*.23,y:-60+m.crouch+bob},shoulder={x:4+m.lean-p.kick*.3,y:-94+m.crouch+bob};
  const left=footCycle(p.walk,18,p.sprinting?10:7),right=footCycle(p.walk+Math.PI,18,p.sprinting?10:7);
  const pose={hip,shoulder,head:{x:shoulder.x+4+m.lean*.15,y:shoulder.y-12},
    footL:{x:mix(-17,left.x-3,movement)-m.step*4,y:left.y*movement},footR:{x:mix(16,right.x+3,movement)+m.step*9,y:right.y*movement}};
  // Lower the pelvis slightly when a planted stride needs it; do not stretch the shins.
  for(const foot of [pose.footL,pose.footR])hip.y=Math.max(hip.y,foot.y-Math.sqrt(Math.max(1,63.5**2-(foot.x-hip.x)**2)));
  const localAim=swing?(p.face===1?swing.angle:Math.PI-swing.angle):Math.atan2(pointer.y-(p.y-94*PLAYER_SCALE),(pointer.x-p.x)*p.face);
  const aimOffset=clamp(Math.atan2(Math.sin(localAim),Math.cos(localAim)),-.62,.62);
  // Contact gives the grip a small elastic recoil, while the world continues moving.
  const recoil=(swing&&swing.impactHold>0)?Math.sin((1-swing.impactHold/m.move.hitPause)*Math.PI)*2:0;
  const hand={x:m.handX-recoil,y:m.handY+bob+m.crouch*.15};
  const ca=Math.cos(aimOffset*.55),sa=Math.sin(aimOffset*.55),dx=hand.x-shoulder.x,dy=hand.y-shoulder.y;
  pose.handR={x:shoulder.x+dx*ca-dy*sa,y:shoulder.y+dx*sa+dy*ca};
  const angle=m.angle+aimOffset,localPoint=(x,y)=>({x:pose.handR.x+Math.cos(angle)*x-Math.sin(angle)*y,y:pose.handR.y+Math.sin(angle)*x+Math.cos(angle)*y});
  const support=localPoint(9,0),guard={x:shoulder.x+6,y:shoulder.y+24};
  const supportWeight=swing&&m.move.twoHand?Math.min(1,m.phase/.16,(1-m.phase)/.14):0;
  pose.handL=pointMix(guard,support,clamp(supportWeight,0,1));
  pose.kneeL=solveJoint(hip,pose.footL,32,32,-1);pose.kneeR=solveJoint(hip,pose.footR,32,32,-1);
  pose.elbowL=solveJoint(shoulder,pose.handL,22,23,1);
  pose.elbowR=solveJoint({x:shoulder.x-4,y:shoulder.y+3},pose.handR,21,23,1);
  const world=toWorld(pose,p,PLAYER_SCALE),origin=world.handR;
  return {pose:world,gun:{origin,angle,face:p.face,progress:0,pump:0,localPoint,twoHand:supportWeight>.5,meleePhase:m.phase,moveId:m.move.id},weapon};
}
function makePlayerLadderPose(p,weapon){
  const cycle=Math.sin(p.walk),pose={hip:{x:-3,y:-60},shoulder:{x:4,y:-94},head:{x:9,y:-106},
    handL:{x:21,y:-115+cycle*10},handR:{x:21,y:-115-cycle*10},
    footL:{x:9,y:-7-cycle*7},footR:{x:9,y:-7+cycle*7}};
  for(const side of ['L','R']){
    pose['knee'+side]=solveJoint(pose.hip,pose['foot'+side],32,32,1);
    pose['elbow'+side]=solveJoint(pose.shoulder,pose['hand'+side],22,23,-1);
  }
  return {pose:toWorld(pose,p,PLAYER_SCALE),gun:{origin:toWorld({point:{x:-16,y:-65}},p,PLAYER_SCALE).point,angle:-1.7,face:p.face,progress:0,pump:0,stowed:true},weapon};
}
function makePlayerPose() {
  const p = player, weapon=playerWeaponArt(), movement = clamp(Math.hypot(p.vx, p.vy) / 55, 0, 1);
  if(p.traversal?.kind==='ladder')return makePlayerLadderPose(p,weapon);
  if(weapon.melee)return makePlayerMeleePose(p,weapon,movement);
  const movingLean = p.vx * p.face / 55 * 2, bob = Math.sin(p.walk * 2) * .65 * movement + Math.sin(worldTime * 2) * .25 * (1 - movement);
  const hip = { x: -2 - p.kick*.12, y: -60 + bob + p.kick*.08 };
  const shoulder = { x: 4 + movingLean - p.kick * .66, y: -94 + bob + p.kick*.13 };
  const left = footCycle(p.walk, 18, p.sprinting ? 10 : 7), right = footCycle(p.walk + Math.PI, 18, p.sprinting ? 10 : 7);
  const pose = {
    hip, shoulder, head: { x: shoulder.x + 4 - p.kick*.22, y: shoulder.y - 12 + p.kick*.12 },
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
  const sway=Math.sin(p.walk)*movement*.005+Math.sin(worldTime*1.7)*.0012;
  let angle = (p.traversal?.kind==='stairs'||p.traversal?.kind==='ladder')?.68:aim - (p.climb||0) - p.kick*.009 + tilt + sway;
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
function drawZombieHead(c, z, center, angle, flash = false, detached = false) {
  const o = outfits[z.type % outfits.length];
  c.save(); c.translate(center.x, center.y); c.rotate(angle+(z.ragdoll?0:zombieForm(z).tilt*z.face)); c.scale(z.face * z.scale, z.scale);
  poly(c,[[-7,-9],[7,-9],[9,-5],[8,5],[5,10],[-5,8],[-7,3]],flash?'#c5be97':o.skin);
  rect(c,-5,-6,4,5,'#a3a57a');rect(c,1,2,3,3,o.shade);rect(c,-5,2,3,3,o.shade);
  rect(c, -8, -5, 3, 9, o.shade); rect(c, 8, -3, 3, 5, o.skin);
  rect(c, -8, -12, 17, 5, o.hair); rect(c, -8, -8, 3, 10, o.hair);
  if (z.type === 3) { rect(c, -9, -12, 20, 6, '#b44815'); rect(c, -9, -7, 4, 15, '#ae4815'); rect(c, -7, 7, 19, 4, '#a54614'); }
  if (z.type === 5) { rect(c, -10, -11, 4, 26, o.hair); rect(c, 8, -8, 3, 22, o.hair); }
  if (z.type === 7) { rect(c, -10, -14, 21, 8, '#122745'); rect(c, -10, -7, 6, 17, '#182e4b'); rect(c, -7, 7, 19, 6, '#132847'); }
  if (z.type === 1) { rect(c, -9, -14, 20, 6, '#272b23'); rect(c, 7, -9, 9, 3, '#25291f'); }
  if(z.kind==='runner') {rect(c,-9,-10,19,3,'#9b3525');poly(c,[[-8,-8],[-17,-5],[-13,0],[-8,-4]],'#843226');}
  if(z.kind==='brute') {poly(c,[[-11,-10],[-8,-16],[7,-16],[12,-10],[12,-6],[-11,-6]],'#8e752c');rect(c,-6,-15,2,7,'#c0a443');rect(c,-11,-6,24,3,'#3b4136');rect(c,-8,2,18,7,'#3f4a41');rect(c,-5,4,12,2,'#768276');}
  if(z.kind==='spitter') {const swell=z.specialState==='windup'?Math.sin((z.specialProgress||0)*Math.PI)*2:0;poly(c,[[-9-swell,0],[-13,4],[-11,12],[-4,14],[0,8]],'#596e37');rect(c,-11-swell,4,5+swell,5,'#abc449');rect(c,-9,6,2,2,'#d2db73');rect(c,7,7,4,7,'#6d913e');}
  rect(c,-3,-4,6,5,'#546442');rect(c,6,-4,5,5,'#546442');
  rect(c, -1, -3, 3, 4, detached ? '#8da33b' : '#d9ff35'); rect(c, 7, -3, 3, 4, detached ? '#8da33b' : '#dbff3d');
  rect(c,0,-3,1,2,detached?'#9baa53':'#f0ff83');
  if (z.type % 3 === 0) { rect(c, -5, -3, 4, 8, o.blood); rect(c, -1, -2, 2, 3, '#dfff3c'); }
  if(z.headTrauma>0&&!detached){rect(c,2,-8,2,8,o.blood);rect(c,3,-2,4,2,'#641e17');if(z.kind==='brute'){rect(c,2,-13,5,2,'#383c30');rect(c,4,-11,2,5,'#bda879');}}
  const jaw=detached?2:z.attackTime>0?3:z.type%3===0?1:0;
  rect(c,1,5,8,3+jaw,'#443724');rect(c,2,5,2,2,'#cbbb94');rect(c,5,5,2,1,'#cbbb94');rect(c,4,8+jaw,4,2,o.shade);
  if(z.type%2===0){rect(c,7,2,3,5,o.blood);rect(c,6,8+jaw,2,3,o.blood);}
  c.restore();
}
function drawZombiePart(c,z,pose,side,part,alpha=1){
  const o=outfits[z.type%outfits.length],s=z.scale,far=side==='L',width=zombieForm(z).width;
  const arm=part==='arm',root=pose[arm?'shoulder':'hip'],joint=pose[(arm?'elbow':'knee')+side],end=pose[(arm?'hand':'foot')+side];
  const distal=(arm?'forearm':'shin')+side,upper=part+side,m=z.missing||{};
  // Detached segments have only the nodes that still existed at the moment of severing.
  const upperVisible=Boolean(root&&joint),lowerVisible=Boolean(joint&&end&&!m[distal]);
  c.save();c.globalAlpha*=alpha;
  if(upperVisible){
    if(arm){
      taperedBone(c,root,joint,6*s*width,4.8*s,far?o.shade:o.skin,far?null:o.shade);
      taperedBone(c,root,pointMix(root,joint,z.type===2?.4:.72),8*s*width,6*s*width,o.shirt);
      bonePatch(c,root,joint,.38,2*s,5*s,'#333c3070');
      if(z.kind==='brute')taperedBone(c,root,pointMix(root,joint,.62),11*s,9*s,'#515c4c',far?null:'#79816b');
      if(z.kind==='runner')bonePatch(c,root,joint,.35,4*s,7*s,'#a4412b');
    }else{
      taperedBone(c,root,joint,9*s*width,6.5*s*width,o.pants,far?null:'#aea07830');
      bonePatch(c,root,joint,.55,4*s,4*s,o.shade);bonePatch(c,root,joint,.57,2*s,3*s,o.skin);
    }
    if((z.limbHits?.[upper]||0)>0){bonePatch(c,root,joint,.57,4*s,(arm?6:8)*s,o.blood);bonePatch(c,root,joint,.6,2*s,2*s,'#c0ad84');}
    if(m[distal])drawStump(c,joint,s,o.blood);
  }
  if(lowerVisible){
    if(arm){
      taperedBone(c,joint,end,5.5*s,3.4*s,far?o.shade:o.skin,far?null:o.shade);
      rect(c,joint.x-2*s,joint.y-2*s,4*s,3*s,o.shade);
      bone(c,pointMix(joint,end,.28),pointMix(joint,end,.47),5.3*s,o.blood);
      if(z.kind==='brute'){taperedBone(c,pointMix(joint,end,.15),pointMix(joint,end,.8),7.5*s,6*s,'#3b493d',far?null:'#69755d');bonePatch(c,joint,end,.23,2*s,7.7*s,'#a68c42');}
      if(z.kind==='spitter')bonePatch(c,joint,end,.57,4*s,5.5*s,'#a0b44f');
      c.save();c.translate(end.x,end.y);c.rotate(Math.atan2(end.y-joint.y,end.x-joint.x));rect(c,-s,-2*s,5*s,4*s,o.skin);rect(c,3*s,-2*s,4*s,1.2*s,o.skin);rect(c,3*s,s,5*s,1.2*s,o.shade);rect(c,s,2*s,3*s,1.3*s,o.skin);c.restore();
    }else{
      taperedBone(c,joint,end,5.8*s,4*s,far?o.shade:o.skin,o.shade);
      bone(c,joint,pointMix(joint,end,.3+z.type%3*.17),6.7*s,o.pants);
      bonePatch(c,joint,end,.31,2*s,6.8*s,o.blood);bone(c,pointMix(joint,end,.7),pointMix(joint,end,.83),5.8*s,o.blood);
      drawBoot(c,end,s,z.face,z.type%3?'#4b2520':'#202c3b',z.ragdoll?Math.atan2(end.y-joint.y,end.x-joint.x)-Math.PI/2:0);
    }
    if((z.limbHits?.[distal]||0)>0){bonePatch(c,joint,end,.54,5*s,6*s,o.blood);bonePatch(c,joint,end,.58,2*s,2*s,'#c8b088');}
    if(!root)drawStump(c,joint,s,o.blood);
  }
  c.restore();
}
function drawZombie(c, z, pose = z.pose) {
  const s = z.scale, o = outfits[z.type % outfits.length], missing = z.missing || {};
  const p = pose || makeZombiePose(z);
  c.save(); c.globalAlpha = z.alpha ?? 1;
  if (!missing.legL) drawZombiePart(c, z, p, 'L', 'leg');
  if (!missing.armL) drawZombiePart(c, z, p, 'L', 'arm');
  if (!missing.legR) drawZombiePart(c, z, p, 'R', 'leg');
  const torsoAngle = Math.atan2(p.hip.y - p.shoulder.y, p.hip.x - p.shoulder.x) - Math.PI / 2;
  c.save(); c.translate(p.shoulder.x, p.shoulder.y); c.rotate(torsoAngle); c.scale(z.face * s, s);
  const torsoLength = distance(p.shoulder, p.hip) / s,width=zombieForm(z).width;
  poly(c,[[-9*width,-2],[7*width,-2],[10*width,9],[8*width,torsoLength-5],[11*width,torsoLength],[-8*width,torsoLength+2],[-10*width,12]],z.hit>.055?'#c5bd96':o.shirt);
  poly(c,[[-9*width,1],[-5*width,2],[-5*width,torsoLength],[-9*width,torsoLength]],'#20291c35');
  rect(c,-6,4,4,8,'#bdb99418');rect(c,-4,torsoLength-5,10,2,'#20251d60');
  poly(c,[[-5,-1],[0,4],[5,-1],[2,7],[-2,7]],o.shade);
  rect(c,-8,torsoLength-1,5,5,o.shirt);rect(c,5,torsoLength-1,5,6,o.shirt);
  rect(c,1,9,5,9,o.blood);rect(c,-2,17,5,7,o.blood);rect(c,6,3,3,4,o.blood);
  if(z.type===1||z.type===7){rect(c,-8,5,16,2,'#223337');rect(c,-8,17,17,2,'#223337');rect(c,-1,0,2,torsoLength,'#45574c');}
  if(z.type===1||z.type===7){rect(c,3,8,5,6,'#4c6151');rect(c,-7,9,5,5,'#172d30');rect(c,-7,23,14,3,'#172b29');rect(c,1,23,3,2,'#888566');}
  if(z.type===2){poly(c,[[-6,-1],[0,5],[-3,10]],'#d4c8a5');poly(c,[[5,-1],[0,5],[3,10]],'#a39674');rect(c,0,9,1,20,'#8e8566');for(let i=0;i<3;i++)rect(c,1,12+i*6,1,1,'#534f3b');rect(c,-7,12,5,5,'#a79a77');}
  if(z.type===3){rect(c,-8,-2,4,9,'#c06b28');rect(c,5,-1,5,8,'#bd6324');rect(c,-2,4,1,10,'#cfb17a');rect(c,4,6,1,7,'#c0a476');rect(c,-5,22,12,2,'#783e22');}
  if(z.type===6){rect(c,3,10,5,5,'#8b9862');rect(c,-5,25,4,4,o.skin);rect(c,6,torsoLength,4,3,o.skin);}
  if(z.kind==='runner') {
    poly(c,[[-7,-2],[-4,-3],[7,torsoLength-5],[3,torsoLength]],'#b2482c');
    rect(c,-7,8,4,9,'#595e3e');rect(c,-6,9,3,1,'#c0b68a');
    poly(c,[[-6,torsoLength-4],[-16,torsoLength+8+Math.sin(z.phase)*3],[-7,torsoLength+4],[0,torsoLength]],'#8e3023');
  }
  if(z.kind==='brute') {
    poly(c,[[-15,-2],[-5,-5],[8,-4],[16,1],[14,8],[-15,8]],'#414b42');
    rect(c,-16,-1,8,8,'#666c51');rect(c,9,-1,8,9,'#6d7256');
    poly(c,[[-11,7],[11,7],[10,torsoLength-5],[-10,torsoLength-4]],'#414b3c');
    rect(c,-9,10,18,2,'#747860');rect(c,-9,18,18,2,'#707157');
    rect(c,-8,24,7,7,'#292f28');rect(c,2,24,7,7,'#292f28');
    rect(c,-2,4,4,8,'#b99943');rect(c,-1,6,2,3,'#d2ba6c');
    rect(c,5,12,5,6,o.blood);rect(c,7,17,2,6,o.blood);
  }
  if(z.kind==='spitter') {
    poly(c,[[-11,4],[-16,9],[-16,23],[-12,30],[-7,28],[-6,10]],'#53693a');
    rect(c,-15,11,6,9,'#91a34a');rect(c,-14,12,3,4,'#b7c567');
    poly(c,[[5,4],[11,7],[14,17],[11,27],[4,29],[2,20]],'#5e783c');
    rect(c,6,9,5,9,'#91b44b');rect(c,7,10,2,3,'#d0e579');rect(c,7,23,3,4,'#b0c756');
    rect(c,-3,3,3,torsoLength-8,'#385331');
  }
  for(const wound of z.wounds||[]){const yy=wound.t*torsoLength;rect(c,wound.x,yy,wound.size,3,o.blood);rect(c,wound.x+1,yy+2,2,5,'#5f1911');}
  if(missing.head){rect(c,-3,-5,7,5,'#7c1e16');rect(c,-1,-5,2,3,'#b89e78');}
  if(missing.armL)rect(c,-10,0,5,5,o.blood);if(missing.armR)rect(c,6,0,5,5,o.blood);
  if(missing.legL||missing.legR){rect(c,-6,torsoLength-1,12,4,o.blood);rect(c,-2,torsoLength,2,3,'#bba782');}
  c.restore();
  if(!missing.head){
    bone(c,p.shoulder,p.head,6*s,o.shade);
    const angle = Math.atan2(p.head.y-p.shoulder.y,p.head.x-p.shoulder.x)+Math.PI/2;
    drawZombieHead(c,z,p.head,angle,z.hit>.055,z.ragdoll);
  }
  if(!missing.armR)drawZombiePart(c,z,p,'R','arm');
  c.restore();
}

function drawPlayerPalm(c,hand,near=true) {
  const s=PLAYER_SCALE,a=wardrobe.palette();
  rect(c,hand.x-2*s,hand.y-2*s,4*s,4*s,near?a.skin:a.skinDark);
  rect(c,hand.x-s,hand.y-s,2*s,s,a.skinLight);
}
function drawPlayerArm(c,pose,side,withPalm=false) {
  const p=player,s=PLAYER_SCALE,near=side==='R',look=wardrobe.get(),a=wardrobe.palette();
  const shoulder=near?{x:pose.shoulder.x-p.face*4*s,y:pose.shoulder.y+3*s}:pose.shoulder;
  const elbow=pose['elbow'+side],hand=pose['hand'+side],long=look.top==='jacket';
  taperedBone(c,shoulder,elbow,(long?9:7.8)*s,6.7*s,near?a.skin:a.skinDark,near?a.skinLight:null);
  bone(c,shoulder,pointMix(shoulder,elbow,long?1:.43),9*s,near?a.top:a.topDark);
  bonePatch(c,shoulder,elbow,.36,1.2*s,8*s,near?a.topLight:a.top);
  taperedBone(c,elbow,hand,6.6*s,4.6*s,long?(near?a.top:a.topDark):(near?a.skin:a.skinDark),near?(long?a.topLight:a.skinLight):null);
  if(long)bonePatch(c,elbow,hand,.86,2.2*s,6*s,a.topDark);
  if(near)bonePatch(c,elbow,hand,.79,2.5*s,5.7*s,'#333a2d');
  if(withPalm)drawPlayerPalm(c,hand,near);
}
function drawWeapon(c,gun,weapon=playerWeaponArt()) {
  const p=player,s=PLAYER_SCALE,id=weapon.id,barrel=weapon.barrelLength??50;
  const stock=weapon.stockLength??12,progress=gun.progress;
  c.save();c.translate(gun.origin.x,gun.origin.y);c.scale(p.face*s,s);c.rotate(gun.angle);
  if(id==='crowbar') {
    // Forged hexagonal stock, flattened heel and a substantial claw with an open notch.
    poly(c,[[-11,-2],[-7,-3],[barrel-9,-3],[barrel-3,-9],[barrel+4,-10],[barrel+9,-6],[barrel+10,0],[barrel+7,5],[barrel+3,6],[barrel+5,0],[barrel+4,-4],[barrel,-5],[barrel-5,1],[-7,3],[-11,2]],'#272e2b');
    poly(c,[[-9,-1],[-5,-2],[barrel-9,-2],[barrel-3,-8],[barrel+4,-9],[barrel+8,-5],[barrel+9,0],[barrel+6,4],[barrel+4,4],[barrel+6,-1],[barrel+4,-5],[barrel,-6],[barrel-6,1],[-7,2]],'#9b4933');
    limb(c,10,-1,barrel-10,-1,1,'#cc8560');limb(c,11,2,barrel-8,2,1,'#622f27');
    poly(c,[[barrel-9,-3],[barrel-3,-9],[barrel+4,-9],[barrel+8,-5],[barrel+9,0],[barrel+6,4],[barrel+4,4],[barrel+6,-1],[barrel+4,-5],[barrel,-6],[barrel-6,0]],'#9da79c');
    limb(c,barrel-5,-5,barrel-1,-8,1,'#dee0c7');rect(c,barrel+2,-8,3,1,'#d0d5bc');rect(c,barrel+7,-4,1,4,'#5b7068');
    rect(c,-8,-2,20,5,'#353d38');for(let i=0;i<6;i++)limb(c,-7+i*3,-2,-5+i*3,2,1,i%2?'#727a65':'#505c4f');
    rect(c,-11,-1,3,3,'#a1a894');rect(c,-11,-1,3,1,'#d3d5be');rect(c,19,0,3,1,'#d0b78b');rect(c,27,-2,5,1,'#73684d');
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
  if(muzzle>0){
    const age=1-clamp(muzzle/(weapon.muzzleLife||.05),0,1),f=shotSerial%3;
    const peak=age<.22?1:Math.pow(1-age,1.6),size=id==='shotgun'?1.35:id==='pistol'?.68:id==='smg'?.78:1;
    const length=(18+f*4)*size*(.5+peak*.5),width=(3+f)*size;
    c.globalAlpha=.65+.35*peak;
    poly(c,[[barrel,0],[barrel+4,-width],[barrel+length*.55,-width*.4],[barrel+length,-1],[barrel+length*.65,1],[barrel+5,width],[barrel+2,1]],'#e88737');
    poly(c,[[barrel,-1],[barrel+5,-width*.52],[barrel+length*.8,0],[barrel+5,width*.5],[barrel,1]],'#ffd783');
    rect(c,barrel,-1,Math.max(3,length*.28),2,'#fff5d5');
    if(age<.4){rect(c,barrel+4,-width-2,2,2,'#eeb35c');rect(c,barrel+7,width+1,3,1,'#eeb35c');}
  }
  c.restore();
}

function drawPlayer(c) {
  const p=player,s=PLAYER_SCALE,art=makePlayerPose(),pose=art.pose,gun=art.gun,look=wardrobe.get(),a=wardrobe.palette();
  c.save();if(p.inv>0&&Math.floor(p.inv*18)%2)c.globalAlpha=.68;
  for(const side of ['L','R']){
    const k=pose['knee'+side],f=pose['foot'+side],near=side==='R';
    taperedBone(c,pose.hip,k,10*s,8*s,near?a.pants:a.pantsDark,near?a.pantsLight:null);
    taperedBone(c,k,f,8*s,6.6*s,near?a.pants:a.pantsDark,near?a.pantsLight:null);
    if(look.pants==='cargo'){
      bonePatch(c,pose.hip,k,.26,8*s,5*s,a.pantsDark);bonePatch(c,pose.hip,k,.26,s,5*s,a.pantsLight);
      bonePatch(c,k,f,.05,5*s,7.8*s,a.pantsDark);bonePatch(c,k,f,.12,s,5*s,a.pantsLight);
    }else{
      bonePatch(c,pose.hip,k,.08,7*s,1*s,a.pantsLight,3*s);bonePatch(c,k,f,.08,20*s,s,a.pantsLight,2*s);
      bonePatch(c,k,f,.87,3*s,7*s,a.pantsDark);
    }
    if(look.boots==='boots'){
      bone(c,pointMix(k,f,.83),f,7*s,a.boots);bonePatch(c,k,f,.86,4*s,2*s,a.bootsLight);drawBoot(c,f,s,p.face,a.boots);
    }else{
      c.save();c.translate(f.x,f.y);c.scale(p.face*s,s);
      poly(c,[[-4,-3],[3,-3],[5,-1],[9,0],[9,3],[-4,3]],a.boots);rect(c,-4,1,13,2,'#c5c1a6');rect(c,0,-2,4,1,a.bootsLight);rect(c,6,-1,3,2,'#ddd3b5');c.restore();
    }
  }
  if(gun.stowed)drawWeapon(c,gun,art.weapon);
  // The far arm must stay behind torso, vest and equipment throughout reload.
  drawPlayerArm(c,pose,'L',true);
  const bodyAngle=Math.atan2(pose.hip.y-pose.shoulder.y,pose.hip.x-pose.shoulder.x)-Math.PI/2;
  c.save();c.translate(pose.shoulder.x,pose.shoulder.y);c.rotate(bodyAngle);c.scale(p.face*s,s);
  if(look.gear==='pack'){
    poly(c,[[-13,1],[-8,0],[-10,34],[-21,31],[-20,10]],a.gearDark);rect(c,-20,11,5,15,a.gear);rect(c,-16,2,3,25,a.gearLight);
    rect(c,-19,9,6,2,a.gearLight);rect(c,-20,26,7,2,a.gearLight);rect(c,-18,13,1,10,a.gearLight);rect(c,-19,29,5,4,a.gearDeep);rect(c,-18,-1,8,4,a.gear);rect(c,-21,13,2,13,a.gearDeep);
  }
  poly(c,[[-9,-2],[8,0],[11,30],[-11,35]],a.top);poly(c,[[-5,1],[1,3],[0,25],[-8,30]],a.topLight);
  rect(c,-10,30,22,5,'#383b2e');rect(c,-8,35,17,4,a.pants);rect(c,-10,37,6,16,'#33372d');rect(c,-10,52,9,3,'#33372d');
  if(look.top==='jacket'){
    rect(c,1,3,1,27,a.topDeep);rect(c,2,6,1,3,'#b5ae87');poly(c,[[-8,-1],[-1,4],[-3,10],[-9,3]],a.topDark);poly(c,[[2,1],[8,0],[7,8],[2,5]],a.topLight);
    rect(c,-7,14,6,7,a.topDark);rect(c,-7,14,6,1,a.topLight);rect(c,4,20,5,7,a.topDark);
  }else if(look.top==='armor'){
    poly(c,[[-9,1],[7,1],[10,25],[7,31],[-9,30],[-12,7]],a.topDark);rect(c,-7,7,14,16,a.topDeep);rect(c,-6,8,12,2,a.topLight);
    for(let i=0;i<3;i++)rect(c,-7,15+i*4,14,1,a.top);rect(c,-8,26,16,3,a.topLight);rect(c,-8,0,4,7,a.topDeep);rect(c,4,0,4,7,a.topDeep);
  }else{
    rect(c,-4,12,7,8,a.topDark);rect(c,-6,8,4,3,a.topLight);rect(c,-3,13,5,1,a.topLight);rect(c,-1,16,2,2,'#2d392e');rect(c,3,22,5,7,a.topDark);rect(c,3,23,5,1,a.topLight);
  }
  if(look.gear==='pack')rect(c,-9,0,3,22,a.gearDark);
  if(look.gear==='rig'){
    rect(c,-8,0,3,28,a.gearDeep);rect(c,5,0,3,28,a.gearDeep);rect(c,-9,14,18,3,a.gearDark);
    for(let i=0;i<3;i++){rect(c,-8+i*6,16,5,11,a.gear);rect(c,-8+i*6,16,5,2,a.gearLight);rect(c,-6+i*6,20,1,3,a.gearDeep);}
  }
  rect(c,-7,30,2,5,'#a59d7e');rect(c,2,31,5,3,'#9e987a');c.restore();
  bone(c,pose.shoulder,pose.head,6*s,a.skinDark);
  c.save();c.translate(pose.head.x,pose.head.y);c.rotate(p.face*.07);c.scale(p.face*s,s);
  rect(c,-6,-8,13,15,a.skin);rect(c,6,-4,4,5,a.skin);rect(c,-5,-4,3,4,a.skinDark);
  if(look.head==='cap'){
    rect(c,-9,-13,18,6,a.headDark);rect(c,-9,-7,19,4,a.head);rect(c,7,-5,12,3,a.headDeep);
    rect(c,-6,-12,12,2,a.headLight);rect(c,-8,-9,3,2,a.headDeep);rect(c,8,-5,9,1,a.headLight);
  }else if(look.head==='beanie'){
    poly(c,[[-8,-5],[-8,-12],[-5,-16],[4,-16],[8,-12],[9,-4]],a.head);rect(c,-9,-7,19,4,a.headDark);
    for(let i=0;i<5;i++)rect(c,-6+i*3,-12,1,6,a.headLight);rect(c,3,-6,3,2,'#c3b99a');
  }else if(look.head==='helmet'){
    poly(c,[[-10,-5],[-10,-12],[-6,-17],[4,-17],[10,-12],[11,-4]],a.head);rect(c,-6,-15,12,2,a.headLight);rect(c,-11,-6,23,3,a.headDark);
    rect(c,-8,-2,3,6,a.headDeep);rect(c,-8,3,6,2,a.headDark);rect(c,7,-12,4,4,a.headDeep);rect(c,8,-11,2,2,'#a6b2a0');
  }else{
    poly(c,[[-7,-3],[-8,-10],[-3,-13],[5,-11],[8,-6],[3,-8],[-3,-7],[-3,-2]],a.headDeep);rect(c,-5,-10,7,2,a.head);
  }
  rect(c,2,-3,6,3,'#282e27');rect(c,3,-3,3,1,'#737763');
  if(look.face==='scarf'){
    rect(c,-5,3,16,8,a.face);rect(c,-2,10,10,12,a.face);rect(c,-1,11,3,8,a.faceLight);rect(c,-4,4,13,2,a.faceLight);rect(c,-1,8,10,1,a.faceDark);
    poly(c,[[-3,10],[-8-p.vx*p.face*.025,13+Math.sin(p.walk)*1.4],[-6,18],[-1,14]],a.face);
  }else if(look.face==='mask'){
    rect(c,-5,2,15,7,a.face);rect(c,-5,2,14,1,a.faceLight);rect(c,5,3,6,6,a.faceDark);rect(c,7,4,3,3,a.faceLight);rect(c,-6,3,3,2,a.faceDeep);
  }else{rect(c,5,4,3,1,a.skinDark);rect(c,-3,5,6,2,a.skinDark);}
  c.restore();
  drawPlayerArm(c,pose,'R',false);if(gun.stowed){drawPlayerPalm(c,pose.handR,true);c.restore();return;}drawWeapon(c,gun,art.weapon);
  if(art.weapon.melee){
    const grip=(hand,near)=>{c.save();c.translate(hand.x,hand.y);c.rotate(p.face===1?gun.angle:Math.PI-gun.angle);rect(c,-2*s,-3*s,5*s,6*s,near?a.skin:a.skinDark);rect(c,-s,-3*s,3*s,s,a.skinLight);rect(c,0,s,3*s,s,a.skinDark);c.restore();};
    if(gun.twoHand)grip(pose.handL,false);grip(pose.handR,true);
  }else{if(reloadTime<=0)drawPlayerPalm(c,pose.handL,false);drawPlayerPalm(c,pose.handR,true);}
  c.restore();
}

// The collision capsules are built from the same joints as the visible sprite.
function hitShapes(z) {
  const p=z.pose,s=z.scale,m=z.missing,result=[],form=zombieForm(z);
  const add=(part,a,b,r)=>result.push({part,a:p[a],b:p[b],r:r*s});
  if(!m.head)add('head','head','head',z.kind==='brute'?10.5:z.kind==='spitter'?9.5:8.5);
  add('body','shoulder','hip',8*form.width);
  for(const side of ['L','R']){
    if(!m['arm'+side]){add('arm'+side,'shoulder','elbow'+side,3.6*form.width);if(!m['forearm'+side])add('forearm'+side,'elbow'+side,'hand'+side,3);}
    if(!m['leg'+side]){add('leg'+side,'hip','knee'+side,4*form.width);if(!m['shin'+side])add('shin'+side,'knee'+side,'foot'+side,3.2);}
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
