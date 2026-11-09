// Free-form detective notebook: a drawer on the right edge. Notes are grouped by case,
// auto-saved to localStorage, and can be starred, edited, deleted (with undo) and exported.
(function () {
  "use strict";

  const NOTES_KEY = "murder_restart_notes_v1";
  const OPEN_KEY = "murder_restart_notes_open_v1";
  const MAX_LENGTH = 600;
  const QUOTE_MARK = "▍";  // prefixes quoted dialogue lines

  function $(id) { return document.getElementById(id); }
  const tab = $("nbToggle");
  const drawer = $("notebook");
  if (!tab || !drawer) return;
  const countEl = $("nbCount");
  const caseEl = $("nbCase");
  const input = $("nbInput");
  const list = $("nbList");
  const filterEl = $("nbFilter");
  const toast = $("nbToast");
  const quoteBtn = $("nbQuote");

  let notes = [];
  let filter = "case";      // "case" = current case only, "all" = everything
  let editingId = null;
  let undo = null;          // { note, index, timer }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // The game writes the current case id onto <body>; "" means the case menu.
  function caseId() {
    return document.body.dataset.caseId || "";
  }

  function caseTitle(id) {
    if (!id) return "通用";
    const s = (window.SCRIPTS || []).find(function (x) { return x.id === id; });
    return s ? s.title : id;
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(NOTES_KEY));
      if (Array.isArray(saved)) {
        notes = saved.filter(function (n) { return n && typeof n.id === "string" && typeof n.text === "string"; });
      }
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
  }

  function save() {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
    } catch (e) {
      showToast("保存失败：浏览器存储不可用");
    }
  }

  function formatTime(ms) {
    const d = new Date(ms);
    const pad = function (n) { return String(n).padStart(2, "0"); };
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function visibleNotes() {
    const id = caseId();
    // Starred first, then newest first (array order breaks ties between notes made in the same ms).
    return notes
      .map(function (n, index) { return { n: n, index: index }; })
      .filter(function (x) { return filter === "all" || x.n.caseId === id; })
      .sort(function (a, b) {
        return (b.n.star ? 1 : 0) - (a.n.star ? 1 : 0) || b.n.created - a.n.created || b.index - a.index;
      })
      .map(function (x) { return x.n; });
  }

  function render() {
    const id = caseId();
    const here = notes.filter(function (n) { return n.caseId === id; }).length;
    countEl.textContent = here ? String(here) : "";
    countEl.hidden = !here;
    caseEl.textContent = id ? "当前案件：" + caseTitle(id) : "当前在选关页 · 笔记记为“通用”";
    filterEl.querySelectorAll("[data-nb-filter]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.nbFilter === filter));
    });
    quoteBtn.disabled = !(window.Dialogue && window.Dialogue.currentLine());

    const shown = visibleNotes();
    if (!shown.length) {
      list.innerHTML = '<li class="nb-empty">' + (filter === "all"
        ? "还没有任何笔记。"
        : "这一案还没有笔记。<br>看到可疑的细节就记下来：时间、地点、谁说了什么、哪里对不上。") + "</li>";
      return;
    }
    list.innerHTML = shown.map(function (n) {
      const meta = (filter === "all" ? escapeHtml(caseTitle(n.caseId)) + " · " : "") +
        formatTime(n.updated || n.created) + (n.updated && n.updated !== n.created ? " 编辑" : "");
      if (n.id === editingId) {
        return '<li class="nb-note editing" data-id="' + n.id + '">' +
          '<textarea class="nb-edit" maxlength="' + MAX_LENGTH + '" aria-label="编辑笔记">' + escapeHtml(n.text) + "</textarea>" +
          '<div class="nb-row"><span class="nb-meta">Ctrl+Enter 保存 · Esc 取消</span>' +
          '<span><button type="button" class="nb-btn" data-nb="cancel">取消</button>' +
          '<button type="button" class="nb-btn primary" data-nb="save">保存</button></span></div></li>';
      }
      return '<li class="nb-note' + (n.star ? " starred" : "") + '" data-id="' + n.id + '">' +
        '<p class="nb-text">' + escapeHtml(n.text) + "</p>" +
        '<div class="nb-row"><span class="nb-meta">' + meta + "</span>" +
        "<span>" +
          '<button type="button" class="nb-icon' + (n.star ? " on" : "") + '" data-nb="star" title="' + (n.star ? "取消标记" : "标记为重要") + '" aria-label="' + (n.star ? "取消标记" : "标记为重要") + '" aria-pressed="' + !!n.star + '">★</button>' +
          '<button type="button" class="nb-icon" data-nb="edit" title="编辑" aria-label="编辑">✎</button>' +
          '<button type="button" class="nb-icon danger" data-nb="delete" title="删除" aria-label="删除">✕</button>' +
        "</span></div></li>";
    }).join("");
  }

  function addNote(text) {
    const value = String(text || "").trim().slice(0, MAX_LENGTH);
    if (!value) return false;
    const now = Date.now();
    notes.push({ id: "n" + now.toString(36) + Math.random().toString(36).slice(2, 6), caseId: caseId(), text: value, star: false, created: now, updated: now });
    save();
    if (window.Achievements) {
      window.Achievements.unlock("first_note");
      window.Achievements.progress("ten_notes", notes.length);
      if (value.indexOf(QUOTE_MARK) >= 0) window.Achievements.unlock("quote_note");
    }
    render();
    return true;
  }

  function showToast(message, withUndo) {
    toast.innerHTML = escapeHtml(message) + (withUndo ? ' <button type="button" class="nb-btn" data-nb="undo">撤销</button>' : "");
    toast.hidden = false;
  }

  function hideToast() {
    toast.hidden = true;
    toast.innerHTML = "";
  }

  function open(value) {
    drawer.hidden = !value;
    tab.setAttribute("aria-expanded", String(value));
    document.body.classList.toggle("notebook-open", value);
    try { localStorage.setItem(OPEN_KEY, value ? "1" : "0"); } catch (e) { /* optional */ }
    if (value) {
      render();
      input.focus({ preventScroll: true });
    }
  }

  function exportText() {
    if (!notes.length) {
      showToast("还没有笔记可以导出");
      return;
    }
    const groups = {};
    notes.slice().sort(function (a, b) { return a.created - b.created; }).forEach(function (n) {
      (groups[n.caseId] = groups[n.caseId] || []).push(n);
    });
    const text = "谜案重启 · 侦探笔记\n导出时间：" + new Date().toLocaleString() + "\n\n" +
      Object.keys(groups).map(function (id) {
        return "【" + caseTitle(id) + "】\n" + groups[id].map(function (n) {
          return (n.star ? "★ " : "- ") + n.text.replace(/\n/g, "\n  ") + "  (" + formatTime(n.created) + ")";
        }).join("\n");
      }).join("\n\n") + "\n";
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    link.download = "侦探笔记.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);
    showToast("已导出为“侦探笔记.txt”");
  }

  function finishEdit(saveIt) {
    const li = list.querySelector(".nb-note.editing");
    if (saveIt && li) {
      const note = notes.find(function (n) { return n.id === editingId; });
      const value = li.querySelector(".nb-edit").value.trim().slice(0, MAX_LENGTH);
      if (note && value) {
        note.text = value;
        note.updated = Date.now();
        save();
      }
    }
    editingId = null;
    render();
  }

  tab.addEventListener("click", function () { open(drawer.hidden); });

  drawer.addEventListener("click", function (e) {
    const button = e.target.closest("button");
    if (!button) return;
    const li = button.closest(".nb-note");
    const note = li && notes.find(function (n) { return n.id === li.dataset.id; });
    const action = button.dataset.nb;
    if (button.dataset.nbFilter) {
      filter = button.dataset.nbFilter;
      editingId = null;
      render();
    } else if (action === "close") {
      open(false);
      tab.focus();
    } else if (action === "add") {
      if (addNote(input.value)) {
        input.value = "";
        hideToast();
      }
      input.focus();
    } else if (action === "quote") {
      const line = window.Dialogue && window.Dialogue.currentLine();
      if (!line) return;
      const quote = QUOTE_MARK + (line.name ? line.name + "：" : "") + "“" + line.text + "”";
      input.value = (input.value.trim() ? input.value.trim() + "\n" : "") + quote;
      input.focus();
    } else if (action === "star" && note) {
      note.star = !note.star;
      save();
      render();
    } else if (action === "edit" && note) {
      editingId = note.id;
      render();
      const area = list.querySelector(".nb-edit");
      area.focus();
      area.setSelectionRange(area.value.length, area.value.length);
    } else if (action === "save") {
      finishEdit(true);
    } else if (action === "cancel") {
      finishEdit(false);
    } else if (action === "delete" && note) {
      const index = notes.indexOf(note);
      notes.splice(index, 1);
      save();
      if (undo) window.clearTimeout(undo.timer);
      undo = { note: note, index: index, timer: window.setTimeout(function () { undo = null; hideToast(); }, 6000) };
      render();
      showToast("已删除一条笔记", true);
    } else if (action === "undo" && undo) {
      window.clearTimeout(undo.timer);
      notes.splice(Math.min(undo.index, notes.length), 0, undo.note);
      undo = null;
      save();
      hideToast();
      render();
    } else if (action === "export") {
      exportText();
    } else if (action === "clear") {
      const id = caseId();
      const count = notes.filter(function (n) { return n.caseId === id; }).length;
      if (!count) return;
      if (!confirm("确定删除“" + caseTitle(id) + "”的全部 " + count + " 条笔记吗？此操作无法撤销。")) return;
      notes = notes.filter(function (n) { return n.caseId !== id; });
      save();
      render();
      showToast("已清空本案笔记");
    }
  });

  drawer.addEventListener("keydown", function (e) {
    const ctrlEnter = e.key === "Enter" && (e.ctrlKey || e.metaKey);
    if (e.target === input && ctrlEnter) {
      e.preventDefault();
      drawer.querySelector('[data-nb="add"]').click();
    } else if (e.target.classList.contains("nb-edit")) {
      if (ctrlEnter) {
        e.preventDefault();
        finishEdit(true);
      } else if (e.key === "Escape") {
        e.stopPropagation();
        finishEdit(false);
      }
    } else if (e.key === "Escape") {
      e.stopPropagation();
      open(false);
      tab.focus();
    }
  });

  // "记入笔记" buttons elsewhere on the page (e.g. the clue backpack).
  document.addEventListener("click", function (e) {
    const source = e.target.closest("[data-nb-note]");
    if (!source) return;
    if (addNote(source.dataset.nbNote)) {
      if (drawer.hidden) open(true);
      showToast("已记入笔记");
      source.classList.add("noted");
    }
  });

  function reset() {
    notes = [];
    try {
      localStorage.removeItem(NOTES_KEY);
    } catch (e) {}
    if (!drawer.hidden) {
      open(false);
    }
    render();
  }

  window.Notebook = { reset: reset };

  // The game fires this after every screen change; dialogue lines change the quote button state.
  document.addEventListener("game:render", function () {
    editingId = null;
    if (!drawer.hidden) render();
    else countEl.textContent = String(notes.filter(function (n) { return n.caseId === caseId(); }).length || "");
    countEl.hidden = !countEl.textContent;
  });
  document.addEventListener("dialogue:line", function () {
    quoteBtn.disabled = !(window.Dialogue && window.Dialogue.currentLine());
  });

  input.maxLength = MAX_LENGTH;
  load();
  let wasOpen = false;
  try { wasOpen = localStorage.getItem(OPEN_KEY) === "1"; } catch (e) { /* optional */ }
  render();
  if (wasOpen && window.innerWidth > 1200) open(true);
})();
