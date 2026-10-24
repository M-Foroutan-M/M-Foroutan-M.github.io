/* Interactive hero visuals for project pages. Each canvas draws on a fixed dark instrument panel. */
(function () {
  var C = { bg: "#0F1A24", grid: "#1C2A38", line: "#2A3D52", text: "#C9D4DE", muted: "#8CA0B3",
            blue: "#7AA7F0", red: "#F0705E", green: "#5CC77A", amber: "#FFC857", body: "#24384D", edge: "#3B5470" };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MONO = '"JetBrains Mono", Menlo, monospace';

  function setup(id) {
    var c = document.getElementById(id); if (!c) return null;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = 1280 * dpr; c.height = 720 * dpr;
    var ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
    return { c: c, ctx: ctx, W: 1280, H: 720 };
  }
  function loop(fn) {
    if (reduce) { fn(4000); return; }
    var on = true; document.addEventListener("visibilitychange", function () { on = !document.hidden; });
    (function f(t) { if (on) fn(t); requestAnimationFrame(f); })(0);
  }
  function grid(ctx, W, H, s) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1; ctx.beginPath();
    for (var x = s; x < W; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (var y = s; y < H; y += s) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }
  function label(ctx, s, x, y, col, size, weight) {
    ctx.fillStyle = col || C.text; ctx.font = (weight || 400) + " " + (size || 16) + "px " + MONO; ctx.fillText(s, x, y);
  }
  function bindToggle(group, cb) {
    var btns = document.querySelectorAll('[data-group="' + group + '"]');
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        btns.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
        cb(b.getAttribute("data-value"));
      });
    });
  }

  /* ---------- IMU glove: finger flexion, sensor axis vs PCA axis ---------- */
  function imu() {
    var s = setup("imu"); if (!s) return;
    var ctx = s.ctx, W = s.W, H = s.H, show = "both", hist = [];
    bindToggle("imu", function (v) { show = v; });
    var tilt = 28 * Math.PI / 180;
    function draw(t) {
      grid(ctx, W, H, 40);
      var th = (50 + 38 * Math.sin(t * 0.0011)) * Math.PI / 180;          // true MCP flexion
      // finger side view
      var bx = 190, by = 250, L = [150, 100, 75];
      ctx.fillStyle = "#1B2A3A"; ctx.strokeStyle = C.edge; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx - 150, by - 40, 160, 120, 30) : ctx.rect(bx - 150, by - 40, 160, 120); ctx.fill(); ctx.stroke();
      var angs = [th, th * 0.9, th * 0.6], x = bx, y = by, a = 0, pts = [[x, y]];
      for (var i = 0; i < 3; i++) { a += angs[i]; x += L[i] * Math.cos(a); y += L[i] * Math.sin(a); pts.push([x, y]); }
      ctx.lineCap = "round"; ctx.strokeStyle = C.body; ctx.lineWidth = 40;
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (i = 1; i < 4; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
      ctx.fillStyle = C.edge; for (i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 8, 0, 7); ctx.fill(); }
      // IMU on proximal phalanx, mounted with a tilt
      // IMU sits on the fingernail (back of the distal segment, near the tip)
      var mx = pts[2][0] + (pts[3][0] - pts[2][0]) * 0.62, my = pts[2][1] + (pts[3][1] - pts[2][1]) * 0.62;
      ctx.save(); ctx.translate(mx, my); ctx.rotate(angs[0] + angs[1] + angs[2] + tilt * 0.5);
      ctx.fillStyle = C.bg; ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.fillRect(-14, -36, 28, 20); ctx.strokeRect(-14, -36, 28, 20);
      ctx.restore();
      // arc showing true angle
      ctx.strokeStyle = C.amber; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, 70, 0, th); ctx.stroke();
      ctx.setLineDash([6, 8]); ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 230, by); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, "MCP flexion " + Math.round(th * 180 / Math.PI) + "°", 60, 90, C.amber, 20, 500);
      label(ctx, "IMU mounted " + Math.round(tilt * 180 / Math.PI) + "° off the joint axis", 60, 120, C.muted, 15);

      // estimates
      var sensor = th * Math.cos(tilt) - 0.08 * Math.sin(t * 0.0023);   // projection onto mis-aligned sensor axis
      var pca = th * 0.98 + 0.01 * Math.sin(t * 0.004);
      hist.push([th, sensor, pca]); if (hist.length > 360) hist.shift();
      // plot
      var px = 560, py = 110, pw = 670, ph = 470;
      ctx.fillStyle = "#13212E"; ctx.fillRect(px, py, pw, ph); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
      function yv(v) { return py + ph - 30 - (v * 180 / Math.PI) / 100 * (ph - 60); }
      [0, 25, 50, 75, 100].forEach(function (d) {
        var yy = py + ph - 30 - d / 100 * (ph - 60);
        ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(px + 50, yy); ctx.lineTo(px + pw - 10, yy); ctx.stroke();
        label(ctx, d + "°", px + 10, yy + 5, C.muted, 13);
      });
      function trace(k, col, w, dash) {
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.setLineDash(dash || []); ctx.beginPath();
        hist.forEach(function (h, j) { var xx = px + 50 + j / 360 * (pw - 60); j ? ctx.lineTo(xx, yv(h[k])) : ctx.moveTo(xx, yv(h[k])); });
        ctx.stroke(); ctx.setLineDash([]);
      }
      trace(0, C.muted, 2, [5, 6]);
      if (show !== "pca") trace(1, C.red, 3);
      if (show !== "sensor") trace(2, C.green, 3);
      label(ctx, "true angle", px + 60, py + 30, C.muted, 14);
      if (show !== "pca") label(ctx, "sensor axis " + Math.round(sensor * 180 / Math.PI) + "°", px + 200, py + 30, C.red, 14, 500);
      if (show !== "sensor") label(ctx, "PCA axis " + Math.round(pca * 180 / Math.PI) + "°", px + 420, py + 30, C.green, 14, 500);
      var lost = Math.round((1 - Math.cos(tilt)) * 100);
      label(ctx, "sensor axis misses ~" + lost + "% of the motion · PCA axis recovers ~98%", px, py + ph + 40, C.text, 16);
    }
    loop(draw);
  }

  /* ---------- Heating table: 6x8 grid, 12 zones with PID ---------- */
  function heat() {
    var s = setup("heat"); if (!s) return;
    var ctx = s.ctx, W = s.W, H = s.H, NX = 6, NY = 8, SP = 60, AMB = 25;
    var T = [], zones = [], sched = true, hist = [];
    function reset() { T = []; for (var i = 0; i < NX * NY; i++) T.push(AMB + Math.random() * 3); zones = []; for (var z = 0; z < 4; z++) zones.push({ i: 0, e: 0, u: 0 }); hist = []; }
    reset();
    bindToggle("heat", function (v) { sched = v === "on"; });
    var resetBtn = document.getElementById("heat-reset"); if (resetBtn) resetBtn.addEventListener("click", reset);
    var cw = 64, ch = 60, gx = 70, gy = 120, gap = 6;
    s.c.addEventListener("click", function (ev) {
      var r = s.c.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width * W, y = (ev.clientY - r.top) / r.height * H;
      var i = Math.floor((x - gx) / (cw + gap)), j = Math.floor((y - gy) / (ch + gap));
      if (i >= 0 && i < NX && j >= 0 && j < NY) {
        for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
          var a = i + di, b = j + dj; if (a >= 0 && a < NX && b >= 0 && b < NY) T[b * NX + a] -= (di || dj) ? 14 : 28;
        }
      }
    });
    function zoneOf(i, j) { return (j < 4 ? 0 : 2) + (i < 3 ? 0 : 1); }
    function step(dt) {
      var zt = []; for (var z = 0; z < 4; z++) zt.push(0);
      for (var j = 0; j < NY; j++) for (var i = 0; i < NX; i++) zt[zoneOf(i, j)] += T[j * NX + i] / 12;
      zones.forEach(function (Z, z) {
        // PI per zone. Gain scheduling boosts the proportional gain while the error is large.
        var e = SP - zt[z], kp = (sched && Math.abs(e) > 10) ? 2.5 : 1.2, ki = 0.5;
        var raw = kp * e + ki * Z.i;
        // anti-windup: stop integrating while the heater is saturated in the same direction
        if (!((raw >= 60 && e > 0) || (raw <= 0 && e < 0))) Z.i += e * dt;
        Z.e = e;
        Z.u = Math.max(0, Math.min(60, kp * e + ki * Z.i));
      });
      var N = T.slice();
      for (j = 0; j < NY; j++) for (i = 0; i < NX; i++) {
        var k = j * NX + i, lap = 0, n = 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (o) { var a = i + o[0], b = j + o[1]; if (a >= 0 && a < NX && b >= 0 && b < NY) { lap += T[b * NX + a] - T[k]; n++; } });
        N[k] = T[k] + dt * (0.35 * lap + 0.06 * zones[zoneOf(i, j)].u * 1.0 - 0.05 * (T[k] - AMB));
      }
      T = N;
    }
    function col(v) {
      var t = Math.max(0, Math.min(1, (v - AMB) / (SP + 10 - AMB)));
      var st = [[0, [47, 99, 214]], [0.55, [255, 200, 87]], [1, [210, 65, 47]]];
      for (var q = 0; q < 2; q++) if (t <= st[q + 1][0]) {
        var u = (t - st[q][0]) / (st[q + 1][0] - st[q][0]), a = st[q][1], b = st[q + 1][1];
        return "rgb(" + Math.round(a[0] + (b[0] - a[0]) * u) + "," + Math.round(a[1] + (b[1] - a[1]) * u) + "," + Math.round(a[2] + (b[2] - a[2]) * u) + ")";
      }
      return "rgb(210,65,47)";
    }
    var last = 0, acc = 0;
    function draw(t) {
      var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      if (reduce) { for (var r = 0; r < 600; r++) step(0.05); } else { for (var r2 = 0; r2 < 3; r2++) step(dt * 2); }
      grid(ctx, W, H, 40);
      label(ctx, "6 × 8 sensing grid · 4 PID zones", gx, 90, C.muted, 15);
      for (var j = 0; j < NY; j++) for (var i = 0; i < NX; i++) {
        var v = T[j * NX + i], x = gx + i * (cw + gap), y = gy + j * (ch + gap);
        ctx.fillStyle = col(v); ctx.fillRect(x, y, cw, ch);
        label(ctx, Math.round(v) + "", x + 18, y + 36, "rgba(15,26,36,.85)", 15, 500);
      }
      // zone outlines
      ctx.strokeStyle = C.bg; ctx.lineWidth = 4;
      for (var zx = 0; zx <= 2; zx++) { var xx = gx + zx * 3 * (cw + gap) - gap / 2; ctx.beginPath(); ctx.moveTo(xx, gy - 3); ctx.lineTo(xx, gy + NY * (ch + gap) - gap + 3); ctx.stroke(); }
      for (var zy = 0; zy <= 2; zy++) { var yy = gy + zy * 4 * (ch + gap) - gap / 2; ctx.beginPath(); ctx.moveTo(gx - 3, yy); ctx.lineTo(gx + NX * (cw + gap) - gap + 3, yy); ctx.stroke(); }
      // stats
      var mean = T.reduce(function (a, b) { return a + b; }, 0) / T.length;
      var worst = T.reduce(function (a, b) { return Math.max(a, Math.abs(SP - b)); }, 0);
      acc += dt; if (acc > 0.05 || reduce) { acc = 0; hist.push(mean); if (hist.length > 300) hist.shift(); }
      var px = 560, py = 120, pw = 660, ph = 360;
      ctx.fillStyle = "#13212E"; ctx.fillRect(px, py, pw, ph); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
      function yv(v) { return py + ph - 20 - (v - AMB) / (SP + 15 - AMB) * (ph - 40); }
      [20, 40, 60].forEach(function (d) { ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(px + 50, yv(d)); ctx.lineTo(px + pw - 10, yv(d)); ctx.stroke(); label(ctx, d + "°C", px + 6, yv(d) + 5, C.muted, 13); });
      ctx.setLineDash([6, 6]); ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px + 50, yv(SP)); ctx.lineTo(px + pw - 10, yv(SP)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.beginPath();
      hist.forEach(function (h, k) { var x = px + 50 + k / 300 * (pw - 60); k ? ctx.lineTo(x, yv(h)) : ctx.moveTo(x, yv(h)); }); ctx.stroke();
      label(ctx, "setpoint " + SP + "°C", px + pw - 170, yv(SP) - 10, C.amber, 13);
      label(ctx, "mean surface temperature", px + 60, py + 28, C.blue, 14);
      label(ctx, mean.toFixed(1) + "°C", px, py + ph + 60, C.text, 34, 500);
      label(ctx, "mean", px, py + ph + 86, C.muted, 14);
      label(ctx, worst.toFixed(1) + "°C", px + 240, py + ph + 60, worst > 5 ? C.red : C.green, 34, 500);
      label(ctx, "worst cell error", px + 240, py + ph + 86, C.muted, 14);
    }
    loop(draw);
  }

  /* ---------- ACC: ego follows lead, gap depends on road ---------- */
  function acc() {
    var s = setup("acc"); if (!s) return;
    var ctx = s.ctx, W = s.W, H = s.H;
    var roads = { dry: { tg: 1.4, mu: 0.9, col: "#17232F", name: "dry asphalt" }, wet: { tg: 2.0, mu: 0.6, col: "#152636", name: "wet" }, icy: { tg: 3.0, mu: 0.25, col: "#1E2E3E", name: "icy" } };
    var road = roads.dry; bindToggle("acc", function (v) { road = roads[v]; });
    var lead = { x: 60, v: 25 }, ego = { x: 25, v: 25, a: 0 }, hist = [], last = 0, scroll = 0;
    function step(t, dt) {
      var cyc = (t / 1000) % 16, target = cyc < 6 ? 25 : cyc < 8 ? 12 : cyc < 12 ? 20 : 28;
      lead.v += Math.max(-4, Math.min(2.5, (target - lead.v) * 1.2)) * dt; lead.x += lead.v * dt;
      var des = 4 + road.tg * ego.v, gap = lead.x - ego.x - 4.5;
      var a = 0.25 * (gap - des) + 0.9 * (lead.v - ego.v);
      var amax = 2.0, bmax = 9.0 * road.mu;
      ego.a = Math.max(-bmax, Math.min(amax, a)); ego.v = Math.max(0, ego.v + ego.a * dt); ego.x += ego.v * dt;
      return { gap: gap, des: des };
    }
    function car(x, y, col) {
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, 150, 46, 12) : ctx.rect(x, y, 150, 46); ctx.fill();
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + 36, y - 22, 76, 30, 10) : ctx.rect(x + 36, y - 22, 76, 30); ctx.fill();
      ctx.fillStyle = C.bg; ctx.strokeStyle = C.text; ctx.lineWidth = 3;
      [x + 34, x + 116].forEach(function (cx) { ctx.beginPath(); ctx.arc(cx, y + 48, 13, 0, 7); ctx.fill(); ctx.stroke(); });
    }
    function draw(t) {
      var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      var r = step(t, dt);
      grid(ctx, W, H, 40);
      // road
      ctx.fillStyle = road.col; ctx.fillRect(0, 230, W, 200);
      ctx.strokeStyle = C.edge; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 230); ctx.lineTo(W, 230); ctx.moveTo(0, 430); ctx.lineTo(W, 430); ctx.stroke();
      scroll = (scroll + ego.v * dt * 8) % 70;
      ctx.strokeStyle = "#5B6F84"; ctx.lineWidth = 4; ctx.setLineDash([40, 30]); ctx.lineDashOffset = scroll; ctx.beginPath(); ctx.moveTo(0, 330); ctx.lineTo(W, 330); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      if (road === roads.icy || road === roads.wet) { ctx.fillStyle = road === roads.icy ? "rgba(200,225,255,.08)" : "rgba(122,167,240,.06)"; for (var k = 0; k < 40; k++) { ctx.fillRect((k * 97 - scroll * 3 + 2000) % W, 240 + (k * 53) % 180, 30, 3); } }
      var px = 8, ex = 160, lx = Math.min(W - 180, ex + 150 + r.gap * px);
      // gap bar
      ctx.fillStyle = "rgba(122,167,240,.12)"; ctx.beginPath(); ctx.moveTo(ex + 150, 340); ctx.lineTo(lx, 318); ctx.lineTo(lx, 362); ctx.closePath(); ctx.fill();
      var dx = Math.min(W - 180, ex + 150 + r.des * px);
      ctx.strokeStyle = C.amber; ctx.lineWidth = 2; ctx.setLineDash([5, 6]); ctx.beginPath(); ctx.moveTo(dx, 250); ctx.lineTo(dx, 410); ctx.stroke(); ctx.setLineDash([]);
      label(ctx, "desired gap", dx - 48, 256 - 12, C.amber, 13);
      car(ex, 300, C.blue); car(lx, 300, "#5B6F84");
      label(ctx, "ego · ACC", ex + 20, 390, C.text, 14); label(ctx, "lead", lx + 50, 390, C.muted, 14);
      // readouts
      label(ctx, "road: " + road.name, 40, 80, C.text, 20, 500);
      label(ctx, "time gap " + road.tg.toFixed(1) + " s · braking limit " + (9 * road.mu).toFixed(1) + " m/s²", 40, 110, C.muted, 15);
      var cols = [["ego speed", (ego.v * 3.6).toFixed(0) + " km/h", C.blue], ["lead speed", (lead.v * 3.6).toFixed(0) + " km/h", C.text], ["gap", r.gap.toFixed(1) + " m", C.amber], ["accel", ego.a.toFixed(1) + " m/s²", ego.a < -3 ? C.red : C.green]];
      cols.forEach(function (c, i) { label(ctx, c[1], 40 + i * 300, 540, c[2], 32, 500); label(ctx, c[0], 40 + i * 300, 568, C.muted, 14); });
      hist.push(ego.a); if (hist.length > 600) hist.shift();
      ctx.strokeStyle = C.line; ctx.strokeRect(40, 600, W - 80, 90);
      ctx.strokeStyle = C.grid; ctx.beginPath(); ctx.moveTo(40, 645); ctx.lineTo(W - 40, 645); ctx.stroke();
      ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.beginPath();
      hist.forEach(function (a, k) { var x = 40 + k / 600 * (W - 80), y = 645 - a * 8; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      label(ctx, "ego acceleration", 50, 620, C.muted, 12);
    }
    loop(draw);
  }

  imu(); heat(); acc();
})();
