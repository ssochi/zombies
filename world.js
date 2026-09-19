'use strict';

// Fixed world landmarks, native-resolution pixels, and independently moving depth layers.
// The road is viewed side-on: both curbs and lane markings remain parallel.
const worldArt = (() => {
  // WIDTH is the live logical frame width (set by setWorldWidth); tiles stay 640 px chunks keyed by index.
  let WIDTH = 640;
  const HEIGHT = 330, TILE = 640, LENGTH = 6400;
  const sectors = [
    {start:0,end:1500,name:'暮色农场',code:'01',subtitle:'沿公路向东 · 穿过荒废农田'},
    {start:1500,end:3050,name:'最后一站',code:'02',subtitle:'废弃加油站 · 小心路边伏击'},
    {start:3050,end:4700,name:'隔离边界',code:'03',subtitle:'疏散区已封锁 · 保持移动'},
    {start:4700,end:LENGTH,name:'铁锈工业区',code:'04',subtitle:'烟囱下的尸潮 · 突围至终点'}
  ];
  const tiles = new Map();
  function hash(n) { const f=Math.sin(n*127.1+311.7)*43758.5453;return f-Math.floor(f); }
  const px=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
  function shape(c,p,col){c.fillStyle=col;c.beginPath();for(let i=0;i<p.length;i++)i?c.lineTo(Math.round(p[i][0]),Math.round(p[i][1])):c.moveTo(Math.round(p[i][0]),Math.round(p[i][1]));c.closePath();c.fill();}
  function line(c,x1,y1,x2,y2,col,width=1){c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x1)+.5,Math.round(y1)+.5);c.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);c.stroke();}
  function label(c,text,x,y,color,size=7){c.fillStyle=color;c.font=`bold ${size}px monospace`;c.textBaseline='alphabetic';c.fillText(text,Math.round(x),Math.round(y));}
  function sectorAt(x){return sectors.find(s=>x>=s.start&&x<s.end)||sectors[x<0?0:3];}
  function windowPane(c,x,y,w,h,lit=false){px(c,x-1,y-1,w+2,h+2,'#69604a');px(c,x,y,w,h,lit?'#8a7645':'#36473e');px(c,x,y,w,2,lit?'#94804e':'#536253');px(c,x+w/2,y,1,h,'#776b50');px(c,x,y+h/2,w,1,'#776b50');}
  function fence(c,from,to,y=208){for(let x=from;x<to;x+=32){px(c,x,y-28,3,30,'#57513a');px(c,x,y-28,1,27,'#7c6f4b');}px(c,from,y-20,to-from,2,'#6f6342');px(c,from,y-10,to-from,2,'#6f6342');}
  function brickwork(c,x,y,w,h,base,shade){px(c,x,y,w,h,base);for(let yy=y+6;yy<y+h;yy+=7){px(c,x,yy,w,1,shade);for(let xx=x+(Math.round((yy-y)/7)%2)*8;xx<x+w;xx+=17)px(c,xx,yy-6,1,6,shade);}}
  function roof(c,x,y,w){shape(c,[[x-5,y],[x+5,y-13],[x+w-11,y-13],[x+w+5,y]],'#514c35');px(c,x-5,y,w+10,4,'#383d30');for(let i=6;i<w-8;i+=10)line(c,x+i,y-11,x+i-6,y-2,'#716047');}
  function barn(c,x,y,w=105,h=58){px(c,x,y-h,w,h,'#885437');for(let a=3;a<w;a+=8)px(c,x+a,y-h,2,h,'#754c32');roof(c,x,y-h,w);px(c,x+31,y-37,41,37,'#403d2b');px(c,x+33,y-35,18,35,'#684932');px(c,x+53,y-35,18,35,'#5b432e');line(c,x+34,y-32,x+49,y-3,'#856940',2);line(c,x+69,y-32,x+54,y-3,'#856940',2);px(c,x+48,y-h+7,10,9,'#372f25');px(c,x,y-3,w,3,'#575235');}
  function car(c,x,y,variant=0){
    const body=['#767559','#965936','#596b65','#837348'][variant%4], shade=['#545944','#69442f','#3c514b','#5b563a'][variant%4];
    px(c,x+2,y-4,148,5,'#373d2e');
    shape(c,[[x+5,y-13],[x+5,y-33],[x+23,y-38],[x+42,y-55],[x+93,y-55],[x+114,y-37],[x+140,y-32],[x+148,y-19],[x+144,y-9],[x+10,y-9]],body);
    shape(c,[[x+30,y-38],[x+45,y-51],[x+64,y-51],[x+64,y-37]],'#34443d');
    shape(c,[[x+68,y-51],[x+91,y-51],[x+106,y-37],[x+68,y-37]],'#34443d');
    shape(c,[[x+46,y-50],[x+60,y-50],[x+34,y-39],[x+31,y-39]],'#566b58');
    px(c,x+11,y-32,126,3,'#7b7252');px(c,x+9,y-22,132,10,shade);px(c,x+68,y-35,2,23,shade);px(c,x+82,y-32,9,2,'#857b62');px(c,x+38,y-32,8,2,'#837a5e');
    px(c,x+132,y-29,13,6,'#9a8a58');px(c,x+6,y-30,9,5,'#98442c');px(c,x+126,y-17,22,4,'#676d5b');px(c,x+4,y-15,17,4,'#444b3d');
    for(const wx of [29,115]){px(c,x+wx-9,y-14,19,15,'#252d28');px(c,x+wx-6,y-17,13,21,'#252d28');px(c,x+wx-4,y-11,9,10,'#65695a');px(c,x+wx-2,y-9,5,6,'#3a463d');}
    for(let i=0;i<8;i++){const q=hash(x+i);px(c,x+16+q*109,y-27+hash(x+i+9)*13,3+q*7,2,'#70523b');}line(c,x+86,y-49,x+79,y-40,'#85927a');line(c,x+79,y-40,x+86,y-37,'#85927a');
  }
  function truck(c,x,y){px(c,x,y-57,110,47,'#656b50');px(c,x+3,y-55,104,3,'#777558');for(let a=5;a<110;a+=12)px(c,x+a,y-51,2,39,'#777b5b');px(c,x+111,y-42,37,32,'#756d48');shape(c,[[x+116,y-41],[x+137,y-41],[x+149,y-24],[x+116,y-24]],'#8b825a');shape(c,[[x+119,y-38],[x+134,y-38],[x+142,y-27],[x+119,y-27]],'#33423b');px(c,x+5,y-13,149,6,'#383f32');px(c,x+142,y-21,9,4,'#8a7f58');for(const wx of [24,93,132]){px(c,x+wx-8,y-14,17,16,'#292f28');px(c,x+wx-4,y-10,9,8,'#7a7760');}px(c,x+121,y-23,6,2,'#8a8262');}
  function barrel(c,x,y,red=false){px(c,x,y-21,13,21,red?'#81442d':'#59604a');px(c,x+1,y-23,11,3,'#6e6646');px(c,x,y-17,13,2,'#333e32');px(c,x,y-5,13,2,'#333e32');px(c,x+2,y-14,2,8,red?'#a66036':'#7a7955');}
  function cone(c,x,y){shape(c,[[x,y],[x+5,y-15],[x+8,y-15],[x+12,y]],'#b36c2d');px(c,x+3,y-9,7,3,'#8a8360');px(c,x-2,y,16,3,'#3a4032');}
  function barrier(c,x,y,w=70){px(c,x+6,y-25,4,25,'#4e5745');px(c,x+w-12,y-25,4,25,'#4e5745');px(c,x,y-30,w,18,'#867b52');for(let q=0;q<w;q+=20)shape(c,[[x+q,y-30],[x+q+9,y-30],[x+q+19,y-12],[Math.min(x+w,x+q+10),y-12]],'#4c513b');px(c,x,y-31,w,2,'#8f8760');}
  function gasStation(c,x){
    brickwork(c,x+125,133,181,74,'#7d6d50','#6f6148');px(c,x+126,131,181,6,'#4c5040');px(c,x+136,150,98,40,'#394c43');for(let q=0;q<3;q++){px(c,x+138+q*32,152,28,34,'#4c6151');px(c,x+141+q*32,155,2,16,'#657460');}px(c,x+246,153,34,54,'#514f39');windowPane(c,x+250,158,25,29);px(c,x+251,184,3,2,'#8f8358');px(c,x+133,138,95,9,'#764832');label(c,'SUPPLY / 24H',x+139,145,'#8c7d5a',7);
    px(c,x+7,197,269,10,'#6c6446');px(c,x+30,137,5,65,'#767458');px(c,x+215,137,5,65,'#767458');px(c,x+32,137,1,65,'#857c5c');px(c,x+218,137,1,65,'#857c5c');px(c,x+5,125,243,14,'#884b30');px(c,x,122,253,5,'#8a7449');px(c,x+5,135,243,6,'#413f31');px(c,x+5,127,243,3,'#b56f3f');label(c,'LAST STOP',x+82,134,'#a8925f',8);
    for(const q of [53,166]){px(c,x+q,170,20,32,'#807459');px(c,x+q+2,166,16,9,'#a45231');px(c,x+q+3,176,14,8,'#35463e');px(c,x+q+5,178,8,2,'#8d9e69');px(c,x+q+3,189,13,11,'#79664a');px(c,x+q+19,179,3,15,'#282f29');px(c,x+q+24,182,2,18,'#282f29');line(c,x+q+21,198,x+q+25,199,'#282f29',2);}
    barrel(c,x+308,207,true);barrel(c,x+324,209);px(c,x-68,114,5,97,'#6f6b4a');px(c,x-83,87,42,29,'#7a4732');px(c,x-81,89,38,25,'#8c7a4f');label(c,'FUEL',x-77,101,'#5b553a',8);label(c,'2.89',x-77,111,'#744b32',8);
  }
  function house(c,x,y,w,h,col){brickwork(c,x,y-h,w,h,col,'#786b4d');roof(c,x,y-h,w);for(let xx=x+12;xx<x+w-12;xx+=29)windowPane(c,xx,y-h+13,17,21);if(h>71)for(let xx=x+12;xx<x+w-12;xx+=29)windowPane(c,xx,y-h+46,17,21);px(c,x+w-30,y-35,20,35,'#4d4d39');px(c,x+w-28,y-33,3,31,'#6f6649');px(c,x+w-14,y-17,2,2,'#857a58');px(c,x+14,y-h-25,8,14,'#7a6244');}
  function checkpoint(c,x){
    house(c,x+40,204,110,86,'#6f634a');house(c,x+165,201,81,66,'#78694c');
    px(c,x+290,161,57,47,'#676c52');px(c,x+287,158,63,5,'#434d3d');windowPane(c,x+296,169,40,16);px(c,x+320,189,17,19,'#424f3d');
    for(let p=x-15;p<x+367;p+=40){px(c,p,155,2,54,'#6e7252');line(c,p,155,p+8,149,'#6e7252');}
    for(let yy=164;yy<207;yy+=9)line(c,x-15,yy,x+348,yy,'#7c8057');
    for(let q=0;q<42;q++)line(c,x-15+q*9,159,x+34+q*9,207,'#727753');
    px(c,x+34,126,252,19,'#4f604a');px(c,x+36,128,248,2,'#767a5a');px(c,x+48,145,4,59,'#575e42');px(c,x+270,145,4,59,'#575e42');label(c,'QUARANTINE / NO ENTRY',x+65,139,'#8f8a5f',10);
    barrier(c,x+6,214,76);barrier(c,x+176,214,92);cone(c,x+287,212);cone(c,x+311,214);barrel(c,x+355,212,true);
  }
  function factory(c,x,w=290){
    px(c,x,119,w,89,'#717359');px(c,x,117,w,5,'#444f3e');px(c,x+5,123,w-10,4,'#6d6d52');for(let q=8;q<w-20;q+=35){windowPane(c,x+q,137,25,18);px(c,x+q,162,25,36,'#586550');for(let a=3;a<35;a+=7)px(c,x+q,162+a,25,1,'#788069');}px(c,x+110,174,72,34,'#3b493c');for(let q=0;q<72;q+=9)px(c,x+110+q,175,1,31,'#5b6650');
    for(const a of [36,82]){px(c,x+a,57,17,61,'#6b6850');px(c,x+a-2,54,21,5,'#4c5341');for(let yy=65;yy<116;yy+=14)px(c,x+a,yy,17,3,'#736750');px(c,x+a+13,61,4,56,'#595f49');}
    px(c,x+w-61,104,49,14,'#6c6a53');px(c,x+w-58,101,43,4,'#7c7358');px(c,x+w-57,107,2,11,'#867a5f');
    px(c,x+w+17,138,60,64,'#6c7059');px(c,x+w+22,132,50,8,'#76755c');px(c,x+w+15,146,64,3,'#7e7d63');px(c,x+w+15,188,64,3,'#5d6b54');px(c,x+w+24,140,6,61,'#807d64');px(c,x+w+69,139,7,62,'#68765b');line(c,x+w+45,132,x+w+45,112,'#677157',2);line(c,x+w+45,112,x+w+8,112,'#677157',2);
  }
  const landmarks=[
    {x:330,w:110,draw:(c,x)=>barn(c,x,190)},
    {x:645,w:170,draw:(c,x)=>car(c,x,218,0)},
    {x:1020,w:140,draw:(c,x)=>{barn(c,x,199,127,64);barrel(c,x+136,210);}},
    {x:1640,w:425,draw:gasStation},
    {x:2150,w:160,draw:(c,x)=>car(c,x,218,1)},
    {x:2500,w:170,draw:(c,x)=>{car(c,x,216,2);cone(c,x+160,215);}},
    {x:3070,w:280,draw:(c,x)=>{house(c,x,203,117,83,'#7b6a4e');house(c,x+139,202,100,62,'#6f6446');}},
    {x:3440,w:430,draw:checkpoint},
    {x:3980,w:180,draw:(c,x)=>truck(c,x,219)},
    {x:4290,w:260,draw:(c,x)=>{house(c,x,204,116,101,'#716349');car(c,x+121,219,3);}},
    {x:4780,w:390,draw:factory},
    {x:5230,w:200,draw:(c,x)=>{truck(c,x,219);barrel(c,x+166,215,true);barrel(c,x+181,216);}},
    {x:5590,w:390,draw:factory},
    {x:6100,w:180,draw:(c,x)=>{barrier(c,x,214,91);px(c,x+111,101,5,111,'#535e47');px(c,x+92,92,50,25,'#466044');label(c,'EXIT',x+99,104,'#8f9260',9);label(c,'160 m',x+99,113,'#7f875c',6);}}
  ];
  function drawTerrain(c,offset){
    px(c,0,121,TILE,97,'#5f5a3c');
    for(let x=offset-16;x<offset+TILE+16;x+=16){const sx=x-offset,industrial=x>4700,urban=x>3050,station=x>1500;px(c,sx,132,17,57,industrial?'#555a46':urban?'#585b44':'#5c5c3a');px(c,sx,153,17,58,industrial?'#5d5d4a':urban?'#6a6750':station?'#75704f':'#54553a');if(!station)px(c,sx,176,17,35,'#4a4e2e');}
    for(let x=offset-12;x<offset+TILE+12;x+=12){if(x>1500){const sx=x-offset;px(c,sx,179,13,2,x>4700?'#6a684f':'#7a7150');px(c,sx,204,13,3,x>4700?'#4a4f3d':'#5c5d41');}}
    for(let i=0;i<410;i++){const n=Math.floor(offset/TILE)*523+i,xx=hash(n)*TILE,yy=129+hash(n+31)*78;px(c,xx,yy,2+hash(n+48)*9,1+hash(n+47)*3,['#66613c','#5b5b3a','#5a5b3c','#484e2f'][i%4]);}
    // Crop bands establish depth without converging towards an arbitrary vanishing point.
    for(let y=141;y<181;y+=10){for(let x=offset-8;x<offset+TILE+8;x+=9){if(x>1500)continue;const h=3+hash(x+y)*5;px(c,x-offset,y,10,1,y<161?'#6e6a45':'#5f5d3e');px(c,x-offset,y-h,2,h,'#616040');}}
    // Tall ochre roadside reeds soften the geometric furrows; settled lots have weeds in cracks.
    for(let wx=offset-6;wx<offset+TILE+6;wx+=4){const sx=wx-offset;if(wx<1500){const h=15+hash(wx)*29;px(c,sx,211-h,3+hash(wx+4)*3,h,['#55573a','#4d5036','#5e5f3f'][Math.abs(wx)%3]);if(hash(wx+7)>.5)px(c,sx+1,209-h,1,5,'#6e6845');}else if(hash(wx)>.78){const h=4+hash(wx+9)*8;px(c,sx,211-h,2,h,'#585840');line(c,sx,208,sx-3,211-h,'#68664a');}}
    // Broken concrete aprons replace fields as the route enters developed ground.
    for(let wx=Math.floor(offset/181)*181;wx<offset+TILE;wx+=181){if(wx<1500)continue;const sx=wx-offset;px(c,sx,199,76+hash(wx)*55,8,'#767053');px(c,sx,199,75+hash(wx)*54,1,'#8a8262');line(c,sx+32,199,sx+38,206,'#5c6048');}
    if(offset>2900){for(let wx=Math.floor(offset/237)*237;wx<offset+TILE;wx+=237){const sx=wx-offset;px(c,sx,183,41,22,'#4f5538');px(c,sx+4,177,28,23,'#585d3e');px(c,sx+11,174,17,15,'#606343');for(let a=0;a<10;a++)px(c,sx+hash(wx+a)*40,180+hash(wx+a+30)*18,4,2,'#66684a');}}
    const worldFrom=offset-200,worldTo=offset+TILE+200;
    if(offset<1500)fence(c,Math.max(0,Math.floor(worldFrom/32)*32)-offset,Math.min(1480,worldTo)-offset,211);
    for(const obj of landmarks)if(obj.x+obj.w>=offset&&obj.x-85<=offset+TILE)obj.draw(c,obj.x-offset);
    // Shared shoulder baseline anchors every roadside object to the same ground plane.
    px(c,0,211,TILE,7,'#8a7d55');
    for(let i=0;i<94;i++){const n=offset+i*29;px(c,hash(n)*TILE,211+hash(n+7)*6,2+hash(n+2)*8,1+hash(n+1)*2,i%2?'#9a8b5e':'#746a47');}
    px(c,0,218,TILE,111,'#3b3f3d');px(c,0,218,TILE,3,'#9a927a');px(c,0,221,TILE,2,'#5f665e');
    for(let i=0;i<200;i++){const n=offset*7+i;px(c,hash(n)*TILE,225+hash(n+14)*98,3+hash(n+41)*14,1+hash(n+6)*3,['#40453f','#363b38','#454a43','#3c4139'][i%4]);}
    for(let x=Math.floor(offset/107)*107;x<offset+TILE;x+=107){px(c,x-offset,273,34,3,'#d4b53c');px(c,x-offset+26,273,8,3,'#e9c84a');px(c,x-offset+hash(x)*24,275,4,1,'#4a4e46');}
    // Long repaired seams and fine branching cracks scroll as part of the road surface.
    for(let x=Math.floor(offset/263)*263;x<offset+TILE;x+=263){const y=238+hash(x)*67;line(c,x-offset,y,x-offset+31,y+5,'#343a36');line(c,x-offset+31,y+5,x-offset+50,y+2,'#343a36');line(c,x-offset+25,y+4,x-offset+35,y+16,'#343a36');}
    px(c,0,325,TILE,3,'#8f8a70');px(c,0,328,TILE,2,'#5c6150');for(let x=Math.floor(offset/39)*39;x<offset+TILE;x+=39)px(c,x-offset,325,3,3,'#6b6a58');
    // Weathered kilometer stones remain behind combatants and never clutter the roadway.
    for(let x=Math.ceil(offset/800)*800+50;x<offset+TILE;x+=800){px(c,x-offset,191,13,23,'#8a8262');px(c,x-offset+2,193,9,7,'#6b7950');label(c,String(Math.floor(x/800)+7).padStart(2,'0'),x-offset+2,209,'#525d3d',7);}
  }
  function getTile(index){if(!tiles.has(index)){const cv=document.createElement('canvas');cv.width=TILE;cv.height=HEIGHT;drawTerrain(cv.getContext('2d'),index*TILE);tiles.set(index,cv);}return tiles.get(index);}
  function sky(c,camera,time){
    px(c,0,0,WIDTH,125,'#a15e40');px(c,0,36,WIDTH,50,'#ae6d45');px(c,0,82,WIDTH,42,'#b17c48');
    const sunX=494-camera*.018;px(c,sunX,33,27,27,'#c99457');px(c,sunX-4,40,35,15,'#c99457');px(c,sunX-1,56,31,4,'#b7834f');
    const cloudSpan=WIDTH+320,cloudCount=Math.ceil(cloudSpan/237)+1;for(let n=-1;n<cloudCount-1;n++){const x=((n*237-time*1.25-camera*.065)%cloudSpan+cloudSpan)%cloudSpan-210,y=25+hash(n+5)*40;px(c,x,y,76,3,'#9d6140');px(c,x+19,y-3,49,3,'#9d6140');px(c,x+6,y+5,112,2,'#a66842');}
    for(let layer=0;layer<2;layer++){const fac=layer?.15:.08,base=layer?124:111,color=layer?'#896039':'#99683f',step=11;const points=[[0,base]];for(let sx=-step;sx<=WIDTH+step;sx+=step){const wx=sx+camera*fac;const h=19+Math.sin(wx*.012+layer)*10+Math.sin(wx*.026)*7;points.push([sx,base-h]);points.push([sx+step,base-h]);}points.push([WIDTH,base],[0,base]);shape(c,points,color);}
    for(let x=Math.floor(camera*.24/7)*7;x<camera*.24+WIDTH+7;x+=7){const h=4+hash(x)*13,sx=x-camera*.24;px(c,sx,126-h,5,h,'#896039');px(c,sx+2,122-h,1,5,'#896039');}
    // City silhouette appears gradually as the road approaches the industrial district.
    const cityOrigin=1050;for(let n=0;n<17;n++){const x=cityOrigin+n*45-camera*.24;if(x<-60||x>WIDTH+20)continue;const h=17+hash(n+97)*37;px(c,x,122-h,30+hash(n)*14,h,'#8d6a47');px(c,x+6,117-h,2,8,'#8d6a47');for(let yy=130-h;yy<118;yy+=10)for(let xx=4;xx<27;xx+=9)px(c,x+xx,yy,3,3,'#8f6f4d');}
  }
  function utilities(c,camera){
    const par=.78,spacing=355,offset=camera*par;
    c.save();c.strokeStyle='#8f6a48';c.lineWidth=1;
    for(let i=Math.floor(offset/spacing)-1;i<Math.floor((offset+WIDTH)/spacing)+2;i++){const x=i*spacing-offset,y=74+hash(i+45)*9;
      c.beginPath();c.moveTo(x,y+6);c.quadraticCurveTo(x+spacing*.51,y+34,x+spacing,80+hash(i+46)*9);c.stroke();
      c.beginPath();c.moveTo(x,y+12);c.quadraticCurveTo(x+spacing*.51,y+39,x+spacing,86+hash(i+46)*9);c.stroke();
      px(c,x, y,3,207-y,'#7a6446');px(c,x+2,y+14,1,193-y,'#8c7452');px(c,x-13,y+4,31,3,'#7a6446');for(const q of [-8,11])px(c,x+q,y,3,5,'#6b5a44');px(c,x-3,y+25,9,14,'#7a6446');px(c,x-1,y+27,5,9,'#856d4d');
    }c.restore();
  }
  function smoke(c,wx,baseY,camera,time,seed,thickness=1){
    const x=wx-camera;if(x<-65||x>WIDTH+45)return;
    for(let i=0;i<9;i++){const age=(time*.17+i/9)%1;const xx=x+age*43+Math.sin(time*.45+i)*3, yy=baseY-age*67;const size=(5+age*17)*thickness;c.globalAlpha=(1-age)*.22;px(c,xx,yy,size,size*.7,'#4d5140');px(c,xx+size*.25,yy-size*.2,size*.7,size*.4,'#4d5140');}c.globalAlpha=1;
  }
  function flag(c,x,y,camera,time,color='#ab7945'){x-=camera;if(x<-50||x>WIDTH+10)return;px(c,x,y,2,51,'#747657');const p=[];for(let a=0;a<=29;a+=3)p.push([x+2+a,y+3+Math.round(Math.sin(time*3-a*.19)*2+a*.06)]);for(let a=29;a>=0;a-=3)p.push([x+2+a,y+16+Math.round(Math.sin(time*3-a*.19+.7)*2)]);shape(c,p,color);px(c,x+3,y+6,2,8,'#b79a65');}
  function dynamic(c,camera,time){
    // Wisps are localized at damaged vehicles and stacks; no frame-to-frame randomness.
    smoke(c,758,177,camera,time,1,.65);smoke(c,2247,176,camera,time,2,.55);smoke(c,4826,55,camera,time,3,1.1);smoke(c,4872,55,camera,time+.6,4,.85);smoke(c,5636,55,camera,time+.4,5,1.1);
    flag(c,1952,149,camera,time);flag(c,3717,139,camera,time,'#8d4932');flag(c,6052,159,camera,time,'#848755');
    for(const wx of [3475,3695]){const x=wx-camera;if(x<-5||x>WIDTH+5)continue;px(c,x,119,7,5,'#5e4730');if(Math.sin(time*3.5+wx)>0.65){px(c,x+1,119,5,3,'#dfa351');c.globalAlpha=.16;px(c,x-3,116,13,10,'#dba046');c.globalAlpha=1;}}
    // Wind is shared across the roadside, with an offset along the world for traveling gusts.
    const from=Math.floor(camera/23)*23;for(let wx=from;wx<camera+WIDTH+23;wx+=23){if((wx>1560&&wx<2010)||(wx>3400&&wx<3790))continue;const h=4+hash(wx)*9,wind=Math.sin(time*1.7+wx*.031)*2,sx=wx-camera,y=215;line(c,sx,y,sx+wind,y-h,'#5e5d3e');line(c,sx,y,sx-3+wind,y-h*.65,'#767048');if(hash(wx+1)>.6)px(c,sx+wind-1,y-h-1,3,2,'#847a4c');}
    // Single drifting leaves, widely spaced; particle timing follows world time.
    for(let i=0;i<5;i++){const period=11+i*2,progress=(time/period+i*.213)%1;const wx=Math.floor(camera/900)*900+progress*1000;const x=wx-camera;if(x<-20||x>WIDTH+20)continue;const y=162+Math.sin(progress*9+i)*23+i*7;px(c,x,y,3,1,i%2?'#8a7a46':'#9c8a55');}
    // A restrained, distant flock passes above the horizon.
    const flockSpan=WIDTH+310;for(let i=0;i<4;i++){const x=((time*5+i*13+311-camera*.12)%flockSpan+flockSpan)%flockSpan-140,y=46+Math.sin(time*.3+i)*4+i*2;const flap=Math.sin(time*5+i)>.0?1:-1;line(c,x-2,y+flap,x,y,'#685b3b');line(c,x,y,x+2,y+flap,'#685b3b');}
  }
  function draw(c,camera,time){
    sky(c,camera,time);
    for(let index=Math.floor(camera/TILE);index<=Math.floor((camera+WIDTH)/TILE);index++)c.drawImage(getTile(index),Math.round(index*TILE-camera),0);
    utilities(c,camera);
    dynamic(c,camera,time);
  }
  // Full-frame colour grade: warm light from the sunset sky, cool shadow on the road, then a warm-dark vignette.
  // Both gradients are built once per context and width; the stubbed test canvas has no createLinearGradient, so the tint is skipped there.
  const grades=new WeakMap();
  function grade(c){
    let g=grades.get(c);
    if(!g||g.width!==WIDTH){
      g={tint:null,vignette:null,width:WIDTH};
      // The stubbed test context answers every method with a no-op returning undefined, so check the gradient object itself.
      const tint=typeof c.createLinearGradient==='function'?c.createLinearGradient(0,0,0,HEIGHT):null;
      if(tint&&typeof tint.addColorStop==='function'){tint.addColorStop(0,'#ffb06038');tint.addColorStop(1,'#1c283847');g.tint=tint;}
      // Vignette radii scale with the frame diagonal (150/400 at 640x330) so wide frames keep the same corner falloff.
      const outer=Math.hypot(WIDTH/2,HEIGHT/2)*1.11,inner=outer*.375;
      const vignette=typeof c.createRadialGradient==='function'?c.createRadialGradient(WIDTH/2,HEIGHT/2,inner,WIDTH/2,HEIGHT/2,outer):null;
      if(vignette&&typeof vignette.addColorStop==='function'){vignette.addColorStop(0,'#1a141000');vignette.addColorStop(.6,'#1a141000');vignette.addColorStop(1,'#1a1410a0');g.vignette=vignette;}
      grades.set(c,g);
    }
    if(g.tint){c.save();c.globalCompositeOperation='soft-light';c.fillStyle=g.tint;c.fillRect(0,0,WIDTH,HEIGHT);c.restore();}
    if(g.vignette){c.fillStyle=g.vignette;c.fillRect(0,0,WIDTH,HEIGHT);}
  }
  function foreground(c,camera,time){for(let wx=Math.floor(camera/71)*71;wx<camera+WIDTH+71;wx+=71){const x=wx-camera,h=3+hash(wx)*5,wind=Math.sin(time*1.5+wx)*1.4;line(c,x,330,x+wind,330-h,'#4e5238');line(c,x+2,330,x+5+wind,329-h*.6,'#6a6848');if(hash(wx+9)>.7)px(c,x+16,329,6,1,'#8a8262');}}
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
    const room=INTERIORS[id];px(c,0,0,WIDTH,HEIGHT,VOID);if(!room)return;
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
    for(const f of [[120,18],[470,12],[800,16]]){const x=f[0]+ox;if(x<-60||x>WIDTH+60)continue;px(c,x,330-f[1],52,f[1],'#1d1f1a');px(c,x,330-f[1],52,1,'#2c2e2a');}
  }
  function interiorGrade(c,id){grade(c);c.fillStyle='rgba(20,30,40,.18)';c.fillRect(0,0,WIDTH,HEIGHT);}
  function setWidth(w){if(Number.isFinite(w)&&w>0)WIDTH=Math.round(w);}
  return {draw,foreground,grade,sectorAt,setWidth,INTERIORS,drawInterior,drawInteriorForeground,interiorGrade};
})();

function drawWorld(c,cameraX,time){worldArt.draw(c,cameraX,time);}
function drawWorldForeground(c,cameraX,time){worldArt.foreground(c,cameraX,time);}
function drawWorldGrade(c){worldArt.grade(c);}
function setWorldWidth(w){worldArt.setWidth(w);}
function getWorldSector(worldX){return worldArt.sectorAt(worldX);}
// Interior areas: data for game.js plus the room renderers (same frame size and lane band as the road).
const INTERIORS=worldArt.INTERIORS;
function drawInterior(c,id,camera,time){worldArt.drawInterior(c,id,camera,time);}
function drawInteriorForeground(c,id,camera,time){worldArt.drawInteriorForeground(c,id,camera,time);}
function interiorGrade(c,id){worldArt.interiorGrade(c,id);}
