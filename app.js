/* Moyo app — state, views, rituals, moods, chat, breathe, stats, pro */
(function () {
  const C = window.MOYO_CONFIG;
  const $ = id => document.getElementById(id);
  const today = () => new Date().toISOString().slice(0, 10);
  const dstr = d => d.toISOString().slice(0, 10);

  const PRESETS = [
    { icon: "icon-water.png", title: "Drink a glass of water", sub: "Hydrate first" },
    { icon: "icon-book.png",  title: "Read 10 pages",           sub: "Feed your mind" },
    { icon: "icon-moon.png",  title: "Lights out by 11",        sub: "Guard your sleep" },
    { icon: "icon-leaf.png",  title: "Walk outside",            sub: "10 minutes of air" },
    { icon: "icon-heart.png", title: "One kind act",            sub: "For you or someone else" },
    { icon: "icon-bolt.png",  title: "Move your body",          sub: "Stretch or a workout" },
  ];
  const STAGE_NAMES = ["Sproutling", "Sprout", "Bloomer", "Golden Moyo"];
  const MOODS = [
    { v: 1, label: "Rough",   color: "#b9c4d6" },
    { v: 2, label: "Low",     color: "#a9bfe0" },
    { v: 3, label: "Okay",    color: "#ffd98a" },
    { v: 4, label: "Good",    color: "#a9e4c2" },
    { v: 5, label: "Radiant", color: "#ffcdd8" },
  ];

  /* ---------------- state ---------------- */
  const DEF = () => ({
    name: "", focus: "calm", onboarded: false,
    rituals: [], moods: {}, checkins: 0,
    chat: [], chatDay: "", chatN: 0,
    memory: { facts: [] },
    streak: { count: 0, last: "", best: 0 },
    pro: { active: false, plan: null, expires: 0, txids: [], since: 0 },
  });
  let S = DEF();
  try {
    const raw = localStorage.getItem("moyo_v1");
    if (raw) S = Object.assign(DEF(), JSON.parse(raw));
  } catch (e) { S = DEF(); }
  function save() { try { localStorage.setItem("moyo_v1", JSON.stringify(S)); } catch (e) {} }

  function isPro() {
    if (!S.pro.active) return false;
    if (S.pro.expires === 0) return true; // lifetime
    if (S.pro.expires > Date.now()) return true;
    S.pro.active = false; save(); return false;
  }
  function maxRituals() { return isPro() ? 99 : C.FREE_MAX_RITUALS; }

  /* ---------------- nav ---------------- */
  window.go = function (v) {
    document.querySelectorAll(".view").forEach(x => x.classList.remove("on"));
    $("v-" + v).classList.add("on");
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.v === v));
    window.scrollTo({ top: 0 });
    if (v === "stats") renderStats();
    if (v === "pro") renderPro();
    if (v === "chat") setTimeout(() => $("chatlog").scrollTop = 1e6, 50);
  };

  /* ---------------- onboarding ---------------- */
  let obFocus = "calm";
  document.querySelectorAll("#obFocus .focus").forEach(b =>
    b.addEventListener("click", () => {
      document.querySelectorAll("#obFocus .focus").forEach(x => x.classList.remove("sel"));
      b.classList.add("sel"); obFocus = b.dataset.f;
    }));
  const firstFocus = document.querySelector('#obFocus .focus[data-f="calm"]');
  if (firstFocus) firstFocus.classList.add("sel");

  window.finishOnboard = function () {
    const name = ($("obName").value || "").trim().slice(0, 20) || "friend";
    S.name = name; S.focus = obFocus; S.onboarded = true;
    S.rituals = PRESETS.slice(0, 3).map((p, i) => ({ id: "r" + Date.now() + i, icon: p.icon, title: p.title, sub: p.sub, done: [] }));
    save();
    $("onboard").classList.add("hidden");
    boot();
    moyoSay(MOYO.greeting(ctx()));
  };

  /* ---------------- pet ---------------- */
  function petStage() {
    const th = C.PET_STAGES, n = S.checkins;
    let s = 0;
    th.forEach((t, i) => { if (n >= t) s = i; });
    return Math.min(s, 3);
  }
  function petImg() {
    if (isPro()) return "assets/moyo-stage4.png";
    return "assets/moyo-stage" + (petStage() + 1) + ".png";
  }
  function renderPet() {
    $("petImg").src = petImg();
    const dp = MOYO.daypart();
    const hello = dp === "morning" ? "Good morning" : dp === "afternoon" ? "Good afternoon"
      : dp === "evening" ? "Good evening" : "Still up";
    $("petGreet").textContent = hello + ", " + (S.name || "friend");
    $("petStage").textContent = isPro() ? "Golden Moyo · Pro" : STAGE_NAMES[petStage()] +
      (petStage() < 3 ? " · " + (C.PET_STAGES[petStage() + 1] - S.checkins) + " check-ins to grow" : "");
    const dots = $("stageDots").children;
    for (let i = 0; i < dots.length; i++) dots[i].classList.toggle("fill", i <= petStage());
    $("streakN").textContent = S.streak.count;
    $("doneN").textContent = S.checkins;
  }

  /* ---------------- moods ---------------- */
  function moodSVG(v, color) {
    const mouth = v <= 2 ? '<path d="M14 26 q6 -5 12 0" />'
      : v === 3 ? '<path d="M15 26 h10" />'
      : '<path d="M14 23 q6 6 12 0" />';
    const eyes = v === 1 ? '<circle cx="15" cy="16" r="2.2"/><circle cx="25" cy="16" r="2.2"/>'
      : v === 5 ? '<path d="M12 16 q3 -3 6 0 M22 16 q3 -3 6 0" />'
      : '<circle cx="15" cy="16" r="2.6"/><circle cx="25" cy="16" r="2.6"/>';
    return '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="' + color + '"/>' +
      '<g stroke="#4c4238" stroke-width="2.2" stroke-linecap="round" fill="none">' + eyes + mouth + "</g></svg>";
  }
  function renderMoods() {
    const t = today(), cur = S.moods[t];
    $("moodRow").innerHTML = MOODS.map(m =>
      '<button class="mood' + (cur === m.v ? " sel" : "") + '" onclick="setMood(' + m.v + ')">' +
      moodSVG(m.v, m.color) + "<span>" + m.label + "</span></button>").join("");
  }
  window.setMood = function (v) {
    S.moods[today()] = v; save(); renderMoods();
    const label = MOODS.find(m => m.v === v).label.toLowerCase();
    moyoSay(v >= 4
      ? "Noted — feeling " + label + ". I tucked that sunshine away for later."
      : v === 3 ? "Okay is a perfectly fine place to be. I am here if it dips."
      : "Thanks for being honest. Rough patches pass. Want to talk about it, or try a breathing round?");
  };

  /* ---------------- rituals ---------------- */
  function renderRituals() {
    const t = today();
    const list = $("ritualList");
    list.innerHTML = "";
    S.rituals.forEach(r => {
      const done = r.done.includes(t);
      const d = document.createElement("div");
      d.className = "clay-sm ritual" + (done ? " done" : "");
      d.innerHTML = '<img src="assets/' + r.icon + '" alt="">' +
        '<div class="rt"><b></b><span></span></div>' +
        '<div class="box"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#234d38" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6"/></svg></div>';
      d.querySelector("b").textContent = r.title;
      d.querySelector("span").textContent = r.sub || "";
      d.onclick = () => toggleRitual(r.id);
      list.appendChild(d);
    });
    const left = maxRituals() - S.rituals.length;
    $("freeNote").textContent = isPro() ? "Pro: unlimited rituals. Your garden, your rules."
      : left > 0 ? "Free plan: " + left + " ritual slot" + (left > 1 ? "s" : "") + " left. Pro unlocks unlimited."
      : "Free plan is full (3 rituals). Pro unlocks unlimited rituals.";
  }
  window.toggleRitual = function (id) {
    const r = S.rituals.find(x => x.id === id);
    if (!r) return;
    const t = today(), i = r.done.indexOf(t);
    if (i >= 0) { r.done.splice(i, 1); S.checkins = Math.max(0, S.checkins - 1); }
    else {
      r.done.push(t); S.checkins++;
      bumpStreak();
      const left = S.rituals.filter(x => !x.done.includes(t)).length;
      setTimeout(() => moyoSay(left === 0
        ? "All rituals done. Look at you — " + petPraise()
        : "One more down. " + petPraise()), 400);
    }
    save(); renderRituals(); renderPet();
  };
  function petPraise() {
    return ["your Moyo is doing a happy wiggle.", "those leaves are shining.",
      "small steps, big softness.", "Moyo is proud of you."][Math.floor(Math.random() * 4)];
  }
  function bumpStreak() {
    const t = today(), y = dstr(new Date(Date.now() - 864e5));
    if (S.streak.last === t) return;
    S.streak.count = (S.streak.last === y) ? S.streak.count + 1 : 1;
    S.streak.last = t;
    S.streak.best = Math.max(S.streak.best, S.streak.count);
  }

  window.openAddRitual = function () {
    if (S.rituals.length >= maxRituals()) {
      openSheet("<h3>Ritual garden is full</h3><p>Your free plan holds " + C.FREE_MAX_RITUALS +
        " rituals. Moyo Pro gives you unlimited rituals, deeper memory and golden leaves.</p>" +
        '<div class="row"><button class="btn" onclick="closeModal()">Later</button>' +
        '<button class="btn btn-primary" onclick="closeModal();go(\'pro\')">See Pro</button></div>');
      return;
    }
    const cards = PRESETS.map((p, i) =>
      '<button class="focus clay-sm" onclick="addPreset(' + i + ')"><img src="assets/' + p.icon + '" alt="">' + p.title + "</button>").join("");
    openSheet("<h3>Plant a ritual</h3><p>Pick a starter, or write your own below.</p>" +
      '<div class="focus-grid">' + cards + "</div>" +
      '<input id="customR" class="field-txt clay-in" placeholder="Or type your own ritual..." maxlength="40">' +
      '<div class="row"><button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="addCustom()">Plant it</button></div>');
  };
  window.addPreset = function (i) {
    const p = PRESETS[i];
    S.rituals.push({ id: "r" + Date.now(), icon: p.icon, title: p.title, sub: p.sub, done: [] });
    save(); closeModal(); renderRituals();
  };
  window.addCustom = function () {
    const v = ($("customR").value || "").trim().slice(0, 40);
    if (!v) return;
    S.rituals.push({ id: "r" + Date.now(), icon: "icon-leaf.png", title: v, sub: "Your own ritual", done: [] });
    save(); closeModal(); renderRituals();
  };

  /* ---------------- chat ---------------- */
  function ctx() {
    return { name: S.name, focus: S.focus, streak: S.streak.count, memory: S.memory, lastMood: S.moods[today()] };
  }
  function chatLimit() { return isPro() ? 1e9 : 10; }
  function renderChat() {
    const log = $("chatlog");
    log.innerHTML = "";
    S.chat.forEach(m => {
      const d = document.createElement("div");
      d.className = "msg " + m.role;
      d.textContent = m.text;
      log.appendChild(d);
    });
    const left = chatLimit() - chatCountToday();
    $("chatSub").textContent = isPro() ? "Unlimited heart-to-hearts. I remember everything."
      : left > 0 ? left + " messages left today · Pro is unlimited" : "Daily messages used up · Pro is unlimited";
    $("chatMem").innerHTML = "<b>What I remember:</b> " + memSummary();
    log.scrollTop = log.scrollHeight;
  }
  function memSummary() {
    const f = S.memory.facts || [];
    if (!f.length) return "nothing yet — tell me about yourself.";
    return f.slice(-3).map(x => x.k + ": " + x.v).join(" · ");
  }
  function chatCountToday() {
    if (S.chatDay !== today()) { S.chatDay = today(); S.chatN = 0; }
    return S.chatN;
  }
  function moyoSay(text) {
    S.chat.push({ role: "moyo", text, ts: Date.now() });
    if (S.chat.length > 120) S.chat = S.chat.slice(-120);
    save(); renderChat();
  }
  window.sendChat = function () {
    const inp = $("chatIn"), v = (inp.value || "").trim();
    if (!v) return;
    if (chatCountToday() >= chatLimit()) {
      openSheet("<h3>Out of heart-to-hearts</h3><p>Free plan includes 10 companion messages a day. Pro gives unlimited chats with deeper memory.</p>" +
        '<div class="row"><button class="btn" onclick="closeModal()">Later</button>' +
        '<button class="btn btn-primary" onclick="closeModal();go(\'pro\')">See Pro</button></div>');
      return;
    }
    inp.value = "";
    S.chat.push({ role: "user", text: v, ts: Date.now() });
    S.chatN = chatCountToday() + 1; S.chatDay = today();
    save(); renderChat();
    const log = $("chatlog");
    const tp = document.createElement("div");
    tp.className = "msg moyo typing"; tp.innerHTML = "<i></i><i></i><i></i>";
    log.appendChild(tp); log.scrollTop = log.scrollHeight;
    setTimeout(() => {
      tp.remove();
      moyoSay(MOYO.reply(v, ctx()));
    }, 700 + Math.random() * 600);
  };
  $("chatIn").addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });

  /* ---------------- breathe ---------------- */
  const PROGRAMS = {
    calm:  { name: "Calm",   in: 4, hold: 4, out: 6, rounds: 3, free: true },
    focus: { name: "Focus",  in: 4, hold: 4, out: 4, rounds: 4, free: false },
    sleep: { name: "Sleep",  in: 4, hold: 7, out: 8, rounds: 4, free: false },
  };
  let breathTimers = [];
  window.startBreath = function (key) {
    const p = PROGRAMS[key || "calm"];
    if (!p.free && !isPro()) {
      openSheet("<h3>" + p.name + " breathing is Pro</h3><p>Free includes the Calm program. Pro unlocks Focus and Sleep programs with longer rounds.</p>" +
        '<div class="row"><button class="btn" onclick="closeModal()">Later</button>' +
        '<button class="btn btn-primary" onclick="closeModal();go(\'pro\')">See Pro</button></div>');
      return;
    }
    breathTimers.forEach(clearTimeout); breathTimers = [];
    const ball = $("breathBall"), btn = $("breathBtn"), cnt = $("breathCount");
    btn.disabled = true;
    let t = 0;
    const step = (fn, ms) => { breathTimers.push(setTimeout(fn, t)); t += ms; };
    for (let r = 1; r <= p.rounds; r++) {
      step(() => { ball.textContent = "Breathe in"; ball.className = "in"; cnt.textContent = p.name + " · round " + r + "/" + p.rounds; }, 1);
      step(() => { ball.textContent = "Hold"; ball.className = ""; }, p.in * 1000);
      step(() => { ball.textContent = "Breathe out"; ball.className = "out"; }, p.hold * 1000);
      step(() => {}, p.out * 1000);
    }
    step(() => {
      ball.textContent = "Done"; ball.className = "";
      cnt.textContent = p.rounds + " rounds complete";
      btn.disabled = false;
      moyoSay("Beautiful breathing. Your nervous system thanks you.");
      go("chat");
    }, 1);
  };
  // pro program picker injected under the free button
  function renderBreathExtra() {
    if ($("breathExtra")) return;
    const d = document.createElement("div");
    d.id = "breathExtra"; d.className = "clay-sm mt"; d.style.padding = "16px";
    d.innerHTML = "<b>Programs</b><div class='row' style='display:flex;gap:10px;margin-top:10px'>" +
      Object.keys(PROGRAMS).map(k => {
        const p = PROGRAMS[k], lock = (!p.free && !isPro()) ? " · Pro" : "";
        return "<button class='btn' style='flex:1;padding:12px 6px;font-size:13px' onclick=\"startBreath('" + k + "')\">" + p.name + lock + "</button>";
      }).join("") + "</div>";
    $("v-breathe").appendChild(d);
  }

  /* ---------------- stats ---------------- */
  function renderStats() {
    $("sStreak").textContent = S.streak.count;
    $("sTotal").textContent = S.checkins;
    $("sBest").textContent = S.streak.best;
    const vals = Object.values(S.moods).slice(-7);
    $("sMood").textContent = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "–";
    // week bars
    const bars = $("weekBars"); bars.innerHTML = "";
    const days = ["S", "M", "T", "W", "T", "F", "S"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5), ds = dstr(d);
      const done = S.rituals.filter(r => r.done.includes(ds)).length;
      const total = S.rituals.length || 1;
      const h = Math.max(8, Math.round(done / total * 96));
      const b = document.createElement("div");
      b.className = "bar"; b.style.height = h + "px";
      b.innerHTML = "<em>" + (i === 0 ? "today" : days[d.getDay()]) + "</em>";
      b.title = done + " rituals";
      bars.appendChild(b);
    }
    // mood trail
    const trail = $("moodTrail"); trail.innerHTML = "";
    for (let i = 6; i >= 0; i--) {
      const ds = dstr(new Date(Date.now() - i * 864e5));
      const v = S.moods[ds];
      const dot = document.createElement("i");
      dot.style.background = v ? MOODS[v - 1].color : "#e9dfc9";
      dot.title = ds + (v ? ": " + MOODS[v - 1].label : ": no check-in");
      trail.appendChild(dot);
    }
    $("proStatsNote").innerHTML = isPro()
      ? "<b>Moyo insight:</b> " + insight()
      : "<b>Pro unlocks Moyo insights</b> — a weekly read on your patterns, plus 30-day history.";
  }
  function insight() {
    const vals = Object.entries(S.moods).slice(-7);
    if (!vals.length) return "Check in your mood daily and I will spot your patterns.";
    const avg = vals.reduce((a, x) => a + x[1], 0) / vals.length;
    const low = vals.filter(x => x[1] <= 2).length;
    if (avg >= 4) return "Your week glows — average mood " + avg.toFixed(1) + ". Keep watering what works.";
    if (low >= 3) return "A few heavy days lately. Be gentle: shrink rituals to the tiniest version until the clouds pass.";
    return "Steady week, average mood " + avg.toFixed(1) + ". Consistency is quietly compounding.";
  }

  /* ---------------- pro ---------------- */
  function renderPro() {
    const pill = $("proPill");
    pill.textContent = isPro() ? "PRO" : "GO PRO";
    pill.classList.toggle("active", isPro());
    const el = $("proStatus");
    if (isPro()) {
      const p = C.PLANS[S.pro.plan] || {};
      const exp = S.pro.expires === 0 ? "never expires" : "renews " + new Date(S.pro.expires).toLocaleDateString();
      el.innerHTML = '<div class="notice ok clay-sm"><b>Pro is active</b> — ' + (p.name || "") + " plan · " + exp + ".</div>";
    } else el.innerHTML = "";
    if (!window.MOYO_PAY.addrReady())
      el.innerHTML += '<div class="notice err clay-sm"><b>Heads up:</b> crypto checkout is being wired up — plans will be purchasable very soon.</div>';
  }
  window.onProActivated = function () { renderPro(); renderPet(); renderRituals(); renderChat(); };
  /* ---------------- settings ---------------- */
  function renderSettings() {
    $("setName").textContent = S.name || "–";
    $("setFocus").textContent = S.focus ? S.focus[0].toUpperCase() + S.focus.slice(1) : "–";
    $("setPlan").textContent = isPro() ? "Pro (" + (C.PLANS[S.pro.plan] || {}).name + ")" : "Free";
    $("setStage").textContent = isPro() ? "Golden Moyo" : STAGE_NAMES[petStage()];
  }
  window.rename = function () {
    openSheet("<h3>What should Moyo call you?</h3>" +
      '<input id="nm" class="field-txt clay-in" maxlength="20" value="">' +
      '<div class="row"><button class="btn" onclick="closeModal()">Cancel</button>' +
      '<button class="btn btn-primary" onclick="doRename()">Save</button></div>');
    $("nm").value = S.name;
  };
  window.doRename = function () {
    const v = ($("nm").value || "").trim().slice(0, 20);
    if (v) { S.name = v; S.memory.name = v; save(); }
    closeModal(); renderSettings(); renderPet();
  };
  window.resetAll = function () {
    openSheet("<h3>Start over?</h3><p>This wipes your rituals, moods, chats and Moyo's memory on this device. Pro status stays tied to this device.</p>" +
      '<div class="row"><button class="btn" onclick="closeModal()">Keep</button>' +
      '<button class="btn btn-rose" onclick="doReset()">Wipe it</button></div>');
  };
  window.doReset = function () {
    const pro = S.pro;
    S = DEF(); S.pro = pro; S.onboarded = true; save();
    closeModal(); location.reload();
  };

  /* ---------------- modal ---------------- */
  window.openSheet = function (html) { $("sheet").innerHTML = html; $("modal").classList.add("on"); };
  window.closeModal = function () { $("modal").classList.remove("on"); };
  $("modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });

  /* ---------------- boot ---------------- */
  function boot() {
    renderPet(); renderMoods(); renderRituals(); renderChat(); renderBreathExtra();
    renderSettings(); renderPro(); go("home");
  }

  // expose
  window.App = {
    get state() { return S; },
    save, go, isPro, renderPro,
    onProActivated: window.onProActivated,
  };

  if (!S.onboarded) {
    $("onboard").classList.remove("hidden");
  } else {
    $("onboard").classList.add("hidden");
    boot();
    // gentle nudge if returning after a day
    const lastVisit = S.lastVisit || "";
    if (lastVisit && lastVisit !== today() && !S.chat.length) { /* silent */ }
    S.lastVisit = today(); save();
  }
})();
