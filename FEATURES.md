# 功能总结

> 给接手这个项目的任何 AI / Agent 看的"现状速览"。只写"有什么、在哪、怎么连起来的"，不写设计理由和历史——那些在 `CHANGELOG.md`（做过什么、何时做的）和 `tools/ai-pipeline/PROMPTS_AND_GUIDELINES.md`（怎么做、按什么方针做）里。
>
> **开始改动前必读顺序**：本文件 → `README.md`（文件清单）→ `CHANGELOG.md` 最上面几条（最近做了什么）→ 要改的那个模块的源码。

## 项目是什么

零依赖纯前端网页游戏「谜案重启」，双击 `index.html` 即可运行，无需构建、无需服务器、无需 npm。所有逻辑是原生 JS（无框架），样式是一份 `styles.css`。

流程：选本子 → 开场对白 → 调查（搜证/问话）→ 推理作答（选择题或填空题）→ 真相揭晓逐字对白。

## 文件地图（谁管什么）

| 文件 | 职责 | 对外暴露 |
|---|---|---|
| `index.html` | 全部 DOM 结构；`<script>` 加载顺序见下 | — |
| `styles.css` | 全站样式（一个文件，~2350 行，按功能分区，搜区块注释即可定位） | — |
| `data.js` | 剧本数据：`window.SCRIPTS` 数组，每个元素是一个案子（见下方"剧本数据格式"） | `window.SCRIPTS` |
| `app.js` | 游戏状态机：渲染各阶段、处理点击、存档读档、设置面板、引路人气泡调度 | 无导出，直接挂 `document` 事件 |
| `dialogue.js` | 视觉小说对白引擎：逐字打字机、标点停顿、按说话人音高放"哔哔"音效、自动/跳过/记录 | `window.Dialogue` |
| `judge.js` | 困难模式填空题的模糊判定（别名、容错、"很接近"反馈） | `window.Judge` |
| `achievements.js` | 成就系统：Steam 风格弹窗、音效、面板、全成就奖励图 | `window.Achievements` |
| `notebook.js` | 右侧侧边栏"侦探笔记"：自由记录、按案子分组、引用台词、导出 | 无导出，自含 DOM 操作 |
| `bgm.js` | 背景音乐播放器：专辑、自建歌单、播放控制 | 无导出 |
| `mascot.js` | 引路人"灰羽"的立绘路径表和各场景台词库 | `window.MASCOT` |
| `scripts/prepare_mascot_assets.py` | 离线脚本：从原始立绘图切出带透明通道的差分图，不在网页运行时用到 | — |

`index.html` 里的加载顺序（有依赖关系，不能随意打乱）：
```
data.js → judge.js → dialogue.js → mascot.js → achievements.js → app.js → notebook.js → bgm.js
```
`app.js` 依赖前面几个的全局对象；`notebook.js`/`achievements.js` 互相通过 `document.dispatchEvent` 自定义事件通信（`game:render`、`dialogue:line`、`achievement:unlock`），不是直接函数调用。

## 核心玩法功能

- **剧本数据驱动**：新增一个案子 = 在 `data.js` 的 `window.SCRIPTS` 里加一个对象，不用改代码。字段格式见 `tools/ai-pipeline/README.md` 的"本子数据格式"表。
- **两种难度**：简单=选择题（`choice` 字段），困难=填空题（`fill` 字段，走 `judge.js` 模糊判定，含错字容错、别名、"很接近"反馈、每题 3 次机会、可要提示）。两种难度共用同一套 `questions`。
- **视觉小说式对白**：所有台词（开场/调查/推理前/真相揭晓/灰羽气泡/欢迎页）逐字弹出，标点处停顿，带音效。可调速度（慢/标准/快/立即）、音效样式（5 种）、音量，或整体关闭。
- **引路人灰羽**：4 种姿态立绘（`idle`/`thinking`/`investigate`/`unimpressed`），点击她会按连续点击次数升级吐槽，带踢一下的小动画。
- **侦探笔记本**：和游戏主流程完全独立、不冲突；可以在任意阶段打开写笔记，自动按案子分组、可标星/编辑/删除（可撤销）、可一键引用当前台词、可从线索背包一键记入线索、可导出为 txt。
- **成就系统**：14 个成就（3 个隐藏），Steam 风格右下角弹窗 + 两音阶提示音，全部成就且全部已上线关卡完成后显示终章奖励插画。
- **背景音乐**：内置 22 首曲目，分 3 个预设专辑（沉思/紧张/诡谲）+ 用户可自建歌单；播放器支持播放模式切换、音量、专辑内上一首下一首。
- **设置面板**：界面大小、字体、对白速度、对白音效（开关/样式/音量）、成就提示音开关、4 套配色主题（墨夜/纸页/雾蓝/旧案卷）。另有灰羽插画背景图库：5 张图按 1 / 3 / 6 / 10 / 全部成就并结合通关进度解锁，支持预览、切换和恢复默认；选择存在现有设置存档中。
- **导航**：左上角常驻"← 主菜单"按钮（在选关页自动隐藏），任意阶段一键回到选关页；调查/推理阶段底部也有"返回选关"按钮。从有进行中调查的阶段返回会弹确认，避免手滑清掉进度。

## 已上线的案子

| id（data.js 里的） | 标题 | 难度/定位 | 状态 |
|---|---|---|---|
| `hound_01` | 巴斯克维尔的猎犬 | 入门·第一案 | 已上线，4 嫌疑人/9 线索/9 行动/5 题 |
| `letter_01` | 失窃的信 | 入门·第二案 | 已上线，2 角色/8 线索/8 行动/3 题 |
| `sxy_01` | 珊瑚扇坠 | 入门·第三案 | 已上线，4 人物/8 线索/7 行动/5 题（三侠五义） |

案子对应的策划文档在 `archive/Case_Database/`（见下方"文学关卡素材库"），一个策划文档可能对应一个已上线案子，也可能还没写成 `data.js` 里的本子。**两边状态可能不同步**——改动任一边后记得检查另一边，并更新 `archive/Case_Index/master_case_index.md` 的"开发状态"列。

## 文学关卡素材库（`archive/`）

这是一套独立于网页代码的内容流水线产物，用来把公有领域推理小说改编成新案子。不随游戏发布（含版权文本，见各作品下的 `copyright_notes.md`）。

```
archive/
├── Literature_Library/<作品名>/   source.md（原文/译文片段，仅供分析用）· story_analysis.md（作品分析）· copyright_notes.md
├── Case_Database/Short|Medium|Long/   <编号>_<关卡名>.md（关卡策划，A–H 节固定格式）
├── Case_Index/master_case_index.md   全局索引：每个关卡编号、状态、对应 data.js 的 id
└── Templates/   两份策划模板
```

编号规则：`MA-S-xxx`（短篇 5–10 分钟）/ `MA-M-xxx`（中篇 15–20 分钟）/ `MA-L-xxx`（长篇 25–35 分钟）。**编号一经分配不再改变**，哪怕最终不采用也保留编号并标注"暂不采用"。

**已分析的作品**：失窃的信、无惨、白衣女人（均"全文分析"或"定向阅读"，见各自 `story_analysis.md`）。三侠五义已提取原文，其中第五回「珊瑚扇坠案」已改编为 `sxy_01`（其余未分析）。莫格街凶杀案（爱伦·坡短篇集）已提取原文但未分析。月亮宝石是缩写本，按计划跳过。

**已写出的关卡策划**：MA-S-001（失窃的信，已做成 `letter_01`）、MA-S-002（白衣女人·法衣室的空白）、MA-M-001（无惨）、MA-M-002（白衣女人·墓碑上的名字）、MA-L-001（白衣女人完整版，建议排最后做）。后三个**还没有对应的 `data.js` 本子**。

## AI 改编流水线（`tools/ai-pipeline/`）

把一本小说变成一个可玩案子的标准步骤，提示词都是现成的，直接复制使用：

```
00-literature-analysis.md  ⓪ 分析整本书，判断能拆几个关卡、各多长（产出 archive/ 下的报告）
01-extract.md              ① 从原著提取人物/线索/时间线（只摘事实，不改编）
02-design.md               ② 设计案件：选情节、定嫌疑人、设计证据链和误导线索
03-script.md                ③ 写逐句台词，输出完整本子 JSON（questions 先留空）
04-questions.md             ④ 生成推理题（选择题 + 填空题 + 别名表）
05-review.md                ⑤ 换角度复查逻辑漏洞、公平性
validate.html                程序化检查工具：双击打开，粘贴本子 JSON，查格式/证据链/文本量，可试判填空答案
```

详细字段说明、判定规则、使用方法见 `tools/ai-pipeline/README.md`。**制作方针和改编原则**（哪些能改、哪些不能改、怎么保证推理公平）见新文件 `tools/ai-pipeline/PROMPTS_AND_GUIDELINES.md`。

## localStorage 键名一览

| 键 | 存的是什么 | 哪个文件写 |
|---|---|---|
| `murder_restart_save_v3` | 当前游戏进度（存档版本号，改了存档结构要连带升级版本号避免读到旧格式出错） | `app.js` |
| `murder_restart_settings_v1` | 界面大小/字体/主题/插画背景/对白速度/音效/成就提示音 等设置 | `app.js` |
| `murder_restart_welcome_seen_v1` | 是否看过开场欢迎页 | `app.js` |
| `murder_restart_notes_v1` | 侦探笔记内容 | `notebook.js` |
| `murder_restart_notes_open_v1` | 笔记侧栏是否展开 | `notebook.js` |
| `murder_restart_achievements_v1` | 成就解锁状态与进度 | `achievements.js` |
| `murder_restart_bgm_v1` | 当前播放曲目/音量/模式 | `bgm.js` |
| `murder_restart_playlists_v1` | 用户自建歌单 | `bgm.js` |

所有读取都做了 try/catch（纯文件模式下部分浏览器会禁用 localStorage），看不懂为什么"读不到"先检查这一层。

## 资源文件

- `assets/mascot/cutout/`：引路人灰羽的透明底立绘，4 姿态 × (全身 fullbody + 半身 portrait)。`assets/mascot/_archive/` 是旧版/废弃版本，不要从这里引用。
- `assets/audio/web/`：22 首背景音乐（mp3，合计约 78MB，发布前需留意体积），文件名见 `bgm.js` 顶部的曲目表。
- `assets/backgrounds/`：5 张灰羽插画背景的 PNG 原图与 WebP 网页优化版；解锁配置在 `app.js` 的 `ILLUSTRATIONS`。
- `assets/reward/huiyu_reward.png`：成就面板的终章奖励插画，与 `assets/backgrounds/midnight_ball.png` 为同一张图；要求全成就且全关卡。

## 未完成 / 已知待办

- `assets/reward/huiyu_reward.png` 缺失（见上）。
- MA-S-002 / MA-M-001 / MA-M-002 / MA-L-001 四份关卡策划还没做成 `data.js` 里的本子。
- 莫格街凶杀案的原文已提取但还没写分析报告和关卡策划；三侠五义除已上线的「珊瑚扇坠」外，其余回目也未分析（下一步工作）。
- 月亮宝石按计划跳过（缩写本，不采用）。
- `ROADMAP.md` 里记录着更大的功能路线图（难度分层、新手引导、更多素材来源等），和这份"现状速览"互补，改动方向性决策前建议也看一眼。

## 自检清单（改动之后，提交前过一遍）

1. 新增/改了 `data.js` 里的本子？→ 用 `tools/ai-pipeline/validate.html` 粘贴检查一遍，再双击 `index.html` 实际玩一遍简单模式和困难模式。
2. 改了存档结构（`app.js` 里 `save()`/`load()` 涉及的字段）？→ 升级 `STORAGE_KEY` 的版本号后缀（如 `_v3` → `_v4`），避免读到旧存档崩溃。
3. 新增了全局状态或设置？→ 补一行到本文件"localStorage 键名一览"表。
4. 做了任何修改？→ 按 `CHANGELOG.md` 的格式在最上面加一条（日期 · 一句话标题，然后列出改了什么、涉及文件）。这是硬性要求，见仓库里的既有记录格式。
5. 新增/调整了关卡策划或作品分析？→ 同步更新 `archive/Case_Index/master_case_index.md` 的状态列。
