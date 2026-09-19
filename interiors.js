'use strict';
// Interior areas (entered through doors on the road). game.js reads INTERIORS and owns the transition;
// this file only draws rooms. It shares the frame size and lane band with world.js (characters walk y 246..312).
const interiorArt = (() => {
  const HEIGHT = 330;
  let WIDTH = 640;
  const frame = () => (typeof worldArt !== 'undefined' && worldArt.width) ? worldArt.width() : WIDTH;
  function hash(n) { const f=Math.sin(n*127.1+311.7)*43758.5453;return f-Math.floor(f); }
  const px=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
  function shape(c,p,col){c.fillStyle=col;c.beginPath();for(let i=0;i<p.length;i++)i?c.lineTo(Math.round(p[i][0]),Math.round(p[i][1])):c.moveTo(Math.round(p[i][0]),Math.round(p[i][1]));c.closePath();c.fill();}
  function line(c,x1,y1,x2,y2,col,width=1){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x1)+.5,Math.round(y1)+.5);c.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);c.stroke();}
  function label(c,text,x,y,color,size=7){c.fillStyle=color;c.font=`bold ${size}px monospace`;c.textBaseline='alphabetic';c.fillText(text,Math.round(x),Math.round(y));}
  function grade(c){ if (typeof worldArt !== 'undefined' && worldArt.grade) worldArt.grade(c); }
  // ---- Interior areas (entered through landmark doors; game.js reads INTERIORS and owns the transition) ----
  // Coordinates are interior world x (0..length) and the same lane y band as the road (characters walk y 246..312).
  const INTERIORS = { store: { id:'store', name:'加油站便利店', code:'S-02', length: 900, floorLight:true, exits:[{x:60,w:44,label:'离开商店'}], loot:[{x:520,y:300,type:'ammo'},{x:790,y:302,type:'health'}], spawns:[{x:380,y:262},{x:560,y:300},{x:700,y:250},{x:830,y:290}] } };
  const VOID='#0b0c09', rooms=new Map();
  const TUBES={store:[{x:200},{x:470,flicker:true},{x:740}]};
  const GOODS=['#8a5a3c','#6f7a5c','#8c7d5a','#5f6b70','#9a6a45','#7a4a3a','#6b6b4a','#7d6f58'];
  function tube(c,x,lit){px(c,x-30,0,1,44,'#3d3f37');px(c,x+30,0,1,44,'#3d3f37');px(c,x-42,44,84,6,'#4a4c42');px(c,x-40,50,80,4,lit?'#d9d7b0':'#6d6c58');px(c,x-40,50,3,4,'#8f8a70');px(c,x+37,50,3,4,'#8f8a70');if(lit){px(c,x-38,51,76,1,'#f2efd0');c.globalAlpha=.055;shape(c,[[x-40,54],[x+40,54],[x+118,HEIGHT],[x-118,HEIGHT]],'#e8e2b8');c.globalAlpha=1;}}
  function goods(c,x,y,w,seed){for(let xx=x;xx<x+w-8;){const q=hash(seed+xx),col=GOODS[Math.floor(hash(seed*3+xx)*GOODS.length)];if(q<.22){xx+=6+q*20;continue;}
    if(q<.55){px(c,xx,y-8,5,8,col);px(c,xx,y-8,5,1,'#9a927a');px(c,xx+1,y-5,3,2,'#e0d8b0');xx+=6;}
    else if(q<.8){px(c,xx+1,y-11,3,11,col);px(c,xx+1,y-13,3,2,'#8a8262');px(c,xx+1,y-7,3,3,'#35463e');xx+=5;}
    else{px(c,xx,y-7,9,7,col);px(c,xx,y-4,9,1,'#3b3a2e');px(c,xx+2,y-6,5,1,'#d8ceaa');xx+=10;}}}
  function shelfUnit(c,x,y,w,h,seed){px(c,x,y-h,w,h,'#3e4236');const rows=3,gap=(h-8)/rows;for(let r=0;r<=rows;r++){const sy=y-h+4+r*gap;px(c,x,sy,w,3,'#7a7458');px(c,x,sy+3,w,1,'#4c4a3a');if(r)goods(c,x+6,sy,w-12,seed+r*7);}px(c,x,y-h,3,h,'#6f6a52');px(c,x+w-3,y-h,3,h,'#6f6a52');px(c,x+1,y-h,1,h,'#857f62');px(c,x+w-2,y-h,1,h,'#4c4a3a');px(c,x-2,y-2,w+4,3,'#2b2d27');}
  function cooler(c,x,y){px(c,x,y-144,110,144,'#5f6254');px(c,x,y-144,110,14,'#3f5654');label(c,'ICE  COLD',x+22,y-134,'#93aa9f',7);px(c,x+2,y-130,106,2,'#6b6d5e');
    for(const dx of [4,56]){const gx=x+dx,gy=y-128;px(c,gx,gy,50,124,'#354e4b');for(let r=0;r<4;r++){const sy=gy+24+r*26;px(c,gx,sy,50,2,'#4c6461');for(let b=0;b<7;b++){if(hash(gx+r*13+b)<.3)continue;px(c,gx+4+b*7,sy-9,3,9,['#5f6b70','#6f7a5c','#8a5a3c','#8c7d5a'][(b+r)%4]);px(c,gx+4+b*7,sy-11,3,2,'#8a8262');}}
      px(c,gx+2,gy+3,1,110,'#5f7a78');px(c,gx-1,gy-1,52,1,'#6b6d5e');px(c,gx-1,gy-1,1,126,'#6b6d5e');px(c,gx+49,gy-1,2,126,'#6b6d5e');px(c,gx+43,gy+38,3,46,'#8a8b7a');}
    px(c,x,y-6,110,6,'#2f3129');for(let s=6;s<106;s+=6)px(c,x+s,y-4,3,2,'#3d3f37');}
  function counter(c,x){px(c,x+6,96,100,54,'#3e4236');for(let r=0;r<4;r++)for(let b=0;b<11;b++){if(hash(r*31+b+x)<.35)continue;px(c,x+9+b*9,100+r*12,7,8,GOODS[(b*3+r)%GOODS.length]);px(c,x+9+b*9,100+r*12,7,2,'#d8ceaa');}
    px(c,x+6,82,100,13,'#764832');px(c,x+6,82,100,1,'#9a5a3a');label(c,'SUPPLY / 24H',x+16,92,'#8c7d5a',7);
    px(c,x,166,112,72,'#6a5b40');for(let p=x+4;p<x+112;p+=9)px(c,p,168,2,66,'#5e5039');px(c,x-2,160,116,6,'#8a7d5a');px(c,x-2,160,116,1,'#9a8b5e');px(c,x,234,112,4,'#3b3a2e');
    px(c,x+50,134,36,26,'#5b5d55');px(c,x+50,134,36,2,'#7a7760');px(c,x+54,138,16,9,'#35463e');px(c,x+56,141,10,2,'#8d9e69');for(let k=0;k<6;k++)px(c,x+72+(k%3)*5,140+Math.floor(k/3)*5,3,3,'#7a7760');px(c,x+52,152,32,2,'#3d3f37');
    px(c,x+14,150,10,10,'#8a8262');px(c,x+15,151,8,6,'#7a4a3a');px(c,x+30,154,14,6,'#5f6b70');}
  function poster(c,x,y){px(c,x,y,30,42,'#7a6a4a');px(c,x+2,y+2,26,38,'#8a7a55');shape(c,[[x+22,y+42],[x+30,y+42],[x+30,y+34]],'#535744');px(c,x+5,y+6,20,14,'#4a4a3a');px(c,x+9,y+8,12,10,'#6f6a52');label(c,'SALE',x+5,y+30,'#764832',7);px(c,x+5,y+33,18,1,'#5e5039');px(c,x+5,y+36,12,1,'#5e5039');}
  function glassDoor(c,x){px(c,x,96,62,122,'#69604a');px(c,x+3,99,56,116,'#a15e40');px(c,x+3,118,56,15,'#ae6d45');px(c,x+3,133,56,13,'#b17c48');
    const hills=[[x+3,150]];for(let sx=0;sx<=56;sx+=7)hills.push([x+3+sx,147-Math.sin(sx*.09)*4-hash(sx)*4]);hills.push([x+59,150]);shape(c,hills,'#896039');
    px(c,x+3,150,56,52,'#75704f');px(c,x+3,150,56,2,'#8a8262');px(c,x+3,202,56,5,'#8a7d55');px(c,x+3,207,56,8,'#3b3f3d');px(c,x+3,207,56,2,'#9a927a');
    px(c,x+34,172,12,30,'#807459');px(c,x+36,169,8,5,'#a45231');px(c,x+37,176,6,4,'#35463e');px(c,x+12,196,7,6,'#6c6446');
    px(c,x+29,99,3,116,'#69604a');px(c,x+3,156,56,3,'#69604a');px(c,x+8,162,46,3,'#8a8262');px(c,x+8,165,46,1,'#5e5039');px(c,x+7,104,10,6,'#8a8262');px(c,x+8,106,8,1,'#535744');
    px(c,x+14,80,34,12,'#466044');label(c,'EXIT',x+19,89,'#8f9260',8);px(c,x+2,222,64,10,'#4a4a3c');px(c,x+4,224,60,6,'#565646');}
  function drawRoom(c,room){
    const L=room.length;
    px(c,0,0,L,74,'#1c1e19');for(let x=0;x<L;x+=30)px(c,x,0,1,70,'#23261f');for(let y=18;y<70;y+=18)px(c,0,y,L,1,'#23261f');px(c,0,68,L,6,'#2a2c26');px(c,0,73,L,1,'#3a3d33');
    px(c,0,74,L,137,'#535744');px(c,0,74,L,3,'#474b3c');px(c,0,146,L,8,'#6d4a38');px(c,0,146,L,1,'#7c5a44');px(c,0,154,L,57,'#4a4e40');
    for(let y=154;y<211;y+=14)px(c,0,y,L,1,'#41463a');for(let y=154;y<211;y+=14)for(let x=(Math.round((y-154)/14)%2)*11;x<L;x+=22)px(c,x,y,1,14,'#41463a');
    for(let i=0;i<26;i++){const n=i*17+3;px(c,hash(n)*L,80+hash(n+1)*120,4+hash(n+2)*18,2+hash(n+3)*9,i%2?'#4b4f3f':'#5a5d49');}
    px(c,0,211,L,7,'#2b2d27');px(c,0,211,L,1,'#3c3e36');
    // Linoleum: cool greys like the road so blood reads; a light seam at the wall foot mirrors the curb line.
    px(c,0,218,L,112,'#3c3f3a');for(let y=218;y<330;y+=20)for(let x=(Math.round((y-218)/20)%2)*20;x<L;x+=40)px(c,x,y,20,20,'#444842');
    px(c,0,218,L,3,'#5a5e55');px(c,0,221,L,1,'#2e302b');c.globalAlpha=.35;px(c,0,222,L,9,'#2b2d27');c.globalAlpha=1;
    for(let i=0;i<70;i++){const n=i*29+7,x=hash(n)*L,y=226+hash(n+1)*98;if(i%5===0){line(c,x,y,x+18,y+3,'#343a36');line(c,x+18,y+3,x+26,y+11,'#343a36');}else if(i%5===1)px(c,x,y,5+hash(n+2)*9,2+hash(n+3)*2,'#8a8262');else if(i%5===2)px(c,x,y,4+hash(n+2)*10,1+hash(n+3)*2,'#2f322d');else if(i%5===3)px(c,x,y,3,2,'#746a47');else px(c,x,y,1,1,'#9aa89a');}
    px(c,0,326,L,4,'#2c2e2a');
    // Left and right return walls close the room; the exit door sits just inside the left one.
    px(c,0,74,42,144,'#3a3d33');px(c,40,74,3,144,'#5a5d4c');px(c,L-16,74,16,144,'#3a3d33');px(c,L-18,74,3,144,'#2f312b');
    // High transom strip above the shelving: some panes are boarded with plywood and one is cracked.
    px(c,298,80,446,30,'#69604a');for(let p=0;p<11;p++){const wx=301+p*40;px(c,wx,83,37,24,'#a15e40');px(c,wx,95,37,8,'#ae6d45');px(c,wx,101,37,6,'#896039');if(hash(p+51)>.68){px(c,wx,83,37,10,'#6a5b40');px(c,wx,95,37,11,'#5e5039');px(c,wx,83,37,1,'#8a7d5a');px(c,wx,95,37,1,'#8a7d5a');for(const nx of [3,33])for(const ny of [88,100])px(c,wx+nx,ny,1,1,'#3b3a2e');}else if(p===4){line(c,wx+6,107,wx+18,94,'#c9b898');line(c,wx+18,94,wx+30,86,'#c9b898');line(c,wx+18,94,wx+34,99,'#c9b898');line(c,wx+18,94,wx+11,84,'#c9b898');}}
    for(const t of TUBES[room.id]||[])tube(c,t.x,!t.flicker);
    glassDoor(c,44);poster(c,112,110);counter(c,150);px(c,278,98,12,12,'#8a8262');px(c,281,101,6,6,'#3d3f37');px(c,283,103,2,1,'#c9b898');
    shelfUnit(c,300,232,190,114,11);px(c,496,150,18,82,'#6f6a52');for(let r=0;r<4;r++){px(c,498,156+r*19,14,2,'#857f62');px(c,499,148+r*19,12,8,GOODS[(r*5)%GOODS.length]);}shelfUnit(c,520,232,210,114,29);
    // A tipped basket and spilled tins mark where someone looted in a hurry.
    shape(c,[[538,268],[566,262],[570,278],[544,284]],'#5e5039');px(c,542,270,22,10,'#3b3a2e');for(let i=0;i<7;i++){const n=i*7;px(c,548+hash(n)*60,262+hash(n+1)*40,7,4,GOODS[i%GOODS.length]);px(c,548+hash(n)*60,262+hash(n+1)*40,7,1,'#9a927a');}
    cooler(c,762,236);px(c,748,208,12,24,'#4e5745');px(c,747,206,14,3,'#6b6d5e');px(c,752,214,4,10,'#3d3f37');
    for(const l of room.loot||[])px(c,l.x-6,l.y+4,14,3,'#2f322d');
  }
  function getRoom(id){const room=INTERIORS[id];if(!room)return null;if(!rooms.has(id)){if(typeof document==='undefined'||!document.createElement)return null;const cv=document.createElement('canvas');cv.width=room.length;cv.height=HEIGHT;drawRoom(cv.getContext('2d'),room);rooms.set(id,cv);}return rooms.get(id);}
  function drawInterior(c,id,camera,time){
    const room=INTERIORS[id];px(c,0,0,frame(),HEIGHT,VOID);if(!room)return;
    const cv=getRoom(id),ox=Math.round(-camera);
    if(cv)c.drawImage(cv,ox,0);else{c.save();c.translate(ox,0);drawRoom(c,room);c.restore();}
    c.save();c.translate(ox,0);
    // Dynamic layer: the unstable tube stutters between dim and lit; the cooler breathes a cool cast onto the floor.
    for(const t of TUBES[id]||[]){if(!t.flicker)continue;const lit=hash(Math.floor(time*14)+t.x)>.32&&Math.sin(time*2.1+t.x)>-.7;if(lit){tube(c,t.x,true);c.globalAlpha=.08;px(c,t.x-60,74,120,137,'#e8e2b8');c.globalAlpha=1;}}
    if(id==='store'){c.globalAlpha=.07+Math.sin(time*1.3)*.02;px(c,766,108,102,124,'#7fb8c4');c.globalAlpha=.05;shape(c,[[766,236],[868,236],[888,300],[746,300]],'#7fb8c4');c.globalAlpha=1;}
    c.restore();
  }
  function drawInteriorForeground(c,id,camera,time){
    const room=INTERIORS[id];if(!room)return;const ox=Math.round(-camera*1.12);
    // Three low counter and shelf ends slide slightly faster than the room so the floor reads as having depth.
    for(const f of [[120,18],[470,12],[800,16]]){const x=f[0]+ox;if(x<-60||x>frame()+60)continue;px(c,x,330-f[1],52,f[1],'#1d1f1a');px(c,x,330-f[1],52,1,'#2c2e2a');}
  }
  function interiorGrade(c,id){grade(c);c.fillStyle='rgba(20,30,40,.18)';c.fillRect(0,0,frame(),HEIGHT);}
  return {INTERIORS,drawInterior,drawInteriorForeground,interiorGrade};
})();
const INTERIORS=interiorArt.INTERIORS;
function drawInterior(c,id,camera,time){interiorArt.drawInterior(c,id,camera,time);}
function drawInteriorForeground(c,id,camera,time){interiorArt.drawInteriorForeground(c,id,camera,time);}
function interiorGrade(c,id){interiorArt.interiorGrade(c,id);}
