'use strict';
// Upstairs: four independently cached rooms. Door/window locations are gameplay anchors.
houseArt.registerRoom({
  id:'house_landing',length:800,
  paint(c,L,K){
    K.shell(c,L,'upper');K.rug(c,266,250,469,25,'#6b6458','#a29879');
    K.windowFrame(c,30,80,78,91,{view:'yard'});K.radiator(c,32,241,77);K.stairsDown(c,180);
    K.cabinet(c,222,244,60,47,'#647368',{drawers:2});K.lamp(c,251,194);
    K.picture(c,232,92,39,41,'family');K.picture(c,399,88,40,48,'landscape');
    K.picture(c,568,98,34,37,'drawing');
    K.wallShelf(c,566,177,51);K.bookRow(c,570,177,40,17);
    K.text(c,'01',333,82,'#b7baa2');K.text(c,'02',498,82,'#b7baa2');K.text(c,'03',673,82,'#b7baa2');
    K.box(c,741,242,33,24,'#78836d');
  },
  dynamic(c,t,K){K.curtain(c,24,74,118,t);K.curtain(c,115,74,118,t,-1);K.beam(c,32,171,76,t);K.motes(c,127,204,t);K.sconce(c,455,109,t);K.plant(c,745,218,{time:t});},
  foreground(c,t,K){K.stairsDownFront(c,180);},
  lights(t,K){return[K.windowLight(30,80,78,91,{intensity:.26}),{x:455,y:109,color:'#ebd2a1',radius:125,intensity:K.power(t)*.72,floorY:267,floorWidth:90}];}
});
houseArt.registerRoom({
  id:'house_master',length:640,
  paint(c,L,K){
    const {px,line}=K;K.shell(c,L,'upper');K.rug(c,253,252,211,31,'#637369','#99a58e');
    // 125px wardrobe / 79px headboard / 49px bedside table / 120px adult.
    K.cabinet(c,123,244,89,124,'#586a63',{doors:2});px(c,166,130,35,94,'#7b9085');
    line(c,171,145,192,137,'#a1b2a1');line(c,172,151,189,144,'#8da796');
    K.cabinet(c,230,244,34,48,'#637164',{drawers:2});K.lamp(c,247,193);
    K.bed(c,280,245,158,{blanket:'#617c77',frame:'#596960'});
    K.picture(c,325,94,56,43,'family');
    K.cabinet(c,454,244,36,48,'#637164',{drawers:2});K.cup(c,465,193);px(c,475,189,11,4,K.P.paper);
    K.windowFrame(c,520,80,82,85,{view:'yard'});K.radiator(c,521,242,76);
    K.box(c,144,117,41,17,'#8a9378');
    // An open, almost empty suitcase is a departure clue, not random debris.
    px(c,198,229,31,14,'#766e51');px(c,200,219,27,10,'#5e6653');px(c,203,222,21,7,'#aca88d');px(c,198,241,31,2,'#454e3e');
  },
  dynamic(c,t,K){K.curtain(c,512,73,120,t,1,'#a9b9b0');K.curtain(c,609,73,120,t,-1,'#a9b9b0');K.beam(c,523,167,77,t);K.motes(c,482,188,t,11);K.pendant(c,362,t);},
  lights(t,K){return[K.windowLight(520,80,82,85,{intensity:.3,radius:192})];}
});
houseArt.registerRoom({
  id:'house_child',length:640,
  paint(c,L,K){
    const {px,line,poly}=K;K.shell(c,L,'child');
    K.rug(c,140,251,199,33,'#717862','#aaa37a');
    K.bed(c,137,244,115,{child:true,blanket:'#b29965',frame:'#84876d'});
    K.picture(c,159,94,40,37,'drawing');K.picture(c,213,104,22,27,'landscape');
    K.cabinet(c,276,244,57,98,'#7a8970',{doors:2});
    K.bookRow(c,279,143,48,12);
    // Missing backpack and toy leave a quiet outline; the drawing is at clue x420.
    K.chair(c,391,241,'#88896a');K.table(c,367,245,100,49,'#949071');
    K.note(c,409,145,24,27,2,{paper:'#e0d4aa'});K.picture(c,412,148,18,19,'drawing');
    px(c,417,190,21,3,K.P.paper);for(let i=0;i<4;i++)line(c,447+i*3,189,449+i*3,179,['#b59262','#798a74','#9b7769','#6f8585'][i]);
    K.wallShelf(c,366,113,95);K.bookRow(c,374,113,62,18);
    // The escape window center is exactly x530, as is its interaction.
    K.windowFrame(c,491,82,82,94,{view:'road',latch:true});
    K.table(c,510,244,38,29,'#929473');
    line(c,513,253,539,252,'#a6a184');line(c,515,256,542,255,'#615f4d');
    K.box(c,348,242,20,18,'#7d8e79');
    for(const [x,y] of [[364,88],[381,75],[455,88],[588,100]]){px(c,x,y,3,1,'#b9b58d');px(c,x+1,y-1,1,3,'#b9b58d');}
    // Rope follows the same window that leads to the roof, rather than another opening.
    line(c,565,174,573,237,'#939578');
  },
  dynamic(c,t,K){
    K.curtain(c,483,76,122,t,1,'#c1b992');K.curtain(c,581,76,122,t,-1,'#c1b992');K.beam(c,493,178,79,t);
    for(let i=0;i<3;i++)K.paperBird(c,290+i*24,86+i%2*13,t,i);
    K.motes(c,451,187,t,12);
    if(K.doorOpen('miller_window')){K.px(c,533,132,35,43,'rgba(39,65,56,.2)');K.line(c,535,131,565,116,'#c1c6a2',2);}
  },
  lights(t,K){return[K.windowLight(491,82,82,94,{color:'#d8cba4',intensity:.31,radius:187})];}
});
