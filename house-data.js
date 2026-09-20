'use strict';
// A fixed family home. Rooms and connectors are explicit so every return reaches the same doorway.
const HOUSE_CLUES=[
 {id:'schedule',area:'house_ground',x:1190,title:'冰箱上的排班表',text:'周五：伊芙晚班。露西 16:30 放学。N 记得修后院灯。',detail:'排班表写着“护士：伊芙·米勒”。旁边贴着维修站收据，儿童画里有三个人站在同一扇门前。'},
 {id:'notice',area:'house_ground',x:800,title:'诊所的手写通知',text:'诊所停止接诊。下一集合点：旧水塔。只带必需品。',detail:'三份晚饭没有吃完。餐边柜里是拆开的急救包，餐桌旁少了一把椅子。'},
 {id:'drawing',area:'house_child',x:420,title:'露西没有画完的家',text:'房子要有一盏灯，不然爸爸晚上回来会找不到。',detail:'书包和常抱的玩偶不在了。小凳被拖到窗边，窗外的梯子搭在门廊屋顶。'},
 {id:'note',area:'house_ground',x:935,title:'维修间外的留言',text:'伊芙，露西，我去水塔。门廊灯留着。——N',detail:'背面是 LAST STOP 汽车电工诺亚·米勒的维修工单，纸角留着包扎后的指印。工具袋不见了；他们是否团聚，仍然未知。'}
];
const housePortal=(id,x,label,target,targetX,extra={})=>({id,x,w:38,label,target,targetX,targetY:292,targetFace:1,...extra});
const HOUSE_ROOMS={
 house_ground:{id:'house_ground',name:'17号住宅 · 一楼',code:'H-01',length:1320,spawns:[{x:1215,y:287,kind:'normal',type:2,awake:false}],loot:[{x:830,y:294,type:'health'}],exits:[
  housePortal('miller_inside_front',105,'离开住宅','road',4420,{doorKey:'miller_front',targetFace:1}),
  housePortal('miller_stairs_up',400,'上二楼','house_landing',180,{kind:'stairs',direction:1}),
  housePortal('miller_wc_enter',650,'进入卫生间','house_wc',70,{doorKey:'miller_wc'}),
  housePortal('miller_utility_enter',990,'移开挡椅 · 门后有动静','house_utility',70,{doorKey:'miller_utility',kind:'barricade'})]},
 house_landing:{id:'house_landing',name:'17号住宅 · 二楼走廊',code:'H-02',length:800,spawns:[],loot:[],exits:[
  housePortal('miller_stairs_down',180,'下一楼','house_ground',400,{kind:'stairs',direction:-1,targetFace:-1}),
  housePortal('miller_master_enter',340,'进入主卧','house_master',70,{doorKey:'miller_master'}),
  housePortal('miller_child_enter',505,'进入儿童房','house_child',70,{doorKey:'miller_child'}),
  housePortal('miller_bath_enter',680,'进入浴室','house_bath',70,{doorKey:'miller_bath'})]},
 house_master:{id:'house_master',name:'17号住宅 · 主卧',code:'H-03',length:640,spawns:[],loot:[],exits:[housePortal('miller_master_leave',70,'返回二楼走廊','house_landing',340,{doorKey:'miller_master',targetFace:-1})]},
 house_child:{id:'house_child',name:'17号住宅 · 露西的房间',code:'H-04',length:640,spawns:[],loot:[],exits:[
  housePortal('miller_child_leave',70,'返回二楼走廊','house_landing',505,{doorKey:'miller_child',targetFace:-1}),
  housePortal('miller_window_exit',530,'解开窗扣 · 前往门廊屋顶','house_roof',120,{doorKey:'miller_window',kind:'window'})]},
 house_bath:{id:'house_bath',name:'17号住宅 · 家庭浴室',code:'H-05',length:560,spawns:[],loot:[],exits:[housePortal('miller_bath_leave',70,'返回二楼走廊','house_landing',680,{doorKey:'miller_bath',targetFace:-1})]},
 house_wc:{id:'house_wc',name:'17号住宅 · 一楼卫生间',code:'H-06',length:480,spawns:[],loot:[],exits:[housePortal('miller_wc_leave',70,'返回一楼','house_ground',650,{doorKey:'miller_wc',targetFace:-1})]},
 house_utility:{id:'house_utility',name:'17号住宅 · 洗衣维修间',code:'H-07',length:640,spawns:[{x:430,y:288,kind:'normal',type:1,awake:true}],loot:[{x:510,y:294,type:'ammo',amount:.55}],exits:[housePortal('miller_utility_leave',70,'返回一楼','house_ground',990,{doorKey:'miller_utility',targetFace:-1})]},
 house_roof:{id:'house_roof',name:'17号住宅 · 门廊屋顶',code:'H-08',length:640,spawns:[],loot:[],exits:[
  housePortal('miller_window_return',120,'返回儿童房','house_child',530,{doorKey:'miller_window',kind:'window',targetFace:-1}),
  housePortal('miller_ladder',500,'沿梯子下到前院','road',4710,{kind:'ladder',direction:-1,targetFace:1})]}
};
const houseState={doors:{},read:new Set(),visited:new Set(),shortcut:false,doorMotion:null,ambientTimer:2};
let houseReading=null;
function isHouseArea(id){return Boolean(HOUSE_ROOMS[id]);}
function resetHouse(){houseState.doors={};houseState.read.clear();houseState.visited.clear();houseState.shortcut=false;houseState.doorMotion=null;houseState.ambientTimer=2;houseReading=null;}
function houseReadClue(id){const clue=HOUSE_CLUES.find(c=>c.id===id);if(!clue)return;houseState.read.add(id);houseReading={...clue};houseStopInput();}
function houseStopInput(){pointer.down=false;triggerLatched=false;touchFiring=false;keys.clear();uiActive.clear();}
function houseOpenJournal(){if(areaTransition||state!=='playing'||(!isHouseArea(area)&&!houseState.read.size))return;houseReading={journal:true};houseStopInput();}
function houseCloseReading(){houseReading=null;houseStopInput();}
function houseNearbyClue(){if(!isHouseArea(area))return null;return HOUSE_CLUES.filter(c=>c.area===area&&Math.abs(c.x-player.x)<27).sort((a,b)=>Math.abs(a.x-player.x)-Math.abs(b.x-player.x))[0]||null;}
function startHouseVisit(){startGame();player.x=4420;player.y=292;furthestX=4420;nextEncounterX=5170;claimedSupplyStops.add(1480);claimedSupplyStops.add(3010);viewX=clampAreaCamera(player.x-cameraLead());for(let i=0;i<zombies.length;i++){zombies[i].x=player.x+420+i*95;zombies[i].pose=makeZombiePose(zombies[i]);}saveArea();loadArea('house_ground',105,4420);player.y=292;player.face=1;houseState.doors.miller_front=true;player.pose=makePlayerPose().pose;announce('17号住宅 · 门廊灯还亮着',3);}
function houseWakeEnemies(radius=620){if(!isHouseArea(area))return;for(const z of zombies)if(z.houseResident&&Math.abs(z.x-player.x)<radius)z.awake=true;}
function updateHouseAmbience(dt){
 if(!isHouseArea(area))return;houseState.ambientTimer-=dt;if(houseState.ambientTimer>0)return;
 houseState.ambientTimer=3.5+Math.random()*3;
 const held=areaStates.house_utility;const neighborAlive=!held?.seeded||held.zombies.some(z=>!z.dead);
 if(area==='house_ground'&&Math.abs(player.x-990)<230&&!houseState.doors.miller_utility&&neighborAlive)sound('houseKnock',990);
 else if(area==='house_bath'||area==='house_wc'||area==='house_ground'&&player.x>1100)sound('houseDrip',player.x+45);
 else if(area==='house_landing'||area==='house_child')sound('houseCreak',player.x-70);
}
