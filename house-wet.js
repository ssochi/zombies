'use strict';
// Plumbing props share a 240px floor contact; water falls only to the basin surface.
(() => {
  function sink(c,x,K){const {px,line}=K;K.cabinet(c,x,244,58,61,'#8d9f8e',{doors:2});px(c,x-3,179,64,5,'#c6cdb4');px(c,x+6,179,39,3,'#57796c');line(c,x+29,178,x+29,161,'#b7cbb6',2);line(c,x+29,161,x+38,161,'#b7cbb6',2);line(c,x+38,161,x+38,166,'#b7cbb6',2);}
  function mirror(c,x,y,w,h,K){const {px,line}=K;px(c,x-3,y-3,w+6,h+6,'#b7c1a7');px(c,x,y,w,h,'#69897d');px(c,x+3,y+3,w-6,h-6,'#89a394');line(c,x+5,y+22,x+w-8,y+6,'#b8c5ad');line(c,x+8,y+28,x+w-5,y+11,'#9fb9a2');px(c,x-5,y+h+3,w+10,3,'#a5b69b');}
  function toilet(c,x,K){const {px,poly}=K;K.shadow(c,x,244,40);px(c,x+3,184,32,31,'#aabda8');px(c,x+1,182,36,5,'#c9d1b6');px(c,x+6,188,3,21,'#c3cdb2');px(c,x+29,188,4,2,K.P.brass);poly(c,[[x-2,215],[x+41,215],[x+34,227],[x+8,227]],'#b7c7ae');px(c,x+2,213,37,4,'#d1d7bb');px(c,x+9,216,24,3,'#6e9380');poly(c,[[x+12,226],[x+29,226],[x+34,242],[x+8,242]],'#9aaf99');px(c,x+8,241,26,3,'#bfd0b3');}
  function wetProps(c,L,K){K.shell(c,L,'tile');K.rug(c,135,250,91,20,'#687d6c','#a5b49a');}
  houseArt.registerRoom({
    id:'house_wc',length:480,
    paint(c,L,K){wetProps(c,L,K);sink(c,148,K);mirror(c,152,93,50,60,K);toilet(c,286,K);
      K.windowFrame(c,369,84,59,63,{view:'yard'});K.wallShelf(c,279,155,51);K.bottle(c,285,155);K.bottle(c,300,155,'#b3ac8d');
      K.line(c,247,159,247,194,'#aac1a8',2);K.px(c,236,165,21,36,'#bfc8ad');K.px(c,236,194,21,3,'#809b82');
      K.px(c,344,198,8,13,'#c7cfb2');K.px(c,346,200,4,8,'#ecdfba');
    },
    dynamic(c,t,K){K.drip(c,186,167,179,t);K.beam(c,371,148,54,t);K.motes(c,359,181,t,5);K.sconce(c,124,110,t);},
    lights(t,K){return[K.windowLight(369,84,59,63,{intensity:.24}),{x:124,y:110,color:'#e7d9af',radius:94,intensity:K.power(t)*.42,floorY:268,floorWidth:69}];}
  });
  houseArt.registerRoom({
    id:'house_bath',length:560,
    paint(c,L,K){
      wetProps(c,L,K);sink(c,139,K);mirror(c,143,92,50,61,K);
      K.windowFrame(c,294,78,85,73,{view:'yard'});
      K.line(c,249,82,249,203,'#a5ba9f',2);K.line(c,249,82,269,82,'#a5ba9f',2);K.px(c,265,82,10,4,'#bdcdb0');
      K.shadow(c,239,245,163,4,.34);
      K.poly(c,[[238,204],[402,204],[394,233],[385,241],[254,241],[245,233]],'#a7bfa9');
      K.px(c,237,200,167,6,'#c8d2b6');K.px(c,246,204,147,3,'#678f7c');K.px(c,258,235,120,2,'#829e85');
      K.px(c,253,241,9,4,'#4d6b59');K.px(c,380,241,9,4,'#4d6b59');
      K.line(c,234,74,414,74,'#b5c5a7',2);
      K.radiator(c,448,243,64);K.line(c,449,161,508,161,'#bdc9ab',2);K.px(c,459,164,31,48,'#b2c2a6');
      for(let y=171;y<211;y+=9)K.px(c,459,y,31,1,'#96af94');
      K.bottle(c,385,199);K.bottle(c,375,199,'#b4aa84');
    },
    dynamic(c,t,K){
      // Fixed rings, free lower edge; no per-frame canvas or random particle allocation.
      for(let i=0;i<7;i++){const x=239+i*7,d=Math.sin(t*1.1+i*.43)*2.8;K.poly(c,[[x,78],[x+8,78],[x+8+d,226],[x+d,227]],i%2?'#9fb39e':'#b9c9ad');K.px(c,x+2,74,2,5,'#d1d5b6');}
      K.drip(c,334,188,205,t+1.7,4);K.line(c,333,180,333,187,'#bad0b3',2);
      K.beam(c,296,152,81,t);K.motes(c,303,162,t,7);
    },
    lights(t,K){return[K.windowLight(294,78,85,73,{intensity:.3,radius:176})];}
  });
  houseArt.registerRoom({
    id:'house_utility',length:640,
    paint(c,L,K){
      const {px,line}=K;K.shell(c,L,'utility');
      // Door 70 and resident x430 stay unobstructed. Work surfaces sit behind the lane.
      px(c,139,174,68,70,'#99aa98');px(c,139,174,68,4,'#c0c9ad');px(c,199,179,8,61,'#718a78');
      px(c,144,184,56,11,'#7c9681');px(c,149,187,11,4,'#3c6355');px(c,185,187,7,4,'#c4cba8');
      // Drum is polygonal at the native pixel resolution, not a blurred image.
      K.poly(c,[[158,201],[185,201],[195,211],[195,230],[185,239],[158,239],[150,230],[150,211]],'#567c6c');
      K.poly(c,[[163,205],[183,205],[190,213],[190,228],[183,234],[163,234],[155,228],[155,213]],'#273f38');
      line(c,161,209,181,207,'#91af96');K.box(c,148,174,45,25,'#959b7a');
      K.wallShelf(c,139,113,72);K.bottle(c,146,113);K.bottle(c,163,113,'#b1ab83');
      // Pegboard with deliberate groups of tools and a missing tool-bag space.
      px(c,267,91,185,80,'#596958');
      for(let y=98;y<165;y+=9)for(let x=274;x<446;x+=10)px(c,x,y,1,1,'#91a080');
      for(const x of [282,312,345]){line(c,x,110,x,146,'#abb49a',3);px(c,x-5,107,11,5,'#c0bda1');}
      K.table(c,249,245,214,63,'#85826a');K.cabinet(c,253,244,52,55,'#627c67',{drawers:3});
      K.box(c,379,179,47,22,'#607d68');px(c,391,166,22,2,'#c0b383');
      px(c,321,175,24,5,'#aaa886');px(c,330,165,5,12,'#6b7f6b');
      K.windowFrame(c,504,81,83,72,{view:'yard',broken:true});
      K.cabinet(c,498,245,91,61,'#748775',{doors:2});px(c,508,179,68,5,'#a3b89f');px(c,516,180,51,3,'#355e4d');
      line(c,549,164,549,178,'#b2c4a9',2);line(c,549,164,557,164,'#b2c4a9',2);
      line(c,218,80,218,228,'#7e9b83',3);line(c,218,80,607,80,'#7e9b83',3);
      K.box(c,474,244,19,17,'#847d5d');K.text(c,'12 V',386,156,'#a2b48f');
    },
    dynamic(c,t,K){
      K.drip(c,557,166,181,t+.8);K.beam(c,506,155,80,t);K.motes(c,472,181,t,8);
      K.sconce(c,235,106,t);
      // A suspended extension cable and tag respond to the draft, not an electric motor.
      const d=Math.sin(t*.88)*3;K.line(c,434,108,434+d,151,'#a29c77',2);K.px(c,429+d,151,11,14,'#b7ad87');
    },
    lights(t,K){return[K.windowLight(504,81,83,72,{intensity:.25}),{x:235,y:106,color:'#e3c98d',radius:117,intensity:K.power(t)*.65,floorY:269,floorWidth:95}];}
  });
})();
