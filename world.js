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
  // Human-scale props: every landmark is authored in compact local units and drawn through a scale frame
  // (SC) anchored on its own baseline. Each rect is snapped to whole pixels after scaling (edges rounded
  // independently, so adjacent strips tile with no seams), and labels re-render at an integer font size
  // instead of scaling the context, so the art stays crisp at any factor.
  let SC=null;
  const tx=x=>SC?SC.ax+(x-SC.ax)*SC.f:x, ty=y=>SC?SC.ay+(y-SC.ay)*SC.f:y, tf=()=>SC?SC.f:1;
  function scaled(c,ax,ay,f,fn){const prev=SC;SC={f,ax,ay};try{fn();}finally{SC=prev;}}
  const px=(c,x,y,w,h,col)=>{const X=Math.round(tx(x)),Y=Math.round(ty(y));c.fillStyle=col;c.fillRect(X,Y,Math.max(1,Math.round(tx(x+w))-X),Math.max(1,Math.round(ty(y+h))-Y));};
  function shape(c,p,col){c.fillStyle=col;c.beginPath();for(let i=0;i<p.length;i++){const X=Math.round(tx(p[i][0])),Y=Math.round(ty(p[i][1]));i?c.lineTo(X,Y):c.moveTo(X,Y);}c.closePath();c.fill();}
  function line(c,x1,y1,x2,y2,col,width=1){c.strokeStyle=col;c.lineWidth=Math.max(1,Math.round(width*tf()));c.beginPath();c.moveTo(Math.round(tx(x1))+.5,Math.round(ty(y1))+.5);c.lineTo(Math.round(tx(x2))+.5,Math.round(ty(y2))+.5);c.stroke();}
  function label(c,text,x,y,color,size=7){c.fillStyle=color;c.font=`bold ${Math.max(6,Math.round(size*tf()))}px monospace`;c.textBaseline='alphabetic';c.fillText(text,Math.round(tx(x)),Math.round(ty(y)));}
  function sectorAt(x){return sectors.find(s=>x>=s.start&&x<s.end)||sectors[x<0?0:3];}
  function windowPane(c,x,y,w,h,lit=false){px(c,x-1,y-1,w+2,h+2,'#69604a');px(c,x,y,w,h,lit?'#8a7645':'#36473e');px(c,x,y,w,2,lit?'#94804e':'#536253');px(c,x+w/2,y,1,h,'#776b50');px(c,x,y+h/2,w,1,'#776b50');}
  // Farm fence: chest-high posts (76 px) with three rails, drawn at native scale.
  function fence(c,from,to,y=211){for(let x=from;x<to;x+=40){px(c,x,y-76,5,76,'#57513a');px(c,x,y-76,2,72,'#7c6f4b');px(c,x-1,y-78,7,3,'#4d4733');}for(const r of [60,38,16]){px(c,from,y-r,to-from,3,'#6f6342');px(c,from,y-r,to-from,1,'#7c6f4b');}}
  // Bricks keep a real 7 px course whatever the building's scale: the rect is mapped to world pixels first.
  function brickwork(c,x,y,w,h,base,shade){const X=Math.round(tx(x)),Y=Math.round(ty(y)),X1=Math.round(tx(x+w)),Y1=Math.round(ty(y+h));const prev=SC;SC=null;px(c,X,Y,X1-X,Y1-Y,base);for(let yy=Y+6;yy<Y1;yy+=7){px(c,X,yy,X1-X,1,shade);for(let xx=X+(Math.round((yy-Y)/7)%2)*8;xx<X1;xx+=17)px(c,xx,yy-6,1,6,shade);}SC=prev;}
  function roof(c,x,y,w,rise=Math.max(13,Math.round(w*.16))){shape(c,[[x-6,y],[x+Math.round(w*.08),y-rise],[x+w-Math.round(w*.12),y-rise],[x+w+6,y]],'#514c35');px(c,x-6,y,w+12,4,'#383d30');for(let i=8;i<w-10;i+=10)line(c,x+i,y-rise+2,x+i-Math.round(rise*.5),y-2,'#716047');}
  // open=true: the doors stand ajar with a dark gap and a sliver of lamplight from inside, plus a lamp bracket by the frame
  // (the swinging lantern itself is animated in barnLife). The door spans local x+d..x+d+44, so at 2x the first barn's
  // door covers world 376..464 with its centre at 420 — the barn portal below is anchored there.
  function barn(c,x,y,w=120,h=80,open=false){px(c,x,y-h,w,h,'#885437');for(let a=3;a<w;a+=8)px(c,x+a,y-h,2,h,'#754c32');roof(c,x,y-h,w);const d=Math.round(w/2)-22;px(c,x+d,y-46,44,46,'#403d2b');
    if(open){px(c,x+d+19,y-44,6,44,'#1a1712');px(c,x+d+21,y-44,2,44,'#b07f3c');px(c,x+d+20,y-8,4,8,'#d09a48');px(c,x+d+2,y-44,17,44,'#684932');px(c,x+d+25,y-44,17,44,'#5b432e');line(c,x+d+3,y-41,x+d+17,y-3,'#856940',2);line(c,x+d+41,y-41,x+d+27,y-3,'#856940',2);px(c,x+d-9,y-33,8,2,'#3a3228');px(c,x+d-2,y-35,2,4,'#3a3228');}
    else{px(c,x+d+2,y-44,19,44,'#684932');px(c,x+d+23,y-44,19,44,'#5b432e');line(c,x+d+3,y-41,x+d+19,y-3,'#856940',2);line(c,x+d+41,y-41,x+d+25,y-3,'#856940',2);}
    px(c,x+d+16,y-h+8,12,10,'#372f25');px(c,x+d+21,y-h+8,2,10,'#5b432e');px(c,x,y-3,w,3,'#575235');}
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
  // Drawn at 2x about (x,211): store roof lands near y 21, canopy near y 33, pumps stand shoulder-high.
  function gasStation(c,x){
    brickwork(c,x+125,116,181,95,'#7d6d50','#6f6148');px(c,x+126,114,181,6,'#4c5040');px(c,x+136,150,98,40,'#394c43');for(let q=0;q<3;q++){px(c,x+138+q*32,152,28,34,'#4c6151');px(c,x+141+q*32,155,2,16,'#657460');}
    px(c,x+246,136,34,75,'#514f39');px(c,x+248,138,30,71,'#5c5a42');windowPane(c,x+250,141,25,29);px(c,x+251,176,3,2,'#8f8358');px(c,x+254,121,50,10,'#764832');label(c,'SUPPLY 24H',x+257,129,'#8c7d5a',7);
    px(c,x+7,197,269,14,'#6c6446');px(c,x+30,137,5,74,'#767458');px(c,x+215,137,5,74,'#767458');px(c,x+32,137,1,74,'#857c5c');px(c,x+218,137,1,74,'#857c5c');px(c,x+5,125,243,14,'#884b30');px(c,x,122,253,5,'#8a7449');px(c,x+5,135,243,6,'#413f31');px(c,x+5,127,243,3,'#b56f3f');label(c,'LAST STOP',x+105,135,'#a8925f',8);
    for(const q of [53,166]){px(c,x+q,160,20,51,'#807459');px(c,x+q+2,156,16,9,'#a45231');px(c,x+q+3,168,14,10,'#35463e');px(c,x+q+5,170,8,2,'#8d9e69');px(c,x+q+3,182,13,18,'#79664a');px(c,x+q+19,172,3,20,'#282f29');px(c,x+q+24,176,2,26,'#282f29');line(c,x+q+21,196,x+q+25,202,'#282f29',2);}
    barrel(c,x+308,209,true);barrel(c,x+324,211);px(c,x-68,150,5,61,'#6f6b4a');px(c,x-83,126,42,27,'#7a4732');px(c,x-81,128,38,23,'#8c7a4f');label(c,'FUEL',x-77,139,'#5b553a',8);label(c,'2.89',x-77,149,'#744b32',8);
  }
  function house(c,x,y,w,h,col){const rise=Math.max(13,Math.round(w*.22));brickwork(c,x,y-h,w,h,col,'#786b4d');roof(c,x,y-h,w,rise);for(let xx=x+12;xx<x+w-40;xx+=29)windowPane(c,xx,y-h+11,17,21);if(h>76)for(let xx=x+12;xx<x+w-40;xx+=29)windowPane(c,xx,y-h+42,17,21);px(c,x+w-30,y-50,20,50,'#4d4d39');px(c,x+w-28,y-48,3,46,'#6f6649');px(c,x+w-14,y-25,2,2,'#857a58');px(c,x+14,y-h-rise-6,8,rise+8,'#7a6244');}
  // Drawn at 2x about (x,211): compound fence spans local x-15..x+367; sign posts sit either side of the km stone gap.
  function checkpoint(c,x){
    house(c,x+40,204,110,70,'#6f634a');house(c,x+165,201,81,60,'#78694c');
    px(c,x+290,161,57,50,'#676c52');px(c,x+287,158,63,5,'#434d3d');windowPane(c,x+296,169,40,16);px(c,x+320,189,17,22,'#424f3d');
    for(let p=x-15;p<x+367;p+=40){px(c,p,155,2,56,'#6e7252');line(c,p,155,p+8,149,'#6e7252');}
    for(let yy=164;yy<209;yy+=9)line(c,x-15,yy,x+348,yy,'#7c8057');
    for(let q=0;q<42;q++)line(c,x-15+q*9,159,x+34+q*9,209,'#727753');
    px(c,x+34,126,252,19,'#4f604a');px(c,x+36,128,248,2,'#767a5a');px(c,x+56,145,4,66,'#575e42');px(c,x+262,145,4,66,'#575e42');label(c,'QUARANTINE / NO ENTRY',x+97,140,'#8f8a5f',10);
    barrier(c,x+6,214,76);barrier(c,x+176,214,92);cone(c,x+287,212);cone(c,x+311,214);barrel(c,x+355,212,true);
  }
  // Drawn at 2x about (x,211): hall roof near y 41, stacks run off the top of the frame (smoke seeds at y≈6).
  function factory(c,x,w=200){
    for(const a of [36,82]){px(c,x+a,108,17,20,'#6b6850');px(c,x+a-2,105,21,4,'#4c5341');px(c,x+a+13,110,4,17,'#595f49');}
    px(c,x,126,w,85,'#717359');px(c,x,124,w,5,'#444f3e');px(c,x+5,130,w-10,4,'#6d6d52');for(let q=8;q<w-20;q+=35){windowPane(c,x+q,141,25,18);px(c,x+q,166,25,36,'#586550');for(let a=3;a<35;a+=7)px(c,x+q,166+a,25,1,'#788069');}px(c,x+110,161,72,50,'#3b493c');for(let q=0;q<72;q+=9)px(c,x+110+q,162,1,47,'#5b6650');
    px(c,x+w-61,110,49,16,'#6c6a53');px(c,x+w-58,107,43,4,'#7c7358');px(c,x+w-57,113,2,13,'#867a5f');
    px(c,x+w+17,140,60,71,'#6c7059');px(c,x+w+22,134,50,8,'#76755c');px(c,x+w+15,148,64,3,'#7e7d63');px(c,x+w+15,190,64,3,'#5d6b54');px(c,x+w+24,142,6,69,'#807d64');px(c,x+w+69,141,7,70,'#68765b');line(c,x+w+45,134,x+w+45,116,'#677157',2);line(c,x+w+45,116,x+w+8,116,'#677157',2);
  }
  // Landmarks: x is the anchor (left edge of the main body), w the drawn extent to its right, left the overhang
  // to its left. Buildings sit 6 px back from the shoulder (y 205); vehicles and props stand on it (y 211..214).
  // Kilometre stones fall at 800k+50 (850, 1650, 2450 ... 5650) and every gap below is kept clear of them.
  const landmarks=[
    {x:300,left:24,w:264,draw:(c,x)=>scaled(c,x,205,2,()=>barn(c,x,205,120,80,true))},
    {x:600,w:218,draw:(c,x)=>scaled(c,x,213,1.45,()=>car(c,x,213,0))},
    {x:1000,left:24,w:300,draw:(c,x)=>{scaled(c,x,205,2,()=>barn(c,x,205,120,74));scaled(c,x+270,211,2,()=>barrel(c,x+270,211));}},
    {x:1690,left:170,w:680,draw:(c,x)=>scaled(c,x,211,2,()=>gasStation(c,x))},
    {x:2480,w:218,draw:(c,x)=>scaled(c,x,213,1.45,()=>car(c,x,213,1))},
    {x:2760,w:262,draw:(c,x)=>{scaled(c,x,213,1.45,()=>car(c,x,213,2));scaled(c,x+236,211,1.5,()=>cone(c,x+236,211));}},
    {x:3070,left:24,w:180,draw:(c,x)=>scaled(c,x,205,2,()=>house(c,x,205,76,80,'#7b6a4e'))},
    {x:3500,left:30,w:734,draw:(c,x)=>scaled(c,x,211,2,()=>checkpoint(c,x))},
    {x:4300,left:24,w:470,draw:(c,x)=>{scaled(c,x,205,2,()=>house(c,x,205,100,78,'#716349'));scaled(c,x+250,213,1.45,()=>car(c,x+250,213,3));}},
    {x:4880,w:560,draw:(c,x)=>scaled(c,x,211,2,()=>factory(c,x,200))},
    {x:5460,w:170,draw:(c,x)=>{scaled(c,x,214,2,()=>barrier(c,x,214,55));scaled(c,x+118,211,2,()=>barrel(c,x+118,211,true));scaled(c,x+142,211,2,()=>barrel(c,x+142,211));}},
    {x:5720,w:365,draw:(c,x)=>{scaled(c,x,211,1.9,()=>truck(c,x,211));scaled(c,x+310,211,2,()=>barrel(c,x+310,211,true));scaled(c,x+336,211,2,()=>barrel(c,x+336,211));}},
    {x:6130,w:270,draw:(c,x)=>{scaled(c,x,214,2,()=>barrier(c,x,214,91));px(c,x+222,94,7,117,'#535e47');px(c,x+224,94,2,117,'#6b7657');px(c,x+184,58,84,38,'#466044');px(c,x+187,61,78,32,'#3f5a3f');label(c,'EXIT',x+207,78,'#8f9260',16);label(c,'160 m',x+211,91,'#7f875c',10);}}
  ];
  function drawTerrain(c,offset){
    px(c,0,121,TILE,97,'#5f5a3c');
    for(let x=offset-16;x<offset+TILE+16;x+=16){const sx=x-offset,industrial=x>4700,urban=x>3050,station=x>1500;px(c,sx,132,17,57,industrial?'#555a46':urban?'#585b44':'#5c5c3a');px(c,sx,153,17,58,industrial?'#5d5d4a':urban?'#6a6750':station?'#75704f':'#54553a');if(!station)px(c,sx,176,17,35,'#4a4e2e');}
    for(let x=offset-12;x<offset+TILE+12;x+=12){if(x>1500){const sx=x-offset;px(c,sx,179,13,2,x>4700?'#6a684f':'#7a7150');px(c,sx,204,13,3,x>4700?'#4a4f3d':'#5c5d41');}}
    for(let i=0;i<410;i++){const n=Math.floor(offset/TILE)*523+i,xx=hash(n)*TILE,yy=129+hash(n+31)*78;px(c,xx,yy,2+hash(n+48)*9,1+hash(n+47)*3,['#66613c','#5b5b3a','#5a5b3c','#484e2f'][i%4]);}
    // Crop bands establish depth without converging towards an arbitrary vanishing point.
    for(let y=141;y<181;y+=10){for(let x=offset-8;x<offset+TILE+8;x+=9){if(x>1500)continue;const h=3+hash(x+y)*5;px(c,x-offset,y,10,1,y<161?'#6e6a45':'#5f5d3e');px(c,x-offset,y-h,2,h,'#616040');}}
    // Tall ochre roadside reeds (up to 60 px) soften the geometric furrows; settled lots have weeds in cracks.
    for(let wx=offset-6;wx<offset+TILE+6;wx+=4){const sx=wx-offset;if(wx<1500){const h=22+hash(wx)*38;px(c,sx,211-h,3+hash(wx+4)*3,h,['#55573a','#4d5036','#5e5f3f'][Math.abs(wx)%3]);if(hash(wx+7)>.5)px(c,sx+1,209-h,1,6,'#6e6845');}else if(hash(wx)>.78){const h=6+hash(wx+9)*12;px(c,sx,211-h,2,h,'#585840');line(c,sx,208,sx-4,211-h,'#68664a');}}
    // Broken concrete aprons replace fields as the route enters developed ground.
    for(let wx=Math.floor(offset/181)*181;wx<offset+TILE;wx+=181){if(wx<1500)continue;const sx=wx-offset;px(c,sx,199,76+hash(wx)*55,8,'#767053');px(c,sx,199,75+hash(wx)*54,1,'#8a8262');line(c,sx+32,199,sx+38,206,'#5c6048');}
    if(offset>2900){for(let wx=Math.floor(offset/237)*237;wx<offset+TILE;wx+=237){const sx=wx-offset;px(c,sx,183,41,22,'#4f5538');px(c,sx+4,177,28,23,'#585d3e');px(c,sx+11,174,17,15,'#606343');for(let a=0;a<10;a++)px(c,sx+hash(wx+a)*40,180+hash(wx+a+30)*18,4,2,'#66684a');}}
    const worldFrom=offset-200,worldTo=offset+TILE+200;
    if(offset<1500)fence(c,Math.max(0,Math.floor(worldFrom/40)*40)-offset,Math.min(1480,worldTo)-offset,211);
    // A landmark is stamped into every tile its full drawn extent touches, so wide art never breaks at a seam.
    for(const obj of landmarks)if(obj.x+obj.w>=offset&&obj.x-(obj.left||0)<=offset+TILE)obj.draw(c,obj.x-offset);
    // Shared shoulder baseline anchors every roadside object to the same ground plane.
    px(c,0,211,TILE,7,'#8a7d55');
    for(let i=0;i<94;i++){const n=offset+i*29;px(c,hash(n)*TILE,211+hash(n+7)*6,2+hash(n+2)*8,1+hash(n+1)*2,i%2?'#9a8b5e':'#746a47');}
    px(c,0,218,TILE,111,'#3b3f3d');px(c,0,218,TILE,3,'#9a927a');px(c,0,221,TILE,2,'#5f665e');
    for(let i=0;i<200;i++){const n=offset*7+i;px(c,hash(n)*TILE,225+hash(n+14)*98,3+hash(n+41)*14,1+hash(n+6)*3,['#40453f','#363b38','#454a43','#3c4139'][i%4]);}
    for(let x=Math.floor(offset/107)*107;x<offset+TILE;x+=107){px(c,x-offset,273,34,3,'#d4b53c');px(c,x-offset+26,273,8,3,'#e9c84a');px(c,x-offset+hash(x)*24,275,4,1,'#4a4e46');}
    // Long repaired seams and fine branching cracks scroll as part of the road surface.
    for(let x=Math.floor(offset/263)*263;x<offset+TILE;x+=263){const y=238+hash(x)*67;line(c,x-offset,y,x-offset+31,y+5,'#343a36');line(c,x-offset+31,y+5,x-offset+50,y+2,'#343a36');line(c,x-offset+25,y+4,x-offset+35,y+16,'#343a36');}
    px(c,0,325,TILE,3,'#8f8a70');px(c,0,328,TILE,2,'#5c6150');for(let x=Math.floor(offset/39)*39;x<offset+TILE;x+=39)px(c,x-offset,325,3,3,'#6b6a58');
    // Weathered kilometre stones (40 px, knee height) stay behind combatants and never clutter the roadway.
    for(let x=Math.ceil(offset/800)*800+50;x<offset+TILE;x+=800){px(c,x-offset,171,22,40,'#8a8262');px(c,x-offset+2,171,18,2,'#a09876');px(c,x-offset+2,174,18,9,'#6b7950');label(c,String(Math.floor(x/800)+7).padStart(2,'0'),x-offset+4,204,'#525d3d',11);}
  }
  function getTile(index){if(!tiles.has(index)){const cv=document.createElement('canvas');cv.width=TILE;cv.height=HEIGHT;drawTerrain(cv.getContext('2d'),index*TILE);tiles.set(index,cv);}return tiles.get(index);}
  function sky(c,camera,time){
    px(c,0,0,WIDTH,125,'#a15e40');px(c,0,36,WIDTH,50,'#ae6d45');px(c,0,82,WIDTH,42,'#b17c48');
    const sunX=494-camera*.018;px(c,sunX,33,27,27,'#c99457');px(c,sunX-4,40,35,15,'#c99457');px(c,sunX-1,56,31,4,'#b7834f');
    // A higher, thinner cloud layer drifts more slowly behind the main bank.
    const hiSpan=WIDTH+360,hiCount=Math.ceil(hiSpan/311)+1;for(let n=-1;n<hiCount-1;n++){const x=((n*311-time*.55-camera*.03)%hiSpan+hiSpan)%hiSpan-180,y=6+hash(n+15)*22;px(c,x,y,58,2,'#ab6a44');px(c,x+14,y-2,31,2,'#ab6a44');px(c,x+70,y+3,40,2,'#ab6a44');}
    const cloudSpan=WIDTH+320,cloudCount=Math.ceil(cloudSpan/237)+1;for(let n=-1;n<cloudCount-1;n++){const x=((n*237-time*1.25-camera*.065)%cloudSpan+cloudSpan)%cloudSpan-210,y=25+hash(n+5)*40;px(c,x,y,76,3,'#9d6140');px(c,x+19,y-3,49,3,'#9d6140');px(c,x+6,y+5,112,2,'#a66842');}
    for(let layer=0;layer<2;layer++){const fac=layer?.15:.08,base=layer?124:111,color=layer?'#896039':'#99683f',step=11;const points=[[0,base]];for(let sx=-step;sx<=WIDTH+step;sx+=step){const wx=sx+camera*fac;const h=19+Math.sin(wx*.012+layer)*10+Math.sin(wx*.026)*7;points.push([sx,base-h]);points.push([sx+step,base-h]);}points.push([WIDTH,base],[0,base]);shape(c,points,color);}
    // Heat haze: thin rows across the far hills slip sideways by a pixel (the canvas copies its own rows; nothing is allocated).
    if(c.canvas)for(let k=0;k<5;k++){const y=95+k*3,off=Math.round(Math.sin(time*2.6+k*1.9)*1.2);if(off)c.drawImage(c.canvas,0,y,WIDTH,1,off,y,WIDTH,1);}
    for(let x=Math.floor(camera*.24/7)*7;x<camera*.24+WIDTH+7;x+=7){const h=4+hash(x)*13,sx=x-camera*.24;px(c,sx,126-h,5,h,'#896039');px(c,sx+2,122-h,1,5,'#896039');}
    // City silhouette appears gradually as the road approaches the industrial district.
    const cityOrigin=1050;for(let n=0;n<17;n++){const x=cityOrigin+n*45-camera*.24;if(x<-60||x>WIDTH+20)continue;const h=17+hash(n+97)*37;px(c,x,122-h,30+hash(n)*14,h,'#8d6a47');px(c,x+6,117-h,2,8,'#8d6a47');for(let yy=130-h;yy<118;yy+=10)for(let xx=4;xx<27;xx+=9)px(c,x+xx,yy,3,3,'#8f6f4d');}
  }
  // Utility poles top out near y 22-31, taller than any building, with wires slung between them. They stand on the
  // shoulder baseline, so they scroll 1:1 with the ground (a parallax factor made them slide against the fence).
  // Wind shared by everything that sways: a steady breeze plus a stronger gust every 15 s that lasts 2 s.
  // gustTravel is the gust's running integral, so anything that speeds up with the wind stays continuous.
  function gust(time){const g=time%15;return g<2?Math.sin(g*Math.PI/2):0;}
  function gustTravel(time){const n=Math.floor(time/15),g=time-n*15;return n*4/Math.PI+(g<2?(1-Math.cos(g*Math.PI/2))*2/Math.PI:4/Math.PI);}
  // One crow at a time leaves its wire and circles when the camera passes its pole (world.js never sees the player).
  const flyer={pole:-1,t0:-99};
  function crow(c,x,y,f){px(c,x-3,y-4,6,3,'#2a2620');px(c,x+f*2,y-6,3,3,'#2a2620');px(c,x+(f>0?5:-4),y-5,2,1,'#9a8a48');px(c,x-(f>0?6:-4),y-3,3,1,'#2a2620');}
  function utilities(c,camera,time){
    const spacing=355,offset=camera,g=gust(time);
    c.save();c.lineWidth=1;
    for(let i=Math.floor(offset/spacing)-1;i<Math.floor((offset+WIDTH)/spacing)+2;i++){const x=i*spacing-offset,y=22+hash(i+45)*9,y2=22+hash(i+46)*9,cx=x+spacing*.51,cy=y+52+Math.sin(time*1.4+i*1.3)*(1.5+g*3);
      c.strokeStyle='#8f6a48';
      c.beginPath();c.moveTo(x,y+8);c.quadraticCurveTo(cx,cy,x+spacing,y2+8);c.stroke();
      c.beginPath();c.moveTo(x,y+16);c.quadraticCurveTo(cx,cy+8,x+spacing,y2+16);c.stroke();
      px(c,x,y,5,211-y,'#7a6446');px(c,x+3,y+20,2,191-y,'#8c7452');px(c,x-21,y+6,47,4,'#7a6446');for(const q of [-13,17])px(c,x+q,y,4,7,'#6b5a44');px(c,x-5,y+38,14,22,'#7a6446');px(c,x-2,y+41,8,15,'#856d4d');
      // Pole 10 (world 3550) stands over the quarantine checkpoint: a cut strand dangles from its crossbar and sparks now and then.
      if(i===10){const ex=x+27+Math.sin(time*1.1)*4*(1+g),ey=y+44;c.strokeStyle='#6f5438';c.beginPath();c.moveTo(x+21,y+7);c.quadraticCurveTo(x+30,y+26,ex,ey);c.stroke();
        if(hash(Math.floor(time*4)+8)>.78){px(c,ex-1,ey-1,3,3,'#fff6c8');c.globalAlpha=.35;px(c,ex-6,ey-6,13,13,'#ffd070');c.globalAlpha=1;for(let k=0;k<3;k++)px(c,ex+hash(k+time*40)*10-5,ey+hash(k+9+time*40)*8,1,1,'#ffe9a0');}}
      // Crows perch on the upper wire (evaluated on the same curve). They hop occasionally; the first crow on some poles flies.
      const n=Math.floor(hash(i+200)*3);
      for(let k=0;k<n;k++){const t=.2+hash(i*5+k+300)*.6,u=1-t,wx=u*u*x+2*u*t*cx+t*t*(x+spacing),wy=u*u*(y+8)+2*u*t*cy+t*t*(y2+8),f=hash(i+k+700)>.5?1:-1;
        if(k===0&&hash(i+500)>.55){if(flyer.pole!==i&&x<WIDTH*.32&&x>WIDTH*.32-40&&time-flyer.t0>10){flyer.pole=i;flyer.t0=time;}
          const e=flyer.pole===i?time-flyer.t0:99;
          if(e<7){const a=e*1.7,r=10+Math.min(e,4)*7,air=1-Math.max(0,e-6),fx=wx+Math.cos(a)*r*air,fy=wy-(8+Math.min(e,4)*5)*air+Math.sin(a)*r*.35*air,flap=Math.sin(e*14)>0?2:-1;
            px(c,Math.round(fx)-1,Math.round(fy),3,2,'#2a2620');line(c,fx-5,fy-flap,fx,fy,'#2a2620');line(c,fx,fy,fx+5,fy-flap,'#2a2620');continue;}}
        const hop=(time*.4+hash(i+k*9+400))%1<.05?-3:0;crow(c,Math.round(wx),Math.round(wy)+hop,f);}
    }c.restore();
  }
  function smoke(c,wx,baseY,camera,time,seed,thickness=1){
    const x=wx-camera;if(x<-65||x>WIDTH+45)return;
    for(let i=0;i<9;i++){const age=(time*.17+i/9)%1;const xx=x+age*43+Math.sin(time*.45+i)*3, yy=baseY-age*67;const size=(5+age*17)*thickness;c.globalAlpha=(1-age)*.22;px(c,xx,yy,size,size*.7,'#4d5140');px(c,xx+size*.25,yy-size*.2,size*.7,size*.4,'#4d5140');}c.globalAlpha=1;
  }
  function flag(c,x,y,camera,time,color='#ab7945',h=51,g=0){x-=camera;if(x<-50||x>WIDTH+10)return;px(c,x,y,2,h,'#747657');const p=[],amp=2+g*2.5;for(let a=0;a<=29;a+=3)p.push([x+2+a,y+3+Math.round(Math.sin(time*3-a*.19)*amp+a*.06)]);for(let a=29;a>=0;a-=3)p.push([x+2+a,y+16+Math.round(Math.sin(time*3-a*.19+.7)*amp)]);shape(c,p,color);px(c,x+3,y+6,2,8,'#b79a65');}
  // ---- Living road: everything below is redrawn each frame over the cached tiles. All of it is rects and lines,
  // culled to the visible range and driven by time/camera/hash, so nothing is allocated per frame.
  const tumble={epoch:-1,x0:0},bag={epoch:-1,x0:0,y0:0};
  function chicken(c,x,y,f,peck){px(c,x-3,y-5,7,4,'#d9cba3');px(c,x-(f>0?5:-4),y-6,2,2,'#c8b890');px(c,x+f*3,y-7+peck,3,3,'#d9cba3');px(c,x+f*3+(f>0?0:1),y-8+peck,2,1,'#c0402a');px(c,x+(f>0?6:-4),y-6+peck,1,1,'#d9a040');px(c,x-1,y-1,1,2,'#c98a3a');px(c,x+2,y-1,1,2,'#c98a3a');}
  // Barns (world 300 and 1000): a windmill on a pole beside each, hay drifting from the loft, and at the first barn the
  // door lantern (bracket at world 358..374 × 139, pivot 360,143), its glow on the step, and two hens pecking by the door.
  function barnLife(c,camera,time,g){
    const spin=time*2.2+gustTravel(time)*5;
    for(const b of [{x:566,top:92,lx:408,ly:61,lamp:true},{x:1305,top:96,lx:1108,ly:73,lamp:false}]){
      let x=b.x-camera;if(x>-40&&x<WIDTH+40){px(c,x-1,b.top,3,211-b.top,'#5c5238');px(c,x-1,b.top+1,1,210-b.top,'#7a6c4a');px(c,x-4,b.top+2,9,2,'#5c5238');
        for(let k=0;k<4;k++){const a=spin+k*Math.PI/2,ex=x+Math.cos(a)*16,ey=b.top+Math.sin(a)*16;line(c,x,b.top,ex,ey,'#8c7a52',2);px(c,ex-2,ey-2,4,4,'#a08a5a');}px(c,x-1,b.top-1,3,3,'#3a3228');}
      x=b.lx-camera;if(x>-80&&x<WIDTH+30){for(let i=0;i<4;i++){const age=(time*.13+i*.25)%1;c.globalAlpha=(1-age)*.8;px(c,x+12+age*(45+g*30)+Math.sin(time*1.6+i*2)*3,b.ly+8+age*38+Math.sin(time*2.3+i)*2,3,1,'#cfa94f');}c.globalAlpha=1;}
      if(!b.lamp)continue;
      x=360-camera;if(x>-40&&x<WIDTH+40){const a=Math.sin(time*2.1)*.28*(1+g*.8),lx=x+Math.sin(a)*12,ly=143+Math.cos(a)*12,fl=.12+hash(Math.floor(time*11))*.07;
        line(c,x,143,lx,ly,'#3a3228');px(c,lx-3,ly,7,8,'#4a3d2a');px(c,lx-2,ly+1,5,6,'#f0b850');px(c,lx-1,ly+2,3,3,'#fff0b0');px(c,lx-2,ly-2,5,2,'#3a3228');
        c.globalAlpha=fl;px(c,lx-16,ly-12,39,34,'#ffb347');c.globalAlpha=fl*.6;shape(c,[[418-camera,205],[424-camera,205],[440-camera,217],[402-camera,217]],'#ffc060');c.globalAlpha=1;}
      for(let k=0;k<2;k++){const ph=time*(.3+k*.07)+k*2,wx=(k?524:482)+Math.round(Math.sin(ph)*9),f=Math.cos(ph)>0?1:-1,peck=(time*1.5+k*.5)%1<.3?2:0,sx=wx-camera;if(sx>-10&&sx<WIDTH+10)chicken(c,sx,210,f,peck);}
    }
  }
  // Gas station (world 1690, drawn at 2x): neon letters flicker, a plate creaks under the canopy edge, pump displays
  // flicker, the near hose drips onto the forecourt, and the awning fringe lifts in the breeze.
  function stationLife(c,camera,time,g){
    const x=1690-camera;if(x<-400||x>WIDTH+700)return;
    c.font='bold 16px monospace';c.textBaseline='alphabetic';const m=c.measureText('M'),adv=m&&m.width||10,tick=Math.floor(time*7);let lit=0;
    for(let k=0;k<9;k++){const ch='LAST STOP'[k];if(ch===' ')continue;const on=hash(tick+k*31)>.18&&!(k===8&&Math.sin(time*.8)>.2);if(!on)continue;lit++;c.fillStyle='#f3c96a';c.fillText(ch,Math.round(x+210+k*adv),59);}
    if(lit>4){c.globalAlpha=.06+lit*.008;px(c,x+204,43,adv*9+12,20,'#ffb85a');c.globalAlpha=1;}
    c.save();c.translate(Math.round(x+460),71);c.rotate(Math.sin(time*1.3)*.1*(1+g));c.fillStyle='#3a3228';c.fillRect(-1,0,2,8);c.fillStyle='#6d5a3a';c.fillRect(-13,8,26,14);c.fillStyle='#c9b07a';c.fillRect(-11,10,22,10);c.fillStyle='#6b3a2a';c.font='bold 7px monospace';c.fillText('OPEN',-9,18);c.restore();
    for(const q of [53,166]){const v=hash(Math.floor(time*9)+q);px(c,x+(q+5)*2,129,16,4,v>.86?'#2f3d35':v>.55?'#d6ef92':'#a6bd6c');}
    const dp=(time/2.4)%1,hx=x+156,hy=193;if(dp<.35)px(c,hx,hy,1+Math.round(dp*4),1+Math.round(dp*4),'#a9c4cc');else{const fy=hy+(dp-.35)/.65*18;if(fy<210)px(c,hx,fy,2,3,'#a9c4cc');else px(c,hx-3,209,8,1,'#a9c4cc');}
    for(let k=0;k<60;k++){const lift=Math.sin(time*4.5+k*.6)>(.4-g*.5)?-1:0;px(c,x+12+k*8,71+lift,7,3,k%2?'#a7663a':'#8a5a33');}
  }
  // Wrecks: embers rise under the two smoke columns, hazards blink on the car at 2760, and a rear door on the car at
  // 4550 (1.45x, door panel at world 4649..4704 × 139..200) swings slowly on its hinge showing the cabin behind it.
  function carLife(c,camera,time,g){
    for(const wx of [764,2621]){const x=wx-camera;if(x<-40||x>WIDTH+40)continue;for(let i=0;i<6;i++){const age=(time*.55+i/6)%1,s=age<.5?2:1;c.globalAlpha=1-age;px(c,x+Math.sin(time*2.2+i*1.9)*5+age*12,152-age*48,s,s,i%2?'#ffb040':'#e0602a');}c.globalAlpha=1;}
    let x=2760-camera;if(x>-200&&x<WIDTH+200&&(time%1.1)<.45){px(c,x+9,169,13,7,'#f5a23a');px(c,x+191,171,19,9,'#f5a23a');c.globalAlpha=.18;px(c,x-2,160,32,24,'#ffb050');px(c,x+184,162,34,26,'#ffb050');c.globalAlpha=1;}
    x=4550-camera;if(x>-300&&x<WIDTH+300){const a=.55+Math.sin(time*.6)*.45,w=Math.round(55*Math.cos(a)),X=Math.round(x+99),Y=159;px(c,X,139,55,20,'#34443d');px(c,X,Y,55,41,'#2a241c');px(c,X+8,Y+10,22,18,'#5a4a36');px(c,X+8,Y+22,30,8,'#4a3c2c');
      px(c,X,139,w,61,'#837348');px(c,X+2,141,w-4,17,'#34443d');px(c,X,Y+22,w,10,'#5b563a');px(c,X,Y+7,w,3,'#7b7252');px(c,X+w-8,Y+12,5,2,'#857b62');px(c,X+w-1,139,1,61,'#4d4530');}
  }
  // Checkpoint (world 3500, 2x): the two beacons sweep a cone and brighten as the beam faces the road, a loose warning
  // plate rattles against the chain-link every few seconds, cut strands wave on the fence top, and the banner's torn edge flaps.
  function checkpointLife(c,camera,time,g){
    for(const wx of [3611,4023]){const x=wx-camera;if(x<-90||x>WIDTH+90)continue;const a=time*2.4+wx,cx=x+5,cy=36,dx=Math.cos(a)*70,dy=Math.sin(a)*12,face=Math.max(0,Math.sin(a));
      c.globalAlpha=.06+face*.12;shape(c,[[cx,cy],[cx+dx-dy*.6,cy+dy+dx*.16],[cx+dx+dy*.6,cy+dy-dx*.16]],'#ffb347');c.globalAlpha=1;
      px(c,x,31,10,10,'#5e4730');px(c,x+2,33,6,6,face>.3?'#dfa351':'#8a5a30');if(face>.6){c.globalAlpha=.2;px(c,x-6,25,22,20,'#dba046');c.globalAlpha=1;}}
    const x=3500-camera;if(x<-760||x>WIDTH+40)return;
    const r=(time%5)<.8?Math.round(hash(Math.floor(time*24))*2-1):0;px(c,x+540+r,150,26,18,'#8b8560');px(c,x+542+r,152,22,14,'#b8b07a');shape(c,[[x+555+r,154],[x+562+r,161],[x+555+r,168],[x+548+r,161]],'#a8402a');
    for(const sx of [x+40,x+600])line(c,sx,99,sx+4+Math.sin(time*2+sx)*3*(1+g),121,'#8a8e66');
    const p=[],amp=1.5+g*3;for(let a=0;a<=52;a+=4)p.push([x+520+a,78+Math.sin(time*4-a*.22)*amp*a/52]);for(let a=52;a>=0;a-=4)p.push([x+520+a,83+Math.sin(time*4-a*.22+.6)*amp*a/52]);shape(c,p,'#4f604a');
  }
  // Factory (world 4880, 2x): welding strobes inside the second window, a wall vent fan spins, the crane hook swings on
  // its chain, and the tower pipe vents a puff of steam every few seconds.
  function factoryLife(c,camera,time,g){
    const x=4880-camera;if(x<-560||x>WIDTH+40)return;
    const burst=Math.floor(time/3.7);if(time-burst*3.7<.6&&hash(burst+21)>.3&&hash(Math.floor(time*28))>.35){px(c,x+86,71,50,36,'#dfe9ff');c.globalAlpha=.25;px(c,x+70,60,82,58,'#cfe0ff');c.globalAlpha=1;for(let k=0;k<4;k++)px(c,x+100+hash(k+time*30)*30,80+hash(k+5+time*30)*24,1,1,'#ffffff');}
    px(c,x+365,79,18,18,'#2f3a30');px(c,x+367,81,14,14,'#3d4a3e');for(let k=0;k<3;k++){const a=time*7+k*2.094;line(c,x+374,88,x+374+Math.cos(a)*6,88+Math.sin(a)*6,'#8a8a70');}px(c,x+373,87,3,3,'#a0a080');
    const ca=Math.sin(time*1.1)*.1*(1+g),hx=x+440+Math.sin(ca)*46,hy=21+Math.cos(ca)*46;line(c,x+440,21,hx,hy,'#5a5a48');line(c,x+441,21,hx+1,hy,'#3e3e30');px(c,hx-1,hy,3,4,'#6e6a58');px(c,hx-4,hy+3,4,2,'#6e6a58');
    const st=time%6;if(st<1.6){for(let i=0;i<5;i++){const age=(st-i*.12)/1.45;if(age<0||age>1)continue;c.globalAlpha=(1-age)*.5;px(c,x+432-age*22+Math.sin(time*3+i)*2,84-age*32,3+age*9,2+age*6,'#b8b6a8');}c.globalAlpha=1;}
  }
  // Road and fields: manhole steam in the evacuated blocks, fireflies over the farm field, reeds swaying in travelling
  // waves that bend together in a gust, and a tumbleweed about every 20 s rolling in from somewhere ahead of the camera.
  function roadLife(c,camera,time,g){
    for(const wx of [3320,4480]){const x=wx-camera;if(x<-40||x>WIDTH+40)continue;px(c,x-12,297,24,3,'#2e332f');px(c,x-10,296,20,1,'#4d534b');for(let i=0;i<6;i++){const age=(time*.22+i/6)%1,s=3+age*9;c.globalAlpha=(1-age)*.2;px(c,x-s/2+Math.sin(time*.8+i*2)*5+age*8,294-age*42,s,s*.6,'#b9b7a5');}c.globalAlpha=1;}
    if(camera<1500){
      for(let k=0;k<15;k++){const wx=k*100+hash(k+600)*100;if((wx>270&&wx<570)||(wx>970&&wx<1300))continue;const x=wx-camera+Math.sin(time*.6+k)*5;if(x<-4||x>WIDTH+4)continue;const b=Math.sin(time*2.2+k*1.7);if(b<.45)continue;const y=140+hash(k+601)*58+Math.sin(time*.9+k)*3;c.globalAlpha=.25;px(c,x-1,y-1,3,3,'#d8f070');c.globalAlpha=1;px(c,x,y,1,1,'#eaff8a');}
      for(let wx=Math.floor(camera/14)*14;wx<Math.min(1480,camera+WIDTH+14);wx+=14){if((wx>270&&wx<570)||(wx>970&&wx<1300))continue;const h=14+hash(wx+3)*26,sx=wx-camera,bend=Math.sin(time*2+wx*.025)*(2.5+g*6)+g*5;line(c,sx,213,sx+bend,213-h,hash(wx)>.5?'#666543':'#565838');px(c,sx+bend-1,212-h,3,2,'#807a4c');}
    }
    const P=20,epoch=Math.floor(time/P),t=time-epoch*P;if(tumble.epoch!==epoch){tumble.epoch=epoch;tumble.x0=camera-80+hash(epoch+77)*WIDTH*.6;}
    if(t<14){const x=tumble.x0+t*58+(gustTravel(time)-gustTravel(epoch*P))*55-camera;if(x>-16&&x<WIDTH+16){const y=203-Math.abs(Math.sin(t*4.2))*7,rot=t*5.5;for(let k=0;k<10;k++){const a=rot+k*.628,r=4+hash(k+epoch)*3;px(c,x+Math.cos(a)*r,y+Math.sin(a)*r,2,2,k%2?'#8f7d4c':'#6e6240');}px(c,x-2,y-2,4,4,'#7a6b44');c.globalAlpha=.25;px(c,x-6,210,12,2,'#2a2a20');c.globalAlpha=1;}}
  }
  function dynamic(c,camera,time){
    const g=gust(time);
    // Wisps are localized at damaged vehicles and stacks; no frame-to-frame randomness.
    smoke(c,764,154,camera,time,1,.65);smoke(c,2621,154,camera,time,2,.55);smoke(c,4968,6,camera,time,3,1.1);smoke(c,5060,6,camera,time+.6,4,.85);
    flag(c,2150,2,camera,time,'#ab7945',32,g);flag(c,4180,54,camera,time,'#8d4932',51,g);flag(c,6080,160,camera,time,'#848755',51,g);
    roadLife(c,camera,time,g);
    // Wind is shared across the roadside, with an offset along the world for traveling gusts.
    const from=Math.floor(camera/23)*23;for(let wx=from;wx<camera+WIDTH+23;wx+=23){if((wx>1700&&wx<2250)||(wx>3470&&wx<4240))continue;const h=5+hash(wx)*11,wind=Math.sin(time*1.7+wx*.031)*2+g*3,sx=wx-camera,y=215;line(c,sx,y,sx+wind,y-h,'#5e5d3e');line(c,sx,y,sx-3+wind,y-h*.65,'#767048');if(hash(wx+1)>.6)px(c,sx+wind-1,y-h-1,3,2,'#847a4c');}
    // Single drifting leaves, widely spaced; particle timing follows world time.
    for(let i=0;i<5;i++){const period=11+i*2,progress=(time/period+i*.213)%1;const wx=Math.floor(camera/900)*900+progress*1000;const x=wx-camera;if(x<-20||x>WIDTH+20)continue;const y=162+Math.sin(progress*9+i)*23+i*7;px(c,x,y,3,1,i%2?'#8a7a46':'#9c8a55');}
    // A restrained, distant flock passes above the horizon.
    const flockSpan=WIDTH+310;for(let i=0;i<4;i++){const x=((time*5+i*13+311-camera*.12)%flockSpan+flockSpan)%flockSpan-140,y=46+Math.sin(time*.3+i)*4+i*2;const flap=Math.sin(time*5+i)>.0?1:-1;line(c,x-2,y+flap,x,y,'#685b3b');line(c,x,y,x+2,y+flap,'#685b3b');}
    barnLife(c,camera,time,g);stationLife(c,camera,time,g);carLife(c,camera,time,g);checkpointLife(c,camera,time,g);factoryLife(c,camera,time,g);
  }
  function draw(c,camera,time){
    sky(c,camera,time);
    for(let index=Math.floor(camera/TILE);index<=Math.floor((camera+WIDTH)/TILE);index++)c.drawImage(getTile(index),Math.round(index*TILE-camera),0);
    utilities(c,camera,time);
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
  // In front of the action: kerb grass, a plastic bag tumbling across the road at knee height about every 13 s,
  // and dust blown along the road surface while a gust lasts.
  function foreground(c,camera,time){const g=gust(time);
    for(let wx=Math.floor(camera/71)*71;wx<camera+WIDTH+71;wx+=71){const x=wx-camera,h=6+hash(wx)*5,wind=Math.sin(time*1.5+wx)*1.4+g*3;line(c,x,330,x+wind,330-h,'#4e5238');line(c,x+2,330,x+5+wind,329-h*.6,'#6a6848');if(hash(wx+9)>.7)px(c,x+16,329,6,1,'#8a8262');}
    const P=13,epoch=Math.floor(time/P),t=time-epoch*P;if(bag.epoch!==epoch){bag.epoch=epoch;bag.x0=camera-40+hash(epoch+91)*WIDTH*.5;bag.y0=262+hash(epoch+92)*30;}
    if(t<9){const x=bag.x0+t*75+(gustTravel(time)-gustTravel(epoch*P))*70+Math.sin(t*2.7)*6-camera;if(x>-12&&x<WIDTH+12){const y=bag.y0+Math.sin(t*3.1)*9+Math.sin(t*7)*3,fl=Math.sin(t*11)*2;px(c,x,y,5,3,'#d8d2b8');px(c,x+3,y-2+fl,4,3,'#c9c3a8');px(c,x+1,y+2-fl,3,2,'#e2dcc2');}}
    if(g>0){const t=(time%15)/2,gi=Math.floor(time/15);c.globalAlpha=g*.35*(1-t);for(let k=0;k<7;k++){const x=hash(k+gi*3)*(WIDTH+80)-40+t*260,y=232+hash(k+gi*3+50)*84;px(c,x,y,8+k,2,'#9a8f6a');}c.globalAlpha=1;}
  }
  function setWidth(w){if(Number.isFinite(w)&&w>0)WIDTH=Math.round(w);}
  function width(){return WIDTH;}
  // Doors that lead off the road. The barn door is the first barn's big door (landmark x 300 + local door 38..82 at
  // 2x = world 376..464, centre 420, 88 px wide). The store door is the gas station's shop entrance (landmark x 1690 +
  // local door centre 263 at 2x = 2216, 68 px wide); game.js reads this to place the portal marker and the prompt.
  const portals=[{x:420,w:88,target:'barn',targetX:120,label:'进入谷仓'},{x:2216,w:68,target:'store',targetX:110,label:'进入商店'}];
  return {draw,foreground,grade,sectorAt,setWidth,width,portals};
})();

function drawWorld(c,cameraX,time){worldArt.draw(c,cameraX,time);}
function drawWorldForeground(c,cameraX,time){worldArt.foreground(c,cameraX,time);}
function drawWorldGrade(c){worldArt.grade(c);}
function setWorldWidth(w){worldArt.setWidth(w);}
function getWorldSector(worldX){return worldArt.sectorAt(worldX);}
const WORLD_PORTALS=worldArt.portals;
