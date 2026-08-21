/* ========================================================
 * Pico Macro Builder — Interactive Live Demo
 * Visitors build a macro and watch it play out in the
 * simulated desktop window below.
 * ======================================================== */
(function () {
  "use strict";

  var WINDOW_W = 640;
  var WINDOW_H = 420;

  var elType = document.getElementById("demoActionType");
  var elParamGroup = document.querySelector(".demo-param-group");
  var elAddBtn = document.getElementById("demoAddAction");
  var elList = document.getElementById("demoActionList");
  var elRunBtn = document.getElementById("demoRunBtn");
  var elStopBtn = document.getElementById("demoStopBtn");
  var elClearBtn = document.getElementById("demoClearBtn");
  var elBody = document.getElementById("demoWindowBody");
  var elCursor = document.getElementById("demoCursor");
  var elText = document.getElementById("demoTextDisplay");
  var elStatus = document.getElementById("demoStatus");

  var actions = [];
  var running = false;
  var stopRequested = false;
  var cursorPos = { x: 40, y: 40 };

  /* ---------- Parameter field rendering ---------- */
  var FIELDS = {
    move:
      '<div class="demo-param-row">' +
      '<div><label>X</label><input type="number" id="dpX" value="300" min="0" max="' +
      WINDOW_W + '"></div>' +
      '<div><label>Y</label><input type="number" id="dpY" value="250" min="0" max="' +
      WINDOW_H + '"></div></div>',
    click:
      "<div><label>Target</label><select id=\"dpTarget\">" +
      '<option value="targetBtn1">“Click Me” button</option>' +
      '<option value="targetBtn2">“Press Here” button</option>' +
      "</select></div>",
    type:
      '<div><label>Text</label><input type="text" id="dpText" placeholder="Hello world!" maxlength="120"></div>',
    delay:
      '<div><label>Duration (ms)</label><input type="number" id="dpDelay" value="800" min="100" max="5000" step="100"></div>',
  };

  function renderFields() {
    var t = elType.value;
    elParamGroup.innerHTML = FIELDS[t];
    // update label
    var lbl = elParamGroup.querySelector("label");
    if (t === "move") lbl.textContent = "Position";
  }
  elType.addEventListener("change", renderFields);
  renderFields();

  function readParams() {
    var t = elType.value;
    switch (t) {
      case "move":
        return {
          x: Math.max(0, Math.min(WINDOW_W, Number(document.getElementById("dpX").value) || 0)),
          y: Math.max(0, Math.min(WINDOW_H, Number(document.getElementById("dpY").value) || 0)),
        };
      case "click":
        return { target: document.getElementById("dpTarget").value };
      case "type":
        return { text: document.getElementById("dpText").value || "" };
      case "delay":
        return { ms: Math.max(100, Number(document.getElementById("dpDelay").value) || 500) };
    }
  }

  /* ---------- Action list management ---------- */
  function describe(a) {
    switch (a.type) {
      case "move":
        return "🖱️ Move → (" + a.params.x + ", " + a.params.y + ")";
      case "click":
        return "👆 Click → “" +
          document.getElementById(a.params.target).textContent.trim() + "”";
      case "type":
        return "⌨️ Type → “" + (a.params.text || "(empty)") + "”";
      case "delay":
        return "⏱️ Delay → " + a.params.ms + " ms";
    }
  }

  function renderList() {
    if (!actions.length) {
      elList.innerHTML = '<div class="demo-empty">No actions added yet. Select a type above.</div>';
      elRunBtn.disabled = false;
      return;
    }
    elRunBtn.disabled = running;
    elList.innerHTML = "";
    actions.forEach(function (a, i) {
      var row = document.createElement("div");
      row.className = "demo-action-item";
      var span = document.createElement("span");
      span.textContent = (i + 1) + ". " + describe(a);
      var btn = document.createElement("button");
      btn.className = "demo-remove";
      btn.title = "Remove";
      btn.textContent = "×";
      btn.addEventListener("click", function () {
        actions.splice(i, 1);
        renderList();
      });
      row.appendChild(span);
      row.appendChild(btn);
      elList.appendChild(row);
    });
  }

  elAddBtn.addEventListener("click", function () {
    actions.push({ type: elType.value, params: readParams() });
    renderList();
  });

  elClearBtn.addEventListener("click", function () {
    if (running) return;
    actions = [];
    elText.textContent = "";
    setStatus("");
    renderList();
  });

  function setStatus(msg) {
    elStatus.innerHTML = msg;
  }

  /* ---------- Animation helpers ---------- */
  function sleep(ms) {
    return new Promise(function (res) {
      setTimeout(res, ms);
    });
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function moveCursorTo(x, y, duration) {
    return new Promise(function (resolve) {
      var from = { x: cursorPos.x, y: cursorPos.y };
      var start = null;
      function frame(ts) {
        if (stopRequested) return resolve();
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / duration);
        var e = easeInOutCubic(p);
        cursorPos.x = from.x + (x - from.x) * e;
        cursorPos.y = from.y + (y - from.y) * e;
        elCursor.style.left = cursorPos.x + "px";
        elCursor.style.top = cursorPos.y + "px";
        if (p < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  function ripple(x, y) {
    var r = document.createElement("div");
    r.className = "demo-ripple";
    r.style.left = x + "px";
    r.style.top = y + "px";
    elBody.appendChild(r);
    setTimeout(function () {
      r.remove();
    }, 650);
  }

  function centerOf(id) {
    var el = document.getElementById(id);
    return {
      x: el.offsetLeft + el.offsetWidth / 2,
      y: el.offsetTop + el.offsetHeight / 2,
    };
  }

  /* ---------- Action execution ---------- */
  async function runAction(a, idx, total) {
    if (stopRequested) return;
    setStatus('<span class="running">▶ Running action ' + (idx + 1) + " of " + total + "…</span>");

    switch (a.type) {
      case "move":
        await moveCursorTo(a.params.x, a.params.y, 700);
        break;

      case "click": {
        var c = centerOf(a.params.target);
        await moveCursorTo(c.x, c.y, 600);
        if (stopRequested) return;
        ripple(c.x, c.y);
        var btn = document.getElementById(a.params.target);
        btn.classList.add("demo-btn-active");
        await sleep(350);
        btn.classList.remove("demo-btn-active");
        break;
      }

      case "type":
        for (var i = 0; i < a.params.text.length; i++) {
          if (stopRequested) return;
          elText.textContent += a.params.text[i];
          await sleep(75);
        }
        break;

      case "delay":
        var waited = 0;
        while (waited < a.params.ms && !stopRequested) {
          var step = Math.min(100, a.params.ms - waited);
          await sleep(step);
          waited += step;
        }
        break;
    }
  }

  async function runMacro() {
    if (!actions.length || running) return;
    running = true;
    stopRequested = false;
    elRunBtn.disabled = true;
    elStopBtn.style.display = "";
    elClearBtn.disabled = true;

    for (var i = 0; i < actions.length; i++) {
      if (stopRequested) break;
      await runAction(actions[i], i, actions.length);
    }

    running = false;
    elRunBtn.disabled = false;
    elStopBtn.style.display = "none";
    elClearBtn.disabled = false;
    renderList();
    setStatus(stopRequested ? "⏹ Stopped." : "✅ Macro finished!");
  }

  elRunBtn.addEventListener("click", runMacro);
  elStopBtn.addEventListener("click", function () {
    stopRequested = true;
  });

  /* ---------- Init ---------- */
  renderList();
  elCursor.style.left = cursorPos.x + "px";
  elCursor.style.top = cursorPos.y + "px";
})();