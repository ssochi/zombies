'use strict';
houseArt.registerRoom({
  id:'house_roof',length:640,noLip:true,tint:'rgba(35,55,47,.025)',
  paint(c,L,K){
    const {px,line,poly}=K;
    px(c,0,0,L,330,'#617980');px(c,0,96,L,65,'#989b84');px(c,0,157,L,69,'#7a8b74');
    // Roof is outdoors: no inherited ceiling band or interior wall panels.
    for(let i=0;i<12;i++){const x=i*61-15,y=156+K.hash(i)*24;
      poly(c,[[x-25,219],[x-26,y+25],[x-18,y+25],[x-18,y+12],[x-7,y+12],[x-7,y+4],[x+12,y+4],[x+12,y+10],[x+27,y+10],[x+27,y+20],[x+40,y+20],[x+43,219]],'#4d6b5c');
      px(c,x-15,y+14,20,3,'#617c65');px(c,x+7,y+24,18,2,'#405f50');
    }
    for(let x=0;x<L;x+=15){px(c,x,215,4,33,'#77836b');}px(c,0,223,L,4,'#8a9279');
    // Returning window is centered on its real portal at x120.
    px(c,14,22,212,222,'#737e6b');for(let y=28;y<241;y+=12){px(c,14,y,212,1,'#929a7e');px(c,14,y+1,212,1,'#5e705c');}
    poly(c,[[0,26],[112,0],[242,26]],'#374e47');px(c,10,24,224,5,'#a4a58a');
    K.windowFrame(c,81,85,78,97,{view:'yard',latch:true});
    px(c,84,89,72,90,'#4a6153');px(c,88,94,64,32,'#778975');px(c,88,130,64,44,'#455c4e');
    px(c,79,182,82,5,'#b3b79a');K.sconce(c,193,121);
    // Near roof plane and weathered standing seams. Lane remains y246..312.
    poly(c,[[0,243],[640,243],[640,330],[0,330]],'#52665d');
    for(let y=246;y<331;y+=14){px(c,0,y,L,1,'#859080');for(let x=(y%28?0:27);x<L;x+=55){px(c,x,y,1,14,'#3c554c');px(c,x+2,y+1,1,12,'#667d6b');}}
    px(c,0,313,L,9,'#3e554a');px(c,0,313,L,2,'#9a9c7c');
    K.box(c,265,244,37,29,'#6e826c');K.box(c,310,245,28,21,'#7c8c73');
    // Ladder center x500 matches the descent; top remains visible over the front edge.
    for(const x of [482,517]){line(c,x,243,x-3,330,'#9da383',4);line(c,x+1,243,x-2,330,'#c3b997');}
    for(let i=0;i<8;i++)line(c,482-i*.4,253+i*10,517-i*.4,253+i*10,'#b8b392',3);
    px(c,555,117,3,130,'#a2ad91');line(c,557,118,587,111,'#829780',2);
    line(c,361,212,361,107,'#9baa8e',2);line(c,361,110,390,89,'#9baa8e',2);line(c,350,98,388,122,'#9baa8e');
    K.rug(c,91,248,72,14,'#717d64','#a4a487');
  },
  dynamic(c,t,K){
    // Fixed-count drifting clouds, no particle arrays or frame-based randomness.
    c.save();c.beginPath();c.rect(227,0,413,160);c.clip();
    K.alpha(c,.17,()=>{for(let i=0;i<4;i++){const x=((i*193+t*3) % 890)-180;K.px(c,x,38+i%2*21,112,4,'#d1d1b5');K.px(c,x+20,35+i%2*21,62,4,'#d1d1b5');}});c.restore();
    const d=Math.sin(t*1.4)*4;
    K.poly(c,[[558,121],[586,117+d],[582,134+d],[558,137]],'#b09466');
    K.poly(c,[[580,118+d],[595,124+d*1.5],[582,134+d]],'#8a805c');
    K.line(c,240,155,427,160,'#81957c');
    for(let i=0;i<2;i++){const x=277+i*80,s=Math.sin(t*1.2+i)*3;K.poly(c,[[x,156],[x+31,157],[x+31+s,201],[x+s,200]],i?'#a8b69b':'#8baba0');for(let j=1;j<4;j++)K.line(c,x+j*7,158,x+j*7+s,199,i?'#8c9e82':'#72968a');K.px(c,x+3,154,2,6,'#c2b084');K.px(c,x+26,154,2,6,'#c2b084');}
    K.plant(c,404,244,{time:t,pot:'#a19874'});
    // Sparse wind-blown leaves pass beyond the walk plane; they are not hazards.
    for(let i=0;i<3;i++){const x=(t*(12+i*3)+i*187)%690-25,y=220+Math.sin(t*.9+i)*9;K.px(c,x,y,4,1,'#afaa77');K.px(c,x+1,y-1,2,1,'#afaa77');}
    K.sconce(c,193,121,t);
  },
  foreground(c,t,K){for(const x of [482,517])K.line(c,x,277,x-2,330,'#b6b18d',3);K.px(c,0,321,640,9,'#354d42');},
  lights(t,K){return[{x:193,y:121,color:'#f1d59f',radius:108,intensity:K.power(t)*.82,floorY:268,floorWidth:90}];}
});
