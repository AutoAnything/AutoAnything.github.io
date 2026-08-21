/* ========================================================
 * Pico Macro Builder — live app replica demo
 * ======================================================== */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var screen = $("paScreen");
  var cursor = $("paCursor");
  var queueEl = $("paQueue");
  var statusEl = $("paStatus");
  var toastEl = $("paToast");
  var typeSel = $("paType");
  var paramsEl = $("paParams");
  var loopChk = $("paLoop");

  var actions = [];
  var running = false;
  var stopReq = false;
  var userTouched = false;
  var autoStarted = false;
  var cursorPos = { x: 30, y: 30 };

  /* ---------- toasts & status ---------- */
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2200);
  }

  function status(msg, on) {
    statusEl.innerHTML = on ? '<span class="on">' + msg + "</span>" : msg;
  }

  /* ---------- composer param fields ---------- */
  var FIELDS = {
    move:
      '<input type="number" id="ppX" value="260" min="0" placeholder="X">' +
      '<input type="number" id="ppY" value="90" min="0" placeholder="Y">',
    click:
      '<select id="ppTarget">' +
      '<option value="tUser">Username field</option>' +
      '<option value="tPass">Password field</option>' +
      '<option value="tLogin">Log in button</option>' +
      '<option value="tChest">🎁 Treasure chest</option>' +
      '<option value="tChat">Chat box</option></select>',
    type:
      '<input type="text" id="ppText" placeholder="text to type…" maxlength="60">',
    delay:
      '<input type="number" id="ppMs" value="500" min="100" step="100" placeholder="ms">',
  };

  function renderFields() {
    paramsEl.innerHTML = FIELDS[typeSel.value];
  }
  typeSel.addEventListener("change", renderFields);
  renderFields();

  function readParams() {
    var t = typeSel.value, w = screen.offsetWidth, h = screen.offsetHeight;
    switch (t) {
      case "move":
        return {
          x: Math.min(w - 10, Math.max(0, +$("ppX").value || 0)),
          y: Math.min(h - 10, Math.max(0, +$("ppY").value || 0)),
        };
      case "click":
        return { target: $("ppTarget").value };
      case "type":
        return { text: $("ppText").value };
      case "delay":
        return { ms: Math.max(100, +$("ppMs").value || 500) };
    }
  }

  /* ---------- queue rendering ---------- */
  var TARGET_NAMES = {
    tUser: "Username", tPass: "Password", tLogin: "Log in",
    tChest: "🎁 Chest", tChat: "Chat box",
  };

  var LABELS = {
    move: function (p) { return "🖱️ Move → (" + p.x + ", " + p.y + ")"; },
    click: function (p) { return "👆 Click → " + TARGET_NAMES[p.target]; },
    type: function (p) { return "⌨️ Type → “" + (p.text || "…") + "”"; },
    delay: function (p) { return "⏱️ Delay → " + p.ms + " ms"; },
  };

  function renderQueue(execIdx) {
    queueEl.innerHTML = "";
    if (!actions.length) {
      var li = document.createElement("li");
      li.className = "pa-empty";
      li.textContent = "queue is empty — add actions above";
      queueEl.appendChild(li);
      return;
    }
    actions.forEach(function (a, i) {
      var li = document.createElement("li");
      if (i === execIdx) li.className = "executing";
      var span = document.createElement("span");
      span.textContent = (i + 1) + ". " + LABELS[a.type](a.params);
      var btn = document.createElement("button");
      btn.textContent = "×";
      btn.title = "remove";
      btn.addEventListener("click", function () {
        actions.splice(i, 1);
        renderQueue(-1);
      });
      li.appendChild(span);
      li.appendChild(btn);
      queueEl.appendChild(li);
    });
  }

  /* ---------- Saved-Macros presets ---------- */
  var PRESETS = [
    { name: "Auto Login", hotkey: "Ctrl+L", steps: [
      { type: "move", params: { x: 150, y: 60 } },
      { type: "click", params: { target: "tUser" } },
      { type: "type", params: { text: "player_one" } },
      { type: "click", params: { target: "tPass" } },
      { type: "type", params: { text: "hunter2" } },
      { type: "delay", params: { ms: 300 } },
      { type: "click", params: { target: "tLogin" } } ] },
    { name: "Chest Farmer", hotkey: "F6", steps: [
      { type: "click", params: { target: "tChest" } },
      { type: "delay", params: { ms: 350 } },
      { type: "click", params: { target: "tChest" } },
      { type: "delay", params: { ms: 350 } },
      { type: "click", params: { target: "tChest" } } ] },
    { name: "Chat Greeter", hotkey: "Alt+G", steps: [
      { type: "click", params: { target: "tChat" } },
      { type: "type", params: { text: "hello world!" } },
      { type: "delay", params: { ms: 400 } },
      { type: "click", params: { target: "tChest" } } ] },
  ];

  var presetWrap = $("paPresets");
  PRESETS.forEach(function (p, i) {
    var b = document.createElement("button");
    b.className = "pa-preset";
    b.innerHTML =
      '<div class="pa-preset-name">' + p.name + "</div>" +
      '<div class="pa-preset-meta"><small>' + p.steps.length +
      " actions</small><span class=\"pa-hotkey\">" + p.hotkey + "</span></div>";
    b.addEventListener("click", function () {
      userTouched = true;
      if (running) stopReq = true;
      presetWrap.querySelectorAll(".pa-preset").forEach(function (el, j) {
        el.classList.toggle("active", j === i);
      });
      actions = p.steps.map(function (s) {
        return { type: s.type, params: JSON.parse(JSON.stringify(s.params)) };
      });
      renderQueue(-1);
      status('Loaded “' + p.name + "”…");
      setTimeout(runMacro, 350);
    });
    presetWrap.appendChild(b);
  });

  $("paRefresh").addEventListener("click", function () {
    userTouched = true;
    toast("Macros refreshed 🔄");
  });

  /* ---------- animation helpers ---------- */
  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function moveCursor(x, y, dur) {
    return new Promise(function (resolve) {
      var fx = cursorPos.x, fy = cursorPos.y, start = null;
      function frame(ts) {
        if (stopReq) return resolve();
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var e = ease(p);
        cursorPos.x = fx + (x - fx) * e;
        cursorPos.y = fy + (y - fy) * e;
        cursor.style.left = cursorPos.x + "px";
        cursor.style.top = cursorPos.y + "px";
        p < 1 ? requestAnimationFrame(frame) : resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  function ripple(x, y) {
    var r = document.createElement("div");
    r.className = "pa-ripple";
    r.style.left = x + "px";
    r.style.top = y + "px";
    screen.appendChild(r);
    setTimeout(function () { r.remove(); }, 600);
  }

  function centerOf(id) {
    var el = $(id);
    return {
      x: el.offsetLeft + el.offsetWidth / 2,
      y: el.offsetTop + el.offsetHeight / 2,
    };
  }

  /* ---------- live reactions inside the fake app ---------- */
  var loginDone = false;
  $("tLogin").addEventListener("click", function () {
    if (loginDone) return;
    var u = $("tUser").value.trim();
    if (!u) { toast("Enter a username first 🙂"); return; }
    loginDone = true;
    this.classList.add("done");
    this.textContent = "✓ Welcome, " + u + "!";
    setTimeout(function () {
      var b = $("tLogin");
      b.classList.remove("done");
      b.textContent = "Log in";
      loginDone = false;
    }, 2500);
  });

  $("tChest").addEventListener("click", function () {
    this.classList.add("pop");
    toast("+50 gold 🪙");
    setTimeout(function () { $("tChest").classList.remove("pop"); }, 200);
  });

  /* ---------- action execution ---------- */
  async function runAction(a, idx) {
    renderQueue(idx);
    switch (a.type) {
      case "move":
        await moveCursor(a.params.x, a.params.y, 650);
        break;
      case "click": {
        var c = centerOf(a.params.target);
        await moveCursor(c.x, c.y, 550);
        if (stopReq) return;
        ripple(c.x, c.y);
        await sleep(120);
        $(a.params.target).click();
        await sleep(280);
        break;
      }
            case "type": {
        var field = document.activeElement;
        if (!field || field.tagName !== "INPUT" ||
            !screen.contains(field)) field = $("tUser");
        for (var i = 0; i < a.params.text.length; i++) {
          if (stopReq) return;
          field.value += a.params.text[i];
          await sleep(65);
        }
        break;
      }
      case "delay":
        var waited = 0;
        while (waited < a.params.ms && !stopReq) {
          await sleep(Math.min(100, a.params.ms - waited));
          waited += 100;
        }
        break;
    }
  }

  async function playOnce() {
    for (var i = 0; i < actions.length; i++) {
      if (stopReq) return false;
      await runAction(actions[i], i);
    }
    return true;
  }

  async function runMacro() {
    if (!actions.length || running) return;
    running = true;
    stopReq = false;
    $("paRun").hidden = true;
    $("paStop").hidden = false;

    do {
      var ok = await playOnce();
      if (stopReq) break;
    } while (loopChk.checked && ok);

    running = false;
    $("paRun").hidden = false;
    $("paStop").hidden = true;
    renderQueue(-1);
    status(stopReq ? "⏹ Stopped." : "✅ Macro finished!", !stopReq);
  }

  $("paRun").addEventListener("click", function () {
    userTouched = true;
    runMacro();
  });
  $("paStop").addEventListener("click", function () {
    userTouched = true;
    stopReq = true;
  });

  /* ---------- composer: add action ---------- */
  $("paAdd").addEventListener("click", function () {
    userTouched = true;
    actions.push({ type: typeSel.value, params: readParams() });
    renderQueue(-1);
  });

  /* ---------- playful toolbar toasts ---------- */
  document.querySelectorAll(".pa-tbtn[data-toast]").forEach(function (b) {
    b.addEventListener("click", function () {
      userTouched = true;
      toast(b.getAttribute("data-toast"));
    });
  });

  loopChk.addEventListener("change", function () {
    userTouched = true;
    if (loopChk.checked) toast("Loop enabled — macros repeat until ⏹ Stop");
  });

  /* ---------- auto-play demo on scroll into view ---------- */
  function startAuto() {
    actions = PRESETS[0].steps.map(function (s) {
      return { type: s.type, params: JSON.parse(JSON.stringify(s.params)) };
    });
    presetWrap.querySelectorAll(".pa-preset")[0].classList.add("active");
    renderQueue(-1);
    cursor.style.left = cursorPos.x + "px";
    cursor.style.top = cursorPos.y + "px";
    status("▶ Auto-playing “Auto Login” — click around to take over!");
    (async function () {
      while (!userTouched) {
        await runMacro();
        if (userTouched) break;
        for (var t = 0; t < 25 && !userTouched; t++) await sleep(100);
      }
    })();
  }

  if ("IntersectionObserver" in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && !autoStarted) {
          autoStarted = true;
          obs.disconnect();
          setTimeout(startAuto, 700);
        }
      });
    }, { threshold: 0.3 });
    obs.observe($("demo"));
  } else {
    setTimeout(startAuto, 1200);
  }

  renderQueue(-1);
})();