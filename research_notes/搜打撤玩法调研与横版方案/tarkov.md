# 《逃离塔科夫》（Escape from Tarkov）作为搜打撤原型的设计调研

> 调研时间：2026-09。目标：为"横版单机丧尸搜打撤"提炼可迁移机制与心理学原理。技术术语保留英文。
> 数据源说明：Tarkov 官方 wiki（fandom / wiki.gg）在本次调研中无法直接抓取（返回 401/402），相关数值主要来自第三方指南站（eft-ammo、timesaver.gg、kappaguide、bamboogaming 等）的搜索摘要，与 wiki 数值可能存在版本差异，已在 Gaps 中标注。

---

## 1. Raid 核心循环与局内决策点

### Takeaway
Tarkov 的循环是"仓库 → 配装 → 入局 → 搜/打 → 撤离 → 回仓库变现/升级 → 再入局"的双环结构（局内产出资源、资源投入局外成长、成长反哺局内）；其本质被多篇中文分析定性为"赌博模型"：仓库=总资产、装备=筹码、撤离=兑现、死亡=输光。局内的每一个决策（去哪搜、打不打、什么时候撤、走哪个撤离点、往安全箱塞什么）都因为"死了全没"而变得有分量。

### Cited Findings
- 核心循环由"仓库、角色、战场"三要素构成，由"交易、基建（藏身处）、任务"三套系统驱动；玩家在局外做资源配置进入战场，在战场中收集物资返回仓库，构成最基础循环 — [GameRes《逃离塔科夫》玩法设计分析](https://www.gameres.com/907600.html)；同文另见 [知乎版](https://zhuanlan.zhihu.com/p/1890083050290909837)
- 赌博类比：玩家从仓库（总资产）取出装备（筹码）进入战局，成功撤离则带走全部战利品，死亡则筹码全失，超时（MIA）则"被困"全失。"影响玩家的机制相同，因此玩家的行为相同，带来的玩家体验就会相同" — [GameRes](https://www.gameres.com/907600.html)
- 机核作者把流程写成"选装备 → 选地图 → 局内搜刮 → 撤离"，直接对应赌场的"买筹码 → 选桌 → 玩 → 兑现"，区别是用技术替代了运气 — [机核《赛博西西弗斯的自我修养》](https://www.gcores.com/articles/195153)
- 搜打撤定义为双循环："局内循环生产资源，资源投入局外成长，再反馈回局内"；体验由 搜（Search）/ 打（Fight）/ 撤（Extract）三段构成 — [机核 195153](https://www.gcores.com/articles/195153)
- 单局时长 20–50 分钟、每局最多 14 名玩家、极简 HUD、网格背包 + 负重限制；未撤离即失去所有物品（保险物品与安全箱内容除外） — [Wikipedia](https://en.wikipedia.org/wiki/Escape_from_Tarkov)
- 局内三个结局：成功撤离 / 死亡（全失）/ 超时（携带物品全失）；每张地图有固定的 raid 计时器与昼夜版本，制造环境压力 — [GameRes](https://www.gameres.com/907600.html)
- 撤离点分三类：全程开放的"Always available"（适合新手）、需付费/钥匙/开电的"Conditional"、PMC 与 Scav 共用且通常需要合作的"Shared / Co-op"；有些撤离需要开电、刷卡、拉闸等前置条件 — [eft-ammo 撤离点](https://www.eft-ammo.com/wiki/tarkov-extraction-points)；[BoostRoom 撤离指南](https://boostroom.com/blog/escape-from-tarkov-extraction-guide-how-to-find-and-use-extracts)
- 汽车撤离（Car Extract）需要支付卢布费用 — [onlyfarms](https://onlyfarms.gg/wiki/escape-from-tarkov/car-extract-what-does-it-mean)；每次汽车撤离 +0.25 Fence 声望，同图重复使用奖励减半 — [timesaver Fence 指南](https://timesaver.gg/blog/tarkov-fence-reputation-guide)
- MIA：超过局时未撤离即失去本局所有收获；局时因地图而异，一般 30–60 分钟 — [Elocarry](https://elocarry.net/blog/escape-from-tarkov/how-to-extract/)
- "最理想的搜打撤是一枪不发却满载而归"。战斗即风险：死亡装备全失，即便赢了也可能因消耗子弹/药品而负收益，所以高水平玩家大量时间在"绕"——绕路、绕开对手、慢慢向撤离点移动 — [机核《"搜打撤"玩法分析（上）》](https://www.gcores.com/articles/197198)
- 地图动线设计：玩家可选的动线必须经过其他玩家出生点或汇聚点，使玩家无法预测战局，即便不是每个出生点都有人也无法排除伏击 — [机核 197198](https://www.gcores.com/articles/197198)
- 决策自由是品类核心："搜打撤这个品类最核心的东西，可能就是'自主选择'"：是搜还是打、遇敌打还是躲、什么时候撤都必须由玩家自己决定；"一旦游戏开始强迫你选择，它就不再是搜打撤了" — [机核《三角洲，如果搜打撤无法自由决定是打还是撤》](https://www.gcores.com/articles/214763)
- 塔科夫刻意不做分段匹配（gear bracket、地图限制），而是用大地图 + 多撤离点让玩家可以靠绕行与搜刮取胜，"降低体感难度"同时保留系统深度 — [机核《谈谈塔科夫的"硬核"设计思路》](https://www.gcores.com/articles/190706)
- 四种玩家原型（按风险偏好 × 战斗能力）：狮子（高技术、爱冒险：满配打高价值区）、长颈鹿（高技术、避险：轻装多搜少打）、鬣狗（低技术、爱冒险：裸奔蹲点阴人）、老鼠（低技术、避险：不穿甲、避开热点、以活着撤离为乐）；结论是每种玩家在单局中都能找到自己的乐趣 — [GameRes](https://www.gameres.com/907600.html)

### Inferences
- 单机横版可以完整保留这条循环，只是把"其他玩家"替换为不可预测的 AI 威胁；关键不是 PvP，而是"入局有本钱、死亡有代价、撤离才兑现"这三条。
- "绕"与"自主选择"意味着关卡必须给出不止一条路、不止一个撤离点、不止一种撤离条件（免费但远/危险，付费但近，需要钥匙/道具的捷径），并且不能用任务把玩家硬推向战斗。
- 四种玩家原型是很好的关卡验收标准：一张图应该同时让"老鼠"（悄悄搜完撤）和"狮子"（硬刚 boss 区）都有收益。

### Gaps
- 未能抓取官方 wiki 的 Exfiltration 页面，Co-op 撤离（需 PMC+Scav 同时在场）、Red Rebel/paracord 绳降撤离、"不带背包才能走"等特殊撤离规则本次只拿到二手概括，缺少精确条件表。
- "Run-through"（局内 XP 太低/时间太短撤离视为逃跑、不算生还、FIR 失效）规则未找到可引用来源。

---

## 2. 核心系统与它们如何咬合

### Takeaway
Tarkov 的系统不是并列的，而是围绕"资产"互锁：仓库空间稀缺 → 逼迫卖出/交易；商人与任务 → 用忠诚度门槛把好装备锁在长期目标后；藏身处 → 把杂物变成可投入的长期产能；安全箱与保险 → 缓解损失厌恶；Scav 跑图 → 零成本兜底；健康与弹药穿甲 → 让局内每一发子弹和每一包绷带都有经济意义；wipe → 定期清算通胀。下面按系统列出可引用的规则与数值。

### Cited Findings

**仓库与网格背包（Tetris）**
- 不同物品占不同格子、不可重叠、仓库空间有限，格子本身成为稀缺资源需要策略管理 — [GameRes](https://www.gameres.com/907600.html)
- 每件物品有三个属性：价格、占格、重量，"这些特征限制了玩家单局能获取的资产数量，是决策的重要考量" — [GameRes](https://www.gameres.com/907600.html)
- 更大仓库是付费版本的卖点之一，也是 Unheard Edition 被指 P2W 的内容之一（更多跳蚤市场挂单位、更大仓库） — [Dexerto](https://www.dexerto.com/escape-from-tarkov/escape-from-tarkov-unheard-edition-controversy-explained-why-players-are-angry-over-paywalled-pve-mode-2666098/)
- 鸭科夫/三角洲对比：三角洲完全去掉 Tetris，鸭科夫保留"重量"而弱化格子；作者认为重量比纯格子更能逼出取舍 — [机核《从塔科夫到鸭科夫与三角洲行动》](https://www.gcores.com/articles/206918)

**安全箱（Secure container）**
- 尺寸：Alpha 2×2（默认）、Beta 3×2（Peacekeeper LL4 出售）、Gamma 3×3（仅 Edge of Darkness 版附赠）、Epsilon 4×2（Prapor 任务 The Punisher）、Kappa 4×3（Fence 的 Collector 任务）；箱内物品死亡不丢 — [AllGamers](https://ag.hyperxgaming.com/article/9216/how-to-get-secure-containers-in-escape-from-tarkov)；[eft-ammo 安全箱](https://www.eft-ammo.com/wiki/tarkov-secure-container)（该站还提到 Theta 容器，尺寸未见）
- 付费版本按价格给不同尺寸安全箱，形成"前期投入越高，损失保护越多"的经济学；任务奖励的安全箱扩容被称为"关键设计与核心付费点" — [GameRes](https://www.gameres.com/907600.html)
- Kappa 是"最大的安全箱"，只能通过 Fence 的 Collector 任务获得；1.0 版需完成约 257 个前置任务、约 48 级，上交 43 件必须 Found-in-Raid 的物品；"grind 由时间而非枪法把关" — [timesaver Kappa 指南](https://timesaver.gg/blog/tarkov-kappa-container-guide)；另一来源称 1.0 后 Kappa"不再要求做完所有任务"，改为由商人忠诚度、Scav 声望和一小段前置链把关，44 件 FIR 物品 — [搜索摘要引用 TarkovForge/kappas](https://tarkovforge.com/kappa)。两说矛盾，见 Gaps。

**保险（Insurance）**
- 入局前可向 Prapor（便宜、慢）或 Therapist（贵、快）投保；若死亡且物品未被其他玩家捡走带出，将按时间窗返还 — [LepreStore](https://leprestore.com/guides/eft/escape-from-tarkov-insurance-explained/)
- 返还时间各来源不一致：一说 Prapor 12–20h / Therapist 6–10h，另一说 Prapor 24–36h / Therapist 12–24h；领取窗口 Prapor 7 天、Therapist 10 天，过期永久丢失 — [搜索汇总，含 Steam 社区问答](https://steamcommunity.com/app/3932890/discussions/1/686363730790038705/)
- GameRes 给出：Prapor 标准费率、28–36 小时返还；Therapist 1.75 倍费用、12–24 小时返还 — [GameRes](https://www.gameres.com/907600.html)
- PvE 模式下保险规则与 PvP 相同 — [neonsect PvE vs PvP](https://neonsect.com/escape-from-tarkov/tarkov-pve-vs-pvp/)

**商人（Traders）**
- 8 名 NPC 商人，各有独立货池，按玩家等级、忠诚度（rep）与交易流水解锁更高层货物；商人库存全服共享，热门货售罄后按周期补货（限量或不限量） — [GameRes](https://www.gameres.com/907600.html)
- 任务给商人是 Prapor、Therapist、Skier、Peacekeeper、Mechanic、Ragman、Jaeger、Fence（Kappa 指南列出的八家） — [timesaver Kappa 指南](https://timesaver.gg/blog/tarkov-kappa-container-guide)
- 1.1.0 经济收紧：商人售价 +25%，回收价 −20%，跳蚤佣金 3%→5% — [timesaver PvE 指南](https://timesaver.gg/blog/tarkov-pve-mode-roubles-progression-guide)

**跳蚤市场（Flea market）**
- 玩家间寄售制；定价有两个参考（版本官方价、实时均价），偏离参考价越远手续费越高以防操纵；卖家声望每 5 万卢布 +0.01，声望高可同时挂更多单并排位靠前，撤单/失败扣声望 — [GameRes](https://www.gameres.com/907600.html)
- PMC 15 级解锁（PvE 与 PvP 一致）；PvE 的跳蚤是独立市场，挂单池薄导致常见物价可能高于 PvP — [timesaver PvE 指南](https://timesaver.gg/blog/tarkov-pve-mode-roubles-progression-guide)
- 上架/交易要求物品是 Found-in-Raid（本次未能抓取 wiki 的 FIR 页面，见 Gaps）

**藏身处（Hideout）**
- 把 raid 里拿到的材料投进设施，换取制造、资源产出、角色永久加成；建造受时间、材料、前置设施三重约束，"提供超越单局的长期动力" — [GameRes](https://www.gameres.com/907600.html)
- 发电机：1 单位燃料供电 12 分 38 秒；装太阳能后 25 分 16 秒；配合 Hideout Management 技能可到 33 分 41 秒；太阳能使发电机能耗 −50% — [搜索汇总（fandom/kappaguide）](https://kappaguide.com/hideout)
- 比特币矿场：产量 = 1/(300000/(1+(GC−1)×0.041225)/3600) 个/小时（GC=显卡数）；无显卡、断电或已有 3 枚未领取则停产；单卡约 20 小时一枚；1/2/3 级分别容纳 10/25/50 张显卡 — [tarkov.help](https://tarkov.help/en/hideout-area/bitcoin-farm)；[timesaver 比特币矿场](https://timesaver.gg/blog/tarkov-bitcoin-farm-worth-it)

**任务（Quests）与 Kappa**
- 任务类型：击杀、收集、撤离、上交、放置物品；奖励包括 XP、货币、商人忠诚度、装备，以及安全箱扩容 — [GameRes](https://www.gameres.com/907600.html)
- 1.0 加入主线故事任务，"不是独立故事模式"，可与普通任务并行或跳过；起点是引导链 "The Tour"，从教学区 Epicentre 逐步解锁全部地图 — [PCGamesN](https://www.pcgamesn.com/escape-from-tarkov/narrative-storytelling-legacy)
- 四个结局：Savior（好）、Survivor（干净逃脱）、Debtor（负债离开）、Fallen（默认/坏）；Nikita 称只有约 2% 玩家能拿到最佳结局，难度堪比 Kappa — [timesaver 结局指南](https://timesaver.gg/blog/tarkov-all-endings-guide)；[PCGamesN](https://www.pcgamesn.com/escape-from-tarkov/narrative-storytelling-legacy)

**技能（Skills）**
- 分类别（体质类：Strength、Endurance、Vitality、Health、Stress Resistance、Metabolism、Immunity 等），"用即涨"：超重跑步练 Strength；冲刺跳跃练 Endurance（每级 +1% 耐力上限，精英 +50%）；局内吃喝练 Metabolism；有"单局技能疲劳上限"防刷 — [timesaver 技能指南](https://timesaver.gg/blog/tarkov-skills-leveling-guide)；[TarkovForge Endurance](https://tarkovforge.com/skills/endurance)

**弹药 / 穿透 / 护甲**
- 穿透判定由护甲等级、剩余耐久%、弹药穿透值计算后掷骰；社区常用公式 PenChance = Pen − (ArmorClass×15) + 15 + (Durability/100)×5；穿透后伤害按穿透概率再减 0–40%；未穿透则按护甲"blunt throughput"透过一小部分钝伤，通常不影响 TTK — [eft-ammo 护甲与穿透](https://www.eft-ammo.com/armor-and-penetration)；[korigame](https://korigame.com/how-armor-and-penetration-work-in-escape-from-tarkov/)
- 常见最高穿透值约 60–70 — [eft-ammo](https://www.eft-ammo.com/armor-and-penetration)
- 硬核体现在"要学弹种对护甲等级、手动压弹"，作者类比 DCS World 的拟真 — [机核 190706](https://www.gcores.com/articles/190706)

**健康系统**
- 7 个部位共 440 HP，但"440 是谎言"：不是单一血池而是 7 个独立小桶；头或胸归零即死；肢体归零变"黑肢"不可直接治疗，之后该部位所受伤害分摊到全身；手术包 CMS 每次恢复 10、Surv12 恢复 40 — [Steam 社区指南](https://steamcommunity.com/sharedfiles/filedetails/?id=3607661547)；[eft-ammo 医疗](https://www.eft-ammo.com/wiki/escape-from-tarkov-healing)
- 手臂受伤降低射击精度、腿伤降移速、腹部受伤加快消耗；轻/重出血持续掉血，重出血是最高优先级；骨折影响移动/瞄准；止痛药（Analgin、Ibuprofen、Golden Star 等）只掩盖疼痛让你能带骨折跑，不修骨头 — [GameRes](https://www.gameres.com/907600.html)；[bamboogaming 健康指南](https://www.bamboogaming.net/tarkov/health)
- 水分与能量需要局内主动管理，耗尽掉血并减耐力 — [GameRes](https://www.gameres.com/907600.html)

**Scav 跑图与 Scav 声望（Fence rep）**
- Scav 是系统提供的随机装备角色，零成本、可带出收益、35 分钟冷却（GameRes 数值），AI Scav 通常不攻击玩家 Scav；用于防止 PMC 连败导致的财务崩溃 — [GameRes](https://www.gameres.com/907600.html)
- Scav karma 目的是鼓励玩家 Scav 之间合作而非见面就打；数值即 Fence 声望。+6.0：Scav 冷却降至约 5 分钟、出生带顶级装备甚至 Labs 门卡、Fence 额外 7 折货架；+6 到 +8 之间惩罚按 +6 计算（+7 杀一个玩家 Scav −0.10 会直接掉到 +5.90），+8 以上惩罚额外 −2；低声望则 AI Scav 见面开枪、冷却飙升 — [kappaguide Scav karma](https://kappaguide.com/scav-karma)；[timesaver Fence 指南](https://timesaver.gg/blog/tarkov-fence-reputation-guide)

**Wipe / 赛季**
- 1.0 前每半年左右强制清档；机核作者视之为"阻止多数玩家体验 PvP 内容的门槛"，并指出通胀是官方有意维持装备差距但沟通不足 — [机核 206918](https://www.gcores.com/articles/206918)
- "不可能三角"：靠经济系统驱动成长的搜打撤，"不清档、物价稳定、搜刮爽"三者不可兼得；Tarkov 选了搜刮爽 + 定期 wipe；Dark and Darker 用不可交易的任务奖励和分池匹配绕开；DMZ 式赛季轮换是折中 — [机核 195153](https://www.gcores.com/articles/195153)
- 1.0 引入 Seasons（首季 KORD BREACH），每季新规则/机制/奖励；1.0 上线时强制全员清档，PvE 玩家可选择自愿清档以进入新主线 — [Inven Global](https://www.invenglobal.com/articles/19896/escape-from-tarkov-sets-november-15-launch-date-as-servers-begin-24-hour-patch-downtime)；[dtgre 1.0 指南（搜索摘要）](https://www.dtgre.com/2025/11/escape-from-tarkov-1-0-complete-update-guide-everything-new-changed.html)
- 1.0 后角色分"永久 PvE / 永久 PvP / 赛季 PvP"，永久角色不再强制清档，只有可选的赛季 PvP 角色重置 — [neonsect](https://neonsect.com/escape-from-tarkov/tarkov-pve-vs-pvp/)
- Prestige：必须先完成主线才能解锁；开启后全部重置，可再走一次故事拿不同结局；1.2.0.0 计划加入 PvE Prestige — [搜索摘要（epiccarry/dtgre）](https://epiccarry.com/blogs/escape-from-tarkov-1-0-full-launch-guide/)

### Inferences
- 互锁关系可以画成一条资产流：**局内拾取 → （安全箱/背包）→ 撤离 → 仓库（格子稀缺）→ 三条出口：卖商人/跳蚤（变现）、交任务（解锁）、喂藏身处（长期产能）→ 下一局配装（筹码）。** 单机版可以砍掉跳蚤市场，但"仓库格子稀缺 + 商人变现 + 藏身处投入 + 任务解锁"四条出口至少要保留三条，否则捡到的杂物没有去处，"搜"就失去意义。
- 安全箱是"损失厌恶阀门"：它既是新手保护（把最值钱的小东西塞进去）也是长期目标（Kappa）。单机版可以直接把安全箱扩容做成主线奖励序列。
- 保险在单机里没有"被别人捡走"的博弈，但可以转译为"尸体掉落可回收"（鸭科夫做法，见第 5 节），或"付费保险 = 死亡后 N 分钟/下一局回收"。
- 健康系统的可迁移核心不是 7 个部位，而是"伤势分类型、各需专门耗材、耗材占格子"——这把医疗包变成背包决策的一部分。横版可以简化为 3 个部位（头/躯干/腿）+ 出血/骨折两种状态。
- Scav 跑图对单机的价值是"兜底不至于破产"，可转译为"随机装备的免费出击"或"死后可用临时角色捡回尸体"。

### Gaps
- 官方 wiki 的 Secure containers、Insurance、Scavs、Hideout、Health、Ballistics、Quests、Found-in-raid 页面全部无法抓取（fandom 402、wiki.gg 401）。以上数值来自第三方站，可能对应不同版本；保险时长、Kappa 要求存在来源冲突。
- 未能获得 1.0 版护甲板（plates）/区域命中系统、动态战利品刷新、boss 刷新率的一手规则。
- 藏身处各站（Medstation、Nutrition unit、Intel center、Scav case、Booze generator、Cultist circle、Hall of fame 等）的具体产出未找到可引用文本。

---

## 3. 张力与玩家情绪从何而来（gear fear、声音、地图知识、"再来一局"）

### Takeaway
情绪引擎是"持续升压 + 撤离瞬间释压"：投入越大、背包越满，损失厌恶越强，压力越高；成功撤离是一个 peak-end 时刻，死亡则是真实的、可量化的损失。声音是主要信息渠道，地图知识是主要成长曲线，而"死亡不是结束而是下一局的起点"（保险、Scav、藏身处、任务进度）构成"再来一局"的钩子。

### Cited Findings
- 与传统竞技射击/大逃杀平滑的情绪曲线不同，搜打撤在整局中维持高压——"投入越大，损失厌恶越强，压力越高"——在成功撤离时形成 peak-end 时刻，靠"压力释放"上瘾 — [机核 195153](https://www.gcores.com/articles/195153)
- 容器、钥匙、散落物资起到"刮刮乐"的作用，不断把"是推高价值点还是安全撤离"的决策压给玩家 — [机核 195153](https://www.gcores.com/articles/195153)
- 随着背包变满，紧张感升高，因为你有东西可以输了；最终目标只是活着到撤离点 — [Rosebud AI 分析](https://lab.rosebud.ai/blog/escape-from-tarkov-the-hardcore-shooter-that-redefined-tension-in-games)
- "损失装备的恐惧把简单的对枪变成了绝望的挣扎"；与传统射击秒复活不同，死亡意味着带进来的武器、护甲、战利品全部消失 — [nerdbot](https://nerdbot.com/2026/03/29/extraction-shooters-why-escape-from-tarkov-and-arena-breakout-infinite-are-redefining-the-genre/)
- 循环的力量在于情绪重量：战利品代表时间、努力和未来的力量，撤离成功感觉像解脱，死亡令人真正沮丧——这是刻意的 — [COGconnected](https://cogconnected.com/2026/08/how-extraction-loops-changed-reward-design/)
- 高风险损失让每次行动都有"行动成本"，把玩家的视角从"当下这局"拉到"这局和将来的对局"；作者认为 Darkest Dungeon 也符合同一原理（英雄是连接各次远征的资源） — [机核 197198](https://www.gcores.com/articles/197198)
- 玩家驱动经济是"secret sauce"，每件战利品都有真实价值；"随你死掉的装备就没了，随你撤出的装备就留下"是机制基础 — [fpsing](https://fpsing.com/articles/what-extraction-shooters-ask-of-you)
- Nikita Buyanov："Tarkov 是为 satisfaction 而不是 fun 而做的"，要"真正撼动玩家情绪而不只是娱乐"，"要么你得到一切，要么一无所有" — [ixbt.games](https://ixbt.games/en/news/2025/12/26/escape-from-tarkov-dolzna-udovletvoriat-a-ne-radovat-obieiasnil-nikita-buianov.html)
- Nikita："我们做这个游戏是为了把人聚在一起，然后他们互相打。他们玩是为了释放压力、恨这个游戏、恨我。这也许就是 Tarkov 的本质" — [attractmo.de](https://attractmo.de/game-design/tarkov-creator-decade-of-development-no-joy)
- 声音："信息就是一切，让你活下来的是声音而不是画面"；能听到隔壁房间压弹匣就能先手；脚步声按材质（金属/木头）与高度分层，是早期预警系统 — [korigame 音频指南](https://korigame.com/sound-is-your-weapon-how-to-hear-danger-before-it-sees-you/)；[audioendgame](https://www.audioendgame.com/articles/escape-from-tarkov-audio-settings-audiophile-guide)
- "硬核"被重新定义为认知负荷而非操作难度："动脑、知识面、阅读也都是一种能力"；成长靠环境掌握、战术理解、系统理解的知识积累，而非数值升级 — [机核 190706](https://www.gcores.com/articles/190706)
- 成功的搜打撤要有真实后果、复杂的地图学习曲线、贯穿全程的紧张感："背着满包战利品活着出去，感觉是真正的胜利" — [games.gg](https://games.gg/news/why-most-studios-struggle-to-make-a-successful-extraction-shooter/)
- 1.0 评测标题即概括："一款会让你真正痛苦的搜打撤（如果你放任的话），但也能给你别处找不到的眩晕般的高潮" — [GamesRadar 评测标题](https://www.gamesradar.com/games/fps/escape-from-tarkov-review/)（正文抓取失败）

### Inferences
- 单机版没有真人对手带来的不可预测性，需要用别的东西补"未知"：随机刷怪/巡逻、Boss 位置随机、战利品刷新随机、"声音先于画面"的丧尸预警（横版尤其适合用画面外音效和屏幕边缘提示制造压迫）。
- "满包时最紧张"这条心理曲线在横版里可以显性化：背包越重移动越慢/跳跃越低，同时撤离点离你越远，玩家自然会算"再搜一个箱子值不值"。
- "再来一局"的钩子是局外系统给的：死了还有保险回来的枪、藏身处正在制作的东西、还差一件的任务物品。单机设计要保证每次死亡后至少有一个"已经在路上"的正反馈。

### Gaps
- 未找到 Reddit 上关于"one more raid"心理的可引用原帖（搜索只返回泛化内容）。
- GamesRadar 1.0 评测和 Nikita 的 GamesRadar 访谈正文均因页面截断未能抓取。

---

## 4. 常见批评与 2024 Unheard/PvE 风波

### Takeaway
批评集中在：新手期极度残酷（Chad vs Timmy）、外挂泛滥、grind 过长、系统不透明、单局时间成本高、wipe 逼退玩家。2024 年 4 月 BSG 把玩家呼声最高的 PvE 模式锁在 250 美元的 Unheard Edition 里，且违背了 EOD 版"含所有未来 DLC"的承诺，引发大规模抵制，四天内三次改口后让步。PvE 模式本身在机制上与 PvP 完全一致，只把真人 PMC 换成 AI PMC，且不清档——它的存在本身就证明"搜打撤的核心不需要真人对手"。

### Cited Findings

**新手期与技能差距**
- 一位 200 小时、50 局的新玩家自述"被打趴了"，学习曲线"hardcore and insane"；社区用 "Timmy"（新手）对 "Chad"（老手）称呼这条鸿沟 — [官方论坛帖](https://forum.escapefromtarkov.com/topic/173643-this-timmy-just-finished-my-50th-raid-w-about-200-hours-in/)
- 官方立场："我们从未打算让它成为所有人的游戏" — [GamesRadar 访谈标题](https://www.gamesradar.com/games/fps/we-never-planned-the-game-to-be-for-everyone-escape-from-tarkovs-creator-reflects-on-the-unwavering-vision-that-pioneered-an-fps-genre/)
- 医疗、改枪、背包管理等系统"作为守门机制"要求陡峭的学习曲线 — [机核 206918](https://www.gcores.com/articles/206918)
- 机核作者的结论：简化版搜打撤也必须接受根本性的不平等——有人是猎人有人是猎物，这是张力的来源 — [机核 206918](https://www.gcores.com/articles/206918)

**外挂**
- 2026 年 1–3 月封禁约 25,000 账号，其中仅 54% 是直接使用外挂，其余 46% 为 RMT、练级机器人、脚本；BSG 称"打击外挂仍是猫鼠游戏"，且因资源不足未起诉外挂开发者 — [Insider Gaming](https://insider-gaming.com/escape-from-tarkov-banned-players-cheating/)；[ixbt](https://ixbt.games/en/news/2026/04/06/408849-s-nacala-goda-v-escape-from-tarkov-zabanili-svyse-25-tysiac-celovek-iz-kotoryx-tolko-polovina-byli-realnymi-citerami.html)
- 官方推特连续通报：2025-09-26 起 8000+、2025-10-18 起 11,000+ — [官方 X](https://x.com/tarkov/status/1979254558619521220)；[Steam 讨论](https://steamcommunity.com/app/3932890/discussions/1/695373728984507552)
- 2023 年 BSG 曾封禁并公开 6700 名作弊者名单 — [TechCrunch](https://techcrunch.com/2023/03/06/russian-game-developer-bans-and-doxes-6700-cheaters)
- 玩家转向 PvE 的首要原因就是外挂："aimbot 和 wallhack 的问题在 PvE 协作模式里不存在" — [timesaver PvE 指南](https://timesaver.gg/blog/tarkov-pve-mode-roubles-progression-guide)
- Wikipedia 记录了持续的作弊问题以及针对批评 YouTuber 的 DMCA 滥用指控 — [Wikipedia](https://en.wikipedia.org/wiki/Escape_from_Tarkov)

**grind / 不透明 / 时间成本**
- Kappa 需要约 257 个任务、43 件 FIR 物品，"多周投入"，因此催生代练市场 — [timesaver Kappa](https://timesaver.gg/blog/tarkov-kappa-container-guide)
- 通胀是官方有意为之以维持装备差距，但未对玩家说明；Arena 的付费通行证有 P2W 隐患 — [机核 206918](https://www.gcores.com/articles/206918)
- 某次 wipe 引入更慢的成长和更高的难度，引发情绪化反弹 — [AOL/ScreenRant 转载](https://www.aol.com/news/latest-escape-tarkov-wipe-stirs-145605845.html)

**Unheard Edition 风波（2024-04）**
- 4 月 25 日公布 Unheard Edition，售价 250 美元，含 PvE 协作模式独占、更多跳蚤挂单位、更大仓库等 P2W 内容；2022 年买 150 美元 EOD 版的玩家曾被承诺"所有后续 DLC 免费"，BSG 事后修改了官网措辞 — [Dexerto](https://www.dexerto.com/escape-from-tarkov/escape-from-tarkov-unheard-edition-controversy-explained-why-players-are-angry-over-paywalled-pve-mode-2666098/)
- 社区经理辩称"PvE 不是 DLC，是新版本的独特功能" — [Hitmarker](https://hitmarker.net/news/escape-from-tarkov-dev-apologizes-to-players-and-changes-exclusive-pve-mode-plans-903478)
- 时间线：4/26 提出给 EOD 6 个月临时 PvE；4/27 改口为正式版上线时给，并给 5 折体验；4/28 完全让步，EOD 永久免费获得 PvE，按服务器容量分批放人 — [Dexerto](https://www.dexerto.com/escape-from-tarkov/escape-from-tarkov-unheard-edition-controversy-explained-why-players-are-angry-over-paywalled-pve-mode-2666098/)；[Wccftech](https://wccftech.com/escape-from-tarkov-controversial-267-pve-mode-will-at-least-be-given-for-free-to-edge-of-darkness-owners/)
- 官方 Discord 出现 131 字集体刷屏抗议"this cannot be tolerated"；玩家向消费者保护机构投诉 — [GamesRadar](https://www.gamesradar.com/games/fps/this-cannot-be-tolerated-escape-from-tarkov-community-in-meltdown-over-dollar250-edition-with-exclusive-pve-mode-as-a-131-word-chant-consumes-the-official-discord/)；[Dexerto](https://www.dexerto.com/escape-from-tarkov/escape-from-tarkov-unheard-edition-controversy-explained-why-players-are-angry-over-paywalled-pve-mode-2666098/)
- BSG 曾表态"我们不能把 PvE 给所有人"（服务器成本理由） — [FandomWire](https://fandomwire.com/escape-from-tarkov-justification-unheard-edition/)

**PvE 模式改变了什么**
- 功能上与 PvP 完全相同，只是独立角色 + AI 控制的 PMC 取代真人；除非自己组队，否则不会遇到其他人类 — [fandom Game modes（搜索摘要）](https://escapefromtarkov.fandom.com/wiki/Game_modes)；[neonsect](https://neonsect.com/escape-from-tarkov/tarkov-pve-vs-pvp/)
- PvE 档案持久、不随赛季清档；PvE 与 PvP 进度完全隔离；商人忠诚度、升级曲线、技能、保险规则一致；Prestige 与周榜 Leagues（1.1.5.1 加入）只对赛季角色开放 — [neonsect](https://neonsect.com/escape-from-tarkov/tarkov-pve-vs-pvp/)
- PvE 有独立跳蚤市场（15 级解锁），因挂单少常见物价反而更高；"AI 不会像外挂那样搜你的尸体"，利润积累更快 — [timesaver PvE 指南](https://timesaver.gg/blog/tarkov-pve-mode-roubles-progression-guide)
- 需要 Unheard/EOD 版或单独购买 PvE 扩展 — [fandom Game modes（搜索摘要）](https://escapefromtarkov.fandom.com/wiki/Game_modes)
- 1.0 时 PvE 玩家可自愿清档以进入新主线 — [Inven Global](https://www.invenglobal.com/articles/19896/escape-from-tarkov-sets-november-15-launch-date-as-servers-begin-24-hour-patch-downtime)

**1.0（2025-11-15）变化摘要**
- 1.0 于 2025-11-15 上线并登陆 Steam；开发始于 2012 年，测试 8 年 — [Wikipedia](https://en.wikipedia.org/wiki/Escape_from_Tarkov)；[官方公告](https://www.escapefromtarkov.com/news/id/352)（正文 403）
- 1.0 内容：强制清档、故事主线、终局地图 Terminal、新 AI 派系、弹道/性能/节奏调整、赛季系统（首季 KORD BREACH） — [dtgre 1.0 指南（搜索摘要）](https://www.dtgre.com/2025/11/escape-from-tarkov-1-0-complete-update-guide-everything-new-changed.html)；[Inven Global](https://www.invenglobal.com/articles/19896/escape-from-tarkov-sets-november-15-launch-date-as-servers-begin-24-hour-patch-downtime)
- Terminal：不在普通队列里，通过剧情进度 + 从 Shoreline 定时转移进入；唯一撤离是码头的 Zubr 船，"真正逃离塔科夫"；死亡或超时不丢物品，但需重新购买/制作入场通行证；Nikita 称其目标是"像 Call of Duty 那样的电影化单人射击体验，但带着全部 Tarkov 机制" — [timesaver Terminal](https://timesaver.gg/blog/tarkov-terminal-map-escape-guide)；[PCGamesN](https://www.pcgamesn.com/escape-from-tarkov/narrative-storytelling-legacy)
- Terminal 失败可重试，但每次重试要先补做额外任务，"显著抬高失败成本"；通关后可回滚继续普通游玩 — [PCGamesN](https://www.pcgamesn.com/escape-from-tarkov/narrative-storytelling-legacy)
- 2026-09 的 1.1.5.0 重做 Lighthouse 与 Lightkeeper 任务链 — [timesaver 1.1.5.0](https://timesaver.gg/blog/tarkov-1-1-5-0-lighthouse-rework-lightkeeper)

### Inferences
- PvE 模式的需求本质是"想要 Tarkov 的系统与压力，但不要外挂和不可控的真人"。这正是单机搜打撤的立项依据：Tarkov 自己的数据（PvE 独立经济仍能运转、玩家愿意为它付 250 美元的怒火）证明了系统本身足以撑起循环。
- 1.0 的 Terminal 设计非常值得横版借鉴："入场券制、单一撤离、限时、失败不丢装备但要重新赚门票"——这是一种把"终局关卡"嵌进搜打撤循环的方式，压力来自门票而不是装备。
- Tarkov 的批评清单几乎就是单机版的"免费优势"：没有外挂、没有真人 Chad、可以自定 wipe 节奏、可以给系统加说明。但"grind 太长"和"系统不透明"是 PvE 也有的问题，需要主动解决。

### Gaps
- 未找到 PvE 模式 AI PMC 行为质量的可靠评测（论坛有"PvE AI need to change"帖但未抓取正文）。
- 1.0 的"新 AI 派系"、弹道具体改动、动态战利品/boss 刷新率改动缺少一手 patch note 引用（官方公告页 403）。

---

## 5. 哪些系统是必需的、哪些是可选的（社区与设计者观点）+ 对横版单机的迁移建议

### Takeaway
中文设计圈（机核）与英文分析（games.gg、COGconnected）结论一致：必需的是 (1) 贯穿全局的持续压力（有本钱可输）、(2) 局外成长动机（局内产出必须有去处）、(3) 有灵魂的搜刮本身、(4) 打/撤的自主选择。可选/可替换的是：wipe、军事写实题材、极端操作难度、Tetris 格子（可用重量替代）、PvP 本身。鸭科夫（俯视角单机搜打撤，首周 100 万份）是"去 PvP 保核心"的成功样本。

### Cited Findings
- 三条必需项："持续的 raid 压力（没有升压就没有撤离的情绪回报）、局外成长动机（必须给超越单局的理由）、搜刮玩法本身（独立于经济可行性的核心爽点）"；非必需项："清档周期（可用赛季装备轮换/外观威望替代）、写实军事美术（Dark and Darker 证明中世纪奇幻同样成立）、极端机械难度（三点稳定、装备重量等不如压力设计重要）" — [机核 195153](https://www.gcores.com/articles/195153)
- 同文对单机/PvE 方向的建议：用纯 roguelike 设计 + 机制压力（Hades 式 run、Helldivers 2 式难度缩放、Alien: Isolation 式氛围）逃离 PvP 经济陷阱 — [机核 195153](https://www.gcores.com/articles/195153)
- "局内体验和局外资源必须相互深入影响，两者缺一不可"是品类的灵魂；损失发生在局内、奖励只在撤离后兑现 — [机核 197198](https://www.gcores.com/articles/197198)
- 失败案例的共同点："如果死亡只损失一把枪和几分钟，就没有理由改变打法"；DMZ 因无赌注而失去张力；Marathon 地图空、目标不清；玩家需要任务/叙事/目标让冒险有意义 — [games.gg](https://games.gg/news/why-most-studios-struggle-to-make-a-successful-extraction-shooter/)
- 鸭科夫保留了"局外成长、战斗、搜索"三件事，简化背包但保留重量，转为俯视角但保留爆头等技术要求，各区域有清晰的难度递进；三角洲去掉大部分局外成长、改为职业英雄；作者给出的对照表中三角洲的"撤离张力"被判定为"被削弱" — [机核 206918](https://www.gcores.com/articles/206918)
- 鸭科夫的死亡惩罚：传统搜打撤严酷死亡的深层原因是需要用意外死亡合理消耗资源以抑制通胀；单机没有通胀烦恼，因此以玩家快乐优先，"死后装备掉落在原地，还有再捡回来的机会" — [知乎《塔科夫被偷家了？》](https://zhuanlan.zhihu.com/p/1921863802644854609)（搜索摘要）
- 鸭科夫用锥形视野 + 战争迷雾保留"看不见"的紧张，搜刮时有转圈动画延长舔包时间，"增加交战可能也提升'偷'的感觉"；首周销量破 100 万 — [知乎/观察者网（搜索摘要）](https://zhuanlan.zhihu.com/p/1921863802644854609)；[36 氪《5 人开发的 PvE 搜打撤 3 天 50 万销量》标题](https://36kr.com/p/3519072276438150)（正文被安全检测拦截）
- 鸭科夫的经验："PvE 简化需要不对称性——去掉 PvP 不会自动产生好内容，鸭科夫的成功来自 AI 行为模式维持的敌人不可预测性，而不是把难度删掉" — [机核 206918](https://www.gcores.com/articles/206918)
- 地图广播位置、强制冲点会消灭"搜"的阶段，让搜打撤三位一体坍塌 — [机核 206918](https://www.gcores.com/articles/206918)；[机核 214763](https://www.gcores.com/articles/214763)
- Tarkov 制作人对创新的态度："开发者害怕创新，多数人走老路复制已成功的东西"，并称从竞品身上没什么可学 — [gamepressure](https://www.gamepressure.com/newsroom/developers-are-afraid-of-innovation-most-follow-well-worn-paths-a/z7847d)

### Inferences（面向横版单机丧尸搜打撤的迁移清单）
- **必留（核心）**：带装备入局；死亡损失（至少损失大部分）；撤离才结算；仓库空间/重量稀缺；局外至少两条资源出口（商人 + 基地/藏身处）；有目标链（任务）让冒险有意义；打/撤自由（多撤离点、多路线、不强制战斗）。
- **强烈建议保留但可简化**：安全箱（小容量、随进度扩容，是最便宜的"新手保护 + 长期目标"）；保险/尸体回收（鸭科夫式"掉落原地可捡回"更适合单机，或"付费保险下一局送回"）；分部位健康 + 出血/骨折（简化到 3 部位）；弹种对护甲（横版可简化为"穿甲弹 vs 硬化丧尸/护甲人类"）；Scav 式免费出击（随机装备、零风险、有冷却，防破产）。
- **可替换**：wipe → 章节/赛季或 prestige；PvP 不可预测 → AI 派系、随机 boss、动态刷怪、声音先于画面；跳蚤市场 → 商人动态价格或砍掉；技能"用即涨" → 保留但数量收敛。
- **横版特有的机会**：一维/二维空间让"撤离点在图的另一端"极其直观；负重直接映射到跳跃高度/移速；画面外音效（左右声道）天然做预警；锁门/钥匙/开电等条件撤离在横版里就是关卡门。
- **必须主动解决的 PvE 弱点**：没有真人后，张力必须靠 AI 不可预测性、资源稀缺和时间压力维持；grind 与不透明要用可读的系统说明补上。

### Gaps
- 未找到 GDC 或 GMTK 专门讲 Tarkov/搜打撤设计的一手演讲（GDC 2026 仅有反外挂相关 session）；本节"必需 vs 可选"主要依赖机核作者与 games.gg 的分析，缺少 BSG 官方对系统优先级的表述。
- 鸭科夫制作人访谈（观察者网）与 36 氪文章正文均被拦截，鸭科夫具体的死亡惩罚数值（掉落保留时长、是否损耗）未能核实。
