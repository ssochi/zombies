'use strict';

// A small field notebook: clues are discovered in the house, never revealed by the index.
function houseNotebookClues(){
  return typeof HOUSE_CLUES==='undefined'?[]:(Array.isArray(HOUSE_CLUES)?HOUSE_CLUES:Object.values(HOUSE_CLUES));
}
function houseNotebookCount(){
  return houseNotebookClues().filter(clue=>houseState.read.has(clue.id)).length;
}
function houseNotebookLines(c,value,size,width){
  const paragraphs=Array.isArray(value)?value:String(value||'').split('\n');
  return paragraphs.flatMap(paragraph=>paragraph?wrapCn(c,String(paragraph),size,width):['']);
}
function houseNotebookButton(c,x,y,w,label,action,accent=false){
  const C=UI_COLORS;
  plate(c,x,y,w,24,accent?'#343824':C.plateSoft,accent?C.brass:C.bevelL,C.bevelD);
  cnText(c,label,x+w/2,y+6,10,accent?C.brass:C.text,'center');
  uiHit(x,y,w,24,{down:action});
}
function drawHouseMenuEntry(c,bx,by,width){
  const C=UI_COLORS;
  plate(c,bx,by,width,25,'#26302b','#77866a',C.bevelD);
  // The porch bulb is the marker used on the notebook and the entrance sign.
  px(c,bx+10,by+6,5,5,C.brass);px(c,bx+11,by+11,3,2,C.brassDim);
  cnText(c,'探索17号住宅',bx+width/2+6,by+4,10,C.text,'center');
  cnText(c,'门廊灯还亮着',bx+width/2+6,by+15,7,C.muted,'center','normal');
  uiHit(bx,by,width,25,{down:()=>startHouseVisit()});
  return 25;
}
function drawHouseUI(c,w,h){
  const reading=typeof houseReading!=='undefined'&&houseReading;
  const inHouse=typeof isHouseArea==='function'&&isHouseArea(area);
  if(!reading&&(!inHouse||state!=='playing'))return;
  const C=UI_COLORS,clues=houseNotebookClues(),count=houseNotebookCount(),total=clues.length||4;
  if(inHouse&&state==='playing'&&!reading){
    const x=7,y=49,bw=228;
    plate(c,x,y,bw,34,'#161d18','#515d47',C.bevelD);
    px(c,x+7,y+6,4,4,C.brass);px(c,x+8,y+10,2,2,C.brassDim);
    const room=interiorDef(area);
    cnText(c,room?room.name:'17号住宅 · 门廊',x+17,y+5,9,C.text);
    cnText(c,'门廊灯还亮着',x+7,y+20,8,C.muted,'left','normal');
    for(let i=0;i<total;i++)px(c,x+94+i*7,y+23,4,4,clues[i]&&houseState.read.has(clues[i].id)?C.brass:'#49513e');
    pixelText(c,`${count}/${total}`,x+126,y+21,1,C.muted,null);
    plate(c,x+bw-56,y+5,50,24,C.plateSoft,C.bevelL,C.bevelD);
    cnText(c,uiTouch?'手记':'手记 J',x+bw-31,y+11,9,C.brass,'center');
    uiHit(x+bw-56,y+5,50,24,{down:()=>houseOpenJournal()});
    return;
  }
  if(!reading)return;

  // Clear underlying weapon/door/pause hits, then consume every point outside the sheet too.
  uiHits.length=0;
  uiHit(0,0,w,h,{down:()=>{}});
  px(c,0,0,w,h,'rgba(7,10,8,.82)');
  const bw=Math.min(408,w-32),bh=Math.min(264,h-24),x=Math.round((w-bw)/2),y=Math.round((h-bh)/2);
  const paper='#d2ccb3',ink='#353a2e',softInk='#68705a';
  px(c,x+5,y+5,bw,bh,'#080b08');
  plate(c,x,y,bw,bh,paper,'#e5dfc8','#8b8a71');
  px(c,x+8,y+8,2,bh-16,'#b8b398');px(c,x+14,y+39,bw-28,1,'#aaa98e');
  px(c,x+20,y+16,5,5,'#686c4e');px(c,x+21,y+21,3,2,'#686c4e');
  cnText(c,'17号住宅 / 探索手记',x+32,y+13,10,ink,'left','bold',null);
  pixelText(c,`${count}/${total}`,x+bw-20,y+17,1,softInk,null,'right');

  if(reading.journal){
    cnText(c,'门廊灯还亮着',x+21,y+49,14,ink,'left','bold',null);
    cnText(c,'已找到的纸条会保留在这里。',x+21,y+69,9,softInk,'left','normal',null);
    const ry=y+89,rowH=29;
    clues.forEach((clue,index)=>{
      const yy=ry+index*rowH,found=houseState.read.has(clue.id);
      px(c,x+20,yy,bw-40,26,found?'#c3c1a8':'#cbc7af');
      pixelText(c,String(index+1).padStart(2,'0'),x+27,yy+9,1,found?'#686c4e':'#8c907b',null);
      cnText(c,found?clue.title:'尚未发现',x+48,yy+7,10,found?ink:'#888c78','left',found?'bold':'normal',null);
      if(found){
        cnText(c,'阅读',x+bw-29,yy+8,9,softInk,'right','normal',null);
        uiHit(x+20,yy,bw-40,26,{down:()=>houseReadClue(clue.id)});
      }
    });
    houseNotebookButton(c,x+bw-112,y+bh-37,92,uiTouch?'收起手记':'收起 / Esc',()=>houseCloseReading(),true);
    cnText(c,'留意家具、窗户和他们带走的东西。',x+21,y+bh-28,8,softInk,'left','normal',null);
  }else{
    cnText(c,reading.title||'留下的纸条',x+21,y+51,14,ink,'left','bold',null);
    const textLines=houseNotebookLines(c,reading.text,12,bw-60);
    let lineY=y+79;
    for(const line of textLines){cnText(c,line,x+29,lineY,12,ink,'left','normal',null);lineY+=19;}
    lineY+=7;px(c,x+29,lineY,bw-58,1,'#b2b197');lineY+=12;
    const detailLines=houseNotebookLines(c,reading.detail,9,bw-60);
    for(const line of detailLines){cnText(c,line,x+29,lineY,9,softInk,'left','normal',null);lineY+=14;}
    houseNotebookButton(c,x+20,y+bh-37,90,'全部手记',()=>houseOpenJournal());
    houseNotebookButton(c,x+bw-112,y+bh-37,92,uiTouch?'继续探索':'继续 / Esc',()=>houseCloseReading(),true);
  }
}
