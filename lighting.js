'use strict';

// Light sprites are cached at logical resolution. The final frame is still enlarged with nearest-neighbour pixels.
const sceneLighting=(()=>{
  const sprites=new Map();let map=null,mask=null,mapCtx=null,maskCtx=null,lights=[],camera=0,width=640;
  const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
  function surface(w,h){const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;}
  function sprite(color,beam=false){
    const key=color+(beam?':beam':':halo');if(sprites.has(key))return sprites.get(key);
    const cv=surface(96,beam?128:96),c=cv.getContext('2d');
    if(beam){
      for(let y=0;y<128;y+=2){
        const t=y/128,half=5+42*t,fade=Math.sin(Math.PI*Math.min(.96,t*.8+.08))*.13;
        for(let x=Math.floor(48-half);x<48+half;x+=2){const side=Math.abs(x-48)/half;c.globalAlpha=fade*Math.pow(Math.max(0,1-side*side),2);c.fillStyle=color;c.fillRect(x,y,2,2);}
      }
    }else{
      const g=c.createRadialGradient(48,48,0,48,48,48);
      if(g&&g.addColorStop){g.addColorStop(0,color+'b8');g.addColorStop(.15,color+'79');g.addColorStop(.4,color+'32');g.addColorStop(.7,color+'0b');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,96,96);}
    }
    c.globalAlpha=1;if(sprites.size>32)sprites.clear();sprites.set(key,cv);return cv;
  }
  function halo(c,x,y,rx,ry,color,power){
    if(power<=0||rx<=0||ry<=0)return;c.globalAlpha=power;c.drawImage(sprite(color),Math.round(x-rx),Math.round(y-ry),Math.round(rx*2),Math.round(ry*2));
  }
  function begin(areaId,viewLeft,time,frameWidth){
    camera=Math.round(viewLeft);width=frameWidth;
    if(!map||map.width!==width){map=surface(width,330);mapCtx=map.getContext('2d');mapCtx.imageSmoothingEnabled=false;}
    if(!mask){mask=surface(320,240);maskCtx=mask.getContext('2d');maskCtx.imageSmoothingEnabled=false;}
    const supplied=areaId==='road'?(typeof getWorldLights==='function'?getWorldLights(camera,time):[]):(typeof isHouseArea==='function'&&isHouseArea(areaId)?houseArt.lights(areaId,camera,time):(typeof getInteriorLights==='function'?getInteriorLights(areaId,camera,time):[]));
    lights=supplied.filter(l=>Number.isFinite(l.x)&&Number.isFinite(l.y)&&l.x+(l.radius||80)>-20&&l.x-(l.radius||80)<width+20).slice(0,18).map(l=>({...l,intensity:Math.max(0,Math.min(1.25,finite(l.intensity,1))),radius:Math.max(12,finite(l.radius,80))}));
    const w=getWeapon();
    if(muzzle>0&&!w.melee&&w.muzzleLife>0){const m=playerMuzzle(),life=Math.min(1,muzzle/w.muzzleLife);lights.push({x:m.x-camera,y:m.y,color:'#ffc276',intensity:Math.pow(life,.6)*(w.id==='shotgun'?1.2:.95),radius:w.id==='shotgun'?145:w.id==='pistol'?87:112,flash:true,angle:m.angle,floorY:player.y+1,floorWidth:w.id==='shotgun'?84:62});}
    const c=mapCtx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,width,330);c.globalCompositeOperation='source-over';
    for(const l of lights){
      halo(c,l.x,l.y,l.radius,l.radius,l.color,l.intensity*(l.flash?.9:.52));
      if(l.floorY>l.y){
        const h=l.floorY-l.y,fw=l.floorWidth||l.radius*.55;
        if(l.cone){c.globalAlpha=l.intensity*.8;c.drawImage(sprite(l.color,true),Math.round(l.x-fw),Math.round(l.y),Math.round(fw*2),Math.round(h));}
        halo(c,l.x,l.floorY,fw,10,l.color,l.intensity*(l.flash?.3:.45));
      }
    }
    c.globalAlpha=1;
  }
  function ground(c){
    c.save();c.globalCompositeOperation='screen';
    // Low intensity surface spill precedes combatants, so beams never paint over bodies.
    c.globalAlpha=.62;c.drawImage(map,0,0);c.restore();
  }
  function shadow(c,e){
    const sx=e.x-camera;let best=null,strength=0;
    for(const l of lights){if(!l.floorY||Math.abs(l.x-sx)>l.radius||Math.abs(l.floorY-e.y)>80)continue;const power=l.intensity*(1-Math.abs(l.x-sx)/l.radius);if(power>strength){strength=power;best=l;}}
    if(!best||strength<.15)return;
    const dx=Math.max(-40,Math.min(40,(sx-best.x)*.28)),length=best.flash?9:14;
    c.save();c.globalAlpha=Math.min(.22,strength*.2);c.fillStyle='#111923';c.beginPath();c.moveTo(e.x-8,e.y+2);c.lineTo(e.x+7,e.y+2);c.lineTo(e.x+dx+15,e.y+length);c.lineTo(e.x+dx-11,e.y+length);c.closePath();c.fill();c.restore();
  }
  function actor(c,e,drawSprite){
    if(!e.pose||!lights.length)return;
    const center=e.pose.shoulder||{x:e.x,y:e.y-60},sx=center.x-camera;
    const nearby=lights.some(l=>l.intensity>.08&&Math.abs(l.x-sx)<l.radius+45&&((Math.abs(l.y-center.y)<l.radius+55)||(l.cone&&l.floorY>center.y)));
    if(!nearby)return;
    const left=Math.round(e.x-160),top=Math.round(e.y-212),m=maskCtx;
    m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,320,240);m.globalCompositeOperation='source-over';m.globalAlpha=1;
    m.save();m.translate(-left,-top);drawSprite(m);m.restore();
    // Source-in uses a genuinely transparent sprite mask, not the opaque world canvas.
    m.globalCompositeOperation='source-in';m.drawImage(map,camera-left,-top);m.globalCompositeOperation='source-over';
    c.save();c.globalCompositeOperation='screen';c.globalAlpha=.88;c.drawImage(mask,left,top);c.restore();
  }
  function finish(c){
    c.save();c.globalCompositeOperation='screen';
    for(const l of lights){
      if(l.flash){
        halo(c,l.x,l.y,l.radius*.56,l.radius*.39,l.color,l.intensity*.32);
        c.save();c.translate(l.x,l.y);c.rotate(l.angle);halo(c,10,0,26,8,'#ffdba0',l.intensity*.5);c.restore();continue;
      }
      const tube=Math.max(0,finite(l.tube));
      halo(c,l.x,l.y,tube?tube*.75+14:18,tube?12:18,l.color,l.intensity*.55);
      halo(c,l.x,l.y,tube?tube*.6+6:7,5,l.color,l.intensity*.5);
      // Fixture cores are drawn by the scene artist. A wide light source may also be
      // a window or a sign: never turn it into an extra white stripe here.
    }
    c.restore();
  }
  function sources(){return lights.map(l=>({...l}));}
  return {begin,ground,shadow,actor,finish,sources};
})();
