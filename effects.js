'use strict';

// Hit feedback tuned for a 330 px tall pixel-art frame (width follows the viewport): big bright blood, fat muzzle stars, flying ragdolls.
const MAX_PARTICLES=500, MAX_RIGS=32, MAX_CORPSES=28, MAX_DECALS=400, CORPSE_LIFE=40, CORPSE_SOFT_CAP=MAX_CORPSES-4;
const BLOOD_FRESH='#9a2418', BLOOD_RIM='#6b1510', BLOOD_OLD='#5a1610', BLOOD_DARKEN_AFTER=8;
let rigs=[],decals=[],physicsAccumulator=0,audioMaster=null,noiseBuffer=null,effectsClock=0;
function emit(p){if(particles.length>=MAX_PARTICLES)particles.shift();particles.push({age:0,angle:0,spin:0,drag:0,bounces:0,...p,max:p.life});}
function pushDecal(d){if(decals.length>=MAX_DECALS)decals.shift();d.t=effectsClock;decals.push(d);}
// A splat is a cluster of 2-3 flat rects; `size`/`color` stay on the record for legacy readers.
function addDecal(x,y,size,color=BLOOD_FRESH){
  size=clamp(size,.8,4);const parts=[];const n=2+(Math.random()<.5?1:0);
  for(let i=0;i<n;i++){const w=size*rand(2.5,4)*(i?rand(.35,.7):1),h=Math.max(1,size*rand(.7,1.2)*(i?rand(.6,1):1));parts.push({dx:i?rand(-w,w)*1.1:-w/2,dy:i?rand(-2,2):-h/2,w,h});}
  pushDecal({kind:'splat',x,y,size,color,parts});
}
function bloodPool(x,y,width=rand(22,34)){pushDecal({kind:'pool',x,y,size:width/3,color:BLOOD_FRESH,width,height:rand(6,8)});}
function decalColor(d){return effectsClock-d.t>BLOOD_DARKEN_AFTER?BLOOD_OLD:d.color;}
function drawDecals(c){
  for(const d of decals){
    if(d.x<viewX-60||d.x>viewX+W+60)continue;
    const fresh=effectsClock-d.t<BLOOD_DARKEN_AFTER,color=fresh?d.color:BLOOD_OLD;
    if(d.kind==='pool'){
      const grow=clamp((effectsClock-d.t)/.4,.15,1),w=d.width*grow,h=d.height*grow;
      const rows=Math.max(2,Math.round(h/2));
      for(let i=0;i<rows;i++){const k=1-Math.abs((i+.5)/rows-.5)*1.5,rw=w*k;if(fresh)rect(c,d.x-rw/2-1,d.y-h/2+i*2-1,rw+2,3,BLOOD_RIM);}
      for(let i=0;i<rows;i++){const k=1-Math.abs((i+.5)/rows-.5)*1.5,rw=w*k;rect(c,d.x-rw/2,d.y-h/2+i*2,rw,2,color);}
    }else{
            for(const p of d.parts)rect(c,d.x+p.dx,d.y+p.dy,p.w,p.h,color);
    }
  }
}
function dust(x,y,count=4){for(let i=0;i<count;i++)emit({kind:'dust',x,y,vx:rand(-18,18),vy:rand(-16,-5),life:rand(.25,.55),size:rand(1,3),color:'#a49a70',drag:3,gravity:-3});}
const BLOOD_COLORS=['#b8281a','#8f1d13','#d1382a','#b8281a'];
function bloodBurst(x,y,dir,floor,count=13,power=1,opts={}){
  const up=opts.up||0;
  for(let i=0;i<count;i++){
    const angle=dir+rand(-.7,.7),speed=rand(28,110)*power;
    emit({kind:'blood',x:x+rand(-2,2),y:y+rand(-2,2),vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-rand(5,30)-up,life:rand(.6,1.3),size:rand(1.5,4),color:BLOOD_COLORS[i%4],floor:floor+rand(-3,3),gravity:220,drag:.6});
  }
  if(opts.chunks)for(let i=0,n=Math.max(1,Math.round(count*.2));i<n;i++){
    const angle=dir+rand(-.6,.6),speed=rand(28,110)*power*1.4;
    emit({kind:'blood',chunk:true,x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-rand(20,60)-up,life:rand(.7,1.4),size:rand(4,6),color:i%2?'#8f1d13':'#b8281a',floor:floor+rand(-3,3),gravity:300,drag:.5,spin:rand(-12,12)});
  }
  for(let i=0;i<6;i++)emit({kind:'impact',x,y,vx:Math.cos(dir+rand(-1,1))*rand(25,50),vy:Math.sin(dir+rand(-1,1))*rand(25,50),life:.09,size:rand(1,3),color:'#c69759',drag:2});
}
function muzzleEffects(m){
  const weapon=getWeapon();
  if(weapon.melee||weapon.id==='crowbar')return;
  const pistol=weapon.id==='pistol',shotgun=weapon.id==='shotgun';
  for(let i=0;i<(pistol?4:shotgun?15:weapon.id==='smg'?5:8);i++){
    const angle=m.angle+rand(pistol?-.15:-.22,pistol?.15:.22),speed=pistol?rand(100,190):rand(150,290);
    emit({kind:'spark',x:m.x,y:m.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:rand(.06,.14),size:rand(1,2),color:i%2?'#ffd58a':'#fff0b0',drag:7});
  }
  for(let i=0;i<(pistol?2:4);i++)emit({kind:'smoke',x:m.x+Math.cos(m.angle)*i*2,y:m.y+Math.sin(m.angle)*i*2, vx:Math.cos(m.angle)*rand(14,28)+rand(-4,4),vy:Math.sin(m.angle)*10-rand(5,13),life:rand(.25,.6)+player.heat*.13,size:rand(1,3),color:'#c6ba99',drag:3});
  // Filled pixel star plus a one-frame white core on the barrel: reads at any scale.
  emit({kind:'blast',x:m.x,y:m.y,vx:Math.cos(m.angle)*20,vy:Math.sin(m.angle)*20,life:pistol?.05:shotgun?.09:.06,size:pistol?7:shotgun?18:weapon.id==='smg'?9:11,color:'#f4a63a',direction:m.angle});
  emit({kind:'core',x:m.x,y:m.y,vx:0,vy:0,life:.017,size:20,color:'#ffffff',direction:m.angle});
  const chamber=pistol?6:13,x=m.origin.x+Math.cos(m.angle)*chamber*PLAYER_SCALE,y=m.origin.y+Math.sin(m.angle)*chamber*PLAYER_SCALE;
  emit({kind:'shell',x,y,vx:-player.face*rand(28,52),vy:-rand(50,82),life:6,angle:m.angle,spin:player.face*rand(18,30),size:shotgun?3:2,color:weapon.shellColor,floor:player.y+rand(-2,3),gravity:260,drag:.2});
}
function impactFragments(z,p,dir,part){
  if(part==='body')for(let i=0;i<5;i++)emit({kind:'cloth',x:p.x,y:p.y,vx:Math.cos(dir)*rand(20,60)+rand(-20,20),vy:rand(-48,8),life:rand(.25,.65),size:rand(1,2.4),color:i%2?outfits[z.type].shirt:'#aa9874',floor:z.y,gravity:170,drag:1,spin:rand(-10,10)});
  emit({kind:'impactCore',x:p.x,y:p.y,vx:0,vy:0,life:.035,size:2,color:'#e0c99a'});
  emit({kind:'tracer',x:p.x,y:p.y,vx:0,vy:0,life:.055,size:1,color:'#e8cf8a',direction:dir});
}
function drawWeaponLight(c){
  const weapon=getWeapon();if(muzzle<=0||weapon.melee||weapon.id==='crowbar')return;const m=playerMuzzle(),pistol=weapon.id==='pistol';c.save();
  c.globalAlpha=(pistol?.24:.30)*(muzzle/weapon.muzzleLife);c.fillStyle='#ffd17a';
  c.beginPath();c.ellipse(m.x,m.y,(pistol?23:38)*1.4,(pistol?14:23)*1.4,m.angle,0,TAU);c.fill();
  c.globalAlpha=.14*(muzzle/getWeapon().muzzleLife);poly(c,[[m.x-4,m.y-8],[m.x+17*Math.cos(m.angle),m.y-4],[m.x+8,m.y+7],[m.x-9,m.y+4]],'#ffe6a0');c.restore();
}
function textParticle(x,y,text,color='#e3e7a5',size=9){emit({kind:'text',x,y,vx:0,vy:-28,life:1.1,text,color,size,drag:1.6});}
function makeNode(p,vx,vy,r){return{x:p.x,y:p.y,px:p.x-vx/120,py:p.y-vy/120,r,bounced:false};}
function makeRig(z,part,dir,launch=1){
  const pose=z.pose||makeZombiePose(z),nodes={},links=[],s=z.scale,body=part==='body',head=part==='head';
  let names;
  if(body)names=Object.keys(pose).filter(name=>{
    if(name==='head')return !z.missing.head;
    const match=name.match(/^(elbow|hand|knee|foot)(L|R)$/);
    if(!match)return true;
    const joint=match[1],side=match[2],arm=joint==='elbow'||joint==='hand';
    if(z.missing[(arm?'arm':'leg')+side])return false;
    return !(joint==='hand'&&z.missing['forearm'+side]||joint==='foot'&&z.missing['shin'+side]);
  });
  else if(head)names=['head'];
  else{
    const side=part.slice(-1);
    if(part.startsWith('forearm'))names=['elbow'+side,'hand'+side];
    else if(part.startsWith('shin'))names=['knee'+side,'foot'+side];
    else if(part.startsWith('arm'))names=['shoulder','elbow'+side,...(z.missing['forearm'+side]?[]:['hand'+side])];
    else names=['hip','knee'+side,...(z.missing['shin'+side]?[]:['foot'+side])];
  }
  names=names.filter(name=>pose[name]);
  // Shoulder and head get an extra sideways kick relative to the hip so the body tumbles mid-air.
  const tumble=(Math.random()<.5?-1:1)*30*launch,knock=Math.min(120,Math.abs(z.knockVX||0));
  for(const name of names){
    const top=name==='head'||name==='shoulder';
    let impulse=(body?(top?150:90)*launch:rand(55,100)*(head?1.8:1))+knock*(top?.8:.45);
    impulse=Math.min(420,impulse);
    const lift=Math.min(300,body?rand(70,140)*launch:rand(35,65)*(head?1.4:1));
    const kick=name==='shoulder'?tumble:name==='head'?tumble*1.3:name==='hip'?-tumble*.5:0;
    nodes[name]=makeNode(pose[name],Math.cos(dir)*impulse+rand(-10,10)+kick,Math.sin(dir)*20-lift,name==='head'?7*s:name==='hip'||name==='shoulder'?5*s:2*s);
  }
  const connect=(a,b)=>{if(nodes[a]&&nodes[b])links.push({a,b,length:distance(nodes[a],nodes[b])});};
  connect('hip','shoulder');connect('shoulder','head');
  for(const side of ['L','R']){connect('shoulder','elbow'+side);connect('elbow'+side,'hand'+side);connect('hip','knee'+side);connect('knee'+side,'foot'+side);}
  const rig={...z,part,nodes,links,missing:{...z.missing},ragdoll:true,dead:true,hit:0,age:0,life:body?CORPSE_LIFE:16,floor:z.y+3,angle:0,spin:(Math.random()<.5?-1:1)*(head?rand(9,16):rand(4,9)),impacted:false,settled:false,alpha:1};
  if(head){
    const o=outfits[z.type]||{skin:'#6fb994',shade:'#4a8a6c'};
    for(let i=0;i<5;i++)emit({kind:'cloth',x:pose.head.x,y:pose.head.y,vx:Math.cos(dir)*rand(30,90)*launch+rand(-30,30),vy:-rand(40,110)*launch,life:rand(.4,.8),size:rand(2,3),color:i%2?o.skin:o.shade,floor:z.y+rand(-2,2),gravity:260,drag:.7,spin:rand(-14,14)});
  }
  if(body){
    corpses.push(rig);
    // Overflow fades the oldest corpse instead of popping it; the hard cap only removes already-fading ones.
    if(corpses.length>CORPSE_SOFT_CAP){const oldest=corpses.find(r=>r.life-r.age>2);if(oldest)oldest.life=oldest.age+2;}
    while(corpses.length>MAX_CORPSES){let i=0;for(let k=1;k<corpses.length;k++)if(corpses[k].life-corpses[k].age<corpses[i].life-corpses[i].age)i=k;corpses.splice(i,1);}
  }else{rigs.push(rig);if(rigs.length>MAX_RIGS)rigs.shift();}
  return rig;
}
function sever(z,part,dir,launch=1){
  if(!/^(head|(arm|forearm|leg|shin)[LR])$/.test(part)||z.missing[part])return;
  const side=part.slice(-1),forearm=part.startsWith('forearm'),shin=part.startsWith('shin');
  if(forearm&&z.missing['arm'+side]||shin&&z.missing['leg'+side])return;
  const rig=makeRig(z,part,dir,launch);z.missing[part]=true;
  const rootName=part==='head'?'head':forearm?'elbow'+side:shin?'knee'+side:part.startsWith('arm')?'shoulder':'hip';
  const root=(z.pose||makeZombiePose(z))[rootName],distal=forearm||shin;
  bloodBurst(root.x,root.y,dir,z.y,part==='head'?23:distal?10:15,distal?.8:1.15,{chunks:!distal,up:part==='head'?30:0});
  if(distal){
    for(let i=0;i<3;i++)emit({kind:'cloth',x:root.x,y:root.y,vx:Math.cos(dir)*rand(18,46)+rand(-9,9),vy:rand(-34,-12),life:.35,size:i===0?1.5:2,color:i===0?'#c6aa83':'#8b2d1c',floor:z.y,gravity:200,spin:rand(-10,10),drag:.8});
    // Separate short emitters follow the surviving stump and detached cut.
    for(const source of [z,rig])emit({kind:'stumpDrip',source,nodeName:rootName,x:root.x,y:root.y,vx:0,vy:0,life:source===z?.85:.55,size:0,dripTimer:rand(.03,.08),floor:z.y});
  }
  refreshLimbState(z);
}

function stepRig(r,dt){
  r.age+=dt;r.alpha=clamp((r.life-r.age)/2,0,1);if(r.age>r.life||r.settled)return;
  let maxImpact=0,motion=0;
  for(const node of Object.values(r.nodes)){
    const vx=(node.x-node.px)*.996,vy=(node.y-node.py)*.996;
    node.px=node.x;node.py=node.y;node.x+=vx;node.y+=vy+390*dt*dt;
    if(node.y>r.floor-node.r){
      maxImpact=Math.max(maxImpact,Math.abs(vy)/dt);node.y=r.floor-node.r;
      // First floor contact bounces (restitution .35); later contacts settle.
      node.py=node.y+vy*(node.bounced?.08:.35);node.px=node.x-vx*.65;node.bounced=true;
    }
    motion=Math.max(motion,Math.abs(vx),Math.abs(vy));
  }
  for(let pass=0;pass<7;pass++){
    for(const link of r.links){const a=r.nodes[link.a],b=r.nodes[link.b],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||.001;const change=(d-link.length)/d*.5;a.x+=dx*change;a.y+=dy*change;b.x-=dx*change;b.y-=dy*change;}
    for(const node of Object.values(r.nodes)){node.y=Math.min(node.y,r.floor-node.r);node.x=clamp(node.x,-100,WORLD_LENGTH+100);}
  }
  if(r.part==='head'){r.angle+=r.spin*dt;if(r.nodes.head.y>=r.floor-r.nodes.head.r-.4)r.spin*=.91;}
  if(!r.impacted&&r.age>.12&&maxImpact>60){
    r.impacted=true;const p=r.nodes.hip||r.nodes.head||Object.values(r.nodes)[0];dust(p.x,r.floor,r.part==='body'?10:3);
    if(r.part==='body'){sound('fall',p.x);const s=r.nodes.shoulder||p;bloodPool((p.x+s.x)/2,r.floor+rand(-1,2),rand(22,34));for(let i=0;i<3;i++)addDecal(p.x+rand(-16,16),r.floor+rand(-3,3),rand(1.5,3));}
  }
  // Settled corpses stop stepping: cheap for the 28-corpse pile.
  if(r.part==='body'&&r.age>2.5&&motion*120<4&&Object.values(r.nodes).every(n=>n.y>=r.floor-n.r-.6)){r.settled=true;for(const n of Object.values(r.nodes)){n.px=n.x;n.py=n.y;}}
}
function updateEffects(dt){
  effectsClock+=dt;physicsAccumulator+=dt;let iterations=0;
  while(physicsAccumulator>=1/120&&iterations++<6){for(const r of corpses)stepRig(r,1/120);for(const r of rigs)stepRig(r,1/120);physicsAccumulator-=1/120;}
  corpses=corpses.filter(r=>r.age<r.life);rigs=rigs.filter(r=>r.age<r.life);
  for(const p of particles){
    if(p.kind==='stumpDrip'){
      const source=p.source,position=(source.nodes||source.pose||{})[p.nodeName];
      const absentParent=!source.ragdoll&&source.missing&&
        (p.nodeName.startsWith('elbow')&&source.missing['arm'+p.nodeName.slice(-1)]||p.nodeName.startsWith('knee')&&source.missing['leg'+p.nodeName.slice(-1)]);
      if(!position||source.dead&&!source.ragdoll||absentParent){p.life=0;continue;}
      p.x=position.x;p.y=position.y;p.dripTimer-=dt;
      if(p.dripTimer<=0&&p.life>0){p.dripTimer=.1;emit({kind:'blood',x:p.x,y:p.y,vx:rand(-5,5),vy:rand(3,13),life:.6,size:rand(1,1.8),color:'#5a120c',floor:p.floor,gravity:210,drag:.9});}
    }
    p.age+=dt;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.gravity||0)*dt;
    const drag=Math.exp(-p.drag*dt);p.vx*=drag;p.vy*=drag;p.angle+=p.spin*dt;
    if(p.floor!==undefined&&p.y>=p.floor){
      p.y=p.floor;
      if(p.kind==='blood'){addDecal(p.x,p.y,p.size*rand(.5,.9));p.life=0;}
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
  const p=r.nodes;c.save();c.globalAlpha=r.alpha*(r.settled?.92:1);
  if(r.part==='body')drawZombie(c,r,p);
  else if(r.part==='head')drawZombieHead(c,r,p.head,r.angle,false,true);
  else drawZombiePart(c,r,p,r.part.slice(-1),/^(arm|forearm)/.test(r.part)?'arm':'leg');
  c.restore();
}
function starPoints(outer,inner,n=8){const pts=[];for(let i=0;i<n*2;i++){const a=i*Math.PI/n,r=i%2?inner:outer;pts.push([Math.cos(a)*r,Math.sin(a)*r]);}return pts;}
function drawParticles(c){
  for(const p of particles){
    if(p.kind==='stumpDrip')continue;
    const fade=clamp(p.life/Math.min(p.max,.3),0,1);c.globalAlpha=fade;
    if(p.kind==='text'){
      const pop=1+.7*clamp(1-p.age/.12,0,1),size=p.size>2?p.size:9;
      c.save();c.translate(Math.round(p.x),Math.round(p.y));c.scale(pop,pop);c.font=`bold ${size}px monospace`;c.textAlign='center';c.textBaseline='alphabetic';
      c.fillStyle='#1a1c14';for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]])c.fillText(p.text,ox,oy);
      c.fillStyle=p.color;c.fillText(p.text,0,0);c.restore();
    }else if(p.kind==='smoke'||p.kind==='dust'){
      const size=p.size+p.age*(p.kind==='smoke'?6:3);c.globalAlpha=fade*(1-p.age/p.max)*(p.kind==='smoke'?.24:.3);rect(c,p.x-size/2,p.y-size/2,size,size,p.color);rect(c,p.x-size*.1,p.y-size*.8,size*.6,size*.6,p.color);
    }else if(p.kind==='shell'||p.kind==='magazine'||p.kind==='cloth'){
      c.save();c.translate(p.x,p.y);c.rotate(p.angle);rect(c,-1,-1,p.kind==='magazine'?5:p.kind==='cloth'?p.size:3,p.kind==='magazine'?11:p.kind==='cloth'?p.size:1.5,p.color);if(p.kind==='shell')rect(c,-1,-1,1,1,'#f7d58a');c.restore();
    }else if(p.kind==='blast'){
      const radius=p.size+p.age*60;c.save();c.translate(Math.round(p.x),Math.round(p.y));c.rotate(p.direction);
      c.globalAlpha=p.age<.025?.9:.9*clamp(p.life/Math.max(.001,p.max-.025),0,1);
      poly(c,starPoints(radius,radius*.42),p.color);poly(c,starPoints(radius*.55,radius*.22),'#fff3c4');c.restore();
    }else if(p.kind==='core'){
      c.save();c.translate(Math.round(p.x),Math.round(p.y));c.rotate(p.direction);c.globalAlpha=1;rect(c,-2,-3,p.size,6,p.color);c.restore();
    }else if(p.kind==='ring'){
      const radius=(p.size||12)*(.55+.45*clamp(p.age/p.max,0,1));c.globalAlpha=fade*.9;
      for(let i=0;i<12;i++){const a=i*TAU/12;rect(c,p.x+Math.cos(a)*radius-1,p.y+Math.sin(a)*radius-1,2,2,p.color||'#f2e2b0');}
    }else if(p.kind==='tracerGhost'){
      const len=p.length||40,x2=p.x2!==undefined?p.x2:p.x-Math.cos(p.direction||0)*len,y2=p.y2!==undefined?p.y2:p.y-Math.sin(p.direction||0)*len;
      c.globalAlpha=fade*(p.alpha||.35);bone(c,{x:p.x,y:p.y},{x:x2,y:y2},p.size||3,p.color||'#ffe8a8');
    }else if(p.kind==='tracer'){
      c.globalAlpha=fade*.6;bone(c,{x:p.x,y:p.y},{x:p.x-Math.cos(p.direction)*21,y:p.y-Math.sin(p.direction)*21},1,p.color);
    }else if(p.kind==='impactCore'){
      rect(c,p.x-1,p.y-2,2,4,p.color);rect(c,p.x-3,p.y,6,1,p.color);
    }else if(p.kind==='spark'){bone(c,{x:p.x,y:p.y},{x:p.x-p.vx*.025,y:p.y-p.vy*.025},p.size||1,p.color);}
    else if(p.kind==='blood'){
      if(p.chunk){c.save();c.translate(p.x,p.y);c.rotate(p.angle);rect(c,-p.size/2,-p.size/2,p.size,p.size,p.color);rect(c,-p.size/2,-p.size/2,p.size*.5,p.size*.5,'#d1382a');c.restore();}
      else{rect(c,p.x,p.y,p.size,p.size,p.color);if(p.age<.15)bone(c,{x:p.x,y:p.y},{x:p.x-p.vx*.018,y:p.y-p.vy*.018},Math.max(1,p.size*.6),p.color);}
    }
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
