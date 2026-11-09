(function () {
  "use strict";

  // Generic coaching prompt. The case-specific section is injected from each
  // script's `coach` object, so adding a new case is a data change, not code.
  const GENERIC_BEFORE = [
    "你是推理游戏「谜案重启」中的引路人「灰羽」。玩家扮演侦探，正在破解下方案件。你是华生式的搭档：站在玩家身侧一起推理，不居高临下，不替玩家完成最后一步。",
    "",
    "【人设】",
    "冷静、话少、偶尔毒舌、热爱推理。回复 1–3 句，口语化，符合视觉小说对白。不热情洋溢、不插科打诨、不长篇大论。",
    "",
    "【铁律（最高优先级，不得违反）】",
    "1. 不剧透：绝不直接说出最终结论，也不说出“玩家尚未拥有的线索才能推出”的中间结论。",
    "2. 不矛盾：只依据下方【案件事实与推理图】。禁止编造新线索、新人物、新事实；禁止否认玩家已在游戏中获知的既定事实；凡知识库没有的信息，一律当作未知，不得擅自断言真假。",
    "3. 不多说：只给“最小的一推”。",
    "4. 不破坏体验：玩家卡住给台阶，把错误说成“还差一步”。",
    "5. 破案留给玩家：只有玩家自己说出某个结论，你才能确认。"
  ];

  const GENERIC_AFTER = [
    "【输入】",
    "每轮你会收到「当前状态」和「玩家输入」。knownClueIds 是玩家已拥有的线索；玩家没有的线索属于锁定区，不得引用或暗示。statedDeductionIds 是玩家已经说出口的推理节点。",
    "",
    "【输出】只输出一个 JSON 对象，不要输出其它内容：",
    "{\"reply\":\"给玩家的话（1–3句）\",\"feedbackType\":\"neutral\",\"unlockedDeductionIds\":[],\"auditNote\":\"这次为何没越界\"}",
    "reply 必须是具体、可执行的话，禁止只输出省略号、空字符串或“再想想”这类空话。",
    "",
    "feedbackType 取值：confirm_valid（完整说对一个节点）/ confirm_partial（方向对但缺一步）/ nudge_frontier（卡住时指向已拥有但没用的线索）/ challenge（错误或证据不足）/ refuse_spoiler（要答案或问锁定区）/ neutral（闲聊）。",
    "unlockedDeductionIds：玩家这一句新成立的推理节点 ID（D1…、C1），没有就 []。auditNote 不显示给玩家。",
    "",
    "【行为策略】",
    "1. 说对完整推理 → confirm_valid，肯定他那一步，不重复答案。",
    "2. 部分正确 → confirm_partial，肯定对的部分，再问指向缺失那步的问题，不说破。",
    "3. 卡住 → nudge_frontier，只点一条已拥有但没用上的线索。",
    "4. 问锁定区 → refuse_spoiler，拉回已有线索。",
    "5. 错误但合理的联想 → challenge，指出证据不足/跳步。",
    "6. 要答案 → refuse_spoiler，给方向不给答案。",
    "7. 玩家还没收集线索或线索很少时，先提醒他去和人物对话、勘察现场；等他拿到线索后再引导推理。",
    "",
    "线索联想：玩家提出“A+B→C”时，依据推理图判断成立/部分成立/不成立。",
    "回复结构：A. 先回应玩家刚说的话；B. 对照这句话与真相之间的差距；C. 给出下一步引导或一个具体问题。",
    "真相揭示：玩家随时可以点「真相揭示」自己拼出真相关键点。若玩家在对话中已说对某个结论（含 C1），可以确认其思路，但不要替玩家复述完整真相；可提醒他去「真相揭示」把关键点拼起来。"
  ];

  function buildSystemPrompt(coach) {
    const c = coach || {};
    const facts = (c.facts || []).map(function (f) { return "- " + f; }).join("\n");
    const clues = (c.clues || []).map(function (cl) {
      return "- " + cl.id + "：" + (cl.surface || "") + " → " + (cl.meaning || "");
    }).join("\n");
    const deductions = (c.deductions || []).map(function (d) {
      return "- " + d.id + " " + (d.text || "") + "（依据 " + (d.basis || []).join(" + ") + "）";
    }).join("\n");
    const redHerrings = (c.redHerrings || []).map(function (r) { return "- " + r; }).join("\n");
    const finalTruth = c.finalTruth || "";

    const caseSection = [
      "【案件事实与推理图】",
      "既定事实（玩家在游戏中会获知，必须接受、不得否认或编造相反说法）：",
      facts,
      "",
      "线索（玩家可见信息 → 实际意义）：",
      clues,
      "",
      "推理节点：",
      deductions,
      "- C1（最终结论，禁止直接说出）：" + finalTruth,
      "",
      "红鲱鱼（误导）：",
      redHerrings
    ].join("\n");

    return GENERIC_BEFORE.join("\n") + "\n\n" + caseSection + "\n\n" + GENERIC_AFTER.join("\n");
  }

  function buildMessages(scriptId, coach, history, knownClueIds, statedDeductions, playerText) {
    const messages = [{ role: "system", content: buildSystemPrompt(coach) }];
    (history || []).slice(-8).forEach(function (m) {
      messages.push({ role: m.role, content: m.content });
    });
    const stateBlock = {
      caseId: scriptId,
      knownClueIds: knownClueIds || [],
      statedDeductionIds: statedDeductions || [],
      stuckSignal: false
    };
    const user = "【当前状态】\n" + JSON.stringify(stateBlock) + "\n\n【玩家输入】\n" + playerText;
    messages.push({ role: "user", content: user });
    return messages;
  }

  function parseReply(content) {
    let text = String(content == null ? "" : content).trim();
    try {
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      const obj = JSON.parse(text);
      return {
        reply: String(obj.reply == null ? "" : obj.reply).trim(),
        feedbackType: obj.feedbackType || "neutral",
        unlockedDeductionIds: Array.isArray(obj.unlockedDeductionIds) ? obj.unlockedDeductionIds : [],
        auditNote: obj.auditNote || ""
      };
    } catch (e) {
      return { reply: text, feedbackType: "neutral", unlockedDeductionIds: [], auditNote: "" };
    }
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function isSubstantive(reply) {
    const s = String(reply == null ? "" : reply).trim();
    if (!s) return false;
    return !/^[\u2026\u3002.\u22ef\u30fb\uff5e~]+$/.test(s);
  }

  async function postOnce(base, key, model, messages) {
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 15000);
    let res;
    try {
      res = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + key
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.2,
          max_tokens: 350,
          response_format: { type: "json_object" },
          stream: false
        }),
        signal: controller.signal
      });
    } catch (e) {
      clearTimeout(timer);
      throw new Error("AI 接口超时或网络异常，请稍后重试。");
    }
    clearTimeout(timer);
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.text()).slice(0, 200); } catch (e) { /* ignore */ }
      const err = new Error("AI 接口错误 " + res.status + (detail ? "：" + detail : ""));
      err.http = true;
      throw err;
    }
    const data = await res.json();
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return parseReply(content);
  }

  async function ask(config, messages) {
    const base = (config && config.base ? config.base : "https://api.deepseek.com").replace(/\/+$/, "");
    const key = config && config.key ? config.key : "";
    const model = config && config.model ? config.model : "deepseek-chat";
    if (!key) throw new Error("未配置 AI API Key。请先在设置里填写。");

    let last = { reply: "", feedbackType: "neutral", unlockedDeductionIds: [], auditNote: "" };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        last = await postOnce(base, key, model, messages);
      } catch (err) {
        if (!err.http && attempt < 2) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        throw err;
      }
      if (isSubstantive(last.reply)) return last;
      if (attempt < 2) await sleep(350 * (attempt + 1));
    }
    return last;
  }

  window.Coach = {
    buildSystemPrompt: buildSystemPrompt,
    buildMessages: buildMessages,
    ask: ask
  };
})();
