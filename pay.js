/* Moyo payments — self-custody Bitcoin rail. No KYC, no middleman.
   Flow: user picks plan -> we show OUR btc address + exact BTC amount (live
   price) -> user sends from any wallet -> pastes txid -> we verify the
   transaction on the public blockchain -> Pro activates on this device. */
(function () {
  const C = window.MOYO_CONFIG;
  let selPlan = "yearly";
  let quote = null;          // { planId, usd, btc, sats, ts }
  let quoteTimer = null;

  const $ = id => document.getElementById(id);

  function btcAddr() { return (C.BTC_ADDRESS || "").trim(); }
  function addrReady() {
    return btcAddr() && !/REPLACE_WITH/i.test(btcAddr()) && /^[13bc][a-zA-Z0-9]{25,62}$/.test(btcAddr());
  }

  window.pickPlan = function (id) {
    selPlan = id;
    document.querySelectorAll(".plan").forEach(p =>
      p.classList.toggle("sel", p.dataset.plan === id));
    const btn = $("continuePay");
    btn.disabled = false;
    btn.textContent = "Continue — pay " + fmtUSD(C.PLANS[id].usd);
  };

  function fmtUSD(x) { return "$" + x.toFixed(2); }
  function fmtBTC(x) { return x.toFixed(8) + " BTC"; }

  async function btcPriceUSD() {
    // primary: coingecko (no key). fallback: blockchain.info ticker.
    try {
      const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd", { cache: "no-store" });
      const j = await r.json();
      if (j && j.bitcoin && j.bitcoin.usd) return j.bitcoin.usd;
    } catch (e) { /* fall through */ }
    const r2 = await fetch("https://blockchain.info/ticker?cors=true", { cache: "no-store" });
    const j2 = await r2.json();
    if (j2 && j2.USD && j2.USD.last) return j2.USD.last;
    throw new Error("price");
  }

  window.toPayStep2 = async function () {
    if (!addrReady()) {
      payMsg("err", "Payments are not switched on yet — the app owner has not added their Bitcoin address. Please check back soon.");
      return;
    }
    showStep(2);
    $("payAmountLine").textContent = "Fetching live BTC price...";
    try {
      const price = await btcPriceUSD();
      const plan = C.PLANS[selPlan];
      const btc = plan.usd / price;
      const sats = Math.ceil(btc * 1e8);
      quote = { planId: selPlan, usd: plan.usd, btc: sats / 1e8, sats, ts: Date.now() };
      renderQuote();
      startQuoteTimer();
    } catch (e) {
      $("payAmountLine").textContent = "Could not fetch the live price. Check your connection and try again.";
    }
  };

  function renderQuote() {
    const a = btcAddr();
    $("payAmountLine").innerHTML =
      "<b style='font-size:20px'>" + fmtBTC(quote.btc) + "</b><br>" +
      "<span class='small'>≈ " + fmtUSD(quote.usd) + " · " + C.PLANS[quote.planId].name + " plan · <span id='qTimer'>15:00</span> left</span>";
    $("payAddr").textContent = a;
    $("payQR").src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=" +
      encodeURIComponent("bitcoin:" + a + "?amount=" + quote.btc.toFixed(8));
    payMsg("", "");
  }

  function startQuoteTimer() {
    clearInterval(quoteTimer);
    const end = Date.now() + 15 * 60 * 1000;
    quoteTimer = setInterval(() => {
      const left = end - Date.now();
      const el = $("qTimer");
      if (!el) { clearInterval(quoteTimer); return; }
      if (left <= 0) {
        clearInterval(quoteTimer);
        el.textContent = "expired";
        payMsg("err", "Quote expired (BTC price moves fast). Tap Back and come again for a fresh quote.");
        return;
      }
      const m = Math.floor(left / 60000), s = Math.floor(left % 60000 / 1000);
      el.textContent = m + ":" + String(s).padStart(2, "0");
    }, 1000);
  }

  window.toPayStep1 = function () { clearInterval(quoteTimer); showStep(1); };
  function showStep(n) {
    [1, 2, 3].forEach(i => $("paystep" + i).classList.toggle("on", i === n));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.copyAddr = function () {
    const a = btcAddr();
    if (navigator.clipboard) navigator.clipboard.writeText(a).catch(() => {});
    payMsg("ok", "Address copied. Send the exact BTC amount from any wallet, then paste the txid below.");
  };

  function payMsg(kind, html) {
    const el = $("verifyMsg");
    el.innerHTML = html ? '<div class="notice clay-sm ' + kind + '">' + html + "</div>" : "";
  }

  /* ---------- verification ---------- */
  window.verifyPayment = async function () {
    const txid = ($("txidIn").value || "").trim().toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(txid)) {
      payMsg("err", "That does not look like a transaction ID — it should be 64 hex characters. Copy it from your wallet's history.");
      return;
    }
    if (!quote) { payMsg("err", "No active quote. Go back and pick a plan again."); return; }
    const used = (App.state.pro.txids || []);
    if (used.includes(txid)) { payMsg("err", "This transaction was already used for a previous activation."); return; }

    $("verifyBtn").disabled = true;
    $("verifySpin").classList.remove("hidden");
    payMsg("", "");

    try {
      const r = await fetch("https://blockchain.info/rawtx/" + txid + "?cors=true", { cache: "no-store" });
      if (!r.ok) throw new Error("notfound");
      const tx = await r.json();

      const mine = (tx.out || []).filter(o => o.addr === btcAddr());
      const paidSats = mine.reduce((s, o) => s + (o.value || 0), 0);

      if (paidSats < quote.sats) {
        payMsg("err", "Found the transaction, but it only paid <b>" + (paidSats / 1e8).toFixed(8) +
          " BTC</b> to our address — expected <b>" + fmtBTC(quote.btc) + "</b>. Send the remaining amount in a new transaction, or contact support with your txid.");
        return;
      }
      const confs = (tx.block_height != null) ? "confirmed" : "unconfirmed";
      if (tx.block_height == null) {
        payMsg("err", "Payment found on the network but still <b>unconfirmed</b> (0 confirmations). Wait a few minutes for one confirmation, then tap Verify again — your money is on its way.");
        return;
      }
      // success
      activatePro(quote.planId, txid);
      clearInterval(quoteTimer);
      showStep(3);
      if (window.App && App.onProActivated) App.onProActivated();
    } catch (e) {
      payMsg("err", "Could not find that transaction on the Bitcoin network yet. Double-check the txid, wait a minute after sending, and try again.");
    } finally {
      $("verifyBtn").disabled = false;
      $("verifySpin").classList.add("hidden");
    }
  };

  function activatePro(planId, txid) {
    const days = C.PLANS[planId].days;
    const now = Date.now();
    const cur = (App.state.pro && App.state.pro.active && App.state.pro.expires > now) ? App.state.pro.expires : now;
    App.state.pro = {
      active: true, plan: planId,
      expires: days === 0 ? 0 : cur + days * 864e5,
      txids: [...(App.state.pro.txids || []), txid],
      since: App.state.pro.since || now
    };
    App.save();
  }

  window.MOYO_PAY = { addrReady };
})();
