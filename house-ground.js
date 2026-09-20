'use strict';
// 17号住宅 · 一楼 (house_ground, 1320px): 玄关 → 客厅 → 楼梯 → 餐区 → 厨房. Kit smoke test; the room pass replaces this.
houseArt.registerRoom({id:'house_ground',length:1320,tint:'rgba(40,28,12,.08)',
  paint(c,L,K){const st=K.shell(c,L,'ground');
    for(const x of [240,768,1126])K.deadPendant(c,x);
    K.windowFrame(c,185,74,110,84,{view:'road'});K.stairsUp(c,400);
    K.picture(c,330,100,30,36,'family');K.picture(c,366,84,24,28,'bird');K.clock(c,320,80);
    K.sofa(c,246,244,122);K.armchair(c,150,246);K.rug(c,200,262,170,36);K.cabinet(c,700,240,120,50,K.P.walnut,{drawers:3});K.table(c,860,240,120,52);K.chair(c,845,244);K.chair(c,1000,244,K.P.oak,0);
    K.bookRow(c,704,186,110,3);K.wallShelf(c,700,188,120);K.plant(c,1030,240);K.lamp(c,175,190);K.radio(c,712,183);K.cabinet(c,1060,240,110,58,'#8e9481',{doors:3});K.windowFrame(c,1200,86,84,84,{view:'yard',broken:true});
    K.cabinet(c,1220,240,80,58,'#8e9481',{drawers:2});K.note(c,930,134,19,24,5);
  },
  dynamic(c,time,K){K.curtain(c,179,70,92,time,1);K.curtain(c,301,70,92,time,-1);K.motes(c,510,188,time);},
  foreground(c,time,K){K.stairsUpFront(c,400);},
  lights(time,K){return [K.windowLight(185,74,110,84,{color:'#e2b98a',intensity:.26}),{x:521,y:185,color:'#f2d09b',radius:104,intensity:.43,floorY:267,floorWidth:94},K.windowLight(1200,86,84,84,{color:'#bac7b2'})];}
});
