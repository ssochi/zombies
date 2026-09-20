'use strict';
// 17号住宅 · shared drawing kit, room registry and frame.
// The rooms themselves live in house-ground.js (一楼), house-upper.js (二楼三间), house-wet.js (浴室/卫生间/洗衣维修间)
// and house-roof.js (门廊屋顶); each calls houseArt.registerRoom(). Everything here is in physical room pixels:
// characters walk y 246..312 (feet at 292), a standing adult is ~120 tall, doors are 45 wide x 142 tall (y 96..238),
// the ceiling band is y 0..60, the dado rail sits at y 178, the floor starts at y 240 and the dark near lip at 316.
// Value ladder (what makes the barn/store read): ceiling darkest, floor dark, wainscot mid-dark, upper wall mid,
// linens/paper light, one or two saturated accents per room. Every solid prop gets a dark side, a light top, a
// contact shadow and a 1px dark edge so it sits on the floor instead of floating.
const houseArt=(()=>{
  const H=330,CEIL=60,FLOOR=240,DADO=178,BASE=232,LIP=316;
  const cache=new Map(),rooms={};
  const hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  const px=(c,x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(0,Math.ceil(w)),Math.max(0,Math.ceil(h)));};
  function poly(c,pts,col){c.fillStyle=col;c.beginPath();pts.forEach((p,i)=>i?c.lineTo(Math.round(p[0]),Math.round(p[1])):c.moveTo(Math.round(p[0]),Math.round(p[1])));c.closePath();c.fill();}
  function line(c,x,y,xx,yy,col,w=1){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(Math.round(x)+.5,Math.round(y)+.5);c.lineTo(Math.round(xx)+.5,Math.round(yy)+.5);c.stroke();}
  function text(c,s,x,y,col='#d8ceaa',size=6){c.fillStyle=col;c.font=`bold ${size}px monospace`;c.textBaseline='alphabetic';c.fillText(s,Math.round(x),Math.round(y));}
  // tone(): darken (k<1) or lighten (k>1) a hex colour, so one base colour yields its shadow and highlight sides.
  function tone(col,k){const n=parseInt(col.slice(1),16);const f=v=>Math.max(0,Math.min(255,Math.round(v*k)));return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`;}
  function alpha(c,a,fn){const old=c.globalAlpha;c.globalAlpha=a;fn();c.globalAlpha=old;}
  // shadow(): the contact shadow under anything standing on the floor. edge(): a 1px dark outline.
  function shadow(c,x,y,w,h=3,a=.38){alpha(c,a,()=>px(c,x-2,y,w+4,h,'#0d100c'));alpha(c,a*.5,()=>px(c,x-4,y+h,w+8,2,'#0d100c'));}
  function edge(c,x,y,w,h,col='#1c1a14',a=.55){alpha(c,a,()=>{px(c,x,y,w,1,col);px(c,x,y+h-1,w,1,col);px(c,x,y,1,h,col);px(c,x+w-1,y,1,h,col);});}
  const P={ink:'#1c1a14',brass:'#e0b64f',brassDim:'#8d7233',paper:'#d8ceaa',cream:'#e0d8b0',linen:'#cfc8ad',linenLo:'#a9a289',
    walnut:'#4a3628',walnutHi:'#6f533b',walnutLo:'#33241a',oak:'#7a5c3c',oakHi:'#9a7a52',oakLo:'#563f2a',pine:'#a08a62',pineHi:'#bfa97c',pineLo:'#75633f',
    green:'#3f5a45',greenHi:'#587459',greenLo:'#2b3f30',oxblood:'#6d3a2e',mustard:'#c9a84e',navy:'#3c4a5c',
    enamel:'#d5d9cf',enamelLo:'#98a29b',enamelHi:'#eef0e8',steel:'#7c8680',steelLo:'#4c5450',tile:'#5f7c74',tileLo:'#3f5551',tileHi:'#7a958c',
    glass:'#9fc6cc',blood:'#3a1512',bloodDry:'#2a0f0c'};
  // ---- Shell palettes: one per room family. Every band is a real value step away from its neighbours. ----
  const STYLE={
    ground:{ceil:'#181915',joist:'#201f18',cornice:['#6a5b45','#3b3226'],wall:'#847559',wallAlt:'#7d6f54',wallHi:'#918266',pattern:'stripe',dado:['#8a7452','#4b3c2b'],wain:'#5f5342',wainPanel:'#554a3b',wainHi:'#6e6250',base:['#3a2e22','#55463a'],floor:['#3b2f24','#41342a','#382c22','#443729'],seam:'#261e16',flHi:'#5a4832',lip:'#1f1913',side:'#241f18',sideHi:'#3a3125'},
    upper:{ceil:'#171a18',joist:'#1e2220',cornice:['#5f6663','#383d3b'],wall:'#717d81',wallAlt:'#6c787c',wallHi:'#7f8b8e',pattern:'lattice',dado:['#7b8582','#454e4d'],wain:'#515b5c',wainPanel:'#485253',wainHi:'#5f6969',base:['#30373a','#4a5254'],floor:['#3a332e','#3f3732','#352e2a','#433b35'],seam:'#26201c',flHi:'#584a3e',lip:'#1c1a18',side:'#211f1c',sideHi:'#36322e'},
    child:{ceil:'#181a17',joist:'#20221e',cornice:['#6c6a58','#3d3c32'],wall:'#828575',wallAlt:'#7d8070',wallHi:'#8f927f',pattern:'floral',dado:['#a89769','#5c5138'],wain:'#8a8161',wainPanel:'#7f7658',wainHi:'#9b916d',base:['#443e2c','#5f5843'],floor:['#3c352d','#423a31','#372f28','#453d33'],seam:'#27211a',flHi:'#5a4d3b',lip:'#1e1b16',side:'#24211a',sideHi:'#38342a'},
    tile:{ceil:'#161a19',joist:'#1d2221',cornice:['#67716e','#3b4441'],wall:'#78867f',wallAlt:'#74827b',wallHi:'#86948c',pattern:'plain',dado:['#b3bfb3','#5f6f68'],wain:'tile',tile:['#5c7a72','#587670','#607e76'],grout:'#3a4f4a',tileHi:'#7e9990',base:['#354441','#546561'],floor:'tile',fl:['#454e4b','#3e4744','#4a524f'],seam:'#2b3331',lip:'#1c2221',side:'#1f2624',sideHi:'#354140'},
    utility:{ceil:'#17181a',joist:'#1f2023',cornice:['#5d6060','#37393a'],wall:'#6f746c',wallAlt:'#6a6f68',wallHi:'#7c8178',pattern:'block',dado:['#8e9188','#4d5049'],wain:'#575b55',wainPanel:'#50544e',wainHi:'#646861',base:['#33362f','#4c4f47'],floor:'concrete',fl:['#3f4039','#43443d','#3b3c35'],seam:'#2b2c27',lip:'#1c1d19',side:'#202119',sideHi:'#34352e'}
  };
  function ceiling(c,L,st){
    px(c,0,0,L,CEIL,st.ceil);
    for(let x=14;x<L;x+=40){px(c,x,0,3,CEIL,st.joist);px(c,x,0,1,CEIL,tone(st.joist,1.25));}
    for(let i=0;i<Math.ceil(L/160);i++){const n=i*17+3,x=hash(n)*L;line(c,x,4+hash(n+1)*30,x+8+hash(n+2)*30,8+hash(n+3)*34,tone(st.ceil,1.3));}
    // Crown moulding: a lit top face, a dark undercut and a thin lip on the wall.
    px(c,0,CEIL,L,3,st.cornice[0]);px(c,0,CEIL+3,L,3,st.cornice[1]);px(c,0,CEIL+6,L,1,tone(st.cornice[0],1.15));
  }
  function wallpaper(c,L,st,y0,y1){
    px(c,0,y0,L,y1-y0,st.wall);
    if(st.pattern==='stripe'){for(let x=0;x<L;x+=14){px(c,x,y0,6,y1-y0,st.wallAlt);px(c,x+9,y0,1,y1-y0,st.wallHi);}}
    else if(st.pattern==='lattice'){for(let y=y0+4;y<y1;y+=12)for(let x=(Math.round((y-y0)/12)%2)*6;x<L;x+=12){px(c,x,y,1,1,st.wallHi);px(c,x+3,y+6,2,1,st.wallAlt);}}
    else if(st.pattern==='floral'){for(let y=y0+6;y<y1;y+=18)for(let x=(Math.round((y-y0)/18)%2)*11;x<L;x+=22){px(c,x,y,3,1,st.wallHi);px(c,x+1,y-1,1,3,st.wallHi);px(c,x+1,y,1,1,st.wallAlt);px(c,x+2,y+3,1,2,tone(st.wallAlt,.9));}}
    else if(st.pattern==='block'){for(let y=y0;y<y1;y+=16){px(c,0,y,L,1,st.wallAlt);for(let x=(Math.round((y-y0)/16)%2)*22;x<L;x+=44)px(c,x,y,1,16,st.wallAlt);}}
    // Ageing: darker patches near corners and the dado, one or two scuffs, never a uniform grime layer.
    for(let i=0;i<Math.ceil(L/90);i++){const n=i*13+5,x=hash(n)*L,y=y1-8-hash(n+1)*26;alpha(c,.16,()=>px(c,x,y,10+hash(n+2)*30,3+hash(n+3)*8,'#2c2418'));}
    alpha(c,.12,()=>px(c,0,y1-14,L,14,'#1e1a12'));alpha(c,.1,()=>px(c,0,y0,L,4,'#fff5d8'));
  }
  function wainscot(c,L,st){
    px(c,0,DADO,L,3,st.dado[0]);px(c,0,DADO+3,L,2,st.dado[1]);px(c,0,DADO,L,1,tone(st.dado[0],1.2));
    if(st.wain==='tile'){
      px(c,0,DADO+5,L,BASE-DADO-5,st.grout);
      for(let y=DADO+5,r=0;y<BASE;y+=12,r++)for(let x=(r%2)*11;x<L;x+=22){const col=st.tile[Math.floor(hash(x*3+y)*st.tile.length)];px(c,x+1,y+1,20,10,col);px(c,x+1,y+1,20,1,st.tileHi);px(c,x+1,y+1,1,10,st.tileHi);}
      return;
    }
    px(c,0,DADO+5,L,BASE-DADO-5,st.wain);
    for(let x=6;x<L;x+=44){px(c,x+4,DADO+10,34,BASE-DADO-18,st.wainPanel);px(c,x+4,DADO+10,34,1,tone(st.wainPanel,.8));px(c,x+4,DADO+10,1,BASE-DADO-18,tone(st.wainPanel,.8));px(c,x+4,BASE-9,34,1,st.wainHi);px(c,x+37,DADO+10,1,BASE-DADO-18,st.wainHi);}
    px(c,0,DADO+5,L,1,st.wainHi);
  }
  function baseboard(c,L,st){px(c,0,BASE,L,FLOOR-BASE,st.base[0]);px(c,0,BASE,L,2,st.base[1]);px(c,0,FLOOR-1,L,1,tone(st.base[0],.7));}
  const ROWS=[240,247,255,264,274,286,299,314,330];
  function planks(c,L,st){
    px(c,0,FLOOR,L,H-FLOOR,st.floor[0]);
    for(let r=0;r<ROWS.length-1;r++){
      const y0=ROWS[r],y1=ROWS[r+1];let x=-Math.round(hash(r*7)*90);
      while(x<L){const w=64+Math.round(hash(r*31+x)*70),col=st.floor[Math.floor(hash(r*5+x*.3)*st.floor.length)];px(c,x,y0,w,y1-y0,col);px(c,x+w-1,y0,1,y1-y0,st.seam);
        if(hash(r*3+x)>.72)px(c,x+6,y0+1,w-14,1,tone(col,1.12));if(hash(r*9+x)>.86)px(c,x+4+hash(x)*20,y0+2+hash(x+1)*(y1-y0-3),8+hash(x+2)*16,1,st.seam);x+=w;}
      px(c,0,y0,L,1,st.seam);
    }
    // The near rows are darker: the camera is looking slightly down at a dim room.
    for(let r=5;r<ROWS.length-1;r++)alpha(c,.08*(r-4),()=>px(c,0,ROWS[r],L,ROWS[r+1]-ROWS[r],'#0c0d0b'));
    alpha(c,.3,()=>px(c,0,FLOOR,L,4,'#0c0d0b'));
  }
  function tileFloor(c,L,st){
    px(c,0,FLOOR,L,H-FLOOR,st.seam);const vanish=L*.5;
    for(let r=0;r<ROWS.length-1;r++){const y0=ROWS[r],y1=ROWS[r+1],a=.8+(y0-FLOOR)*.0035,b=.8+(y1-FLOOR)*.0035;
      for(let base=-160,k=0;base<L+160;base+=24,k++){const x0=vanish+(base-vanish)*a,x1=vanish+(base+24-vanish)*a,x2=vanish+(base+24-vanish)*b,x3=vanish+(base-vanish)*b;
        poly(c,[[x0+1,y0+1],[x1,y0+1],[x2,y1],[x3+1,y1]],st.fl[(r+k)%st.fl.length]);if(hash(base+r*51)>.9)line(c,x0+4,y0+2,x2-4,y1-2,tone(st.fl[0],.8));}
      px(c,0,y0,L,1,st.seam);}
    for(let r=5;r<ROWS.length-1;r++)alpha(c,.08*(r-4),()=>px(c,0,ROWS[r],L,ROWS[r+1]-ROWS[r],'#0c0d0b'));
    alpha(c,.3,()=>px(c,0,FLOOR,L,4,'#0c0d0b'));
  }
  function concreteFloor(c,L,st){
    px(c,0,FLOOR,L,H-FLOOR,st.fl[0]);
    for(let i=0;i<L/6;i++){const n=i*29+7,x=hash(n)*L,y=FLOOR+hash(n+1)*(H-FLOOR);px(c,x,y,3+hash(n+2)*14,1+hash(n+3)*2,st.fl[1+Math.floor(hash(n+4)*2)]);}
    for(let i=0;i<L/140;i++){const n=i*17+3,x=hash(n)*L,y=FLOOR+10+hash(n+1)*70;line(c,x,y,x+20+hash(n+2)*30,y+4+hash(n+3)*14,st.seam);}
    for(let x=0;x<L;x+=110)px(c,x,FLOOR,1,H-FLOOR,st.seam);
    for(let r=5;r<ROWS.length-1;r++)alpha(c,.08*(r-4),()=>px(c,0,ROWS[r],L,ROWS[r+1]-ROWS[r],'#0c0d0b'));
    alpha(c,.3,()=>px(c,0,FLOOR,L,4,'#0c0d0b'));
  }
  // shell(): ceiling, wall, dado, wainscot, baseboard, floor and the two side returns. Rooms dress on top of it.
  function shell(c,L,style='ground'){
    const st=STYLE[style]||STYLE.ground;
    ceiling(c,L,st);wallpaper(c,L,st,CEIL+7,DADO);wainscot(c,L,st);baseboard(c,L,st);
    if(st.floor==='tile')tileFloor(c,L,st);else if(st.floor==='concrete')concreteFloor(c,L,st);else planks(c,L,st);
    px(c,0,CEIL,10,H-CEIL,st.side);px(c,9,CEIL,2,FLOOR-CEIL,st.sideHi);px(c,L-10,CEIL,10,H-CEIL,st.side);px(c,L-12,CEIL,2,FLOOR-CEIL,tone(st.side,1.3));
    return st;
  }
  // deadPendant(): an unpowered ceiling light. The stem hangs from the joist; the glass is opaque and dark.
  function deadPendant(c,x,drop=22,kind='shade'){
    px(c,x-3,CEIL-2,7,3,'#2b2a22');line(c,x,CEIL,x,CEIL+drop,'#3c3a30');
    if(kind==='shade'){poly(c,[[x-15,CEIL+drop+9],[x-6,CEIL+drop],[x+6,CEIL+drop],[x+15,CEIL+drop+9]],'#6b6650');px(c,x-13,CEIL+drop+9,26,2,'#8d8669');px(c,x-4,CEIL+drop+11,8,3,'#4c4a3c');poly(c,[[x-15,CEIL+drop+9],[x-6,CEIL+drop],[x-2,CEIL+drop],[x-9,CEIL+drop+9]],'#7d7860');}
    else{px(c,x-5,CEIL+drop,10,12,'#5d5a4b');px(c,x-6,CEIL+drop+11,12,3,'#7c7660');px(c,x-4,CEIL+drop+1,3,10,'#6f6b57');}
  }
  // ---- Openings ----
  function outsideView(c,x,y,w,h,view){
    const sky=view==='road'?[['#4a5a68',0],['#6d6f6b',.24],['#a37c5c',.44],['#c8865a',.55]]:[['#46555f',0],['#647068',.28],['#8a7f66',.5],['#a58a5f',.6]];
    for(let i=0;i<sky.length;i++){const y0=y+h*sky[i][1],y1=i+1<sky.length?y+h*sky[i+1][1]:y+h*.62;px(c,x,y0,w,y1-y0+1,sky[i][0]);}
    if(view==='road'){px(c,x,y+h*.62,w,h*.38,'#3c4234');for(let i=0;i<3;i++){const bx=x+8+i*(w/3),bh=8+hash(i+x)*14;px(c,bx,y+h*.62-bh,10+hash(i)*14,bh,'#4a4a3f');}
      for(let i=0;i<2;i++){const bx=x+w*.25+i*w*.45;px(c,bx,y+h*.3,2,h*.32,'#2e3129');px(c,bx-5,y+h*.32,12,1,'#2e3129');}line(c,x,y+h*.36,x+w,y+h*.34,'#2e3129');px(c,x,y+h*.76,w,2,'#5a5a4a');}
    else{poly(c,[[x,y+h*.62],...Array.from({length:9},(_,i)=>[x+i*w/8,y+h*.62-6-hash(i+x)*16]),[x+w,y+h*.62],[x+w,y+h]],'#2f3d2f');px(c,x,y+h*.7,w,h*.3,'#3a4433');for(let fx=x+3;fx<x+w;fx+=9){px(c,fx,y+h*.78,2,h*.22,'#5b5342');}px(c,x,y+h*.82,w,2,'#6a6250');}
  }
  // windowFrame(): painted casing, sash with a cross bar, a lit sill, the dusk view outside, tinted glass with two reflections.
  function windowFrame(c,x,y,w=90,h=84,opts={}){
    const view=opts.view||'road',broken=!!opts.broken;
    px(c,x-7,y-7,w+14,h+13,'#2e2519');px(c,x-6,y-6,w+12,h+11,'#aa9c78');px(c,x-6,y-6,w+12,2,'#c7b892');px(c,x-6,y-6,2,h+11,'#c7b892');px(c,x+w+4,y-6,2,h+11,'#7c6f52');
    px(c,x-2,y-2,w+4,h+2,'#211c16');
    const paintView=()=>outsideView(c,x,y,w,h,view);
    paintView();
    if(broken){
      // The shattered lower-right pane shows the outside without tint; shards are still in the frame.
      alpha(c,.2,()=>px(c,x,y,w,h,P.glass));
      c.save();c.beginPath();const hx=x+w*.5,hy=y+h*.5;[[hx+4,hy-2],[x+w-3,hy+4],[x+w-6,y+h-4],[hx+10,y+h-3],[hx+2,hy+18]].forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.clip();paintView();c.restore();
      for(const [a,b] of [[[hx+4,hy-2],[x+w-3,hy+4]],[[hx+2,hy+18],[hx+10,y+h-3]],[[hx+4,hy-2],[hx+2,hy+18]]])line(c,a[0],a[1],b[0],b[1],'#d6e6e2');
      line(c,x+w*.6,y+h*.5,x+w*.68,y+h*.44,'#c0d5cf');line(c,x+w*.9,y+h*.62,x+w*.84,y+h*.72,'#c0d5cf');
    }else{alpha(c,.2,()=>px(c,x,y,w,h,P.glass));alpha(c,.45,()=>{line(c,x+6,y+h*.42,x+w*.34,y+4,'#dbe9e4');line(c,x+12,y+h*.55,x+w*.46,y+7,'#dbe9e4');});}
    px(c,x+Math.round(w*.5)-1,y,3,h,'#bfb28c');px(c,x,y+Math.round(h*.52),w,3,'#bfb28c');px(c,x+Math.round(w*.5)-1,y,1,h,'#d9cca4');px(c,x,y+Math.round(h*.52),w,1,'#d9cca4');
    px(c,x-9,y+h,w+18,5,'#b9ab86');px(c,x-9,y+h,w+18,1,'#d3c59d');px(c,x-9,y+h+5,w+18,2,'#5f5340');px(c,x-6,y+h+7,w+12,1,'#3a3126');
    if(opts.latch){px(c,x+Math.round(w*.5)-4,y+Math.round(h*.52)-4,9,3,'#8d8a6f');px(c,x+Math.round(w*.5)-1,y+Math.round(h*.52)-6,3,3,'#b3ad8c');}
  }
  // windowLight(): the composited light source for a window; the room's lights() returns these.
  function windowLight(x,y,w,h,opts={}){return {x:x+w/2,y:y+h/2,color:opts.color||'#a9bfc1',radius:opts.radius||Math.max(w,h)*1.7,intensity:opts.intensity||.24,floorY:opts.floorY||268,floorWidth:opts.floorWidth||w*1.4};}
  // door(): casing, dark reveal, six-panel leaf that swings away as progress runs 0..1 when open.
  function door(c,x,open=false,detail='',progress=1){
    const y=96,h=142,ox=x-22,ow=45;
    px(c,ox-8,y-8,ow+16,h+8,'#2a2019');px(c,ox-7,y-7,ow+14,h+7,'#6b5238');px(c,ox-7,y-7,ow+14,2,'#8c7050');px(c,ox-7,y-7,2,h+7,'#8c7050');px(c,ox+ow+5,y-7,2,h+7,'#4a3826');
    px(c,ox-2,y-2,ow+4,h+2,'#1b1712');px(c,ox,y,ow,h,'#111414');px(c,ox,y+h-7,ow,7,'#2a2622');px(c,ox,y+h-7,ow,1,'#3b3630');
    const p=open?Math.max(0,Math.min(1,progress)):0,leafW=Math.round(ow-(ow-9)*p),base=open?'#5e4730':'#78593a';
    px(c,ox,y,leafW,h,base);px(c,ox,y,leafW,1,tone(base,1.3));px(c,ox,y,1,h,tone(base,1.3));px(c,ox+leafW-1,y,1,h,tone(base,.6));
    if(p<.3){
      for(const [py,ph] of [[9,30],[47,40],[95,36]])for(const pxx of [5,24]){const sx=ox+pxx,sw=16;px(c,sx,y+py,sw,ph,tone(base,.72));px(c,sx+1,y+py+1,sw-2,ph-2,tone(base,.92));px(c,sx+1,y+py+ph-2,sw-2,1,tone(base,1.2));px(c,sx+sw-2,y+py+1,1,ph-2,tone(base,1.2));}
      px(c,ox+ow-9,y+70,5,3,P.brass);px(c,ox+ow-8,y+69,3,5,P.brass);px(c,ox+ow-10,y+67,2,9,P.brassDim);px(c,ox+ow-8,y+79,2,5,P.brassDim);
      for(let g=0;g<7;g++)alpha(c,.14,()=>px(c,ox+3+hash(g+x)*(ow-6),y+8+hash(g+x+77)*(h-16),1,4+hash(g+18)*10,'#1a1208'));
    }else{px(c,ox+leafW-3,y+68,2,6,P.brass);}
    px(c,ox-5,y+h,ow+10,3,'#5c4b37');px(c,ox-5,y+h,ow+10,1,'#8c7452');px(c,ox-3,y+h+3,ow+6,1,'#2b241b');
    if(detail==='scar'&&!open){for(let i=0;i<6;i++){line(c,ox+8+i*5,120+(i%3)*10,ox+3+i*5,152+(i%3)*10,'#b09371');line(c,ox+9+i*5,120+(i%3)*10,ox+4+i*5,152+(i%3)*10,'#3f2c1c');}px(c,ox+ow-16,y+h-3,10,3,'#4a3623');}
  }
  // ---- Stairs. Ground floor: the climb runs x 400..490 (feet y 292..232), a quarter landing, then a steeper far run that
  // vanishes into the stairwell. Landing floor: the top step is at x 180 and the flight drops down-left toward the camera. ----
  function stairsUp(c,x){
    // Stairwell alcove: a recess in the wall with a cased header. The far run climbs across it at 45° and turns
    // behind the right jamb, so it never has to reach the ceiling inside the frame.
    const ax=x+140,aw=74,at=CEIL+6,ab=DADO+6;
    alpha(c,.55,()=>px(c,ax,at,aw,ab-at,'#14120d'));px(c,ax,at,aw,3,'#0f0e0a');
    px(c,ax-4,at,4,ab-at,'#6b5238');px(c,ax-4,at,1,ab-at,'#8c7050');px(c,ax+aw,at,4,ab-at,'#4a3826');px(c,ax+aw+3,at,1,ab-at,'#241b12');
    px(c,ax-6,at-2,aw+12,7,'#6b5238');px(c,ax-6,at-2,aw+12,1,'#8c7050');px(c,ax-6,at+4,aw+12,1,'#3a2a1c');
    // Far run: eight treads from the quarter landing up and to the right.
    poly(c,[[x+126,232],[x+126,244],[x+216,154],[x+216,142]],'#4c3a28');
    for(let i=0;i<8;i++){const sx=x+128+i*11,sy=232-i*11;px(c,sx,sy-11,12,11,'#5a4632');px(c,sx,sy-11,12,3,'#9c8560');px(c,sx,sy-11,12,1,'#bda583');px(c,sx+1,sy-8,11,1,'#3e2f20');}
    for(let i=0;i<6;i++){const bx=x+136+i*14,by=222-i*14;line(c,bx,by,bx,by-22,'#8b7352',2);}line(c,x+128,204,x+214,118,'#a88c66',3);
    px(c,x+124,190,6,50,'#5d4832');px(c,x+123,187,8,4,'#8c7250');
    // Quarter landing, its newel post, and the battery lamp Noah clipped to the wall above it.
    px(c,x+88,232,40,10,'#5a4632');px(c,x+88,232,40,3,'#9c8560');px(c,x+88,232,40,1,'#bda583');px(c,x+88,241,40,3,'#3b2d1f');
    px(c,x+86,228,8,20,'#4a3826');px(c,x+85,225,10,4,'#7a5f43');px(c,x+86,226,8,1,'#a08760');
    px(c,x+117,176,10,7,'#5b5548');px(c,x+119,178,6,3,'#f6dca5');line(c,x+122,183,x+122,200,'#3b3830');line(c,x+122,200,x+112,232,'#3b3830');
    // Closed skirt under the near run: painted panels and a cap rail; the child's height marks are pencilled beside it.
    poly(c,[[x-6,300],[x-6,292],[x+92,226],[x+92,300]],'#55463a');poly(c,[[x-2,298],[x-2,294],[x+88,232],[x+88,298]],'#4a3d31');
    for(let i=0;i<4;i++){const sx=x+6+i*22,top=292-(sx-x)*.667+4;px(c,sx,top,16,296-top,'#3f342a');px(c,sx,top,16,1,'#6b5a48');px(c,sx,top,1,296-top,'#6b5a48');}
    line(c,x-4,292,x+90,229,'#8f7654',3);
    for(let i=0;i<9;i++){const sx=x+i*10,sy=292-i*6.67;px(c,sx,sy-7,11,7,'#6a5439');px(c,sx,sy-7,12,3,'#a08a62');px(c,sx,sy-7,12,1,'#c3ab84');px(c,sx+1,sy-4,10,1,'#4d3b27');}
    shadow(c,x-4,300,98,3,.35);
    for(let i=0;i<5;i++){const yy=150+i*13;px(c,x+34+(i%2)*3,yy,9,1,'#5b5040');}text(c,'L·9',x+30,148,'#5b5040',5);text(c,'L·7',x+30,175,'#5b5040',5);
  }
  function stairsUpFront(c,x){
    // Near balustrade, drawn over the player during a climb.
    for(let i=0;i<7;i++){const bx=x+5+i*14,by=249-i*9.4;line(c,bx,by,bx,by+48,'#6d573c',2);px(c,bx-1,by+47,3,2,'#3f3122');}
    line(c,x-1,251,x+99,191,'#b4996f',4);line(c,x-1,254,x+99,194,'#4f3f2a',2);px(c,x-1,245,6,58,'#6a5238');px(c,x-1,245,6,2,'#c7ab7c');px(c,x-2,243,8,3,'#8a6f4c');px(c,x-1,301,6,3,'#3a2c1e');
  }
  function stairsDown(c,x){
    // The flight drops toward the camera-left from the nosing at y 286; only tread tops are visible, each one lower and
    // further left. The open well on the far side is dark; a closed stringer runs down the near-right edge.
    poly(c,[[x-40,286],[x+20,286],[x-29,330],[x-95,330]],'#0e0d0a');
    poly(c,[[x-40,286],[x-95,286],[x-95,330]],'#221d17');px(c,x-95,286,55,3,'#3a3128');
    for(let i=0;i<7;i++){const sx=x-40-i*7,sy=286+i*7;px(c,sx,sy,60,4,'#8d7757');px(c,sx,sy,60,1,'#b49a74');px(c,sx,sy+4,60,3,'#2a2118');px(c,sx-1,sy,1,4,'#5a4632');}
    poly(c,[[x+20,286],[x+30,286],[x-19,330],[x-29,330]],'#4a3d31');line(c,x+29,287,x-20,329,'#6b5a48');
    px(c,x-42,282,66,4,'#a08a62');px(c,x-42,282,66,1,'#c3ab84');px(c,x-42,286,66,1,'#5a4632');
    px(c,x+18,262,8,26,'#4a3826');px(c,x+17,259,10,4,'#7a5f43');px(c,x+18,260,8,1,'#a08760');
  }
  function stairsDownFront(c,x){
    line(c,x+19,245,x-35,293,'#b4996f',4);line(c,x+19,248,x-35,296,'#4f3f2a',2);for(let i=0;i<6;i++){const bx=x+19-i*9,by=245+i*8;line(c,bx,by,bx,by+46,'#6d573c',2);}
    px(c,x+17,241,6,53,'#6a5238');px(c,x+17,241,6,2,'#c7ab7c');px(c,x+16,239,8,3,'#8a6f4c');
  }
  // ---- Furniture primitives. y is always the floor contact line. ----
  function cabinet(c,x,y,w,h,col=P.walnut,opts={}){
    const lo=tone(col,.7),hi=tone(col,1.3),drawers=opts.drawers||0,doors=opts.doors===undefined?(drawers?0:2):opts.doors;
    shadow(c,x,y-1,w,4);px(c,x,y-h,w,h,col);px(c,x+w-3,y-h,3,h,lo);px(c,x,y-4,w,4,tone(col,.55));
    if(opts.top!==false){px(c,x-2,y-h-3,w+4,4,hi);px(c,x-2,y-h-3,w+4,1,tone(col,1.6));px(c,x-2,y-h+1,w+4,1,tone(col,.5));}
    const top=y-h+3,inner=h-9;
    if(drawers){const dh=Math.floor((inner-2)/drawers);for(let i=0;i<drawers;i++){const dy=top+i*dh;px(c,x+3,dy+1,w-8,dh-2,tone(col,.88));px(c,x+3,dy+1,w-8,1,hi);px(c,x+3,dy+dh-2,w-8,1,tone(col,.5));const open=opts.open===i;if(open){px(c,x+2,dy+2,w-5,dh-3,tone(col,1.05));px(c,x+2,dy+dh-1,w-5,3,tone(col,.45));px(c,x+4,dy+3,w-9,3,'#2a241c');}px(c,x+w/2-4,dy+Math.floor(dh/2),8,2,P.brassDim);px(c,x+w/2-3,dy+Math.floor(dh/2),6,1,P.brass);}}
    else if(doors){const dw=Math.floor((w-8)/doors);for(let i=0;i<doors;i++){const dx=x+3+i*dw;px(c,dx,top+1,dw-2,inner-2,tone(col,.88));px(c,dx+2,top+3,dw-6,inner-6,tone(col,.78));px(c,dx+2,top+3,dw-6,1,tone(col,.6));px(c,dx+2,top+inner-4,dw-6,1,hi);px(c,i?dx+2:dx+dw-5,top+Math.floor(inner/2),2,4,P.brass);}}
    edge(c,x,y-h,w,h-3,'#14120d',.5);
  }
  function table(c,x,y,w,h=52,col=P.oak){
    shadow(c,x,y-1,w,3,.3);for(const lx of [x+4,x+w-9]){px(c,lx,y-h+6,5,h-6,tone(col,.8));px(c,lx+4,y-h+6,1,h-6,tone(col,.55));px(c,lx,y-h+6,1,h-6,tone(col,1.15));}
    px(c,x+2,y-h+6,w-4,5,tone(col,.75));px(c,x,y-h,w,6,col);px(c,x,y-h,w,1,tone(col,1.4));px(c,x,y-h+5,w,1,tone(col,.5));px(c,x+w-1,y-h,1,6,tone(col,.6));
  }
  function chair(c,x,y,col=P.oak,tilt=0){
    c.save();c.translate(Math.round(x),Math.round(y));c.rotate(tilt);
    shadow(c,-16,-1,32,3,.28);const lo=tone(col,.65),hi=tone(col,1.3);
    px(c,-15,-61,4,61,col);px(c,-14,-61,1,61,hi);px(c,12,-61,4,61,col);px(c,15,-61,1,61,lo);px(c,-15,-58,31,5,hi);px(c,-15,-58,31,1,tone(col,1.5));
    for(let i=0;i<3;i++){px(c,-9+i*8,-53,3,23,col);px(c,-7+i*8,-53,1,23,lo);}
    px(c,-16,-32,34,5,hi);px(c,-16,-32,34,1,tone(col,1.5));px(c,-16,-28,34,2,lo);px(c,-13,-26,4,26,col);px(c,-10,-26,1,26,lo);px(c,11,-26,4,26,col);px(c,14,-26,1,26,lo);px(c,-13,-12,26,2,lo);
    c.restore();
  }
  function sofa(c,x,y,w,col=P.green){
    const lo=tone(col,.68),hi=tone(col,1.3);shadow(c,x,y-1,w,4);
    px(c,x+8,y-56,w-16,34,lo);px(c,x+10,y-60,w-20,30,col);px(c,x+12,y-60,w-24,2,hi);px(c,x+10,y-60,1,30,hi);
    const cushions=Math.max(2,Math.round((w-24)/40)),cw=Math.floor((w-24)/cushions);
    for(let i=0;i<cushions;i++){const cx=x+12+i*cw;px(c,cx+1,y-57,cw-2,24,tone(col,1.08));px(c,cx+1,y-57,cw-2,1,hi);px(c,cx+cw-2,y-57,1,24,lo);
      px(c,cx,y-33,cw,20,tone(col,1.12));px(c,cx,y-33,cw,2,hi);px(c,cx+cw-2,y-31,2,18,lo);px(c,cx,y-14,cw,2,lo);}
    for(const ax of [x,x+w-12]){px(c,ax,y-40,12,32,col);px(c,ax,y-42,12,4,hi);px(c,ax,y-42,12,1,tone(col,1.5));px(c,ax+10,y-38,2,30,lo);px(c,ax,y-9,12,2,lo);}
    px(c,x+2,y-9,w-4,7,lo);px(c,x+2,y-9,w-4,1,col);for(const fx of [x+4,x+w-9]){px(c,fx,y-3,5,3,P.walnutLo);}
    edge(c,x,y-42,w,40,'#0f120e',.45);
  }
  function armchair(c,x,y,col=P.oxblood){
    const lo=tone(col,.68),hi=tone(col,1.3);shadow(c,x,y-1,54,4);
    px(c,x+8,y-62,38,30,col);px(c,x+9,y-62,36,1,hi);px(c,x+44,y-62,2,30,lo);px(c,x+10,y-58,34,22,tone(col,1.08));
    px(c,x+8,y-32,38,18,tone(col,1.12));px(c,x+8,y-32,38,2,hi);px(c,x+8,y-15,38,2,lo);
    for(const ax of [x,x+42]){px(c,ax,y-44,12,36,col);px(c,ax,y-46,12,4,hi);px(c,ax+10,y-42,2,34,lo);}
    px(c,x+2,y-9,50,7,lo);for(const fx of [x+4,x+45]){px(c,fx,y-3,5,3,P.walnutLo);}edge(c,x,y-46,54,44,'#0f120e',.45);
  }
  function bed(c,x,y,w,opts={}){
    const child=!!opts.child,frame=opts.frame||P.walnut,blanket=opts.blanket||(child?P.mustard:'#7d8f87'),sheet=opts.sheet||P.linen;
    shadow(c,x,y-1,w,4);
    // Headboard against the wall, then mattress, sheet fold, blanket and pillows.
    px(c,x-3,y-96,w+6,60,frame);px(c,x-3,y-96,w+6,2,tone(frame,1.5));px(c,x+w+1,y-96,2,60,tone(frame,.6));px(c,x+2,y-90,w-4,44,tone(frame,.85));px(c,x+2,y-90,w-4,1,tone(frame,.6));px(c,x+2,y-47,w-4,1,tone(frame,1.3));
    for(let i=0;i<4;i++)px(c,x+8+i*Math.floor((w-16)/4),y-88,1,40,tone(frame,.7));
    px(c,x-2,y-40,w+4,26,tone(sheet,.85));px(c,x-2,y-40,w+4,3,sheet);px(c,x-2,y-40,w+4,1,tone(sheet,1.1));
    px(c,x-4,y-30,w+8,22,blanket);px(c,x-4,y-30,w+8,2,tone(blanket,1.25));px(c,x-4,y-10,w+8,2,tone(blanket,.7));for(let i=0;i<3;i++)px(c,x-3,y-25+i*6,w+6,1,tone(blanket,.85));
    px(c,x-4,y-36,w+8,6,sheet);px(c,x-4,y-36,w+8,1,tone(sheet,1.15));px(c,x-4,y-31,w+8,1,tone(sheet,.8));
    px(c,x-5,y-8,w+10,5,tone(frame,.9));px(c,x-5,y-8,w+10,1,tone(frame,1.3));px(c,x-4,y-3,6,3,tone(frame,.6));px(c,x+w-2,y-3,6,3,tone(frame,.6));
    const pillows=child?[[x+8,38]]:[[x+8,44],[x+w-52,44]];for(const [pxx,pw] of pillows){px(c,pxx,y-52,pw,16,tone(sheet,1.05));px(c,pxx+1,y-52,pw-2,1,P.cream);px(c,pxx+pw-2,y-50,1,13,tone(sheet,.7));px(c,pxx,y-37,pw,1,tone(sheet,.75));}
    edge(c,x-4,y-40,w+8,34,'#0f120e',.35);
  }
  function bookRow(c,x,y,w,seed=0,palette=['#8a5a3c','#6f7a5c','#8c7d5a','#5f6b70','#7a4a3a','#a48a55','#4c5c6c']){
    let xx=x;while(xx<x+w-4){const n=seed+xx,bw=4+Math.floor(hash(n)*3),bh=12+Math.floor(hash(n+1)*9),col=palette[Math.floor(hash(n+2)*palette.length)];
      if(hash(n+3)>.9&&xx>x+8){px(c,xx,y-bh+3,bw+3,bh-3,tone(col,.85));xx+=bw+4;continue;}
      px(c,xx,y-bh,bw,bh,col);px(c,xx,y-bh,1,bh,tone(col,1.3));px(c,xx+bw-1,y-bh,1,bh,tone(col,.6));px(c,xx+1,y-bh+3,bw-2,1,P.paper);if(bh>16)px(c,xx+1,y-5,bw-2,1,P.paper);xx+=bw;}
  }
  function picture(c,x,y,w=30,h=30,type='family',opts={}){
    const frame=opts.frame||'#5b4430';line(c,x+w/2,y-6,x+w/2,y,'#3c3428');px(c,x+w/2-1,y-7,3,2,'#8a8262');
    px(c,x+1,y+1,w,h,'rgba(10,12,9,.35)');px(c,x,y,w,h,frame);px(c,x,y,w,1,tone(frame,1.4));px(c,x,y,1,h,tone(frame,1.4));px(c,x+w-1,y,1,h,tone(frame,.6));px(c,x,y+h-1,w,1,tone(frame,.6));
    px(c,x+3,y+3,w-6,h-6,P.cream);const ix=x+5,iy=y+5,iw=w-10,ih=h-10;
    if(type==='family'){px(c,ix,iy,iw,ih,'#8a9a8c');px(c,ix,iy+ih*.6,iw,ih*.4,'#6f7a5c');for(let i=0;i<3;i++){const hh=i===1?ih*.55:ih*.72,hx=ix+iw*(.2+i*.3)-2;px(c,hx,iy+ih-hh,5,5,i===1?'#d3b08c':'#c9a27c');px(c,hx-1,iy+ih-hh+5,7,hh-5,['#4e665e','#a88855','#7f6554'][i]);}}
    else if(type==='bird'){px(c,ix,iy,iw,ih,'#a9b3a0');line(c,ix+2,iy+ih*.6,ix+iw-2,iy+ih*.66,'#5c5540');poly(c,[[ix+iw*.3,iy+ih*.6],[ix+iw*.5,iy+ih*.3],[ix+iw*.68,iy+ih*.55],[ix+iw*.85,iy+ih*.5]],'#3d3f36');px(c,ix+iw*.5,iy+ih*.32,2,2,'#c9403a');}
    else if(type==='landscape'){px(c,ix,iy,iw,ih,'#9c9878');poly(c,[[ix,iy+ih],[ix+iw*.4,iy+ih*.25],[ix+iw*.7,iy+ih*.6],[ix+iw,iy+ih*.35],[ix+iw,iy+ih]],'#5b6b58');px(c,ix+iw*.15,iy+ih*.15,4,4,'#d8c48a');}
    else if(type==='drawing'){px(c,ix,iy,iw,ih,P.paper);poly(c,[[ix+iw*.2,iy+ih*.85],[ix+iw*.2,iy+ih*.45],[ix+iw*.5,iy+ih*.2],[ix+iw*.8,iy+ih*.45],[ix+iw*.8,iy+ih*.85]],'#c98f5a');px(c,ix+iw*.42,iy+ih*.6,iw*.16,ih*.25,'#7f9a96');px(c,ix+iw*.6,iy+ih*.08,3,3,P.mustard);}
    else{px(c,ix,iy,iw,ih,opts.fill||'#7d8a80');}
  }
  function rug(c,x,y,w,h,col='#6a4f43',col2='#8d7458'){
    // Flat woven rug: a dark outline, a border band, a plain field and a small central medallion; fringe on the short ends.
    alpha(c,.35,()=>px(c,x-1,y-1,w+2,h+2,'#0c0d0b'));px(c,x,y,w,h,col2);px(c,x+4,y+3,w-8,h-6,col);px(c,x+8,y+5,w-16,h-10,tone(col,1.12));
    px(c,x+w/2-14,y+h/2-4,28,8,col2);px(c,x+w/2-9,y+h/2-2,18,4,col);
    for(const cx of [x+12,x+w-16]){px(c,cx,y+7,4,4,col2);px(c,cx,y+h-11,4,4,col2);}
    for(let yy=y+2;yy<y+h-1;yy+=3){px(c,x-3,yy,3,1,tone(col2,1.2));px(c,x+w,yy,3,1,tone(col2,1.2));}
    alpha(c,.18,()=>{for(let i=0;i<6;i++)px(c,x+6+hash(i+x)*(w-12),y+3+hash(i+y)*(h-6),6+hash(i)*14,1,'#0c0d0b');});
  }
  function lamp(c,x,y,opts={}){
    const shadeCol=opts.shade||'#b7a67c',base=opts.base||P.brassDim;
    px(c,x-6,y-3,13,3,base);px(c,x-4,y-5,9,2,tone(base,1.2));px(c,x-1,y-26,3,21,base);px(c,x,y-26,1,21,tone(base,1.4));
    poly(c,[[x-13,y-24],[x-7,y-42],[x+8,y-42],[x+14,y-24]],shadeCol);poly(c,[[x-13,y-24],[x-7,y-42],[x-4,y-42],[x-9,y-24]],tone(shadeCol,1.15));px(c,x-13,y-25,27,2,tone(shadeCol,.7));
  }
  function plant(c,x,y,opts={}){
    const pot=opts.pot||'#8e644d';shadow(c,x-1,y-1,16,3,.3);px(c,x,y-12,14,12,pot);px(c,x+11,y-12,3,12,tone(pot,.7));px(c,x-1,y-14,16,3,tone(pot,1.2));px(c,x+2,y-12,10,2,'#3d3126');
    line(c,x+6,y-14,x+7,y-40,'#4d6248',2);for(let i=0;i<5;i++){const yy=y-18-i*5,dir=i%2?-1:1;poly(c,[[x+7,yy+2],[x+7+dir*13,yy-4],[x+7+dir*6,yy-9]],i%2?'#647353':'#78805b');poly(c,[[x+7,yy+2],[x+7+dir*11,yy-3],[x+7+dir*5,yy-6]],i%2?'#566447':'#6a7350');}
  }
  function wallShelf(c,x,y,w){px(c,x,y,w,4,P.oak);px(c,x,y,w,1,P.oakHi);px(c,x,y+3,w,1,P.oakLo);for(const bx of [x+4,x+w-8]){px(c,bx,y+4,3,6,P.oakLo);line(c,bx,y+9,bx+3,y+4,P.oakLo);}alpha(c,.3,()=>px(c,x-1,y+4,w+2,3,'#0c0d0b'));}
  function clock(c,x,y,r=8){c.fillStyle='#4a3826';c.beginPath();c.arc(x,y,r+2,0,Math.PI*2);c.fill();c.fillStyle=P.cream;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();for(let i=0;i<4;i++)px(c,x-1+[0,r-2,0,-r+2][i],y-1+[-r+2,0,r-2,0][i],1,1,P.ink);line(c,x,y,x+3,y-3,P.ink);line(c,x,y,x-1,y-5,P.ink);px(c,x-3,y+r+2,6,2,'#3d3f37');}
  function radio(c,x,y,col='#8a6a45'){px(c,x,y-14,24,14,col);px(c,x,y-14,24,1,tone(col,1.35));px(c,x+22,y-14,2,14,tone(col,.6));px(c,x+3,y-11,10,8,'#2e3129');px(c,x+4,y-10,8,6,'#5c6a58');for(let i=0;i<3;i++)px(c,x+5+i*2,y-9,1,4,'#8a9a78');px(c,x+16,y-10,4,4,P.brassDim);px(c,x+17,y-9,2,2,P.brass);line(c,x+22,y-15,x+27,y-26,'#9a9a86');}
  function cup(c,x,y,col='#c4bda0'){px(c,x,y-8,6,8,col);px(c,x+5,y-8,1,8,tone(col,.7));px(c,x+6,y-6,2,4,col);px(c,x,y-8,6,1,tone(col,.6));px(c,x+1,y-7,1,5,tone(col,1.2));}
  function bottle(c,x,y,col='#739183'){px(c,x,y-10,5,10,col);px(c,x+4,y-10,1,10,tone(col,.7));px(c,x+1,y-13,3,3,tone(col,.9));px(c,x+1,y-14,3,1,P.paper);px(c,x+1,y-7,3,4,P.paper);px(c,x+1,y-10,1,6,tone(col,1.3));}
  function book(c,x,y,h,col){px(c,x,y-h,5,h,col);px(c,x,y-h,1,h,tone(col,1.3));px(c,x+4,y-h,1,h,tone(col,.6));px(c,x+1,y-h+2,3,1,P.paper);}
  function note(c,x,y,w=16,h=19,lines=4,opts={}){px(c,x+1,y+1,w,h,'rgba(10,12,9,.35)');px(c,x,y,w,h,opts.paper||P.paper);px(c,x,y,w,1,P.cream);for(let i=0;i<lines;i++)px(c,x+3,y+4+i*3,w-6-(i%2)*3,1,'#6e6a52');if(opts.pin!==false){px(c,x+w/2-1,y-1,3,3,opts.pin||'#a83a2a');px(c,x+w/2,y-1,1,1,'#e0c0a0');}}
  function box(c,x,y,w=22,h=16,col='#8a7042',open=false){shadow(c,x,y-1,w,2,.25);px(c,x,y-h,w,h,col);px(c,x+w-3,y-h,3,h,tone(col,.7));px(c,x,y-h,w,1,tone(col,1.25));if(open){px(c,x+2,y-h+1,w-6,3,'#2a241c');px(c,x-3,y-h-5,7,6,tone(col,1.1));px(c,x+w-4,y-h-5,7,6,tone(col,1.1));}else{px(c,x+w/2-1,y-h,2,h,'#a8956a');}px(c,x+3,y-h+5,w-9,2,P.paper);}
  function debris(c,x,y,w,seed=0,n=10,cols=['#8a8262','#2f322d','#746a47']){for(let i=0;i<n;i++){const k=seed+i*13,xx=x+hash(k)*w,yy=y+hash(k+1)*38;px(c,xx,yy,3+hash(k+2)*8,1+hash(k+3)*2,cols[i%cols.length]);}}
  function glassShards(c,x,y,w,h,seed=0,n=16){for(let i=0;i<n;i++){const k=seed+i*3,gx=x+hash(k)*w,gy=y+hash(k+1)*h;px(c,gx,gy,2+hash(k+2)*3,1,i%3?'#9fb0aa':'#cfe4e8');if(i%4===0)px(c,gx,gy-1,1,1,'#e8f4f0');}}
  function dragMarks(c,x,y,len,n=4){alpha(c,.45,()=>{for(let i=0;i<n;i++)line(c,x,y+i*4,x+len,y+i*4-2+(i%2)*3,'#1f1811');});}
  function bloodPool(c,x,y,w,h){alpha(c,.65,()=>poly(c,[[x,y],[x+w*.3,y-h*.5],[x+w*.7,y-h*.4],[x+w,y+h*.2],[x+w*.8,y+h],[x+w*.35,y+h*.9],[x+w*.05,y+h*.5]],P.bloodDry));alpha(c,.35,()=>poly(c,[[x+w*.2,y],[x+w*.6,y-h*.2],[x+w*.7,y+h*.5],[x+w*.3,y+h*.6]],'#4a1a14'));}
  // ---- Animated pieces: each room picks one or two. ----
  function curtain(c,x,y,h,time,side=1,col='#9a9980'){
    // A pleated panel hanging from a rod at (x, y); side=+1 hangs to the right of x, -1 to the left. Tied back at 58% height.
    const sway=Math.sin(time*1.12+x*.03)*2.1,w=20,x0=side>0?x:x-w;
    poly(c,[[x,y],[x+w*side,y],[x+(w-4+sway)*side,y+h],[x+(3+sway*.6)*side,y+h-3]],col);
    for(let i=1;i<5;i++)line(c,x+i*4*side,y+2,x+(i*3.6+sway*.8)*side,y+h-3,i%2?tone(col,.78):tone(col,1.15));
    px(c,x0-2,y-4,w+4,3,'#5a4d3a');px(c,x0-2,y-4,w+4,1,'#8a7a5a');px(c,x0+6,y+h*.58,8,3,tone(col,.6));
  }
  function motes(c,x,y,time,n=8){for(let i=0;i<n;i++){const xx=x+Math.sin(time*.18+i)*20+hash(i+5)*36,yy=y+((hash(i+40)*68+time*(1+hash(i)))%68);c.globalAlpha=.12+hash(i+20)*.18;px(c,xx,yy,1,1,'#ded0a6');}c.globalAlpha=1;}
  function drip(c,x,y,bottom,time,period=4.6){const p=((time%period)+period)%period/period;if(p<.68)px(c,x,y,1,1+p*2,'#b2c4b5');else{const q=(p-.68)/.32;px(c,x,y+q*q*(bottom-y),1,3,'#a5bbad');if(q>.91){line(c,x-4,bottom,x-1,bottom,'#a5bbad');line(c,x+2,bottom,x+5,bottom,'#a5bbad');}}}
  function paperBird(c,x,y,time,i=0,col='#d6cb9f'){const a=Math.sin(time*.9+i)*.18;c.save();c.translate(x,y);c.rotate(a);line(c,0,-24,0,0,'#a8ac92');poly(c,[[0,0],[-10,-4],[-4,4],[0,2],[7,4],[13,-3]],col);line(c,0,0,4,2,tone(col,.7));c.restore();}
  // ---- Registry and frame ----
  // Portal names are shared with house-data.js: [x, doorKey, detail].
  const doors={house_ground:[[105,'miller_front'],[650,'miller_wc'],[990,'miller_utility','scar']],house_landing:[[340,'miller_master'],[505,'miller_child'],[680,'miller_bath']],house_master:[[70,'miller_master']],house_child:[[70,'miller_child']],house_bath:[[70,'miller_bath']],house_wc:[[70,'miller_wc']],house_utility:[[70,'miller_utility','scar']]};
  function doorOpen(id){return typeof houseState!=='undefined'&&!!houseState.doors?.[id];}
  function roomLength(id){return typeof HOUSE_ROOMS!=='undefined'&&HOUSE_ROOMS[id]?HOUSE_ROOMS[id].length:(rooms[id]&&rooms[id].length)||640;}
  const K={H,CEIL,FLOOR,DADO,BASE,LIP,P,STYLE,hash,px,poly,line,text,tone,alpha,shadow,edge,shell,ceiling,deadPendant,windowFrame,windowLight,outsideView,door,doorOpen,
    stairsUp,stairsUpFront,stairsDown,stairsDownFront,cabinet,table,chair,sofa,armchair,bed,bookRow,picture,rug,lamp,plant,wallShelf,clock,radio,cup,bottle,book,note,box,debris,glassShards,dragMarks,bloodPool,
    curtain,motes,drip,paperBird};
  // registerRoom({id, paint(c,L,K), dynamic(c,time,K), foreground(c,time,K), lights(time,K)->[], grade}) — paint is cached once.
  function registerRoom(def){rooms[def.id]=def;cache.delete(def.id);}
  function staticRoom(id){const room=rooms[id];if(!room)return null;if(!cache.has(id)){if(typeof document==='undefined'||!document.createElement)return null;const cv=document.createElement('canvas');cv.width=roomLength(id);cv.height=H;const ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;room.paint(ctx,roomLength(id),K);cache.set(id,cv);}return cache.get(id);}
  function draw(c,id,camera,time,width=640){
    const room=rooms[id];if(!room)return;px(c,0,-120,width,570,'#0b0c09');c.save();c.translate(Math.round(-camera),0);
    const cv=staticRoom(id);if(cv)c.drawImage(cv,0,0);else room.paint(c,roomLength(id),K);
    const motion=typeof houseState!=='undefined'?houseState.doorMotion:null;
    for(const d of doors[id]||[])door(c,d[0],doorOpen(d[1]),d[2],motion?.key===d[1]?motion.progress:1);
    if(room.dynamic)room.dynamic(c,time,K);
    c.restore();
  }
  function foreground(c,id,camera,time,width=640){
    const room=rooms[id];if(!room)return;c.save();c.translate(Math.round(-camera),0);const L=roomLength(id);
    // Slim near jamb only, so a player standing in the doorway stays readable.
    for(const d of doors[id]||[]){px(c,d[0]+23,89,5,153,'#4a3826');px(c,d[0]+23,89,1,153,'#8c7050');px(c,d[0]+27,89,1,153,'#241b12');}
    if(room.foreground)room.foreground(c,time,K);
    if(!room.noLip){px(c,0,LIP,L,H-LIP,'#1a1712');px(c,0,LIP,L,1,'#3a332a');px(c,0,0,6,H,'#15120d');px(c,L-6,0,6,H,'#15120d');}
    c.restore();
  }
  function lights(id,camera,time){const room=rooms[id];if(!room||!room.lights)return [];return room.lights(time,K).filter(l=>l&&Number.isFinite(l.x)&&Number.isFinite(l.y)).map(l=>({...l,x:l.x-camera}));}
  function grade(c,id,width=640){
    if(typeof worldArt!=='undefined'&&worldArt.grade)worldArt.grade(c);
    const room=rooms[id];c.save();px(c,0,-120,width,570,room&&room.tint?room.tint:'rgba(19,37,29,.07)');c.restore();
  }
  return{draw,foreground,lights,grade,registerRoom,kit:K,roomLength};
})();
