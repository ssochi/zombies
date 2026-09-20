// Headless screenshots of house rooms for art review.
// usage: node scripts/shoot-house.mjs <prefix> house_ground:0 house_ground:680 house_master:0 ...
//   each spec is roomId:cameraLeft[:playerX]. Output: output/playwright/<prefix>-<room>-<cam>.png
// Optional env: VW=1440 VH=810 (viewport), TIME=3 (worldTime for animated parts).
import {chromium} from '/Users/wanqilin/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/index.mjs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const [prefix,...specs]=process.argv.slice(2);
if(!prefix||!specs.length){console.error('usage: node scripts/shoot-house.mjs <prefix> room:cam[:playerX] ...');process.exit(1);}
const VW=Number(process.env.VW||1440),VH=Number(process.env.VH||810),TIME=Number(process.env.TIME||3);
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:VW,height:VH},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto('file://'+root+'index.html');
await page.waitForTimeout(400);
for(const spec of specs){
  const [id,camStr,pxStr]=spec.split(':');const cam=Number(camStr||0);
  await page.evaluate(({id,cam,pxStr,TIME})=>{
    if(state!=='playing'||!isHouseArea(area))startHouseVisit();
    saveArea();loadArea(id,100);
    const lead=cameraLead();player.x=pxStr!==undefined?Number(pxStr):Math.max(30,Math.min(areaLength()-30,cam+lead));player.y=292;player.face=1;
    viewX=clampAreaCamera(cam);worldTime=TIME;noticeTime=0;HUD.notice='';
  },{id,cam,pxStr,TIME});
  await page.waitForTimeout(250);
  const out=`${root}output/playwright/${prefix}-${id.replace('house_','')}-${cam}.png`;
  await page.screenshot({path:out});console.log('wrote',out);
}
if(errors.length)console.log('PAGE ERRORS:\n'+errors.join('\n'));
await browser.close();
