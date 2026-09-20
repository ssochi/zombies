'use strict';

// One appearance model shared by the game and the animation fitting room.
const wardrobe=(()=>{
  const key='last-light-wardrobe-v1';
  const catalog={
    head:[{id:'cap',name:'巡游帽'},{id:'beanie',name:'针织帽'},{id:'helmet',name:'战术头盔'},{id:'none',name:'不戴帽子'}],
    top:[{id:'tee',name:'短袖作战衫'},{id:'jacket',name:'野战夹克'},{id:'armor',name:'防护背心'}],
    pants:[{id:'cargo',name:'工装长裤'},{id:'jeans',name:'牛仔长裤'}],
    boots:[{id:'boots',name:'高帮战靴'},{id:'sneakers',name:'帆布鞋'}],
    gear:[{id:'pack',name:'远行背包'},{id:'rig',name:'胸前弹挂'},{id:'none',name:'轻装'}],
    face:[{id:'scarf',name:'防尘围巾'},{id:'mask',name:'呼吸面罩'},{id:'none',name:'无遮挡'}]
  };
  const defaults={head:'cap',top:'tee',pants:'cargo',boots:'boots',gear:'pack',face:'scarf',colors:{top:'#7c7d6d',pants:'#caa272',boots:'#4c2a22',gear:'#373c2f',head:'#414439',face:'#743c20',skin:'#cba16e'}};
  const presets=[
    {id:'wanderer',name:'荒野旅人',description:'经典巡游帽 · 轻便短袖 · 远行背包',config:defaults},
    {id:'ranger',name:'林地游骑兵',description:'野战夹克 · 战术头盔 · 林地配色',config:{head:'helmet',top:'jacket',pants:'cargo',boots:'boots',gear:'pack',face:'scarf',colors:{top:'#56614b',pants:'#75745a',boots:'#423d31',gear:'#4c543b',head:'#697254',face:'#a78d59',skin:'#bb8b61'}}},
    {id:'breacher',name:'城市破阵者',description:'防护背心 · 呼吸面罩 · 胸前弹挂',config:{head:'helmet',top:'armor',pants:'cargo',boots:'boots',gear:'rig',face:'mask',colors:{top:'#465461',pants:'#58606a',boots:'#31373d',gear:'#625e4c',head:'#4e5a63',face:'#3d474c',skin:'#ddb38b'}}},
    {id:'scavenger',name:'街区拾荒者',description:'针织帽 · 牛仔长裤 · 帆布鞋',config:{head:'beanie',top:'jacket',pants:'jeans',boots:'sneakers',gear:'none',face:'none',colors:{top:'#995a43',pants:'#475c76',boots:'#b4a48b',gear:'#655a43',head:'#ae8142',face:'#6e503e',skin:'#a97850'}}}
  ];
  const copy=o=>JSON.parse(JSON.stringify(o));
  let current=copy(defaults),cached=null;
  function normalize(value,base=defaults){
    const out=copy(base);if(!value||typeof value!=='object'||Array.isArray(value))return out;
    for(const slot of Object.keys(catalog))if(catalog[slot].some(item=>item.id===value[slot]))out[slot]=value[slot];
    if(value.colors&&typeof value.colors==='object')for(const name of Object.keys(defaults.colors))if(typeof value.colors[name]==='string'&&/^#[\da-f]{6}$/i.test(value.colors[name]))out.colors[name]=value.colors[name].toLowerCase();
    return out;
  }
  function set(patch){current=normalize(patch,current);cached=null;return get();}
  function get(){return copy(current);}
  function reset(){current=copy(defaults);cached=null;return get();}
  function applyPreset(id){const p=presets.find(p=>p.id===id);if(p){current=normalize(p.config);cached=null;}return get();}
  function save(){try{localStorage.setItem(key,JSON.stringify({version:1,config:current}));return true;}catch{return false;}}
  function load(){try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&saved.version===1){current=normalize(saved.config);cached=null;}}catch{}return get();}
  function shade(hex,factor){const n=parseInt(hex.slice(1),16);return '#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v*factor))).toString(16).padStart(2,'0')).join('');}
  function palette(){if(!cached){cached={...current.colors};for(const [name,color] of Object.entries(current.colors)){cached[name+'Dark']=shade(color,.74);cached[name+'Light']=shade(color,1.19);cached[name+'Deep']=shade(color,.51);}}return cached;}
  load();
  return {catalog,presets,get,set,applyPreset,reset,save,load,palette};
})();
