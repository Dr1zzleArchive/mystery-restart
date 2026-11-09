window.MASCOT = {
  portraits: {
    idle: "assets/mascot/cutout/portrait_idle.png",
    thinking: "assets/mascot/cutout/portrait_thinking.png",
    investigate: "assets/mascot/cutout/portrait_investigate.png",
    unimpressed: "assets/mascot/cutout/portrait_unimpressed.png"
  },
  fullbodies: {
    idle: "assets/mascot/cutout/fullbody_idle.png",
    thinking: "assets/mascot/cutout/fullbody_thinking.png",
    investigate: "assets/mascot/cutout/fullbody_investigate.png",
    unimpressed: "assets/mascot/cutout/fullbody_unimpressed.png"
  },
  expressions: {
    neutral: "assets/mascot/cutout/portrait_idle.png",
    talk: "assets/mascot/cutout/portrait_idle.png",
    hint: "assets/mascot/cutout/portrait_thinking.png",
    unimpressed: "assets/mascot/cutout/portrait_unimpressed.png"
  },
  reactions: {
    welcome: {
      expr: "talk",
      fullbody: "idle",
      lines: [
        "你好，我是灰羽。接下来，由我带你把文学作品变成一场推理游戏。",
        "这里不需要先背完原著。观察人物、寻找线索，然后亲自判断真相。",
        "选一个案件开始吧。每本书都会被改造成一段可以参与的故事。"
      ]
    },
    menu: {
      expr: "neutral",
      lines: [
        "先挑一个案子。文学名著也不是只能背作者和年份。",
        "卡片都摆好了，点一个开始。别一直盯着我看。",
        "从入门案开始比较稳，除非你对自己的推理很有信心。"
      ]
    },
    mascot: {
      expr: "unimpressed",
      lines: [
        "你点我干什么？线索又不会从我袖子里掉出来。",
        "我负责提醒，不负责替你破案。这个分工很合理。",
        "如果你是在确认我有没有反应，答案是：有。现在去查案。",
        "我是引路人，不是解压按钮。",
        "再点下去，我就把你记进嫌疑人名单。"
      ]
    },
    mascot_annoyed: {
      expr: "unimpressed",
      lines: [
        "……你是在测试我的耐心吗？这也算一种调查方法吧。",
        "连续点击三次。证据确凿，你很闲。",
        "我数着呢。再点我就要开始写你的侧写了。"
      ]
    },
    mascot_spam: {
      expr: "hint",
      lines: [
        "嗯……反复做同一件事、期待不同结果。我在想该给你什么诊断。",
        "好吧，我认输。你的执着如果用在搜证上，案子早破了。",
        "推理小说里，这种行为通常发生在凶手身上。我只是陈述一下。"
      ]
    },
    intro: {
      expr: "talk",
      lines: [
        "先看人物关系。动机、时间线、不在场证明，都是会咬人的地方。",
        "剧本杀里最贵的不是服装，是信息差。把嫌疑人的话记住。",
        "别急着下判断。先把每个人为什么可能说谎想清楚。"
      ]
    },
    investigate: {
      expr: "hint",
      lines: [
        "调查阶段别偷懒。少一条线索，结论就可能歪出去。",
        "先搜证，再审人。或者反过来也行，只要你真的看证据。",
        "每个行动都可能带出新线索，点完再去背包核对。"
      ]
    },
    talk: {
      expr: "talk",
      lines: [
        "口供先记下，真假等会儿用证据验。",
        "他说得越顺，越要看他漏掉了什么。",
        "人的话会修饰自己，物证通常懒得配合。"
      ]
    },
    search: {
      expr: "hint",
      lines: [
        "现场细节很烦，但真相通常就藏在烦人的地方。",
        "有发现就先收下。看起来普通的东西，复盘时可能会翻身。",
        "搜证不是捡垃圾，是建立证据链。虽然过程很像。"
      ]
    },
    clue_found: {
      expr: "talk",
      lines: [
        "新线索入袋。别只收藏，记得思考它指向谁。",
        "这条有用。至少比盯着封面发呆有用。",
        "嗯，证据链开始有形状了。"
      ]
    },
    deduce: {
      expr: "hint",
      lines: [
        "开始推理。凶手、动机、关键证据要能互相扣上。",
        "别只凭感觉选。感觉在推理游戏里通常负责制造错误。",
        "把线索串起来，别让它们各过各的。"
      ]
    },
    answer: {
      expr: "unimpressed",
      lines: [
        "想清楚再点，答案不是抽签。",
        "这个选择有点意思。希望不是你随手点的。",
        "如果你能说出理由，那就算你认真推理过。"
      ]
    },
    ending_perfect: {
      expr: "talk",
      lines: [
        "全对。可以，你和这案子确实有点缘分。",
        "漂亮的证据链。文学课要是这么讲，睡着的人会少一些。",
        "真相被你完整拼出来了，勉强承认你是侦探。"
      ]
    },
    ending_close: {
      expr: "hint",
      lines: [
        "差一点。方向对了，但有一段证据链没扣紧。",
        "接近真相了。复盘的时候重点看你错的那一问。",
        "不是失败，是差一脚把门踹开。"
      ]
    },
    ending_fail: {
      expr: "unimpressed",
      lines: [
        "跑偏了。回去看线索背包，别和直觉私奔。",
        "这个结论有勇气，但证据不太同意。",
        "真相只有一个，你刚才选了另一个。"
      ]
    }
  }
};
