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
  // tone(): darken (k<1) or lighten (k>1) a hex colour so every product gets its own shadow and highlight side.
  function tone(col,k){const n=parseInt(col.slice(1),16);const f=v=>Math.max(0,Math.min(255,Math.round(v*k)));return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;}
  // ---- Interior areas (entered through landmark doors; game.js reads INTERIORS and owns the transition) ----
  // Coordinates are interior world x (0..length) and the same lane y band as the road (characters walk y 246..312).
  const INTERIORS = { store: { id:'store', name:'加油站便利店', code:'S-02', length: 900, floorLight:true, exits:[{x:60,w:44,label:'离开商店'}], loot:[{x:520,y:300,type:'ammo'},{x:790,y:302,type:'health'}], spawns:[{x:380,y:262},{x:560,y:300},{x:700,y:250},{x:830,y:290}] },
    barn: { id:'barn', name:'暮色农场谷仓', code:'B-01', length: 1100, exits:[{x:70,w:60,label:'离开谷仓'}], loot:[{x:640,y:298,type:'health'},{x:980,y:302,type:'ammo'}], spawns:[{x:420,y:258},{x:700,y:300},{x:820,y:250},{x:1010,y:290},{x:560,y:270}] } };
  const VOID='#0b0c09', rooms=new Map();
  // Ceiling tubes: one stutters, one is dead and hangs off its wire. Only the flickering one is redrawn per frame.
  const TUBES={store:[{x:200},{x:470,flicker:true},{x:620,dead:true},{x:790}]};
  const GOODS=['#8a5a3c','#6f7a5c','#8c7d5a','#5f6b70','#9a6a45','#7a4a3a','#6b6b4a','#7d6f58','#5e6d7a','#8a7042'];
  const PAPER='#d8ceaa', CREAM='#e0d8b0', BRASS='#e0b64f', INK='#3b3a2e';

  // ---- Product silhouettes: every item gets a base, a dark side, a light top and a label band ----
  function can(c,x,y,col,h=8){px(c,x,y-h,5,h,col);px(c,x+4,y-h,1,h,tone(col,.7));px(c,x,y-h,5,1,'#9a927a');px(c,x+1,y-h+3,3,2,CREAM);px(c,x+1,y-h+1,1,h-3,tone(col,1.25));}
  function bottle(c,x,y,col){px(c,x,y-9,4,9,col);px(c,x+3,y-9,1,9,tone(col,.7));px(c,x+1,y-12,2,3,tone(col,.85));px(c,x+1,y-13,2,1,'#8a8262');px(c,x,y-6,4,3,CREAM);px(c,x+1,y-5,2,1,tone(col,.6));}
  function box(c,x,y,col,w=9,h=7){px(c,x,y-h,w,h,col);px(c,x+w-2,y-h,2,h,tone(col,.72));px(c,x,y-h,w,1,tone(col,1.2));px(c,x+2,y-h+2,w-5,2,PAPER);px(c,x+2,y-h+5,3,1,tone(col,.55));}
  function tallBox(c,x,y,col){px(c,x,y-13,7,13,col);px(c,x+6,y-13,1,13,tone(col,.7));px(c,x,y-13,7,1,tone(col,1.2));px(c,x+1,y-11,5,4,PAPER);px(c,x+2,y-10,3,2,tone(col,.6));px(c,x+1,y-5,5,1,tone(col,.5));}
  function bag(c,x,y,col){shape(c,[[x+1,y-11],[x+7,y-11],[x+8,y-4],[x+7,y],[x+1,y],[x,y-4]],col);px(c,x+1,y-11,6,1,tone(col,1.3));px(c,x+2,y-8,4,3,CREAM);px(c,x+3,y-7,2,1,tone(col,.5));px(c,x+6,y-9,1,8,tone(col,.75));}
  function jar(c,x,y,col){px(c,x,y-7,6,7,col);px(c,x+5,y-7,1,7,tone(col,.7));px(c,x,y-9,6,2,'#4a4a3a');px(c,x+1,y-9,4,1,'#6b6d5e');px(c,x+1,y-5,2,3,tone(col,1.3));}
  function fallenBox(c,x,y,col){px(c,x,y-5,9,5,col);px(c,x,y-5,9,1,tone(col,1.2));px(c,x+2,y-4,5,2,PAPER);px(c,x+7,y-5,2,5,tone(col,.72));}
  // goods(): fill a shelf run. looted (0..1) empties slots and tips a few boxes over on the lip.
  function goods(c,x,y,w,seed,looted=.25){for(let xx=x;xx<x+w-9;){const q=hash(seed+xx),col=GOODS[Math.floor(hash(seed*3+xx)*GOODS.length)];
      if(hash(seed*7+xx)<looted){if(hash(seed*11+xx)<.25)fallenBox(c,xx,y,col);xx+=8+hash(seed+xx*2)*14;continue;}
      if(q<.2){can(c,xx,y,col);xx+=6;}else if(q<.36){can(c,xx,y,col,11);xx+=6;}else if(q<.52){bottle(c,xx,y,col);xx+=5;}
      else if(q<.66){box(c,xx,y,col);xx+=10;}else if(q<.8){tallBox(c,xx,y,col);xx+=8;}else if(q<.9){bag(c,xx,y,col);xx+=9;}else{jar(c,xx,y,col);xx+=7;}}}
  // priceTags(): the little cream tickets clipped to the shelf lip, with an orange promo tag now and then.
  function priceTags(c,x,y,w,seed){for(let t=x+3;t<x+w-6;t+=12+hash(seed+t)*10){const promo=hash(seed*5+t)>.8;px(c,t,y+1,5,2,promo?'#c9803a':PAPER);px(c,t+1,y+1,1,1,promo?'#f0c070':INK);}}
  // shelfUnit(): gondola with header sign, four lit shelves, side panels and a kick plate.
  function shelfUnit(c,x,y,w,h,seed,sign,looted){px(c,x,y-h,w,h,'#3a3e33');px(c,x+3,y-h+3,w-6,h-6,'#3e4236');px(c,x+3,y-h+3,w-6,2,'#33362c');
    const rows=4,gap=(h-14)/rows;for(let r=0;r<=rows;r++){const sy=y-h+12+r*gap;if(r){goods(c,x+6,sy-1,w-12,seed+r*7,looted);}px(c,x+3,sy,w-6,3,'#7a7458');px(c,x+3,sy,w-6,1,'#8f8a6c');px(c,x+3,sy+3,w-6,1,'#4c4a3a');if(r<rows)priceTags(c,x+4,sy+2,w-8,seed+r*3);}
    px(c,x,y-h,w,9,'#6a5b40');px(c,x,y-h,w,1,'#8a7d5a');px(c,x,y-h+8,w,1,'#4c4a3a');if(sign)label(c,sign,x+6,y-h+7,PAPER,7);
    px(c,x,y-h,3,h,'#6f6a52');px(c,x+w-3,y-h,3,h,'#6f6a52');px(c,x+1,y-h,1,h,'#857f62');px(c,x+w-2,y-h,1,h,'#4c4a3a');px(c,x-2,y-3,w+4,4,'#2b2d27');px(c,x-2,y-3,w+4,1,'#3c3e36');}
  // toppledShelf(): an empty unit shoved over and resting at an angle against its neighbour, goods spilled at its foot.
  function toppledShelf(c,x,y,seed){c.save();c.translate(x,y);c.rotate(-.42);px(c,0,-112,44,112,'#3a3e33');px(c,3,-109,38,106,'#454a3e');px(c,3,-109,38,2,'#33362c');
    for(let r=0;r<4;r++){const sy=-100+r*26;px(c,3,sy,38,3,'#7a7458');px(c,3,sy,38,1,'#8f8a6c');px(c,3,sy+3,38,1,'#4c4a3a');if(r){const col=GOODS[(seed+r)%GOODS.length];if(r%2)can(c,6+r*6,sy,col);else fallenBox(c,18,sy,col);}}
    px(c,0,-112,3,112,'#7a7458');px(c,41,-112,3,112,'#6f6a52');px(c,0,-112,44,8,'#6a5b40');px(c,0,-112,44,1,'#8a7d5a');c.restore();
    // Everything that was on it now lies in a fan at its foot: cans on their sides, split boxes, crushed bags.
    for(let i=0;i<14;i++){const n=seed+i*5,gx=x-12+hash(n)*68,gy=y-12+hash(n+1)*34,col=GOODS[i%GOODS.length];if(i%3===0)fallenBox(c,gx,gy,col);else if(i%3===1){px(c,gx,gy-3,8,3,col);px(c,gx,gy-3,8,1,tone(col,1.25));px(c,gx+7,gy-3,1,3,'#9a927a');}else{shape(c,[[gx,gy],[gx+7,gy-1],[gx+8,gy-5],[gx+2,gy-6]],col);px(c,gx+2,gy-4,3,1,CREAM);}}}

  // ---- Ceiling: tile grid, tube fixtures, a fan, sprinklers, a dome mirror and a camera ----
  function tube(c,x,lit,dead){px(c,x-30,0,1,44,'#3d3f37');px(c,x+30,0,1,44,'#3d3f37');
    if(dead){c.save();c.translate(x,44);c.rotate(.18);px(c,-42,0,84,6,'#4a4c42');px(c,-40,6,80,4,'#4a4939');px(c,-40,6,3,4,'#6d6c58');c.restore();line(c,x+30,44,x+34,52,'#3d3f37');line(c,x+34,52,x+31,60,'#3d3f37');px(c,x+30,60,3,2,'#a45231');return;}
    px(c,x-42,44,84,6,'#4a4c42');px(c,x-42,44,84,1,'#5a5c50');px(c,x-40,50,80,4,lit?'#d9d7b0':'#6d6c58');px(c,x-40,50,3,4,'#8f8a70');px(c,x+37,50,3,4,'#8f8a70');
    if(lit){px(c,x-38,51,76,1,'#f2efd0');c.globalAlpha=.055;shape(c,[[x-40,54],[x+40,54],[x+118,HEIGHT],[x-118,HEIGHT]],'#e8e2b8');c.globalAlpha=1;}}
  function ceiling(c,L){px(c,0,0,L,74,'#1c1e19');for(let x=0;x<L;x+=30)px(c,x,0,1,70,'#23261f');for(let y=18;y<70;y+=18)px(c,0,y,L,1,'#23261f');
    for(let i=0;i<9;i++){const n=i*13+5;px(c,Math.floor(hash(n)*L/30)*30+1,Math.floor(hash(n+1)*3)*18+1,29,17,i%3?'#1a1c17':'#22241d');}
    px(c,0,68,L,6,'#2a2c26');px(c,0,73,L,1,'#3a3d33');
    // Ceiling fan on a drop rod; the blades are drawn per frame (drawInterior) so it actually turns.
    px(c,344,0,2,40,'#3d3f37');px(c,338,40,14,7,'#4a4c42');px(c,341,47,8,4,'#3d3f37');
    // Sprinkler heads and the shopfitter's dome mirror / camera pair.
    for(const sx of [120,560,860]){px(c,sx,70,2,5,'#6b6d5e');px(c,sx-2,75,6,2,'#8a8b7a');px(c,sx-1,77,4,1,'#a45231');}
    c.fillStyle='#4f5652';c.beginPath();c.arc(598,74,13,0,Math.PI);c.fill();c.fillStyle='#6f7a78';c.beginPath();c.arc(596,73,9,0,Math.PI);c.fill();px(c,590,76,6,2,'#9fb0aa');px(c,584,73,28,2,'#3d3f37');
    px(c,872,76,14,4,'#3d3f37');px(c,868,78,10,7,'#4a4c42');px(c,866,80,3,4,'#2b2d27');px(c,867,81,1,1,'#c9403a');}

  // ---- Wall dressing: signs, posters, board, clock, switches, extinguisher ----
  function fuelSign(c,x,y){px(c,x,y,38,36,'#2b2d27');px(c,x+1,y+1,36,34,'#3a3d33');px(c,x+2,y+2,34,8,'#a45231');label(c,'FUEL',x+9,y+9,CREAM,7);
    for(let r=0;r<3;r++){const ry=y+12+r*8;px(c,x+3,ry,10,6,'#4a4e40');label(c,['92','95','D'][r],x+4,ry+6,PAPER,6);px(c,x+15,ry,20,6,'#1c1e19');label(c,['7.89','8.45','7.10'][r],x+16,ry+6,r===1?'#c9803a':'#c9b898',6);}}
  function beerPoster(c,x,y){px(c,x,y,44,52,'#7a6a4a');px(c,x+2,y+2,40,48,'#3a3d33');px(c,x+4,y+4,36,26,'#5e6d7a');px(c,x+4,y+22,36,8,'#8a7d5a');
    px(c,x+14,y+8,6,20,'#c9803a');px(c,x+15,y+6,4,3,'#6b6d5e');px(c,x+22,y+12,8,16,'#8a5a3c');px(c,x+23,y+10,6,3,'#4a4a3a');px(c,x+15,y+14,4,5,PAPER);px(c,x+23,y+18,6,4,PAPER);
    label(c,'ICE',x+6,y+40,BRASS,7);label(c,'BREW',x+6,y+48,BRASS,7);shape(c,[[x+36,y+52],[x+44,y+52],[x+44,y+44]],'#535744');}
  function bulletin(c,x,y){px(c,x,y,58,46,'#5e5039');px(c,x+2,y+2,54,42,'#8a7a55');for(let i=0;i<40;i++)px(c,x+2+hash(i*3)*52,y+2+hash(i*3+1)*40,2,1,'#7a6a4a');
    const notes=[[3,4,16,20,PAPER],[22,5,14,18,'#c9b898'],[39,3,15,22,CREAM],[5,27,13,14,'#c9b898'],[21,26,20,15,PAPER],[43,28,11,13,'#a8a080']];
    for(const n of notes){px(c,x+n[0],y+n[1],n[2],n[3],n[4]);px(c,x+n[0]+Math.floor(n[2]/2)-1,y+n[1]-1,2,2,'#c9403a');for(let l=3;l<n[3]-2;l+=3)px(c,x+n[0]+2,y+n[1]+l,n[2]-4-(l%2)*2,1,'#6b6650');}
    px(c,x+6,y+8,8,8,'#4a4a3a');px(c,x+8,y+10,4,3,'#8a7d5a');px(c,x+43,y+7,7,7,'#4a4a3a');px(c,x+45,y+9,3,3,'#8a7d5a');
    px(c,x+22,y+27,18,3,'#a45231');px(c,x+24,y+32,14,1,'#5e5039');px(c,x+24,y+35,10,1,'#5e5039');}
  function highwayMap(c,x,y){px(c,x,y,34,28,'#c9b898');px(c,x+1,y+1,32,26,'#a8a080');px(c,x+2,y+2,30,24,'#b8b090');line(c,x+2,y+20,x+14,y+12,'#6a5b40',2);line(c,x+14,y+12,x+31,y+6,'#6a5b40',2);line(c,x+10,y+24,x+22,y+3,'#8a7d5a');px(c,x+13,y+10,3,3,'#c9403a');px(c,x+24,y+16,4,3,'#5e6d7a');px(c,x+4,y+4,6,2,'#6b6650');}
  function clock(c,x,y){c.fillStyle='#6b6d5e';c.beginPath();c.arc(x,y,8,0,Math.PI*2);c.fill();c.fillStyle=CREAM;c.beginPath();c.arc(x,y,6,0,Math.PI*2);c.fill();for(let i=0;i<4;i++)px(c,x-1+[0,4,0,-4][i],y-1+[-4,0,4,0][i],1,1,INK);line(c,x,y,x+3,y-2,INK);line(c,x,y,x-1,y-4,INK);px(c,x-3,y+9,6,2,'#3d3f37');}
  function extinguisher(c,x,y){px(c,x-2,y-2,10,3,'#3d3f37');px(c,x,y,6,22,'#8a2e22');px(c,x,y,6,1,'#b04a3a');px(c,x+4,y,2,22,'#5a1c14');px(c,x+1,y+6,4,6,PAPER);px(c,x+2,y-5,2,5,'#3d3f37');px(c,x+1,y-6,4,2,'#5a5c50');line(c,x+4,y-4,x+8,y+4,'#3d3f37');}
  function lightSwitch(c,x,y){px(c,x,y,7,10,PAPER);px(c,x+1,y+1,5,8,'#c9b898');px(c,x+3,y+3,2,4,'#8a8262');px(c,x+3,y+3,2,1,'#5a5c50');}
  function staffDoor(c,x){px(c,x,100,38,118,'#4a4a3c');px(c,x+2,102,34,114,'#5e5a44');px(c,x+4,104,30,110,'#6a6448');px(c,x+4,104,30,1,'#857f62');px(c,x+33,104,1,110,'#4a4a3c');
    px(c,x+11,110,16,16,'#3b3f3d');px(c,x+12,111,14,14,'#5f7a78');px(c,x+13,112,4,12,'#7fb8c4');px(c,x+13,124,12,1,'#3b3f3d');px(c,x+11,110,16,1,'#857f62');
    px(c,x+6,134,26,10,'#a45231');label(c,'STAFF',x+8,141,CREAM,6);px(c,x+6,146,26,4,'#8a8262');px(c,x+28,166,4,2,'#8a8262');px(c,x+29,168,2,4,'#6b6d5e');px(c,x+6,192,26,6,'#5e5a44');px(c,x+2,216,34,2,'#3b3a2e');
    px(c,x+8,88,22,9,'#3d3f37');px(c,x+9,89,20,7,'#5a5c50');px(c,x+11,90,3,5,'#c9b898');px(c,x+15,90,3,5,'#c9b898');px(c,x+22,91,4,4,'#c9b898');label(c,'WC',x+20,96,INK,5);}
  function atm(c,x,y){px(c,x,y,36,100,'#3d3f37');px(c,x+2,y+2,32,96,'#5f6254');px(c,x+2,y+2,32,1,'#8a8b7a');px(c,x+2,y+2,1,96,'#7a7c6a');px(c,x+4,y+4,28,12,'#2b2d27');label(c,'ATM',x+10,y+13,BRASS,7);
    px(c,x+5,y+20,26,20,'#1c1e19');px(c,x+6,y+21,24,18,'#2e3b35');px(c,x+8,y+24,14,2,'#8d9e69');px(c,x+8,y+28,20,1,'#5f7a5a');px(c,x+8,y+31,10,1,'#5f7a5a');px(c,x+8,y+34,16,1,'#5f7a5a');
    for(let k=0;k<12;k++)px(c,x+6+(k%4)*6,y+44+Math.floor(k/4)*5,4,3,'#8a8b7a');px(c,x+6,y+62,24,4,'#2b2d27');px(c,x+7,y+63,22,2,'#1c1e19');px(c,x+6,y+72,24,10,'#4a4c42');px(c,x+8,y+74,20,6,'#3d3f37');
    px(c,x+2,y+86,32,12,'#4a4c42');px(c,x+10,y+92,14,2,'#3d3f37');px(c,x+26,y+6,3,3,'#2b2d27');}
  function payphone(c,x,y){px(c,x,y,14,26,'#3d3f37');px(c,x+1,y+1,12,24,'#5e6d7a');px(c,x+1,y+1,12,1,'#8fa0aa');px(c,x+3,y+4,8,5,'#1c1e19');for(let k=0;k<9;k++)px(c,x+3+(k%3)*3,y+11+Math.floor(k/3)*3,2,2,'#c9b898');px(c,x+3,y+21,8,2,'#2b2d27');px(c,x-4,y+2,4,20,'#2b2d27');px(c,x-3,y+3,2,18,'#3d3f37');line(c,x-2,y+22,x+2,y+30,'#2b2d27');}

  // ---- Counter block: cigarette wall, register, lottery and impulse buys, cash drawer on the floor ----
  function cigWall(c,x){px(c,x,82,104,70,'#3a3e33');px(c,x+2,84,100,66,'#3e4236');px(c,x,82,104,13,'#764832');px(c,x,82,104,1,'#9a5a3a');px(c,x,94,104,1,'#4c2f22');label(c,'SUPPLY / 24H',x+16,92,'#c9b898',7);
    const brands=['#8a5a3c','#5f6b70','#c9b898','#6f7a5c','#8c7d5a','#a45231','#7d6f58','#5e6d7a'];
    for(let r=0;r<4;r++){const ry=97+r*13;px(c,x+2,ry+10,100,2,'#7a7458');for(let b=0;b<11;b++){if(hash(r*31+b+x)<.3)continue;const col=brands[(b*3+r)%brands.length];px(c,x+5+b*9,ry,7,10,col);px(c,x+5+b*9,ry,7,2,tone(col,1.35));px(c,x+11+b*9,ry,1,10,tone(col,.7));px(c,x+6+b*9,ry+4,5,2,tone(col,.6));}}
    px(c,x+30,150,44,10,'#c9b898');label(c,'NO CASH',x+33,157,'#a83a2a',6);px(c,x+30,150,44,1,'#e0d8b0');}
  function register(c,x,y){px(c,x-2,y+26,40,4,'#3d3f37');px(c,x,y,36,26,'#5b5d55');px(c,x,y,36,2,'#7a7760');px(c,x+35,y,1,26,'#3d3f37');
    px(c,x+3,y+3,18,11,'#2b2d27');px(c,x+4,y+4,16,9,'#35463e');px(c,x+6,y+6,10,1,'#8d9e69');px(c,x+6,y+9,6,1,'#5f7a5a');px(c,x+6,y+11,8,1,'#5f7a5a');
    for(let k=0;k<9;k++)px(c,x+23+(k%3)*4,y+4+Math.floor(k/3)*4,3,3,'#8a8b7a');px(c,x+22,y+17,12,6,'#4a4c42');
    // Receipt paper curls out of the printer slot.
    px(c,x+8,y-6,8,7,CREAM);px(c,x+9,y-4,6,1,'#a8a080');px(c,x+9,y-2,4,1,'#a8a080');shape(c,[[x+8,y-6],[x+16,y-6],[x+18,y-11],[x+10,y-10]],'#c9b898');px(c,x+2,y+18,4,1,'#c9b898');}
  function counterFront(c,x){px(c,x,166,112,72,'#6a5b40');for(let p=x+4;p<x+112;p+=9){px(c,p,168,2,66,'#5e5039');px(c,p+2,168,1,66,'#7a6a4a');}px(c,x-2,160,116,7,'#8a7d5a');px(c,x-2,160,116,1,'#9a8b5e');px(c,x-2,166,116,1,'#6a5b40');px(c,x,234,112,4,'#3b3a2e');
    px(c,x+8,176,40,14,'#c9b898');px(c,x+8,176,40,1,CREAM);label(c,'NO CASH',x+10,183,INK,6);label(c,'OVERNIGHT',x+9,189,'#a83a2a',5);
    // Scuff and a boot mark on the front panel where someone kicked at it.
    px(c,x+70,212,18,3,'#4c4a3a');px(c,x+62,222,9,4,'#3b3a2e');}
  function counterTop(c,x){register(c,x+50,134);
    // Scratch-card stand, lottery sign, gum rack, tip jar and a brass bell.
    px(c,x+90,138,18,22,'#3b3f3d');px(c,x+91,139,16,20,'#5f7a78');for(let r=0;r<3;r++)for(let k=0;k<3;k++)px(c,x+92+k*5,140+r*6,4,4,['#c9803a','#8d9e69','#5e6d7a','#a45231','#c9b898'][(r+k)%5]);px(c,x+91,139,16,1,'#8fa0aa');
    px(c,x+82,124,30,10,'#a45231');label(c,'LOTTO',x+84,132,BRASS,6);px(c,x+82,124,30,1,'#c9803a');px(c,x+96,134,2,4,'#3d3f37');
    px(c,x+8,146,26,14,'#4a4c42');px(c,x+9,147,24,12,'#3a3e33');for(let k=0;k<8;k++)px(c,x+10+(k%4)*6,148+Math.floor(k/4)*6,5,4,['#8d9e69','#c9803a','#5e6d7a','#c9b898'][k%4]);
    px(c,x+38,148,7,12,'#7fb8c4');px(c,x+38,148,7,1,'#cfe4e8');px(c,x+39,154,5,5,BRASS);px(c,x+39,150,1,8,'#cfe4e8');px(c,x+36,146,11,2,'#4a4a3a');
    c.fillStyle=BRASS;c.beginPath();c.arc(x+30,158,4,Math.PI,0);c.fill();px(c,x+29,153,2,2,'#4a4a3a');px(c,x+26,158,8,2,'#3d3f37');}
  function cashDrawer(c,x,y){px(c,x,y-4,30,6,'#4a4c42');px(c,x,y-4,30,1,'#6b6d5e');for(let k=0;k<4;k++)px(c,x+2+k*7,y-3,6,4,'#3d3f37');px(c,x+9,y-3,5,2,'#8d9e69');px(c,x+16,y-3,5,2,'#c9b898');px(c,x-6,y,3,1,BRASS);px(c,x+34,y+1,2,1,BRASS);}

  // ---- Hot food and coffee station, coolers, chest freezer ----
  function hotStation(c,x){px(c,x,160,64,78,'#4a4c42');for(let p=x+3;p<x+62;p+=8)px(c,p,164,1,70,'#3d3f37');px(c,x-2,156,68,6,'#8a8b7a');px(c,x-2,156,68,1,'#a0a190');px(c,x,234,64,4,'#3b3a2e');px(c,x+6,176,20,8,'#c9b898');label(c,'HOT',x+8,183,'#a45231',6);
    // Roller grill with hot dogs under a sneeze guard; a napkin box tucked beside it.
    px(c,x+2,142,28,14,'#5f6254');px(c,x+2,142,28,1,'#8a8b7a');for(let r=0;r<2;r++)for(let k=0;k<3;k++){px(c,x+5+k*8,145+r*6,7,3,'#8a5a3c');px(c,x+5+k*8,145+r*6,7,1,'#a86a45');}px(c,x,128,32,2,'#8fa0aa');px(c,x,128,1,14,'#8fa0aa');px(c,x+31,128,1,14,'#8fa0aa');c.globalAlpha=.18;px(c,x+1,130,30,12,'#cfe4e8');c.globalAlpha=1;
    // Slushie machine with two colours sits on the counter; ketchup and mustard pumps squeezed in front of it.
    px(c,x+34,112,30,44,'#5f6254');px(c,x+34,112,30,1,'#8a8b7a');px(c,x+63,112,1,44,'#3d3f37');px(c,x+36,116,12,22,'#3b3f3d');px(c,x+37,117,10,20,'#a83a5a');px(c,x+38,118,3,18,'#c05a7a');px(c,x+50,116,12,22,'#3b3f3d');px(c,x+51,117,10,20,'#3a7a8a');px(c,x+52,118,3,18,'#5aa0b0');px(c,x+36,140,26,12,'#4a4c42');px(c,x+40,143,4,7,'#8a8b7a');px(c,x+54,143,4,7,'#8a8b7a');label(c,'ICEE',x+40,139,CREAM,5);
    for(let k=0;k<2;k++){const col=['#a45231','#c9803a'][k];px(c,x+35+k*8,148,5,8,col);px(c,x+35+k*8,148,5,1,tone(col,1.3));px(c,x+36+k*8,145,3,3,'#3d3f37');px(c,x+38+k*8,144,3,2,'#3d3f37');}
    // Back shelf: coffee brewer, microwave, cup stack on top of it.
    px(c,x,118,64,4,'#6f6a52');px(c,x,122,64,1,'#4c4a3a');px(c,x+2,94,26,24,'#3d3f37');px(c,x+4,96,22,8,'#2b2d27');px(c,x+6,106,18,10,'#4a4c42');px(c,x+7,108,7,7,'#3b3a2e');px(c,x+8,110,5,4,'#5a3a24');px(c,x+16,106,8,2,'#c9403a');px(c,x+24,98,2,2,'#c9403a');
    px(c,x+30,98,34,20,'#5f6254');px(c,x+30,98,34,1,'#8a8b7a');px(c,x+33,101,22,14,'#2b2d27');px(c,x+34,102,20,12,'#3a3e33');px(c,x+56,101,6,14,'#4a4c42');px(c,x+57,103,4,2,'#8d9e69');px(c,x+57,107,4,6,'#3d3f37');
    px(c,x+50,84,8,14,CREAM);for(let s=0;s<4;s++)px(c,x+50,87+s*3,8,1,'#a8a080');px(c,x+50,84,8,1,'#f0ead0');}
  function coolerDoor(c,gx,gy,seed,open){px(c,gx,gy,44,124,'#354e4b');for(let r=0;r<4;r++){const sy=gy+24+r*26;px(c,gx,sy,44,2,'#4c6461');for(let b=0;b<6;b++){if(hash(gx+r*13+b+seed)<.28)continue;const col=['#5f6b70','#6f7a5c','#8a5a3c','#8c7d5a','#5e6d7a','#a45231'][(b+r)%6];const bx=gx+4+b*7;if((b+r)%3===1){px(c,bx,sy-9,4,9,col);px(c,bx,sy-9,4,1,'#9a927a');px(c,bx+1,sy-7,1,6,tone(col,1.3));}else{px(c,bx,sy-9,3,9,col);px(c,bx,sy-11,3,2,'#8a8262');px(c,bx+1,sy-8,1,5,tone(col,1.3));}}}
    if(open){px(c,gx+26,gy-1,20,1,'#6b6d5e');px(c,gx+43,gy-1,2,126,'#6b6d5e');}
    else{px(c,gx+2,gy+3,1,110,'#5f7a78');c.globalAlpha=.2;px(c,gx+4,gy+2,10,120,'#9fc4cc');c.globalAlpha=1;px(c,gx-1,gy-1,46,1,'#6b6d5e');px(c,gx-1,gy-1,1,126,'#6b6d5e');px(c,gx+43,gy-1,2,126,'#6b6d5e');px(c,gx+37,gy+38,3,46,'#8a8b7a');
      for(let d=0;d<5;d++){const dx=gx+6+hash(seed+d*3)*34,dy=gy+30+hash(seed+d*3+1)*80;px(c,dx,dy,1,4+hash(seed+d)*8,'#7fb8c4');px(c,dx,dy+4+hash(seed+d)*8,1,1,'#cfe4e8');}}}
  // The swung-open cooler door, drawn per frame so the compressor can rattle it by a pixel.
  function openCoolerDoor(c,gx,gy){c.save();c.translate(gx,gy);c.rotate(.12);px(c,-1,-1,26,126,'#6b6d5e');px(c,1,1,22,122,'#4c6461');c.globalAlpha=.35;px(c,1,1,22,122,'#9fc4cc');c.globalAlpha=1;px(c,3,3,1,110,'#cfe4e8');px(c,18,40,3,44,'#8a8b7a');c.restore();}
  function cooler(c,x,y){px(c,x,y-144,96,144,'#5f6254');px(c,x,y-144,96,14,'#3f5654');px(c,x,y-144,96,1,'#6f8a88');label(c,'ICE  COLD',x+16,y-134,'#93aa9f',7);px(c,x+2,y-130,92,2,'#6b6d5e');
    coolerDoor(c,x+4,y-128,3,false);coolerDoor(c,x+50,y-128,17,true);
    px(c,x,y-6,96,6,'#2f3129');for(let s=6;s<92;s+=6)px(c,x+s,y-4,3,2,'#3d3f37');px(c,x+34,y-2,30,2,'#4c6461');}
  function iceMerch(c,x,y){px(c,x,y-70,22,70,'#8a8b7a');px(c,x+1,y-69,20,68,'#a0a190');px(c,x,y-70,22,1,'#b8b8a8');px(c,x+2,y-66,18,10,'#5e6d7a');label(c,'ICE',x+4,y-58,CREAM,7);px(c,x+3,y-54,16,46,'#3b3f3d');px(c,x+4,y-53,14,44,'#5f7a78');
    for(let r=0;r<3;r++){px(c,x+5,y-50+r*14,12,10,'#cfe4e8');px(c,x+5,y-50+r*14,12,2,'#9fc4cc');px(c,x+7,y-46+r*14,8,1,'#a8a080');}px(c,x+16,y-52,1,42,'#e8f4f0');px(c,x+2,y-6,18,6,'#3d3f37');}
  function chestFreezer(c,x,y){px(c,x,y-60,50,60,'#8a8b7a');px(c,x+1,y-59,48,58,'#a0a190');px(c,x,y-60,50,2,'#b8b8a8');px(c,x+1,y-40,48,1,'#6b6d5e');px(c,x+4,y-56,42,14,'#3b3f3d');px(c,x+5,y-55,40,12,'#5f7a78');c.globalAlpha=.3;px(c,x+6,y-54,14,10,'#cfe4e8');c.globalAlpha=1;
    px(c,x+6,y-34,38,18,'#c9b898');px(c,x+8,y-32,34,4,'#a45231');label(c,'ICE CREAM',x+9,y-23,'#5e5039',5);px(c,x+2,y-6,46,6,'#3d3f37');px(c,x+1,y-2,48,2,'#2b2d27');
    px(c,x+30,y-8,5,4,'#3d3f37');px(c,x+31,y-12,3,4,'#5f6254');}
  function iceBox(c,x,y){px(c,x,y-30,34,30,'#6b6d5e');px(c,x+1,y-29,32,28,'#8a8b7a');px(c,x+1,y-29,32,1,'#a0a190');px(c,x+4,y-24,26,14,'#3b3f3d');px(c,x+5,y-23,24,12,'#5e6d7a');label(c,'ICE',x+9,y-14,CREAM,7);px(c,x+2,y-6,30,4,'#5f6254');}

  // ---- Door, posters, misc wall pieces ----
  function poster(c,x,y){px(c,x,y,30,42,'#7a6a4a');px(c,x+2,y+2,26,38,'#8a7a55');shape(c,[[x+22,y+42],[x+30,y+42],[x+30,y+34]],'#535744');px(c,x+5,y+6,20,14,'#4a4a3a');px(c,x+9,y+8,12,10,'#6f6a52');label(c,'SALE',x+5,y+30,'#764832',7);px(c,x+5,y+33,18,1,'#5e5039');px(c,x+5,y+36,12,1,'#5e5039');}
  function missingFlyer(c,x,y){px(c,x,y,18,22,CREAM);px(c,x+2,y+2,14,7,'#4a4a3a');px(c,x+6,y+3,6,5,'#8a7d5a');label(c,'寻人',x+2,y+16,'#a83a2a',6);px(c,x+2,y+18,14,1,'#8a8262');px(c,x+8,y-1,2,2,'#c9403a');}
  function glassDoor(c,x){px(c,x,96,62,122,'#69604a');px(c,x+3,99,56,116,'#a15e40');px(c,x+3,118,56,15,'#ae6d45');px(c,x+3,133,56,13,'#b17c48');
    const hills=[[x+3,150]];for(let sx=0;sx<=56;sx+=7)hills.push([x+3+sx,147-Math.sin(sx*.09)*4-hash(sx)*4]);hills.push([x+59,150]);shape(c,hills,'#896039');
    px(c,x+3,150,56,52,'#75704f');px(c,x+3,150,56,2,'#8a8262');px(c,x+3,202,56,5,'#8a7d55');px(c,x+3,207,56,8,'#3b3f3d');px(c,x+3,207,56,2,'#9a927a');
    px(c,x+34,172,12,30,'#807459');px(c,x+36,169,8,5,'#a45231');px(c,x+37,176,6,4,'#35463e');px(c,x+12,196,7,6,'#6c6446');
    // Neon OPEN sign in the upper pane; the O has died. Hours sticker and a smeared handprint lower down.
    px(c,x+8,103,46,14,'#3b3a2e');c.globalAlpha=.5;px(c,x+9,104,44,12,'#2b2d27');c.globalAlpha=1;
    px(c,x+6,140,14,10,CREAM);for(let l=0;l<3;l++)px(c,x+8,142+l*3,10-l*2,1,'#8a8262');
    c.globalAlpha=.45;shape(c,[[x+40,160],[x+44,152],[x+47,150],[x+49,158],[x+52,156],[x+54,166],[x+50,172],[x+42,170]],'#3a1512');c.globalAlpha=.3;for(let k=0;k<4;k++)line(c,x+41+k*3,166,x+44+k*3,176,'#3a1512');c.globalAlpha=1;
    px(c,x+29,99,3,116,'#69604a');px(c,x+3,156,56,3,'#69604a');px(c,x+8,162,46,3,'#8a8262');px(c,x+8,165,46,1,'#5e5039');px(c,x+7,104,10,6,'#8a8262');px(c,x+8,106,8,1,'#535744');
    px(c,x+24,170,14,6,'#c9b898');label(c,'PULL',x+25,175,INK,5);
    // Illuminated EXIT box above the door.
    px(c,x+14,78,34,14,'#2b2d27');px(c,x+16,80,30,10,'#3a1512');label(c,'EXIT',x+19,89,'#e05a3a',8);px(c,x+14,78,34,1,'#4a4c42');
    // Rubber mat at the threshold, sloped ramp lip.
    px(c,x+2,222,64,10,'#4a4a3c');px(c,x+4,224,60,6,'#565646');px(c,x-4,220,72,24,'#2b2d27');px(c,x-2,222,68,20,'#33352f');for(let r=0;r<4;r++)px(c,x,225+r*5,64,1,'#2b2d27');px(c,x-4,242,72,2,'#4a4c42');}

  // ---- Floor dressing: debris, blood, bucket, cone, glass ----
  function wetFloorCone(c,x,y){shape(c,[[x+6,y-22],[x+9,y-22],[x+14,y],[x+1,y]],'#c9803a');px(c,x,y-2,15,3,'#3d3f37');px(c,x+4,y-14,7,3,CREAM);px(c,x+6,y-20,3,2,'#e0a060');px(c,x+3,y-8,9,2,CREAM);}
  function mopBucket(c,x,y){px(c,x-2,y-14,18,14,'#7a7c6a');px(c,x-2,y-14,18,2,'#a0a190');px(c,x-2,y-2,18,2,'#4a4c42');px(c,x-4,y-15,3,16,'#a0a190');px(c,x-4,y-15,3,1,'#c8c8b8');px(c,x+12,y-12,4,10,'#5f6254');px(c,x+2,y-11,2,9,'#8a8b7a');px(c,x+6,y-8,8,3,'#c9b898');
    c.globalAlpha=.35;shape(c,[[x-2,y+2],[x+34,y-2],[x+52,y+10],[x+30,y+16],[x+4,y+14]],'#2b3335');c.globalAlpha=.25;px(c,x+10,y+4,30,1,'#7fb8c4');c.globalAlpha=1;
    px(c,x+14,y-6,30,2,'#6a5b40');px(c,x+42,y-7,8,4,'#a8a080');px(c,x+44,y-9,4,2,'#c9b898');}
  function bloodTrail(c,x,y){c.globalAlpha=.55;shape(c,[[x,y],[x+34,y-6],[x+70,y-2],[x+92,y+6],[x+70,y+10],[x+30,y+8]],'#2a0f0c');c.globalAlpha=.4;for(let k=0;k<4;k++)line(c,x+20+k*16,y-2+k,x+40+k*16,y+9-k,'#3a1512');c.globalAlpha=.6;px(c,x-8,y+3,10,3,'#2a0f0c');px(c,x-14,y+5,5,2,'#2a0f0c');c.globalAlpha=1;
    // Hand-drags on the counter front where someone was pulled behind it.
    c.globalAlpha=.5;for(let k=0;k<3;k++)line(c,x-6+k*3,y-24,x-2+k*3,y-4,'#3a1512');c.globalAlpha=1;}
  function brokenGlass(c,x,y,seed){for(let i=0;i<14;i++){const n=seed+i*3,gx=x+hash(n)*60,gy=y+hash(n+1)*50;px(c,gx,gy,2+hash(n+2)*3,1,i%3?'#9fb0aa':'#cfe4e8');if(i%4===0)px(c,gx,gy-1,1,1,'#e8f4f0');}}
  function boxStack(c,x,y){box(c,x,y,'#8a7042',24,16);px(c,x+2,y-14,20,1,'#a8865a');box(c,x+3,y-16,'#7d6f58',18,12);px(c,x+5,y-26,14,2,'#a8a080');px(c,x+10,y-16,4,16,'#a8a080');px(c,x-1,y-1,26,2,'#2b2d27');}
  function propaneCage(c,x,y){px(c,x,y-44,30,44,'#3d3f37');px(c,x+1,y-43,28,42,'#4a4e40');for(let k=0;k<7;k++)px(c,x+1+k*4,y-43,1,42,'#6b6d5e');for(let k=0;k<5;k++)px(c,x+1,y-43+k*10,28,1,'#6b6d5e');
    for(let k=0;k<3;k++){px(c,x+3+k*9,y-30,7,26,'#c9b898');px(c,x+3+k*9,y-30,7,1,'#e0d8b0');px(c,x+5+k*9,y-33,3,3,'#5f6254');px(c,x+8+k*9,y-30,2,26,'#8a8262');}px(c,x+10,y-40,10,6,'#a45231');px(c,x,y-2,30,2,'#2b2d27');}

  // ==== Barn (B-01): timber frame, plank walls, hay loft, animal stalls and a rusted tractor ====
  const WOOD='#6b4a32', WOOD_D='#4a3222', WOOD_L='#8a6a45', BEAM='#5a3f2b', BEAM_L='#7a5a3c', BEAM_D='#3f2a1c', HAY='#b89a4a', HAY_D='#8f7436', HAY_L='#cdb15a', IRON='#3d3f37', IRON_L='#6b6d5e', RUST='#7a4a30', BONE='#c9b898';
  // Vertical plank wall: boards of slightly different tone, knots, weathering streaks and a brighter board now and then.
  function plankWall(c,x0,x1,y0,y1){for(let x=x0;x<x1;x+=12){const n=hash(x*.37+y0),w=Math.min(12,x1-x);px(c,x,y0,w,y1-y0,['#6b4a32','#664631','#70503a','#5f4230'][Math.floor(n*4)]);px(c,x,y0,1,y1-y0,WOOD_D);if(n>.6)px(c,x+w-1,y0,1,y1-y0,'#7a5a3e');
      if(hash(x+5)>.72){const ky=y0+8+hash(x+9)*(y1-y0-16);px(c,x+4,ky,4,3,WOOD_D);px(c,x+5,ky+1,2,1,'#3a2618');}
      if(hash(x+13)>.62)px(c,x+3+hash(x)*5,y0,2,10+hash(x+2)*Math.min(60,y1-y0-10),'#5a3f2b');}}
  // Dusk light leaking through a gap between boards: a bright sliver and a faint shaft slanting down-right.
  function sunGap(c,x,y,h){px(c,x-1,y,3,h,'#a87a48');px(c,x,y,1,h,'#e8c080');c.globalAlpha=.07;shape(c,[[x-1,y],[x+2,y],[x+132,y+h+120],[x+100,y+h+120]],'#e8b070');c.globalAlpha=1;}
  function post(c,x,top=18,bottom=218){px(c,x,top,14,bottom-top,BEAM);px(c,x,top,3,bottom-top,BEAM_L);px(c,x+11,top,3,bottom-top,BEAM_D);for(let y=top+20;y<bottom-10;y+=37)px(c,x+4,y+hash(x+y)*10,6,1,WOOD_D);px(c,x-3,bottom-6,20,6,WOOD_D);px(c,x-3,bottom-6,20,1,WOOD);}
  function brace(c,x,y,dir){shape(c,[[x,y],[x+dir*52,y-40],[x+dir*52,y-48],[x-dir*2,y-10]],BEAM);line(c,x,y-1,x+dir*50,y-46,BEAM_L);}
  function beam(c,x,y,w,h=12){px(c,x,y,w,h,BEAM);px(c,x,y,w,2,BEAM_L);px(c,x,y+h-2,w,2,BEAM_D);for(let k=x+18;k<x+w;k+=61)px(c,k,y+3,1+hash(k)*20,1,WOOD_D);}
  function roofUnderside(c,L){px(c,0,0,L,20,'#211a13');for(let x=-20;x<L;x+=40){px(c,x,0,5,20,'#2e2419');px(c,x+1,0,1,20,'#3a2d20');}px(c,0,8,L,2,'#2a2117');px(c,0,16,L,1,'#2a2117');}
  function hayPile(c,x,y,w,h){const pts=[[x,y]];for(let s=0;s<=w;s+=6)pts.push([x+s,y-Math.sin(Math.min(s,w)/w*Math.PI)*h-hash(x+s)*3]);pts.push([x+w,y]);shape(c,pts,HAY);
    for(let i=0;i<w/3;i++){const n=x*3+i*5,sx=x+hash(n)*w,sy=y-hash(n+1)*h*.85;line(c,sx,sy,sx+4+hash(n+2)*6,sy+(hash(n+3)-.5)*4,i%3?HAY_D:HAY_L);}}
  function bale(c,x,y,w=50,h=28){px(c,x,y-h,w,h,HAY);px(c,x,y-h,w,2,HAY_L);px(c,x+w-3,y-h,3,h,HAY_D);px(c,x,y-2,w,2,HAY_D);px(c,x,y-h,1,h,HAY_D);
    for(let i=0;i<w*h/26;i++){const n=x*7+y+i*3,sx=x+2+hash(n)*(w-8),sy=y-h+3+hash(n+1)*(h-6);px(c,sx,sy,2+hash(n+2)*5,1,i%3?HAY_D:HAY_L);}
    for(const t of [.3,.7]){const tx=x+Math.round(w*t);px(c,tx,y-h,2,h,'#6f5a30');px(c,tx,y-h,1,h,'#8a7440');}}
  // A bale that has burst: the front face has split and a fan of straw spills forward and to the right.
  function brokenBale(c,x,y){bale(c,x,y,46,24);shape(c,[[x+20,y-22],[x+46,y-20],[x+50,y-8],[x+44,y],[x+18,y]],HAY_D);
    shape(c,[[x+24,y-16],[x+62,y-12],[x+82,y+4],[x+72,y+12],[x+30,y+8],[x+20,y-2]],HAY);
    for(let i=0;i<28;i++){const n=x+i*5,sx=x+22+hash(n)*62,sy=y-14+hash(n+1)*26;line(c,sx,sy,sx+4+hash(n+2)*8,sy+(hash(n+3)-.5)*5,i%2?HAY_D:HAY_L);}}
  function tarpHeap(c,x,y,w,h){const pts=[[x,y]];for(let s=0;s<=w;s+=8)pts.push([x+s,y-h*Math.pow(Math.sin(Math.min(s,w)/w*Math.PI),.6)-hash(x+s)*5]);pts.push([x+w,y]);shape(c,pts,'#4f5a4c');
    c.globalAlpha=.5;shape(c,[[x+w*.2,y-h*.7],[x+w*.6,y-h*.95],[x+w*.9,y-h*.3],[x+w*.5,y-h*.2]],'#68756a');c.globalAlpha=1;for(let k=0;k<4;k++)px(c,x+6+k*Math.round(w/4),y-3,2,4,'#a8956a');line(c,x+w*.3,y-h*.5,x+w*.75,y-h*.25,'#3e4a3d');}
  // Hay loft over the right half: shadowed wall, heaps and a bale up top, joist ends along the edge beam, wisps hanging over.
  function loft(c,x,w){plankWall(c,x,x+w,30,84);c.globalAlpha=.4;px(c,x,30,w,54,'#1d150f');c.globalAlpha=1;
    hayPile(c,x+30,84,110,34);hayPile(c,x+200,84,150,40);hayPile(c,x+380,84,70,26);bale(c,x+140,84,50,26);bale(c,x+150,58,44,22);tarpHeap(c,x+300,84,84,32);
    px(c,x+240,64,26,14,'#59604a');px(c,x+240,64,26,2,'#6e6646');for(const by of [3,10])px(c,x+240,64+by,26,2,IRON);
    px(c,x,84,w,12,BEAM);px(c,x,84,w,2,BEAM_L);px(c,x,94,w,2,BEAM_D);for(let j=x+10;j<x+w;j+=28){px(c,j,86,8,8,WOOD_D);px(c,j,86,8,1,WOOD);}
    for(let k=x+4;k<x+w;k+=7){if(hash(k)>.55)continue;px(c,k,96,1,3+hash(k+1)*10,HAY_D);}}
  function ladder(c,x0,y0,x1,y1){for(const o of [0,16])line(c,x0+o,y0,x1+o,y1,WOOD_L,3);const n=Math.floor(Math.hypot(x1-x0,y1-y0)/14);for(let k=1;k<n;k++){const t=k/n;line(c,x0+(x1-x0)*t,y0+(y1-y0)*t,x0+16+(x1-x0)*t,y0+(y1-y0)*t,WOOD,2);}}
  // Stall: partition boards and a shadowed interior with a hay bed; the gate is drawn separately so the broken one can hang and creak.
  function stallBox(c,x,w){px(c,x+6,104,w-12,114,'#3a2a1e');for(let p=x+6;p<x+w-6;p+=12)px(c,p,104,1,114,'#2e2116');hayPile(c,x+8,218,w-16,16);
    px(c,x+w-30,150,14,10,'#59604a');px(c,x+w-30,150,14,1,'#7a7955');line(c,x+w-23,104,x+w-23,150,'#5a5c50');px(c,x+12,112,8,3,IRON);line(c,x+16,115,x+16,128,'#a8956a');line(c,x+16,128,x+24,134,'#a8956a');line(c,x+16,128,x+9,134,'#a8956a');
    for(const bx of [x,x+w-6]){px(c,bx,100,6,118,'#7a6244');px(c,bx,100,2,118,'#95785a');px(c,bx+5,100,1,118,WOOD_D);px(c,bx-2,98,10,4,'#4a3a28');}px(c,x,100,w,4,BEAM);px(c,x,100,w,1,BEAM_L);}
  function stallGate(c,x,y,w,h){const G='#857052',GL='#a08a60',GD='#4a3a28';px(c,x,y,4,h,GD);px(c,x+w-4,y,4,h,GD);for(const by of [0,Math.round(h/2)-4,h-8]){px(c,x,y+by,w,8,G);px(c,x,y+by,w,1,GL);px(c,x,y+by+7,w,1,GD);for(let k=x+6;k<x+w-6;k+=11)px(c,k,y+by+2+(k%3),3+hash(k+by)*4,1,GD);}
    line(c,x+4,y+h-4,x+w-4,y+4,G,3);line(c,x+4,y+h-5,x+w-4,y+3,GL);px(c,x+w-10,y+Math.round(h/2)-2,6,4,IRON);px(c,x-2,y+2,3,6,IRON);px(c,x-2,y+h-8,3,6,IRON);}
  function wheel(c,cx,cy,r){c.fillStyle='#232320';c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();for(let a=0;a<14;a++){const t=a/14*Math.PI*2;px(c,cx+Math.cos(t)*(r-2)-1,cy+Math.sin(t)*(r-2)-1,3,3,'#151513');}
    c.fillStyle='#3a3b35';c.beginPath();c.arc(cx,cy,r-6,0,Math.PI*2);c.fill();c.fillStyle='#8a5a3a';c.beginPath();c.arc(cx,cy,r*.5,0,Math.PI*2);c.fill();c.fillStyle='#6b4a32';c.beginPath();c.arc(cx,cy,r*.5-3,0,Math.PI*2);c.fill();
    c.fillStyle=IRON_L;c.beginPath();c.arc(cx,cy,r*.18,0,Math.PI*2);c.fill();for(let a=0;a<6;a++){const t=a/6*Math.PI*2;px(c,cx+Math.cos(t)*r*.33-1,cy+Math.sin(t)*r*.33-1,2,2,IRON);}}
  // Tractor: x = rear wheel centre, y = ground line. Seat, dash and stack first, then fender, hood, chassis, wheels in front.
  function tractor(c,x,y){const RD='#5a3422',RL='#96603e';
    px(c,x+70,y-134,6,50,IRON);px(c,x+68,y-140,10,6,'#2b2a26');px(c,x+68,y-112,10,2,IRON_L);px(c,x+26,y-104,6,20,IRON);
    c.strokeStyle=IRON_L;c.lineWidth=2;c.beginPath();c.arc(x+26,y-108,9,0,Math.PI*2);c.stroke();px(c,x-14,y-118,18,6,'#4a4c42');px(c,x-12,y-112,14,12,'#4a4c42');px(c,x-18,y-100,30,6,'#4a4c42');px(c,x-20,y-94,34,4,IRON);
    px(c,x-42,y-96,72,20,RD);px(c,x-42,y-96,72,3,RL);px(c,x-42,y-78,72,2,'#3a2216');shape(c,[[x-42,y-96],[x-30,y-104],[x+30,y-104],[x+30,y-96]],RD);
    px(c,x+30,y-100,6,54,RD);px(c,x+30,y-100,92,12,RD);shape(c,[[x+36,y-88],[x+122,y-88],[x+122,y-46],[x+36,y-46]],RUST);px(c,x+36,y-88,86,3,RL);px(c,x+36,y-49,86,3,RD);px(c,x+118,y-86,4,40,RD);for(let g=0;g<6;g++)px(c,x+108,y-82+g*6,10,3,'#2b2a26');
    px(c,x+60,y-88,2,42,RD);px(c,x+40,y-70,60,1,RD);px(c,x+30,y-100,10,12,'#2b2a26');px(c,x+32,y-98,4,3,'#8d9e69');px(c,x+112,y-80,6,6,BONE);px(c,x+114,y-78,2,2,'#8a8262');
    px(c,x+30,y-46,70,10,'#2b2a26');px(c,x+96,y-40,20,6,IRON);for(let i=0;i<14;i++){const n=x+i*3;px(c,x+38+hash(n)*80,y-84+hash(n+1)*34,3+hash(n+2)*8,2,i%2?RD:'#8a5a3a');}
    wheel(c,x,y-38,38);wheel(c,x+104,y-22,22);c.globalAlpha=.3;px(c,x-44,y-2,176,4,'#12100c');c.globalAlpha=1;}
  function toolRail(c,x,y,w){px(c,x,y,w,5,BEAM);px(c,x,y,w,1,BEAM_L);for(let k=x+8;k<x+w;k+=16)px(c,k,y+5,2,3,IRON);}
  function handsaw(c,x,y){shape(c,[[x,y],[x+34,y],[x+30,y+12],[x+4,y+9]],'#8a8b7a');px(c,x+1,y+1,32,1,'#a0a190');for(let t=x+4;t<x+30;t+=3)px(c,t,y+9+Math.round((t-x)/10),2,2,IRON_L);px(c,x+34,y-2,8,14,WOOD);px(c,x+36,y+1,4,8,WOOD_D);}
  function hammer(c,x,y){px(c,x+2,y,3,26,WOOD_L);px(c,x,y-4,8,7,IRON);px(c,x,y-4,8,1,IRON_L);px(c,x+8,y-3,3,4,IRON);}
  function wrench(c,x,y){px(c,x+1,y,3,22,IRON_L);px(c,x-1,y-4,7,6,IRON_L);px(c,x+1,y-3,3,3,'#1c1e19');px(c,x-1,y+21,7,5,IRON_L);}
  function ropeCoil(c,x,y){c.strokeStyle='#a8956a';c.lineWidth=3;for(let k=0;k<3;k++){c.beginPath();c.arc(x,y+k*2,10-k*1.5,0,Math.PI*2);c.stroke();}c.strokeStyle='#7a6a45';c.lineWidth=1;c.beginPath();c.arc(x,y+2,9,0,Math.PI*2);c.stroke();px(c,x-2,y-14,4,6,IRON);}
  function pitchfork(c,x,y){line(c,x+22,y-150,x+6,y-30,WOOD_L,3);px(c,x,y-32,14,4,IRON);for(let t=0;t<4;t++)line(c,x+1+t*4,y-30,x+t*4-1,y,IRON_L,2);px(c,x+20,y-156,6,8,WOOD_D);}
  function scythe(c,x,y){line(c,x,y,x+70,y+8,WOOD_L,3);px(c,x+20,y-10,3,12,WOOD_D);px(c,x+44,y-2,3,8,WOOD_D);shape(c,[[x-2,y-2],[x-22,y+8],[x-52,y+30],[x-46,y+34],[x-18,y+16],[x,y+6]],'#8a8b7a');line(c,x-4,y,x-48,y+30,'#a0a190');}
  function chainLinks(c,x,y,n,sway=0){for(let k=0;k<n;k++){const lx=x+sway*k/n;px(c,lx-1,y+k*6,3,5,k%2?IRON:IRON_L);px(c,lx,y+k*6+1,1,3,'#1c1e19');}}
  function hook(c,x,y){px(c,x-1,y,3,4,IRON_L);line(c,x-4,y+4,x+3,y+9,IRON_L,2);line(c,x-4,y+4,x-3,y+7,IRON_L,2);}
  function lantern(c,x,y){px(c,x-1,y,3,4,IRON);px(c,x-6,y+3,12,3,IRON);px(c,x-5,y+6,10,14,'#e0a050');px(c,x-5,y+6,2,14,IRON);px(c,x+3,y+6,2,14,IRON);px(c,x-3,y+10,2,6,'#f8e0a0');px(c,x-6,y+20,12,3,IRON);px(c,x-4,y+23,8,2,IRON_L);}
  function workbench(c,x,y){px(c,x,y-50,90,6,BEAM_L);px(c,x,y-50,90,1,'#9a7a52');px(c,x,y-44,90,3,BEAM);for(const lx of [x+4,x+80]){px(c,lx,y-44,6,44,BEAM);px(c,lx,y-44,2,44,BEAM_L);}px(c,x+4,y-20,82,4,BEAM);
    px(c,x+12,y-16,10,12,'#5f6b70');px(c,x+12,y-16,10,1,'#8fa0aa');px(c,x+26,y-14,14,10,'#8a7042');px(c,x+27,y-13,12,1,'#a8865a');px(c,x+60,y-14,7,10,'#6f7a5c');px(c,x+44,y-12,12,8,'#8a8262');
    px(c,x+66,y-64,16,14,IRON);px(c,x+66,y-64,16,2,IRON_L);px(c,x+62,y-58,24,3,IRON_L);px(c,x+84,y-60,10,2,IRON);px(c,x+92,y-63,2,8,IRON_L);px(c,x+74,y-54,3,4,IRON);
    px(c,x+10,y-62,9,12,'#8a8262');px(c,x+11,y-66,4,4,'#8a8262');px(c,x+18,y-64,6,2,'#8a8262');px(c,x+28,y-58,8,8,'#6f8a88');px(c,x+29,y-57,6,6,'#3b3f3d');px(c,x+30,y-56,4,4,'#8a8b7a');
    px(c,x+40,y-53,16,3,BONE);px(c,x+44,y-52,18,2,WOOD_L);px(c,x+58,y-54,5,5,IRON);for(let i=0;i<8;i++)px(c,x+6+hash(x+i)*80,y-51,2,1,'#3a2618');}
  function sacks(c,x,y){const col='#a8956a',sack=(sx,sy,w,h)=>{shape(c,[[sx+3,sy-h],[sx+w-3,sy-h],[sx+w,sy-h+6],[sx+w,sy],[sx,sy],[sx,sy-h+6]],col);px(c,sx+3,sy-h,w-6,2,'#c0ad80');px(c,sx+w-4,sy-h+4,4,h-4,'#8a7a55');px(c,sx+4,sy-Math.round(h*.6),w-8,6,WOOD);px(c,sx+6,sy-Math.round(h*.6)+2,w-12,2,'#c0ad80');for(let s=0;s<5;s++)px(c,sx+1+s*Math.round(w/5),sy-h-1,2,2,'#8a7a55');};
    sack(x,y,30,36);sack(x+32,y,30,36);sack(x+14,y-36,32,34);shape(c,[[x+46,y-30],[x+62,y-34],[x+64,y-26],[x+52,y-24]],'#8a7a55');for(let i=0;i<22;i++){const n=x+i;px(c,x-6+hash(n)*76,y-2+hash(n+1)*8,2,1,'#c9a94f');}}
  function bigBarrel(c,x,y,col='#59604a'){px(c,x,y-42,28,42,col);px(c,x+1,y-44,26,3,tone(col,1.15));px(c,x+24,y-42,4,42,tone(col,.7));px(c,x+2,y-40,3,38,tone(col,1.2));for(const by of [8,22,36])px(c,x,y-42+by,28,3,IRON);px(c,x+10,y-30,6,4,tone(col,.6));}
  function wheelbarrow(c,x,y){shape(c,[[x,y-40],[x+52,y-40],[x+46,y-20],[x+8,y-20]],'#5a6b5c');px(c,x+2,y-40,48,2,'#7a8a78');shape(c,[[x+4,y-38],[x+48,y-38],[x+44,y-24],[x+10,y-24]],'#4a5a4c');
    for(let i=0;i<6;i++)px(c,x+8+hash(x+i)*36,y-36+hash(x+i+3)*12,3,2,'#7a4a30');px(c,x+36,y-20,4,20,IRON);px(c,x+12,y-20,4,20,IRON);
    line(c,x+50,y-36,x+74,y-58,WOOD_L,3);px(c,x+72,y-62,8,4,WOOD_D);c.fillStyle='#2b2a26';c.beginPath();c.arc(x+10,y-9,10,0,Math.PI*2);c.fill();c.fillStyle=IRON_L;c.beginPath();c.arc(x+10,y-9,3,0,Math.PI*2);c.fill();}
  function coop(c,x,y){px(c,x,y-56,56,56,'#4a3a2a');px(c,x-3,y-60,62,6,IRON_L);px(c,x-3,y-60,62,1,'#8a8b7a');px(c,x+3,y-52,50,44,'#2e2116');
    px(c,x+38,y-52,15,16,'#3a2a1e');px(c,x+39,y-44,13,8,HAY_D);px(c,x+42,y-42,4,3,BONE);px(c,x+47,y-41,3,3,BONE);
    px(c,x,y-8,56,8,WOOD);px(c,x,y-8,56,1,WOOD_L);hayPile(c,x+4,y-9,48,7);px(c,x+30,y-16,11,7,'#d8ccaa');px(c,x+28,y-19,5,5,'#d8ccaa');px(c,x+29,y-21,3,2,'#a83a2a');
    for(let g=x+3;g<x+53;g+=6)px(c,g,y-52,1,44,'#8a8b7a');for(let g=y-52;g<y-8;g+=6)px(c,x+3,g,50,1,'#8a8b7a');label(c,'EGGS',x+16,y-26,'#a8956a',6);}
  function chicken(c,x,y,peck){px(c,x,y-8,12,8,'#d8ccaa');px(c,x-3,y-11,5,6,'#d8ccaa');px(c,x+10,y-7,3,3,'#b0a080');const hy=y-13+peck*8,hx=x+12+peck*3;px(c,hx-2,y-9,3,Math.max(1,hy+4-(y-9)),'#d8ccaa');px(c,hx,hy,5,5,'#d8ccaa');px(c,hx+5,hy+2,3,2,'#c9803a');px(c,hx+1,hy-2,3,2,'#a83a2a');px(c,hx+3,hy+1,1,1,'#1c1e19');px(c,x+3,y,2,3,'#c9803a');px(c,x+8,y,2,3,'#c9803a');}
  function boardedDoor(c,x,y){px(c,x-4,y-4,38,4,BEAM);px(c,x-4,y,4,108,BEAM);px(c,x+30,y,4,108,BEAM);px(c,x,y,30,108,'#3a2a1e');for(let p=x+1;p<x+30;p+=8)px(c,p,y,1,108,'#2a1e14');
    c.save();c.translate(x+15,y+26);for(const r of [-.3,.26,-.18]){c.rotate(r);px(c,-26,-4,52,8,WOOD_L);px(c,-26,-4,52,1,'#a08050');px(c,-26,3,52,1,WOOD_D);px(c,-22,-1,2,2,IRON);px(c,20,-1,2,2,IRON);c.rotate(-r);c.translate(0,28);}c.restore();
    px(c,x+2,y+94,26,10,BONE);label(c,'KEEP',x+4,y+102,'#a83a2a',6);}
  function brokenWindow(c,x,y){px(c,x-3,y-3,46,36,BEAM);px(c,x,y,40,30,'#a15e40');px(c,x,y,40,10,'#8e4f3a');px(c,x,y+18,40,12,'#896039');
    for(let s=0;s<5;s++){const sy=y+2+s*6;if(s===2){line(c,x,sy,x+16,sy+9,WOOD,3);continue;}if(s===3)continue;px(c,x,sy,40,3,WOOD);px(c,x,sy,40,1,WOOD_L);}px(c,x+18,y+14,3,16,WOOD_D);
    c.globalAlpha=.08;shape(c,[[x,y+8],[x+40,y+8],[x+150,y+150],[x+70,y+150]],'#e8b070');c.globalAlpha=1;}
  function clawMarks(c,x,y,n=4,len=36){c.globalAlpha=.6;for(let k=0;k<n;k++)line(c,x+k*5,y,x+k*5+8,y+len,'#3a1512',2);c.globalAlpha=.35;for(let k=0;k<n;k++)line(c,x+k*5+1,y+2,x+k*5+9,y+len-4,'#5a2018');c.globalAlpha=1;}
  function driedPool(c,x,y,w,h){c.globalAlpha=.6;shape(c,[[x,y],[x+w*.3,y-h*.5],[x+w*.7,y-h*.4],[x+w,y+h*.2],[x+w*.8,y+h],[x+w*.35,y+h*.9],[x+w*.05,y+h*.5]],'#2a0f0c');c.globalAlpha=.35;shape(c,[[x+w*.2,y],[x+w*.6,y-h*.2],[x+w*.7,y+h*.5],[x+w*.3,y+h*.6]],'#4a1a14');
    c.globalAlpha=.4;for(let k=0;k<6;k++){const n=x+k*7;px(c,x+w*.5+(hash(n)-.5)*w*1.5,y+(hash(n+1)-.5)*h*1.8,2+hash(n+2)*5,1,'#2a0f0c');}c.globalAlpha=1;}
  // A ribcage on its side, a skull and a long bone: muted so they read as detail rather than gore.
  function bones(c,x,y){c.strokeStyle=BONE;c.lineWidth=2;for(let k=0;k<5;k++){c.beginPath();c.arc(x+8+k*5,y-2,8,Math.PI*1.05,Math.PI*1.9);c.stroke();}px(c,x+2,y-10,30,2,'#a8a080');
    px(c,x+38,y-9,9,8,BONE);px(c,x+40,y-6,2,2,'#3a2618');px(c,x+44,y-6,2,2,'#3a2618');px(c,x+40,y-2,7,2,'#a8a080');px(c,x-12,y+2,18,2,BONE);px(c,x-14,y,3,4,BONE);px(c,x+5,y,3,4,BONE);}
  function cobweb(c,x,y,dir,r=40){c.globalAlpha=.32;c.strokeStyle='#b8b8a8';c.lineWidth=1;for(let k=0;k<=4;k++){const a=k/4*Math.PI/2;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*r*dir,y+Math.sin(a)*r);c.stroke();}
    for(let q=1;q<=3;q++){const rr=r*q/3.4;c.beginPath();for(let k=0;k<=8;k++){const a=k/8*Math.PI/2,sag=Math.sin(k/8*Math.PI)*3,X=x+Math.cos(a)*rr*dir,Y=y+Math.sin(a)*rr+sag;k?c.lineTo(X,Y):c.moveTo(X,Y);}c.stroke();}c.globalAlpha=1;}
  // The open doorway: sunset bands, a low sun, far hills and a fenced field running up to the sill.
  function barnDoorway(c,x,w){px(c,x,30,w,188,'#a15e40');px(c,x,30,w,34,'#8e4f3a');px(c,x,64,w,32,'#a76340');px(c,x,96,w,30,'#b17c48');px(c,x,126,w,14,'#b8884a');
    c.globalAlpha=.35;c.fillStyle='#e8b060';c.beginPath();c.arc(x+34,132,20,0,Math.PI*2);c.fill();c.globalAlpha=1;c.fillStyle='#e0a858';c.beginPath();c.arc(x+34,132,13,0,Math.PI*2);c.fill();
    for(let s=0;s<3;s++)px(c,x+2+s*20,84+s*14,20+hash(s)*30,2,'#8e4f3a');
    const hills=[[x,150]];for(let sx=0;sx<=w;sx+=6)hills.push([x+sx,141-Math.sin(sx*.05)*6-hash(sx)*3]);hills.push([x+w,150]);shape(c,hills,'#7a5a38');
    px(c,x,148,w,70,'#6a6a48');px(c,x,148,w,2,'#8a8262');for(let y=156;y<218;y+=8)px(c,x,y,w,1,'#5e5e40');for(let fx=x+6;fx<x+w;fx+=22)px(c,fx,160,3,22,'#4a3f2c');px(c,x,166,w,2,'#5a4e36');px(c,x,176,w,2,'#5a4e36');
    px(c,x+50,120,2,24,'#3a2c20');px(c,x+44,118,14,4,'#3a2c20');line(c,x+70,150,x+72,118,'#3a2c20',2);line(c,x+72,128,x+80,116,'#3a2c20');line(c,x+72,122,x+64,112,'#3a2c20');
    px(c,x-8,24,8,194,BEAM);px(c,x-8,24,2,194,BEAM_L);px(c,x+w,24,8,194,BEAM);px(c,x+w,24,2,194,BEAM_L);px(c,x-8,24,w+16,8,BEAM);px(c,x-4,214,w+8,6,'#8a7d55');px(c,x-4,214,w+8,1,'#9a8b5e');}
  // The sliding door, rolled open to the right: faded red boards, an X brace, strap hinges and rollers on an iron rail.
  function slidingDoor(c,x,y,w,h){px(c,x-110,y-8,w+120,6,IRON);px(c,x-110,y-8,w+120,1,IRON_L);for(const rx of [x+10,x+w-16]){px(c,rx,y-14,6,8,IRON_L);px(c,rx+1,y-6,4,7,IRON);}
    px(c,x,y,w,h,'#6e3c2c');for(let p=x;p<x+w;p+=12){px(c,p,y,1,h,'#4e2a1e');if(hash(p)>.6)px(c,p+1,y,11,h,'#743f2e');if(hash(p+3)>.7)px(c,p+4,y+hash(p)*h*.6,2,20+hash(p+1)*50,'#5e3426');}
    line(c,x+4,y+8,x+w-4,y+h-8,'#8a5a3a',4);line(c,x+w-4,y+8,x+4,y+h-8,'#8a5a3a',4);px(c,x,y+4,w,5,'#8a5a3a');px(c,x,y+h-9,w,5,'#8a5a3a');px(c,x,y,3,h,'#8a5a3a');px(c,x+w-3,y,3,h,'#8a5a3a');
    for(const hy of [y+16,y+h-20]){px(c,x+6,hy,30,5,IRON);px(c,x+8,hy+1,2,3,IRON_L);px(c,x+30,hy+1,2,3,IRON_L);}px(c,x+w-16,y+90,4,14,IRON);c.globalAlpha=.4;label(c,'7',x+34,y+70,'#3a1a12',22);c.globalAlpha=1;}
  function barnFloor(c,L){px(c,0,218,L,112,'#3c3a33');for(let i=0;i<180;i++){const n=i*31+5;px(c,hash(n)*L,222+hash(n+1)*104,6+hash(n+2)*26,2+hash(n+3)*4,['#413e36','#37352e','#45423a','#3a3831'][i%4]);}
    px(c,40,218,210,112,'#463c30');for(let y=218;y<330;y+=14){px(c,40,y,210,1,'#352c22');for(let k=0;k<3;k++)px(c,40+hash(y+k)*200,y+3+hash(y+k+9)*9,1,1,'#2a2118');}px(c,250,218,2,112,'#2e2a24');
    for(let i=0;i<14;i++){const n=i*47+11,x=260+hash(n)*820,y=228+hash(n+1)*94;px(c,x,y,5,7,'#33312b');px(c,x+1,y+1,3,4,'#2e2c27');}
    for(let i=0;i<260;i++){const n=i*17+3,x=hash(n)*L,y=222+hash(n+1)*104,near=(x>440&&x<660)||(x>820&&x<1010);if(!near&&hash(n+2)>.3)continue;line(c,x,y,x+3+hash(n+3)*6,y+(hash(n+4)-.5)*3,i%3?HAY_D:HAY);}
    px(c,0,218,L,4,BEAM);px(c,0,222,L,1,'#2e2219');px(c,0,326,L,4,'#2a2823');}
  function drawBarn(c,room){
    const L=room.length;
    roofUnderside(c,L);plankWall(c,0,L,30,218);
    for(const g of [[300,34,66],[330,34,50],[470,34,64],[600,36,60],[760,34,44],[905,34,66],[1000,34,50]])sunGap(c,g[0],g[1],g[2]);
    loft(c,640,460);beam(c,0,18,L);
    for(const x of [240,440,640,840,1040]){post(c,x);brace(c,x,74,-1);brace(c,x+14,74,1);}
    barnFloor(c,L);
    // Sunset spills through the open sliding door and lies across the plank apron and dirt beyond it.
    c.globalAlpha=.05;shape(c,[[40,218],[130,218],[620,330],[200,330]],'#e8a860');c.globalAlpha=.06;shape(c,[[44,218],[126,218],[520,330],[260,330]],'#f0b870');c.globalAlpha=1;
    barnDoorway(c,40,90);slidingDoor(c,140,40,94,178);
    // Workbench corner: tool rail with saw, hammer and wrench; a rope coil on the post; a hook on the beam for the lantern.
    toolRail(c,252,104,90);handsaw(c,256,112);hammer(c,300,118);wrench(c,318,116);px(c,332,108,4,3,IRON);line(c,334,110,334,140,'#7a6a45');px(c,330,140,8,10,'#59604a');workbench(c,252,218);ropeCoil(c,247,150);px(c,371,30,3,4,IRON_L);
    sacks(c,350,218);bigBarrel(c,414,218);
    // Stalls: the first still latched, the second torn open with claw marks, a dried pool and what was left of the animal.
    stallBox(c,454,86);stallGate(c,460,140,74,78);stallBox(c,545,89);clawMarks(c,598,118);clawMarks(c,548,150,3,28);bones(c,566,214);driedPool(c,556,236,74,18);scythe(c,600,60);
    c.globalAlpha=.5;for(let k=0;k<3;k++)line(c,552+k*4,192,558+k*4,222,'#3a1512');c.globalAlpha=1;pitchfork(c,650,218);
    tractor(c,706,244);hook(c,657,150);
    ladder(c,884,218,862,86);brokenBale(c,838,222);bale(c,896,218);bale(c,896,190);bale(c,898,162,48,26);
    coop(c,950,218);brokenWindow(c,956,106);boardedDoor(c,1052,110);wheelbarrow(c,994,244);
    cobweb(c,40,30,1);cobweb(c,1088,30,-1,34);cobweb(c,654,96,1,30);cobweb(c,240,30,1,26);
    px(c,0,18,40,200,'#2e2219');px(c,38,18,3,200,'#4a3a2a');px(c,1088,18,12,200,'#2e2219');px(c,1086,18,3,200,'#221a13');
    for(const l of room.loot||[])px(c,l.x-6,l.y+4,14,3,'#2f2d27');
  }
  function barnDynamic(c,camera,time){
    const left=camera-60,right=camera+frame()+60,vis=(x0,x1)=>x1>=left&&x0<=right;
    // Dust drifting in the doorway light and along the wedge it throws on the floor.
    if(vis(40,620)){c.globalAlpha=.45;for(let i=0;i<16;i++){const s=hash(i*9+1),u=hash(i*9+2),v=(time*.05*(1+s)+s)%1;px(c,40+v*220+u*(90+v*170)+Math.sin(time*1.1+i)*2,218+v*112,1,1,'#f0d0a0');}
      for(let i=0;i<8;i++){const s=hash(i*5+3);px(c,46+hash(i*5+4)*80+Math.sin(time*.9+i)*3,60+((time*4*(1+s)+s*160)%158),1,1,'#f8dcb0');}c.globalAlpha=1;}
    for(const g of [[300,34,66],[470,34,64],[905,34,66]]){if(!vis(g[0],g[0]+130))continue;c.globalAlpha=.4;for(let i=0;i<5;i++){const s=hash(g[0]+i*7),t=(time*.04*(1+s)+s)%1;px(c,g[0]+t*130+Math.sin(time+i)*2,g[1]+g[2]*.5+t*120,1,1,'#f0d0a0');}c.globalAlpha=1;}
    // Hanging bulb on a long flex: it swings, its pool slides across the floor and the nearest post's shadow swings the other way.
    if(vis(400,660)){const a=Math.sin(time*1.5)*.11+Math.sin(time*.37)*.03,bx=522+Math.sin(a)*96,by=30+Math.cos(a)*96,sh=(522-bx)*1.4;
      c.globalAlpha=.12;shape(c,[[440+sh,218],[456+sh,218],[470+sh*1.6,330],[430+sh*1.6,330]],'#12100c');c.globalAlpha=.07;shape(c,[[bx-30,by+14],[bx+30,by+14],[bx+150+(bx-522)*2,330],[bx-150+(bx-522)*2,330]],'#f0d890');
      c.globalAlpha=.16;c.fillStyle='#f0d890';c.beginPath();c.arc(bx,by+9,16,0,Math.PI*2);c.fill();c.globalAlpha=1;
      line(c,522,30,bx,by,'#2b2a26');px(c,bx-2,by,5,5,IRON);px(c,bx-3,by+5,7,8,'#f0d890');px(c,bx-2,by+13,5,2,'#e8c870');}
    // Lantern on its beam hook, swaying gently and warming the workbench wall.
    if(vis(330,420)){const a=Math.sin(time*1.1+2)*.06,lx=372+Math.sin(a)*22,ly=30+Math.cos(a)*22;c.globalAlpha=.09;c.fillStyle='#e0a050';c.beginPath();c.arc(lx,ly+14,32,0,Math.PI*2);c.fill();c.globalAlpha=1;line(c,372,30,lx,ly,IRON_L);lantern(c,lx,ly);}
    // Chains off the loft beam sway; the broken stall gate hangs off its top hinge and creaks a few degrees.
    if(vis(630,690)){const sw=Math.sin(time*.8+1)*5;chainLinks(c,657,96,9,sw);chainLinks(c,667,96,7,sw*.8);hook(c,657+sw,150);}
    if(vis(530,650)){const cr=Math.sin(time*.9)*.02+Math.max(0,Math.sin(time*.23))*.03;c.save();c.translate(551,142);c.rotate(.3+cr);stallGate(c,0,0,77,78);px(c,60,-2,17,4,WOOD_D);c.restore();}
    // Flies on small loops over the carcass.
    if(vis(540,640)){for(let i=0;i<3;i++){const f=time*(5+i*1.3)+i*2,fx=584+Math.cos(f)*(9+i*4)+Math.sin(time*.7+i)*6,fy=200+Math.sin(f*1.7)*(5+i*2);px(c,fx,fy,2,1,'#1c1e19');}}
    // A rat dashes along the baseboard under the tractor every so often.
    {const ph=time%13;if(ph<2.2&&vis(640,840)){const t=ph/2.2,rx=650+t*180,bob=Math.abs(Math.sin(t*40))*1.5;px(c,rx,213-bob,10,4,'#3a3630');px(c,rx+9,212-bob,4,3,'#3a3630');px(c,rx+11,211-bob,1,1,'#2e2116');line(c,rx,215-bob,rx-8,214-bob+Math.sin(time*30)*1.5,'#4a4640');px(c,rx+12,213-bob,1,1,'#c9403a');}}
    // Roof leak: a drop swells, falls past the sacks and rings a puddle on the floor.
    if(vis(320,380)){const ph=(time%2.6)/2.6;c.globalAlpha=.35;shape(c,[[334,298],[350,294],[362,300],[350,306],[336,304]],'#2b3335');c.globalAlpha=1;px(c,345,20,3,2,'#6a7a7c');
      if(ph>.7){const dy=22+Math.pow((ph-.7)/.3,2)*274;px(c,346,dy,1,4,'#9fc4cc');px(c,346,dy+3,1,1,'#cfe4e8');}else px(c,346,22,1,Math.ceil(1+ph*2),'#9fc4cc');
      if(ph<.5){c.save();c.translate(346,300);c.scale(1,.35);c.globalAlpha=.5*(1-ph*2);c.strokeStyle='#9fc4cc';c.lineWidth=1;c.beginPath();c.arc(0,0,2+ph*24,0,Math.PI*2);c.stroke();c.restore();c.globalAlpha=1;}}
    // Straw wisps drift near the bales; a hen pecks about the coop floor.
    if(vis(820,1040)){c.globalAlpha=.8;for(let i=0;i<6;i++){const s=hash(i*11+2),t=(time*(6+s*8)+s*300)%220,x=860+t,y=236+Math.sin(time*.8+i*1.7)*10+s*40;line(c,x,y,x+4,y+1+Math.sin(time*2+i),i%2?HAY_L:HAY_D);}c.globalAlpha=1;}
    if(vis(940,1010)){const cyc=time%4,peck=cyc<1.2?Math.abs(Math.sin(cyc*9))*.9:cyc<2?0:Math.max(0,Math.sin((cyc-2)*3))*.3;chicken(c,960+Math.floor(cyc/2)*6,209,peck);}
  }

  // ---- The room itself ----
  function drawStore(c,room){
    const L=room.length;
    ceiling(c,L);
    // Walls: painted band, wooden chair rail, tiled dado below. Grime patches and streaks age the paint.
    px(c,0,74,L,137,'#535744');px(c,0,74,L,3,'#474b3c');px(c,0,146,L,8,'#6d4a38');px(c,0,146,L,1,'#7c5a44');px(c,0,153,L,1,'#4c2f22');px(c,0,154,L,57,'#4a4e40');
    for(let y=154;y<211;y+=14)px(c,0,y,L,1,'#41463a');for(let y=154;y<211;y+=14)for(let x=(Math.round((y-154)/14)%2)*11;x<L;x+=22)px(c,x,y,1,14,'#41463a');
    for(let i=0;i<26;i++){const n=i*17+3;px(c,hash(n)*L,80+hash(n+1)*120,4+hash(n+2)*18,2+hash(n+3)*9,i%2?'#4b4f3f':'#5a5d49');}
    for(let i=0;i<8;i++){const n=i*23+9,x=hash(n)*L;c.globalAlpha=.35;px(c,x,154,1+hash(n+1)*2,20+hash(n+2)*36,'#3a3d33');c.globalAlpha=1;}
    px(c,0,211,L,7,'#2b2d27');px(c,0,211,L,1,'#3c3e36');
    // Linoleum: cool greys like the road so blood reads; a light seam at the wall foot mirrors the curb line.
    px(c,0,218,L,112,'#3c3f3a');for(let y=218;y<330;y+=20)for(let x=(Math.round((y-218)/20)%2)*20;x<L;x+=40)px(c,x,y,20,20,'#444842');
    for(let i=0;i<18;i++){const n=i*41+13,tx=Math.floor(hash(n)*L/20)*20,ty=218+Math.floor(hash(n+1)*5.6)*20;px(c,tx,ty,20,20,i%3?'#3a3d38':'#484c46');if(i%4===0){line(c,tx+3,ty+16,tx+17,ty+4,'#33352f');}}
    px(c,0,218,L,3,'#5a5e55');px(c,0,221,L,1,'#2e302b');c.globalAlpha=.35;px(c,0,222,L,9,'#2b2d27');c.globalAlpha=1;
    for(let i=0;i<70;i++){const n=i*29+7,x=hash(n)*L,y=226+hash(n+1)*98;if(i%5===0){line(c,x,y,x+18,y+3,'#343a36');line(c,x+18,y+3,x+26,y+11,'#343a36');}else if(i%5===1)px(c,x,y,5+hash(n+2)*9,2+hash(n+3)*2,'#8a8262');else if(i%5===2)px(c,x,y,4+hash(n+2)*10,1+hash(n+3)*2,'#2f322d');else if(i%5===3)px(c,x,y,3,2,'#746a47');else px(c,x,y,1,1,'#9aa89a');}
    // Loose cans and crumpled paper on the lane; all flat so they never read as obstacles.
    for(let i=0;i<10;i++){const n=i*53+3,x=140+hash(n)*720,y=250+hash(n+1)*70,col=GOODS[i%GOODS.length];if(i%2){px(c,x,y-2,7,3,col);px(c,x,y-2,7,1,tone(col,1.25));px(c,x+6,y-2,1,3,'#9a927a');}else{px(c,x,y-1,4+hash(n+2)*4,2,'#c9b898');px(c,x+1,y-2,2,1,CREAM);}}
    px(c,0,326,L,4,'#2c2e2a');
    // Left and right return walls close the room; the exit door sits just inside the left one.
    px(c,0,74,42,144,'#3a3d33');px(c,40,74,3,144,'#5a5d4c');px(c,L-16,74,16,144,'#3a3d33');px(c,L-18,74,3,144,'#2f312b');extinguisher(c,L-12,160);
    // High transom strip above the shelving: some panes are boarded with plywood and one is cracked.
    px(c,298,78,290,28,'#69604a');for(let p=0;p<7;p++){const wx=301+p*41;px(c,wx,81,38,22,'#a15e40');px(c,wx,92,38,7,'#ae6d45');px(c,wx,98,38,5,'#896039');if(hash(p+51)>.68){px(c,wx,81,38,10,'#6a5b40');px(c,wx,92,38,11,'#5e5039');px(c,wx,81,38,1,'#8a7d5a');px(c,wx,92,38,1,'#8a7d5a');for(const nx of [3,34])for(const ny of [86,97])px(c,wx+nx,ny,1,1,INK);}else if(p===3){line(c,wx+6,103,wx+18,92,'#c9b898');line(c,wx+18,92,wx+30,84,'#c9b898');line(c,wx+18,92,wx+34,97,'#c9b898');line(c,wx+18,92,wx+11,82,'#c9b898');}}
    for(const t of TUBES[room.id]||[])tube(c,t.x,!t.flicker&&!t.dead,t.dead);
    // Entry corner: door, ATM, fuel prices, a payphone and a dropped basket of nothing.
    glassDoor(c,44);atm(c,110,118);fuelSign(c,110,80);lightSwitch(c,254,150);
    // Counter block.
    cigWall(c,152);counterFront(c,150);counterTop(c,150);bloodTrail(c,262,262);cashDrawer(c,214,246);
    staffDoor(c,262);clock(c,281,84);mopBucket(c,270,232);missingFlyer(c,272,158);
    // Two gondolas: the first has been picked over, the second is mostly stocked. A chip end-cap sits between.
    shelfUnit(c,300,236,150,130,11,'食品 SNACKS',.55);
    px(c,452,120,36,116,'#6f6a52');px(c,453,120,1,116,'#857f62');px(c,486,120,1,116,'#4c4a3a');for(let r=0;r<5;r++){px(c,454,132+r*20,32,2,'#857f62');for(let k=0;k<3;k++){if(hash(r*7+k+91)<.3)continue;bag(c,456+k*10,131+r*20,GOODS[(r*3+k)%GOODS.length]);}px(c,456+((r*5)%3)*10,132+r*20,6,2,PAPER);}px(c,452,120,36,8,'#a45231');label(c,'2元',457,127,CREAM,6);px(c,450,233,40,4,'#2b2d27');
    shelfUnit(c,490,236,150,130,29,'饮料 DRINKS',.15);
    // A tipped basket and spilled tins mark where someone looted in a hurry.
    shape(c,[[538,268],[566,262],[570,278],[544,284]],'#5e5039');px(c,542,270,22,10,'#3b3a2e');for(let s=0;s<5;s++)px(c,541+s*5,264,1,18,'#4c4a3a');for(let i=0;i<7;i++){const n=i*7,col=GOODS[i%GOODS.length];px(c,548+hash(n)*60,262+hash(n+1)*40,7,4,col);px(c,548+hash(n)*60,262+hash(n+1)*40,7,1,tone(col,1.25));}
    // Toppled unit leaning onto the hot-food station, with a beer poster and the community board above.
    beerPoster(c,592,82);highwayMap(c,590,138);bulletin(c,652,84);toppledShelf(c,652,236,71);hotStation(c,704);
    // Coolers and the upright ice merchandiser along the right wall; glass shards on the floor in front of the open door.
    // Syrup has run from the slushie spout over the counter lip and dried down the front.
    px(c,741,156,12,3,'#5a2440');c.globalAlpha=.45;px(c,746,159,2,76,'#5a2440');c.globalAlpha=1;
    cooler(c,770,236);iceMerch(c,868,236);wetFloorCone(c,472,246);brokenGlass(c,800,240,7);boxStack(c,500,232);
    for(const l of room.loot||[])px(c,l.x-6,l.y+4,14,3,'#2f322d');
  }
  function drawRoom(c,room){if(room.id==='barn')drawBarn(c,room);else drawStore(c,room);}
  function getRoom(id){const room=INTERIORS[id];if(!room)return null;if(!rooms.has(id)){if(typeof document==='undefined'||!document.createElement)return null;const cv=document.createElement('canvas');cv.width=room.length;cv.height=HEIGHT;drawRoom(cv.getContext('2d'),room);rooms.set(id,cv);}return rooms.get(id);}
  function drawInterior(c,id,camera,time){
    const room=INTERIORS[id];px(c,0,0,frame(),HEIGHT,VOID);if(!room)return;
    const cv=getRoom(id),ox=Math.round(-camera);
    if(cv)c.drawImage(cv,ox,0);else{c.save();c.translate(ox,0);drawRoom(c,room);c.restore();}
    c.save();c.translate(ox,0);
    // Dynamic layer: the unstable tube stutters between dim and lit; dust drifts in every lit cone.
    const tubes=TUBES[id]||[];
    for(const t of tubes){if(!t.flicker)continue;const lit=hash(Math.floor(time*14)+t.x)>.32&&Math.sin(time*2.1+t.x)>-.7;t.on=lit;if(lit){tube(c,t.x,true);c.globalAlpha=.08;px(c,t.x-60,74,120,137,'#e8e2b8');c.globalAlpha=1;}}
    c.globalAlpha=.3;for(const t of tubes){if(t.dead||(t.flicker&&!t.on))continue;for(let i=0;i<9;i++){const s=hash(t.x+i*7),y=60+((time*(4+s*6)+s*180)%150),sp=(y-54)/276*78+40;px(c,t.x+(hash(t.x+i*3)-.5)*2*sp,y,1,1,'#e8e2b8');}}c.globalAlpha=1;
    if(id==='barn')barnDynamic(c,camera,time);
    if(id==='store'){const left=camera-60,right=camera+frame()+60,vis=(x0,x1)=>x1>=left&&x0<=right;
      // Cooler cast on the floor, the open door spilling brighter; EXIT sign pulse; ATM LED; neon OPEN stutter.
      c.globalAlpha=.07+Math.sin(time*1.3)*.02;px(c,774,108,88,124,'#7fb8c4');c.globalAlpha=.05;shape(c,[[774,236],[862,236],[882,300],[754,300]],'#7fb8c4');c.globalAlpha=.06;shape(c,[[820,236],[864,236],[880,290],[806,290]],'#9fc4cc');
      c.globalAlpha=.12+Math.sin(time*3)*.04;px(c,52,74,46,22,'#ff6a4a');c.globalAlpha=.25;px(c,60,80,30,10,'#ff6a4a');
      if(Math.floor(time*1.5)%2===0){c.globalAlpha=1;px(c,136,124,3,3,'#8fe07a');c.globalAlpha=.3;px(c,133,121,9,9,'#8fe07a');}
      const neon=hash(Math.floor(time*9))>.15;c.globalAlpha=.28;label(c,'O',58,114,'#e08a6a',9);c.globalAlpha=neon?.95:.4;label(c,'PEN',65,114,'#ff9a78',9);if(neon){c.globalAlpha=.16;px(c,52,103,46,14,'#ff8a6a');}c.globalAlpha=1;
      // Ceiling fan turning: four blades cycle edge-on around the hub, the one swinging toward us drawn lighter and last.
      if(vis(290,400)){const bl=[];for(let b=0;b<4;b++){const a=time*2.4+b*Math.PI/2;bl.push([Math.sin(a),Math.cos(a)*42,Math.sin(a)*2.5]);}bl.sort((p,q)=>p[0]-q[0]);for(const b of bl)line(c,345,50,345+b[1],50+b[2],b[0]>0?'#5a5442':'#443f31',3);px(c,345,48,2,6,'#6b6d5e');}
      // The missing-person flyer taped to the door flutters at one corner in the draught.
      if(vis(40,80)){missingFlyer(c,52,178);const lift=Math.max(0,Math.sin(time*6.2)*.6+Math.sin(time*2.3)*.6-.2)*7;if(lift>.5){shape(c,[[70,200],[70-lift,200],[70,200-lift]],'#75704f');shape(c,[[70-lift,200],[70-lift*1.4,196-lift],[70-lift*.2,196-lift*1.3]],'#b8b090');}}
      // Slushie machine drip: a bead swells on the counter lip, drops down the front and splats.
      if(vis(720,780)){const ph=(time%3.1)/3.1;if(ph<.75)px(c,746,161,2,1+Math.round(ph*3),'#a83a5a');else px(c,746,162+Math.pow((ph-.75)/.25,2)*74,2,3,'#a83a5a');if(ph<.08)px(c,744,235,6,2,'#a83a5a');}
      // A can on the floor that rolls a little way and back every few seconds, its label stripe turning with it.
      if(vis(560,660)){const k=Math.floor(time/8),ph=(time%8)/8,e=ph<.18?1-Math.pow(1-ph/.18,3):1,x=Math.round(590+(k%2?36-36*e:36*e)),col='#8a5a3c';px(c,x,300,8,4,col);px(c,x,300,8,1,tone(col,1.25));px(c,x+7,300,1,4,'#9a927a');const st=((x*13)%8+8)%8;if(st<6)px(c,x+st,301,1,2,CREAM);}
      // Open cooler door rattles by a pixel while the compressor runs.
      if(vis(800,880)){const hum=Math.sin(time*.7)>.45,j=hum?Math.floor(time*28)%2:0;openCoolerDoor(c,820+j,108);}
    }
    c.restore();
  }
  function drawInteriorForeground(c,id,camera,time){
    const room=INTERIORS[id];if(!room)return;const ox=Math.round(-camera*1.12);
    if(id==='barn'){
      // Barn foreground: a bale end, a post foot and a chain slung over a hook stub; all sit below y 312.
      for(const f of [[150,'bale'],[520,'post'],[880,'chain'],[1010,'bale']]){const x=f[0]+ox;if(x<-90||x>frame()+90)continue;
        if(f[1]==='bale'){px(c,x,314,58,16,'#1d1a15');px(c,x+2,314,54,1,'#2c2822');for(let k=0;k<8;k++)px(c,x+4+k*7,318+(k%3)*3,4,1,'#2c2822');px(c,x+18,314,2,16,'#15130f');px(c,x+40,314,2,16,'#15130f');}
        else if(f[1]==='post'){px(c,x,312,16,18,'#1d1a15');px(c,x+2,312,2,18,'#2c2822');px(c,x-4,326,24,4,'#1d1a15');}
        else{px(c,x,318,20,12,'#1d1a15');px(c,x+8,314,4,6,'#1d1a15');for(let k=0;k<8;k++)px(c,x+18+k*6,315+Math.round(Math.sin(k*.9+time*1.3)*1.5),4,4,'#1d1a15');px(c,x+64,313,4,7,'#1d1a15');}}
      return;}
    // Low silhouettes slide slightly faster than the room so the floor reads as having depth: boxes, a display stand
    // with hanging tags, and the counter's end cap. None rises above y 312 so feet are never covered.
    for(const f of [[120,18,'boxes'],[470,16,'stand'],[640,18,'cage'],[800,14,'cap']]){const x=f[0]+ox;if(x<-70||x>frame()+70)continue;const top=330-f[1];
      if(f[2]==='boxes'){px(c,x,top,34,f[1],'#1d1f1a');px(c,x+6,top-0,22,1,'#2c2e2a');px(c,x+38,top+6,26,12,'#1d1f1a');px(c,x+38,top+6,26,1,'#2c2e2a');}
      else if(f[2]==='stand'){px(c,x+20,top,4,f[1],'#1d1f1a');px(c,x,top,44,3,'#1d1f1a');for(let k=0;k<4;k++){px(c,x+3+k*11,top+3,7,6,'#1d1f1a');px(c,x+5+k*11,top+3,3,1,'#2c2e2a');}px(c,x-2,330-3,48,3,'#1d1f1a');}
      else if(f[2]==='cage'){px(c,x,top,40,f[1],'#1d1f1a');for(let k=1;k<8;k++)px(c,x+k*5,top+1,1,f[1]-1,'#262822');px(c,x,top+8,40,1,'#262822');px(c,x,top,40,1,'#2c2e2a');}
      else{px(c,x,top,52,f[1],'#1d1f1a');px(c,x,top,52,1,'#2c2e2a');px(c,x+44,top-6,4,6,'#1d1f1a');px(c,x+42,top-8,8,2,'#2c2e2a');}}
  }
  function interiorGrade(c,id){grade(c);c.fillStyle=id==='barn'?'rgba(60,32,12,.14)':'rgba(20,30,40,.18)';c.fillRect(0,0,frame(),HEIGHT);}
  return {INTERIORS,drawInterior,drawInteriorForeground,interiorGrade};
})();
const INTERIORS=interiorArt.INTERIORS;
function drawInterior(c,id,camera,time){interiorArt.drawInterior(c,id,camera,time);}
function drawInteriorForeground(c,id,camera,time){interiorArt.drawInteriorForeground(c,id,camera,time);}
function interiorGrade(c,id){interiorArt.interiorGrade(c,id);}
