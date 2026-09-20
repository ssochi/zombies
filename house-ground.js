'use strict';
// One continuous 1320px floor: entry / living / stairs / dining / kitchen.
// Keep portal and clue x positions from house-data.js. Back-wall furniture ends
// at y244; the playable lane stays clear. Every lamp rests on a real surface.
houseArt.registerRoom({
  id:'house_ground',length:1320,tint:'rgba(28,32,22,.025)',
  paint(c,L,K){
    const {px,line,poly,P}=K;K.shell(c,L,'ground');
    K.rug(c,64,247,78,16,'#575949','#8b8b6b');
    K.rug(c,213,250,174,31,'#6b6051','#a39170');
    K.rug(c,714,249,182,22,'#5f6860','#8e9275');
    // Entry: shoes, hooks and an empty coat peg, without covering the front door.
    K.cabinet(c,20,243,42,35,'#64634e',{doors:2});
    px(c,22,202,16,5,'#3c4941');px(c,42,202,15,5,'#736d54');
    px(c,24,113,31,5,'#9d9271');for(const x of [29,40,51])line(c,x,116,x-2,122,P.brass,2);
    poly(c,[[27,123],[37,123],[41,164],[23,164]],'#62746d');
    K.picture(c,29,77,23,28,'family');
    // CRT is unpowered. The radio and stair lamp use the household battery.
    K.cabinet(c,151,244,49,46,'#626451',{doors:2});
    px(c,157,160,37,33,'#404f49');px(c,159,162,34,2,'#88937c');
    px(c,161,166,26,21,'#283d3a');line(c,164,171,180,168,'#50655e');
    px(c,189,170,2,3,P.brass);px(c,166,193,21,3,'#414c42');
    K.windowFrame(c,236,78,110,79,{view:'road'});
    K.table(c,203,244,19,49);K.lamp(c,212,195);
    K.sofa(c,236,244,143,'#527069');
    px(c,255,191,19,17,'#ae986b');px(c,256,191,17,2,'#c3b080');
    poly(c,[[343,188],[361,188],[366,231],[351,232]],'#9b9d88');
    for(let y=195;y<230;y+=7)line(c,350,y,364,y+2,'#7d8c7c');
    K.table(c,280,254,70,27,'#756b53');K.cup(c,327,226); // low coffee table
    px(c,292,222,23,4,P.paper);line(c,295,223,309,223,'#8d917c');
    K.stairsUp(c,400);
    K.picture(c,438,86,32,39,'family');K.picture(c,481,95,25,30,'drawing');
    for(let i=0;i<5;i++){px(c,435,150+i*11,6+i%2*3,1,'#a2a085');}
    K.text(c,'L  9',445,154,'#aeb293',5);
    // Door 650 needs its full jamb and approach; no console across the opening.
    K.picture(c,686,84,31,38,'landscape');
    K.cabinet(c,698,244,62,57,'#5f6958',{drawers:3});K.radio(c,708,184);
    K.note(c,791,116,19,24,5); // clue: clinic notice at x800
    // Chairs at the back, then the dining table, so their legs do not float over its top.
    K.chair(c,793,239,'#777658');K.chair(c,863,239,'#777658');
    K.table(c,772,246,122,53,'#8c7d5d');
    for(const x of [789,829,868]){px(c,x,190,17,3,'#c0bf9e');px(c,x+3,190,11,1,'#738273');}
    K.cup(c,813,192);K.cup(c,861,192);K.bottle(c,839,191,'#899277');
    px(c,723,169,16,10,'#b9bc9f');px(c,729,171,3,6,'#926c55');px(c,726,174,9,2,'#926c55');
    K.note(c,926,122,18,24,5); // clue: Noah's message at x935
    line(c,936,148,936,166,'#868975');
    // Kitchen is a material zone, not a pasted-on second room.
    px(c,1040,68,272,109,'#7c8878');
    for(let y=141;y<239;y+=12)for(let x=1040;x<1312;x+=24){px(c,x+1,y+1,22,10,'#647e72');px(c,x+1,y+1,22,1,'#8a9b83');}
    K.floorTiles(c,1039,273,['#515f55','#47584f']);
    K.cabinet(c,1048,244,115,63,'#8a9980',{doors:3});
    K.cabinet(c,1048,133,114,40,'#909e84',{doors:3});
    px(c,1046,178,119,4,'#bebfa6');px(c,1046,182,119,2,'#445b4f');
    // Stove / oven, hood, pans, jar and tea towel.
    px(c,1055,183,48,52,'#8e9f8e');px(c,1060,200,38,27,'#384f46');px(c,1062,202,34,2,'#617b68');
    for(const x of [1061,1072,1083,1094])px(c,x,189,4,3,'#566954');
    for(const x of [1060,1083]){px(c,x,177,12,3,'#344d43');px(c,x+2,175,8,2,'#718575');}
    px(c,1055,137,45,5,'#aab299');px(c,1061,133,34,4,'#859780');
    px(c,1121,168,15,10,'#81977e');px(c,1121,168,15,2,'#b6c2a2');K.bottle(c,1143,178,'#84977a');
    px(c,1134,199,16,29,'#b9bca0');for(let y=207;y<227;y+=7)px(c,1134,y,16,2,'#899d86');
    // Adult-height refrigerator, with the schedule directly on its door.
    px(c,1175,113,43,131,'#9eaa93');px(c,1175,113,43,3,'#c6cbb0');px(c,1214,115,4,125,'#6a8270');
    px(c,1178,116,33,34,'#acb69c');px(c,1178,154,33,82,'#a5b198');px(c,1177,151,36,2,'#586f5e');
    px(c,1206,134,3,12,'#526c5d');px(c,1206,161,3,16,'#526c5d');
    K.note(c,1181,165,18,24,5);px(c,1199,120,8,10,'#c9b28a');
    K.windowFrame(c,1234,82,59,79,{view:'yard',broken:true});
    K.cabinet(c,1227,244,75,63,'#8a9980',{doors:2});px(c,1225,178,79,4,'#c0c2a7');
    px(c,1243,177,35,4,'#3e5d51');line(c,1250,169,1250,158,'#b7c4b0',2);line(c,1250,158,1261,158,'#b7c4b0',2);line(c,1261,158,1261,163,'#b7c4b0',2);
    K.cup(c,1289,178);K.shadow(c,1228,244,74);
  },
  dynamic(c,t,K,view){
    if(view.left<395){K.beam(c,238,158,108,t);K.curtain(c,228,72,112,t,1);K.curtain(c,355,72,112,t,-1);K.motes(c,271,168,t,12);K.clock(c,184,91,t);K.pendant(c,302,t);}
    if(view.right>500&&view.left<920){K.sconce(c,521,181,t);K.pendant(c,825,t);K.motes(c,521,190,t,7);K.px(c,731,173,2,2,'#c7ba7b');}
    if(view.right>940&&!K.doorOpen('miller_utility'))K.chair(c,996,260,'#7c7557',-.18);
    if(view.right>1140){K.curtain(c,1299,76,100,t,-1,'#b3bda3');K.drip(c,1261,164,178,t);K.beam(c,1235,162,56,t);}
  },
  foreground(c,t,K){K.stairsUpFront(c,400);},
  lights(t,K){return[K.windowLight(236,78,110,79,{color:'#d3c7a5',intensity:.23}),{x:521,y:181,color:'#f0d59f',radius:119,intensity:K.power(t),floorY:269,floorWidth:101},K.windowLight(1234,82,59,79,{intensity:.27})];}
});
