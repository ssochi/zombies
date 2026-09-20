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
  for(const file of ['arsenal.js','wardrobe.js','characters.js','effects.js','specials.js','house-data.js','world.js','interiors.js','house.js','house-ground.js','house-upper.js','house-wet.js','house-roof.js','ui.js','house-ui.js','lighting.js','game.js'])vm.runInContext(readFileSync(new URL('../'+file,import.meta.url),'utf8'),ctx,{filename:file});
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
  assert.ok(run('particles.length')<=500);assert.ok(run('corpses.length')<=28);assert.ok(run('rigs.length')<=32);assert.ok(run('decals.length')<=400);
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
  assert.ok(run('viewX>0'));assert.equal(run('pointer.x===pointer.screenX+Math.round(viewX)'),true);
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
  assert.ok(Math.abs(run('n.knockVX')-60.32)<1e-9);assert.ok(run('b.knockVX<n.knockVX*.5'));
  run('for(let i=0;i<20;i++)hitZombie(n,"body",n.pose.shoulder,{vx:1000,vy:0,weaponId:"shotgun",damage:.01});');
  assert.ok(run('n.knockVX<=420&&Math.abs(n.flinchV)<=38'));
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
  run('for(let i=0;i<100;i++)updateMelee(1/100);');assert.equal(run('stats.hits'),1);assert.ok(run('z.hp<100'));assert.equal(run('rear.hp'),100);
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

test('scene lights follow the scrolling camera and remain finite across all areas',()=>{
  const run=game();
  for(const id of ['road','store','barn']){
    const expr=id==='road'?'getWorldLights':'getInteriorLights.bind(null,"'+id+'")';
    run(`const lights_${id}=${expr};`);
    assert.equal(run(`(()=>{const a=lights_${id}(0,9.5),b=lights_${id}(37,9.5);return a.length>0&&a.length===b.length&&a.every((l,i)=>Math.abs(l.x-b[i].x-37)<.001&&l.y===b[i].y);})()`),true);
    for(const width of [640,1280])run(`setWorldWidth(${width});for(let i=0;i<60;i++){sceneLighting.begin('${id}',i*83,i*.73,${width});for(const l of sceneLighting.sources()){if(![l.x,l.y,l.radius,l.intensity].every(Number.isFinite)||l.radius<=0||l.intensity<0)throw Error('Invalid light');}}`);
  }
});
test('gunfire illumination tracks the barrel, decays, and clears when switching to melee',()=>{
  const run=game();
  for(const id of ['rifle','smg','shotgun','pistol']){
    run(`switchWeapon('${id}');viewX=200;player.x=400;pointer.x=600;muzzle=getWeapon().muzzleLife;sceneLighting.begin('road',viewX,4,640);`);
    assert.equal(run('(()=>{const l=sceneLighting.sources().find(l=>l.flash),m=playerMuzzle();return !!l&&Math.abs(l.x+viewX-m.x)<.001&&l.y===m.y;})()'),true);
    run(`const full_${id}=sceneLighting.sources().find(l=>l.flash).intensity;muzzle*=.2;sceneLighting.begin('road',viewX,4,640);`);
    assert.ok(run(`sceneLighting.sources().find(l=>l.flash).intensity<full_${id}`));
  }
  run('switchWeapon("crowbar");muzzle=.05;sceneLighting.begin("road",viewX,4,640);');
  assert.equal(run('sceneLighting.sources().some(l=>l.flash)'),false);
  run('startGame();sceneLighting.begin("road",0,0,640);');
  assert.equal(run('sceneLighting.sources().some(l=>l.flash)'),false);
});

test('every outfit slot stays attached through reload and melee in both directions',()=>{
  const run=game();
  run(`for(const preset of wardrobe.presets){wardrobe.applyPreset(preset.id);for(const slot of Object.keys(wardrobe.catalog))for(const item of wardrobe.catalog[slot]){
    wardrobe.set({[slot]:item.id});for(const face of [-1,1])for(const weapon of WEAPON_ORDER){
      switchWeapon(weapon);player.face=face;pointer.x=player.x+face*240;pointer.y=180;
      for(const phase of [0,.24,.55,.9]){reloadTime=getWeapon().melee?0:getReloadDuration()*(1-phase);meleeSwing=getWeapon().melee?{elapsed:phase*getWeapon().swingDuration,angle:face===1?0:Math.PI}:null;
        const pose=makePlayerPose().pose;if(!Object.values(pose).every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))throw Error('Invalid dressed pose');drawPlayer(ctx);
      }
    }
  }}`);
});

test('outfits sanitize stored data and preview edits do not persist until saved',()=>{
  const data=new Map(),sandbox=vm.createContext({localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}});
  vm.runInContext(readFileSync(new URL('../wardrobe.js',import.meta.url),'utf8'),sandbox);
  const run=s=>vm.runInContext(s,sandbox);
  run('wardrobe.applyPreset("breacher");wardrobe.set({colors:{top:"#123abc"}});');
  assert.equal(data.size,0);
  assert.equal(run('wardrobe.save()'),true);
  run('wardrobe.reset();wardrobe.load();');
  assert.equal(run('wardrobe.get().head'),'helmet');assert.equal(run('wardrobe.get().colors.top'),'#123abc');
  run('wardrobe.set({top:"bad",colors:{top:"url(bad)",skin:null}});const draft=wardrobe.get();draft.colors.top="#ffffff";');
  assert.equal(run('wardrobe.get().top'),'armor');assert.equal(run('wardrobe.get().colors.top'),'#123abc');
  data.set('last-light-wardrobe-v1','{"version":1,"config":{"head":"invalid","colors":{"pants":"bad"}}}');
  run('wardrobe.load();');assert.equal(run('wardrobe.get().head'),'cap');assert.equal(run('wardrobe.get().colors.pants'),'#caa272');
  sandbox.localStorage.setItem=()=>{throw Error('Storage unavailable');};assert.equal(run('wardrobe.save()'),false);
});

test('both downward melee sweeps hit once in both directions at 30, 60 and 120 fps',()=>{
  for(const fps of [30,60,120])for(const face of [-1,1])for(let move=0;move<2;move++){
    const run=game();run(`switchWeapon('crowbar');shotCooldown=0;player.stamina=100;player.face=${face};meleeComboStep=${move};meleeComboTimer=1;pointer.x=player.x+player.face*90;pointer.y=player.y-94;
      const z=addZombie(false,0,'normal');z.x=player.x+player.face*60;z.y=player.y;z.hp=100;z.phase=0;z.pose=makeZombiePose(z);
      const rear=addZombie(false,0,'normal');rear.x=player.x-player.face*60;rear.y=player.y;rear.hp=100;rear.pose=makeZombiePose(rear);shoot();
      let held=false;for(let i=0;i<${fps};i++){updateMelee(1/${fps});held=held||Boolean(meleeSwing?.impactHold);}`);
    assert.equal(run('stats.hits'),1,`${fps} fps / face ${face} / move ${move}`);assert.equal(run('rear.hp'),100);assert.equal(run('held'),true);assert.equal(run('meleeSwing'),null);
    assert.equal(run('player.stamina'),move===1?76:84);
  }
});
test('melee combo progresses, expires, and cancels cleanly on equipment changes',()=>{
  const run=game();run("switchWeapon('crowbar');shotCooldown=0;const seen=[];for(let j=0;j<4;j++){player.stamina=100;shoot();seen.push(meleeSwing.moveId);for(let i=0;i<50;i++)updateMelee(.016);shotCooldown=0;}");
  assert.equal(run('seen.join(",")'),'slash,overhead,slash,overhead');
  run('updateMelee(1);shoot();');assert.equal(run('meleeSwing.moveId'),'slash');
  run("switchWeapon('pistol');switchWeapon('crowbar');shotCooldown=0;shoot();");assert.equal(run('meleeSwing.moveId'),'slash');
});
test('contact resistance holds only the attack, while missed swings have no hold',()=>{
  const run=game();run("switchWeapon('crowbar');shotCooldown=0;pointer.x=player.x+90;pointer.y=player.y-94;shoot();for(let i=0;i<15;i++)updateMelee(.016);");
  assert.equal(run('meleeSwing.impactUsed'),false);
  run('meleeSwing.impactHold=.055;const phaseBefore=meleeSwing.elapsed;const clockBefore=elapsed;update(.016);');
  assert.equal(run('meleeSwing.elapsed'),run('phaseBefore'));assert.ok(run('elapsed>clockBefore'));assert.ok(run('meleeSwing.impactHold<.055'));
});
test('melee grip stays attached and both hands and knees stay within reach through every move',()=>{
  const run=game();run(`switchWeapon('crowbar');let maxError=0;let maxLeg=0;for(const move of MELEE_MOVES)for(const face of [-1,1])for(const aim of [-.61,0,.61])for(let i=0;i<=100;i++){
    player.face=face;meleeSwing={moveId:move.id,duration:move.duration,elapsed:i/100*move.duration,angle:face===1?aim:Math.PI-aim};const art=makePlayerPose(),p=art.pose;
    if(distance(p.shoulder,p.handL)>45||distance(p.shoulder,p.handR)>44)throw Error('Overextended arm');
    maxLeg=Math.max(maxLeg,distance(p.hip,p.footL),distance(p.hip,p.footR));maxError=Math.max(maxError,distance(p.handR,art.gun.origin));
    if(move.twoHand&&i>=16&&i<=86){const a=face===1?art.gun.angle:Math.PI-art.gun.angle;maxError=Math.max(maxError,distance(p.handL,{x:p.handR.x+Math.cos(a)*9*PLAYER_SCALE,y:p.handR.y+Math.sin(a)*9*PLAYER_SCALE}));}
    drawPlayer(ctx);
  }`);
  assert.ok(run('maxError')<1e-8);assert.ok(run('maxLeg')<64);
});


test('ordinary zombies share the player human scale across lanes and interior spawns',()=>{
  const run=game();
  run(`let minRatio=Infinity,maxRatio=0;const playerHeight=player.y-makePlayerPose().pose.head.y+14;
    for(let type=0;type<8;type++)for(const y of [LANE_TOP,(LANE_TOP+LANE_BOTTOM)/2,LANE_BOTTOM]){
      const z=addZombie(true,type,'normal');z.type=type;z.y=y;z.phase=0;z.pose=makeZombiePose(z);
      if(z.scale!==PLAYER_SCALE)throw Error('Lane-dependent human size');
      const height=z.y-z.pose.head.y+14;minRatio=Math.min(minRatio,height/playerHeight);maxRatio=Math.max(maxRatio,height/playerHeight);
      if(hitShapes(z).find(s=>s.part==='head').r!==8.5*PLAYER_SCALE)throw Error('Mismatched collision scale');
    }
    loadArea('barn',160);`);
  assert.ok(run('minRatio')>.92);assert.ok(run('maxRatio')<1.10);
  assert.equal(run('zombies.length>0'),true);
  assert.equal(run('zombies.every(z=>Math.abs(z.scale-PLAYER_SCALE*(z.kind==="brute"?1.12:z.kind==="runner"?.94:1))<1e-8)'),true);
});

test('edge camera eases to a bounded zoom on both sides and restores in the center',()=>{
  const run=game();run("pointer.inside=true;pointer.kind='mouse';pointer.screenX=W;for(let i=0;i<120;i++)updateEdgeCamera(1/60);");
  assert.ok(Math.abs(run('cameraView.zoom')-.86)<.001);assert.ok(run('cameraView.look')>60);assert.ok(run('cameraWidth()/W')<1.164);
  run('pointer.screenX=0;for(let i=0;i<180;i++)updateEdgeCamera(1/60);');assert.ok(run('cameraView.look')<-60);
  run('pointer.screenX=W/2;const beforeZoom=cameraView.zoom;updateEdgeCamera(1/60);');assert.ok(run('cameraView.zoom>beforeZoom&&cameraView.zoom<1'));
  run('for(let i=0;i<180;i++)updateEdgeCamera(1/60);');assert.equal(run('cameraView.zoom'),1);assert.equal(run('cameraView.look'),0);
  run("pointer.screenX=W;pointer.kind='touch';for(let i=0;i<60;i++)updateEdgeCamera(1/60);");assert.equal(run('cameraView.zoom'),1);
  run("pointer.kind='mouse';pointer.inside=false;for(let i=0;i<60;i++)updateEdgeCamera(1/60);");assert.equal(run('cameraView.zoom'),1);
});
test('zoomed screen and world coordinates round-trip and camera respects both map boundaries',()=>{
  const run=game();run(`let maxAimError=0;for(const zoom of [1,.94,.86])for(const left of [0,1024.7,5500.4]){
    cameraView.zoom=zoom;viewX=left;for(const x of [0,W*.5,W])for(const y of [0,170,H]){
      const p=screenToWorld(x,y),q=worldToScreen(p.x,p.y);maxAimError=Math.max(maxAimError,Math.abs(q.x-x),Math.abs(q.y-y));
    }
  }
  pointer.inside=true;pointer.screenX=0;player.x=24;for(let i=0;i<180;i++)updatePlayer(1/60);`);
  assert.ok(run('maxAimError')<1e-8);assert.ok(run('viewX')<.001);
  run('pointer.screenX=W;player.x=WORLD_LENGTH-30;for(let i=0;i<180;i++)updatePlayer(1/60);');assert.ok(run('viewX+cameraWidth()<=WORLD_LENGTH+.001'));
  assert.ok(run('distance(worldToScreen(pointer.x,pointer.y),{x:pointer.screenX,y:pointer.screenY})')<1e-8);
  run("loadArea('store',850);for(let i=0;i<180;i++)updatePlayer(1/60);draw();");assert.ok(run('viewX+cameraWidth()<=areaLength()+.001'));
  run('startGame();');assert.equal(run('cameraView.zoom'),1);assert.equal(run('cameraView.look'),0);
});
test('edge zoom follows real time consistently and stays frozen while paused',()=>{
  const samples=[];for(const fps of [30,60,120]){
    const run=game();run(`pointer.inside=true;pointer.screenX=W;for(let i=0;i<${fps/2};i++)updateEdgeCamera(1/${fps});`);samples.push(run('cameraView.zoom'));
    run('pauseGame();const zoomBefore=cameraView.zoom;update(.2);');assert.equal(run('cameraView.zoom'),run('zoomBefore'));
  }
  assert.ok(Math.max(...samples)-Math.min(...samples)<1e-10);
});

test('first-wave kill counts reward headshots while ordinary bodies withstand more rounds',()=>{
  for(const [weapon,part,shots] of [['rifle','body',9],['rifle','head',2],['pistol','body',5],['pistol','head',1],['smg','body',14],['smg','head',3]]){
    const run=game();run(`const z=addZombie(false,0,'normal');const w=weaponById('${weapon}');for(let i=0;i<${shots-1};i++)hitZombie(z,'${part}',z.pose.${part==='head'?'head':'shoulder'},{vx:1000,vy:0,damage:w.damage,weaponId:w.id,shotId:i});`);
    assert.equal(run('z.dead'),false,weapon+' '+part+' premature death');
    run(`hitZombie(z,'${part}',z.pose.${part==='head'?'head':'shoulder'},{vx:1000,vy:0,damage:w.damage,weaponId:w.id,shotId:100});`);assert.equal(run('z.dead'),true,weapon+' '+part+' kill threshold');
  }
});
test('smaller waves, starting groups, interiors and active population stay bounded',()=>{
  const run=game();run('startGame();');assert.equal(run('zombies.length'),3);assert.equal(run('spawnLeft+zombies.length'),10);assert.ok(run('packLeft>=2&&packLeft<=3'));
  run('wave=99;beginWave();');assert.equal(run('spawnLeft'),20);
  run('for(let i=0;i<60;i++){spawnTimer=0;for(const z of zombies){z.x=900;z.speed=0;z.specialCooldown=99;}update(.016);}');assert.equal(run('zombies.length'),14);assert.ok(run('spawnLeft')>0);
  run("loadArea('barn',100);");assert.equal(run('zombies.length'),3);run("loadArea('store',100);");assert.equal(run('zombies.length'),2);
});
test('body fire cannot continually refresh stun, but headshots still interrupt attacks',()=>{
  const run=game();run("const z=addZombie(false,0,'normal');z.hp=100;z.attackTime=.4;hitZombie(z,'body',z.pose.shoulder,{vx:1000,vy:0,damage:1,weaponId:'rifle'});const firstKnock=z.knockVX;z.stagger=0;hitZombie(z,'body',z.pose.shoulder,{vx:1000,vy:0,damage:1,weaponId:'rifle'});");
  assert.equal(run('z.stagger'),0);assert.equal(run('z.knockVX'),run('firstKnock'));assert.equal(run('z.attackTime'),.4);
  run("hitZombie(z,'head',z.pose.head,{vx:1000,vy:0,damage:1,weaponId:'rifle'});");assert.equal(run('z.attackTime'),0);assert.equal(run('z.stagger'),.35);
});
test('a normal melee hit deals 25 damage and missing arms still weaken it',()=>{
  for(const [arms,damage] of [[0,25],[1,17],[2,10]]){
    const run=game();run(`const z=addZombie(false,0,'normal');z.x=player.x+20;z.y=player.y;z.attackTime=.31;z.attackDone=false;z.specialCooldown=99;z.pose=makeZombiePose(z);if(${arms}>0)z.missing.armL=true;if(${arms}>1)z.missing.armR=true;updateZombies(.02);`);assert.equal(run('player.hp'),100-damage);
  }
});

test('family-home routes enter every room and return to the matching doorway',()=>{
  const run=game();run(`startHouseVisit();
    function travel(x,target,arrival){player.x=x;player.y=292;player.pose=makePlayerPose().pose;if(!usePortal())throw Error('No portal '+area+' '+x);for(let i=0;i<100&&areaTransition;i++)updateAreaTransition(.02);if(area!==target||player.x!==arrival||player.y!==292)throw Error('Incorrect arrival '+area+' '+player.x);}
    travel(400,'house_landing',180);travel(340,'house_master',70);travel(70,'house_landing',340);
    travel(680,'house_bath',70);travel(70,'house_landing',680);travel(505,'house_child',70);
    travel(530,'house_roof',120);travel(120,'house_child',530);travel(70,'house_landing',505);
    travel(180,'house_ground',400);travel(650,'house_wc',70);travel(70,'house_ground',650);
    travel(990,'house_utility',70);travel(70,'house_ground',990);
    travel(105,'road',4420);travel(4420,'house_ground',105);`);
  assert.equal(run('houseState.visited.size'),8);assert.equal(run('houseState.shortcut'),true);
  assert.equal(run('Object.values(HOUSE_ROOMS).reduce((n,r)=>n+r.spawns.length,0)'),2);
  assert.equal(run('Object.values(areaStates).flatMap(s=>s.zombies).filter(z=>z.houseResident).every(z=>z.kind==="normal")'),true);
});
test('house kills, severed limbs, consumed loot, notes and door states persist on revisit',()=>{
  const run=game();run(`startHouseVisit();const resident=zombies[0];hitZombie(resident,'head',resident.pose.head,{vx:1000,vy:0,damage:99,weaponId:'rifle'});updateBullets(0);
    player.hp=60;player.x=830;player.y=294;update(.016);houseReadClue('notice');houseCloseReading();houseState.doors.miller_wc=true;
    saveArea();loadArea('house_utility',70);const neighbor=zombies[0];sever(neighbor,'shinL',0);pickups=[];saveArea();loadArea('house_ground',105);`);
  assert.equal(run('zombies.length'),0);assert.equal(run('corpses.length'),1);assert.equal(run('pickups.filter(p=>p.type==="health").length'),0);assert.equal(run('player.hp'),95);
  assert.equal(run('houseState.read.has("notice")&&houseState.doors.miller_wc'),true);
  run("saveArea();loadArea('house_utility',70);");assert.equal(run('zombies.length'),1);assert.equal(run('Boolean(zombies[0].missing.shinL)'),true);assert.equal(run('pickups.length'),0);
  run('startHouseVisit();');assert.equal(run('houseState.read.size'),0);assert.equal(run('houseState.doors.miller_wc'),undefined);assert.equal(run('zombies.length'),1);assert.equal(run('corpses.length'),0);assert.equal(run('pickups.length'),1);
});
test('reading stops time, movement and fire, clears held touch input, and preserves ammo',()=>{
  const run=game();run(`startHouseVisit();keys.add('d');pointer.down=true;touchFiring=true;uiActive.set(7,{hold:true});player.x=800;usePortal();const before=elapsed,rounds=player.ammo,weapon=selectedWeapon;for(let i=0;i<120;i++)update(1/60);shoot();reload();switchWeapon('pistol');touchFireStart();draw();drawHouseUI(ctx,W,H);`);
  assert.equal(run('houseReading.id'),'notice');assert.equal(run('elapsed'),run('before'));assert.equal(run('player.x'),800);assert.equal(run('player.ammo'),run('rounds'));assert.equal(run('selectedWeapon'),run('weapon'));assert.equal(run('uiActive.size+keys.size'),0);assert.equal(run('pointer.down||touchFiring'),false);
  run('houseCloseReading();houseOpenJournal();drawHouseUI(ctx,W,H);');assert.equal(run('houseReading.journal'),true);
});
test('stairs lock combat, traverse visibly, and close-range living threats block transitions',()=>{
  const run=game();run(`startHouseVisit();player.x=400;const z=zombies[0];z.x=450;z.y=292;const blocked=usePortal();z.x=1215;usePortal();const ammoBefore=player.ammo;shoot();keys.add('d');update(.24);`);
  assert.equal(run('blocked'),false);assert.equal(run('area'),'house_ground');assert.ok(run('player.x>400&&player.x<490&&player.y<292'));assert.equal(run('player.ammo'),run('ammoBefore'));assert.equal(run('player.traversal.kind'),'stairs');
  run('for(let i=0;i<80;i++)update(.02);');assert.equal(run('area'),'house_landing');assert.equal(run('areaTransition'),null);assert.equal(run('player.traversal'),null);
});
test('roof ladder returns to the exterior landing and climbing poses keep finite reachable joints',()=>{
  const run=game();run(`startHouseVisit();saveArea();loadArea('house_roof',500);usePortal();for(let i=0;i<64;i++){updateAreaTransition(.02);const a=makePlayerPose(),p=a.pose;if(!Object.values(p).every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)))throw Error('Nonfinite climbing pose');if(distance(p.shoulder,p.handR)>45||distance(p.shoulder,p.handL)>45)throw Error('Overextended climbing arm');drawPlayer(ctx);}updateAreaTransition(.04);`);
  assert.equal(run('area'),'road');assert.equal(run('player.x'),4710);assert.equal(run('player.y'),292);assert.equal(run('player.traversal'),null);
});
test('every house room renders across time and zoom with finite registered lights',()=>{
  const run=game();run(`startHouseVisit();for(const id of Object.keys(HOUSE_ROOMS)){saveArea();loadArea(id,100);for(const time of [0,.4,4,18]){worldTime=time;cameraView.zoom=.86;draw();drawHouseUI(ctx,W,H);const lights=houseArt.lights(id,viewX,time);if(!lights.every(l=>Number.isFinite(l.x)&&Number.isFinite(l.y)&&l.radius>0))throw Error('Bad house light');}}`);
  assert.equal(run('houseState.visited.size'),8);
});
test('distant resident wakes from a hit and the utility return label stays correct',()=>{
  const run=game();run(`startHouseVisit();const z=zombies[0];updateZombies(.01);const asleep=!z.awake;hitZombie(z,'body',z.pose.shoulder,{vx:1000,vy:0,damage:1,weaponId:'rifle'});houseState.doors.miller_utility=true;saveArea();loadArea('house_utility',70);`);
  assert.equal(run('asleep'),true);assert.equal(run('z.awake'),true);assert.equal(run('areaPortals()[0].label'),'返回一楼');
});
test('small house rooms stay centered when the camera zooms or viewport is wider',()=>{
  const run=game();run("startHouseVisit();saveArea();loadArea('house_wc',70);const leftAtRest=viewX;cameraView.zoom=.86;viewX=clampAreaCamera(viewX);const centered=worldToScreen(areaLength()/2,292).x;window.innerWidth=2200;window.innerHeight=660;resizeGame();saveArea();loadArea('house_child',70);draw();");
  assert.equal(run('leftAtRest'),-80);assert.ok(Math.abs(run('centered')-320)<.5);assert.equal(run('player.x'),70);assert.equal(run('viewX'),-230);
});
test('direct house preview starts at the house checkpoint without retroactive road rewards',()=>{
  const run=game();run('startHouseVisit();const rounds=player.reserve;saveArea();loadArea("road",4420);updateJourney();');
  assert.equal(run('wave'),1);assert.equal(run('player.reserve'),run('rounds'));assert.equal(run('claimedSupplyStops.size'),2);assert.equal(run('nextEncounterX'),5170);assert.equal(run('zombies.every(z=>z.x>=4840)'),true);
});
