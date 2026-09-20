'use strict';

// The lab supplies a small runtime for the exact same articulated renderer as the game.
const PLAYER_SCALE=1;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const player={x:220,y:324,face:1,vx:0,vy:0,walk:0,kick:0,climb:0,inv:0,sprinting:false,heat:0};
let worldTime=0,reloadTime=0,muzzle=0,shotSerial=0,meleeSwing=null;
let previewWeapon='rifle';
const pointer={x:440,y:230};
function getWeapon(){return weaponById(previewWeapon);}
function getReloadDuration(){return getWeapon().reloadDuration;}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));}
function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(Math.round(x),Math.round(y)):c.moveTo(Math.round(x),Math.round(y)));c.closePath();c.fill();}
function limb(c,x1,y1,x2,y2,width,color){c.save();c.translate(Math.round(x1),Math.round(y1));c.rotate(Math.atan2(y2-y1,x2-x1));rect(c,0,-width/2,Math.hypot(x2-x1,y2-y1),width,color);c.restore();}

(()=>{
  const $=id=>document.getElementById(id),canvas=$('preview'),ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;
  const LABELS={head:['头部','HEAD'],face:['面部','FACE'],top:['上装','TOP'],gear:['携行装备','GEAR'],pants:['裤装','PANTS'],boots:['鞋靴','FOOTWEAR']};
  const COLORS={top:'上装',pants:'裤装',boots:'鞋靴',gear:'携行',head:'头部',face:'面部',skin:'肤色'};
  const ACTIONS={idle:{name:'待机',en:'IDLE',duration:3,hint:'观察轮廓、站姿与装备的遮挡关系。'},walk:{name:'行走',en:'WALK',duration:1.2,hint:'原地循环步态，检查膝部、裤装与脚步衔接。'},sprint:{name:'冲刺',en:'SPRINT',duration:.72,hint:'高抬腿与前倾姿态，观察装备随身运动。'},fire:{name:'射击',en:'FIRE',duration:2,hint:'检查贴肩、枪口焰，以及后坐时的衣袖与双手。'},reload:{name:'换弹',en:'RELOAD',duration:1.85,hint:'拖动时间轴，检查远手始终正确藏在身体后方。'},melee:{name:'近战',en:'MELEE',hint:'拖动时间轴检查蓄力、挥击与回收；金色段表示有效打击区间。'}};
  let action='idle',time=0,paused=false,speed=1,grid=true,skeleton=false,selectedPreset='',savedSnapshot='',toastTimer=0,lastStamp=null,raf=0,scrubbing=false,meleeSelection='combo',aimDegrees=0;
  const MELEE_REST=.2;
  const PHASE_NAMES={windup:'蓄力',active:'挥击',recovery:'回收',pause:'衔接'};
  const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if(reducedMotion)paused=true;
  const snapshot=()=>JSON.stringify(wardrobe.get());
  function status(){const dirty=snapshot()!==savedSnapshot;$('save-state').textContent=dirty?'有尚未保存的调整':'当前装备已同步';$('save-state').classList.toggle('dirty',dirty);}
  function notify(text,error=false){clearTimeout(toastTimer);const toast=$('toast');toast.textContent=text;toast.classList.toggle('error',error);toast.classList.add('visible');toastTimer=setTimeout(()=>toast.classList.remove('visible'),3600);}
  function optionButton(text,value,category){const button=document.createElement('button');button.type='button';button.textContent=text;button.dataset.value=value;button.dataset.category=category;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>{wardrobe.set({[category]:value});selectedPreset='';sync();});return button;}
  function buildEquipment(){for(const [key,label] of Object.entries(LABELS)){const group=document.createElement('div');group.className='equipment-group';const name=document.createElement('div');name.className='equipment-name';name.append(document.createTextNode(label[0]));const en=document.createElement('span');en.textContent=label[1];name.append(en);const row=document.createElement('div');row.className='option-row';row.setAttribute('role','group');row.setAttribute('aria-label',label[0]);for(const item of wardrobe.catalog[key]||[])row.append(optionButton(item.name,item.id,key));group.append(name,row);$('equipment-list').append(group);}}
  function buildPresets(){wardrobe.presets.forEach((preset,index)=>{const button=document.createElement('button');button.type='button';button.className='preset-card';button.dataset.preset=preset.id;button.setAttribute('aria-pressed','false');const colors=document.createElement('span');colors.className='preset-colors';for(const key of ['top','pants','head','gear']){const chip=document.createElement('i');chip.style.backgroundColor=preset.config?.colors?.[key]||['#838573','#b9a27a','#394131','#6d6650'][colors.children.length];colors.append(chip);}const text=document.createElement('span'),name=document.createElement('strong'),description=document.createElement('small'),number=document.createElement('span');name.textContent=preset.name;description.textContent=preset.description;number.className='preset-number';number.textContent=String(index+1).padStart(2,'0');text.append(name,description);button.append(colors,text,number);button.addEventListener('click',()=>{wardrobe.applyPreset(preset.id);selectedPreset=preset.id;sync();});$('preset-list').append(button);});}
  function setColor(key,value){if(!/^#[\da-f]{6}$/i.test(value))return false;const config=wardrobe.get();wardrobe.set({colors:{...config.colors,[key]:value}});selectedPreset='';sync();return true;}
  function buildColors(){for(const [key,name] of Object.entries(COLORS)){const row=document.createElement('div');row.className='color-row';const label=document.createElement('label');label.htmlFor='color-'+key;label.textContent=name;const picker=document.createElement('input');picker.type='color';picker.id='color-'+key;picker.dataset.color=key;picker.setAttribute('aria-label',name+'颜色');const hex=document.createElement('input');hex.type='text';hex.className='hex-input';hex.maxLength=7;hex.pattern='#[0-9a-fA-F]{6}';hex.spellcheck=false;hex.id='hex-'+key;hex.setAttribute('aria-label',name+'十六进制颜色');picker.addEventListener('input',()=>setColor(key,picker.value));hex.addEventListener('change',()=>{if(!setColor(key,hex.value)){hex.value=wardrobe.get().colors[key];notify('请输入 # 开头的六位颜色，例如 #7C7D6D。',true);}});row.append(label,picker,hex);$('color-list').append(row);}}
  function meleeSequence(){return meleeSelection==='combo'?MELEE_MOVES:[meleeMove(meleeSelection)];}
  function meleeSample(t){
    const moves=meleeSequence();let cursor=0;
    for(let index=0;index<moves.length;index++){
      const move=moves[index],span=move.duration+MELEE_REST;
      if(t<cursor+span||index===moves.length-1){
        const elapsed=clamp(t-cursor,0,span),progress=clamp(elapsed/move.duration,0,1);
        const phase=elapsed>=move.duration?'pause':progress<move.activeStart?'windup':progress<=move.activeEnd?'active':'recovery';
        return{move,index,total:moves.length,elapsed,progress,phase};
      }
      cursor+=span;
    }
  }
  function duration(){return action==='reload'?Math.max(.1,getReloadDuration()):action==='melee'?meleeSequence().reduce((sum,m)=>sum+m.duration+MELEE_REST,0):ACTIONS[action].duration;}
  function buildMeleeTimeline(){
    const track=$('melee-phases');track.replaceChildren();
    for(const [index,move] of meleeSequence().entries()){
      const span=move.duration+MELEE_REST,clip=document.createElement('div');clip.className='melee-clip';clip.dataset.move=move.id;
      clip.style.flex=String(span);clip.style.setProperty('--windup',(move.activeStart*move.duration/span*100)+'%');clip.style.setProperty('--active',(move.activeEnd*move.duration/span*100)+'%');clip.style.setProperty('--finish',(move.duration/span*100)+'%');
      const name=document.createElement('span'),stamp=document.createElement('small');name.textContent=String(index+1).padStart(2,'0')+' '+move.name;stamp.textContent=move.duration.toFixed(2)+'s + '+MELEE_REST.toFixed(1)+'s';clip.append(name,stamp);track.append(clip);
    }
  }
  function setMove(id){if(id!=='combo'&&!MELEE_MOVES.some(move=>move.id===id))return;meleeSelection=id;time=0;syncAction();render();}
  function setAim(value){aimDegrees=clamp(Number(value)||0,-35,35);$('aim-angle').value=String(aimDegrees);$('aim-readout').textContent=(aimDegrees>0?'+':'')+aimDegrees+'°';render();}
  function setAction(id){action=id;if(id==='melee')previewWeapon='crowbar';else if(getWeapon().melee&&(id==='fire'||id==='reload'))previewWeapon='rifle';time=0;syncAction();render();}
  function buildActions(){for(const [id,a] of Object.entries(ACTIONS)){const b=document.createElement('button');b.type='button';b.dataset.action=id;const small=document.createElement('span');small.textContent=a.en;b.append(small,document.createTextNode(a.name));b.addEventListener('click',()=>setAction(id));$('action-list').append(b);}for(const w of Object.values(WEAPONS)){const option=document.createElement('option');option.value=w.id;option.textContent=w.label;$('weapon').append(option);}for(const move of MELEE_MOVES){const option=document.createElement('option');option.value=move.id;option.textContent=move.name+' · '+move.duration.toFixed(2)+' s';$('melee-move').append(option);}}
  function syncAction(){const a=ACTIONS[action];for(const b of document.querySelectorAll('[data-action]'))b.setAttribute('aria-pressed',String(b.dataset.action===action));$('weapon').value=previewWeapon;$('melee-controls').hidden=action!=='melee';$('melee-phases').hidden=action!=='melee';$('melee-move').value=meleeSelection;if(action==='melee')buildMeleeTimeline();$('action-readout').textContent=a.name+' / '+a.en;$('timeline-label').textContent=action==='melee'?(meleeSelection==='combo'?'双连段循环':meleeMove(meleeSelection).name):a.name+(action==='reload'?'过程':'循环');$('action-hint').textContent=a.hint;$('play-pause').textContent=paused?'▶':'Ⅱ';$('play-pause').setAttribute('aria-label',paused?'播放动作':'暂停动作');}
  function sync(){const config=wardrobe.get();for(const b of document.querySelectorAll('[data-category]'))b.setAttribute('aria-pressed',String(config[b.dataset.category]===b.dataset.value));for(const b of document.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String(b.dataset.preset===selectedPreset));for(const key of Object.keys(COLORS)){if($('color-'+key))$('color-'+key).value=config.colors[key];if($('hex-'+key))$('hex-'+key).value=config.colors[key].toUpperCase();}const preset=wardrobe.presets.find(p=>p.id===selectedPreset);$('outfit-name').textContent=preset?preset.name:'我的幸存者';status();render();}
  function sample(){const w=getWeapon(),d=duration(),t=clamp(time,0,d);worldTime=t;player.vx=0;player.vy=0;player.sprinting=false;player.walk=0;player.kick=0;player.climb=0;player.heat=0;reloadTime=0;muzzle=0;meleeSwing=null;const localAim=aimDegrees*Math.PI/180,aimOriginX=player.x+(w.melee?0:player.face*2),aimOriginY=player.y-(w.melee?94:91);pointer.x=aimOriginX+player.face*Math.cos(localAim)*200;pointer.y=aimOriginY+Math.sin(localAim)*200;
    if(action==='walk'||action==='sprint'){player.sprinting=action==='sprint';player.vx=player.face*(player.sprinting?86:55);player.walk=t/d*Math.PI*2;}
    else if(action==='reload'){reloadTime=Math.max(0,w.reloadDuration-t);}
    else if(action==='melee'){
      const current=meleeSample(t),move=current.move;
      meleeSwing=current.elapsed<move.duration?{moveId:move.id,elapsed:current.elapsed,duration:move.duration,angle:player.face===1?localAim:Math.PI-localAim,face:player.face}:null;
    }
    else if(action==='fire'&&!w.melee){const interval=w.semiAuto?Math.max(.48,w.fireInterval):w.id==='shotgun'?.82:w.fireInterval,age=t%interval;shotSerial=Math.floor(t/interval)+1;muzzle=Math.max(0,w.muzzleLife-age);const spring=w.kickSpring||21;for(let n=0;n<6;n++){const a=age+n*interval;if(a>1)break;player.kick+=((w.kickSnap||2)+(w.kickImpulse||58)*a)*Math.exp(-spring*a);}player.kick=Math.min(w.maxKick||8,player.kick);player.climb=(w.climbSnap||.02)*Math.exp(-age*8);player.heat=.35;}
    player.pose=makePlayerPose().pose;
  }
  function stage(c){c.clearRect(0,0,480,390);if(grid){c.strokeStyle='#6e805b16';c.lineWidth=1;c.beginPath();for(let x=0;x<480;x+=20){c.moveTo(x+.5,0);c.lineTo(x+.5,353);}for(let y=13;y<354;y+=20){c.moveTo(0,y+.5);c.lineTo(480,y+.5);}c.stroke();}c.fillStyle='#111b104d';c.fillRect(0,327,480,31);c.strokeStyle='#66774e';c.lineWidth=1;c.beginPath();c.moveTo(30,327.5);c.lineTo(450,327.5);c.stroke();c.fillStyle='#10170fcc';c.beginPath();c.ellipse(220,330,72,6,0,0,Math.PI*2);c.fill();c.fillStyle='#6b7c55';for(let x=40;x<450;x+=20)c.fillRect(x,328,1,x%40===0?5:3);c.font='7px monospace';c.fillStyle='#677853';c.fillText('L / 001',29,24);c.fillText('FIELD EQUIPMENT',349,24);if(grid){c.strokeStyle='#8fa36344';c.setLineDash([3,5]);c.beginPath();c.moveTo(220.5,28);c.lineTo(220.5,327);c.stroke();c.setLineDash([]);}c.fillStyle='#566947';c.fillRect(45,56,1,247);for(let y=56;y<=303;y+=20)c.fillRect(42,y,4,1);c.fillStyle='#6d7c57';c.font='7px monospace';c.fillText('180',26,59);c.fillText('090',26,181);c.fillText('000',26,306);}
  function drawSkeleton(c){const pose=player.pose,links=[['head','shoulder'],['shoulder','hip'],['shoulder','elbowL'],['elbowL','handL'],['shoulder','elbowR'],['elbowR','handR'],['hip','kneeL'],['kneeL','footL'],['hip','kneeR'],['kneeR','footR']];c.save();c.globalAlpha=.85;c.strokeStyle='#d3ec89';c.lineWidth=.65;for(const [a,b] of links){c.beginPath();c.moveTo(pose[a].x,pose[a].y);c.lineTo(pose[b].x,pose[b].y);c.stroke();}for(const point of Object.values(pose)){c.fillStyle='#101c12';c.fillRect(point.x-1.5,point.y-1.5,3,3);c.fillStyle='#e3f29c';c.fillRect(point.x-1,point.y-1,2,2);}c.restore();}
  function drawModel(c,bones=skeleton){c.save();c.translate(player.x,player.y);c.scale(2,2);c.translate(-player.x,-player.y);drawPlayer(c);if(bones)drawSkeleton(c);c.restore();}
  function render(){sample();stage(ctx);drawModel(ctx);$('timeline').value=String(Math.round(time/duration()*1000));$('time-readout').textContent=time.toFixed(2)+' / '+duration().toFixed(2)+' s';
    if(action==='melee'){
      const current=meleeSample(time);$('melee-step-name').textContent=String(current.index+1).padStart(2,'0')+' / '+String(current.total).padStart(2,'0')+' · '+current.move.name;
      $('melee-phase').textContent=PHASE_NAMES[current.phase];$('melee-phase').dataset.phase=current.phase;
      $('action-readout').textContent=current.move.name+' / '+PHASE_NAMES[current.phase];
      for(const clip of $('melee-phases').children)clip.classList.toggle('active',clip.dataset.move===current.move.id);
    }
  }
  function tick(stamp){const dt=lastStamp===null?0:Math.min(.05,(stamp-lastStamp)/1000);lastStamp=stamp;if(!paused&&!scrubbing)time=(time+dt*speed)%duration();render();raf=requestAnimationFrame(tick);}
  function togglePause(){paused=!paused;syncAction();}
  $('play-pause').addEventListener('click',togglePause);$('speed').addEventListener('change',()=>{speed=Number($('speed').value);});$('show-grid').addEventListener('change',()=>{grid=$('show-grid').checked;render();});$('show-bones').addEventListener('change',()=>{skeleton=$('show-bones').checked;render();});
  for(const b of document.querySelectorAll('[data-face]'))b.addEventListener('click',()=>{player.face=Number(b.dataset.face);for(const other of document.querySelectorAll('[data-face]')){const selected=Number(other.dataset.face)===player.face;other.classList.toggle('selected',selected);other.setAttribute('aria-pressed',String(selected));}render();});
  $('weapon').addEventListener('change',()=>{previewWeapon=$('weapon').value;if(getWeapon().melee&&['fire','reload'].includes(action))action='melee';else if(!getWeapon().melee&&action==='melee')action='idle';time=0;syncAction();render();});
  $('melee-move').addEventListener('change',()=>setMove($('melee-move').value));$('aim-angle').addEventListener('input',()=>setAim($('aim-angle').value));
  $('timeline').addEventListener('pointerdown',()=>{scrubbing=true;paused=true;syncAction();});window.addEventListener('pointerup',()=>{scrubbing=false;});$('timeline').addEventListener('input',()=>{paused=true;time=Number($('timeline').value)/1000*duration();syncAction();render();});
  $('reset').addEventListener('click',()=>{wardrobe.reset();selectedPreset=wardrobe.presets[0]?.id||'';sync();notify('已恢复经典装备；点击保存后应用到游戏。');});
  $('save').addEventListener('click',()=>{let ok=false;try{ok=wardrobe.save();}catch{}if(ok){savedSnapshot=snapshot();status();notify('装备已保存，返回游戏即可穿上这套搭配。');}else notify('保存失败：浏览器无法写入本地存储。当前试装仍保留在本页。',true);});
  $('export').addEventListener('click',()=>{try{const exportCanvas=document.createElement('canvas');exportCanvas.width=480;exportCanvas.height=390;const c=exportCanvas.getContext('2d');c.imageSmoothingEnabled=false;sample();drawModel(c,false);const a=document.createElement('a');a.download='last-light-survivor.png';a.href=exportCanvas.toDataURL('image/png');a.click();notify('已导出当前姿态的透明背景 PNG。');}catch{notify('当前浏览器无法导出图片，请更换浏览器重试。',true);}});
  document.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;if(e.code==='Space'&&e.target.tagName==='BUTTON')return;if(e.code==='Space'){e.preventDefault();togglePause();}else if(e.code==='ArrowLeft'||e.code==='ArrowRight'){e.preventDefault();paused=true;time=clamp(time+(e.code==='ArrowRight'?1:-1)/60,0,duration());syncAction();render();}});
  document.addEventListener('visibilitychange',()=>{lastStamp=null;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else if(!raf)raf=requestAnimationFrame(tick);});
  wardrobe.load();savedSnapshot=snapshot();for(const preset of wardrobe.presets){if(JSON.stringify(preset.config)===savedSnapshot){selectedPreset=preset.id;break;}}
  buildPresets();buildEquipment();buildColors();buildActions();syncAction();sync();raf=requestAnimationFrame(tick);
  // A small explicit interface supports visual regression checks without a game runtime.
  window.wardrobePreview={render,setAction,setMove,setAim,getState:()=>{const current=action==='melee'?meleeSample(time):null;return{action,time,duration:duration(),paused,weapon:previewWeapon,face:player.face,dirty:snapshot()!==savedSnapshot,meleeSelection,moveId:current?.move.id??null,comboStep:current?current.index+1:0,moveElapsed:current?.elapsed??0,phase:current?.phase??null,aimDegrees};},seek(value){paused=true;time=clamp(value,0,duration());syncAction();render();}};
})();
