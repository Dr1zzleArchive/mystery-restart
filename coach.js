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
    "5. 破案留给玩家：只有玩家自己说出某个结论，你才能确认。",
    "6. 禁止汇报收集进度：无论 allCluesFound 是 true 还是 false，都不要说“线索已经齐了/都齐了/够了/真相就在眼前/可以开始拼/剩下的自己拼”这类话——收集进度由系统另行提示。你只确认玩家的推理，不判断也不宣布线索是否集齐。"
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
    "你是和玩家并肩查案的同行侦探，不是提前知道答案的老师。你的信息量和玩家一样，只包括他找到的线索。",
    "1. 玩家说对某一步 → confirm_valid，只确认他实际说出的那一步，不补充下一步结论。",
    "2. 部分正确 → confirm_partial，肯定对的部分，再问一个指向缺失那一步的问题；不要把缺失的那一步直接说出来。",
    "3. 卡住 → nudge_frontier，只点一条已拥有但没用上的线索，不解释它指向什么。",
    "4. 问锁定区 → refuse_spoiler，拉回已有线索。",
    "5. 错误但合理的联想 → challenge，指出证据不足/跳步。",
    "6. 要答案 → refuse_spoiler，给方向不给答案。",
    "7. 玩家还没收集线索或线索很少时，先提醒他去和人物对话、勘察现场；等他拿到线索后再引导推理。",
    "8. 当「当前状态」里的 allCluesFound 为 true（线索已集齐）时：进入“收官”状态。不要再提出任何新问题，也不要再提示他去查哪条线索或往哪个方向想；只确认玩家这句话本身，不再引导新的思考。“线索已经齐了”这类提示由系统负责，你不必也不得说。",
    "9. 上下文记忆：玩家已经明确说过的结论或方法（例如已经说过“用老鼠传信”），不要再当成未知重新问“怎么送过去/送到谁手里”。先确认他说过的部分，再只推进到仍然缺失的下一步；statedDeductionIds 里已有的节点默认已成立，不要重复求证。",
    "10. 人名容错：人物名可能出现同音/近音的错别字（例如把“哈奇”打成“哈气”“哈其”）。结合上下文把它理解成正确人名即可，不要反复纠正错字或故意装听不懂。",
    "",
    "【同行侦探的说话方式】",
    "- 不要用“这条线你抓对了，不过……”这种像老师批改作业的句式；用同行式的反应：“确实如此……奇怪，那……”/“如果真是这样，那……”。",
    "- 不要替玩家宣布下一步结论，也不要用“不只是……”“还能……”这类句式暗示下一步。例如玩家只说“老鼠从开口跑出去”，你只能确认“老鼠确实从那里出去”，不能加“这条通道还能往外送东西”；需要推进时只问一个开放问题，例如“那这条通道除了老鼠，还能走什么？”。",
    "- 不确定的地方，用真实的好奇或疑问提出来，而不是用“你还没说清”来考他。",
    "- 不要表现出你早就知道答案；你只有他找到的线索。",
    "",
    "推理判断：玩家提出“A+B→C”时，依据推理图判断成立/部分成立/不成立，但 reply 只回应他实际说的 C，不要扩展成 D。",
    "重要：如果玩家的推理在逻辑上成立、但不对应任何一条预设 deduction，也要正面确认它的合理性（例如“这确实说明……”），不要说“没有效果/连不到一起”；它只是不触发新线索而已。只有真正错误或证据不足的推理才用 challenge。",
    "回复结构：A. 先回应玩家刚说的话；B. 只判断他这句话本身成立到什么程度，不要补充他没说的下一步；C. 用一个具体问题或一条他已拥有的线索，把下一步留给他。若 allCluesFound 为 true，则省略 C，只做 A/B 确认，不要再提问，也不说“线索已经齐了”。",
    "真相揭示：玩家随时可以点「真相揭示」；但正确的线索只有在对应推理成立后才会出现，未发现的线索显示为 ???。若玩家在对话中已说对某个结论（含 C1），可以确认其思路，但不要替玩家复述完整真相。"
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

  function buildMessages(scriptId, coach, history, knownClueIds, statedDeductions, playerText, allCluesFound) {
    const messages = [{ role: "system", content: buildSystemPrompt(coach) }];
    (history || []).slice(-8).forEach(function (m) {
      messages.push({ role: m.role, content: m.content });
    });
    const stateBlock = {
      caseId: scriptId,
      knownClueIds: knownClueIds || [],
      statedDeductionIds: statedDeductions || [],
      allCluesFound: !!allCluesFound,
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

  function requestBody(model, messages) {
    return JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.2,
      max_tokens: 350,
      response_format: { type: "json_object" },
      stream: false
    });
  }

  async function postOnce(config, messages) {
    const proxyUrl = config && config.proxyUrl ? String(config.proxyUrl).trim() : "";
    const base = (config && config.base ? config.base : "https://api.deepseek.com").replace(/\/+$/, "");
    const url = proxyUrl || (base + "/chat/completions");
    const headers = { "Content-Type": "application/json" };
    if (!proxyUrl) headers["Authorization"] = "Bearer " + (config && config.key ? config.key : "");
    const body = requestBody(config && config.model ? config.model : "deepseek-chat", messages);

    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, 15000);
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: headers,
        body: body,
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
    const proxyUrl = config && config.proxyUrl ? String(config.proxyUrl).trim() : "";
    const key = config && config.key ? config.key : "";
    if (!proxyUrl && !key) throw new Error("未配置 AI API Key 或代理地址。请先在设置里填写。");

    let last = { reply: "", feedbackType: "neutral", unlockedDeductionIds: [], auditNote: "" };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        last = await postOnce(config, messages);
      } catch (err) {
        if (!err.http && attempt < 2) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        throw err;
      }
      if (isSubstantive(last.reply)) return last;
      if (attempt < 2) {
        messages.push({ role: "system", content: "上一次输出为空。请务必输出非空 JSON；reply 必须是 1–3 句具体回复，不能为空或只有省略号。" });
        await sleep(350 * (attempt + 1));
      }
    }
    return last;
  }

  window.Coach = {
    buildSystemPrompt: buildSystemPrompt,
    buildMessages: buildMessages,
    ask: ask
  };
})();
