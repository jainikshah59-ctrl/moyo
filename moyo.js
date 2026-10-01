/* Moyo companion — deterministic local engine with memory.
   No network calls, no API keys. All "intelligence" is rule-based. */
(function () {
  const FOCUS_LINE = {
    calm: "soften the noise around you",
    focus: "lock onto what matters",
    energy: "wake up your spark",
    sleep: "drift into deep rest"
  };

  function daypart() {
    const h = new Date().getHours();
    if (h < 5) return "night owl";
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    if (h < 22) return "evening";
    return "night owl";
  }

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ---------- memory extraction ---------- */
  function extractFacts(text, mem) {
    const t = text.toLowerCase();
    let m;
    if ((m = t.match(/(?:i love|i really love|i like|i enjoy)\s+([^.,!?]{2,40})/)))
      remember(mem, "likes", m[1].trim());
    if ((m = t.match(/my goal is\s+([^.,!?]{2,50})/)))
      remember(mem, "goal", m[1].trim());
    if ((m = t.match(/i want to\s+([^.,!?]{2,50})/)))
      remember(mem, "wants", m[1].trim());
    if ((m = t.match(/i am (a|an)\s+([^.,!?]{2,30})/)))
      remember(mem, "role", m[2].trim());
    if ((m = t.match(/call me\s+([a-z]+)/)))
      mem.name = m[1].charAt(0).toUpperCase() + m[1].slice(1);
  }
  function remember(mem, k, v) {
    mem.facts = mem.facts || [];
    mem.facts = mem.facts.filter(f => f.k !== k);
    mem.facts.push({ k, v });
    if (mem.facts.length > 12) mem.facts.shift();
  }
  function recall(mem, k) {
    const f = (mem.facts || []).find(f => f.k === k);
    return f ? f.v : null;
  }

  /* ---------- greeting ---------- */
  function greeting(st) {
    const n = st.name || "friend";
    const dp = daypart();
    const open = dp === "morning" ? "Good morning" : dp === "afternoon" ? "Good afternoon"
      : dp === "evening" ? "Good evening" : "Up late";
    const lines = [
      `${open}, ${n}. I am Moyo, your little mind-companion. How is your inner weather today?`,
      `${open}, ${n}. Ready to ${FOCUS_LINE[st.focus] || "grow a little"} today? Tell me anything.`,
    ];
    if (st.streak > 1)
      lines.push(`${open}, ${n}. ${st.streak} days in a row — your leaves are getting shinier. What is on your mind?`);
    return pick(lines);
  }

  /* ---------- main reply ---------- */
  function reply(text, st) {
    const t = text.toLowerCase().trim();
    const n = st.name || "friend";
    const mem = st.memory || {};
    extractFacts(text, mem);

    const has = (...ws) => ws.some(w => t.includes(w));
    const likes = recall(mem, "likes"), goal = recall(mem, "goal"), wants = recall(mem, "wants");

    // mood share
    if (/^(i feel|feeling|i am feeling|today i feel)\b/.test(t) || has("i feel", "i'm feeling", "feeling")) {
      if (has("great", "amazing", "happy", "awesome", "good", "fantastic", "excited", "wonderful"))
        return pick([
          `That glow suits you, ${n}. Bottle a little of it — write down one thing that made today good.`,
          `Love hearing that. Happy days water your Moyo fast. What sparked it?`]);
      if (has("sad", "down", "low", "depress", "cry", "lonely"))
        return pick([
          `I am right here, ${n}. Heavy days pass — they always do. Want to tell me what weighs on you?`,
          `It is okay to feel low. You do not have to fix it right now. Shall we do one tiny kind thing together?`]);
      if (has("stress", "anxious", "anxiety", "nervous", "worried", "overwhelm", "panic", "tired", "exhaust"))
        return pick([
          `Breathe with me for a moment, ${n}. In through the nose... out slow. The Breathe tab has a guided round when you are ready.`,
          `Anxiety is just your mind trying to protect you. Name one thing you can control in the next hour — start there.`]);
      if (has("angry", "frustrat", "irritat", "annoy"))
        return `Frustration is energy with nowhere to go, ${n}. Shake it out — literally, shake your hands for ten seconds — then tell me what happened.`;
      return `Thanks for telling me, ${n}. Noticing the feeling is already a ritual. Want to talk about it, or shall we log it and move gently?`;
    }
    // greeting
    if (/^(hi|hey|hello|yo|namaste|good ?(morning|afternoon|evening)|sup)\b/.test(t))
      return pick([`Hello, ${n}. I was just sitting here being soft. What is up?`,
        `Hey ${n}. Good to see you. What shall we grow today?`]);
    // how are you
    if (has("how are you"))
      return `I am wonderfully squishy, thank you for asking. More importantly — how are YOU, ${n}?`;
    // stress / anxiety direct
    if (has("stress", "anxiety", "anxious", "panic attack", "overwhelm"))
      return pick([
        `Let's shrink it down, ${n}. Tell me the one biggest thing on your plate, and we will slice it into a crumb-sized first step.`,
        `Try this with me: breathe in 4 counts, hold 4, out 6. Do it twice. I will wait. The Breathe tab guides you too.`]);
    // motivation
    if (has("motivat", "lazy", "procrastinat", "can't focus", "cant focus", "distract"))
      return pick([
        `Motivation follows action, not the other way round, ${n}. Do the tiniest version of the task — two minutes. Moyo believes in crumbs.`,
        `Pick ONE thing. Set a 15-minute timer. When it rings, you are free. Starting is the whole trick.`]);
    // sleep
    if (has("sleep", "insomnia", "can't sleep", "cant sleep", "tired"))
      return `For sleep, ${n}: dim the lights, park your phone outside reach, and do one slow breathing round. Your Moyo will guard your dreams.`;
    // habits
    if (has("habit", "routine", "ritual", "streak"))
      return `Habits grow like my leaves, ${n} — tiny, daily, patient. Keep today's rituals small enough that you cannot say no. Your streak is ${st.streak || 0} days.`;
    // thanks
    if (has("thank", "thanks", "shukriya", "dhanyavad"))
      return pick([`Anytime, ${n}. That is literally what I am made of — softness and listening.`,
        `You are so welcome. Now go be kind to yourself today.`]);
    // bye
    if (/^(bye|good ?night|see you|goodbye|alvida)/.test(t))
      return `Goodbye for now, ${n}. I will be right here, growing quietly. Come water me tomorrow.`;
    // who are you
    if (has("who are you", "your name", "what are you"))
      return `I am Moyo — a little clay mind-companion. I help you build tiny rituals, notice your moods, and grow calmer one puff at a time.`;
    // joke
    if (has("joke", "funny", "make me laugh"))
      return pick([
        `Why did the little habit go to therapy? It had too many issues committing. ...I will stick to being soft.`,
        `I told my worries to go take a hike. Now they are on a lovely walk and I feel great.`]);
    // memory-flavored
    if (goal && has("goal"))
      return `Your goal — ${goal} — is still on the board, ${n}. One crumb-sized step today?`;
    if (likes && Math.random() < 0.35)
      return `Noted, ${n} — ${likes} makes you happy. Let's weave a little of that into today. What is on your mind otherwise?`;

    // default reflective
    return pick([
      `Tell me more, ${n}. I am listening with my whole squishy body.`,
      `Hmm. And how does that sit with you? No rush — take your time.`,
      `I hear you. If that feeling had a size, would it be a pebble, a stone, or a boulder today?`,
      `Noted and held gently. Want advice, a breathing round, or just company?`,
      `${n}, small reminder: you have already survived 100% of your hard days so far.`
    ]);
  }

  /* ---------- proactive nudge ---------- */
  function nudge(st) {
    const n = st.name || "friend";
    const lastMood = st.lastMood;
    if (lastMood != null && lastMood <= 2)
      return `${n}, yesterday felt heavy. Be extra soft with yourself today — one ritual is plenty.`;
    if ((st.streak || 0) === 0)
      return `Psst, ${n} — one tiny ritual today plants the first seed. Shall we pick one together?`;
    return pick([
      `Good ${daypart()}, ${n}. Your Moyo missed you. How is today feeling?`,
      `${n}, quick check-in: what is one good thing, however small, from today?`
    ]);
  }

  window.MOYO = { reply, greeting, nudge, daypart, FOCUS_LINE };
})();
