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
  function windowPane(c,x,y,w,h,lit=false,variant=0){
    // Inset reveal, dark room, broken glazing and a protruding sill give every opening real depth.
    px(c,x-3,y-3,w+6,h+7,'#484c3d');px(c,x-3,y-3,w+6,2,'#9b8b65');px(c,x-2,y-1,2,h+2,'#81785b');
    px(c,x,y,w,h,lit?'#625936':'#263b35');px(c,x+2,y+2,w-3,h-3,lit?'#786541':'#31433b');
    px(c,x+2,y+h*.55,w-4,1,'#1f302c');for(let k=0;k<3;k++){const ww=Math.max(2,w*.13);px(c,x+3+k*w*.26,y+h*.55-3-k%2,ww,3+k%2,lit?'#9a8153':'#52614a');}
    const reflected=.3+hash(variant+17)*.4;shape(c,[[x+1,y+2],[x+w*reflected,y+2],[x+1,y+h*(.35+reflected*.5)]],lit?'#a68a52':'#51685a');
    px(c,x+w*.53,y,1,h,'#81785b');px(c,x,y+h*.51,w,1,'#736e51');
    if(hash(variant+23)>.4)shape(c,[[x+w-1,y+1],[x+w-1,y+h*.37],[x+w*.74,y+h*.24],[x+w*.83,y+h*.11]],'#1e312d');
    if(hash(variant+25)>.48)line(c,x+w*.81,y+2,x+w*.63,y+h*.25,'#8a9278');px(c,x-3,y+h+1,w+6,2,'#a59670');px(c,x-1,y+h+3,w+5,2,'#424b38');
  }
  // Farm fence: chest-high posts (76 px) with three rails, drawn at native scale.
  function fence(c,from,to,y=211){for(let x=from;x<to;x+=40){px(c,x,y-76,5,76,'#57513a');px(c,x,y-76,2,72,'#7c6f4b');px(c,x-1,y-78,7,3,'#4d4733');}for(const r of [60,38,16]){px(c,from,y-r,to-from,3,'#6f6342');px(c,from,y-r,to-from,1,'#7c6f4b');}}
  // Bricks keep a real 7 px course whatever the building's scale: the rect is mapped to world pixels first.
  function brickwork(c,x,y,w,h,base,shade){
    px(c,x,y,w,h,base);px(c,x+w-4,y,4,h,'#5b5943');px(c,x,y,w,2,'#a28d68');px(c,x,y+h-12,w,12,shade);
    // Plaster survives in broad irregular islands; only damaged patches expose the brick courses.
    for(let n=0;n<8;n++){const bx=5+hash(n+13)*Math.max(1,w-27),by=5+hash(n+92)*Math.max(1,h-20),bw=9+hash(n+43)*17,bh=4+hash(n+9)*10;
      shape(c,[[x+bx,y+by],[x+bx+bw*.5,y+by-2],[x+bx+bw,y+by+2],[x+bx+bw-2,y+by+bh],[x+bx+3,y+by+bh+1]],shade);
      for(let row=0;row<bh;row+=4){const len=bw-3-hash(n+row)*5;px(c,x+bx+2,y+by+row,len,1,'#5e5943');for(let col=3;col<len;col+=8)px(c,x+bx+col+(row%8?2:0),y+by+row,1,3,'#696045');}
    }
    for(let n=0;n<6;n++){const xx=x+hash(n+151)*(w-5);px(c,xx,y+2,1,4+hash(n+52)*16,'#69644c');}
    px(c,x,y+h-3,w,3,'#424b38');
  }
  function roof(c,x,y,w,rise=Math.max(13,Math.round(w*.16))){
    shape(c,[[x-6,y],[x+Math.round(w*.08),y-rise],[x+w-Math.round(w*.12),y-rise],[x+w+6,y]],'#484b37');
    for(let row=0;row<4;row++){const yy=y-rise+row*rise/4,left=x+w*.08-(row/4)*(w*.08+6),right=x+w*.88+(row/4)*(w*.12+6);line(c,left,yy,right,yy,'#726348');for(let n=0;n<Math.floor(w/14);n++){const xx=left+5+n*14+(row%2)*6;if(xx<right-4)line(c,xx,yy,xx-2,yy+rise/4,'#59523b');}}
    px(c,x-5,y,w+11,3,'#746a4d');px(c,x-6,y+3,w+12,4,'#343c2f');px(c,x-4,y+7,w+8,2,'#554d38');for(let xx=4;xx<w;xx+=17)px(c,x+xx,y+3,3,5,'#3c402e');px(c,x+w-2,y+5,3,13,'#7d7254');
  }
  // open=true: the doors stand ajar with a dark gap and a sliver of lamplight from inside, plus a lamp bracket by the frame
  // (the swinging lantern itself is animated in barnLife). The door spans local x+d..x+d+44, so at 2x the first barn's
  // door covers world 376..464 with its centre at 420 — the barn portal below is anchored there.
  function barn(c,x,y,w=120,h=80,open=false){
    // Authored in the existing 120 x 102 local envelope. Two-times scale preserves the road's human proportions.
    // Door one is always x + 38..82; the lantern bracket always ends at world (360,143).
    const eave=y-(open?65:62),seed=open?110:710,front=108,d=open?38:20;
    // Stone footing and a darker return wall make the barn a volume rather than a single flat red rectangle.
    shape(c,[[x+108,eave],[x+122,eave-6],[x+122,y-5],[x+108,y]],open?'#493f2d':'#444b36');
    for(let a=0;a<3;a++)line(c,x+111+a*4,eave-1,x+111+a*4,y-6,'#5d5237');
    px(c,x,y-7,108,7,'#616044');for(let k=0;k<9;k++){const bx=k*12;px(c,x+bx+1,y-6,10,4,k%3?'#7b7553':'#8a7e58');px(c,x+bx+2,y-6,8,1,'#a08c61');}
    px(c,x+1,eave,107,y-eave-7,open?'#7b4935':'#63644a');
    // Board-by-board fading: large paint islands, end splits, nails and just a few knots, seeded by board number.
    for(let b=0;b<14;b++){const bx=x+2+b*7.5,bw=6.5,paint=hash(seed+b),col=open?(paint>.65?'#8c573b':paint>.3?'#774833':'#965f40'):(paint>.6?'#777656':paint>.25?'#60664a':'#858061');
      px(c,bx,eave+2,bw,y-eave-11,col);px(c,bx+bw,eave+2,1,y-eave-10,'#453c2d');
      const wear=6+hash(seed+b+23)*20,wy=eave+5+hash(seed+b+33)*24;px(c,bx+1,wy,2,wear,open?'#a17b4b':'#a18f62');if(b%3===0){px(c,bx+2,wy+wear-3,3,3,'#57462e');px(c,bx+3,wy+wear-2,1,1,'#342f23');}
      for(const ny of [eave+6,y-12])px(c,bx+3,ny,1,1,'#34372a');if(b%4===1)line(c,bx+4,y-17,bx+2,y-7,'#403b2b');
    }
    if(open){
      // Gambrel gable and the receding right roof plane. The topmost pixel is y=1 at the original 2x scale.
      shape(c,[[x,eave],[x+18,y-85],[x+54,y-97],[x+90,y-85],[x+108,eave]],'#754831');
      for(let b=0;b<12;b++){const xx=5+b*8,top=y-96+Math.abs(xx-54)*.4;line(c,x+xx,Math.max(top,eave-29),x+xx,eave,'#9a6742');}
      shape(c,[[x+54,y-101],[x+70,y-102],[x+106,y-90],[x+127,y-70],[x+110,eave+2],[x+91,y-86]],'#48503b');
      for(let k=0;k<5;k++){const t=k/5;line(c,x+57+t*17,y-99+t*4,x+112+t*12,eave-t*5,'#6b7251');}line(c,x+76,y-91,x+111,y-79,'#344331',2);
      line(c,x-5,eave+1,x+17,y-88,'#ab8b58',3);line(c,x+17,y-88,x+54,y-100,'#ba9a64',3);line(c,x+54,y-100,x+92,y-87,'#b39460',3);line(c,x+92,y-87,x+113,eave+1,'#a17f4f',3);
      line(c,x-3,eave+4,x+18,y-84,'#343729',2);line(c,x+18,y-84,x+54,y-96,'#443c2a',2);
      px(c,x-2,eave,112,4,'#a17949');px(c,x,eave+4,109,3,'#40392b');px(c,x+51,y-93,4,24,'#9b7344');
      // Deep loft hatch with straw in its shadow and a split pair of louvered doors.
      px(c,x+44,y-79,23,23,'#473d29');px(c,x+46,y-77,19,18,'#252e22');px(c,x+46,y-76,4,16,'#6a5838');px(c,x+61,y-76,4,16,'#695639');
      for(let yy=y-74;yy<y-61;yy+=4){px(c,x+46,yy,4,1,'#a48652');px(c,x+61,yy,4,1,'#9f814f');}
      px(c,x+46,y-61,19,3,'#8c7b3b');for(let k=0;k<7;k++)line(c,x+47+k*2,y-61,x+48+k*2,y-58,'#b3974d');px(c,x+42,y-57,28,3,'#ad8a50');px(c,x+43,y-54,26,2,'#453a27');
    }else{
      // The second barn is a lower, repaired granary: broad sloping tin roof, shuttered loft, offset loading door.
      shape(c,[[x-5,eave],[x+36,y-91],[x+117,y-83],[x+127,eave-4]],'#525c47');
      shape(c,[[x+2,eave],[x+37,y-86],[x+109,eave]],'#656348');
      for(let k=0;k<9;k++){const xx=x+38+k*9;line(c,xx,y-89+k*.8,xx+14,eave-2,'#849075');line(c,xx+2,y-87+k*.8,xx+15,eave-2,'#3f4e3c');}
      shape(c,[[x+64,y-83],[x+84,y-81],[x+97,eave-8],[x+76,eave-6]],'#796d4b');line(c,x+66,y-81,x+79,eave-8,'#a59160');
      line(c,x-5,eave+1,x+36,y-91,'#aea076',3);line(c,x+36,y-91,x+119,y-83,'#a69b71',3);px(c,x-4,eave+1,119,4,'#8f8760');px(c,x-3,eave+5,114,3,'#343e2f');
      px(c,x+75,eave+11,25,20,'#303b2c');for(let b=0;b<4;b++)px(c,x+76+b*6,eave+12,5,17,b%2?'#706c4c':'#827857');line(c,x+76,eave+14,x+98,eave+27,'#a49263',2);px(c,x+73,eave+31,30,2,'#ad9970');
    }
    // Corner posts, mortised crossbeam and diagonal braces sit proud of the boards.
    for(const bx of [1,103]){px(c,x+bx,eave+6,5,y-eave-12,'#513d2b');px(c,x+bx,eave+6,2,y-eave-12,'#b08a50');}
    px(c,x+5,eave+8,98,4,'#a07846');px(c,x+5,eave+12,98,2,'#473c29');
    line(c,x+6,eave+14,x+22,eave+26,'#99774a',3);line(c,x+102,eave+14,x+90,eave+25,'#8a6940',3);
    // The door keeps its exact portal rectangle, with a recessed lintel, steel track and rolling hangers.
    px(c,x+d-3,y-49,50,48,'#342f22');px(c,x+d,y-46,44,46,'#241f17');px(c,x+d-2,y-48,48,2,'#a48a58');
    const gap=open?6:2,leftWidth=open?17:20,rightX=open?25:23;
    for(const [dx,dw,tone] of [[2,leftWidth,'#735333'],[rightX,open?17:19,'#66482e']]){px(c,x+d+dx,y-44,dw,43,tone);for(let k=3;k<dw;k+=4)px(c,x+d+dx+k,y-43,1,41,'#3c3425');px(c,x+d+dx,y-43,dw,2,'#ab8750');px(c,x+d+dx,y-4,dw,2,'#96713f');line(c,x+d+dx+1,y-41,x+d+dx+dw-2,y-7,'#b38b4f',2);}
    if(open){px(c,x+d+20,y-44,gap-2,44,'#1a1712');px(c,x+d+21,y-44,2,44,'#976d35');px(c,x+d+20,y-9,4,9,'#c8964b');}
    px(c,x+d-8,y-53,60,2,'#2e3428');px(c,x+d-8,y-54,60,1,'#94906a');for(const dx of [4,34]){px(c,x+d+dx,y-53,3,8,'#30342a');px(c,x+d+dx-1,y-55,5,3,'#444a37');px(c,x+d+dx,y-55,2,1,'#b0a173');}
    for(const dx of [16,26]){px(c,x+d+dx,y-23,2,6,'#322f23');px(c,x+d+dx,y-23,1,4,'#b7a371');}
    px(c,x+d-4,y-1,52,3,'#95835d');px(c,x+d-3,y+2,50,1,'#4b4b35');
    if(open){px(c,x+29,y-33,8,2,'#3a3228');px(c,x+30,y-33,1,3,'#3a3228');px(c,x+8,eave+20,19,10,'#394732');label(c,'07',x+12,eave+28,'#c6b172',7);}
    // Each forecourt tells a different story, without placing tall props in the walkable road.
    if(open){
      for(const [bx,by,bw,bh] of [[6,y-13,22,10],[8,y-22,18,9]]){px(c,x+bx,by,bw,bh,'#9a8041');px(c,x+bx+1,by+1,bw-2,2,'#b59a51');for(let k=3;k<bw;k+=4)px(c,x+bx+k,by+3,1,bh-3,'#716335');px(c,x+bx+5,by,1,bh,'#484b2b');px(c,x+bx+bw-5,by,1,bh,'#484b2b');}
      line(c,x+94,y-5,x+89,y-32,'#a58b51',2);line(c,x+87,y-33,x+94,y-34,'#626e54',2);for(let k=0;k<4;k++)line(c,x+87+k*2,y-34,x+86+k*2,y-39,'#8a9170');
      px(c,x+94,y-12,23,8,'#6e7860');px(c,x+93,y-14,25,3,'#abb08a');px(c,x+95,y-11,20,2,'#394f40');px(c,x+96,y-4,2,4,'#424d3a');px(c,x+113,y-4,2,4,'#424d3a');
    }else{
      px(c,x+80,y-16,17,12,'#87734a');px(c,x+79,y-18,19,3,'#a18c59');px(c,x+85,y-15,2,11,'#534f32');px(c,x+91,y-15,2,11,'#534f32');
      line(c,x+111,y-5,x+105,y-43,'#a18b58',2);line(c,x+116,y-5,x+110,y-43,'#8d7e50',2);for(let r=8;r<40;r+=7)line(c,x+110-r*.14,y-r,x+115-r*.14,y-r,'#ba9c60',2);
      px(c,x+7,y-15,10,12,'#a5956a');px(c,x+8,y-16,8,2,'#beb083');px(c,x+10,y-9,5,2,'#655f3b');
    }
  }
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
    for(let i=0;i<8;i++){const q=hash(variant*23+i);px(c,x+16+q*109,y-27+hash(variant*23+i+9)*13,3+q*7,2,'#70523b');}line(c,x+86,y-49,x+79,y-40,'#85927a');line(c,x+79,y-40,x+86,y-37,'#85927a');
  }
  function truck(c,x,y){px(c,x,y-57,110,47,'#656b50');px(c,x+3,y-55,104,3,'#777558');for(let a=5;a<110;a+=12)px(c,x+a,y-51,2,39,'#777b5b');px(c,x+111,y-42,37,32,'#756d48');shape(c,[[x+116,y-41],[x+137,y-41],[x+149,y-24],[x+116,y-24]],'#8b825a');shape(c,[[x+119,y-38],[x+134,y-38],[x+142,y-27],[x+119,y-27]],'#33423b');px(c,x+5,y-13,149,6,'#383f32');px(c,x+142,y-21,9,4,'#8a7f58');for(const wx of [24,93,132]){px(c,x+wx-8,y-14,17,16,'#292f28');px(c,x+wx-4,y-10,9,8,'#7a7760');}px(c,x+121,y-23,6,2,'#8a8262');}
  function barrel(c,x,y,red=false){px(c,x,y-21,13,21,red?'#81442d':'#59604a');px(c,x+1,y-23,11,3,'#6e6646');px(c,x,y-17,13,2,'#333e32');px(c,x,y-5,13,2,'#333e32');px(c,x+2,y-14,2,8,red?'#a66036':'#7a7955');}
  function cone(c,x,y){shape(c,[[x,y],[x+5,y-15],[x+8,y-15],[x+12,y]],'#b36c2d');px(c,x+3,y-9,7,3,'#8a8360');px(c,x-2,y,16,3,'#3a4032');}
  function barrier(c,x,y,w=70){px(c,x+6,y-25,4,25,'#4e5745');px(c,x+w-12,y-25,4,25,'#4e5745');px(c,x,y-30,w,18,'#867b52');for(let q=0;q<w;q+=20)shape(c,[[x+q,y-30],[x+q+9,y-30],[x+q+19,y-12],[Math.min(x+w,x+q+10),y-12]],'#4c513b');px(c,x,y-31,w,2,'#8f8760');}
  // Miller home, native human scale. The street door is 130 px high; floor spacing is 146 px.
  // Upper storey intentionally extends above the normal frame rather than shrinking a family's home into a prop.
  function millerHome(c,x){
    const front=x+26,right=x+370,base=205,eave=-78;
    // A small cared-for plot, brick foundation and the shaded return wall.
    px(c,x+12,199,413,11,'#77755c');px(c,x+16,199,400,2,'#a49976');
    shape(c,[[right,eave],[x+397,eave+13],[x+397,200],[right,205]],'#4c6158');
    for(let yy=eave+14;yy<199;yy+=10)line(c,right,yy,x+397,yy+3,'#3d5149');
    px(c,front,eave,344,267,'#768477');
    // Long horizontal clapboards carry faded paint, staggered joints and sparse nail heads.
    for(let yy=eave;yy<189;yy+=10){const n=Math.floor((yy-eave)/10),col=['#798779','#7f8c7b','#748173','#839080'][n%4];px(c,front+4,yy,336,8,col);px(c,front+4,yy+8,336,2,'#586b5d');px(c,front+5,yy+1,334,1,'#939b83');
      const joint=50+(n%3)*81;px(c,front+joint,yy+1,1,7,'#586b5d');for(const q of [10,joint-4,326])px(c,front+q,yy+3,1,1,'#536057');
      if(n%5===1){px(c,front+185,yy+2,38,4,'#929b84');px(c,front+209,yy+6,19,1,'#a2a68b');}}
    px(c,front,188,344,17,'#766453');for(let row=0;row<3;row++){const yy=190+row*5;px(c,front,yy,344,1,'#514e42');for(let q=row%2?9:0;q<344;q+=19)px(c,front+q,yy,1,5,'#514e42');}
    for(const q of [26,362]){px(c,x+q,eave,8,268,'#c0bea1');px(c,x+q+6,eave,2,268,'#69786a');}
    // Belt course distinguishes the floor slab and lets the facade's actual storeys remain readable.
    px(c,front,54,344,6,'#b2b59b');px(c,front,60,344,4,'#506155');
    // Red-brown shingle roof, boxed soffit, chimney and a working rainwater path.
    shape(c,[[x+15,-82],[x+88,-123],[x+314,-123],[x+387,-82]],'#654b3b');
    for(let row=0;row<6;row++){const t=row/6,yy=-121+t*40,left=x+88-t*70,width=226+t*140;line(c,left,yy,left+width,yy,'#926c4b');for(let q=12;q<width;q+=22)line(c,left+q+(row%2)*7,yy,left+q+(row%2)*7-2,yy+6,'#4e4236');}
    shape(c,[[x+314,-123],[x+343,-113],[x+407,-73],[x+387,-82]],'#443f35');px(c,x+14,-83,375,6,'#b9ad8b');px(c,x+22,-77,358,6,'#414f44');
    px(c,x+73,-139,25,46,'#805d48');for(let yy=-136;yy<-100;yy+=7){px(c,x+74,yy,23,1,'#513f33');px(c,x+79+(yy%2?0:9),yy,1,7,'#513f33');}px(c,x+70,-142,31,5,'#a18c6b');
    px(c,x+379,-75,5,263,'#66776a');px(c,x+379,-75,2,262,'#adb399');line(c,x+381,188,x+389,199,'#6a796b',4);
    // Upper windows belong to the main bedroom / landing and Lucy's room above the porch.
    for(const wx of [x+63,x+252]){px(c,wx-5,-48,85,94,'#b7b99f');px(c,wx-2,-45,79,85,'#394f48');px(c,wx,-43,75,81,'#233b38');px(c,wx+3,-40,69,75,'#3c5550');shape(c,[[wx+3,-40],[wx+25,-40],[wx+3,1]],'#63776a');px(c,wx+35,-43,4,79,'#aaaF98');px(c,wx,-4,75,4,'#a2aa93');px(c,wx-7,40,90,5,'#c0bea0');px(c,wx-5,45,86,3,'#526254');}
    // Children's window is raised: open lower sash, desk/low shelf silhouette, latch and fresh sill scrapes.
    px(c,x+254,0,71,37,'#243a36');px(c,x+255,3,3,29,'#596c5d');px(c,x+304,18,19,3,'#877852');px(c,x+307,21,2,15,'#665941');px(c,x+261,30,18,6,'#595f46');px(c,x+302,42,14,2,'#d0bea0');px(c,x+309,45,8,1,'#d1c3a4');px(c,x+287,-1,5,3,'#c9b679');
    // Ground floor front door: clear human-sized opening and recently repaired trim.
    px(c,x+78,69,84,137,'#aab09a');px(c,x+82,73,76,131,'#303e35');px(c,x+84,75,72,130,'#586958');px(c,x+87,78,66,122,'#657560');px(c,x+89,79,3,121,'#929779');
    for(const yy of [84,147]){px(c,x+97,yy,47,45,'#415645');px(c,x+100,yy+3,41,38,yy===84?'#354e46':'#6f7960');px(c,x+101,yy+4,39,2,'#8f9476');}
    shape(c,[[x+100,87],[x+118,87],[x+100,119]],'#677b66');px(c,x+147,139,3,12,'#b19f67');px(c,x+142,143,8,3,'#c6b778');
    px(c,x+79,76,3,54,'#d0c3a0');px(c,x+79,139,3,38,'#aeb393');px(c,x+155,75,3,129,'#293e34');
    // Broken low brace shows preparation, without depicting the whole family as casualties.
    shape(c,[[x+86,176],[x+117,179],[x+111,184],[x+85,181]],'#a18a60');shape(c,[[x+124,181],[x+151,184],[x+151,189],[x+127,186]],'#ad9566');px(c,x+91,179,2,2,'#514c38');px(c,x+145,186,2,2,'#514c38');
    px(c,x+169,101,29,20,'#3f574c');px(c,x+171,103,25,16,'#c0b993');label(c,'17',x+175,115,'#374c40',12);
    // Living room window; curtains stay closed and the television inside remains dark.
    px(c,x+218,89,106,94,'#b4b69b');px(c,x+223,94,96,83,'#304740');px(c,x+226,97,90,76,'#233a35');px(c,x+226,98,28,74,'#858875');px(c,x+292,98,24,74,'#8c8e77');for(const q of [230,240,249,297,307])px(c,x+q,99,2,71,'#70796a');px(c,x+269,94,4,81,'#a0ac91');px(c,x+221,131,101,3,'#94a18a');px(c,x+215,180,112,5,'#c0b997');px(c,x+218,185,107,3,'#495e4e');
    // Deep porch: usable flat roof under the escape window, shadow band, posts, maintained left railing.
    shape(c,[[x+59,50],[x+346,50],[x+375,61],[x+46,61]],'#767459');px(c,x+47,60,329,5,'#b5aa82');px(c,x+50,65,323,5,'#475b4c');px(c,x+57,70,310,5,'#4d6151');
    for(const q of [56,356]){px(c,x+q,68,8,136,'#b2b89c');px(c,x+q+5,69,3,135,'#6f806b');px(c,x+q-3,190,14,14,'#c0b99a');px(c,x+q-2,70,12,5,'#cdc5a4');}
    line(c,x+64,75,x+80,91,'#9da78c',5);line(c,x+355,75,x+339,91,'#9da78c',5);
    px(c,x+48,201,327,5,'#aaa185');px(c,x+73,206,104,4,'#7f7b61');px(c,x+69,210,112,3,'#b7aa83');
    // Bench, boots and the family's empty everyday-shoe spaces are all on the porch deck.
    px(c,x+208,177,93,6,'#9c8760');px(c,x+212,181,5,21,'#686744');px(c,x+291,181,5,21,'#686744');px(c,x+212,159,84,5,'#988360');px(c,x+212,167,84,5,'#9e8b63');px(c,x+216,157,3,23,'#6f704e');px(c,x+290,157,3,23,'#6f704e');
    for(const q of [185,195]){px(c,x+q,190,6,11,'#aa984e');px(c,x+q-2,198,8,4,'#b3a258');px(c,x+q,190,6,2,'#676942');}px(c,x+173,203,34,1,'#514f3c');
    for(const q of [65,80]){px(c,x+q,158,3,42,'#859479');px(c,x+q,157,3,1,'#b3b69a');}px(c,x+63,155,22,4,'#b0b497');px(c,x+63,180,20,3,'#899878');
    // Fused battery cable follows real framing to a single porch lamp; no powered windows.
    line(c,x+175,129,x+175,82,'#333e30');line(c,x+175,82,x+182,82,'#333e30');px(c,x+173,122,4,7,'#828775');px(c,x+175,198,24,5,'#414a39');px(c,x+181,195,12,3,'#596248');
    px(c,x+177,77,18,4,'#586454');px(c,x+182,81,9,10,'#3a4738');px(c,x+184,84,5,5,'#d7b175');px(c,x+180,91,13,3,'#4b5a46');
    // Mailbox and the child's recently repaired bicycle rest beside the entrance, never in the combat lane.
    px(c,x+10,171,4,35,'#7b7d5d');px(c,x-1,151,29,19,'#65756a');px(c,x+1,149,24,4,'#8b9982');px(c,x+3,154,18,10,'#495e51');px(c,x+20,154,6,2,'#a8aa88');px(c,x+6,158,12,2,'#a8b09a');
    const bike=x+311;for(const bx of [bike,bike+40]){ellipseRows(c,bx,191,13,13,'#2e3932');ellipseRows(c,bx,191,10,10,'#828874');ellipseRows(c,bx,191,8,8,'#526753');for(const [dx,dy] of [[9,0],[-9,0],[0,9],[0,-9]])line(c,bx,191,bx+dx,191+dy,'#aaa68a');}
    line(c,bike,191,bike+15,175,'#b99452',3);line(c,bike+15,175,bike+26,192,'#b99452',3);line(c,bike+26,192,bike,191,'#b99452',2);line(c,bike+15,175,bike+33,175,'#b99452',2);line(c,bike+33,175,bike+40,191,'#b99452',3);line(c,bike+26,192,bike+33,175,'#b99452',2);line(c,bike+33,175,bike+32,165,'#a6af96',2);line(c,bike+32,165,bike+39,165,'#a6af96',2);line(c,bike+32,166,bike+42,185,'#c2c4a8');px(c,bike+9,170,13,4,'#3a4739');px(c,bike+22,192,10,2,'#b4ac8f');
    // Ladder runs from the porch's east edge to clear ground at world x=4710.
    for(const q of [0,18]){line(c,x+358+q,50,x+409+q,207,'#4e594a',5);line(c,x+357+q,49,x+408+q,207,'#a2a88e',2);}
    for(let n=0;n<13;n++){const t=(n+1)/14;line(c,x+358+51*t,50+157*t,x+376+51*t,50+157*t,'#87947e',3);line(c,x+358+51*t,49+157*t,x+376+51*t,49+157*t,'#c0b997');}
    px(c,x+401,207,32,3,'#4c5340');
    // A watering can and a clipped flower bed suggest care rather than years of abandonment.
    px(c,x+37,189,14,14,'#668071');px(c,x+40,185,8,5,'#668071');px(c,x+42,187,4,4,'#536854');line(c,x+38,193,x+31,188,'#8b9b7e',3);
    for(let q=0;q<6;q++){const bx=x+222+q*20;px(c,bx,197,17,6,'#6b5e42');line(c,bx+8,197,bx+7,187-q%3,'#637846',2);px(c,bx+5,188-q%3,7,3,q%2?'#a88e57':'#9b7250');}
  }

  // Drawn at 2x about (x,211): store roof lands near y 21, canopy near y 33, pumps stand shoulder-high.
  function gasStation(c,x){
    brickwork(c,x+125,116,181,95,'#7d6d50','#6f6148');px(c,x+126,114,181,6,'#4c5040');px(c,x+136,150,98,40,'#394c43');for(let q=0;q<3;q++){px(c,x+138+q*32,152,28,34,'#4c6151');px(c,x+141+q*32,155,2,16,'#657460');}
    px(c,x+246,136,34,75,'#514f39');px(c,x+248,138,30,71,'#5c5a42');windowPane(c,x+250,141,25,29);px(c,x+251,176,3,2,'#8f8358');px(c,x+254,121,50,10,'#764832');label(c,'SUPPLY 24H',x+257,129,'#8c7d5a',7);
    px(c,x+7,197,269,14,'#6c6446');px(c,x+30,137,5,74,'#767458');px(c,x+215,137,5,74,'#767458');px(c,x+32,137,1,74,'#857c5c');px(c,x+218,137,1,74,'#857c5c');px(c,x+5,125,243,14,'#884b30');px(c,x,122,253,5,'#8a7449');px(c,x+5,135,243,6,'#413f31');px(c,x+5,127,243,3,'#b56f3f');label(c,'LAST STOP',x+105,135,'#a8925f',8);
    for(const q of [53,166]){px(c,x+q,160,20,51,'#807459');px(c,x+q+2,156,16,9,'#a45231');px(c,x+q+3,168,14,10,'#35463e');px(c,x+q+5,170,8,2,'#8d9e69');px(c,x+q+3,182,13,18,'#79664a');px(c,x+q+19,172,3,20,'#282f29');px(c,x+q+24,176,2,26,'#282f29');line(c,x+q+21,196,x+q+25,202,'#282f29',2);}
    barrel(c,x+308,209,true);barrel(c,x+324,211);px(c,x-68,150,5,61,'#6f6b4a');px(c,x-83,126,42,27,'#7a4732');px(c,x-81,128,38,23,'#8c7a4f');label(c,'FUEL',x-77,139,'#5b553a',8);label(c,'2.89',x-77,149,'#744b32',8);

    // Shelf silhouettes and product colours remain behind the existing three glass mullions.
    for(let q=0;q<3;q++){const gx=x+138+q*32;px(c,gx+2,161,25,2,'#293b31');px(c,gx+2,175,25,2,'#25372e');for(let k=0;k<5;k++){px(c,gx+4+k*4,156+(k%2),2,5-k%2,['#9b7750','#847f4b','#826044'][k%3]);px(c,gx+3+k*5,171,3,4,['#64724a','#977951','#79614a'][k%3]);}shape(c,[[gx+1,153],[gx+10+q*4,153],[gx+1,171+q*3]],'#607264');px(c,gx,187,28,3,'#ac9770');px(c,gx,190,28,3,'#343f31');}
    px(c,x+123,132,3,78,'#5e6150');px(c,x+125,132,1,78,'#8b8567');line(c,x+123,132,x+135,132,'#7d7b60',2);
    px(c,x+284,151,19,15,'#a09978');px(c,x+285,153,17,10,'#6e7762');for(let k=0;k<5;k++)px(c,x+287+k*3,154,1,8,'#394b40');line(c,x+287,166,x+287,186,'#77765a',2);line(c,x+287,186,x+298,186,'#77765a',2);
    px(c,x+242,134,40,3,'#aba07b');px(c,x+243,137,3,73,'#a39570');px(c,x+278,137,3,74,'#303e31');px(c,x+246,207,36,4,'#a79971');px(c,x+251,178,16,9,'#8f855c');label(c,'OPEN',x+253,184,'#d3bb78',5);
    px(c,x+283,183,17,27,'#634f36');px(c,x+285,185,13,13,'#3d4b3a');px(c,x+286,188,10,1,'#927d4d');px(c,x+286,193,10,1,'#927d4d');px(c,x+287,201,8,2,'#a68c5b');
    for(const q of [53,166]){px(c,x+q+1,199,18,3,'#393f31');px(c,x+q+4,186,11,8,'#9c8051');label(c,q===53?'01':'02',x+q+5,192,'#d1b578',5);px(c,x+q+19,172,4,7,'#4c5442');px(c,x+q+20,174,2,4,'#aaa07a');}
    px(c,x+6,130,67,2,'#a7653e');px(c,x+174,132,40,1,'#684631');px(c,x+7,127,15,2,'#4f4431');
    px(c,x+130,121,45,10,'#686a48');label(c,'ICE / WATER',x+133,128,'#b6ad7d',6);

  }
  function house(c,x,y,w,h,col){const rise=Math.max(13,Math.round(w*.22));brickwork(c,x,y-h,w,h,col,'#786b4d');roof(c,x,y-h,w,rise);for(let xx=x+12;xx<x+w-40;xx+=29)windowPane(c,xx,y-h+11,17,21,false,xx-x);if(h>76)for(let xx=x+12;xx<x+w-40;xx+=29)windowPane(c,xx,y-h+42,17,21,false,xx-x+12);px(c,x+w-30,y-50,20,50,'#4d4d39');px(c,x+w-28,y-48,3,46,'#6f6649');px(c,x+w-14,y-25,2,2,'#857a58');px(c,x+14,y-h-rise-6,8,rise+8,'#7a6244');
    px(c,x+2,y-h+7,3,h-8,'#a08c68');px(c,x+w-6,y-h+8,3,h-8,'#4c5340');px(c,x,y-7,w,6,'#5d6047');px(c,x,y-8,w,2,'#8d805f');
    const dx=x+w-30;px(c,dx-2,y-52,24,3,'#a59772');px(c,dx-2,y-49,2,48,'#8d805f');px(c,dx+20,y-49,2,49,'#303d30');px(c,dx+4,y-44,12,15,'#344b40');px(c,dx+5,y-43,3,10,'#657460');px(c,dx+4,y-22,12,15,'#625b40');px(c,dx-4,y-1,29,3,'#a69972');
    px(c,x+w-11,y-h-2,2,h-8,'#535b45');px(c,x+w-12,y-9,6,3,'#77745a');
    if(w>85){px(c,x+12,y-22,28,15,'#706b4e');px(c,x+14,y-20,23,10,'#4b5a45');for(let k=0;k<6;k++)px(c,x+16+k*3,y-19,1,8,'#8b8567');px(c,x+13,y-6,2,3,'#3c4937');line(c,x+38,y-14,x+45,y-14,'#726f52',2);line(c,x+45,y-14,x+45,y-32,'#726f52',2);}
    px(c,dx-10,y-36,7,10,'#3d4834');px(c,dx-9,y-35,5,2,'#9b8b62');px(c,dx-10,y-50,7,5,'#8d8259');label(c,'07',dx-9,y-46,'#c4af78',4);
    line(c,x+5,y-h+33,x+11,y-h+41,'#585643');line(c,x+11,y-h+41,x+8,y-h+51,'#585643');

  }
  // Drawn at 2x about (x,211): compound fence spans local x-15..x+367; sign posts sit either side of the km stone gap.
  function checkpoint(c,x){
    house(c,x+40,204,110,70,'#6f634a');house(c,x+165,201,81,60,'#78694c');
    px(c,x+290,161,57,50,'#676c52');px(c,x+287,158,63,5,'#434d3d');windowPane(c,x+296,169,40,16);px(c,x+320,189,17,22,'#424f3d');
    for(let p=x-15;p<x+367;p+=40){px(c,p,155,2,56,'#6e7252');line(c,p,155,p+8,149,'#6e7252');}
    for(let yy=164;yy<209;yy+=9)line(c,x-15,yy,x+348,yy,'#7c8057');
    for(let q=0;q<42;q++)line(c,x-15+q*9,159,x+34+q*9,209,'#727753');
    px(c,x+34,126,252,19,'#4f604a');px(c,x+36,128,248,2,'#767a5a');px(c,x+56,145,4,66,'#575e42');px(c,x+262,145,4,66,'#575e42');label(c,'QUARANTINE / NO ENTRY',x+97,140,'#8f8a5f',10);
    barrier(c,x+6,214,76);barrier(c,x+176,214,92);cone(c,x+287,212);cone(c,x+311,214);barrel(c,x+355,212,true);

    px(c,x+290,184,57,3,'#9c9371');px(c,x+290,187,4,24,'#3a4938');px(c,x+342,164,3,47,'#404e3c');
    px(c,x+298,180,10,3,'#a99762');px(c,x+314,176,14,6,'#334536');px(c,x+316,175,9,1,'#798465');px(c,x+300,199,14,9,'#796f4d');label(c,'07',x+302,206,'#b9a36a',6);
    px(c,x+295,149,44,4,'#535d45');px(c,x+300,153,2,5,'#8e8969');px(c,x+334,146,2,12,'#727f61');px(c,x+327,143,17,2,'#727f61');
    px(c,x+36,142,248,3,'#2f4031');for(const q of [40,280]){px(c,x+q,129,2,2,'#b3aa78');px(c,x+q,138,2,2,'#b3aa78');}
    px(c,x+44,127,22,2,'#788466');px(c,x+186,134,30,2,'#374a38');px(c,x+185,136,16,2,'#374a38');
    px(c,x+81,181,23,25,'#8c825a');px(c,x+83,183,19,13,'#343f30');label(c,'STOP',x+85,191,'#c6ac6d',6);px(c,x+83,199,17,2,'#5d573c');

  }
  // Drawn at 2x about (x,211): hall roof near y 41, stacks run off the top of the frame (smoke seeds at y≈6).
  function factory(c,x,w=200){
    for(const a of [36,82]){px(c,x+a,108,17,20,'#6b6850');px(c,x+a-2,105,21,4,'#4c5341');px(c,x+a+13,110,4,17,'#595f49');}
    px(c,x,126,w,85,'#717359');px(c,x,124,w,5,'#444f3e');px(c,x+5,130,w-10,4,'#6d6d52');for(let q=8;q<w-20;q+=35){windowPane(c,x+q,141,25,18,false,q);px(c,x+q,166,25,36,'#586550');for(let a=3;a<35;a+=7)px(c,x+q,166+a,25,1,'#788069');}px(c,x+110,161,72,50,'#3b493c');for(let q=0;q<72;q+=9)px(c,x+110+q,162,1,47,'#5b6650');
    px(c,x+w-61,110,49,16,'#6c6a53');px(c,x+w-58,107,43,4,'#7c7358');px(c,x+w-57,113,2,13,'#867a5f');
    px(c,x+w+17,140,60,71,'#6c7059');px(c,x+w+22,134,50,8,'#76755c');px(c,x+w+15,148,64,3,'#7e7d63');px(c,x+w+15,190,64,3,'#5d6b54');px(c,x+w+24,142,6,69,'#807d64');px(c,x+w+69,141,7,70,'#68765b');line(c,x+w+45,134,x+w+45,116,'#677157',2);line(c,x+w+45,116,x+w+8,116,'#677157',2);

    px(c,x,131,5,80,'#8b8664');px(c,x+w-5,129,5,82,'#3f4c3b');px(c,x,202,w,9,'#4e5a44');px(c,x,201,w,2,'#8a8765');
    for(let k=0;k<9;k++){const bx=7+hash(k+601)*(w-14),by=134+hash(k+701)*58;px(c,x+bx,by,2,4+hash(k+71)*12,'#815c3e');px(c,x+bx+2,by+3,2,3,'#605d43');}
    // A lifted shutter reveals a workshop, suspended chain, toolboard and workbench.
    px(c,x+113,171,66,40,'#21342d');px(c,x+119,183,23,13,'#4c5b45');for(let k=0;k<5;k++)px(c,x+121+k*4,186,1,6,'#8a8c69');px(c,x+122,198,47,3,'#7f7150');px(c,x+125,201,3,10,'#4d5841');px(c,x+163,201,3,10,'#4d5841');px(c,x+153,191,8,7,'#7f6846');
    for(let yy=162;yy<174;yy+=3){px(c,x+110,yy,72,2,'#727961');px(c,x+112,yy+2,68,1,'#37483a');}px(c,x+108,161,3,50,'#a1936c');px(c,x+182,161,3,50,'#374a3a');
    line(c,x+187,139,x+187,193,'#9a926e',3);line(c,x+187,193,x+199,193,'#9a926e',3);px(c,x+183,154,9,4,'#5b6550');px(c,x+184,177,8,3,'#5b6550');
    px(c,x+76,129,68,9,'#4b5c43');label(c,'IRONWORKS / 07',x+80,136,'#aaa377',6);
    px(c,x+w+21,156,16,13,'#9a9268');shape(c,[[x+w+23,166],[x+w+29,158],[x+w+35,166]],'#4c583d');px(c,x+w+28,161,2,3,'#c5b472');for(let k=0;k<6;k++){const sy=151+k*9;px(c,x+w+40+hash(k+2)*15,sy,1,4+hash(k+9)*9,'#53634c');}px(c,x+w+19,145,2,61,'#9b9876');
    for(let yy=150;yy<209;yy+=7){px(c,x+w+62,yy,13,1,'#434f3c');px(c,x+w+62,yy-5,1,6,'#919273');px(c,x+w+74,yy-5,1,6,'#919273');}
    px(c,x+189,152,9,3,'#2e4234');px(c,x+192,155,3,3,'#c9bc82');

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
    {x:4300,left:8,w:440,draw:(c,x)=>millerHome(c,x)},
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
    // The road itself: asphalt body, then the shoulder furniture (drawn after so guardrails overlap the kerb),
    // paint, sector dressing/debris and finally the gutter. Everything is hash-seeded from world x so seams match.
    roadAsphalt(c,offset);
    roadShoulder(c,offset);
    roadMarkings(c,offset);
    roadDebris(c,offset);
    roadGutter(c,offset);
    // Weathered kilometre stones (40 px, knee height) stay behind combatants and never clutter the roadway.
    for(let x=Math.ceil(offset/800)*800+50;x<offset+TILE;x+=800){px(c,x-offset,171,22,40,'#8a8262');px(c,x-offset+2,171,18,2,'#a09876');px(c,x-offset+2,174,18,9,'#6b7950');label(c,String(Math.floor(x/800)+7).padStart(2,'0'),x-offset+4,204,'#525d3d',11);}
  }
  // ---------------------------------------------------------------------------------------------------------
  // Road dressing. The road is y 218..330 (kerb 218..223, asphalt 223..325, gutter 325..330); the walking lane is
  // y 246..312 and is kept mostly clear so feet and blood stay readable. Props sit in the top band (223..245)
  // or the bottom band (312..325) unless they are flat and low-contrast. Helpers take tile-space x (world-offset).
  // ---------------------------------------------------------------------------------------------------------
  const inTile=(wx,w,offset)=>wx+w>=offset-10&&wx<=offset+TILE+10;
  function ellipseRows(c,cx,cy,rx,ry,col){for(let dy=-ry;dy<=ry;dy++){const hw=Math.sqrt(Math.max(0,1-(dy*dy)/(ry*ry)))*rx;if(hw<.5)continue;px(c,cx-hw,cy+dy,hw*2,1,col);}}
  function blob(c,cx,cy,rx,ry,col,seed){for(let dy=-ry;dy<=ry;dy++){const hw=Math.sqrt(Math.max(0,1-(dy*dy)/(ry*ry)))*rx*(.8+hash(seed+dy)*.3);if(hw<.5)continue;px(c,cx-hw+hash(seed+dy+50)*3-1,cy+dy,hw*2,1,col);}}
  // Dark old oil: blue-grey halo with a few purple/green pixels for the faint rainbow rim.
  function oilStain(c,cx,cy,rx,ry,seed){blob(c,cx,cy,rx+1,ry+1,'#454c52',seed);blob(c,cx,cy,rx,ry,'#2c3032',seed);blob(c,cx+1,cy,rx*.55,ry*.55,'#262a2c',seed+3);for(let k=0;k<6;k++)px(c,cx-rx+hash(seed+k)*rx*2,cy-ry-1+hash(seed+k+9)*(ry*2+2),1,1,k%2?'#57495c':'#4a5c56');}
  // Dried blood: maroon, darker centre, spatter around; fresh in-game blood is a much brighter red.
  function driedStain(c,cx,cy,rx,ry,seed){blob(c,cx,cy,rx,ry,'#4a2c28',seed);blob(c,cx+1,cy,rx*.55,ry*.55,'#3b2220',seed+4);for(let k=0;k<6;k++)px(c,cx-rx-3+hash(seed+k)*(rx*2+6),cy-ry-2+hash(seed+k+7)*(ry*2+4),1+hash(seed+k+2)*2,1,'#4a2c28');}
  function sandbag(c,x,y,burst){px(c,x,y-6,16,6,'#8a7d55');px(c,x+1,y-7,14,1,'#9a8c60');px(c,x,y-1,16,1,'#6f6444');px(c,x+3,y-6,1,6,'#7a6e4a');px(c,x+11,y-6,1,6,'#7a6e4a');if(burst){px(c,x+14,y-4,6,4,'#8a7d55');for(let k=0;k<9;k++)px(c,x+16+hash(x+k)*12,y-3+hash(x+k+5)*3,1,1,'#9a8a5a');}}
  function tyre(c,x,y){ellipseRows(c,x,y,11,5,'#262927');ellipseRows(c,x,y-1,10,4,'#2f3331');ellipseRows(c,x,y-1,5,2,'#3b3f3d');px(c,x-6,y-4,5,1,'#3d413f');}
  function bottle(c,x,y,col='#5f7a6a'){px(c,x,y,7,3,col);px(c,x+7,y+1,2,1,'#4a6050');px(c,x+1,y,4,1,'#7a9a8a');}
  function can(c,x,y){px(c,x,y,5,3,'#8a8a80');px(c,x+1,y,2,3,'#9a4a3a');px(c,x+4,y,1,3,'#6a6a60');}
  function paper(c,x,y){px(c,x,y,5,3,'#b5b0a0');px(c,x+1,y+1,3,1,'#8f8b80');}
  function shoe(c,x,y,col='#3a2f28'){px(c,x,y,7,3,col);px(c,x+5,y-1,2,1,col);px(c,x,y+2,7,1,'#26201c');}
  // Guardrail: steel W-beam (5 bands) on posts; one span may sag and the span after it is torn away.
  const guardrails=[{from:1310,to:1470,bent:1390},{from:3290,to:3460,bent:3370},{from:4770,to:4850,bent:-1}];
  function guardrail(c,offset,from,to,bent){
    const y=211;
    for(let wx=from;wx<=to;wx+=40){const sx=wx-offset;px(c,sx,y-42,5,42,'#555a4e');px(c,sx,y-42,2,42,'#6a6f62');px(c,sx-1,y-2,7,2,'#4a4e44');}
    for(let wx=from;wx<to;wx+=40){const sx=wx-offset,w=Math.min(40,to-wx);
      if(bent>0&&wx>=bent+40&&wx<bent+80){px(c,sx+4,y-5,30,3,'#6d7067');px(c,sx+4,y-5,30,1,'#8b8e83');px(c,sx+30,y-8,8,3,'#5b5f57');continue;}
      const d=bent>0&&wx>=bent&&wx<bent+40?15:0;
      const band=(y0,h,col)=>shape(c,[[sx,y-y0],[sx+w,y-y0+d],[sx+w,y-y0+h+d],[sx,y-y0+h]],col);
      band(39,4,'#7e8177');band(35,3,'#5b5f57');band(32,7,'#8b8e83');band(25,3,'#5b5f57');band(22,4,'#6d7067');
      for(let k=0;k<3;k++)px(c,sx+3+hash(wx+k)*(w-6),y-38+hash(wx+k+9)*14,2+hash(wx+k+3)*3,1,'#6b5540');
      if(d)px(c,sx+w-3,y-22+d,6,4,'#4a4e44');
    }
  }
  const delineators=[150,760,2400,4250,5680,6110];
  function delineator(c,sx){px(c,sx,176,3,35,'#b7b2a0');px(c,sx,186,3,4,'#2e2f2b');px(c,sx,181,3,3,'#a8463a');px(c,sx-1,209,5,2,'#6f6a58');}
  function culvert(c,sx){px(c,sx-2,200,26,18,'#8a8670');px(c,sx-2,200,26,2,'#9d9a82');px(c,sx+2,204,18,12,'#2a2c28');px(c,sx+4,206,14,8,'#1e2120');px(c,sx-4,217,30,3,'#6e6b5a');for(let k=0;k<5;k++)px(c,sx+k*6,219,3,1,'#5f665e');px(c,sx+8,221,6,3,'#4d5450');}
  function roadShoulder(c,offset){
    // Ditch furrow where the shoulder meets the verge, then gravel texture and kerb chips/weeds.
    for(let wx=Math.floor(offset/16)*16;wx<offset+TILE+16;wx+=16)px(c,wx-offset,210,17,1,hash(wx)>.5?'#6d6343':'#77694a');
    for(let i=0;i<170;i++){const n=offset*3+i*17;px(c,hash(n)*TILE,211+hash(n+3)*6,1+hash(n+5)*2,1,['#7d7050','#a09266','#6c6244','#948a60'][i%4]);}
    for(let wx=Math.floor(offset/61)*61;wx<offset+TILE+61;wx+=61){const sx=wx-offset+hash(wx)*50;if(hash(wx+1)>.45)px(c,sx,218,2+hash(wx+2)*3,2,'#6f6a58');if(hash(wx+3)>.55){px(c,sx+10,219,1,5,'#57683a');px(c,sx+11,221,1,3,'#6a7a44');line(c,sx+10,224,sx+13,219,'#4e5f34');}}
    for(const g of guardrails)if(inTile(g.from,g.to-g.from,offset))guardrail(c,offset,g.from,g.to,g.bent);
    for(const d of delineators)if(inTile(d,3,offset))delineator(c,d-offset);
    for(const cx of [900,4810])if(inTile(cx,26,offset))culvert(c,cx-offset);
  }
  const skids=[{x:520,y0:312,y1:300,len:130},{x:1760,y0:236,y1:262,len:170},{x:2520,y0:300,y1:250,len:200},{x:2880,y0:314,y1:305,len:140},{x:3620,y0:240,y1:300,len:160},{x:4420,y0:314,y1:306,len:120},{x:5150,y0:234,y1:244,len:150},{x:5900,y0:300,y1:250,len:180}];
  function skid(c,sx,y0,y1,len){c.globalAlpha=.65;for(let t=0;t<len;t+=6){const a=t/len,b=(t+6)/len,ya=y0+(y1-y0)*a*a,yb=y0+(y1-y0)*b*b;line(c,sx+t,ya,sx+t+6,yb,'#2c302e',3);line(c,sx+t,ya+9,sx+t+6,yb+9,'#2c302e',3);}c.globalAlpha=1;}
  const wrecks=[{x:600,w:218},{x:2480,w:218},{x:2760,w:218},{x:5720,w:340}];
  function roadAsphalt(c,offset){
    px(c,0,218,TILE,111,'#3b3f3d');px(c,0,218,TILE,3,'#9a927a');px(c,0,221,TILE,2,'#5f665e');
    // Repaired sections: slightly different greys with tar-line borders.
    for(let wx=Math.floor(offset/230)*230;wx<offset+TILE+230;wx+=230){const sx=wx-offset+hash(wx)*120,w=50+hash(wx+1)*90,h=18+hash(wx+2)*34,y=224+hash(wx+3)*(100-h);px(c,sx,y,w,h,['#3e4240','#383c3a','#3d413e','#3a3e3b'][Math.abs(wx)%4]);px(c,sx,y,w,1,'#2f3331');px(c,sx,y+h-1,w,1,'#2f3331');px(c,sx,y,1,h,'#2f3331');px(c,sx+w-1,y,1,h,'#2f3331');}
    for(let i=0;i<220;i++){const n=offset*7+i;px(c,hash(n)*TILE,224+hash(n+14)*100,2+hash(n+41)*12,1+hash(n+6)*2,['#40453f','#363b38','#454a43','#3c4139'][i%4]);}
    // Transverse expansion joints, tar snakes (crack seals) and the old branching cracks with a weed or two.
    for(let wx=Math.floor(offset/431)*431;wx<offset+TILE+431;wx+=431){const sx=wx-offset+hash(wx)*40;px(c,sx,223,1,102,'#2f3331');px(c,sx+1,223,1,102,'#474b48');}
    for(let wx=Math.floor(offset/340)*340;wx<offset+TILE+340;wx+=340){let x=wx-offset+hash(wx)*100,y=226+hash(wx+1)*96;for(let k=0;k<7;k++){const nx=x+6+hash(wx+k)*16,ny=Math.max(224,Math.min(323,y+(hash(wx+k+20)-.5)*14));line(c,x,y,nx,ny,'#2f332f',2);x=nx;y=ny;}}
    for(let x=Math.floor(offset/263)*263;x<offset+TILE+263;x+=263){const sx=x-offset,y=238+hash(x)*67;line(c,sx,y,sx+31,y+5,'#343a36');line(c,sx+31,y+5,sx+50,y+2,'#343a36');line(c,sx+25,y+4,sx+35,y+16,'#343a36');if(hash(x+5)>.5){px(c,sx+31,y+3,1,3,'#5a6a3a');px(c,sx+32,y+2,1,2,'#6a7a44');}}
    // Potholes with a dark rim and loose gravel; edge gravel along both kerbs.
    for(let wx=Math.floor(offset/470)*470;wx<offset+TILE+470;wx+=470){const sx=wx-offset+hash(wx)*300,rx=5+hash(wx+1)*7,ry=2+hash(wx+2)*3,cy=hash(wx+3)>.5?230+hash(wx+4)*9:316+hash(wx+4)*4;ellipseRows(c,sx,cy,rx+1,ry+1,'#2c302e');ellipseRows(c,sx,cy,rx,ry,'#262a28');px(c,sx-rx,cy-ry-1,rx*2,1,'#4c514d');for(let k=0;k<7;k++)px(c,sx-rx-4+hash(wx+k+30)*(rx*2+8),cy-ry-3+hash(wx+k+40)*(ry*2+6),1,1,'#5c5e55');}
    for(let i=0;i<120;i++){const n=offset*11+i*7;px(c,hash(n)*TILE,i%2?224+hash(n+1)*8:316+hash(n+1)*8,1,1,i%3?'#5b5d55':'#4f5149');}
    for(const s of skids)if(inTile(s.x,s.len,offset))skid(c,s.x-offset,s.y0,s.y1,s.len);
    // Rust and coolant streaks down the kerb under every wreck, with a sprinkle of windscreen glass.
    for(const w of wrecks){if(!inTile(w.x,w.w,offset))continue;for(let k=0;k<9;k++){const sx=w.x-offset+20+hash(w.x+k)*(w.w-40),h=5+hash(w.x+k+7)*18;px(c,sx,222,1,h,'#5a4634');px(c,sx+1,222,1,h*.6,'#4a3a2c');px(c,sx-1,222+h,3,1,'#4a3a2c');}for(let k=0;k<12;k++)px(c,w.x-offset+hash(w.x+k+30)*w.w,224+hash(w.x+k+40)*14,1,1,k%2?'#a9b3ac':'#7f8a86');}
    // Sector flavour on the surface itself.
    if(offset<1500){
      for(let wx=Math.floor(offset/90)*90;wx<offset+TILE+90&&wx<1500;wx+=90){const sx=wx-offset+hash(wx)*40,w=24+hash(wx+1)*40;shape(c,[[sx,223],[sx+w,223],[sx+w*.55,226+hash(wx+2)*6]],'#6f6749');for(let k=0;k<8;k++)px(c,sx+hash(wx+k+10)*w,224+hash(wx+k+20)*7,1,1,'#7b7250');if(hash(wx+3)>.5)shape(c,[[sx+30,325],[sx+30+w,325],[sx+30+w*.4,320-hash(wx+4)*4]],'#6b6446');}
      for(let wx=Math.floor(offset/37)*37;wx<offset+TILE&&wx<1500;wx+=37){if(hash(wx+2)<.4)continue;const sx=wx-offset+hash(wx)*30,y=225+hash(wx+1)*98;line(c,sx,y,sx+4+hash(wx+3)*5,y+(hash(wx+4)-.5)*3,'#8c8050');}
    }
    for(const o of [[1780,232],[1960,318],[2140,236],[2560,316],[2840,232],[4950,318],[5230,236],[5800,316]])if(inTile(o[0]-30,60,offset))oilStain(c,o[0]-offset,o[1],14+hash(o[0])*14,4+hash(o[0]+1)*4,o[0]);
    for(const mx of [3150,3820,4480,5350,5900])if(inTile(mx-11,22,offset)){const sx=mx-offset;ellipseRows(c,sx,236,11,10,'#4c5350');ellipseRows(c,sx,236,9,8,'#353b3a');for(let dy=-7;dy<=7;dy+=2)for(let dx=-7;dx<=7;dx+=2)if(dx*dx+dy*dy<49&&(dx+dy)%4===0)px(c,sx+dx,236+dy,1,1,'#2c3130');px(c,sx-4,232,8,1,'#5c605b');}
    for(const gx of [1620,2050,2330,2700,3120,3700,4020,4400,4780,5100,5560,6200])if(inTile(gx,20,offset)){const sx=gx-offset;px(c,sx,316,20,7,'#2e3331');px(c,sx,316,20,1,'#5c605b');for(let k=3;k<20;k+=4)px(c,sx+k,317,1,5,'#454a47');}
    if(offset+TILE>4700)for(let wx=Math.max(4700,Math.floor(offset/260)*260);wx<offset+TILE+260;wx+=260){const sx=wx-offset+hash(wx)*160,cy=hash(wx+3)>.5?234+hash(wx+4)*10:314+hash(wx+4)*6;blob(c,sx,cy,20+hash(wx+1)*22,3+hash(wx+2)*4,'#2e312f',wx);for(let k=0;k<10;k++)px(c,sx-30+hash(wx+k+8)*60,cy-8+hash(wx+k+20)*16,1,1,'#2a2d2b');}
  }
  // Painted markings: worn edge lines, patchy centre dashes with cat's-eye reflectors, and sector paint.
  const paint=[
    {x:1210,w:24,draw:(c,x)=>{label(c,'7',x,244,'#8f8c7d',18);px(c,x+4,236,6,1,'#3b3f3d');}},
    {x:2250,w:56,draw:(c,x)=>{for(let y=227;y<322;y+=12)for(let k=0;k<4;k++){if(hash(y*7+k)<.2)continue;px(c,x+k*14,y,13,6,hash(y+k)>.6?'#7d7a6e':'#918e80');}}},
    {x:3200,w:40,draw:(c,x)=>{px(c,x,317,26,5,'#8f8c7d');shape(c,[[x+26,313],[x+40,319.5],[x+26,326]],'#8f8c7d');px(c,x+8,318,5,1,'#3b3f3d');}},
    {x:3330,w:50,draw:(c,x)=>{label(c,'STOP',x,243,'#9f9c8e',15);px(c,x,236,44,1,'#3b3f3d');px(c,x+18,231,4,1,'#3b3f3d');}},
    {x:3395,w:70,draw:(c,x)=>{label(c,'STOP HERE',x,323,'#8f8c7d',9);px(c,x+20,318,10,1,'#3b3f3d');}},
    {x:4560,w:60,draw:(c,x)=>label(c,'CLEAR',x,323,'#7f7c70',9)},
    {x:5000,w:24,draw:(c,x)=>{label(c,'7',x,244,'#8f8c7d',18);px(c,x+2,239,8,1,'#3b3f3d');}}
  ];
  function roadMarkings(c,offset){
    for(let wx=Math.floor(offset/16)*16;wx<offset+TILE+16;wx+=16){const sx=wx-offset,r=hash(wx*3+1);if(r>=.22)px(c,sx,225,17,2,r<.5?'#7f7c70':'#a39f8f');const r2=hash(wx*3+2);if(r2>=.25)px(c,sx,319,17,2,r2<.5?'#7f7c70':'#a39f8f');}
    for(let x=Math.floor(offset/107)*107;x<offset+TILE+107;x+=107){const sx=x-offset,r=hash(x+11);
      if(r>.82)px(c,sx+4,274,20,1,'#4a4e46');
      else{const faded=r>.6;px(c,sx,273,34,3,faded?'#9b8636':'#d0b23c');if(!faded)px(c,sx+26,273,8,3,'#e9c84a');for(let k=0;k<3;k++)px(c,sx+hash(x+k+3)*32,273+hash(x+k+6)*3,1+hash(x+k+9)*3,1,'#3b3f3d');}
      px(c,sx+hash(x)*24,275,4,1,'#4a4e46');px(c,sx+66,273,5,3,'#5c605b');px(c,sx+67,274,3,1,hash(x+5)>.3?'#c9a83f':'#6a6448');}
    for(const m of paint)if(inTile(m.x,m.w,offset))m.draw(c,m.x-offset);
  }
  // Debris props at fixed world positions. Each is authored with x at its left edge; y is a band baseline.
  const roadProps=[
    {x:450,w:16,draw:(c,x)=>{shoe(c,x,240);shoe(c,x+9,236,'#4a3a30');}},
    {x:720,w:24,draw:(c,x)=>tyre(c,x+11,320)},
    {x:1150,w:40,draw:(c,x)=>{px(c,x,312,32,13,'#9a8a4e');px(c,x,312,32,1,'#ab9b5c');for(let k=2;k<32;k+=5)px(c,x+k,313,1,11,'#8a7a40');px(c,x,316,32,1,'#6a5a35');px(c,x,321,32,1,'#6a5a35');for(let k=0;k<14;k++)line(c,x-6+hash(x+k)*46,326,x-8+hash(x+k+3)*50,321+hash(x+k+6)*4,'#8c8050');}},
    {x:1350,w:44,draw:(c,x)=>{px(c,x,232,26,13,'#5e4c3c');px(c,x,232,26,1,'#6e5c4c');px(c,x+12,232,2,13,'#4a3a2c');shape(c,[[x+22,232],[x+40,222],[x+44,225],[x+26,235]],'#6a5644');px(c,x+28,236,7,3,'#8a7a6a');px(c,x+36,239,8,3,'#7a8a9a');px(c,x+30,241,6,3,'#a08a70');px(c,x+40,234,5,2,'#8f8f8a');px(c,x-6,241,5,3,'#7a8a9a');}},
    {x:2160,w:60,draw:(c,x)=>{bottle(c,x,320);can(c,x+14,322);paper(c,x+26,318);can(c,x+40,316);bottle(c,x+48,323,'#6a5a3a');}},
    {x:2300,w:10,draw:(c,x)=>{px(c,x,237,7,7,'#9a7a5a');px(c,x-1,236,2,2,'#9a7a5a');px(c,x+6,236,2,2,'#9a7a5a');px(c,x+1,239,1,1,'#2a2420');px(c,x+4,239,1,1,'#2a2420');px(c,x+2,242,3,1,'#7a5a3a');}},
    {x:2380,w:40,draw:(c,x)=>{for(let k=0;k<26;k++)px(c,x+hash(x+k)*40,223+hash(x+k+9)*14,1,1,k%3?'#9fb0b0':'#c7d3cf');shape(c,[[x+8,226],[x+16,224],[x+13,232]],'#8fa3a3');shape(c,[[x+24,229],[x+33,231],[x+27,236]],'#8fa3a3');}},
    {x:2420,w:36,draw:(c,x)=>{const y=245;px(c,x,y-20,32,1,'#7f8480');px(c,x,y-4,32,1,'#7f8480');px(c,x,y-20,1,17,'#7f8480');px(c,x+31,y-20,1,17,'#7f8480');for(let k=6;k<31;k+=6)px(c,x+k,y-19,1,15,'#5e625c');for(let k=-16;k<-4;k+=5)px(c,x+1,y+k,30,1,'#5e625c');px(c,x+32,y-22,8,1,'#8a8e88');px(c,x+39,y-22,1,6,'#8a8e88');px(c,x+4,y-2,4,3,'#4a4e4a');px(c,x+24,y-2,4,3,'#4a4e4a');}},
    {x:2620,w:14,draw:(c,x)=>{ellipseRows(c,x+6,320,6,3,'#6f736c');ellipseRows(c,x+6,320,3,1,'#8b8f88');px(c,x+5,320,2,1,'#5a5e58');}},
    {x:2900,w:60,draw:(c,x)=>{shape(c,[[x,244],[x+6,234],[x+20,231],[x+42,232],[x+56,236],[x+60,244]],'#a39e90');line(c,x+14,244,x+22,235,'#8d887b');line(c,x+34,244,x+36,234,'#8d887b');line(c,x+48,244,x+45,236,'#8d887b');px(c,x+55,241,7,3,'#3a2f28');px(c,x-2,242,4,2,'#4a2c28');}},
    {x:2950,w:46,draw:(c,x)=>{const y=322;for(const wx of [x+8,x+38]){ellipseRows(c,wx,y,8,4,'#5a5e5a');ellipseRows(c,wx,y,6,2,'#3b3f3d');px(c,wx-1,y,2,1,'#7a7e78');}line(c,x+8,y,x+20,y-6,'#8a5a4a',2);line(c,x+20,y-6,x+38,y,'#8a5a4a',2);line(c,x+20,y-6,x+30,y+1,'#8a5a4a');px(c,x+18,y-8,5,2,'#3a3d3a');}},
    {x:3350,w:50,draw:(c,x)=>{driedStain(c,x+20,238,16,5,x);line(c,x+36,240,x+60,246,'#4a2c28',2);}},
    {x:3440,w:60,draw:(c,x)=>{sandbag(c,x,325,false);sandbag(c,x+17,325,true);sandbag(c,x+8,319,false);sandbag(c,x+40,242,true);}},
    {x:3478,w:10,draw:(c,x)=>{px(c,x,224,7,101,'#3a3d3c');px(c,x,224,2,101,'#2c2f2e');for(let y=226;y<323;y+=5)shape(c,[[x+5,y],[x+10,y+1.5],[x+5,y+3]],'#8c8f88');}},
    {x:3560,w:90,draw:(c,x)=>{for(let k=0;k<15;k++){const y=317+Math.round(Math.sin(k*1.1)*3);px(c,x+k*6,y,6,3,k%2?'#b8a03a':'#2c2c28');}}},
    {x:3600,w:40,draw:(c,x)=>{driedStain(c,x+16,318,14,4,x);driedStain(c,x+60,232,9,4,x+7);}},
    {x:3700,w:40,draw:(c,x)=>{px(c,x,315,13,9,'#b8b5a8');px(c,x+5,317,3,5,'#a04030');px(c,x+4,318,5,3,'#a04030');ellipseRows(c,x+20,321,4,2,'#c9c4b0');px(c,x+18,321,4,1,'#a8a394');line(c,x+28,318,x+40,323,'#9a9e98');px(c,x+27,317,2,2,'#7a8a9a');paper(c,x+32,314);}},
    {x:3900,w:34,draw:(c,x)=>{for(let k=0;k<7;k++){line(c,x+k*5,326,x+k*5+10,314,'#6e726a');line(c,x+k*5,314,x+k*5+10,326,'#6e726a');}px(c,x-2,313,1,14,'#7a7e78');}},
    {x:4050,w:70,draw:(c,x)=>{line(c,x,216,x+52,238,'#6b6f66',3);px(c,x-2,214,5,4,'#4a4e44');shape(c,[[x+60,224],[x+72,236],[x+60,248],[x+48,236]],'#2c2c28');shape(c,[[x+60,227],[x+69,236],[x+60,245],[x+51,236]],'#8f8140');px(c,x+57,234,6,4,'#2c2c28');}},
    {x:4150,w:60,draw:(c,x)=>{px(c,x,204,48,13,'#3b3e3a');px(c,x,204,48,1,'#4d514c');for(const [k,col] of [[4,'#5a3a34'],[19,'#6a6238'],[34,'#3c5a42']]){px(c,x+k,206,10,9,'#2a2d2a');px(c,x+k+2,208,6,5,col);}px(c,x+48,209,14,3,'#4d514c');px(c,x-4,215,8,3,'#4a4e44');}},
    {x:4240,w:50,draw:(c,x)=>{sandbag(c,x,325,true);sandbag(c,x+18,325,false);sandbag(c,x+26,244,true);}},
    {x:4790,w:56,draw:(c,x)=>{shape(c,[[x,242],[x+8,228],[x+30,226],[x+50,230],[x+56,242],[x+44,244],[x+12,243]],'#7e8280');line(c,x+10,242,x+18,230,'#9a9e98');line(c,x+30,243,x+32,228,'#9a9e98');line(c,x+46,242,x+42,231,'#9a9e98');px(c,x+52,238,3,2,'#5b5a4f');px(c,x+2,240,3,2,'#5b5a4f');}},
    {x:4600,w:80,draw:(c,x)=>{blob(c,x+40,316,38,9,'#25292a',x);blob(c,x+38,315,22,5,'#1f2324',x+2);for(let k=0;k<18;k++)px(c,x+4+hash(x+k)*72,309+hash(x+k+9)*15,1,1,'#6e6e66');line(c,x+30,320,x+52,312,'#2f2a26',2);px(c,x+46,311,3,2,'#1f2324');}},
    {x:4820,w:44,draw:(c,x)=>{for(const r of [[0,236,10,7],[9,232,7,5],[15,238,12,6],[26,233,9,8],[34,240,8,4],[5,242,6,3]])px(c,x+r[0],r[1],r[2],r[3],(r[0]%10)>4?'#5c5e57':'#4f524c');for(const r of [[1,235,6,1],[16,237,8,1],[27,232,5,1]])px(c,x+r[0],r[1],r[2],r[3],'#6a6c63');for(let k=0;k<10;k++)px(c,x-6+hash(x+k)*56,228+hash(x+k+3)*16,1,1,'#5f6058');line(c,x+20,243,x+33,241,'#7a6a48');}},
    {x:5300,w:64,draw:(c,x)=>{px(c,x,314,60,6,'#5a5e5c');px(c,x,314,60,1,'#747874');px(c,x,319,60,1,'#3f4442');px(c,x+59,313,3,8,'#6a6e6c');px(c,x+4,321,58,5,'#4e5250');px(c,x+4,321,58,1,'#6a6e6c');px(c,x+2,320,3,7,'#5a5e5c');px(c,x+20,317,4,1,'#6b5540');}},
    {x:5480,w:40,draw:(c,x)=>{for(const r of [[0,318,9,6],[8,314,7,5],[14,320,11,5],[24,316,8,8],[31,321,8,4]])px(c,x+r[0],r[1],r[2],r[3],(r[0]%7)>3?'#5c5e57':'#4f524c');px(c,x+1,317,6,1,'#6a6c63');px(c,x+25,315,5,1,'#6a6c63');for(let k=0;k<8;k++)px(c,x-4+hash(x+k)*48,313+hash(x+k+3)*12,1,1,'#5f6058');}},
    {x:5600,w:40,draw:(c,x)=>{shape(c,[[x,244],[x+6,230],[x+26,226],[x+38,234],[x+30,244]],'#5b6260');shape(c,[[x+8,242],[x+12,232],[x+24,229],[x+30,236]],'#6c7371');px(c,x+14,236,8,1,'#454b49');px(c,x+30,241,6,3,'#4a4e44');px(c,x+2,243,4,1,'#6b5540');}},
    {x:5940,w:140,draw:(c,x)=>{for(let y=226;y<322;y+=13){px(c,x+8,y,124,5,'#4f4a3a');px(c,x+8,y,124,1,'#5c5644');}for(let k=0;k<40;k++)px(c,x+hash(k+1)*140,224+hash(k+50)*100,1,1,'#5f6058');for(const rx of [x+20,x+120]){px(c,rx,223,4,102,'#6a6c66');px(c,rx,223,1,102,'#8a8c84');px(c,rx+3,223,1,102,'#454842');}
      px(c,x-14,158,3,53,'#6b6f66');line(c,x-24,166,x-3,178,'#b7b2a0',4);line(c,x-24,178,x-3,166,'#b7b2a0',4);px(c,x-17,182,9,9,'#3a3d3a');px(c,x-15,184,5,5,'#5a3a34');px(c,x-18,209,11,2,'#4a4e44');}},
    {x:6050,w:44,draw:(c,x)=>{px(c,x,318,40,3,'#6b5a3f');px(c,x,318,40,1,'#7c6b4a');px(c,x,323,40,3,'#6b5a3f');px(c,x,323,40,1,'#7c6b4a');for(const k of [2,18,34])px(c,x+k,321,4,2,'#4e4130');px(c,x+12,318,3,3,'#4e4130');px(c,x+26,323,3,3,'#4e4130');}}
  ];
  function roadDebris(c,offset){
    for(const p of roadProps)if(inTile(p.x,p.w,offset))p.draw(c,p.x-offset);
    // Generic litter (station and quarantine) and papers.
    if(offset+TILE>1500&&offset<4700)for(let wx=Math.max(1500,Math.floor(offset/130)*130);wx<offset+TILE+130&&wx<4700;wx+=130){if(wx>4220&&wx<4740)continue;const r=hash(wx+21);if(r<.35)continue;const sx=wx-offset+hash(wx)*100,y=hash(wx+2)>.5?226+hash(wx+3)*16:314+hash(wx+3)*9;if(r<.55)paper(c,sx,y);else if(r<.75)can(c,sx,y);else bottle(c,sx,y,hash(wx+4)>.5?'#5f7a6a':'#6a5a3a');}
    // Spent brass and a few loose rounds around the checkpoint approach.
    if(offset+TILE>3300&&offset<3760)for(let wx=3330;wx<3740;wx+=7){if(hash(wx+8)<.55)continue;const sx=wx-offset+hash(wx)*6,r=hash(wx+1),y=r>.55?228+hash(wx+2)*16:r>.12?313+hash(wx+2)*10:250+hash(wx+2)*58;px(c,sx,y,2,1,'#b09a4e');px(c,sx+2,y,1,1,'#7d6a33');}
  }
  function roadGutter(c,offset){
    px(c,0,325,TILE,3,'#8f8a70');px(c,0,328,TILE,2,'#5c6150');for(let x=Math.floor(offset/39)*39;x<offset+TILE;x+=39)px(c,x-offset,325,3,3,'#6b6a58');
    // Leaves and litter that collected along the gutter, storm drains past the farm, and a glint of broken glass.
    for(let wx=Math.floor(offset/23)*23;wx<offset+TILE+23;wx+=23){const r=hash(wx+77);if(r<.45)continue;const sx=wx-offset+hash(wx)*18;px(c,sx,325+hash(wx+1)*3,2+hash(wx+2)*2,1,r<.65?'#6b5a35':r<.85?'#7a6a3a':'#a29c88');}
    for(let wx=Math.floor(offset/350)*350;wx<offset+TILE+350;wx+=350){if(wx<1500)continue;const sx=wx-offset+hash(wx)*200;px(c,sx,324,26,5,'#2e3331');for(let k=1;k<5;k++)px(c,sx+k*5,325,2,3,'#4a4f4b');px(c,sx,324,26,1,'#5c605b');}
    for(let wx=Math.floor(offset/500)*500;wx<offset+TILE+500;wx+=500){const sx=wx-offset+hash(wx+3)*400;px(c,sx,326,3,1,'#7a9a8a');px(c,sx+1,325,1,1,'#d8e0d0');px(c,sx+4,327,2,1,'#6a8a7a');}
  }
  function getTile(index){if(!tiles.has(index)){const cv=document.createElement('canvas');cv.width=TILE;cv.height=HEIGHT+160;const tc=cv.getContext('2d');tc.translate(0,160);drawTerrain(tc,index*TILE);tiles.set(index,cv);}return tiles.get(index);}
  function sky(c,camera,time){
    px(c,0,-80,WIDTH,205,'#a15e40');px(c,0,36,WIDTH,50,'#ae6d45');px(c,0,82,WIDTH,42,'#b17c48');
    const sunX=494-camera*.018;px(c,sunX,33,27,27,'#c99457');px(c,sunX-4,40,35,15,'#c99457');px(c,sunX-1,56,31,4,'#b7834f');
    // A higher, thinner cloud layer drifts more slowly behind the main bank.
    const hiSpan=WIDTH+360,hiCount=Math.ceil(hiSpan/311)+1;for(let n=-1;n<hiCount-1;n++){const x=((n*311-time*.55-camera*.03)%hiSpan+hiSpan)%hiSpan-180,y=6+hash(n+15)*22;px(c,x,y,58,2,'#ab6a44');px(c,x+14,y-2,31,2,'#ab6a44');px(c,x+70,y+3,40,2,'#ab6a44');}
    const cloudSpan=WIDTH+320,cloudCount=Math.ceil(cloudSpan/237)+1;for(let n=-1;n<cloudCount-1;n++){const x=((n*237-time*1.25-camera*.065)%cloudSpan+cloudSpan)%cloudSpan-210,y=25+hash(n+5)*40;px(c,x,y,76,3,'#9d6140');px(c,x+19,y-3,49,3,'#9d6140');px(c,x+6,y+5,112,2,'#a66842');}
    for(let layer=0;layer<2;layer++){const fac=layer?.15:.08,base=layer?124:111,color=layer?'#896039':'#99683f',step=11;const points=[[0,base]];for(let sx=-step;sx<=WIDTH+step;sx+=step){const wx=sx+camera*fac;const h=19+Math.sin(wx*.012+layer)*10+Math.sin(wx*.026)*7;points.push([sx,base-h]);points.push([sx+step,base-h]);}points.push([WIDTH,base],[0,base]);shape(c,points,color);}
    // Heat haze stays in world coordinates, including while the camera zooms.
    for(let k=0;k<5;k++){const y=95+k*3,off=Math.round(Math.sin(time*2.6+k*1.9)*1.2);c.globalAlpha=.08;px(c,off,y,WIDTH,1,'#bf955d');}c.globalAlpha=1;
    for(let x=Math.floor(camera*.24/7)*7;x<camera*.24+WIDTH+7;x+=7){const h=4+hash(x)*13,sx=x-camera*.24;px(c,sx,126-h,5,h,'#896039');px(c,sx+2,122-h,1,5,'#896039');}
    // City silhouette appears gradually as the road approaches the industrial district.
    const cityOrigin=1050;for(let n=0;n<17;n++){const x=cityOrigin+n*45-camera*.24;if(x<-60||x>WIDTH+20)continue;const h=17+hash(n+97)*37;px(c,x,122-h,30+hash(n)*14,h,'#8d6a47');px(c,x+6,117-h,2,8,'#8d6a47');for(let yy=130-h;yy<118;yy+=10)for(let xx=4;xx<27;xx+=9)px(c,x+xx,yy,3,3,'#8f6f4d');}
  }
  function distantStructures(c,camera,time){
    const par=.43;
    for(const site of [{wx:410,y:120,kind:0},{wx:960,y:123,kind:1},{wx:1580,y:124,kind:2},{wx:2260,y:123,kind:3},{wx:2670,y:124,kind:3}]){
      const x=site.wx-camera*par;if(x<-150||x>WIDTH+130)continue;
      if(site.kind===0){px(c,x,95,29,25,'#796344');shape(c,[[x-2,95],[x+14,84],[x+31,95]],'#826647');px(c,x+7,102,7,18,'#6c5d3f');px(c,x+37,77,15,43,'#837047');shape(c,[[x+35,77],[x+44,71],[x+54,77]],'#936f46');}
      if(site.kind===1){for(const xx of [x,x+31])line(c,xx,90,xx-3,123,'#6b6142',2);px(c,x-5,76,43,16,'#80714c');px(c,x-3,73,39,4,'#8e7851');line(c,x,109,x+31,94,'#786b47');line(c,x,94,x+31,110,'#786b47');}
      if(site.kind===2){shape(c,[[x,122],[x,94],[x+16,94],[x+16,86],[x+44,86],[x+44,102],[x+72,102],[x+72,122]],'#786c4a');for(let i=0;i<5;i++){px(c,x+5+i*12,108,4,6,'#94815a');px(c,x+20+i*5,92,2,4,'#91815a');}px(c,x+80,78,3,45,'#786c4a');line(c,x+81,82,x+112,82,'#786c4a',2);}
      if(site.kind===3){px(c,x,78,4,46,'#71664a');line(c,x-20,78,x+80,78,'#71664a',3);line(c,x,69,x+74,78,'#71664a');line(c,x+49,79,x+49+Math.sin(time*.6)*2,109,'#786c4a');px(c,x-21,72,15,8,'#71664a');for(let i=0;i<3;i++){px(c,x+92+i*17,101-i*9,9,23+i*9,'#7c7050');px(c,x+90+i*17,101-i*9,13,2,'#8a7850');}for(let i=0;i<5;i++){const age=(time*.05+i*.2)%1;c.globalAlpha=(1-age)*.13;ellipseRows(c,x+130+age*27,79-age*24,4+age*6,Math.max(1,Math.round(2+age*3)),'#73674c');}c.globalAlpha=1;}
    }
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
  function lanternState(time){const a=Math.sin(time*2.1)*.28*(1+gust(time)*.8);return{x:360+Math.sin(a)*12,y:147+Math.cos(a)*12,intensity:.62+Math.sin(time*3.1)*.035+Math.sin(time*7.3)*.018};}
  function neonLevel(time,k=0){const phase=(time+k*.43)%17;return k===8?(.44+Math.sin(time*.8)*.22):phase>15.8&&phase<16.35?.24+.12*Math.sin(phase*15):.76+.04*Math.sin(time*.6+k);}
  function weldLevel(time){const phase=time%6.8;return phase>1.4&&phase<2.12?Math.sin((phase-1.4)/.72*Math.PI)*(.78+.15*Math.sin(time*16)):0;}
  function lightSources(camera,time){
    const result=[],add=(wx,y,color,intensity,radius,extra={})=>{if(wx+radius>=camera&&wx-radius<=camera+WIDTH&&intensity>.008)result.push({x:wx-camera,y,color,intensity,radius,...extra});};
    const lamp=lanternState(time);add(lamp.x,lamp.y,'#ffc17a',lamp.intensity,70,{floorY:229,floorWidth:73});
    add(420,194,'#dda15c',.18,38,{floorY:216,floorWidth:34});
    add(1947,53,'#efb967',neonLevel(time)*.36,82,{tube:82});
    for(const wx of [1840,2054])add(wx,74,'#d5dcc0',.47+Math.sin(time*.45+wx)*.025,104,{tube:57,floorY:220,floorWidth:109});
    add(2207,53,'#e1bb78',.24,46,{tube:36});
    for(const wx of [3611,4023]){const face=Math.max(0,Math.sin(time*2.4+wx));add(wx+5,36,'#efa55b',.14+face*.46,102,{floorY:221,floorWidth:97});}
    add(4486,87,'#edbd80',.31+Math.sin(time*.38)*.008,64,{floorY:207,floorWidth:59,cone:true});
    const wl=weldLevel(time);add(4992,96,'#bce1ef',wl*.7,111,{floorY:223,floorWidth:81});
    if(hash(Math.floor(time*4)+8)>.78)add(3577+Math.sin(time*1.1)*4*(1+gust(time)),66+hash(55)*9,'#d6e5d0',.34,39);
    add(5267,102,'#dbce91',.54,106,{floorY:224,floorWidth:82,cone:true});
    for(const wx of [764,2621])add(wx,149,'#e78b42',.16+Math.sin(time*2.2+wx)*.04,40);
    if(time%1.1<.45){add(2775,172,'#edab5c',.22,34);add(2960,175,'#edab5c',.22,34);}
    return result;
  }
  function utilities(c,camera,time){
    const spacing=355,offset=camera,g=gust(time),poleX=i=>i*spacing+(i===13?175:0);
    c.save();c.lineWidth=1;
    for(let i=Math.floor(offset/spacing)-1;i<Math.floor((offset+WIDTH)/spacing)+2;i++){const x=poleX(i)-offset,nextX=poleX(i+1)-offset,y=22+hash(i+45)*9,y2=22+hash(i+46)*9,cx=x+(nextX-x)*.51,cy=y+52+Math.sin(time*1.4+i*1.3)*(1.5+g*3);
      c.strokeStyle='#8f6a48';
      c.beginPath();c.moveTo(x,y+8);c.quadraticCurveTo(cx,cy,nextX,y2+8);c.stroke();
      c.beginPath();c.moveTo(x,y+16);c.quadraticCurveTo(cx,cy+8,nextX,y2+16);c.stroke();
      px(c,x,y,5,211-y,'#7a6446');px(c,x+3,y+20,2,191-y,'#8c7452');px(c,x-21,y+6,47,4,'#7a6446');for(const q of [-13,17])px(c,x+q,y,4,7,'#6b5a44');px(c,x-5,y+38,14,22,'#7a6446');px(c,x-2,y+41,8,15,'#856d4d');
      // Pole 10 (world 3550) stands over the quarantine checkpoint: a cut strand dangles from its crossbar and sparks now and then.
      if(i===10){const ex=x+27+Math.sin(time*1.1)*4*(1+g),ey=y+44;c.strokeStyle='#6f5438';c.beginPath();c.moveTo(x+21,y+7);c.quadraticCurveTo(x+30,y+26,ex,ey);c.stroke();
        if(hash(Math.floor(time*4)+8)>.78){px(c,ex-1,ey-1,3,3,'#fff6c8');for(let k=0;k<3;k++)px(c,ex+hash(k+time*40)*10-5,ey+hash(k+9+time*40)*8,1,1,'#ffe9a0');}}
      // Crows perch on the upper wire (evaluated on the same curve). They hop occasionally; the first crow on some poles flies.
      const n=Math.floor(hash(i+200)*3);
      for(let k=0;k<n;k++){const t=.2+hash(i*5+k+300)*.6,u=1-t,wx=u*u*x+2*u*t*cx+t*t*nextX,wy=u*u*(y+8)+2*u*t*cy+t*t*(y2+8),f=hash(i+k+700)>.5?1:-1;
        if(k===0&&hash(i+500)>.55){if(flyer.pole!==i&&x<WIDTH*.32&&x>WIDTH*.32-40&&time-flyer.t0>10){flyer.pole=i;flyer.t0=time;}
          const e=flyer.pole===i?time-flyer.t0:99;
          if(e<7){const a=e*1.7,r=10+Math.min(e,4)*7,air=1-Math.max(0,e-6),fx=wx+Math.cos(a)*r*air,fy=wy-(8+Math.min(e,4)*5)*air+Math.sin(a)*r*.35*air,flap=Math.sin(e*14)>0?2:-1;
            px(c,Math.round(fx)-1,Math.round(fy),3,2,'#2a2620');line(c,fx-5,fy-flap,fx,fy,'#2a2620');line(c,fx,fy,fx+5,fy-flap,'#2a2620');continue;}}
        const hop=(time*.4+hash(i+k*9+400))%1<.05?-3:0;crow(c,Math.round(wx),Math.round(wy)+hop,f);}
    }c.restore();
  }
  function smoke(c,wx,baseY,camera,time,seed,thickness=1){
    const x=wx-camera;if(x<-65||x>WIDTH+45)return;
    for(let i=0;i<9;i++){const age=(time*.17+i/9)%1;const xx=x+age*43+Math.sin(time*.45+i)*3, yy=baseY-age*67;const size=(5+age*17)*thickness;c.globalAlpha=(1-age)*.22;ellipseRows(c,xx+size*.5,yy,size*.55,Math.max(1,Math.round(size*.29)),'#4d5140');}c.globalAlpha=1;
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
    for(const b of [{x:566,top:92,lx:408,ly:61,lamp:true},{x:1305,top:96,lx:1172,ly:143,lamp:false}]){
      let x=b.x-camera;if(x>-40&&x<WIDTH+40){px(c,x-1,b.top,3,211-b.top,'#5c5238');px(c,x-1,b.top+1,1,210-b.top,'#7a6c4a');px(c,x-4,b.top+2,9,2,'#5c5238');
        for(let k=0;k<4;k++){const a=spin+k*Math.PI/2,ex=x+Math.cos(a)*16,ey=b.top+Math.sin(a)*16;line(c,x,b.top,ex,ey,'#8c7a52',2);px(c,ex-2,ey-2,4,4,'#a08a5a');}px(c,x-1,b.top-1,3,3,'#3a3228');}
      x=b.lx-camera;if(x>-80&&x<WIDTH+30){for(let i=0;i<4;i++){const age=(time*.13+i*.25)%1;c.globalAlpha=(1-age)*.8;px(c,x+12+age*(45+g*30)+Math.sin(time*1.6+i*2)*3,b.ly+8+age*38+Math.sin(time*2.3+i)*2,3,1,'#cfa94f');}c.globalAlpha=1;}
      if(!b.lamp)continue;
      x=360-camera;if(x>-40&&x<WIDTH+40){const source=lanternState(time),lx=source.x-camera,ly=source.y-4;
        line(c,x,143,lx,ly,'#3a3228');px(c,lx-3,ly,7,8,'#4a3d2a');px(c,lx-2,ly+1,5,6,'#f0b850');px(c,lx-1,ly+2,3,3,'#fff0b0');px(c,lx-2,ly-2,5,2,'#3a3228');
}
      for(let k=0;k<2;k++){const ph=time*(.3+k*.07)+k*2,wx=(k?524:482)+Math.round(Math.sin(ph)*9),f=Math.cos(ph)>0?1:-1,peck=(time*1.5+k*.5)%1<.3?2:0,sx=wx-camera;if(sx>-10&&sx<WIDTH+10)chicken(c,sx,210,f,peck);}
    }
    // A farm placard hangs from a bent bracket; it moves on its chains, not independently of its support.
    let sx=290-camera;if(sx>-60&&sx<WIDTH+45){line(c,sx+12,119,sx-13,119,'#484633',2);line(c,sx+11,110,sx-4,119,'#686146');
      const sway=Math.sin(time*1.2)*2*(1+g*.6),left=sx-28+sway,top=134+Math.sin(time*1.2+.4);line(c,sx-22,119,left+6,top,'#4b4b35');line(c,sx-7,119,left+22,top,'#4b4b35');
      shape(c,[[left,top],[left+31,top+1],[left+30,top+16],[left+2,top+15]],'#6e5838');px(c,left+2,top+2,27,1,'#a88d58');label(c,'HAY',left+6,top+11,'#c4ad6d',8);px(c,left+24,top+13,4,2,'#433d2a');}
    // The loading rope reacts to the same gust as the hay; sparse water ripples stay inside the trough.
    sx=434-camera;if(sx>-15&&sx<WIDTH+15){const bend=Math.sin(time*1.4)*1.8+g*2;line(c,sx,92,sx+bend,111,'#756a43');line(c,sx+bend,111,sx+bend-2,116,'#9b8a55');px(c,sx+bend-4,115,3,2,'#474c35');}
    sx=492-camera;if(sx>-45&&sx<WIDTH+15){const phase=(time*.2)%1;px(c,sx+4+phase*20,183,4,1,'#8e9b76');px(c,sx+27-phase*17,184,3,1,'#73886a');}
    // A torn grain sack at the second barn slowly sheds chaff over its own shoulder, never into the combat lane.
    sx=1020-camera;if(sx>-35&&sx<WIDTH+35){for(let i=0;i<3;i++){const a=(time*.11+i*.33)%1;c.globalAlpha=(1-a)*.7;px(c,sx+a*(13+g*11),188+a*20+Math.sin(time+i)*2,2,1,'#b29b5a');}c.globalAlpha=1;}
  }
  // Gas station (world 1690, drawn at 2x): neon letters flicker, a plate creaks under the canopy edge, pump displays
  // flicker, the near hose drips onto the forecourt, and the awning fringe lifts in the breeze.
  function stationLife(c,camera,time,g){
    const x=1690-camera;if(x<-700||x>WIDTH+180)return;
    c.font='bold 16px monospace';c.textBaseline='alphabetic';const adv=9.63;
    for(let k=0;k<9;k++){const ch='LAST STOP'[k];if(ch===' ')continue;const level=neonLevel(time,k);c.fillStyle=level>.5?'#d1ab65':'#87663e';c.fillText(ch,Math.round(x+210+k*adv),59);}
    // Recessed fluorescent strips are physical fixtures; lighting.js handles their soft spill.
    for(const lx of [150,364]){px(c,x+lx-31,71,62,3,'#2d3c32');px(c,x+lx-28,73,57,2,'#c9d3b6');px(c,x+lx-32,72,3,4,'#5e6750');px(c,x+lx+30,72,3,4,'#5e6750');}
    px(c,x+499,50,36,4,'#948052');px(c,x+501,51,32,2,'#d1b778');
    c.save();c.translate(Math.round(x+460),71);c.rotate(Math.sin(time*1.3)*.1*(1+g));c.fillStyle='#3a3228';c.fillRect(-1,0,2,8);c.fillStyle='#6d5a3a';c.fillRect(-13,8,26,14);c.fillStyle='#c9b07a';c.fillRect(-11,10,22,10);c.fillStyle='#6b3a2a';c.font='bold 7px monospace';c.fillText('OPEN',-9,18);c.restore();
    for(const q of [53,166]){const v=Math.sin(time*.9+q);px(c,x+(q+5)*2,129,16,4,v>.75?'#9eae72':'#778b59');}
    const dp=(time/2.4)%1,hx=x+156,hy=193;if(dp<.35)px(c,hx,hy,1+Math.round(dp*4),1+Math.round(dp*4),'#a9c4cc');else{const fy=hy+(dp-.35)/.65*18;if(fy<210)px(c,hx,fy,2,3,'#a9c4cc');else px(c,hx-3,209,8,1,'#a9c4cc');}
    for(let k=0;k<60;k++){const lift=Math.sin(time*4.5+k*.6)>(.4-g*.5)?-1:0;px(c,x+12+k*8,71+lift,7,3,k%2?'#a7663a':'#8a5a33');}
  }
  // Wrecks: embers rise under the two smoke columns; hazards blink on the car at 2760.
  function carLife(c,camera,time,g){
    for(const wx of [764,2621]){const x=wx-camera;if(x<-40||x>WIDTH+40)continue;for(let i=0;i<6;i++){const age=(time*.55+i/6)%1,s=age<.5?2:1;c.globalAlpha=1-age;px(c,x+Math.sin(time*2.2+i*1.9)*5+age*12,152-age*48,s,s,i%2?'#ffb040':'#e0602a');}c.globalAlpha=1;}
    let x=2760-camera;if(x>-200&&x<WIDTH+200&&(time%1.1)<.45){px(c,x+9,169,13,7,'#f5a23a');px(c,x+191,171,19,9,'#f5a23a');}
  }
  // Checkpoint (world 3500, 2x): the two beacons sweep a cone and brighten as the beam faces the road, a loose warning
  // plate rattles against the chain-link every few seconds, cut strands wave on the fence top, and the banner's torn edge flaps.
  function checkpointLife(c,camera,time,g){
    for(const wx of [3611,4023]){const x=wx-camera;if(x<-90||x>WIDTH+90)continue;const face=Math.max(0,Math.sin(time*2.4+wx));
      px(c,x-1,40,12,3,'#394632');px(c,x,31,10,10,'#5e4730');px(c,x+2,33,6,6,face>.3?'#dfa351':'#8a5a30');px(c,x+4,33,2,5,face>.6?'#f4ce7f':'#aa753b');}
    const x=3500-camera;if(x<-760||x>WIDTH+40)return;
    const r=(time%5)<.8?Math.round(hash(Math.floor(time*24))*2-1):0;px(c,x+540+r,150,26,18,'#8b8560');px(c,x+542+r,152,22,14,'#b8b07a');shape(c,[[x+555+r,154],[x+562+r,161],[x+555+r,168],[x+548+r,161]],'#a8402a');
    for(const sx of [x+40,x+600])line(c,sx,99,sx+4+Math.sin(time*2+sx)*3*(1+g),121,'#8a8e66');
    const p=[],amp=1.5+g*3;for(let a=0;a<=52;a+=4)p.push([x+520+a,78+Math.sin(time*4-a*.22)*amp*a/52]);for(let a=52;a>=0;a-=4)p.push([x+520+a,83+Math.sin(time*4-a*.22+.6)*amp*a/52]);shape(c,p,'#4f604a');
  }
  // The house is lit by one small battery fixture. Air moves the open upstairs curtain and mailbox lid;
  // neither the empty house nor its windows flickers like an industrial generator.
  function millerLife(c,camera,time,g){
    const x=4300-camera;if(x<-460||x>WIDTH+20)return;
    // Reopening the house preserves the front door state; the moving slab is separate from the cached frame.
    if(typeof houseState!=='undefined'&&houseState.doors.miller_front){
      const moving=houseState.doorMotion&&houseState.doorMotion.key==='miller_front',t=moving?houseState.doorMotion.progress:1,w=Math.max(13,Math.round(72*Math.cos(t*1.38)));
      px(c,x+84,75,72,130,'#23362f');px(c,x+89,82,62,111,'#2e4135');px(c,x+90,193,62,12,'#66583e');px(c,x+93,84,5,106,'#505746');
      px(c,x+84,75,w,130,'#586b56');px(c,x+85,77,Math.max(2,w-3),123,'#708065');px(c,x+86,78,2,123,'#a5a588');
      for(const yy of [84,147]){px(c,x+84+w*.18,yy,w*.64,44,'#3c5244');px(c,x+84+w*.22,yy+3,w*.5,37,yy===84?'#2e4840':'#65775c');}
      px(c,x+84+w-4,140,2,10,'#bda875');px(c,x+84+w-7,143,5,2,'#d4bd82');px(c,x+84+w-1,75,2,130,'#304739');
      line(c,x+86,178,x+84+w*.47,181,'#a58d61',4);line(c,x+84+w*.6,183,x+84+w-2,186,'#ad976b',4);
    }
    const wind=Math.sin(time*1.25)*1.7+Math.sin(time*.46)*.65+g*1.3;
    // The raised sash stays fixed while its narrow cream curtain pulls into Lucy's open window.
    shape(c,[[x+254,-40],[x+267,-40],[x+268+wind,-10],[x+272+wind,21],[x+260+wind,24],[x+256,-8]],'#979c86');
    line(c,x+258,-36,x+260+wind,20,'#b2b19a');line(c,x+264,-35,x+265+wind,18,'#7e8b78');
    // A paper bird is visible above the desk only at the larger camera reveal.
    line(c,x+307,-32,x+307+wind*.5,-19,'#8e9680');shape(c,[[x+300+wind*.5,-17],[x+306+wind*.5,-19],[x+312+wind*.5,-15],[x+306+wind*.5,-16],[x+303+wind*.5,-12]],'#babca1');
    // The mailbox flap hinges at the top; it never detaches from its post.
    const lift=1+Math.max(0,Math.sin(time*.9))*(2+g*2);px(c,x+1,151,25,2,'#728674');shape(c,[[x+1,152],[x+24,152],[x+23,154+lift],[x+1,154+lift]],'#99a288');px(c,x+12,154+lift,4,1,'#4b5d4c');
    px(c,x+184,84,5,5,'#e2bc82');px(c,x+185,85,3,2,'#ffdfa4');
    // Two tiny moths, limited to the light rather than a decorative particle shower.
    for(let i=0;i<2;i++){const a=time*(1.4+i*.3)+i*3.4;px(c,x+186+Math.cos(a)*12,88+Math.sin(a*1.3)*8,1,1,'#c2b58d');}
    if(typeof houseState!=='undefined'&&houseState.shortcut){line(c,x+358,49,x+409,207,'#c2b897');for(let n=0;n<13;n++){const t=(n+1)/14;line(c,x+358+51*t,49+157*t,x+376+51*t,49+157*t,'#c9bd97');}px(c,x+401,209,32,1,'#baaf8d');}
  }

  // Factory (world 4880, 2x): welding strobes inside the second window, a wall vent fan spins, the crane hook swings on
  // its chain, and the tower pipe vents a puff of steam every few seconds.
  function factoryLife(c,camera,time,g){
    const x=4880-camera;if(x<-560||x>WIDTH+40)return;
    const wl=weldLevel(time);if(wl>.03){px(c,x+109,93,5,5,'#d5edeb');px(c,x+108,98,9,2,'#80a99f');for(let k=0;k<4;k++){const ph=(time*2.5+k*.24)%1;px(c,x+112+(k-1.5)*ph*13,97+ph*14,1,2,'#ddc280');}c.globalAlpha=wl*.17;px(c,x+87,73,21,28,'#b2d3cc');c.globalAlpha=1;}
    px(c,x+379,95,19,4,'#314436');px(c,x+384,99,7,6,'#d4c68d');px(c,x+382,98,11,2,'#8d8d65');
    px(c,x+365,79,18,18,'#2f3a30');px(c,x+367,81,14,14,'#3d4a3e');for(let k=0;k<3;k++){const a=time*7+k*2.094;line(c,x+374,88,x+374+Math.cos(a)*6,88+Math.sin(a)*6,'#8a8a70');}px(c,x+373,87,3,3,'#a0a080');
    const ca=Math.sin(time*1.1)*.1*(1+g),hx=x+440+Math.sin(ca)*46,hy=21+Math.cos(ca)*46;line(c,x+440,21,hx,hy,'#5a5a48');line(c,x+441,21,hx+1,hy,'#3e3e30');px(c,hx-1,hy,3,4,'#6e6a58');px(c,hx-4,hy+3,4,2,'#6e6a58');
    const st=time%6;if(st<1.6){for(let i=0;i<5;i++){const age=(st-i*.12)/1.45;if(age<0||age>1)continue;c.globalAlpha=(1-age)*.5;px(c,x+432-age*22+Math.sin(time*3+i)*2,84-age*32,3+age*9,2+age*6,'#b8b6a8');}c.globalAlpha=1;}
  }
  // Road and fields: manhole steam in the evacuated blocks, fireflies over the farm field, reeds swaying in travelling
  // waves that bend together in a gust, and a tumbleweed about every 20 s rolling in from somewhere ahead of the camera.
  function roadLife(c,camera,time,g){
    for(const wx of [3320]){const x=wx-camera;if(x<-40||x>WIDTH+40)continue;px(c,x-12,297,24,3,'#2e332f');px(c,x-10,296,20,1,'#4d534b');for(let i=0;i<6;i++){const age=(time*.22+i/6)%1,s=3+age*9;c.globalAlpha=(1-age)*.2;px(c,x-s/2+Math.sin(time*.8+i*2)*5+age*8,294-age*42,s,s*.6,'#b9b7a5');}c.globalAlpha=1;}
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
    const from=Math.floor(camera/23)*23;for(let wx=from;wx<camera+WIDTH+23;wx+=23){if((wx>1700&&wx<2250)||(wx>3470&&wx<4240)||(wx>4300&&wx<4740))continue;const h=5+hash(wx)*11,wind=Math.sin(time*1.7+wx*.031)*2+g*3,sx=wx-camera,y=215;line(c,sx,y,sx+wind,y-h,'#5e5d3e');line(c,sx,y,sx-3+wind,y-h*.65,'#767048');if(hash(wx+1)>.6)px(c,sx+wind-1,y-h-1,3,2,'#847a4c');}
    // Single drifting leaves, widely spaced; particle timing follows world time.
    for(let i=0;i<5;i++){const period=11+i*2,progress=(time/period+i*.213)%1;const wx=Math.floor(camera/900)*900+progress*1000;const x=wx-camera;if(x<-20||x>WIDTH+20)continue;const y=162+Math.sin(progress*9+i)*23+i*7;px(c,x,y,3,1,i%2?'#8a7a46':'#9c8a55');}
    // A restrained, distant flock passes above the horizon.
    const flockSpan=WIDTH+310;for(let i=0;i<4;i++){const x=((time*5+i*13+311-camera*.12)%flockSpan+flockSpan)%flockSpan-140,y=46+Math.sin(time*.3+i)*4+i*2;const flap=Math.sin(time*5+i)>.0?1:-1;line(c,x-2,y+flap,x,y,'#685b3b');line(c,x,y,x+2,y+flap,'#685b3b');}
    barnLife(c,camera,time,g);stationLife(c,camera,time,g);carLife(c,camera,time,g);checkpointLife(c,camera,time,g);millerLife(c,camera,time,g);factoryLife(c,camera,time,g);
  }
  function draw(c,camera,time){
    sky(c,camera,time);
    distantStructures(c,camera,time);
    for(let index=Math.floor(camera/TILE);index<=Math.floor((camera+WIDTH)/TILE);index++)c.drawImage(getTile(index),Math.round(index*TILE-camera),-160);
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
    if(g.tint){c.save();c.globalCompositeOperation='soft-light';c.fillStyle=g.tint;c.fillRect(0,-80,WIDTH,HEIGHT+80);c.restore();}
    if(g.vignette){c.fillStyle=g.vignette;c.fillRect(0,-80,WIDTH,HEIGHT+80);}
  }
  // In front of the action: kerb grass, a plastic bag tumbling across the road at knee height about every 13 s,
  // and dust blown along the road surface while a gust lasts.
  function foreground(c,camera,time){const g=gust(time);
    for(let wx=Math.floor(camera/71)*71;wx<camera+WIDTH+71;wx+=71){const x=wx-camera,h=6+hash(wx)*5,wind=Math.sin(time*1.5+wx)*1.4+g*3;line(c,x,330,x+wind,330-h,'#4e5238');line(c,x+2,330,x+5+wind,329-h*.6,'#6a6848');if(hash(wx+9)>.7)px(c,x+16,329,6,1,'#8a8262');}
    // Low roadside clutter under the feet line (y 318..330): rock, bottle, drain grate, paper, chain, fallen sign edge, can.
    for(let wx=Math.floor(camera/157)*157;wx<camera+WIDTH+157;wx+=157){const x=wx-camera+hash(wx+5)*120,k=Math.floor(hash(wx+3)*7);
      if(k===0){px(c,x,322,5,4,'#5b5a4f');px(c,x+1,321,3,1,'#726f60');}
      else if(k===1){px(c,x,323,7,3,'#5f7a6a');px(c,x+7,324,2,1,'#4a6050');px(c,x+1,323,4,1,'#7a9a8a');}
      else if(k===2){px(c,x,324,18,4,'#2b302e');for(let b=2;b<18;b+=4)px(c,x+b,325,1,2,'#4a4f4b');}
      else if(k===3){px(c,x,323,5,3,'#b5b0a0');px(c,x+1,324,3,1,'#8f8b80');}
      else if(k===4){for(let b=0;b<20;b+=4)px(c,x+b,324+(b%8?1:0),3,2,b%8?'#7a7e78':'#5a5e58');}
      else if(k===5){px(c,x,322,24,3,'#8f8a70');px(c,x,325,24,2,'#6a6a5a');px(c,x+18,322,6,3,'#8a4a3a');}
      else{px(c,x,323,5,3,'#8a8a80');px(c,x+1,323,2,3,'#9a4a3a');}
    }
    const P=13,epoch=Math.floor(time/P),t=time-epoch*P;if(bag.epoch!==epoch){bag.epoch=epoch;bag.x0=camera-40+hash(epoch+91)*WIDTH*.5;bag.y0=262+hash(epoch+92)*30;}
    if(t<9){const x=bag.x0+t*75+(gustTravel(time)-gustTravel(epoch*P))*70+Math.sin(t*2.7)*6-camera;if(x>-12&&x<WIDTH+12){const y=bag.y0+Math.sin(t*3.1)*9+Math.sin(t*7)*3,fl=Math.sin(t*11)*2;px(c,x,y,5,3,'#d8d2b8');px(c,x+3,y-2+fl,4,3,'#c9c3a8');px(c,x+1,y+2-fl,3,2,'#e2dcc2');}}
    if(g>0){const t=(time%15)/2,gi=Math.floor(time/15);c.globalAlpha=g*.35*(1-t);for(let k=0;k<7;k++){const x=hash(k+gi*3)*(WIDTH+80)-40+t*260,y=232+hash(k+gi*3+50)*84;px(c,x,y,8+k,2,'#9a8f6a');}c.globalAlpha=1;}
  }
  function setWidth(w){if(Number.isFinite(w)&&w>0)WIDTH=Math.round(w);}
  function width(){return WIDTH;}
  // Doors that lead off the road. The barn door is the first barn's big door (landmark x 300 + local door 38..82 at
  // 2x = world 376..464, centre 420, 88 px wide). The store door is the gas station's shop entrance (landmark x 1690 +
  // local door centre 263 at 2x = 2216, 68 px wide); game.js reads this to place the portal marker and the prompt.
  const portals=[{x:420,w:88,target:'barn',targetX:120,label:'进入谷仓'},{x:2216,w:68,target:'store',targetX:110,label:'进入商店'},{x:4420,w:72,target:'house_ground',targetX:105,targetY:292,targetFace:1,id:'miller_front',doorKey:'miller_front',label:'进入17号住宅'}];
  return {draw,foreground,grade,sectorAt,setWidth,width,portals,lightSources};
})();

function drawWorld(c,cameraX,time){worldArt.draw(c,cameraX,time);}
function drawWorldForeground(c,cameraX,time){worldArt.foreground(c,cameraX,time);}
function drawWorldGrade(c){worldArt.grade(c);}
function setWorldWidth(w){worldArt.setWidth(w);}
function getWorldSector(worldX){return worldArt.sectorAt(worldX);}
const WORLD_PORTALS=worldArt.portals;

function getWorldLights(camera,time){return worldArt.lightSources(camera,time);}
