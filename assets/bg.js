/* Animated background: a drifting LiDAR-style point cloud with a rotating scan sweep.
   Points light up as the sweep passes over them, and link to the mouse when it is near. */
(function () {
  var c = document.createElement("canvas");
  c.id = "bg"; c.setAttribute("aria-hidden", "true");
  document.body.prepend(c);
  var ctx = c.getContext("2d");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W, H, dpr, pts = [], mouse = { x: -9999, y: -9999 }, sweep = 0, running = true;
  var LINK = 130, BLUE = "122,167,240", AMBER = "255,200,87";

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.min(150, Math.round(W * H / 12000));
    pts = [];
    for (var i = 0; i < n; i++) {
      pts.push({ x: Math.random() * W, y: Math.random() * H,
                 vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, glow: 0 });
    }
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    var ox = W * 0.82, oy = H * 0.22;                 // scanner origin
    sweep = (sweep + 0.006) % (Math.PI * 2);

    // sweep wedge
    if (ctx.createConicGradient) {
      var g = ctx.createConicGradient(sweep - 0.6, ox, oy);
      g.addColorStop(0, "rgba(" + BLUE + ",0)");
      g.addColorStop(0.095, "rgba(" + BLUE + ",0.07)");
      g.addColorStop(0.0955, "rgba(" + BLUE + ",0)");
      g.addColorStop(1, "rgba(" + BLUE + ",0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // range rings
    ctx.strokeStyle = "rgba(" + BLUE + ",0.05)"; ctx.lineWidth = 1;
    for (var r = 160; r < Math.max(W, H) * 1.2; r += 160) { ctx.beginPath(); ctx.arc(ox, oy, r, 0, Math.PI * 2); ctx.stroke(); }

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      var a = Math.atan2(p.y - oy, p.x - ox); if (a < 0) a += Math.PI * 2;
      var d = Math.abs(a - sweep); if (d > Math.PI) d = Math.PI * 2 - d;
      if (d < 0.05) p.glow = 1; else p.glow *= 0.985;
    }
    // links
    for (i = 0; i < pts.length; i++) {
      for (var j = i + 1; j < pts.length; j++) {
        var dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK) {
          var al = (1 - dist / LINK) * (0.10 + 0.25 * Math.max(pts[i].glow, pts[j].glow));
          ctx.strokeStyle = "rgba(" + BLUE + "," + al.toFixed(3) + ")";
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke();
        }
      }
      var mx = pts[i].x - mouse.x, my = pts[i].y - mouse.y, md = Math.sqrt(mx * mx + my * my);
      if (md < 170) {
        ctx.strokeStyle = "rgba(" + AMBER + "," + ((1 - md / 170) * 0.35).toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    // points
    for (i = 0; i < pts.length; i++) {
      var q = pts[i];
      ctx.fillStyle = "rgba(" + BLUE + "," + (0.35 + 0.65 * q.glow).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(q.x, q.y, 1.4 + q.glow * 1.4, 0, Math.PI * 2); ctx.fill();
    }
    if (running && !reduce) requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener("pointerleave", function () { mouse.x = mouse.y = -9999; });
  document.addEventListener("visibilitychange", function () {
    var was = running; running = !document.hidden;
    if (running && !was && !reduce) requestAnimationFrame(frame);
  });
  resize(); frame();
})();
