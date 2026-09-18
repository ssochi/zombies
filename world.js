'use strict';

// Fixed world landmarks, native-resolution pixels, and independently moving depth layers.
// The road is viewed side-on: both curbs and lane markings remain parallel.
const worldArt = (() => {
  const WIDTH = 640, HEIGHT = 330, TILE = 640, LENGTH = 6400;
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
    for(let n=-1;n<5;n++){const x=((n*237-time*1.25-camera*.065)%948+948)%948-210,y=25+hash(n+5)*40;px(c,x,y,76,3,'#9d6140');px(c,x+19,y-3,49,3,'#9d6140');px(c,x+6,y+5,112,2,'#a66842');}
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
    for(let i=0;i<4;i++){const x=((time*5+i*13+311-camera*.12)%950+950)%950-140,y=46+Math.sin(time*.3+i)*4+i*2;const flap=Math.sin(time*5+i)>.0?1:-1;line(c,x-2,y+flap,x,y,'#685b3b');line(c,x,y,x+2,y+flap,'#685b3b');}
  }
  function draw(c,camera,time){
    sky(c,camera,time);
    for(let index=Math.floor(camera/TILE);index<=Math.floor((camera+WIDTH)/TILE);index++)c.drawImage(getTile(index),Math.round(index*TILE-camera),0);
    utilities(c,camera);
    dynamic(c,camera,time);
  }
  // Full-frame colour grade: warm light from the sunset sky, cool shadow on the road, then a warm-dark vignette.
  // Both gradients are built once per context; the stubbed test canvas has no createLinearGradient, so the tint is skipped there.
  const grades=new WeakMap();
  function grade(c){
    let g=grades.get(c);
    if(!g){
      g={tint:null,vignette:null};
      // The stubbed test context answers every method with a no-op returning undefined, so check the gradient object itself.
      const tint=typeof c.createLinearGradient==='function'?c.createLinearGradient(0,0,0,HEIGHT):null;
      if(tint&&typeof tint.addColorStop==='function'){tint.addColorStop(0,'#ffb06038');tint.addColorStop(1,'#1c283847');g.tint=tint;}
      const vignette=typeof c.createRadialGradient==='function'?c.createRadialGradient(WIDTH/2,HEIGHT/2,150,WIDTH/2,HEIGHT/2,400):null;
      if(vignette&&typeof vignette.addColorStop==='function'){vignette.addColorStop(0,'#1a141000');vignette.addColorStop(.6,'#1a141000');vignette.addColorStop(1,'#1a1410a0');g.vignette=vignette;}
      grades.set(c,g);
    }
    if(g.tint){c.save();c.globalCompositeOperation='soft-light';c.fillStyle=g.tint;c.fillRect(0,0,WIDTH,HEIGHT);c.restore();}
    if(g.vignette){c.fillStyle=g.vignette;c.fillRect(0,0,WIDTH,HEIGHT);}
  }
  function foreground(c,camera,time){for(let wx=Math.floor(camera/71)*71;wx<camera+WIDTH+71;wx+=71){const x=wx-camera,h=3+hash(wx)*5,wind=Math.sin(time*1.5+wx)*1.4;line(c,x,330,x+wind,330-h,'#4e5238');line(c,x+2,330,x+5+wind,329-h*.6,'#6a6848');if(hash(wx+9)>.7)px(c,x+16,329,6,1,'#8a8262');}}
  return {draw,foreground,grade,sectorAt};
})();

function drawWorld(c,cameraX,time){worldArt.draw(c,cameraX,time);}
function drawWorldForeground(c,cameraX,time){worldArt.foreground(c,cameraX,time);}
function drawWorldGrade(c){worldArt.grade(c);}
function getWorldSector(worldX){return worldArt.sectorAt(worldX);}
