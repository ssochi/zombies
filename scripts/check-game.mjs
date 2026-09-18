import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function game() {
  const noop=(...args)=>{if(args.some(x=>typeof x==='number'&&!Number.isFinite(x)))throw Error("Nonfinite draw argument");};
  const gradient={addColorStop:noop};
  const context=new Proxy({createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
  const elements=new Map();
  const element=()=>({style:{},classList:{add:noop,remove:noop,toggle:noop},addEventListener:noop,setAttribute:noop,focus:noop,getContext:()=>context,querySelector:()=>({textContent:''}),nextElementSibling:{textContent:''}});
  const sandbox={console,Math,performance,document:{getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,querySelectorAll:()=>[],addEventListener:noop},window:{addEventListener:noop},requestAnimationFrame:noop,localStorage:{getItem:()=>0,setItem:noop}};
  const ctx=vm.createContext(sandbox);
  for(const file of ['arsenal.js','characters.js','effects.js','specials.js','world.js','game.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx,{filename:file});
  const run=code=>vm.runInContext(code,ctx);
  run('soundEnabled=false;startGame();zombies=[];spawnLeft=99;spawnTimer=999;');
  return run;
}

test('swept capsules catch fast projectiles and reject misses',()=>{
  const run=game();
  const t=run('rayCapsule({x:0,y:0},{x:100,y:0},{a:{x:40,y:-10},b:{x:40,y:10},r:3})');
  assert.ok(Math.abs(t-.37)<1e-8);
  assert.equal(run('rayCapsule({x:0,y:30},{x:100,y:30},{a:{x:40,y:-10},b:{x:40,y:10},r:3})'),Infinity);
});
test('a lethal head hit creates a detached head and a headless physical corpse',()=>{
  const run=game();run('const z=addZombie();z.x=330;z.y=285;z.pose=makeZombiePose(z);hitZombie(z,"head",z.pose.head,{vx:1000,vy:0,damage:2});');
  assert.equal(run('kills'),1);assert.equal(run('rigs[0].part'),'head');assert.equal(run('corpses[0].missing.head'),true);assert.equal(run('Boolean(corpses[0].nodes.head)'),false);
});
test('leg loss changes locomotion and removes only that limb from collision',()=>{
  const run=game();run('const z=addZombie();z.pose=makeZombiePose(z);const oldSpeed=z.speed;for(let i=0;i<3;i++)hitZombie(z,"legL",z.pose.kneeL,{vx:1000,vy:0});');
  assert.equal(run('z.crawling&&!z.dead'),true);assert.ok(run('z.speed/oldSpeed')<.5);
  assert.equal(run('hitShapes(z).some(s=>s.part==="legL")'),false);assert.equal(run('hitShapes(z).some(s=>s.part==="legR")'),true);
});
test('ragdolls preserve bone lengths, settle above ground and remain finite',()=>{
  const run=game();run('const z=addZombie();z.x=320;z.y=287;z.pose=makeZombiePose(z);killZombie(z,"body",0);for(let i=0;i<1200;i++)updateEffects(1/120);');
  assert.equal(run('corpses.length'),1);
  assert.equal(run('corpses.every(r=>Object.values(r.nodes).every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.y<=r.floor-n.r+.01))'),true);
  assert.ok(run('Math.max(...corpses[0].links.map(l=>Math.abs(distance(corpses[0].nodes[l.a],corpses[0].nodes[l.b])-l.length)))')<1);
  assert.ok(run('corpses[0].nodes.shoulder.y')>250);
});
test('effect budgets are bounded during sustained combat',()=>{
  const run=game();run('for(let i=0;i<80;i++){const z=addZombie();z.x=320;z.pose=makeZombiePose(z);sever(z,"armR",0);killZombie(z,"head",0);}for(let i=0;i<600;i++)addDecal(10,280,2,"#600");');
  assert.ok(run('particles.length')<=500);assert.ok(run('corpses.length')<=15);assert.ok(run('rigs.length')<=32);assert.ok(run('decals.length')<=240);
});
test('pause freezes physical effects and restart clears combat state',()=>{
  const run=game();run('const z=addZombie();z.pose=makeZombiePose(z);killZombie(z,"head",0);pauseGame();for(let i=0;i<100;i++)update(1/60);');
  assert.equal(run('corpses[0].age'),0);run('startGame();');
  assert.equal(run('corpses.length+rigs.length+particles.length+decals.length'),0);assert.equal(run('player.hp'),100);assert.equal(run('kills'),0);
});
test('reload conserves ammunition with a partial reserve',()=>{
  const run=game();run('player.ammo=3;player.reserve=8;reload();for(let i=0;i<130;i++)update(1/60);');
  assert.equal(run('player.ammo'),11);assert.equal(run('player.reserve'),0);assert.equal(run('reloadTime<=0'),true);
});

test('recoil springs recover identically across different frame rates',()=>{
  const run=game();
  const at30=run('(()=>{let x=0,v=58;for(let i=0;i<30;i++)[x,v]=springStep(x,v,23,1/30);return x;})()');
  const at120=run('(()=>{let x=0,v=58;for(let i=0;i<120;i++)[x,v]=springStep(x,v,23,1/120);return x;})()');
  assert.ok(Math.abs(at30-at120)<1e-10);assert.ok(at30<.001);
});
test('the resting bore aligns with the pointer when facing either direction',()=>{
  const run=game();
  for(const face of [-1,1]){
    run(`player.face=${face};pointer.x=player.x+${face}*220;pointer.y=170;worldTime=0;player.kick=0;player.climb=0;player.vx=player.vy=0;`);
    assert.ok(run('(()=>{const m=playerMuzzle();return Math.abs(Math.atan2(pointer.y-m.y,pointer.x-m.x)-m.angle);})()')<1e-8);
  }
});
test('body silhouettes vary while skeletal joints and collision stay finite',()=>{
  const run=game();
  const variety=run('(()=>{const heights=[];for(let type=0;type<8;type++){const z=addZombie();z.type=type;z.scale=1;z.phase=0;z.pose=makeZombiePose(z);heights.push(Math.round(z.y-z.pose.head.y));if(!Object.values(z.pose).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))return 0;}return new Set(heights).size;})()');
  assert.ok(variety>=4);
});

test('normal enemy speed is increased and limb combinations stop autonomous movement',()=>{
  const run=game();run('const z=addZombie(false,0,"normal");z.x=400;z.pose=makeZombiePose(z);');
  assert.ok(run('z.speed>=31.034&&z.speed<=45.194'));
  run('sever(z,"legL",0);sever(z,"armR",0);z.knockVX=z.knockVY=0;const x=z.x,y=z.y;for(let i=0;i<60;i++)updateZombies(1/60);');
  assert.equal(run('z.x===x&&z.y===y&&z.immobilized'),true);
});
test('all special enemies cancel attacks when a leg and arm are missing',()=>{
  const run=game();
  for(const kind of ['runner','brute','spitter']){
    run(`zombies=[];const z_${kind}=addZombie(false,0,"${kind}");z_${kind}.x=340;z_${kind}.pose=makeZombiePose(z_${kind});z_${kind}.missing={legL:true,armR:true};z_${kind}.specialState='charge';z_${kind}.specialTimer=.5;`);
    assert.equal(run(`(()=>{const z=z_${kind},x=z.x;const r=updateSpecial(z,.1,specialAPI());return z.x===x&&z.specialState==='idle'&&r.movementMultiplier===0;})()`),true);
  }
});
test('each weapon keeps its own magazine and switching cancels reload without gaining ammo',()=>{
  const run=game();run('player.ammo=11;const reserve=player.reserve;reload();switchWeapon("smg");');
  assert.equal(run('player.ammo'),36);assert.equal(run('reloadTime'),0);
  run('shotCooldown=0;shoot();switchWeapon("rifle");');assert.equal(run('player.ammo'),11);assert.equal(run('player.reserve===reserve'),true);
  run('switchWeapon("smg");');assert.equal(run('player.ammo'),35);
});
test('shotgun fires seven pellets with one shell and the brute resists one headshot',()=>{
  const run=game();run('switchWeapon("shotgun");shotCooldown=0;shoot();');
  assert.equal(run('bullets.length'),7);assert.equal(run('player.ammo'),7);
  run('const z=addZombie(false,0,"brute");hitZombie(z,"head",z.pose.head,{vx:1000,vy:0,damage:1});');
  assert.equal(run('z.dead'),false);assert.ok(run('z.hp>0'));
});
test('camera, aiming and ragdolls remain in world coordinates beyond the first screen',()=>{
  const run=game();run('player.x=4100;pointer.screenX=500;updatePlayer(.02);');
  assert.ok(run('viewX>0'));assert.equal(run('pointer.x===pointer.screenX+viewX'),true);
  run('const z=addZombie(false,0,"normal");z.x=4100;z.pose=makeZombiePose(z);killZombie(z,"body",0);for(let i=0;i<120;i++)updateEffects(1/120);');
  assert.ok(run('corpses[0].nodes.hip.x>3900'));
});
test('special projectiles reset and the extraction endpoint can complete the run',()=>{
  const run=game();run('hostileProjectiles.push({kind:"pool",x:300,y:280,life:3});startGame();');
  assert.equal(run('hostileProjectiles.length'),0);
  run('player.x=WORLD_LENGTH-80;furthestX=player.x;nextEncounterX=WORLD_LENGTH+10;zombies=[];spawnLeft=0;updateJourney();');
  assert.equal(run('state'),'won');
});

test('each weapon kicks immediately, stays bounded during bursts, and returns to aim',()=>{
  for(const id of ['rifle','smg','shotgun'])for(const face of [-1,1]){
    const run=game();run(`switchWeapon('${id}');player.face=${face};pointer.x=player.x+${face}*300;pointer.screenX=pointer.x;pointer.y=170;shotCooldown=0;const before=makePlayerPose();shoot();const after=makePlayerPose();`);
    assert.ok(run('(before.pose.shoulder.x-after.pose.shoulder.x)*player.face>1'));
    assert.ok(run('before.gun.angle-after.gun.angle>.025'));
    run('for(let i=0;i<360;i++){player.ammo=30;updatePlayer(1/60);if(i%Math.ceil(getWeapon().fireInterval*60)===0){shotCooldown=0;shoot();}const pose=makePlayerPose();if(!Object.values(pose.pose).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))throw Error("Invalid recoil pose");}');
    assert.ok(run('player.kick<=getWeapon().maxKick&&player.climb<=getWeapon().maxClimb'));
    run('for(let i=0;i<120;i++)updatePlayer(1/60);');
    assert.ok(run('player.kick<.001&&player.climb<.001'));
  }
});
test('impact impulse follows projectile weapon and heavy enemies resist knockback',()=>{
  const run=game();run('const n=addZombie(false,0,"normal"),b=addZombie(false,1,"brute");n.hp=b.hp=100;switchWeapon("smg");hitZombie(n,"body",n.pose.shoulder,{vx:1000,vy:0,weaponId:"rifle",damage:1});hitZombie(b,"body",b.pose.shoulder,{vx:1000,vy:0,weaponId:"rifle",damage:1});');
  assert.equal(run('n.knockVX'),49.3);assert.ok(run('b.knockVX<n.knockVX*.5'));
  run('for(let i=0;i<20;i++)hitZombie(n,"body",n.pose.shoulder,{vx:1000,vy:0,weaponId:"shotgun",damage:.01});');
  assert.ok(run('n.knockVX<=210&&Math.abs(n.flinchV)<=38'));
});


test('distal amputations preserve proximal bones and subsequent cuts never regrow them',()=>{
  for(const side of ['L','R'])for(const limb of ['arm','leg']){
    const run=game(),distal=limb==='arm'?'forearm':'shin',joint=limb==='arm'?'elbow':'knee',end=limb==='arm'?'hand':'foot';
    run(`const z=addZombie(false,0,"normal");sever(z,"${distal}${side}",0);`);
    assert.equal(run('Object.keys(rigs[0].nodes).length'),2);
    assert.equal(run(`hitShapes(z).some(s=>s.part==="${distal}${side}")`),false);
    assert.equal(run(`hitShapes(z).some(s=>s.part==="${limb}${side}")`),true);
    run(`makeRig(z,"body",0);`);assert.equal(run(`Boolean(corpses[0].nodes.${joint}${side})`),true);assert.equal(run(`Boolean(corpses[0].nodes.${end}${side})`),false);
    run(`sever(z,"${limb}${side}",0);`);assert.equal(run(`Boolean(rigs[1].nodes.${end}${side})`),false);
    run(`sever(z,"${distal}${side}",0);`);assert.equal(run('rigs.length'),2);
    run('for(let i=0;i<120;i++)updateEffects(1/120);draw();');
  }
});
test('one shin causes a limp, two cause crawling, and an arm loss immobilizes',()=>{
  const run=game();run('const z=addZombie(false,0,"normal");sever(z,"shinL",0);');
  assert.equal(run('z.limping&&!z.crawling&&!z.immobilized'),true);
  run('sever(z,"shinR",0);');assert.equal(run('z.crawling&&!z.dead&&!z.immobilized'),true);
  run('sever(z,"forearmL",0);');assert.equal(run('z.immobilized&&!z.dead'),true);
});
test('all partial limb poses and physical bodies render with finite geometry',()=>{
  const run=game();
  for(const kind of ['normal','runner','brute','spitter'])for(const part of ['forearmL','forearmR','shinL','shinR','armL','legR']){
    run(`zombies=[];rigs=[];corpses=[];particles=[];const z_${kind}_${part}=addZombie(false,0,"${kind}");sever(z_${kind}_${part},"${part}",0);for(let i=0;i<30;i++)updateZombies(1/60);draw();killZombie(z_${kind}_${part},"body",0);for(let i=0;i<60;i++)updateEffects(1/120);draw();`);
  }
});
test('pistol requires a fresh trigger press and uses its own reload capacity',()=>{
  const run=game();run('switchWeapon("pistol");shotCooldown=0;shoot();shotCooldown=0;shoot();');
  assert.equal(run('player.ammo'),9);assert.equal(run('bullets.length'),1);
  run('triggerLatched=false;shoot();');assert.equal(run('player.ammo'),8);
  run('reload();for(let i=0;i<100;i++)update(1/60);');assert.equal(run('player.ammo'),10);assert.equal(run('player.reserve'),88);
});
test('crowbar consumes stamina, sweeps forward once per target, and cannot shoot or reload',()=>{
  const run=game();run('switchWeapon("crowbar");shotCooldown=0;player.stamina=100;pointer.x=player.x+90;pointer.y=player.y-85;const z=addZombie(false,0,"normal");z.x=player.x+65;z.y=player.y;z.phase=0;z.hp=100;z.pose=makeZombiePose(z);const rear=addZombie(false,1,"normal");rear.x=player.x-65;rear.y=player.y;rear.hp=100;rear.pose=makeZombiePose(rear);shoot();');
  assert.equal(run('player.stamina'),84);assert.equal(run('bullets.length'),0);assert.equal(run('muzzle'),0);
  run('for(let i=0;i<50;i++)updateMelee(1/100);');assert.equal(run('stats.hits'),1);assert.ok(run('z.hp<100'));assert.equal(run('rear.hp'),100);
  run('reload();');assert.equal(run('reloadTime'),0);
  run('shotCooldown=0;player.stamina=10;shoot();');assert.equal(run('meleeSwing'),null);
});
test('switching away from crowbar cancels its pending impact and restart clears the swing',()=>{
  const run=game();run('switchWeapon("crowbar");shotCooldown=0;shoot();switchWeapon("pistol");updateMelee(.5);');
  assert.equal(run('meleeSwing'),null);assert.equal(run('stats.hits'),0);
  run('switchWeapon("crowbar");shotCooldown=0;shoot();startGame();');assert.equal(run('meleeSwing'),null);assert.equal(run('selectedWeapon'),'rifle');
});
test('stronger normal zombies survive five body bullets and rifle hits cannot endlessly cancel attacks',()=>{
  const run=game();run('const z=addZombie(false,0,"normal");z.attackTime=.4;for(let i=0;i<5;i++)hitZombie(z,"body",z.pose.shoulder,{vx:1000,vy:0,damage:1,weaponId:"rifle"});');
  assert.equal(run('z.dead'),false);assert.equal(run('z.attackTime'),.4);
});
