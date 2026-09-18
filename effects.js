'use strict';

const MAX_PARTICLES=500, MAX_RIGS=32, MAX_CORPSES=15, MAX_DECALS=240;
let rigs=[],decals=[],physicsAccumulator=0,audioMaster=null,noiseBuffer=null;
function emit(p){if(particles.length>=MAX_PARTICLES)particles.shift();particles.push({age:0,angle:0,spin:0,drag:0,bounces:0,...p,max:p.life});}
function addDecal(x,y,size,color){if(decals.length>=MAX_DECALS)decals.shift();decals.push({x,y,size,color});}
function dust(x,y,count=4){for(let i=0;i<count;i++)emit({kind:'dust',x,y,vx:rand(-18,18),vy:rand(-16,-5),life:rand(.25,.55),size:rand(1,3),color:'#a49a70',drag:3,gravity:-3});}
function bloodBurst(x,y,dir,floor,count=13,power=1){
  for(let i=0;i<count;i++){
    const angle=dir+rand(-.7,.7),speed=rand(28,110)*power;
    emit({kind:'blood',x:x+rand(-2,2),y:y+rand(-2,2),vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-rand(5,30),life:rand(.6,1.3),size:rand(1,2.8),color:i%4===0?'#a32b18':i%2?'#72180f':'#872017',floor:floor+rand(-3,3),gravity:220,drag:.6});
  }
  for(let i=0;i<3;i++)emit({kind:'impact',x,y,vx:Math.cos(dir+rand(-1,1))*rand(25,50),vy:Math.sin(dir+rand(-1,1))*rand(25,50),life:.09,size:rand(1,3),color:'#c69759',drag:2});
}
function muzzleEffects(m){
  const weapon=getWeapon();
  if(weapon.melee||weapon.id==='crowbar')return;
  const pistol=weapon.id==='pistol';
  for(let i=0;i<(pistol?4:weapon.id==='shotgun'?15:weapon.id==='smg'?5:8);i++){
    const angle=m.angle+rand(pistol?-.15:-.22,pistol?.15:.22),speed=pistol?rand(100,190):rand(150,290);
    emit({kind:'spark',x:m.x,y:m.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:rand(.04,.1),size:1,color:i%2?'#ffd58a':'#fff0b0',drag:7});
  }
  for(let i=0;i<(pistol?2:4);i++)emit({kind:'smoke',x:m.x+Math.cos(m.angle)*i*2,y:m.y+Math.sin(m.angle)*i*2, vx:Math.cos(m.angle)*rand(14,28)+rand(-4,4),vy:Math.sin(m.angle)*10-rand(5,13),life:rand(.25,.6)+player.heat*.13,size:rand(1,3),color:'#c6ba99',drag:3});
  emit({kind:'blast',x:m.x,y:m.y,vx:Math.cos(m.angle)*35,vy:Math.sin(m.angle)*35,life:pistol?.037:weapon.id==='shotgun'?.085:.05,size:pistol?5:weapon.id==='shotgun'?16:9,color:'#e9ca8c',direction:m.angle});
  const chamber=pistol?6:13,x=m.origin.x+Math.cos(m.angle)*chamber*PLAYER_SCALE,y=m.origin.y+Math.sin(m.angle)*chamber*PLAYER_SCALE;
  emit({kind:'shell',x,y,vx:-player.face*rand(28,52),vy:-rand(50,82),life:6,angle:m.angle,spin:player.face*rand(18,30),size:weapon.id==='shotgun'?3:2,color:weapon.shellColor,floor:player.y+rand(-2,3),gravity:260,drag:.2});
}
function impactFragments(z,p,dir,part){
  if(part==='body')for(let i=0;i<5;i++)emit({kind:'cloth',x:p.x,y:p.y,vx:Math.cos(dir)*rand(20,60)+rand(-20,20),vy:rand(-48,8),life:rand(.25,.65),size:rand(1,2.4),color:i%2?outfits[z.type].shirt:'#aa9874',floor:z.y,gravity:170,drag:1,spin:rand(-10,10)});
  emit({kind:'impactCore',x:p.x,y:p.y,vx:0,vy:0,life:.035,size:2,color:'#e0c99a'});
  emit({kind:'tracer',x:p.x,y:p.y,vx:0,vy:0,life:.055,size:1,color:'#e8cf8a',direction:dir});
}
function drawWeaponLight(c){
  const weapon=getWeapon();if(muzzle<=0||weapon.melee||weapon.id==='crowbar')return;const m=playerMuzzle(),pistol=weapon.id==='pistol';c.save();
  c.globalAlpha=(pistol?.13:.16)*(muzzle/weapon.muzzleLife);c.fillStyle='#ffd17a';
  c.beginPath();c.ellipse(m.x,m.y,pistol?23:38,pistol?14:23,m.angle,0,TAU);c.fill();
  c.globalAlpha=.1*(muzzle/getWeapon().muzzleLife);poly(c,[[m.x-4,m.y-8],[m.x+17*Math.cos(m.angle),m.y-4],[m.x+8,m.y+7],[m.x-9,m.y+4]],'#ffe6a0');c.restore();
}
function textParticle(x,y,text,color='#e3e7a5'){emit({kind:'text',x,y,vx:0,vy:-12,life:.8,text,color,size:1});}
function makeNode(p,vx,vy,r){return{x:p.x,y:p.y,px:p.x-vx/120,py:p.y-vy/120,r};}
function makeRig(z,part,dir){
  const pose=z.pose||makeZombiePose(z),nodes={},links=[],s=z.scale;
  let names;
  if(part==='body')names=Object.keys(pose).filter(name=>{
    if(name==='head')return !z.missing.head;
    const match=name.match(/^(elbow|hand|knee|foot)(L|R)$/);
    if(!match)return true;
    const joint=match[1],side=match[2],arm=joint==='elbow'||joint==='hand';
    if(z.missing[(arm?'arm':'leg')+side])return false;
    return !(joint==='hand'&&z.missing['forearm'+side]||joint==='foot'&&z.missing['shin'+side]);
  });
  else if(part==='head')names=['head'];
  else{
    const side=part.slice(-1);
    if(part.startsWith('forearm'))names=['elbow'+side,'hand'+side];
    else if(part.startsWith('shin'))names=['knee'+side,'foot'+side];
    else if(part.startsWith('arm'))names=['shoulder','elbow'+side,...(z.missing['forearm'+side]?[]:['hand'+side])];
    else names=['hip','knee'+side,...(z.missing['shin'+side]?[]:['foot'+side])];
  }
  names=names.filter(name=>pose[name]);
  for(const name of names){
    const top=name==='head'||name==='shoulder';
    const impulse=(part==='body'?(top?82:35):rand(55,100))+Math.min(120,Math.abs(z.knockVX||0))*(top?.8:.45);
    nodes[name]=makeNode(pose[name],Math.cos(dir)*impulse+rand(-10,10),Math.sin(dir)*20-rand(part==='body'?8:35,part==='body'?25:65),name==='head'?7*s:name==='hip'||name==='shoulder'?5*s:2*s);
  }
  const connect=(a,b)=>{if(nodes[a]&&nodes[b])links.push({a,b,length:distance(nodes[a],nodes[b])});};
  connect('hip','shoulder');connect('shoulder','head');
  for(const side of ['L','R']){connect('shoulder','elbow'+side);connect('elbow'+side,'hand'+side);connect('hip','knee'+side);connect('knee'+side,'foot'+side);}
  const rig={...z,part,nodes,links,missing:{...z.missing},ragdoll:true,dead:true,hit:0,age:0,life:part==='body'?22:16,floor:z.y+3,angle:0,spin:(Math.random()<.5?-1:1)*rand(4,9),impacted:false,alpha:1};
  const target=part==='body'?corpses:rigs;
  target.push(rig);if(target.length>(part==='body'?MAX_CORPSES:MAX_RIGS))target.shift();
  return rig;
}
function sever(z,part,dir){
  if(!/^(head|(arm|forearm|leg|shin)[LR])$/.test(part)||z.missing[part])return;
  const side=part.slice(-1),forearm=part.startsWith('forearm'),shin=part.startsWith('shin');
  if(forearm&&z.missing['arm'+side]||shin&&z.missing['leg'+side])return;
  const rig=makeRig(z,part,dir);z.missing[part]=true;
  const rootName=part==='head'?'head':forearm?'elbow'+side:shin?'knee'+side:part.startsWith('arm')?'shoulder':'hip';
  const root=(z.pose||makeZombiePose(z))[rootName],distal=forearm||shin;
  bloodBurst(root.x,root.y,dir,z.y,part==='head'?23:distal?10:15,distal?.8:1.15);
  if(distal){
    for(let i=0;i<3;i++)emit({kind:'cloth',x:root.x,y:root.y,vx:Math.cos(dir)*rand(18,46)+rand(-9,9),vy:rand(-34,-12),life:.35,size:i===0?1.5:2,color:i===0?'#c6aa83':'#8b2d1c',floor:z.y,gravity:200,spin:rand(-10,10),drag:.8});
    // Separate short emitters follow the surviving stump and detached cut.
    for(const source of [z,rig])emit({kind:'stumpDrip',source,nodeName:rootName,x:root.x,y:root.y,vx:0,vy:0,life:source===z?.85:.55,size:0,dripTimer:rand(.03,.08),floor:z.y});
  }
  refreshLimbState(z);
}

function stepRig(r,dt){
  r.age+=dt;r.alpha=clamp((r.life-r.age)/3,0,1);if(r.age>r.life)return;
  let maxImpact=0;
  for(const node of Object.values(r.nodes)){
    const vx=(node.x-node.px)*.996,vy=(node.y-node.py)*.996;
    node.px=node.x;node.py=node.y;node.x+=vx;node.y+=vy+390*dt*dt;
    if(node.y>r.floor-node.r){maxImpact=Math.max(maxImpact,Math.abs(vy)/dt);node.y=r.floor-node.r;node.py=node.y+vy*.12;node.px=node.x-vx*.65;}
  }
  for(let pass=0;pass<7;pass++){
    for(const link of r.links){const a=r.nodes[link.a],b=r.nodes[link.b],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.001;const change=(d-link.length)/d*.5;a.x+=dx*change;a.y+=dy*change;b.x-=dx*change;b.y-=dy*change;}
    for(const node of Object.values(r.nodes)){node.y=Math.min(node.y,r.floor-node.r);node.x=clamp(node.x,-100,WORLD_LENGTH+100);}
  }
  if(r.part==='head'){r.angle+=r.spin*dt;if(r.nodes.head.y>=r.floor-r.nodes.head.r-.4)r.spin*=.91;}
  if(!r.impacted&&r.age>.12&&maxImpact>60){
    r.impacted=true;const p=r.nodes.hip||r.nodes.head||Object.values(r.nodes)[0];dust(p.x,r.floor,r.part==='body'?10:3);
    if(r.part==='body'){sound('fall',p.x);for(let i=0;i<8;i++)addDecal(p.x+rand(-14,14),r.floor+rand(-3,3),rand(2,6),'#5c251b');}
  }
}
function updateEffects(dt){
  physicsAccumulator+=dt;let iterations=0;
  while(physicsAccumulator>=1/120&&iterations++<6){for(const r of corpses)stepRig(r,1/120);for(const r of rigs)stepRig(r,1/120);physicsAccumulator-=1/120;}
  corpses=corpses.filter(r=>r.age<r.life);rigs=rigs.filter(r=>r.age<r.life);
  for(const p of particles){
    if(p.kind==='stumpDrip'){
      const source=p.source,position=(source.nodes||source.pose||{})[p.nodeName];
      const absentParent=!source.ragdoll&&source.missing&&
        (p.nodeName.startsWith('elbow')&&source.missing['arm'+p.nodeName.slice(-1)]||p.nodeName.startsWith('knee')&&source.missing['leg'+p.nodeName.slice(-1)]);
      if(!position||source.dead&&!source.ragdoll||absentParent){p.life=0;continue;}
      p.x=position.x;p.y=position.y;p.dripTimer-=dt;
      if(p.dripTimer<=0&&p.life>0){p.dripTimer=.1;emit({kind:'blood',x:p.x,y:p.y,vx:rand(-5,5),vy:rand(3,13),life:.6,size:rand(.8,1.5),color:'#7b2015',floor:p.floor,gravity:210,drag:.9});}
    }
    p.age+=dt;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.gravity||0)*dt;
    const drag=Math.exp(-p.drag*dt);p.vx*=drag;p.vy*=drag;p.angle+=p.spin*dt;
    if(p.floor!==undefined&&p.y>=p.floor){
      p.y=p.floor;
      if(p.kind==='blood'){addDecal(p.x,p.y,p.size*rand(.9,1.6),'#682218');p.life=0;}
      else if(p.kind==='cloth'){p.life=0;}
      else if(p.kind==='shell'||p.kind==='magazine'){
        if(p.bounces<2&&Math.abs(p.vy)>9){p.vy*=-.3;p.vx*=.55;p.spin*=.35;p.bounces++;if(p.kind==='shell'&&p.bounces===1)sound('shell',p.x);}
        else{p.vx=0;p.vy=0;p.spin=0;p.gravity=0;}
      }
    }
  }
  particles=particles.filter(p=>p.life>0&&p.x>viewX-240&&p.x<viewX+W+240);
}
function drawRig(c,r){
  const p=r.nodes;c.save();c.globalAlpha=r.alpha;
  if(r.part==='body')drawZombie(c,r,p);
  else if(r.part==='head')drawZombieHead(c,r,p.head,r.angle,false,true);
  else drawZombiePart(c,r,p,r.part.slice(-1),/^(arm|forearm)/.test(r.part)?'arm':'leg');
  c.restore();
}
function drawParticles(c){
  for(const p of particles){
    if(p.kind==='stumpDrip')continue;
    const fade=clamp(p.life/Math.min(p.max,.3),0,1);c.globalAlpha=fade;
    if(p.kind==='text'){c.font='bold 5px monospace';c.fillStyle=p.color;c.fillText(p.text,p.x-p.text.length*1.5,p.y);}
    else if(p.kind==='smoke'||p.kind==='dust'){
      const size=p.size+p.age*(p.kind==='smoke'?6:3);c.globalAlpha=fade*(1-p.age/p.max)*(p.kind==='smoke'?.24:.3);rect(c,p.x-size/2,p.y-size/2,size,size,p.color);rect(c,p.x-size*.1,p.y-size*.8,size*.6,size*.6,p.color);
    }else if(p.kind==='shell'||p.kind==='magazine'||p.kind==='cloth'){
      c.save();c.translate(p.x,p.y);c.rotate(p.angle);rect(c,-1,-1,p.kind==='magazine'?5:p.kind==='cloth'?p.size:3,p.kind==='magazine'?11:p.kind==='cloth'?p.size:1.5,p.color);if(p.kind==='shell')rect(c,-1,-1,1,1,'#f7d58a');c.restore();
    }else if(p.kind==='blast'){
      const radius=p.size+p.age*140;c.save();c.translate(p.x,p.y);c.rotate(p.direction);c.globalAlpha=fade*.33;
      for(const side of [-1,1])bone(c,{x:radius*.2,y:side*radius*.5},{x:radius*.65,y:side*radius*.85},1,p.color);c.restore();
    }else if(p.kind==='tracer'){
      c.globalAlpha=fade*.6;bone(c,{x:p.x,y:p.y},{x:p.x-Math.cos(p.direction)*21,y:p.y-Math.sin(p.direction)*21},1,p.color);
    }else if(p.kind==='impactCore'){
      rect(c,p.x-1,p.y-2,2,4,p.color);rect(c,p.x-3,p.y,6,1,p.color);
    }else if(p.kind==='spark'){bone(c,{x:p.x,y:p.y},{x:p.x-p.vx*.025,y:p.y-p.vy*.025},1,p.color);}
    else if(p.kind==='blood'){rect(c,p.x,p.y,p.size,p.size,p.color);if(p.age<.15)bone(c,{x:p.x,y:p.y},{x:p.x-p.vx*.018,y:p.y-p.vy*.018},Math.max(1,p.size*.6),p.color);}
    else rect(c,p.x,p.y,p.size,p.size,p.color);
  }
  c.globalAlpha=1;
}

function initAudio(){
  if(!soundEnabled)return;
  try{
    if(!audioCtx){
      audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      const compressor=audioCtx.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=5;compressor.connect(audioCtx.destination);
      audioMaster=audioCtx.createGain();audioMaster.gain.value=.6;audioMaster.connect(compressor);
      noiseBuffer=audioCtx.createBuffer(1,audioCtx.sampleRate*.45,audioCtx.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    }
    if(audioCtx.state==='suspended')audioCtx.resume();
  }catch{}
}
function sound(type,x=player.x){
  if(!soundEnabled||!audioCtx||!audioMaster)return;
  const now=audioCtx.currentTime,pan=audioCtx.createStereoPanner();pan.pan.value=clamp((x-viewX-W/2)/(W/2),-.7,.7);pan.connect(audioMaster);
  let active=0;
  function finish(){if(--active===0)pan.disconnect();}
  function noise(duration,volume,frequency,filterType='lowpass',delay=0){
    active++;const source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();source.buffer=noiseBuffer;source.playbackRate.value=rand(.96,1.04);filter.type=filterType;filter.frequency.value=frequency;gain.gain.setValueAtTime(volume,now+delay);gain.gain.exponentialRampToValueAtTime(.001,now+delay+duration);source.connect(filter);filter.connect(gain);gain.connect(pan);source.start(now+delay,0,duration);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();finish();};
  }
  function tone(frequency,end,duration,volume,wave='sine',delay=0){
    active++;const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type=wave;osc.frequency.setValueAtTime(frequency,now+delay);osc.frequency.exponentialRampToValueAtTime(end,now+delay+duration);gain.gain.setValueAtTime(volume,now+delay);gain.gain.exponentialRampToValueAtTime(.001,now+delay+duration);osc.connect(gain);gain.connect(pan);osc.start(now+delay);osc.stop(now+delay+duration);osc.onended=()=>{osc.disconnect();gain.disconnect();finish();};
  }
  if(type==='shot'){noise(.018,.48,2100,'highpass');noise(.105,.42,1600);tone(rand(115,128),36,.17,.33,'triangle');tone(72,31,.16,.16);noise(.3,.12,620,'lowpass',.035);noise(.032,.1,3400,'highpass',.045);}
  else if(type==='shotgun'){noise(.028,.6,1600,'highpass');noise(.19,.52,1150);tone(104,28,.25,.44,'triangle');tone(63,25,.24,.23);noise(.4,.18,560,'lowpass',.045);noise(.04,.11,2700,'highpass',.22);noise(.05,.13,2200,'highpass',.34);}
  else if(type==='smg'){noise(.012,.35,2700,'highpass');noise(.065,.28,1900);tone(160,48,.095,.22,'triangle');noise(.12,.065,800,'lowpass',.025);}
  else if(type==='pistol'){noise(.016,.51,2400,'highpass');noise(.085,.35,1400);tone(148,45,.14,.3,'triangle');tone(85,34,.16,.16);noise(.23,.1,750,'lowpass',.026);noise(.018,.08,3700,'highpass',.038);}
  else if(type==='swing'){noise(.15,.1,950,'bandpass');noise(.065,.07,1900,'highpass',.045);}
  else if(type==='meleeHit'){noise(.023,.34,1450);noise(.12,.25,420);tone(118,30,.18,.31,'triangle');tone(280,95,.055,.075,'square');noise(.055,.13,2300,'highpass',.025);}
  else if(type==='growl'){noise(.32,.13,380);tone(78,48,.3,.12,'sawtooth');}
  else if(type==='acid'){noise(.2,.12,2100);tone(330,75,.16,.07,'triangle');}
  else if(type==='hit'){noise(.028,.3,2000);noise(.09,.17,700);tone(125,42,.085,.2,'triangle');}
  else if(type==='headshot'){noise(.07,.3,2300);tone(210,60,.09,.18,'triangle');}
  else if(type==='fall'){noise(.12,.14,400);tone(75,35,.12,.1);}
  else if(type==='shell'){tone(2400,1300,.025,.012,'triangle');}
  else if(type==='step'){noise(.045,.018,500);}
  else if(type==='reload'||type==='rack'){noise(.035,.11,3000,'highpass');tone(900,300,.035,.035,'square');}
  else if(type==='pickup'){tone(620,900,.08,.04,'square');tone(920,1250,.1,.04,'square',.08);}
  else if(type==='hurt'){noise(.12,.13,700);tone(95,45,.16,.1,'sawtooth');}
  else if(type==='empty'){tone(350,150,.04,.045,'square');}
  else pan.disconnect();
}
