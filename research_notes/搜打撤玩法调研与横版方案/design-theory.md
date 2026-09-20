# 搜打撤（撤离射击）玩法设计理论调研

> 视角：为一款**单机**搜打撤游戏做设计的小团队。时间基准 2026-09。所有事实项均附来源；无来源的推论放在「推论」小节；找不到可靠资料的放在「缺口」。

## 一、核心心理引擎：损失厌恶、变比率奖励、gear fear、自愿撤离

### Takeaway
搜打撤的引擎不是"射击"，而是**把局外资产押进局内、只有活着出来才能兑现**——这一条把损失厌恶、变比率奖励（开盲盒）和"劫后余生"三种情绪串成一个 期待→实现→释放 的闭环；单机版失去"人类对手不可预测"这一变量，必须靠 AI 威胁与资源压力补足死亡风险。

### Cited Findings
- 定义：「玩家带入战局的所有装备都来自自己的局外资产，在局内获得的资产必须成功撤离后才能转化为局外收益」；根本原则是**局内局外资源耦合**，「局内体验和局外资源相互深入影响，两者缺一不可」，区别于 Roguelike 的每局独立 — [机核：搜打撤玩法分析（上）](https://www.gcores.com/articles/197198)
- 「损耗发生在局内，奖励发生在局外」；死亡代价极高（除安全箱外全失），使每个行动都有实际意义；作者用《暗黑地牢》（英雄作为跨局资源）论证该原则不限于射击游戏 — [机核：搜打撤玩法分析（上）](https://www.gcores.com/articles/197198)
- 搜打撤的设计效果是「让玩家实际上玩的不光是当前对局，而是这一局和将来的对局」，玩家一开始就带着发展眼光进入对局 — [机核：魔方研究·搜打撤玩法为何成立](https://www.gcores.com/articles/189522)
- 「搜打撤游戏实际是一场稀缺资源的争夺战」；体验是「过山车式」——获得战利品的欣快与死亡掉落的懊悔交替；随机性来自容器刷新概率与位置、钥匙房内容未知、跳蚤市场动态定价三层 — [机核：魔方研究](https://www.gcores.com/articles/189522)
- 三阶段：搜（进入高风险区）、打（克服障碍）、撤（带出并逃离），目标结构为「进去，拿到东西，然后活着出来」；「搜索」本质是「开盲盒」，对应斯金纳箱的**变动比率程序**——「这是最有效、最持久的强化程序」 — [机核：“搜打撤”爆火背后](https://www.gcores.com/articles/207031)
- 撤离阶段是情绪峰值：「劫后余生的巨大释然与成就感」，同时满足"追求成功"与"逃离失败"两类动机；整体形成「期待-实现-释放」的「牢不可破的成瘾闭环」 — [机核：“搜打撤”爆火背后](https://www.gcores.com/articles/207031)
- 单机差异的关键论据：「AI 的行为是可预测的」，而人类对手带来不可预测性，击败人类是「证明自己」而非完成任务 — [机核：“搜打撤”爆火背后](https://www.gcores.com/articles/207031)
- 反例/反证：Embark 最初把 ARC Raiders 做成 F2P 合作 PvE 英雄射击，团队发现没有人类对手的不可预测性时「不好玩」，于是转向 PvPvE — [Naavik: How Embark Studios Saved ARC Raiders](https://naavik.co/digest/how-embark-studios-saved-arc-raiders/)
- 正证：「如果 NPC 和敌人能为玩家的搜索和撤离带来足够的死亡风险，搜打撤的体验循环就依然能够成立，PvP 不是必要的」；PvP 模式易生马太效应「贫者越贫，富者越富」，高资产意味着更高容错率 — [GameRes：《逃离鸭科夫》分析——PvE 或许是搜打撤玩家刚需](https://www.gameres.com/915612.html)
- 西方分析同义表述：类型建立在损失厌恶与延迟满足上，「每次 raid 都是赌博，每个箱子都像拉老虎机」；「Gear Fear」= 损失厌恶在本类型中的名字 — [Insider Gaming](https://insider-gaming.com/love-or-hate-extraction-shooters-wild/)；[Alloutemo guide](https://alloutemo.co.uk/extraction-shooter/)
- 撤离环的巧妙之处在于「前置风险、后置释放（front-loads risk and back-loads relief）」；「令人满足的循环不在于奖品大小，而在于通往奖品的期待」；成熟设计会让「早期撤离显得慷慨，之后赌注上升」，并提供「自然停止点（局后总结、冷却、诚实的概率）」以免滑向强迫 — [COGconnected: How Extraction Loops Changed Reward Design](https://cogconnected.com/2026/08/how-extraction-loops-changed-reward-design/)
- 灰色 RMT 把虚拟战利品变成"可感知的真实资产"，触发「赌徒心理」；ARC Raiders 400 万份销量说明去掉「残酷的 PvP」后核心循环仍有吸引力；作者预测搜打撤将从"品类"变为模块化「玩法工具集」 — [机核：“搜打撤”爆火背后](https://www.gcores.com/articles/207031)
- Raph Koster：纯随机掉落会让玩家因长时间等不到想要的物品而疏离，「奖励应始终与挑战的内容相关联」（据搜索摘要转述） — [Raph Koster 文章集](https://www.raphkoster.com/games/essays/)

### Inferences
- 单机搜打撤的"死亡风险"必须由三件事共同提供：（1）不可预测的 AI（巡逻/听声/派系互斗）、（2）资源压力（弹药/医疗/负重）、（3）环境事件（夜晚、风暴、毒区）。ARC 的"PvE 不好玩"与鸭科夫/Zero Sievert 的成功并不矛盾：前者是**合作英雄射击**没有资产押注，后者是**有押注的单人 PvE**。押注（局外资产耦合）才是引擎，人类对手只是放大器。
- 无人观看的单机里，"证明自己"动机弱化，可用**可见的仓库成长、任务链里程碑与自设难度**替代社交证明；鸭科夫的 6 档难度 + 创意工坊即是这条路（见第二节）。
- "风险预算"模型（带得越多、赌得越多）在单机同样成立，但需要 AI 掉落/事件对"轻装进入"有惩罚（拿不到高价值区），否则玩家会收敛到零风险刷图。
- "再来一局"钩子来自两端：局内的"差一点就到撤离点"（后置释放）和局外的"下一次升级只差 X"（仓库计分板）。设计时要保证两条进度条同时可见。

### Gaps
- 未找到把损失厌恶/前景理论量化到搜打撤参数（如死亡损失占仓库比例的最优区间）的实证研究；相关 arXiv 结果均与游戏无关。
- 未找到 Hunt: Showdown 的正式 GDC 演讲文稿；仅有 gamedeveloper.com 的玩家/设计分析与 Crytek 音频博客。

## 二、经济设计：价值层级、货币沉淀、仓库即计分板、删档与通胀、单机解法

### Takeaway
搜打撤经济最难的是「撤」字代表的自洽经济系统；PvP 大作靠删档或"生产者/消费者分层 + 大量沉淀"压通胀，而单机作品（鸭科夫、Zero Sievert）的解法是**砍掉玩家间市场、用 NPC 定价与基地升级/技能作为硬沉淀、以任务链而非物价驱动进度**，并接受"进度太快"是单机的主要风险。

### Cited Findings
- 「最难搞的，就是这个'撤'字，它代表着一套玩家自治且自洽的经济系统」；「即使原创游戏《逃离塔科夫》都需要定期删档来维持经济平衡」 — [游民星空：求求你们别再做“搜打撤”了](https://www.gamersky.com/news/202506/1938266.shtml)
- 搜打撤玩家共识"不可能三角"：「搜刮体验好」「物价正常」「不删档」三者不可兼得；不删档意味着投入持续累积、资源不重置，「久而久之就会导致经济系统膨胀，物价飞涨」（来自搜索摘要，原文无法抓取全文） — [知乎：塔科夫被偷家了？](https://zhuanlan.zhihu.com/p/1921863802644854609)
- 删档/不删档演进论：早期买断制（塔科夫）能容忍删档因为已收全款；作者认为「支持不删档的玩家才是沉默的多数」；经济分期：1.0「仓库驱动」——稀缺维持币值、「既能成长又有压力」；2.0「生产者/消费者」——省钱刷图的生产者积累货币、激进战斗的消费者高价购买顶级装备，「消费者的资产不断向生产者流转」；关键干预：地图难度与产出分层、装备定价梯度、资源沉淀（藏身处升级、装备损耗）、交易税；节假日物价飙升证明"玩家构成而非人数"驱动通胀；3.0 尚无成熟解，作者猜测走向「去搜打撤化」平台化 — [机核：谈谈搜打撤的不删档](https://www.gcores.com/articles/213096)
- 同文对比：塔科夫「低产出、简单控制」→ 财富积累慢、贫穷期长；三角洲「前期高产出、高消耗成本」→ 快速变现；暗区突围居中 — [机核：谈谈搜打撤的不删档](https://www.gcores.com/articles/213096)
- 塔科夫总监 Nikita 承认某赛季进度「太快」并非本意，原因是 Arena 共享经验与 Marathon 活动给了过多经验；将在下个赛季修正（据搜索摘要，原文 403） — [Forbes](https://www.forbes.com/sites/mikestubbs/2024/09/23/nikita-admits-the-current-escape-from-tarkov-progression-is-too-fast/)
- 塔科夫 1.0（2025-11-15）后 PvP/PvE 档案永久保留、不再强制删档；玩家批评历史上删档是为逼标准版玩家买 EOD 版以每次开档取得优势 — [TarkovQuestie: Seasons](https://tarkovquestie.com/tarkov/seasons)；[AOL/Latest wipe responses](https://www.aol.com/news/latest-escape-tarkov-wipe-stirs-145605845.html)
- 塔科夫 PvE 模式：独立档案、独立跳蚤市场，装备仅受 AI 威胁、无删档焦虑；1.0 提供**可选**删档，理由是让所有人以相近节奏体验终章，而非为压通胀；作者承认 PvE 跳蚤市场可能在"删/不删"玩家间出现「大失衡」 — [Neonsect: PvE vs PvP](https://neonsect.com/escape-from-tarkov/tarkov-pve-vs-pvp/)；[PCGamesN: PvE wipe is a good thing](https://www.pcgamesn.com/escape-from-tarkov/pve-wipe)
- 鸭科夫的单机经济：庇护所是「准备、交易、生产、角色成长」的中枢，模块化摆放仓库/工作台/研究中心/训练场；升级解锁配方、扩容、提升生命/耐力/精度；交易区与黑市买卖，NPC 货架随任务扩展 — [iXBT Games 评测](https://ixbt.games/en/reviews/2025/11/09/ne-prosto-parodiia-a-moshhnaia-kritika-zanra-obzor-extraction-sutera-escape-from-duckov.html)
- 鸭科夫砍掉了「没有经济学博士都搞不懂的交易市场」和滚轮调速等门槛，改枪保留数值空间但更易懂（搜索摘要） — [知乎：塔科夫被偷家了？](https://zhuanlan.zhihu.com/p/1921863802644854609)
- 鸭科夫死亡惩罚：不是花钱保险，而是**回到死亡地点捡回装备**，再次死亡则永久丢失（类魂机制） — [iXBT Games 评测](https://ixbt.games/en/reviews/2025/11/09/ne-prosto-parodiia-a-moshhnaia-kritika-zanra-obzor-extraction-sutera-escape-from-duckov.html)；GameRes 称之为「死亡可回图获得第二次机会」 — [GameRes](https://www.gameres.com/915612.html)
- 鸭科夫团队 5 人（3 策划 2 美术），制作人 Jeff 玩过 500+ 小时塔科夫；选单机因「缺乏开发联机功能的技术能力」，同时规避经济通胀与外挂；6 档难度 + MOD，避免「玩家因高强度竞技产生的负反馈」；折后 51.04 元、12 天 200 万份、流水破 1 亿、峰值 30 万+在线、Steam 96% 好评（3.3 万+）；「贪多嚼不烂」 — [腾讯新闻：两周狂赚 1 亿，这 5 人凭什么](https://news.qq.com/rain/a/20251103A012SD00)；5 天百万销量、11 月破 300 万 — [GameRes](https://www.gameres.com/915612.html)；游戏于 2025 年发售，Team Soda 开发、bilibili 发行 — [Wikipedia](https://en.wikipedia.org/wiki/Escape_from_Duckov)
- Zero Sievert（单人开发，GameMaker）：首周 130 万美元、首月 240 万、累计 310 万+；开发者承认「进度目前相当快」，要加机制拉长但「必须小心别做得无聊和肝」 — [Game World Observer](https://gameworldobserver.com/2023/01/23/zero-sievert-1-million-revenue-cabo-studio-extraction-shooter-steam)；[NME 专访](https://www.nme.com/features/gaming-features/zero-sievert-developer-cabo-studio-talks-about-the-tarkov-esque-2d-extraction-shooter-3321572)
- ARC Raiders 转 40 美元买断，使团队能「基于慷慨而非变现压力来平衡经济」；两周 400 万份、70 万同时在线 — [Naavik](https://naavik.co/digest/how-embark-studios-saved-arc-raiders/)
- Hunt: Showdown 的反面：经济「过于宽松」，玩家「即使多数局失败也能净盈利」，削弱了「消耗与紧张」的核心主题 — [Game Developer: Engaging Players in Hunt: Showdown](https://www.gamedeveloper.com/design/engaging-players-in-hunt-showdown)
- 塔科夫长期目标 Kappa 容器：需完成约 257 个任务链并在局内找到 43 件收藏品；藏身处升级给被动收益（回血、仓库、被动收入），后期升级「极其昂贵」，玩家需常备卢布 — [TarkovKit 进度指南](https://tarkovkit.com/en/guides/beginner/quests-progression)；[Timesaver Kappa 指南](https://timesaver.gg/blog/tarkov-kappa-container-guide)

### Inferences
- 单机没有"生产者/消费者"两类真人来互相抽水，所以只能靠**硬沉淀**：基地升级、技能训练、弹药/耐久消耗、NPC 收购价随类别递减。鸭科夫把基地做成"准备+生产+成长"三合一，就是把塔科夫的跳蚤市场整个换成了沉淀池。
- 单机最应担心的不是通胀而是**进度跑完**（Zero Sievert 的自述）。对策是把"钱"降级为中间货币，让稀缺的是**特定物品**（任务件、钥匙、高阶配方材料），而非货币总量。
- "仓库即计分板"在单机要显性化：仓库价值曲线、收藏墙、任务完成率都应有 UI 落点，替代 PvP 里的"别人看到我穿什么"。
- 保险机制在单机可换成鸭科夫式"尸体回收"：既保留损失痛感，又给一个"再进一局"的即时理由——这实际上是把保险变成了任务。

### Gaps
- 塔科夫保险 / Found-in-Raid 的官方 wiki 页面无法抓取（402），未能核实具体费率、返还时间与 FIR 对跳蚤/任务的限制细节。
- 未找到鸭科夫或 Zero Sievert 的**官方**经济数据（NPC 买卖差价、沉淀比例）；上述均为评测与访谈层面的描述。
- 「不可能三角」说法仅见于知乎文章的搜索摘要，未能验证原文表述。

## 三、局外成长 vs 局内成长：基地、技能、任务链、长期目标

### Takeaway
任务链是搜打撤的"隐形教程 + 导航系统"：它把玩家推向特定地图区域、逐步解锁商人与配方，并用 Kappa 式超长目标兜底；单机作品把这一层做成**顺序解锁地图 + 基地模块化升级 + 任务驱动的商人扩展**。

### Cited Findings
- 鸭科夫的任务发布者「提供更有导向的进度感」，任务「逐步引入合成与商人经济的新扩展，并把玩家引向不同地图区域」 — [PC Gamer](https://www.pcgamer.com/games/third-person-shooter/escape-from-duckov-might-look-like-a-parody-but-its-a-full-fledged-full-featured-singleplayer-bottling-of-extraction-shooter-juice/)
- 鸭科夫五张主地图顺序解锁；发现信标后开启传送，信标兼作检查点；任务戏仿塔科夫（"青铜表"任务简化为在售货机买钥匙） — [iXBT Games 评测](https://ixbt.games/en/reviews/2025/11/09/ne-prosto-parodiia-a-moshhnaia-kritika-zanra-obzor-extraction-sutera-escape-from-duckov.html)
- 鸭科夫内容规模：5 张地图 × 3 种环境状态（昼/夜/风暴）、50+ 武器、复杂装备与外观定制 — [腾讯新闻](https://news.qq.com/rain/a/20251103A012SD00)
- 塔科夫 Kappa：~257 任务链 + 43 件局内拾取物；藏身处优先级通常是仓库、通风、医疗站、营养单元 — [Timesaver](https://timesaver.gg/blog/tarkov-kappa-container-guide)；[TarkovKit](https://tarkovkit.com/en/guides/beginner/quests-progression)
- Hunt 的通用挑战因「没有额外风险、没有激励、没有可规划的东西」而缺乏吸引力，奖励与付出不匹配；随机合同「与预期性玩法、技巧与表达相悖」 — [Game Developer](https://www.gamedeveloper.com/design/engaging-players-in-hunt-showdown)
- 塔科夫 PvE 玩家自述"没有删档所以可以慢慢玩"是其乐趣所在 — [Steam 讨论：How is the PVE mode?](https://steamcommunity.com/app/3932890/discussions/1/686363358607454852/)

### Inferences
- 小团队可把任务链当作**关卡设计的替代品**：不用做很多地图，而是用任务把同一张地图的不同角落在不同时段/条件下"重新出题"（夜晚去 X 取 Y、风暴里去 Z）。鸭科夫的 5 图 × 3 状态就是这个乘法。
- 每个任务应至少改变一个"下次进图的理由"：解锁商人货架、开新配方、给一把钥匙。纯"杀 N 个"任务是 Hunt 被批评的那类"无风险挑战"。
- 长期目标要**可见且可分解**：一面收藏墙（Kappa 的 43 件）比一个隐藏成就有效得多。

### Gaps
- 未找到关于"任务链把玩家送往特定地图区域"的开发者自述（塔科夫或鸭科夫），仅有媒体观察。
- 未找到 Dark and Darker 的深度设计访谈文本（仅有 YouTube 与官网愿景摘要）。

## 四、单局设计：时长、出生/撤离点、撤离条件、时间压力、战利品分布、钥匙房、噪音

### Takeaway
多人作品用 15–50 分钟计时器 + 出生在一侧/撤离在另一侧的横穿结构制造时间与路径压力；单机作品（鸭科夫）取消计时器，改用**动态环境状态**和**必须走回撤离点/尸体**来制造压力；Hunt 的核心是「剥夺信息」——靠声音回答"是什么/在哪/什么状态"。

### Cited Findings
- 塔科夫单局 20–50 分钟、最多 14 人：Factory 15 分钟 4–6 PMC；Customs 25 分钟（另有来源称 35）8–12 PMC；Interchange 35 分钟 10–14；Streets 50 分钟 12–16 — [The Loadout: EFT maps](https://www.theloadout.com/escape-from-tarkov/maps)；[TimmyTracker map guide](https://www.timmytracker.com/guide/maps)
- Customs 通常「出生在地图一侧，被迫横穿几乎整张地图才能撤离」；玩家抱怨大地图只有 2–3 个可用撤离点且集中在对侧，造成时间压力问题 — [The Loadout](https://www.theloadout.com/escape-from-tarkov/maps)；[Steam 讨论：raid timers](https://steamcommunity.com/app/3932890/discussions/1/805719526076353807/)
- 地图设计要素：随机出生点、条件性撤离区、概率性出口、价值不等的资源区，支撑多样战术决策；钥匙房「容器可见但内容未知」 — [机核：魔方研究](https://www.gcores.com/articles/189522)
- 鸭科夫单局**无计时器**可无限停留；动态条件：夜晚出现需夜视的蜘蛛机器人、宇宙风暴带来异常生物并要求低护甲的防护服、毒气区需呼吸器——「迫使玩家做装备取舍，强调准备与规划」；地图「开放布局、多层进入、隐藏路线、垂直元素」 — [iXBT Games 评测](https://ixbt.games/en/reviews/2025/11/09/ne-prosto-parodiia-a-moshhnaia-kritika-zanra-obzor-extraction-sutera-escape-from-duckov.html)
- Hunt「让玩家饥渴于信息」——在沼泽里潜行时捡到的是知识而非武器；「真正的创新是听到的而不是看到的」（灯笼铰链吱呀、树枝断裂） — [Edge via PressReader](https://www.pressreader.com/australia/edge/20200326/281556587905841)
- Hunt 音频三支柱：可读性、真实感、一致性；每个声音要回答「是什么？在哪？处于什么状态？」；每种 AI 有独立声库，强度按「环境→警觉→战斗」三级递增，**每次升级都发出一次性提示音警告玩家**；遮挡按材质密度衰减（木<混凝土），距离衰减丢高频；乌鸦/鸭子/鸡/狗、门、发电机、玻璃与吊罐等**声音陷阱**遵循同一规则 — [Hunt: Showdown 官方博客：Hunt Audio](https://www.huntshowdown.com/news/hunt-audio-readability-realism-and-consistency)
- 「非常早期开发者就看到了通过剥夺信息制造紧张的机会」；声音既用于追踪他人也引发被追踪的偏执 — [PlayStation Blog: Listen Closely](https://blog.playstation.com/2020/02/17/listen-closely-insight-into-the-sound-design-of-hunt-showdown/)
- Marathon 的单局结构被批评：每次只能带一个合同、Cryo Archive 地图只在周末开放、单人/双人选项差 — [Seasoned Gaming 评测](https://seasonedgaming.com/2026/04/02/marathon-review/)
- 鸭科夫的死亡回收（回到尸体处）意味着"上一局的失败地点"成为"下一局的目标点" — [iXBT Games](https://ixbt.games/en/reviews/2025/11/09/ne-prosto-parodiia-a-moshhnaia-kritika-zanra-obzor-extraction-sutera-escape-from-duckov.html)

### Inferences
- 单机去掉计时器后，需要别的"局内时钟"：昼夜推进、AI 增援波次、负重/体力、耗材（夜视电池、呼吸器滤芯）。鸭科夫用环境状态做时钟，Darkwood 用真实时间的昼夜（见第五节）。
- 出生与撤离点的黄金结构是"横穿"：高价值区放在路径中段偏离主线的地方（要绕），撤离点位于对侧；单机可把撤离点做成条件性（需钥匙/需付费/需背特定物），让"选哪个出口"本身是决策。
- 钥匙房的心理价值来自"可见但不可得"：在关卡里**先让玩家看到锁着的门/柜**，钥匙从别的地图或商人获得，形成跨局目标。
- 噪音系统是横版/俯视单机最便宜的"信息剥夺"手段：玩家发声 → AI 状态升级 → 一次性提示音。这一套三级状态 + 提示音规则可以直接照搬 Hunt。

### Gaps
- 未找到关于"战利品密集高危区 vs 分散分布"哪种更佳的开发者数据；仅有塔科夫玩家指南层面的"高价值区在地图中央/远端"描述。
- 未找到鸭科夫或 Zero Sievert 对地图尺寸/单局平均时长的官方数字。

## 五、PvE 难度：不作弊的威胁 AI、漫游事件、Boss，以及恐怖/丧尸游戏的张力管理

### Takeaway
成功的单机搜打撤靠**可读但致命**的 AI（听声、追光、派系互斗、精英特殊能力）和**环境事件**替代人类威胁；恐怖/生存游戏提供的成熟工具是：资源稀缺到"刚好够"、昼夜节律、永久死亡下的高危/低危区域自选，以及 RE4 式的隐性动态难度。

### Cited Findings
- 鸭科夫 AI：三方（掠夺者、雇佣兵、Boss）互相交战形成「活的世界」；bot「持续巡逻，对噪音、光源和玩家移动做出反应」；以反应速度和持续火力弥补战术简单；精英会投雷、闪避或传送；Boss「Vida」对应塔科夫 Killa，需要魂系翻滚 — [iXBT Games 评测](https://ixbt.games/en/reviews/2025/11/09/ne-prosto-parodiia-a-moshhnaia-kritika-zanra-obzor-extraction-sutera-escape-from-duckov.html)
- 鸭科夫「没有 PvP；挑战来自聪明的 AI、资源压力与撤离风险」 — [Medium: When Ducks Meet Extraction Shooters](https://klaothongchan.medium.com/when-ducks-meet-extraction-shooters-the-rise-of-escape-from-duckov-f49f49ca0a19)
- Zero Sievert 开发者：「打偏几枪，最简单的敌人也能几秒内杀死你」；开发者本人「常死于最傻的事」，并视之为游戏的强项 — [GameMaker 博客专访](https://gamemaker.io/en/blog/zero-sievert-interview)
- ARC Raiders 的 ARC 机器「极度致命」，迫使对立小队「软合作」再背叛；敌人动画用深度强化学习驱动（受伤后踉跄、挣扎），提升不可预测性 — [Naavik](https://naavik.co/digest/how-embark-studios-saved-arc-raiders/)；[AI and Games](https://www.aiandgames.com/p/arc-raiders-and-the-ethical-use-of)
- Hunt AI 声音三级升级 + 一次性警告音（见第四节） — [Hunt 官方博客](https://www.huntshowdown.com/news/hunt-audio-readability-realism-and-consistency)
- 生化危机：难度「同时放大敌人强度并增加物品稀缺」；理想体验是「始终踩在弹药与血量刚好够活的那条线上」，这是「生存恐怖的秘方」 — [Resident Evil Wiki: Difficulty](https://residentevil.fandom.com/wiki/Difficulty)；[GameSpot: Hardcore is Village's sweet spot](https://www.gamespot.com/articles/hardcore-difficulty-is-resident-evil-villages-sweet-spot/1100-6491132/)
- RE4（2005）隐藏动态难度：暗中评估爆头率、受伤、续关、库存管理给出内部难度等级；打得准就让敌人更激进、伤害更高，打不准就更被动 — [VintageIsTheNewOld: Does RE have dynamic difficulty](https://www.vintageisthenewold.com/faq/does-resident-evil-have-dynamic-difficulty)；玩家社区对 RE2 重制的适应难度存在反对声 — [Steam 讨论](https://steamcommunity.com/app/883710/discussions/0/1743358239840831243/?ctp=10)
- Darkwood：昼夜以真实时间推进，白天 08:00–20:00 相对安全地搜刮半随机森林、加固藏身处，夜晚防守；「白天危险，但与夜晚无法相比」；枪械弹药极稀缺，「一把 20 发的手枪是重要资源」；开发者刻意不用 jump scare，靠氛围、音效与受限视野 — [EarlyGuides: Darkwood](https://earlyguides.com/darkwood)；[Twin Cities Geek](https://twincitiesgeek.com/2020/10/darkwood-is-memorable-and-legitimately-scary-survival-horror/)
- Project Zomboid：永久死亡是「构建张力的支点」；高危区搜刮回报高，也可以在城镇外围低风险低回报搜刮，「让玩家自主选择承担哪些风险」；B42 有两套稀缺系统——建筑可生成为"已被搜刮"，另有长期曲线随月份减少刷新量，模拟社会崩溃 — [Medium: Surviving the Apocalypse (PZ)](https://medium.com/@tkooliya/surviving-the-apocalypse-the-unforgiving-difficulty-and-structure-of-project-zomboid-and-its-3a98895aca88)；[Gamers.Wiki: B42 loot depletion](https://gamers.wiki/en/games/project-zomboid/guides/project-zomboid-build-42-loot-depletion-why-the-map-empties-out)

### Inferences
- "不作弊的威胁"三件套：（1）感知规则公开且一致（噪音半径、光源、视锥），（2）状态升级有提示音，（3）致命性来自数值而非全知（打偏就死，但它得先找到你）。鸭科夫、Hunt、Zero Sievert 都是这一套。
- 派系互斗是小团队最划算的"漫游事件"：两组 AI 相遇自动打起来，玩家可绕、可渔利、可被卷入。
- 丧尸题材天然适合"密度即难度"：与其做聪明 AI，不如做**噪音吸引的群体**（Zomboid 模式）+ 少量特殊感染者（鸭科夫精英模式）。
- RE4 式动态难度在有资产押注的游戏里要谨慎——玩家会怀疑"是不是因为我装备好所以敌人更狠"，这会侵蚀 gear 的价值感；更稳妥的是**显性**难度档 + 区域固定难度分层。
- Zomboid 的长期稀缺曲线可移植为"地图搜刮枯竭"：同一地图反复进入后固定容器变空，只剩动态刷新与 AI 掉落，逼玩家去更深的区域或解锁新图。

### Gaps
- 未找到 Zero Sievert 关于 AI 感知/巡逻规则的开发者说明。
- 未找到"漫游 Boss / 随机事件"对留存影响的数据。

## 六、失败模式：为什么搜打撤会翻车

### Takeaway
公开案例的死因高度集中：**玩家池崩塌导致匹配失效**（The Cycle、Marauders、Level Zero、Hawked）、**外挂**（The Cycle）、**更新停滞**（Marauders）、**结构性限制**（Marathon 的单人/合同限制）、**经济过松导致无消耗感**（Hunt）以及**品类招牌疲劳**；单机天然免疫前两条，但要直面"进度跑完就没事做"与"内容变化不足"。

### Cited Findings
- The Cycle: Frontier：2023-09-27 关服，官方称「不具财务可行性」；上线后外挂激增、反作弊补强时玩家已流失；峰值 4 万→数月后约 1 万；创作者矩阵覆盖小 — [Medium: Shut Down of The Cycle: Frontier](https://medium.com/@SimplyEdwardGG/shut-down-of-the-cycle-frontier-83bad9a75e7b)；[Kotaku](https://kotaku.com/cycle-frontier-multiplayer-free-shooter-cheaters-1850591750)；[Insider Gaming](https://insider-gaming.com/the-cycle-frontier-closing-down/)
- Marauders：2022-10 抢先体验开局亮眼，2024-08 更新停止；2026 初 Steam 仅约 60 人、平均同时在线约 35 人，「基本不可能匹配到游戏」；社媒只发「乏味重复的内容」；两年沉默后 2026 年宣布复活计划 — [PC Gamer](https://www.pcgamer.com/games/fps/after-2-years-of-silence-an-extraction-shooter-we-liked-back-in-2022-for-its-impeccable-vibes-suddenly-springs-back-to-life-on-steam/)；[Insider Gaming](https://insider-gaming.com/dead-tarkov-competitor-two-year-silence-broken/)
- Level Zero: Extraction：日均约 100 人，玩家「大部分时间在大厅等开局」；开发者明确不做单人剧情模式；社区认为「第一次测试时已接近成功公式，却全部扔掉去抄别的搜打撤」 — [Steam 讨论：queue and player base](https://steamcommunity.com/app/1456940/discussions/0/4840897430886070908/)；[Steam 讨论](https://steamcommunity.com/app/1456940/discussions/0/4298194451993859721)
- Hawked（MY.GAMES，2024 发售）：PC 服 2026-06-09、主机 2026-09-07 关闭；官方理由「战略重整、资源转投其他项目」；媒体指出面对 ARC Raiders 与 Marathon 的竞争 — [Worthplaying](https://worthplaying.com/article/2026/3/14/news/149313-hawked-servers-shutting-down-in-june-pc-and-september-console/)；[PlayStationTrophies](https://www.playstationtrophies.org/news/hawked-live-service-shooter-shutting-down-september/)
- Marathon（2026-03-05 发售，原定 2025-09-23，因 2025-04 封闭 alpha 口碑差无限期延期）：Metacritic PC/PS5 81、XSX 83，OpenCritic 74% 推荐；但「上市两个月未达销售预期」，Sony 对 Bungie 收购计提 7.65 亿美元减值（部分归因于此），随后裁员 — [Wikipedia: Marathon (2026)](https://en.wikipedia.org/wiki/Marathon_(2026_video_game))
- Marathon 设计层面的批评：每次只能带一个合同、Cryo Archive 仅周末开放、单人选项差、双人无常驻模式、节奏慢、设计选择令人困惑 — [Seasoned Gaming](https://seasonedgaming.com/2026/04/02/marathon-review/)；[Tom's Guide](https://www.tomsguide.com/gaming/marathon-review)
- Hunt: Showdown 的「失调」：赏金猎人的身份 vs 以击杀为核心的评级；经济过松、通用挑战无风险；三阶段（准备/对局/局后）的系统都未强化成就与成长动机 — [Game Developer](https://www.gamedeveloper.com/design/engaging-players-in-hunt-showdown)
- 品类层面：「还没有一个如同 COD/CS/PUBG/战地 在各自细分领域里的头部」，厂商蜂拥；强调「打」会破坏搜索的意义，强调探索又抬高新手门槛；「搜打撤并非纯粹的 PVE，它的主要乐趣还在'与人斗'上」；「'搜打撤'就成了一块不再那么好用的招牌，以至于如今已经开始招致玩家反感了」 — [游民星空](https://www.gamersky.com/news/202506/1938266.shtml)
- 单机的专属风险：Zero Sievert 开发者称「玩家进度完成后如何保持有趣是个挑战」 — [NME](https://www.nme.com/features/gaming-features/zero-sievert-developer-cabo-studio-talks-about-the-tarkov-esque-2d-extraction-shooter-3321572)
- 反面参照（成功）：ARC Raiders 被形容为「不像一份全职工作的搜打撤」，把「臭名昭著的难以进入」的品类带进主流 — [PC Gamer](https://www.pcgamer.com/games/third-person-shooter/finally-arc-raiders-is-the-extraction-shooter-for-people-with-jobs-and-its-all-the-better-for-it/)

### Inferences
- 多人搜打撤的第一死因是**匹配池**，这是单机的最大结构性优势——也正是鸭科夫/Zero Sievert 选单机的理由（技术能力、外挂、通胀三免）。
- 单机的对应死因清单：（a）进度墙太薄——几十小时后仓库满、任务完、无新图；（b）AI 可被"学穿"——路线固定后风险归零，撤离失去意义；（c）没有终局目标——缺少 Kappa 式收藏/最终撤离；（d）地图状态单一——同图重复进入无变化。鸭科夫用 3 环境状态 × 顺序解锁 + MOD 生态，Zero Sievert 靠持续加机制。
- Marathon 的教训对单机也适用：**不要用人为限制制造稀缺**（周末限定地图、每局一个合同）——单机玩家会直接感到"被卡"，而不是"被挑战"。
- Hunt 的"身份与机制失调"提醒：如果游戏叫"撤离"，评分/奖励必须以**成功撤离**为核心指标，而非击杀数。

### Gaps
- 未找到 Level Zero 官方的 PvE 转向声明或复盘；只有社区讨论。
- 未找到 Hawked 的具体在线人数数据。

## 七、AI 生成内容在战利品驱动游戏中的应用与陷阱

### Takeaway
公开案例显示：**ML 驱动的动作/行为**（ARC 的强化学习动画）被玩家接受甚至称赞，而**生成式配音**在关键时刻被明确拒绝并被 Embark 换回真人；文本/物品生成的核心风险是「程序化燕麦粥」——数量唯一但感知雷同。Emily Short 的解法：生成必须**与机制强耦合**、建立在人工作者的词汇与规则之上、用于表达小而持久的世界状态变化。

### Cited Findings
- 「程序化燕麦粥」（Kate Compton）：「很容易生成许多独一无二的东西，但很难让这些差异对观众**产生意义**」；一万碗每粒燕麦位置都不同的粥，玩家看到的只是燕麦粥；Spore、No Man's Sky 常被举为程序内容不够有趣的例子 — [Tim Challies: No Man's Sky and 10,000 bowls of oatmeal](https://www.challies.com/articles/no-mans-sky-and-10000-bowls-of-plain-oatmeal/)；[Emily Short: Bowls of Oatmeal and Text Generation](https://emshort.blog/2016/09/21/bowls-of-oatmeal-and-text-generation/)
- Emily Short 的四条对策：（1）「生成若不与玩法紧密相关，就纯属装饰」，玩家一旦发现内容不影响结果就不再看；（2）生成最适合表达「玩家如何以小而持久的方式改变了世界状态」，作为状态反馈；（3）生成「不是设计内容的替代品，而是一种设计内容的方式」，应叠加在精心设计的基础之上；（4）需要「很强的抽象能力和描述自身审美目标的能力」，投入不亚于手工创作 — [Emily Short](https://emshort.blog/2016/09/21/bowls-of-oatmeal-and-text-generation/)
- 「最有趣的生成器多是混合体：人类编写词汇与戏剧规则，软件负责重组与测试」；生成式 AI 把 PCG 扩展到贴图、模型、对话、任务，「最大挑战是质量控制、连贯性和避免平淡雷同的输出」 — [Blaseball: The Gods Play Dice](https://medium.com/the-game-bland/the-gods-play-dice-procedural-content-in-blaseball-a9487dec0310)；[arXiv: PCG survey with LLM integration](https://arxiv.org/html/2410.15644v1)
- ARC Raiders 实践：敌人（Leaper、Bombardier、Queen）用自研 ML 动画系统生成动态动作，获好评；顺带/背景台词（主要是 ping 系统）用基于真人演员模型的 TTS，演员按授权收费，关键剧情仍是真人表演；玩家批评 TTS「节奏仓促、缺少情绪重量与重音」，Eurogamer 给 2/5 星专门点名；Embark 于发售后**用真人替换了部分 AI 台词**，CEO Söderlund 承认「专业配音在关键时刻仍明显优于 AI」 — [AI and Games: Arc Raiders and the Ethical Use of Generative AI](https://www.aiandgames.com/p/arc-raiders-and-the-ethical-use-of)；[Kotaku](https://kotaku.com/arc-raiders-replaced-ai-generated-content-human-recorded-dialogue-voices-2000678774)；[GameRant](https://gamerant.com/arc-raiders-ai-voice-controversy-explained/)
- 同一文章的评估框架：AI 是否完全取代专业人才？是否提升产品质量？没有生成式 AI 是否也能做到可接受？「每一分收益，谁在失去？」 — [AI and Games](https://www.aiandgames.com/p/arc-raiders-and-the-ethical-use-of)
- 尽管有争议，ARC Raiders 同时在线超过 Helldivers 2；有前 Square Enix 高管以此论证「玩家不在乎生成式 AI」 — [AI and Games](https://www.aiandgames.com/p/arc-raiders-and-the-ethical-use-of)；[Notebookcheck](https://www.notebookcheck.net/Ex-Square-Enix-executive-says-gamers-don-t-care-about-generative-AI-citing-Arc-Raiders-success.1165912.0.html)
- 供应商博客宣称的案例（可信度低，未见原始出处）：某实现用 LLM「6 周生成 1 万件带图标与描述的物品，手工需 6 个月」；某独立工作室称 AI 程序系统让玩家「200+ 局无重复」、留存 4 倍 — [Whimsy Games](https://whimsygames.co/blog/mastering-ai-powered-procedural-content-generation-for-games/)
- 学术方向：LLM 用于回合制游戏的程序化叙事（PANGeA）与用 VGDL 生成游戏 — [arXiv 2404.19721](https://arxiv.org/pdf/2404.19721)；[arXiv 2404.08706](https://arxiv.org/html/2404.08706v1)
- Koster 关于战利品：纯随机掉落让玩家疏离，「奖励应与挑战相关联」；WYSIWYG（所见即所得）掉落适合外观有机制意义、有物品损耗经济、NPC 属于持久世界状态的游戏 — [Raph Koster: WYSIWYG loot](https://www.raphkoster.com/2006/10/27/wysiwyg-loot/)

### Inferences
- 对搜打撤而言，"物品"是经济与记忆的载体，最怕燕麦粥。可行分工：**人工作者定义物品的机制槽位与价值层级**（这是经济，必须手写），LLM 只负责在槽位内生成风味文本/来历/名字变体，并且生成物要**回写世界状态**（例如描述里提到的地点/派系真的存在于地图上），否则玩家两局后就跳过所有描述。
- 更有价值的用法是"小而持久的状态反馈"：仓库里每件"局内拾取"物品自动记录它在哪张图、什么天气、从谁身上/哪个容器来的（found-in-raid 的叙事版），文字由模板 + LLM 润色——这把 Emily Short 的第二条对策直接嫁接到 gear fear 上。
- ARC 的经验划出一条线：**玩家对"行为/动作"层的 ML 宽容，对"表演"层的生成敏感**。丧尸/AI 的动作、群体行为、掉落表可以大胆用生成与自动化；角色台词、关键剧情、Boss 登场要么真人要么手写。
- "内容体量 vs 内容意义"：搜打撤玩家真正记住的是**能改变下一局决策**的内容（一把钥匙、一个配方、一张新图的状态）。生成 1 万件物品不如生成 100 件每件都有"去哪找、拿来干什么"的物品。
- 扩散模型生成物品图标是当前最低风险的用法（无表演、无版权面孔），但需人工做统一后处理以避免视觉燕麦粥；未找到搜打撤品类的公开案例。

### Gaps
- 未找到任何搜打撤/战利品射击游戏**官方公开**使用 LLM 生成物品描述、任务文本或武器变体的案例；Whimsy Games 的"1 万件/6 周"无法追溯到具体游戏。
- 未找到关于"AI 生成内容陷阱"的中文开发者讨论（机核/游研社/知乎）与搜打撤直接相关的文章。
- 未能抓取 Blaseball 程序内容文章全文，仅引用其搜索摘要。
