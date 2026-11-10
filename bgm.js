(function () {
  "use strict";

  // Fixed track list. To add a track: convert it to mp3 under assets/audio/web/, append it here,
  // then list its id in one or more ALBUMS below.
  const TRACKS = [
    { id: "clair_de_lune", title: "月光 Clair de lune", artist: "德彪西 · Stephanie McCallum 演奏", src: "assets/audio/web/clair_de_lune.mp3" },
    { id: "kagi_wo_sagase", title: "鍵を探せ（寻找钥匙）", artist: "相原隆行 · 《Raging Loop》原声", src: "assets/audio/web/kagi_wo_sagase.mp3" },
    { id: "sakubou_no_utage", title: "策謀の宴（策谋之宴）", artist: "相原隆行 · 《Raging Loop》原声", src: "assets/audio/web/sakubou_no_utage.mp3" },
    { id: "climax_suiri", title: "クライマックス推理（终极推理）", artist: "高田雅史 · 《弹丸论破》原声", src: "assets/audio/web/climax_suiri.mp3" },
    { id: "corpse_party", title: "コープスパーティー（尸体派对）", artist: "濱本麻央 · 《Corpse Party》原声", src: "assets/audio/web/corpse_party.mp3" },
    { id: "alan", title: "Alan", artist: "Alexandre Desplat · 《模仿游戏》原声", src: "assets/audio/web/alan.mp3" },
    { id: "tantei_galileo", title: "探偵ガリレオ（神探伽利略）", artist: "菅野祐悟 · 《神探伽利略》原声", src: "assets/audio/web/tantei_galileo.mp3" },
    { id: "butsuri_13", title: "物理学科第十三研究室", artist: "菅野祐悟 · 《神探伽利略》原声", src: "assets/audio/web/butsuri_13.mp3" },
    { id: "la_fille_aux_cheveux", title: "亚麻色头发的少女", artist: "德彪西", src: "assets/audio/web/la_fille_aux_cheveux.mp3" },
    { id: "gymnopedie_1", title: "Gymnopédie No. 1", artist: "萨蒂", src: "assets/audio/web/gymnopedie_1.mp3" },
    { id: "cathedrale_engloutie", title: "沉没的教堂", artist: "德彪西 · Jean-Bernard Pommier 演奏", src: "assets/audio/web/cathedrale_engloutie.mp3" },
    { id: "arabesque_1", title: "阿拉伯风格曲 第一号", artist: "德彪西 · Ronan O'Hora 演奏", src: "assets/audio/web/arabesque_1.mp3" },
    { id: "reverie", title: "梦幻曲 Rêverie", artist: "德彪西", src: "assets/audio/web/reverie.mp3" },
    { id: "shinkirou", title: "蜃気楼（海市蜃楼）", artist: "酒井良", src: "assets/audio/web/shinkirou.mp3" },
    { id: "kanou_shinya", title: "加納慎也", artist: "佐藤直紀", src: "assets/audio/web/kanou_shinya.mp3" },
    { id: "interlude", title: "Interlude", artist: "岩崎英則", src: "assets/audio/web/interlude.mp3" },
    { id: "seven_mysteries", title: "Seven Mysteries", artist: "岩崎英則", src: "assets/audio/web/seven_mysteries.mp3" },
    { id: "the_storyteller", title: "The Storyteller", artist: "岩崎英則", src: "assets/audio/web/the_storyteller.mp3" },
    { id: "yin_yang", title: "Yin-Yang", artist: "岩崎英則", src: "assets/audio/web/yin_yang.mp3" },
    { id: "somber_sky", title: "Somber Sky", artist: "岩崎英則", src: "assets/audio/web/somber_sky.mp3" },
    { id: "yoakemae", title: "夜明け前（黎明之前）", artist: "YamiNa · 《深夜廻》印象曲", src: "assets/audio/web/yoakemae.mp3" },
    { id: "main_theme", title: "Main Theme", artist: "Yoh Ohyama", src: "assets/audio/web/main_theme.mp3" }
  ];
  // Preset albums. A track may appear in several albums. "all" is filled automatically.
  const ALBUMS = [
    { id: "all", name: "全部曲目", desc: "网页内置的所有曲目" },
    { id: "calm", name: "沉思 · 古典", desc: "安静的钢琴与管弦乐，适合读背景、慢慢思考", trackIds: ["clair_de_lune", "alan", "butsuri_13", "la_fille_aux_cheveux", "gymnopedie_1", "cathedrale_engloutie", "arabesque_1", "reverie", "shinkirou"] },
    { id: "tense", name: "紧张 · 推理", desc: "节奏紧凑的推理游戏原声，适合搜证与对峙", trackIds: ["kagi_wo_sagase", "sakubou_no_utage", "climax_suiri", "tantei_galileo", "kanou_shinya", "interlude", "seven_mysteries", "the_storyteller", "yin_yang", "main_theme"] },
    { id: "eerie", name: "诡谲 · 悬疑", desc: "阴冷不安的悬疑氛围", trackIds: ["corpse_party", "somber_sky", "yoakemae"] }
  ];
  const MODES = [
    { id: "list", label: "列表循环" },
    { id: "one", label: "单曲循环" },
    { id: "shuffle", label: "随机播放" }
  ];
  const ICONS = {
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',
    prev: '<path d="M6 5h2v14H6zM9.5 12 19 5.5v13z"/>',
    next: '<path d="M16 5h2v14h-2zM14.5 12 5 18.5v-13z"/>',
    volume: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    muted: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m16 9.5 5 5m0-5-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    list: '<path d="M4 8h12l-3-3m3 3-3 3M20 16H8l3-3m-3 3 3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    one: '<path d="M4 8h12l-3-3m3 3-3 3M20 16H8l3-3m-3 3 3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><text x="12" y="14.2" font-size="6.5" text-anchor="middle" font-family="sans-serif" font-weight="700">1</text>',
    shuffle: '<path d="M4 7h3.5c4.5 0 4.5 10 9 10H20m0 0-3-3m3 3-3 3M4 17h3.5c1.6 0 2.6-1.2 3.4-2.8M20 7h-3.5c-1.6 0-2.6 1.2-3.4 2.8M20 7l-3-3m3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  const BGM_KEY = "murder_restart_bgm_v1";
  const PLAYLISTS_KEY = "murder_restart_playlists_v1";
  const FADE_MS = 700;
  const MAX_PLAYLISTS = 12;

  function $(id) { return document.getElementById(id); }
  const toggle = $("bgmToggle");
  const panel = $("bgmPanel");
  if (!toggle || !panel) return;
  const enabledInput = $("bgmEnabled");
  const titleEl = $("bgmTitle");
  const artistEl = $("bgmArtist");
  const seek = $("bgmSeek");
  const currentEl = $("bgmCurrent");
  const durationEl = $("bgmDuration");
  const playBtn = $("bgmPlay");
  const prevBtn = $("bgmPrev");
  const nextBtn = $("bgmNext");
  const modeBtn = $("bgmMode");
  const muteBtn = $("bgmMute");
  const volumeInput = $("bgmVolume");
  const volumeLabel = $("bgmVolumeLabel");
  const tabs = $("bgmTabs");
  const form = $("bgmForm");
  const formInput = $("bgmFormInput");
  const formCancel = $("bgmFormCancel");
  const albumName = $("bgmAlbumName");
  const albumDesc = $("bgmAlbumDesc");
  const albumActions = $("bgmAlbumActions");
  const list = $("bgmList");
  const status = $("bgmStatus");

  // enabled = master switch; paused = the user pressed pause (music stays "on" but silent).
  // viewId = album shown in the list; queueId = album the playing track belongs to.
  const prefs = {
    enabled: false, paused: false, trackId: TRACKS[0].id, volume: 0.4, muted: false, mode: "list",
    viewId: "all", queueId: "all"
  };
  let playlists = [];
  const audio = new Audio();
  audio.preload = "metadata";
  let fadeTimer = null;
  let unlocked = false;
  let seeking = false;
  let addingTrackId = null;  // track whose "add to playlist" menu is open
  let formState = null;      // { type: "new", trackId? } or { type: "rename", id }

  function icon(name) {
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">' + ICONS[name] + "</svg>";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setLabel(el, text) {
    el.title = text;
    el.setAttribute("aria-label", text);
  }

  function trackById(id) {
    return TRACKS.find(function (t) { return t.id === id; });
  }

  function currentTrack() {
    return trackById(prefs.trackId) || TRACKS[0];
  }

  function albums() {
    return ALBUMS.concat(playlists.map(function (p) {
      return { id: p.id, name: p.name, trackIds: p.trackIds, custom: true };
    }));
  }

  function albumById(id) {
    return albums().find(function (a) { return a.id === id; });
  }

  function albumTrackIds(album) {
    if (!album) return [];
    if (album.id === "all") return TRACKS.map(function (t) { return t.id; });
    return album.trackIds.filter(trackById);
  }

  function queue() {
    const ids = albumTrackIds(albumById(prefs.queueId));
    return ids.length ? ids : albumTrackIds(albumById("all"));
  }

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const s = Math.floor(seconds);
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function targetVolume() {
    return prefs.muted ? 0 : prefs.volume;
  }

  function loadPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(BGM_KEY)) || {};
      if (typeof saved.enabled === "boolean") prefs.enabled = saved.enabled;
      if (typeof saved.paused === "boolean") prefs.paused = saved.paused;
      if (typeof saved.muted === "boolean") prefs.muted = saved.muted;
      if (trackById(saved.trackId)) prefs.trackId = saved.trackId;
      if (MODES.some(function (m) { return m.id === saved.mode; })) prefs.mode = saved.mode;
      if (typeof saved.volume === "number") prefs.volume = Math.min(1, Math.max(0, saved.volume));
      if (typeof saved.viewId === "string") prefs.viewId = saved.viewId;
      if (typeof saved.queueId === "string") prefs.queueId = saved.queueId;
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
    try {
      const saved = JSON.parse(localStorage.getItem(PLAYLISTS_KEY));
      if (Array.isArray(saved)) {
        playlists = saved.filter(function (p) {
          return p && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.trackIds);
        });
      }
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
    if (!albumById(prefs.viewId)) prefs.viewId = "all";
    if (!albumById(prefs.queueId)) prefs.queueId = "all";
  }

  function savePrefs() {
    try {
      localStorage.setItem(BGM_KEY, JSON.stringify(prefs));
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
  }

  function savePlaylists() {
    try {
      localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
    } catch (e) {
      // Local file mode can disable storage in some browsers.
    }
  }

  function stopFade() {
    window.clearInterval(fadeTimer);
  }

  // Timer-based (not requestAnimationFrame) so fades still finish in a background tab.
  function fadeTo(target, done) {
    stopFade();
    const from = audio.volume;
    const start = Date.now();
    fadeTimer = window.setInterval(function () {
      const t = Math.min(1, (Date.now() - start) / FADE_MS);
      audio.volume = from + (target - from) * t;
      if (t < 1) return;
      stopFade();
      if (done) done();
    }, 30);
  }

  function loadTrack(id) {
    const t = trackById(id) || TRACKS[0];
    prefs.trackId = t.id;
    audio.src = t.src;
    audio.dataset.trackId = t.id;
    audio.loop = prefs.mode === "one";
    savePrefs();
    renderProgress();
  }

  function play() {
    unlocked = true;
    if (audio.dataset.trackId !== prefs.trackId) loadTrack(prefs.trackId);
    audio.volume = 0;
    const attempt = audio.play();
    const fadeIn = function () { fadeTo(targetVolume()); };
    if (attempt && attempt.then) {
      attempt.then(fadeIn).catch(function () {
        // Autoplay was blocked; the next user interaction will retry.
        unlocked = false;
        render();
      });
    } else {
      fadeIn();
    }
  }

  function pause() {
    fadeTo(0, function () { audio.pause(); });
  }

  function switchTo(id) {
    const resume = prefs.enabled && !prefs.paused;
    const go = function () {
      audio.pause();
      loadTrack(id);
      if (resume) play();
      render();
    };
    if (!audio.paused) fadeTo(0, go);
    else go();
  }

  // Previous / next / shuffle stay inside the album that is currently playing.
  function step(direction) {
    const ids = queue();
    const pos = ids.indexOf(prefs.trackId);
    if (prefs.mode === "shuffle" && ids.length > 1) {
      let next = prefs.trackId;
      while (next === prefs.trackId) next = ids[Math.floor(Math.random() * ids.length)];
      switchTo(next);
    } else if (pos < 0) {
      switchTo(ids[direction > 0 ? 0 : ids.length - 1]);
    } else {
      switchTo(ids[(pos + direction + ids.length) % ids.length]);
    }
  }

  function playAlbum(id, trackId) {
    const ids = albumTrackIds(albumById(id));
    if (!ids.length) return;
    prefs.queueId = id;
    prefs.enabled = true;
    prefs.paused = false;
    let first = trackId || ids[0];
    if (!trackId && prefs.mode === "shuffle") first = ids[Math.floor(Math.random() * ids.length)];
    switchTo(first);
  }

  // ---- custom playlists ----

  function createPlaylist(name, trackId) {
    const playlist = { id: "u_" + Date.now().toString(36), name: name, trackIds: trackId ? [trackId] : [] };
    playlists.push(playlist);
    savePlaylists();
    if (window.Achievements) window.Achievements.unlock("playlist");
    return playlist;
  }

  function togglePlaylistTrack(playlistId, trackId) {
    const playlist = playlists.find(function (p) { return p.id === playlistId; });
    if (!playlist) return;
    const index = playlist.trackIds.indexOf(trackId);
    if (index >= 0) playlist.trackIds.splice(index, 1);
    else playlist.trackIds.push(trackId);
    savePlaylists();
  }

  function deletePlaylist(id) {
    playlists = playlists.filter(function (p) { return p.id !== id; });
    savePlaylists();
    if (prefs.viewId === id) prefs.viewId = "all";
    if (prefs.queueId === id) prefs.queueId = "all";
    savePrefs();
  }

  function openForm(state) {
    formState = state;
    form.hidden = false;
    const playlist = state.type === "rename" && playlists.find(function (p) { return p.id === state.id; });
    formInput.value = playlist ? playlist.name : "";
    formInput.placeholder = state.type === "rename" ? "新的歌单名称" : "新歌单名称";
    formInput.focus();
  }

  function closeForm() {
    formState = null;
    form.hidden = true;
  }

  // ---- rendering ----

  function renderLibrary() {
    tabs.innerHTML = albums().map(function (a) {
      const selected = a.id === prefs.viewId;
      return '<button type="button" role="tab" class="bgm-tab' + (a.custom ? " custom" : "") + '" data-view="' + escapeHtml(a.id) + '"' +
        ' aria-selected="' + selected + '">' + escapeHtml(a.name) + "</button>";
    }).join("") +
      (playlists.length < MAX_PLAYLISTS ? '<button type="button" class="bgm-tab add" data-new-playlist>＋ 新建歌单</button>' : "");

    const album = albumById(prefs.viewId);
    const ids = albumTrackIds(album);
    albumName.textContent = album.name;
    albumDesc.textContent = album.custom ? "自建歌单 · " + ids.length + " 首" : album.desc + " · " + ids.length + " 首";
    albumActions.innerHTML =
      (ids.length ? '<button type="button" class="bgm-chip" data-play-album>▶ 播放</button>' : "") +
      (album.custom
        ? '<button type="button" class="bgm-chip" data-rename>改名</button><button type="button" class="bgm-chip danger" data-delete>删除</button>'
        : "");

    if (!ids.length) {
      list.innerHTML = '<li class="bgm-empty">歌单还是空的。切换到其他专辑，点击歌曲右侧的 ＋ 就能加进来。</li>';
      return;
    }

    list.innerHTML = ids.map(function (id, index) {
      const t = trackById(id);
      let side;
      if (album.custom) {
        side = '<button type="button" class="bgm-side" data-remove="' + t.id + '" title="移出歌单" aria-label="从歌单移出 ' + escapeHtml(t.title) + '">×</button>';
      } else {
        side = '<button type="button" class="bgm-side" data-add="' + t.id + '" title="加入歌单" aria-label="把 ' + escapeHtml(t.title) + ' 加入歌单"' +
          ' aria-expanded="' + (addingTrackId === t.id) + '">＋</button>';
      }
      let menu = "";
      if (addingTrackId === t.id) {
        menu = '<div class="bgm-add-menu">' +
          (playlists.length ? playlists.map(function (p) {
            const has = p.trackIds.indexOf(t.id) >= 0;
            return '<button type="button" data-toggle-playlist="' + escapeHtml(p.id) + '" aria-pressed="' + has + '">' +
              '<span aria-hidden="true">' + (has ? "✓" : "") + "</span>" + escapeHtml(p.name) + "</button>";
          }).join("") : '<p>还没有自建歌单。</p>') +
          (playlists.length < MAX_PLAYLISTS ? '<button type="button" class="new" data-new-playlist="' + t.id + '"><span aria-hidden="true">＋</span>新建歌单并加入</button>' : "") +
          "</div>";
      }
      return '<li data-track-id="' + t.id + '">' +
        '<button type="button" class="bgm-track" data-play-track="' + t.id + '">' +
          '<span class="bgm-list-num">' + (index + 1) + "</span>" +
          '<span class="bgm-list-text"><strong>' + escapeHtml(t.title) + "</strong><small>" + escapeHtml(t.artist) + "</small></span>" +
        "</button>" + side + menu + "</li>";
    }).join("");
  }

  function render() {
    const t = currentTrack();
    const playing = !audio.paused;
    const mode = MODES.find(function (m) { return m.id === prefs.mode; });

    toggle.classList.toggle("playing", playing);
    toggle.classList.toggle("muted", !prefs.enabled);
    setLabel(toggle, prefs.enabled ? "背景音乐：开" : "背景音乐：关");
    panel.classList.toggle("disabled", !prefs.enabled);
    enabledInput.checked = prefs.enabled;

    titleEl.textContent = t.title;
    artistEl.textContent = t.artist;
    playBtn.innerHTML = icon(playing ? "pause" : "play");
    setLabel(playBtn, playing ? "暂停" : "播放");
    modeBtn.innerHTML = icon(prefs.mode);
    setLabel(modeBtn, mode.label);
    muteBtn.innerHTML = icon(prefs.muted || prefs.volume === 0 ? "muted" : "volume");
    setLabel(muteBtn, prefs.muted ? "取消静音" : "静音");
    volumeInput.value = Math.round(prefs.volume * 100);
    volumeLabel.textContent = Math.round(prefs.volume * 100) + "%";

    // Only highlight the track when the list shows the album it is playing from.
    const inQueue = prefs.viewId === prefs.queueId || prefs.viewId === "all";
    Array.prototype.forEach.call(list.children, function (item) {
      const active = inQueue && item.dataset.trackId === t.id;
      item.classList.toggle("active", active);
      item.classList.toggle("playing", active && playing);
      const button = item.querySelector(".bgm-track");
      if (button) button.setAttribute("aria-current", active ? "true" : "false");
    });

    const source = albumById(prefs.queueId).name;
    if (!prefs.enabled) status.textContent = "背景音乐已关闭";
    else if (playing) status.textContent = "正在播放「" + source + "」· " + mode.label;
    else if (prefs.paused) status.textContent = "已暂停";
    else status.textContent = "点击页面任意位置后开始播放";
  }

  function renderAll() {
    renderLibrary();
    render();
  }

  function renderProgress() {
    const duration = audio.duration;
    durationEl.textContent = formatTime(duration);
    if (seeking) return;
    currentEl.textContent = formatTime(audio.currentTime);
    const ratio = isFinite(duration) && duration > 0 ? audio.currentTime / duration : 0;
    seek.value = Math.round(ratio * 1000);
    seek.style.setProperty("--progress", (ratio * 100) + "%");
  }

  function setEnabled(value) {
    prefs.enabled = value;
    if (value) {
      prefs.paused = false;
      play();
    } else {
      pause();
    }
    savePrefs();
    render();
  }

  // ---- events ----

  prevBtn.innerHTML = icon("prev");
  nextBtn.innerHTML = icon("next");

  toggle.addEventListener("click", function () {
    panel.hidden = !panel.hidden;
    toggle.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
  });

  enabledInput.addEventListener("change", function () {
    setEnabled(enabledInput.checked);
  });

  playBtn.addEventListener("click", function () {
    if (!audio.paused) {
      prefs.paused = true;
      pause();
    } else {
      // Pressing play while the master switch is off turns music back on.
      prefs.enabled = true;
      prefs.paused = false;
      play();
    }
    savePrefs();
    render();
  });

  prevBtn.addEventListener("click", function () {
    // Like most players: restart the current track unless we are near its start.
    if (audio.currentTime > 3) audio.currentTime = 0;
    else step(-1);
  });

  nextBtn.addEventListener("click", function () { step(1); });

  modeBtn.addEventListener("click", function () {
    const index = MODES.findIndex(function (m) { return m.id === prefs.mode; });
    prefs.mode = MODES[(index + 1) % MODES.length].id;
    audio.loop = prefs.mode === "one";
    savePrefs();
    render();
  });

  muteBtn.addEventListener("click", function () {
    prefs.muted = !prefs.muted;
    stopFade();
    if (!audio.paused) audio.volume = targetVolume();
    savePrefs();
    render();
  });

  volumeInput.addEventListener("input", function () {
    prefs.volume = Number(volumeInput.value) / 100;
    prefs.muted = false;
    stopFade();
    if (!audio.paused) audio.volume = targetVolume();
    savePrefs();
    render();
  });

  seek.addEventListener("input", function () {
    seeking = true;
    const ratio = Number(seek.value) / 1000;
    seek.style.setProperty("--progress", (ratio * 100) + "%");
    currentEl.textContent = formatTime(ratio * (audio.duration || 0));
  });

  seek.addEventListener("change", function () {
    seeking = false;
    if (isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 1000 * audio.duration;
    renderProgress();
  });

  tabs.addEventListener("click", function (e) {
    const tab = e.target.closest("[data-view]");
    if (tab) {
      prefs.viewId = tab.dataset.view;
      addingTrackId = null;
      closeForm();
      savePrefs();
      renderAll();
      return;
    }
    if (e.target.closest("[data-new-playlist]")) openForm({ type: "new" });
  });

  albumActions.addEventListener("click", function (e) {
    const album = albumById(prefs.viewId);
    if (e.target.closest("[data-play-album]")) {
      playAlbum(album.id);
    } else if (e.target.closest("[data-rename]")) {
      openForm({ type: "rename", id: album.id });
    } else if (e.target.closest("[data-delete]")) {
      if (!confirm("确定删除歌单「" + album.name + "」吗？歌曲本身不会被删除。")) return;
      deletePlaylist(album.id);
      renderAll();
    }
  });

  list.addEventListener("click", function (e) {
    const target = e.target.closest("button");
    if (!target) return;
    const d = target.dataset;
    if (d.playTrack) {
      addingTrackId = null;
      playAlbum(prefs.viewId, d.playTrack);
      renderLibrary();
      render();
    } else if (d.add) {
      addingTrackId = addingTrackId === d.add ? null : d.add;
      renderAll();
    } else if (d.togglePlaylist) {
      togglePlaylistTrack(d.togglePlaylist, addingTrackId);
      renderAll();
    } else if ("newPlaylist" in d) {
      openForm({ type: "new", trackId: d.newPlaylist });
    } else if (d.remove) {
      togglePlaylistTrack(prefs.viewId, d.remove);
      renderAll();
    }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = formInput.value.trim().slice(0, 20);
    if (!name || !formState) {
      formInput.focus();
      return;
    }
    if (formState.type === "rename") {
      const playlist = playlists.find(function (p) { return p.id === formState.id; });
      if (playlist) playlist.name = name;
      savePlaylists();
    } else {
      const playlist = createPlaylist(name, formState.trackId);
      // Adding from a track's menu keeps the user where they were; otherwise open the new list.
      if (!formState.trackId) prefs.viewId = playlist.id;
      savePrefs();
    }
    closeForm();
    renderAll();
  });

  formCancel.addEventListener("click", closeForm);

  formInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      closeForm();
    }
  });

  audio.addEventListener("play", render);
  audio.addEventListener("pause", render);
  audio.addEventListener("timeupdate", renderProgress);
  audio.addEventListener("loadedmetadata", renderProgress);
  audio.addEventListener("ended", function () {
    if (prefs.mode !== "one") step(1);
  });
  audio.addEventListener("error", function () {
    status.textContent = "音乐文件加载失败：" + currentTrack().src;
  });

  // Browsers only allow audio after a user gesture, so start on the first interaction.
  document.addEventListener("pointerdown", function (e) {
    const inside = e.target.closest(".bgm-control");
    if (!panel.hidden && !inside) {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }
    if (unlocked || inside || !prefs.enabled || prefs.paused) return;
    play();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.focus();
    }
  });

  loadPrefs();
  loadTrack(prefs.trackId);
  renderAll();
})();
