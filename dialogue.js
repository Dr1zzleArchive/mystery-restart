// Visual-novel style dialogue: typewriter text, punctuation pauses, per-speaker "blip" voices,
// click / Space / Enter to advance, skip, auto-advance and a backlog.
(function () {
  "use strict";

  const SPEEDS = { slow: 60, normal: 34, fast: 16, instant: 0 };
  const PAUSES = { "，": 110, "、": 90, "；": 140, "：": 120, ",": 90, "。": 260, "！": 260, "？": 260, ".": 180, "!": 220, "?": 220, "…": 150, "—": 70 };
  // Blip pitch per voice. Unknown / null voices (narration, UI text) use "narr".
  const VOICES = { guide: 900, high: 760, mid: 520, low: 330, narr: 620 };
  const SILENT = /[\s，。、；：！？…—,.;:!?“”‘’「」（）()《》"']/;
  // Text blip styles. gain = peak loudness at 100% volume (waveforms differ in perceived loudness).
  const SOUNDS = {
    beep: { label: "电子哔哔（逆转裁判风）", wave: "square", gain: 0.05, length: 0.045, pitch: 1 },
    soft: { label: "柔和圆音", wave: "sine", gain: 0.16, length: 0.07, pitch: 1 },
    pop: { label: "气泡", wave: "sine", gain: 0.16, length: 0.06, pitch: 1.3, drop: 0.45 },
    bell: { label: "木琴", wave: "triangle", gain: 0.14, length: 0.16, pitch: 1.6 },
    type: { label: "打字机", noise: true, gain: 0.32, length: 0.03 }
  };

  const config = { speed: "normal", sound: true, soundStyle: "beep", volume: 0.6 };
  const backlog = [];
  let current = null;
  let audioCtx = null;
  let noiseBuffer = null;
  let activeBlip = null;
  let lastShown = null;  // { name, text, box } of the line on screen, for quoting into the notebook

  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) config.speed = "instant";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stopActiveBlip() {
    if (!activeBlip) return;
    const b = activeBlip;
    activeBlip = null;
    try { b.source.stop(); } catch (e) { /* already stopped */ }
    try { b.source.disconnect(); } catch (e) { /* already disconnected */ }
    try { b.gain.disconnect(); } catch (e) { /* already disconnected */ }
  }

  // force: play even when sound is switched off (used by the settings preview button).
  function blip(voice, force) {
    const pitch = VOICES[voice] || VOICES.narr;
    const style = SOUNDS[config.soundStyle] || SOUNDS.beep;
    if ((!config.sound && !force) || config.volume <= 0) return;
    try {
      // Only one text blip may sound at a time: cut the previous one first.
      stopActiveBlip();
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const now = audioCtx.currentTime;
      const peak = Math.max(0.0002, style.gain * config.volume);
      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + style.length);
      gain.connect(audioCtx.destination);
      let source;
      if (style.noise) {
        // Short band-passed noise burst = typewriter key click; voice pitch tints the filter.
        if (!noiseBuffer) {
          noiseBuffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * 0.05), audioCtx.sampleRate);
          const data = noiseBuffer.getChannelData(0);
          for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }
        source = audioCtx.createBufferSource();
        source.buffer = noiseBuffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1800 + pitch * 2 * (0.9 + Math.random() * 0.2);
        filter.Q.value = 1.2;
        source.connect(filter).connect(gain);
      } else {
        source = audioCtx.createOscillator();
        source.type = style.wave;
        const freq = pitch * style.pitch * (0.94 + Math.random() * 0.12);
        source.frequency.setValueAtTime(freq, now);
        if (style.drop) source.frequency.exponentialRampToValueAtTime(freq * style.drop, now + style.length);
        source.connect(gain);
      }
      source.start(now);
      source.stop(now + style.length + 0.01);
      activeBlip = { source: source, gain: gain };
      source.onended = function () {
        if (activeBlip && activeBlip.source === source) activeBlip = null;
      };
    } catch (e) {
      // Audio is optional.
    }
  }

  // Settings preview: a few blips in the guide's voice.
  function preview() {
    [0, 90, 180, 300].forEach(function (delay) {
      window.setTimeout(function () { blip("guide", true); }, delay);
    });
  }

  // Type `text` into `el`. Returns a function that finishes the text immediately.
  function typeInto(el, text, options) {
    const opts = options || {};
    const chars = Array.from(text);
    const base = opts.speed != null ? opts.speed : SPEEDS[config.speed];
    window.clearTimeout(el._typeTimer);
    let index = 0;
    let voiced = 0;
    function finish() {
      window.clearTimeout(el._typeTimer);
      el.textContent = text;
      index = chars.length;
      if (opts.onDone) {
        const done = opts.onDone;
        opts.onDone = null;
        done();
      }
    }
    function tick() {
      if (index >= chars.length) return finish();
      const ch = chars[index++];
      el.textContent += ch;
      if (!SILENT.test(ch) && voiced++ % 2 === 0) blip(opts.voice);
      el._typeTimer = window.setTimeout(tick, base + (PAUSES[ch] || 0) * (base ? base / SPEEDS.normal : 0));
    }
    el.textContent = "";
    if (!base) finish();
    else tick();
    return finish;
  }

  function stop() {
    if (!current) return;
    current.stopped = true;
    window.clearTimeout(current.autoTimer);
    if (current.textEl) window.clearTimeout(current.textEl._typeTimer);
    document.removeEventListener("keydown", current.onKey);
    current = null;
  }

  function renderLog() {
    return backlog.slice(-80).map(function (entry) {
      return '<li><strong>' + escapeHtml(entry.name || "旁白") + "</strong>" + escapeHtml(entry.text) + "</li>";
    }).join("") || "<li>还没有对话。</li>";
  }

  // host: element to render into. lines: [{ s, t, pose? }].
  // options: { speakers, portrait(line) -> src|null, onLine(line), onDone() }
  function play(host, lines, options) {
    stop();
    const opts = options || {};
    const speakers = opts.speakers || {};
    const ctl = { index: -1, typing: false, auto: false, stopped: false };
    current = ctl;

    host.innerHTML =
      '<div class="vn-box" tabindex="0" role="group" aria-label="对话，点击或按空格继续">' +
        '<div class="vn-avatar" aria-hidden="true"></div>' +
        '<div class="vn-body">' +
          '<div class="vn-name"></div>' +
          '<p class="vn-text" aria-hidden="true"></p>' +
          '<p class="sr-only vn-live" aria-live="polite"></p>' +
        "</div>" +
        '<div class="vn-tools">' +
          '<button type="button" class="vn-tool" data-vn="log">记录</button>' +
          '<button type="button" class="vn-tool" data-vn="auto" aria-pressed="false">自动</button>' +
          '<button type="button" class="vn-tool" data-vn="skip">跳过</button>' +
        "</div>" +
        '<span class="vn-next" aria-hidden="true">▼</span>' +
        '<ol class="vn-log" hidden></ol>' +
      "</div>";

    const box = host.querySelector(".vn-box");
    const avatar = box.querySelector(".vn-avatar");
    const nameEl = box.querySelector(".vn-name");
    const textEl = box.querySelector(".vn-text");
    const liveEl = box.querySelector(".vn-live");
    const logEl = box.querySelector(".vn-log");
    const autoBtn = box.querySelector('[data-vn="auto"]');
    ctl.textEl = textEl;
    let finishLine = null;

    function done(skipped) {
      if (ctl.stopped) return;
      box.classList.add("ended");
      box.classList.remove("waiting");
      stop();
      if (opts.onDone) opts.onDone(!!skipped);
    }

    function scheduleAuto(line) {
      window.clearTimeout(ctl.autoTimer);
      if (!ctl.auto) return;
      ctl.autoTimer = window.setTimeout(next, 900 + Array.from(line.t).length * 45);
    }

    function show(line) {
      const speaker = speakers[line.s] || { name: line.s };
      const portrait = opts.portrait ? opts.portrait(line) : null;
      box.dataset.speaker = line.s;
      box.classList.toggle("narration", !speaker.name);
      nameEl.textContent = speaker.name || "";
      avatar.innerHTML = portrait
        ? '<img src="' + escapeHtml(portrait) + '" alt="" />'
        : (speaker.name ? "<span>" + escapeHtml(Array.from(speaker.name)[0]) + "</span>" : "");
      avatar.hidden = !portrait && !speaker.name;
      box.classList.remove("waiting");
      backlog.push({ name: speaker.name, text: line.t });
      lastShown = { name: speaker.name, text: line.t, box: box };
      if (opts.onLine) opts.onLine(line);
      document.dispatchEvent(new CustomEvent("dialogue:line"));
      ctl.typing = true;
      finishLine = typeInto(textEl, line.t, {
        voice: speaker.voice,
        onDone: function () {
          ctl.typing = false;
          liveEl.textContent = (speaker.name ? speaker.name + "：" : "") + line.t;
          box.classList.add("waiting");
          scheduleAuto(line);
        }
      });
    }

    function next() {
      if (ctl.stopped) return;
      window.clearTimeout(ctl.autoTimer);
      if (ctl.typing) {
        finishLine();
        return;
      }
      ctl.index++;
      if (ctl.index >= lines.length) done();
      else show(lines[ctl.index]);
    }

    box.addEventListener("click", function (e) {
      const tool = e.target.closest("[data-vn]");
      if (!tool) {
        if (!e.target.closest(".vn-log")) next();
        return;
      }
      const kind = tool.dataset.vn;
      if (kind === "skip") {
        // Record the skipped lines so they can still be read in the backlog.
        lines.slice(ctl.index + 1).forEach(function (line) {
          backlog.push({ name: (speakers[line.s] || {}).name, text: line.t });
        });
        if (finishLine) finishLine();
        const last = lines[lines.length - 1];
        if (last && ctl.index < lines.length - 1) {
          ctl.index = lines.length - 1;
          const speaker = speakers[last.s] || {};
          nameEl.textContent = speaker.name || "";
          textEl.textContent = last.t;
          lastShown = { name: speaker.name, text: last.t, box: box };
        }
        done(true);
      } else if (kind === "auto") {
        ctl.auto = !ctl.auto;
        tool.setAttribute("aria-pressed", String(ctl.auto));
        if (ctl.auto && !ctl.typing) next();
      } else if (kind === "log") {
        logEl.hidden = !logEl.hidden;
        if (!logEl.hidden) {
          logEl.innerHTML = renderLog();
          logEl.scrollTop = logEl.scrollHeight;
        }
      }
    });

    ctl.onKey = function (e) {
      if (e.key !== " " && e.key !== "Enter") return;
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.target.closest && e.target.closest("button") && !box.contains(e.target)) return;
      if (e.target.closest && e.target.closest("[data-vn]")) return;
      e.preventDefault();
      next();
    };
    document.addEventListener("keydown", ctl.onKey);
    autoBtn.setAttribute("aria-pressed", "false");
    box.focus({ preventScroll: true });
    next();
    return ctl;
  }

  // Fill the settings dropdown with the available styles.
  const styleSelect = document.getElementById("voiceStyle");
  if (styleSelect) {
    styleSelect.innerHTML = Object.keys(SOUNDS).map(function (key) {
      return '<option value="' + key + '">' + escapeHtml(SOUNDS[key].label) + "</option>";
    }).join("");
  }

  window.Dialogue = {
    play: play,
    stop: stop,
    typeInto: typeInto,
    configure: function (values) {
      Object.keys(values || {}).forEach(function (key) { config[key] = values[key]; });
    },
    isPlaying: function () { return !!current; },
    preview: preview,
    sounds: SOUNDS,
    // The line currently shown in a dialogue box on screen, or null.
    currentLine: function () {
      return lastShown && lastShown.box.isConnected ? { name: lastShown.name, text: lastShown.text } : null;
    }
  };
})();
