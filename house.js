'use strict';
// 17号住宅: cached architecture, human-scale furniture and time-driven ambience.
// Keep the gameplay coordinate contract: canvas 330h, floor 240, feet 246..312,
// adult approximately 120h, stairs (400,292) -> (490,232). No gameplay state is mutated here.
const houseArt = (() => {
  const H=330, CEIL=60, FLOOR=240, DADO=178, BASE=232, LIP=316;
  const rooms=new Map(), cache=new Map();
  const P={ink:'#171b1b',paper:'#d9ceb0',cream:'#e9dfc3',linen:'#c2bfae',brass:'#c7a769',
    walnut:'#534134',oak:'#79624b',green:'#4e6962',oxblood:'#79524b',mustard:'#b39862',
    enamel:'#b3bdb6',steel:'#788b88',glass:'#9aafb1',blood:'#412a25'};
  const STYLE={
    ground:{wall:'#716f60',panel:'#454e46',wood:'#74644e',floor:'#454039',accent:'#aca083'},
    upper:{wall:'#6f797a',panel:'#414e50',wood:'#697473',floor:'#443f3a',accent:'#a4aea7'},
    child:{wall:'#7f8377',panel:'#535f59',wood:'#848971',floor:'#4b423a',accent:'#c0b18b'},
    tile:{wall:'#748780',panel:'#536e68',wood:'#89978b',floor:'#414e4b',accent:'#b2bfb0'},
    utility:{wall:'#6a716b',panel:'#4f5952',wood:'#70776a',floor:'#424741',accent:'#a3aa94'}
  };
  const hash=n=>{const f=Math.sin(n*127.1+311.7)*43758.5453;return f-Math.floor(f);};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const px=(c,x,y,w,h,col)=>{if(w<=0||h<=0)return;c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
  function poly(c,points,col){c.fillStyle=col;c.beginPath();points.forEach((p,i)=>i?c.lineTo(Math.round(p[0]),Math.round(p[1])):c.moveTo(Math.round(p[0]),Math.round(p[1])));c.closePath();c.fill();}
  function line(c,x,y,xx,yy,col,w=1){c.strokeStyle=col;c.lineWidth=w;c.beginPath();c.moveTo(Math.round(x)+.5,Math.round(y)+.5);c.lineTo(Math.round(xx)+.5,Math.round(yy)+.5);c.stroke();}
  function tone(col,k){const n=parseInt(col.slice(1),16),part=s=>clamp(Math.round((n>>s&255)*k),0,255).toString(16).padStart(2,'0');return '#'+part(16)+part(8)+part(0);}
  function alpha(c,a,fn){c.save();try{c.globalAlpha*=a;fn();}finally{c.restore();}}
  function text(c,s,x,y,col=P.paper,size=7){c.save();c.fillStyle=col;c.font=`bold ${size}px monospace`;c.textBaseline='alphabetic';c.fillText(s,Math.round(x),Math.round(y));c.restore();}
  function shadow(c,x,y,w,h=3,a=.3){alpha(c,a,()=>{px(c,x-2,y,w+4,h,'#101918');px(c,x+1,y+h,w-2,2,'#101918');});}
  function edge(c,x,y,w,h,col=P.ink,a=.6){alpha(c,a,()=>{px(c,x,y,w,1,col);px(c,x,y,1,h,col);px(c,x+w-1,y,1,h,col);px(c,x,y+h-1,w,1,col);});}
  function floorTiles(c,x,w,colors=['#53605a','#475650']){
    const rows=[240,248,258,270,285,302,330];
    for(let r=0;r<rows.length-1;r++)for(let xx=x-28;xx<x+w;xx+=28){const a=Math.max(x,xx),b=Math.min(x+w,xx+27);px(c,a,rows[r],b-a,rows[r+1]-rows[r]-1,colors[(r+Math.round((xx-x)/28)+20)%colors.length]);}
  }
  function shell(c,L,style='ground'){
    const st=STYLE[style]||STYLE.ground;
    px(c,0,0,L,H,'#171e1d');px(c,0,CEIL,L,FLOOR-CEIL,st.wall);
    // Broad value masses first. Texture stays below furniture contrast.
    for(let x=0;x<L;x+=56){px(c,x,67,1,110,tone(st.wall,.96));px(c,x+3,67,1,110,tone(st.wall,1.03));}
    // Sparse, seeded plaster wear; never shimmering random noise.
    for(let i=0;i<L/22;i++){const x=12+hash(i+40)*(L-24),y=78+hash(i+90)*93;px(c,x,y,2+hash(i)*5,1,tone(st.wall,hash(i+1)>.5?1.07:.94));}
    for(let i=0;i<L/170;i++){const x=25+hash(i+71)*(L-50);line(c,x,164,x+4,171,tone(st.wall,.86));line(c,x+4,171,x+2,177,tone(st.wall,.86));}
    px(c,0,DADO,L,62,st.panel);
    for(let x=7;x<L;x+=56){px(c,x,188,43,39,tone(st.panel,.91));px(c,x,188,43,1,tone(st.panel,.78));px(c,x+42,189,1,38,tone(st.panel,1.15));}
    if(style==='tile')for(let y=179;y<232;y+=13)for(let x=0;x<L;x+=26){px(c,x+1,y+1,24,11,tone(st.panel,1+hash(x+y)*.09));px(c,x+1,y+1,24,1,tone(st.panel,1.18));}
    px(c,0,DADO,L,2,st.wood);px(c,0,DADO+2,L,2,tone(st.panel,.7));
    px(c,0,BASE,L,8,tone(st.panel,.7));px(c,0,BASE,L,2,st.wood);
    px(c,0,FLOOR,L,H-FLOOR,st.floor);
    const rows=[240,247,255,265,277,291,307,330];
    for(let r=0;r<rows.length-1;r++){
      const y=rows[r],h=rows[r+1]-y;
      for(let x=-90+(r%3)*31;x<L;x+=94){const col=tone(st.floor,.97+hash(x+r*77)*.1);px(c,x,y,93,h-1,col);px(c,x+6,y+2,60,1,tone(col,1.07));if(hash(x+r)>.6){px(c,x+19,y+h*.6,31,1,tone(col,.88));px(c,x+52,y+h*.6+1,12,1,tone(col,.9));}}
      px(c,0,y,L,1,tone(st.floor,.75));
    }
    if(style==='tile')floorTiles(c,0,L);
    if(style==='utility'){
      px(c,0,FLOOR,L,H-FLOOR,st.floor);
      for(let i=0;i<L/10;i++)px(c,hash(i+5)*L,244+hash(i+18)*70,3+hash(i)*8,1,tone(st.floor,1.1));
      line(c,0,282,L,282,tone(st.floor,.73));
    }
    shadow(c,0,240,L,5,.22);alpha(c,.15,()=>px(c,0,302,L,28,'#101918'));
    // Shallow ceiling and cased wall edges, never a solid black half-screen.
    px(c,0,0,L,60,'#1b2423');for(let x=25;x<L;x+=156){px(c,x,0,6,59,'#242d2b');px(c,x+5,0,1,59,'#303732');}
    px(c,0,60,L,3,st.wood);px(c,0,63,L,3,tone(st.panel,.7));px(c,0,66,L,1,st.accent);
    alpha(c,.18,()=>px(c,0,67,L,7,'#18221e'));
    for(const x of [0,L-8]){px(c,x,60,8,180,tone(st.panel,.76));px(c,x+6,66,1,168,st.wood);}
    return st;
  }
  function outsideView(c,x,y,w,h,view='road'){
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
    px(c,x,y,w,h,'#657980');px(c,x,y+h*.38,w,h*.28,'#a5997f');px(c,x,y+h*.59,w,h*.41,'#4c6056');
    for(let i=0;i<8;i++){const xx=x+i*w/7;poly(c,[[xx-9,y+h*.66],[xx,y+h*.4-hash(i+x)*12],[xx+12,y+h*.66]],'#465b53');}
    if(view==='road'){px(c,x,y+h*.81,w,5,'#788075');line(c,x,y+h*.37,x+w,y+h*.4,'#5c655e');}
    else for(let xx=x;xx<x+w;xx+=12)px(c,xx,y+h*.76,3,h*.24,'#7b7e69');
    c.restore();
  }
  function windowFrame(c,x,y,w=96,h=82,opts={}){
    px(c,x-6,y-6,w+12,h+14,'#354640');px(c,x-5,y-5,w+10,h+10,'#929b87');
    px(c,x-5,y-5,w+10,2,'#c4c6aa');px(c,x-5,y-5,2,h+10,'#b1bda4');outsideView(c,x,y,w,h,opts.view);
    alpha(c,.15,()=>px(c,x,y,w,h,P.glass));
    line(c,x+6,y+30,x+25,y+8,'#b6c9c4');line(c,x+13,y+36,x+33,y+12,'#95aba6');
    if(opts.broken){poly(c,[[x+w*.58,y+h*.55],[x+w-5,y+h*.58],[x+w-9,y+h-3],[x+w*.68,y+h-3]],'#3b514b');line(c,x+w*.58,y+h*.55,x+w*.68,y+h-3,'#c4d2c6');}
    px(c,x+w/2-1,y,3,h,'#acb7a1');px(c,x,y+h*.52,w,3,'#acb7a1');
    px(c,x-8,y+h,w+16,5,'#aab29b');px(c,x-8,y+h,w+16,1,'#d5d7ba');shadow(c,x-6,y+h+5,w+12,3,.25);
    if(opts.latch){px(c,x+w/2-3,y+h*.52-4,8,2,P.brass);}
  }
  function windowLight(x,y,w,h,opts={}){return{x:x+w/2,y:y+h/2,color:opts.color??'#b5cccb',radius:opts.radius??150,intensity:opts.intensity??.25,floorY:opts.floorY??267,floorWidth:opts.floorWidth??w*1.5};}
  function beam(c,x,y,w,time=0){alpha(c,.045+Math.sin(time*.25)*.007,()=>poly(c,[[x,y],[x+w,y],[x+w+62,282],[x+12,282]],'#c5ded0'));}
  function doorOpen(key){return typeof houseState!=='undefined'&&!!houseState.doors?.[key];}
  function door(c,x,open=false,detail='',progress=1){
    const y=96,h=142,w=50,left=x-w/2;
    px(c,left-7,y-8,w+14,h+9,'#2e3933');px(c,left-5,y-6,w+10,h+6,'#817760');px(c,left-5,y-6,w+10,2,'#b4a382');
    px(c,left,y,w,h,'#172522');px(c,left,y+h-7,w,7,'#40433a');
    const p=open?clamp(progress,0,1):0,lw=Math.round(w-(w-8)*Math.sin(p*Math.PI/2));
    px(c,left,y,lw,h,'#75664d');px(c,left,y,2,h,'#a38e68');px(c,left+lw-2,y,2,h,'#443e30');
    if(lw>20){for(const [yy,hh] of [[107,38],[154,30],[194,32]]){px(c,left+5,yy,lw-11,hh,'#625a45');px(c,left+6,yy+1,lw-13,hh-3,'#7f7053');px(c,left+6,yy+hh-2,lw-13,1,'#ac9165');}}
    px(c,left+lw-8,166,4,3,P.brass);px(c,left+lw-6,171,1,4,'#453f32');
    px(c,left-5,238,w+10,3,'#a58e68');shadow(c,left-4,241,w+8,2,.25);
    if(detail==='scar'&&!open)for(let i=0;i<4;i++)line(c,left+11+i*6,133+i%2*8,left+7+i*6,160+i%2*8,'#c0a177');
  }
  // Furniture dimensions are in world pixels. y is always the surface of contact.
  function cabinet(c,x,y,w,h,col=P.walnut,opts={}){
    shadow(c,x,y,w);px(c,x,y-h,w,h,col);px(c,x+w-4,y-h,4,h,tone(col,.7));px(c,x+2,y-5,w-4,5,tone(col,.55));
    const n=opts.drawers||opts.doors||2;
    for(let i=0;i<n;i++){
      const xx=opts.drawers?x+4:x+4+i*(w-8)/n, yy=opts.drawers?y-h+5+i*(h-12)/n:y-h+5;
      const ww=opts.drawers?w-10:(w-8)/n-2, hh=opts.drawers?(h-12)/n-2:h-13;
      px(c,xx,yy,ww,hh,tone(col,.85));px(c,xx+1,yy+1,ww-2,hh-3,tone(col,1.03));px(c,xx+2,yy+hh-2,ww-3,1,tone(col,1.2));px(c,xx+ww/2-3,yy+hh*.45,6,2,P.brass);
    }
    px(c,x-2,y-h-3,w+4,4,tone(col,1.23));px(c,x-2,y-h-3,w+4,1,tone(col,1.48));
    for(let i=0;i<3;i++){const xx=x+7+hash(x+i)*(w-15),yy=y-h+9+hash(x+i+5)*(h-18);px(c,xx,yy,1,4+hash(i+12)*9,tone(col,.92));}
  }
  function table(c,x,y,w,h=52,col=P.oak){
    shadow(c,x,y,w,2,.23);for(const xx of [x+4,x+w-9]){px(c,xx,y-h,5,h,col);px(c,xx+3,y-h,2,h,tone(col,.7));}
    px(c,x+2,y-h+4,w-4,6,tone(col,.76));px(c,x-2,y-h,w+4,5,col);px(c,x-2,y-h,w+4,1,tone(col,1.4));
  }
  function chair(c,x,y,col=P.oak,tilt=0){c.save();c.translate(x,y);c.rotate(tilt);for(const xx of [-13,11]){px(c,xx,-60,3,60,col);px(c,xx,-59,1,57,tone(col,1.3));}for(let i=0;i<3;i++)px(c,-6+i*6,-51,2,20,col);px(c,-13,-60,27,5,col);px(c,-15,-31,31,4,tone(col,1.3));px(c,-12,-14,25,2,tone(col,.7));c.restore();}
  function sofa(c,x,y,w,col=P.green){
    shadow(c,x,y,w,4);px(c,x+7,y-62,w-14,48,tone(col,.7));px(c,x+9,y-61,w-18,30,col);
    const n=Math.max(2,Math.round(w/48)),cw=(w-24)/n;
    for(let i=0;i<n;i++){px(c,x+12+i*cw,y-58,cw-2,24,tone(col,1.12));px(c,x+12+i*cw,y-57,cw-2,1,tone(col,1.32));px(c,x+11+i*cw,y-32,cw-1,21,tone(col,1.2));px(c,x+11+i*cw,y-32,cw-1,2,tone(col,1.4));}
    for(const xx of [x,x+w-11]){px(c,xx,y-44,11,35,col);px(c,xx,y-44,11,3,tone(col,1.4));px(c,xx+9,y-41,2,32,tone(col,.65));}
    px(c,x+2,y-10,w-4,7,tone(col,.7));for(const xx of [x+4,x+w-9])px(c,xx,y-3,5,3,P.walnut);
  }
  function bed(c,x,y,w,opts={}){
    const col=opts.blanket||P.green, wood=opts.frame||P.walnut;
    shadow(c,x,y,w,4);
    // A panelled headboard has posts and inlays, NOT cabinet handles.
    px(c,x-4,y-79,w+8,48,wood);px(c,x+2,y-73,w-4,38,tone(wood,.81));
    px(c,x+5,y-70,w-10,32,tone(wood,1.03));
    for(const xx of [x-4,x+w-1]){px(c,xx,y-83,5,80,tone(wood,1.13));px(c,xx,y-83,5,2,tone(wood,1.5));}
    for(let i=1;i<4;i++)px(c,x+i*w/4,y-71,2,34,tone(wood,.82));
    // Low headboard, thick mattress and a hanging duvet; not a second wardrobe.
    px(c,x-3,y-79,w+6,3,tone(wood,1.45));px(c,x-3,y-36,w+6,26,'#a5a895');px(c,x-3,y-36,w+6,3,P.cream);
    const pillows=opts.child?[[x+8,39]]:[[x+8,49],[x+w-56,49]];
    for(const [xx,ww] of pillows){px(c,xx,y-49,ww,14,P.linen);px(c,xx+2,y-49,ww-4,2,P.cream);px(c,xx+ww-3,y-47,3,11,'#919b90');px(c,xx+3,y-45,1,6,'#d3d3b9');line(c,xx+ww-8,y-45,xx+ww-5,y-42,'#a0ae98');}
    px(c,x-5,y-30,w+10,26,col);px(c,x-5,y-30,w+10,5,tone(col,1.34));
    for(let i=0;i<6;i++){const xx=x+12+i*(w-18)/6;px(c,xx,y-23,2,18,tone(col,.87));}
    poly(c,[[x+w-28,y-27],[x+w+5,y-27],[x+w+5,y-9],[x+w-9,y-10]],tone(col,1.14));line(c,x+w-27,y-27,x+w-8,y-10,tone(col,.88));
    px(c,x-4,y-7,w+8,3,tone(col,.7));for(const xx of [x,x+w-5])px(c,xx,y-4,5,4,tone(wood,.7));
  }
  function rug(c,x,y,w,h,col='#68594d',border='#9a8768'){
    px(c,x,y,w,h,border);px(c,x+3,y+2,w-6,h-4,col);px(c,x+7,y+4,w-14,h-8,tone(col,1.08));
    for(let xx=x+10;xx<x+w-8;xx+=18){px(c,xx,y+3,5,1,border);px(c,xx,y+h-4,5,1,border);}
    for(let yy=y+2;yy<y+h;yy+=3){px(c,x-2,yy,2,1,border);px(c,x+w,yy,2,1,border);}
  }
  function picture(c,x,y,w=30,h=30,type='family'){
    shadow(c,x+2,y+h,w,2,.2);px(c,x,y,w,h,P.walnut);px(c,x,y,w,1,'#ab9372');px(c,x+3,y+3,w-6,h-6,P.paper);
    if(type==='family'){px(c,x+5,y+5,w-10,h-10,'#7f9590');for(let i=0;i<3;i++){const xx=x+7+i*(w-13)/3,hh=i===1?9:14;px(c,xx,y+h-7-hh,4,4,'#c9ad8a');px(c,xx-1,y+h-3-hh,6,hh-4,['#456a68','#a58b62','#776653'][i]);}}
    else if(type==='drawing'){poly(c,[[x+6,y+h-6],[x+6,y+h*.5],[x+w*.5,y+7],[x+w-6,y+h*.5],[x+w-6,y+h-6]],'#b78d68');px(c,x+w/2-3,y+h-15,6,9,'#687f7a');px(c,x+w-10,y+6,3,3,P.brass);}
    else{poly(c,[[x+5,y+h-5],[x+w*.4,y+7],[x+w*.65,y+h*.6],[x+w-5,y+12],[x+w-5,y+h-5]],'#648477');}
  }
  function note(c,x,y,w=17,h=22,n=4,opts={}){px(c,x+1,y+1,w,h,'#4d584b');px(c,x,y,w,h,opts.paper||P.paper);for(let i=0;i<n;i++)px(c,x+3,y+5+i*3,w-6-i%2*3,1,'#8d8a71');px(c,x+w/2,y-1,2,3,opts.pin||'#a67d59');}
  function cup(c,x,y,col=P.cream){px(c,x,y-7,6,7,col);px(c,x+6,y-5,2,3,col);px(c,x+1,y-7,4,1,'#5b6156');}
  function bottle(c,x,y,col='#8c9b7c'){px(c,x,y-12,6,12,col);px(c,x+2,y-16,3,4,col);px(c,x+1,y-7,4,4,P.paper);px(c,x+1,y-11,1,5,tone(col,1.3));}
  function bookRow(c,x,y,w,seed=0){for(let xx=x;xx<x+w-5;){const bw=4+Math.floor(hash(xx+seed)*3),h=12+Math.floor(hash(xx+seed+1)*9);px(c,xx,y-h,bw,h,['#9b8663','#7b8d80','#ac8e71','#5e7779'][Math.floor(hash(xx)*4)]);px(c,xx+1,y-h+3,bw-2,1,P.paper);xx+=bw+1;}}
  function wallShelf(c,x,y,w){px(c,x,y,w,4,P.oak);px(c,x,y,w,1,'#a58e69');for(const xx of [x+4,x+w-7])px(c,xx,y+4,3,7,'#4b5043');}
  function lamp(c,x,y){px(c,x-7,y-3,14,3,P.brass);px(c,x-1,y-30,2,28,'#887e5e');poly(c,[[x-12,y-26],[x-7,y-43],[x+7,y-43],[x+12,y-26]],'#b3ae8c');px(c,x-12,y-26,24,2,'#777862');}
  function radio(c,x,y){px(c,x,y-16,27,16,'#7d745a');px(c,x+2,y-13,15,10,'#374b45');for(let i=0;i<5;i++)px(c,x+4+i*2,y-12,1,8,'#778370');px(c,x+21,y-11,3,3,P.brass);line(c,x+24,y-16,x+29,y-28,P.steel);}
  function plant(c,x,y,opts={}){const t=opts.time||0;line(c,x+7,y-13,x+8,y-43,'#5e7860',2);for(let i=0;i<5;i++){const yy=y-19-i*5,s=i%2?1:-1,d=Math.sin(t*.8+i)*1.7;poly(c,[[x+7,yy],[x+7+s*(13+d),yy-6],[x+9+s*5,yy-9]],i%2?'#7c9070':'#607b65');}px(c,x,y-13,16,13,opts.pot||'#a17f68');px(c,x+12,y-12,4,12,'#6d6451');px(c,x-1,y-15,18,3,'#b09474');}
  function box(c,x,y,w=24,h=18,col='#8a795a'){shadow(c,x,y,w,2,.2);px(c,x,y-h,w,h,col);px(c,x,y-h,w,1,tone(col,1.3));px(c,x+w-3,y-h,3,h,tone(col,.7));px(c,x+w/2-1,y-h,3,h,'#afa486');}
  function radiator(c,x,y,w=68){shadow(c,x,y,w);for(let xx=x;xx<x+w;xx+=7){px(c,xx,y-37,5,35,'#94a296');px(c,xx,y-37,2,35,'#b1baa6');}line(c,x-4,y-32,x-4,y+1,'#657c71',2);px(c,x-7,y-33,6,3,P.brass);}
  function sconce(c,x,y,t=0){px(c,x-3,y-7,6,18,'#545c49');px(c,x-8,y-5,16,11,'#b5ab88');px(c,x-6,y-3,12,6,'#e9d7a4');alpha(c,.07,()=>{for(let i=3;i>0;i--)px(c,x-8-i*5,y-4-i*4,16+i*10,10+i*8,'#efd49c');});}
  const power=t=>.42+Math.sin(t*.7)*.025; // Battery lamps, no rapid strobing.
  function curtain(c,x,y,h,t,side=1,col='#aeb4a0'){
    const sway=Math.sin(t*1.1+x*.023)*3+Math.sin(t*.47)*1.2;
    poly(c,[[x,y],[x+20*side,y],[x+(17+sway)*side,y+h],[x+(3+sway*.55)*side,y+h-2]],col);
    for(let i=1;i<5;i++)line(c,x+i*4*side,y+1,x+(i*3.5+sway*.7)*side,y+h-3,tone(col,i%2?.81:1.13));
    line(c,x-3*side,y-3,x+23*side,y-3,'#605e4d',2);
  }
  function motes(c,x,y,t,n=9){alpha(c,.3,()=>{for(let i=0;i<n;i++)px(c,x+hash(i+7)*58+Math.sin(t*.4+i)*9,y+(hash(i+31)*60+t*(1+hash(i)))%60,1,1,P.paper);});}
  function drip(c,x,y,bottom,t,period=3.4){const p=((t%period)+period)%period/period;if(p<.58)px(c,x,y,1,1+p*3,P.glass);else if(p<.88){const q=(p-.58)/.3;px(c,x,y+(bottom-y)*q*q,1,3,P.glass);}else{const r=(p-.88)/.12*8;alpha(c,1-(p-.88)/.12,()=>{line(c,x-r,bottom,x+r,bottom,P.glass);line(c,x-r*.6,bottom+2,x+r*.6,bottom+2,'#788f84');});}}
  function paperBird(c,x,y,t,i=0){c.save();c.translate(x,y);c.rotate(Math.sin(t*.95+i)*.17);line(c,0,-25,0,0,'#999f8a');poly(c,[[0,0],[-11,-5],[-4,4],[0,2],[8,4],[14,-3]],P.paper);line(c,0,0,4,2,'#939582');c.restore();}
  function pendant(c,x,t=0){const dx=Math.sin(t*.63+x)*2;line(c,x,16,x+dx,72,'#404e47',2);poly(c,[[x+dx-13,79],[x+dx-7,70],[x+dx+7,70],[x+dx+13,79]],'#748477');px(c,x+dx-13,79,26,2,'#3d514b');}
  function clock(c,x,y,t=0){px(c,x-10,y-10,20,26,P.walnut);px(c,x-7,y-7,14,14,P.paper);line(c,x,y,x+4,y-3,P.ink);line(c,x,y,x,y-5,P.ink);const dx=Math.sin(t*2.1)*4;line(c,x,y+7,x+dx,y+18,P.brass);px(c,x+dx-2,y+17,5,3,P.brass);}
  // Preserve the exact stair traversal path used by game.js.
  function stairsUp(c,x){
    px(c,x+140,67,74,117,'#25332e');px(c,x+137,65,80,4,'#8f8c71');
    for(let i=0;i<8;i++){const xx=x+128+i*11,yy=232-i*11;px(c,xx,yy-11,12,11,'#5e5d48');px(c,xx,yy-11,12,3,'#a49a78');}
    line(c,x+128,204,x+214,118,'#a39876',3);
    px(c,x+88,232,40,10,'#5b5b45');px(c,x+88,232,40,3,'#a69b77');
    poly(c,[[x-6,300],[x-6,292],[x+92,226],[x+92,300]],'#424d41');
    for(let i=0;i<4;i++){const xx=x+6+i*22,top=292-(xx-x)*.667+4;px(c,xx,top,16,296-top,'#39483e');}
    for(let i=0;i<9;i++){const xx=x+i*10,yy=292-i*6.67;px(c,xx,yy-7,11,7,'#655f48');px(c,xx,yy-7,12,3,'#a69d7c');px(c,xx,yy-7,12,1,'#c4b78e');}
    shadow(c,x-4,300,98,3,.3);sconce(c,x+121,181);
  }
  function stairsUpFront(c,x){for(let i=0;i<7;i++){const xx=x+5+i*14,yy=249-i*9.4;line(c,xx,yy,xx,yy+48,'#7f8065',2);}line(c,x-1,251,x+99,191,'#b6aa81',3);px(c,x-1,245,6,58,'#77785c');px(c,x-2,242,8,3,'#a69b73');}
  function stairsDown(c,x){poly(c,[[x-40,286],[x+20,286],[x-29,330],[x-95,330]],'#13221f');for(let i=0;i<7;i++){const xx=x-40-i*7,yy=286+i*7;px(c,xx,yy,60,4,'#8c8b6b');px(c,xx,yy,60,1,'#b9ad83');}px(c,x-42,282,66,4,'#aaa17b');}
  function stairsDownFront(c,x){line(c,x+19,245,x-35,293,'#b6aa81',3);for(let i=0;i<6;i++)line(c,x+19-i*9,245+i*8,x+19-i*9,291+i*8,'#7f8065',2);px(c,x+17,241,6,53,'#77785c');}
  const fallbackDoors={house_ground:[[105,'miller_front'],[650,'miller_wc'],[990,'miller_utility','scar']],house_landing:[[340,'miller_master'],[505,'miller_child'],[680,'miller_bath']],house_master:[[70,'miller_master']],house_child:[[70,'miller_child']],house_bath:[[70,'miller_bath']],house_wc:[[70,'miller_wc']],house_utility:[[70,'miller_utility','scar']]};
  function doorsFor(id){
    if(typeof HOUSE_ROOMS==='undefined'||!HOUSE_ROOMS[id])return fallbackDoors[id]||[];
    return HOUSE_ROOMS[id].exits.filter(p=>p.doorKey&&p.kind!=='window').map(p=>[p.x,p.doorKey,p.doorKey==='miller_utility'?'scar':'']);
  }
  function roomLength(id){return (typeof HOUSE_ROOMS!=='undefined'&&HOUSE_ROOMS[id]?.length)||rooms.get(id)?.length||640;}
  const motionQuery=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
  const clockTime=t=>motionQuery?.matches?0:Number.isFinite(t)?Math.max(0,t):0;
  const K={H,CEIL,FLOOR,DADO,BASE,LIP,P,STYLE,hash,px,poly,line,tone,alpha,text,shadow,edge,shell,floorTiles,outsideView,windowFrame,windowLight,beam,door,doorOpen,cabinet,table,chair,sofa,bed,rug,picture,note,cup,bottle,bookRow,wallShelf,lamp,radio,plant,box,radiator,sconce,power,curtain,motes,drip,paperBird,pendant,clock,stairsUp,stairsUpFront,stairsDown,stairsDownFront};
  function registerRoom(def){if(!def?.id||typeof def.paint!=='function')throw new TypeError('A house room needs id and paint()');rooms.set(def.id,def);cache.delete(def.id);}
  function staticRoom(id){
    if(cache.has(id))return cache.get(id);
    if(typeof document==='undefined')return null;
    const cv=document.createElement('canvas');cv.width=roomLength(id);cv.height=H;
    const ctx=cv.getContext('2d');if(!ctx)return null;ctx.imageSmoothingEnabled=false;
    rooms.get(id).paint(ctx,cv.width,K);cache.set(id,cv);return cv;
  }
  function draw(c,id,camera,time,width=640){
    const room=rooms.get(id);if(!room)return;
    camera=Number.isFinite(camera)?camera:0;const t=clockTime(time);
    c.save();try{
      px(c,0,-120,width,570,'#101c19');c.translate(Math.round(-camera),0);
      const cv=staticRoom(id);if(cv)c.drawImage(cv,0,0);else room.paint(c,roomLength(id),K);
      const m=typeof houseState!=='undefined'?houseState.doorMotion:null;
      for(const d of doorsFor(id))door(c,d[0],doorOpen(d[1]),d[2],m?.key===d[1]?m.progress:1);
      room.dynamic?.(c,t,K,{left:camera,right:camera+width});
    }finally{c.restore();}
  }
  function foreground(c,id,camera,time,width=640){
    const room=rooms.get(id);if(!room)return;c.save();try{
      c.translate(Math.round(-camera),0);
      for(const d of doorsFor(id)){px(c,d[0]+27,89,3,153,'#5c614d');px(c,d[0]+27,89,1,153,'#9d9876');}
      room.foreground?.(c,clockTime(time),K);
      if(!room.noLip){px(c,0,LIP,roomLength(id),H-LIP,'#202b26');px(c,0,LIP,roomLength(id),1,'#494c3c');}
    }finally{c.restore();}
  }
  function lights(id,camera,time){return(rooms.get(id)?.lights?.(clockTime(time),K)||[]).filter(l=>l&&Number.isFinite(l.x)&&Number.isFinite(l.y)&&Number.isFinite(l.radius)&&l.radius>0&&Number.isFinite(l.intensity)).map(l=>({...l,x:l.x-camera}));}
  function grade(c,id,width=640){c.save();try{if(typeof worldArt!=='undefined'&&worldArt.grade)worldArt.grade(c);px(c,0,-120,width,570,rooms.get(id)?.tint||'rgba(15,32,29,.035)');}finally{c.restore();}}
  return{draw,foreground,lights,grade,registerRoom,kit:K,roomLength};
})();
