# LAST LIGHT · 死线突围 —— 现状盘点（面向"搜打撤"改造）

> 记录日期 2026-09-19，基于工作区当前代码（HEAD `8da706b` + 大量未提交改动，见文末）。所有行号以当前工作区文件为准。目的：让策划/程序快速定位"现在有什么、缺什么"，为改成横版搜打撤（extraction shooter）做规划。

---

## 0. 一句话概括

这是一个**纯 Canvas 2D、无构建、全局脚本**的横版尸潮射击：一条 6400 px 的公路 + 两个可进入的室内房间（谷仓、便利店），玩家从左向右突围，到东端清空尸群即胜利。**没有**物品系统、背包、容器、货币、存档（除最高击杀数和换装外观）、基地、分支路线。战斗手感、动画、断肢、光照、像素 UI 已经打磨得很深，这些是可直接复用的资产；"搜打撤"需要的**元游戏层（hub / 仓库 / 背包 / 撤离 / 死亡损失）基本要从零建**。

---

## 1. 技术底座

### 1.1 渲染
- **单画布**：`index.html:11` 只有一个 `<canvas id="game" width="640" height="330">`，页面无其他 DOM；`style.css` 让画布铺满视口（`object-fit:contain`，`image-rendering:pixelated`）。
- **逻辑分辨率**：高固定 330 px，宽随视口比例在 640–1280 之间自适应（`game.js:41-66 resizeGame()`：`W = round(330*aspect)` 取偶数）。世界画在离屏 `worldCanvas`（`game.js:6-8`），`present()`（`game.js:577-582`）用最近邻放大到设备分辨率的屏幕画布，再由 `ui.js drawUI()` 以原生分辨率叠加 UI，保证文字清晰。
- **相机**：一维横向 `viewX`（`game.js:90`），跟随玩家，前置量 `cameraLead()`（`game.js:178`，桌面 23% W、手机 17% W），指数平滑（`game.js:389-390`）。鼠标靠近左右 18% 屏幕边缘时相机缓慢拉远（最小 zoom 0.86）并向该侧偏移（`EDGE_CAMERA`，`game.js:14-35 updateEdgeCamera()`），触屏不触发。屏幕/世界坐标互转 `screenToWorld/worldToScreen`（`game.js:19-20`）。
- **视差**：公路背景在 `world.js`：天空/云（camera×0.03、×0.065）、远山（×0.08 / ×0.15）、城市剪影（×0.24）在 `sky()`（`world.js:387-399`）和 `distantStructures()`（`world.js:400`）；地形按 **640 px 瓦片缓存**到离屏画布（`getTile()`，`world.js:386`，`drawTerrain()` `world.js:220-248`），电杆和路边物 1:1 滚动。前景层 `foreground()`（`world.js:586`）。室内前景视差 1.12（`interiors.js:601`）。
- **绘制顺序**（`game.js:516-574 draw()`）：底色 → 抖动/缩放变换 → `drawWorld` 或 `drawInterior` → 光照地面层 `sceneLighting.ground` → 门标记（`game.js:526`）→ 地面弹射物/血迹/补给箱 → 按 y 深度排序的僵尸/尸体/断肢/玩家（`game.js:530-536`，每个演员再做一次光照蒙版 `sceneLighting.actor`）→ 近战拖尾、子弹、空中弹射物、粒子 → 前景 → 调色 grade → 光源本体 `sceneLighting.finish` → 换弹条 → 准星 → 转场黑幕 → 击杀/受伤闪屏 → 画外僵尸计数。
- **主循环**：`frame()`（`game.js:583`），dt 上限 0.035 s；每 0.5 s 轮询视口尺寸。

### 1.2 输入
- 键盘（`game.js:594-595`）：WASD/方向键移动，Shift 冲刺，鼠标瞄准+左键攻击，R 换弹，E 进门，K 调试清场，1–5 切枪，Q 轮换，Esc/空格暂停，Enter 开始。
- 指针事件（`game.js:585-593`）先交给 `uiPointer()`（`ui.js:152-157`，基于每帧重建的命中矩形 `uiHits`），没被 UI 吃掉才当作瞄准/开火。
- 触屏：`uiTouch` 由 `(pointer:coarse)` 检测（`ui.js:158`）；画在画布里的方向键、开火键、换弹键、"进入"键（`ui.js:258-268`）；开火键自动瞄准最近僵尸（`game.js:500`、`touchFireStart()` `game.js:601`）。
- 失焦/切后台自动暂停（`game.js:596-597`）。

### 1.3 文件与模块
无模块系统、无打包：`index.html:13-22` 按顺序加载 10 个 `<script>`，**所有文件共享全局作用域**（例如 `lighting.js` 直接读 `player`、`muzzle`、`getWeapon()`；`characters.js` 直接读 `player`、`worldTime`、`wardrobe`）。加载顺序即依赖顺序：arsenal → wardrobe → characters → effects → specials → world → interiors → ui → lighting → game。

| 文件 | 行/字节 | 职责 |
|---|---|---|
| `game.js` | 614 行 / 51 KB | 状态机、区域与传送门、玩家、僵尸更新、子弹、近战、拾取、波次、绘制主循环、输入 |
| `world.js` | 618 行 / 75 KB | 公路场景：分区、地标、瓦片缓存、视差、动态元素、光源、门 `WORLD_PORTALS` |
| `interiors.js` | 625 行 / 73 KB | 室内房间定义 `INTERIORS` + 商店/谷仓绘制、室内光源、动态元素 |
| `characters.js` | 520 行 / 37 KB | 骨架/IK、玩家与僵尸姿态、绘制、换装分层、武器绘制、碰撞胶囊 |
| `effects.js` | 271 行 / 21 KB | 粒子、血迹、布娃娃/断肢物理、枪口特效、合成音效 |
| `specials.js` | ~250 行 / 10 KB | 特殊僵尸 AI（疾行者/重装/喷吐者）、酸液弹射物、特殊死亡 |
| `lighting.js` | 85 行 / 6 KB | 场景光照合成（光斑缓存、地面接光、人物受光蒙版、枪口光） |
| `ui.js` | 302 行 / 20 KB | 画布内 UI：5×7 位图字体、中文位图缓存、HUD、面板、触屏控件 |
| `arsenal.js` | 68 行 / 5 KB | 5 把武器数据 `WEAPONS` + 近战招式 `MELEE_MOVES` |
| `wardrobe.js` | 39 行 / 4 KB | 外观模型（部位目录、预设、localStorage） |
| `wardrobe.html/.css/-preview.js` | 100 行 / 18 KB | 独立换装实验室页面（DOM UI + 预览画布） |
| `scripts/serve.py` | — | 无缓存静态服务器（端口 5173） |
| `scripts/check-game.mjs` | 308 行 | node:test 测试（约 35 个用例） |

### 1.4 开发/测试/截图
- `npm start` → `python3 scripts/serve.py 5173`（`Cache-Control: no-store`，刷新即最新）。也可直接 `file://` 打开。
- `npm run check` → 对 11 个 js 做 `node --check` 语法检查。
- `npm test` → `scripts/check-game.mjs`：用 `node:vm` 沙箱 + Proxy 假 canvas（`check-game.mjs:6-18`）把全部脚本按顺序跑起来，然后直接调用 `startGame()/addZombie()/hitZombie()/update()` 等全局函数断言。覆盖：胶囊扫掠、断肢/爬行/定身、布娃娃约束、效果上限、暂停/重开、弹药守恒、后坐力弹簧帧率一致性、特殊僵尸、撤离胜利、多武器弹匣独立、换装数据清洗、近战连段、光源随相机、边缘相机缩放。**注意**：不少断言写死了调参数值（如击退 150.8、尸体上限 28），改数值要同步改测试。
- 截图流程（不在仓库中，来自会话记忆）：Chrome 扩展未连接，用 `~/.npm/_npx/31e32ef8478fbf80/node_modules` 里的 headless Playwright 打开 `file:///…/index.html`，点开始后截 `#game` 画布；产物在 `output/playwright/*.png`（约 50 张，未纳入 git）；`.playwright-cli/` 有控制台日志与页面快照（已 gitignore）。

---

## 2. 世界结构

### 2.1 区域（area）模型 —— `game.js:92-137`
- 全局 `area`（`'road'` 或室内 id）。**公路是一个区域，每个室内是另一个区域**。
- `areaStates[id]`（`game.js:100`）按区域保存 `zombies, corpses, rigs, decals, pickups, particles, viewX, spawnLeft, spawnTimer, waveBreak, packLeft, seeded, returnX`；`saveArea()`（111）/`loadArea(id, x, returnX)`（112-127）切换时整体交换全局数组。所以"清空的房间保持清空、公路尸群原地等待"是靠这个快照实现的，**但整个 `areaStates` 在 `startGame()` 时清空（`game.js:205`），没有跨局持久化**。
- `areaLength()`（102）：公路 `WORLD_LENGTH=6400`，室内取 `INTERIORS[id].length`。
- **传送门**：
  - 公路上的门：`WORLD_PORTALS`（`world.js:607`）= `[{x:420,w:88,target:'barn',targetX:120,label:'进入谷仓'},{x:2216,w:68,target:'store',targetX:110,label:'进入商店'}]`，位置手工对齐到地标美术。`game.js:97` 有 fallback。
  - 室内出口：`INTERIORS[id].exits`（`interiors.js:18-19`），`areaPortals()`（`game.js:103-108`）把它们**硬编码映射回 `target:'road'`，落点为进门时记录的 `returnX`**。
  - 触发：`nearPortal()`（109）玩家距门心 ≤ w/2+12 px 时 HUD 出现提示（`HUD.prompt`，`game.js:512`；绘制 `ui.js:214-221`），按 E / 触屏"进入"调用 `usePortal()`（128-132）；`updateAreaTransition()`（133-137）0.3 s 黑场后切换、0.6 s 结束；黑幕绘制 `game.js:559`。门标记（黄铜箭头）`game.js:526`。
- **拓扑结论**：目前是"一条主干 + 两个叶子房间"的**星形**，不是图。室内本身也是一维长条（900 / 1100 px），只有一个出口且只能回到公路。室内之间、室内到其他室外都不可达。

### 2.2 坐标与尺度
- 世界 x：公路 0..6400；室内 0..length。y：行走带 `LANE_TOP=246 .. LANE_BOTTOM=312`（`game.js:37`），公路面 y 218..330（`world.js:250`），路肩基线 y 211，建筑脚 y 205。
- `ROUTE_START=142`、`EXTRACTION_X=6292`、**10 px = 1 m**（`ROUTE_METERS`，`game.js:38`）。全程 615 m。
- 玩家可走 x 范围 24..areaLength-30（`game.js:384`）。
- 人物比例：`PLAYER_SCALE=1`，普通僵尸与玩家同尺度（测试 `check-game.mjs:265-278` 保证）。

### 2.3 公路内容（`world.js`）
- 分区 `sectors`（`world.js:9-14`）：01 暮色农场 0–1500 · 02 最后一站 1500–3050 · 03 隔离边界 3050–4700 · 04 铁锈工业区 4700–6400。`getWorldSector(x)` 供 HUD 显示。
- 地标 `landmarks`（`world.js:205-219`，每项 `{x, left, w, draw}`）：谷仓 300（可进）、车 600、第二谷仓+粮仓 1000、加油站 1690（商店门 2216，可进）、车 2480/2760、民宅 3070、检查站 3500、民宅+车 4300、工厂 4880、路障 5460、卡车 5720、EXIT 路障 6130。都用 `scaled()`（`world.js:21-27`）按 2x/1.45x 放大绘制。
- 路面装饰：护栏 268、反光柱 281、刹车痕 293、残骸 295、涂装 322、碎屑 340。
- 动态层 `dynamic()`（`world.js:544-557`）：烟、旗、风、落叶、鸟群、谷仓/加油站/车/检查站/工厂各自的 `*Life()`（469-532）。
- 光源 `lightSources()`（`world.js:422-436`）：提灯、霓虹、灯管、警灯、焊光、车灯等约 15 个，坐标硬编码。

### 2.4 室内（`interiors.js`）
- 定义（`interiors.js:18-19`）：
  ```js
  store: { id, name:'加油站便利店', code:'S-02', length:900, floorLight:true,
           exits:[{x:60,w:44,label:'离开商店'}],
           loot:[{x:520,y:300,type:'ammo'},{x:790,y:302,type:'health'}],
           spawns:[{x:380,y:262},{x:560,y:300},{x:700,y:250},{x:830,y:290}] }
  barn:  { …, length:1100, exits:[{x:70,w:60}], loot:2 个, spawns:5 个 }
  ```
- 房间静态画面整张缓存到离屏画布（`getRoom()` 546），`drawRoom()`（545）按 id 分支到 `drawBarn()`（410）/`drawStore()`（491）；动态元素 `barnDynamic()`（441）、商店部分在 `drawInterior()`（547-599）；前景 600；调色 617；光源 `getInteriorLights()`（34-56）也按 id 硬编码。
- 商店里已画好的道具（货架 `shelfUnit` 76、收银台 158-169、现金抽屉 169、冷柜 188、冰柜 193、ATM 142、员工门 138、储物箱堆 225）以及谷仓的工作台 290、麻袋 295、木桶 297、工具墙 280 ——**都是纯美术，无交互实体**，但可以作为未来"容器"的现成外观。

### 2.5 刷怪与流程
- 开局 `startGame()`（`game.js:204-212`）：重置一切，6 只僵尸放在 x 455 起。
- 波次 `beginWave()`（203）：`spawnLeft = 12 + wave*6`；每帧在公路上、场上 <32 只时按 3–5 只一组刷（`game.js:503-507`），出生点在屏幕右外 30–90 px（wave>1 时 24% 概率左外，`addZombie()` 193-199）。距玩家 >1300 px 的僵尸直接删除（509）。
- 清场后 3.5 s 整备（补弹药、+15 HP）再下一波（513）；向东每推进 750 px 追加一波（`updateJourney()` 368-375，`nextEncounterX`）。
- 补给站 x 1480 / 3010 / 4660：全武器 ×2 弹药、+25 HP（369-371）。
- **撤离**：`player.x >= 6292` 置 `evacuation`，剩余刷怪上限 5，清空场上僵尸即 `victory()`（364-367，state `'won'`）。这是现有唯一的"撤离点"，且只在路尽头。
- 室内：进门时按 `spawns` 一次性生成（`loadArea` 121-125，`seeded` 标记），不再刷；室内时公路计数不动。

---

## 3. 玩家

- 状态对象 `player`（`game.js:166`）：`x,y,hp(100),stamina(100),ammo,reserve,face,inv(无敌 0.65 s),vx,vy,kick/climb(后坐弹簧),heat,sprinting,flinch`。
- 移动 `updatePlayer()`（379-401）：步行 64 px/s、冲刺 106；冲刺耗体力 32/s，回复 19/s；纵向速度 ×0.68；八向。
- 受伤 `damagePlayer()`（148-155）：普通僵尸咬 18 / 缺一臂 12 / 缺双臂 7（458）；疾行者冲撞 22、重装 33（`specials.js:109`）；酸液直击 + 酸池每 0.65 s 9 点（`specials.js:131`）。HP 0 → `gameOver()`（221）。
- **武器**（`arsenal.js:4-58`，每把约 40 个字段：弹匣/备弹/射速/伤害/散布/后坐弹簧/枪口/镜头/击退/绘制尺寸/颜色/音效）：

| 键 | id | 名称 | 弹匣/备弹 | 射击间隔 | 伤害 | 备注 |
|---|---|---|---|---|---|---|
| 1 | rifle | AK-47 | 30/150 | 0.125 s | 1.0 | 全自动，射程 900 |
| 2 | smg | MP5 | 36/180 | 0.065 s | 0.64 | 射程 750 |
| 3 | shotgun | M870 | 8/56 | 0.67 s | 0.72×7 弹丸 | 射程 560，泵动 |
| 4 | pistol | M1911 | 10/90 | 0.24 s | 1.75 | 半自动，爆头 ×1.2 |
| 5 | crowbar | 撬棍 | 体力 | 0.62 s | 2.6×招式 | 射程 90，扇形，最多 3 目标 |

  近战招式 `MELEE_MOVES`（`arsenal.js:61-64`）：斜劈（16 体力，×1.0）→ 双手重劈（24 体力，×1.45），连段计时 0.65 s。
- 弹药模型：`weaponInventory[id] = {ammo, reserve}`（`game.js:85-88`），当前武器的数值放在 `player.ammo/reserve`，切枪时互换（`switchWeapon()` 138-144，会取消换弹）。`reload()`（222-226）+ 三段换弹动画（493-498）；空弹匣自动换弹。`supplyAmmo(mult)`（145-147）给每把枪 1.5 弹匣×mult。
- 射击 `shoot()`（227-247）：从 `playerMuzzle()`（188-191）生成子弹，扫掠碰撞 `updateBullets()`（470-481）对 `hitShapes(z)`（`characters.js:491-501`，头/躯干/上臂/前臂/大腿/小腿胶囊）做射线检测。
- 近战 `beginMelee()/updateMelee()`（249-302）：按招式时间轴在有效窗口内以枪尖射线扫胶囊，命中时短暂停顿（`impactHold`）。
- 命中处理 `hitZombie()`（333-359）：头部 ×`headDamageMultiplier`(3)，四肢累计到 `limbThreshold`（`characters.js:26`）即 `sever()` 断肢，躯干留伤口；`refreshLimbState()`（158-164）：缺一小腿跛行 ×0.62、缺大腿/双小腿爬行 ×0.34、腿伤+臂缺 = 定身。击杀 `killZombie()`（314-332）：布娃娃、爆头、连杀计数、**每 5 杀掉落补给**。
- **没有背包/物品栏**：除 5 把固定武器的弹药外，玩家不携带任何东西。
- **换装**（纯外观）：`wardrobe.js` 6 个部位（头饰 4 / 上衣 3 / 裤 2 / 鞋 2 / 装备 3 / 面部 3）+ 7 个颜色，4 套预设；`localStorage['last-light-wardrobe-v1']`；`palette()` 自动派生 Dark/Light/Deep 色。`characters.js drawPlayer()`（413-489）按 `wardrobe.get()` 的槽位 id 分支绘制不同轮廓（如 `look.pants==='cargo'`）。独立页面 `wardrobe.html` + `wardrobe-preview.js` 复用同一渲染器做动作预览；游戏通过 `storage`/`focus` 事件热更新（`game.js:611-612`），入口 `openWardrobe()`（606）在开始/暂停面板。

---

## 4. 敌人

- 数据：`addZombie()`（`game.js:193-199`）——`speed=(12..18 + wave*1.15)*2*1.18`，`hp=5.5+min(6,(wave-1)*.65)`，`type=0..7` 决定外形（`ZOMBIE_FORMS`，`characters.js:8-17`，8 种体型/步态，仅视觉），`kind` 决定 AI。
- 种类 `chooseZombieKind(wave, index)`（`specials.js:9-15`，按波次和序号取模）：
  - `normal`：直线追玩家（`updateZombies()` `game.js:425-469`），y 速度 ×0.6；33 px 内起手 0.72 s 攻击时间轴（起手 → 0.42 s 前扑 20 px → 0.30 s 判定 36 px 内造成伤害）；受击僵直；软体分离 `separateZombies()`（403）、被挡时"翻越"动画（417-424, 436-446）。
  - `runner` 疾行者（`specials.js:20-22`）：速度 ×1.28；58–205 px 内蓄力 0.47 s 后 238 px/s 扑击。
  - `brute` 重装暴君（23-26）：HP ×3（≥18）、头伤 ×1.5、体伤 ×0.68、断肢阈值 3.2、抗击退；78–285 px 蓄力 1 s 冲撞 198 px/s。
  - `spitter` 喷吐者（27-28）：HP ×1.45；92–420 px 蓄力 0.95 s 向预判位置抛酸（`spitAcid()` 50），落地成酸池 4.2 s（`acidSplash()` 117）。弹射物系统 `updateHostileProjectiles()`（123-148），上限 36。
  - 特殊死亡 `onSpecialDeath()`（175）。
- 状态机 `updateSpecial()`（`specials.js:60-116`）：idle → windup → charge → recover，断腿/定身则退出。
- 没有 Boss，没有巡逻/警戒/听觉，没有远程枪械敌人；僵尸永远知道玩家位置。
- 调试：`debugKillAll()`（`game.js:603`），K 键（594）和 HUD 右上红色 KILL 按钮（`ui.js:202`）。

---

## 5. 物品 / 掉落 / 经济（现状：几乎为零）

- 唯一的"物品"是 `pickups` 数组元素 `{x, y, type:'ammo'|'health', life}`：
  - 来源：每 5 杀掉落（第 10 杀为医疗）（`game.js:329`，25 s 消失）；室内 `INTERIORS[id].loot` 进门时生成（`game.js:124`，永久）。
  - 拾取：靠近 28 px **自动消耗**（`game.js:510`）：弹药 = `supplyAmmo()`，医疗 = +35 HP。
  - 绘制：`game.js:529` 两种小箱子。
- 无货币、无制作、无经验/等级、无任务系统（HUD 的"任务面板"只是文案 `HUD.panel`，`game.js:183`）。
- 跨局持久化仅两项 localStorage：最高击杀 `'last-light-best'`（`game.js:181, 202`）、换装。
- 局内统计 `stats={shots,hits,headshots,severed}`（180），仅结算面板显示。

---

## 6. UI

全部画布内绘制（`ui.js drawUI()` 164-273，每帧重建命中区）：
- 左上生命/体力条 + 当前区域名与代号（170-178，`currentSector()` `game.js:110`）。
- 中上波次号、状态色块、撤离路线进度（米数按 `furthestX`）（180-190）。
- 右上击杀数、生存时间、KILL 调试键、声音/暂停/全屏按钮（192-209）。
- 中央通知 `announce()`（`game.js:192`，绘制 211）；头顶门提示（214-221）；换弹进度条（`game.js:546-549`）；准星与命中标记（551-558）；画外僵尸计数 `◀ n` / `n ▶`（565-571）。
- 底部武器挂架（5 槽，显示弹匣/备弹，可点击切枪）（223-236）；右下黄铜弹药大数字 + 弹匣刻度（238-252）；左下状态字幕（254）。
- 触屏：方向键、开火、换弹、进入（257-268）；HUD 在触屏下布局不同。
- 面板 `drawBoard()`（280-302）：开始/暂停/失败/胜利共用，内容由 `HUD.panel` 决定（`startGame/pauseGame/gameOver/victory` 各自 `Object.assign`），含换装入口。
- 字体：数字/英文 5×7 位图（15-82），中文用系统字体渲染后阈值化成 1 位位图缓存（83-115）。
- 状态机 `state ∈ ready | playing | paused | over | won`（`game.js:170`）。**没有任何"全屏子界面"（背包/仓库/地图）的框架**，只有这一个居中面板。

---

## 7. 效果与动画

- `effects.js`：上限常量（第 4 行：粒子 500、断肢 32、尸体 28、地面痕迹 400）；`emit()` 粒子（7）；血迹/血泊 decal（8-30，8 s 后变暗）；`bloodBurst()`（33）；枪口特效 `muzzleEffects()`（45）；布娃娃 `makeRig()`（67）/`sever()`（113）/120 Hz 固定步长 Verlet `stepRig()`（129）/`updateEffects()`（154）；`drawParticles()`（189，kind：blood/cloth/dust/smoke/spark/shell/magazine/tracer/tracerGhost/text/ring/blast 等）。
- 音频：WebAudio 全合成，无音频文件；`initAudio()`（228），`sound(type, x)`（240-271，带立体声定位）：shot/shotgun/smg/pistol/swing/heavySwing/meleeHeavy/meleeHit/growl/acid/hit/headshot/fall/shell/step/reload/rack/pickup/hurt/empty。
- `lighting.js sceneLighting`：`begin()` 收集光源（公路 `getWorldLights`、室内 `getInteriorLights`，最多 18 个，视口剔除）+ 枪口光（22）；`ground()` screen 叠加地面光；`shadow()` 按最近光源画人物投影；`actor()` 把人物精灵画进 320×240 蒙版再 source-in 光照图，实现"人物受光"（47-56）；`finish()` 画灯具光晕。光源格式 `{x,y,color,intensity,radius,tube?,floorY?,floorWidth?,cone?,flash?}`。
- 动画：`characters.js` 双骨 IK `solveJoint()`（37）、`makeZombiePose()`（55，含体型、跛行、爬行、蓄力、冲锋、扑击）、`makePlayerPose()`（145，持枪/换弹/冲刺）、近战关键帧 `MELEE_POSES`（110-144）、`drawWeapon()`（350，每把枪按 id 画）。场景动画：公路 `world.js:463-557`，室内 `interiors.js:441-489, 547-599`，全部 time/hash 驱动，无逐帧随机。

---

## 8. 内容生产方式

- **全部美术由代码画矩形/多边形/线段生成**，仓库里没有图片、精灵表、字体或音频文件（唯一外链是 Google Fonts 的 Noto Sans SC，失败回退系统字体）。
- 共用原语：`px/shape/line/label`（`world.js:24-27`、`interiors.js:9-12`）、`rect/poly/limb`（`game.js:69-71`）。世界地标在 `scaled()` 缩放帧内用"紧凑局部单位"作画，再按 2x 等放大并像素对齐。
- **新增一个路边道具**的成本：写一个 `function foo(c,x,y){px(...)...}`（通常 5–40 行）+ 在 `landmarks`（`world.js:205`）加一项；若要发光加 `lightSources()` 一行；若要动加到某个 `*Life()`。瓦片缓存自动处理。
- **新增一个房间**：`INTERIORS` 加条目（`interiors.js:18`）→ `drawRoom()`（545）加分支写整间静态画 → `getInteriorLights()`（34）加分支 → `interiorGrade()`（617）/`drawInteriorForeground()`（600）可选 → `world.js:607 portals` 加门（x 要手工对齐地标门的像素位置）。目前两间房各约 150–250 行绘制代码。
- **新增一把武器**：`arsenal.js` 加约 40 字段的对象（键位由 `WEAPON_ORDER` 顺序自动分配）→ `characters.js drawWeapon()`（350）加该 id 的外形分支 → `ui.js weaponGlyph()`（125）加 14×7 小图标 → `effects.js sound()` 加音色 → `game.js KILL_LAUNCH`（313）加击飞系数。HUD 槽位数会自动跟随（但触屏槽宽固定 26 px，超过 6 把要改布局）。
- **新增一种敌人**：`specials.js` 的 `chooseZombieKind/configureSpecial/updateSpecial` 加分支 + `characters.js SPECIAL_ZOMBIE_FORMS`（18）+ `drawZombie()` 的外观差异 + `hitShapes()` 头部半径。普通僵尸外形则只需在 `ZOMBIE_FORMS` 加一行参数。
- **AI 生成**：仓库内没有任何 AI 生图/生音流程；环境里挂了 TapTap Maker 的生图/音效 MCP 工具，但游戏不依赖、也没有导入位图的管线（引入图片需要新增加载与像素对齐逻辑）。美术对标是《They Are Coming!》（会话记忆），要求保持像素风、不用 3D。
- 测试是"数值锁定"型，改玩法后 `check-game.mjs` 需同步维护。

---

## 9. 改造成搜打撤需要补/改的部分（坦率清单）

按"从零建"到"改造"排序：

### 9.1 从零建
1. **Hub / 基地**
   - 现状：`state` 只有 ready/playing/paused/over/won；`startGame()`（`game.js:204-212`）一次性重置所有状态包括 `areaStates`、`weaponInventory`、`player.hp`。
   - 需要：一个"局外"状态（或一个 `hub` 区域：不刷怪、有交互 NPC/工作台/仓库/出发门），`startGame` 拆成 `newProfile()`（首次）/`startRaid(loadout)`（每局）/`returnToHub(result)`；局外与局内数据结构分离。
2. **物品与背包格**
   - 现状：没有 item 定义；`pickups` 只有两种即用型；`weaponInventory` 是固定 5 槽。
   - 需要：`items.js`（id/名称/尺寸/堆叠/稀有度/价值/图标绘制函数）；背包网格数据结构（占格、旋转、堆叠、重量）；一个全屏子界面框架（`ui.js` 现在是即时模式 + 只有 `drawBoard` 一种面板；需要"界面栈"、键盘/手柄导航、拖拽——`uiPointer` 的 hold/group 机制可以扩展成拖拽）；武器改成背包/装备槽里的物品，`selectedWeapon/weaponInventory` 要重构为"装备栏引用物品实例"，弹药也要变成物品。
3. **战利品容器**
   - 现状：室内 `loot` 是散落即拾；容器美术（货架、收银抽屉、储物箱、工作台）已画但无实体。
   - 需要：`containers` 实体（位置、类型、掉落表、是否已开、开启动画/耗时）；沿用 `nearPortal()` 的"靠近 + E"交互模式和 `areaStates` 的按区域快照；掉落表与稀有度；开箱时的搜索进度 UI。
4. **撤离点**
   - 现状：只有 `EXTRACTION_X`（路尽头）+ 清怪门槛（`updateJourney()` 373-374）。
   - 需要：可配置的多个撤离实体（位置、条件、倒计时、是否随机开放、费用）；撤离流程 → 结算 → 入库；HUD 上的撤离点指示（现有路线进度条可改造）。
5. **持久仓库 / 存档**
   - 现状：localStorage 仅最高击杀与外观。
   - 需要：存档 schema（仓库、装备预设、货币、解锁、统计）+ 版本迁移 + 序列化/反序列化（现在所有状态都是散落的 `let` 全局变量，`game.js:166-180`，需要先收进一个 `profile`/`run` 对象）。
6. **死亡损失**
   - 现状：`gameOver()`（221）只弹面板，Enter 重开。
   - 需要：区分"局内背包"与"仓库"，死亡丢局内、可选保险/安全箱；死亡结算界面；与仓库存档联动。

### 9.2 需要重构
7. **区域图 / 分支路线**
   - 现状硬编码：`areaPortals()` 把室内出口固定指向 `'road'`（`game.js:107`）；`area==='road'` 在约 10 处被特殊处理（`areaLength` 102、`currentSector` 110、`loadArea` 117、`updatePlayer` 387、`update` 503/511/513、`draw` 522/543/544、`lighting.js:20`、`ui.js:177`）；刷怪、补给站、撤离都只认公路。
   - 需要：统一的 **区域注册表** `AREAS[id] = {length, draw, drawForeground, grade, lights, portals:[{x,w,target,targetX,label,locked?}], spawns, containers, extractions, sector}`，公路本身也变成注册表里的一个普通区域（可以拆成多段街区，每段独立长度，通过门/路口连接形成图）；`loadArea` 改为读注册表；双向门显式写在两边；`returnX` 机制改为"目标门坐标"。这是最大的一次结构改动，但因为室内已经是数据驱动 + 分区快照，路径清晰。
8. **刷怪规则**
   - 现状：波次 + 向东推进触发，无限刷到 32 只，公路专属。搜打撤需要按区域预置 + 有限增援 + 噪声/警报驱动，`beginWave/updateJourney` 需要整体替换为按区域配置。
9. **敌人多样性与感知**
   - 目前僵尸全知玩家位置，没有巡逻/警戒/噪音；若要"潜行搜刮"需要在 `updateZombies` 加感知状态。人类敌人/枪械敌人不存在（需要新 AI + `hostileProjectiles` 扩展为子弹）。
10. **UI 框架**
    - 需要"界面栈"（HUD → 背包 → 容器搜刮 → 仓库 → 商店），键鼠/触屏双通路。`ui.js` 的位图字体和 plate/barTrack 原语可直接复用；中文位图缓存上限 400 条（`ui.js:89`），物品名多了要调大或改为图标。
11. **状态封装**
    - `game.js` 顶部 ~40 个 `let` 全局与跨文件隐式依赖（`lighting.js` 读 `player/muzzle`，`characters.js` 读 `worldTime`），做存档和多区域前建议先把 run 态收拢；测试沙箱 `check-game.mjs` 依赖这些全局名，改名要同步。
12. **手机端**
    - 背包/拖拽在触屏下的操作方式要单独设计；现有触屏 HUD 已占据左下/右下。

### 9.3 可直接复用（不用动）
- 战斗手感全链（射击/后坐/近战/断肢/布娃娃/血迹/音效/光照/镜头）。
- 分区快照 `areaStates` 思路、门交互提示、转场黑幕。
- 换装系统（可扩展为"装备影响外观"）。
- 世界/室内的程序化美术原语与已画好的道具库。
- 测试沙箱（新系统写纯逻辑函数就能低成本加测试）。

---

## 10. 仓库状态提醒

- 最近 14 次提交全部在 2026-09-18/19，节奏是"一天多次大改"：18 日美术对标与回滚，19 日 UI 全画布化 → 区域/门 → 商店 → 谷仓/公路动态。
- **当前工作区有大量未提交改动**（`git diff --stat`：11 文件 +1018/−210，`world.js` +382、`interiors.js` +287、`game.js` +179、`characters.js` +174），并且 `lighting.js`、`wardrobe.js/.html/.css`、`wardrobe-preview.js` 是**未跟踪**的新文件。动手重构前建议先提交一个快照，`package.json` 的 `check` 脚本已包含这些新文件。
- `specials.js`（已提交）未在 README 的模块说明里提到，但它是活跃代码。
