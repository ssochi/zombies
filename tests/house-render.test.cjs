'use strict';
// No npm dependencies: node --test tests/house-render.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const files=['house-data.js','house.js','house-ground.js','house-upper.js','house-wet.js','house-roof.js'];
function recordingContext(){
  const stack=[],calls=[];
  const ctx={calls,globalAlpha:1,fillStyle:'#000',strokeStyle:'#000',lineWidth:1,imageSmoothingEnabled:false,
    save(){stack.push({globalAlpha:this.globalAlpha,fillStyle:this.fillStyle,strokeStyle:this.strokeStyle,lineWidth:this.lineWidth});},
    restore(){assert.ok(stack.length,'balanced restore');Object.assign(this,stack.pop());},
    get depth(){return stack.length;}};
  for(const method of ['rect','clip','fillRect','translate','rotate','beginPath','moveTo','lineTo','closePath','fill','stroke','fillText','drawImage'])ctx[method]=function(...args){for(const v of args)if(typeof v==='number')assert.ok(Number.isFinite(v),`${method}: finite coordinates`);calls.push([method,...args.filter(a=>typeof a!=='object'),this.fillStyle,this.strokeStyle,this.globalAlpha]);};
  return ctx;
}
function load(reduced=false){
  const canvases=[];
  const sandbox={console,matchMedia:()=>({matches:reduced}),document:{createElement(tag){assert.equal(tag,'canvas');const c=recordingContext(),cv={width:0,height:0,getContext:()=>c};canvases.push(cv);return cv;}}};
  vm.createContext(sandbox);
  for(const name of files)vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
  const {art,rooms,state,clues}=vm.runInContext('({art:houseArt,rooms:HOUSE_ROOMS,state:houseState,clues:HOUSE_CLUES})',sandbox);
  return{art,rooms,state,clues,canvases};
}
test('all eight gameplay rooms are painted and cached exactly once',()=>{
  const {art,rooms,canvases}=load();assert.equal(Object.keys(rooms).length,8);
  for(const [id,r] of Object.entries(rooms)){
    const c=recordingContext(),before=canvases.length;art.draw(c,id,0,0,640);
    assert.equal(canvases.length,before+1,`${id}: registered`);
    assert.equal(canvases.at(-1).width,r.length);assert.equal(canvases.at(-1).height,330);
    assert.ok(canvases.at(-1).getContext().calls.length>50,`${id}: not a blank placeholder`);
    for(let f=0;f<10;f++){art.draw(c,id,Math.max(0,r.length-640),f/10,640);art.foreground(c,id,0,f/10,640);art.grade(c,id,640);}
    assert.equal(canvases.length,before+1,`${id}: reuses static cache`);assert.equal(c.depth,0);assert.equal(c.globalAlpha,1);
  }
});
test('animations are deterministic and every room changes over time',()=>{
  const {art,rooms}=load();
  for(const id of Object.keys(rooms)){
    art.draw(recordingContext(),id,0,0,1320);
    const a=recordingContext(),b=recordingContext(),d=recordingContext();
    art.draw(a,id,0,1.2,1320);art.draw(b,id,0,1.2,1320);art.draw(d,id,0,3.1,1320);
    assert.deepEqual(a.calls,b.calls,`${id}: deterministic`);assert.notDeepEqual(a.calls,d.calls,`${id}: animated`);
  }
});
test('reduced motion freezes ambient animation and light power',()=>{
  const {art,rooms}=load(true);
  for(const id of Object.keys(rooms)){
    art.draw(recordingContext(),id,0,0,1320);const a=recordingContext(),b=recordingContext();
    art.draw(a,id,0,0,1320);art.draw(b,id,0,24,1320);assert.deepEqual(a.calls,b.calls);
    assert.deepEqual(art.lights(id,0,0),art.lights(id,0,24));
  }
});
test('door motion changes rendering without regenerating the cache or mutating state',()=>{
  const {art,state,canvases}=load();const a=recordingContext(),b=recordingContext();art.draw(a,'house_ground',0,1,1320);
  state.doors.miller_utility=true;state.doorMotion={key:'miller_utility',progress:.5};
  const before=JSON.stringify(state);art.draw(b,'house_ground',0,1,1320);
  assert.notDeepEqual(a.calls,b.calls);assert.equal(canvases.length,1);assert.equal(JSON.stringify(state),before);
  state.doors.miller_window=true;art.draw(recordingContext(),'house_child',0,1,640);
});
test('lights use camera space, valid radii, finite time and explicit zero intensity',()=>{
  const {art,rooms}=load();
  for(const id of Object.keys(rooms))for(const t of [0,.5,10,NaN,Infinity]){
    const lights=art.lights(id,137,t),original=art.lights(id,0,t);assert.ok(lights.length>0);
    lights.forEach((l,i)=>{assert.equal(l.x,original[i].x-137);assert.ok(l.intensity>=0&&l.intensity<1);assert.ok(l.radius>0);});
  }
  assert.equal(art.kit.windowLight(0,0,10,10,{intensity:0}).intensity,0);
});
test('room registration invalidates only that room; public rendering preserves canvas state',()=>{
  const {art,canvases}=load();const c=recordingContext();c.globalAlpha=.4;
  art.draw(c,'house_master',0,0);art.foreground(c,'house_master',0,0);art.grade(c,'house_master');assert.equal(c.globalAlpha,.4);
  art.registerRoom({id:'house_master',length:640,paint(c,L,K){K.px(c,0,0,L,330,'#abcdef');}});
  art.draw(c,'house_master',0,0);assert.equal(canvases.length,2);assert.equal(c.depth,0);
});
test('portal destinations and all four clues still resolve in the canonical gameplay data',()=>{
  const {art,rooms,clues}=load();
  for(const [id,r] of Object.entries(rooms)){
    assert.equal(art.roomLength(id),r.length);
    for(const p of r.exits){assert.ok(p.x>0&&p.x<r.length);if(p.target!=='road'){assert.ok(rooms[p.target]);assert.ok(p.targetX>0&&p.targetX<rooms[p.target].length);}}
  }
  assert.equal(clues.length,4);for(const clue of clues)assert.ok(rooms[clue.area]&&clue.x<rooms[clue.area].length);
});
