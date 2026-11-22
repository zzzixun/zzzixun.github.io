/* 互動 Chan–Vese 演化 demo
 * 更新式與論文第三章相同：
 *   φ ← φ + δε(φ) · [ μκ − ν − λ₁(I − c₁)² + λ₂(I − c₂)² ] / (|μ|+|ν|+|λ₁|+|λ₂| + η)
 * 影像為合成資料（demo-data.js），逐像素模式的係數場依真值位置產生，用來示意網路學到的配置。
 */
(function () {
  var D = window.CV_DEMO_DATA;
  var root = document.getElementById("cv-demo");
  if (!D || !root) return;

  var N = D.N, NN = N * N, EPS = 1.0, ETA = 1e-5, MAX_STEPS = 40;

  function dec(s) {
    var b = atob(s), a = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
    return a;
  }
  var img8 = dec(D.img), gt = dec(D.gt), phi8 = dec(D.phi0), near8 = dec(D.near), far8 = dec(D.far);

  // 影像標準化（z-score）
  var z = new Float32Array(NN), mean = 0, sd = 0;
  for (var i = 0; i < NN; i++) mean += img8[i] / 255;
  mean /= NN;
  for (i = 0; i < NN; i++) { var t = img8[i] / 255 - mean; sd += t * t; }
  sd = Math.sqrt(sd / NN);
  for (i = 0; i < NN; i++) z[i] = (img8[i] / 255 - mean) / sd;

  var phi0 = new Float32Array(NN);
  for (i = 0; i < NN; i++) phi0[i] = (phi8[i] - 128) / 40;
  var near = new Float32Array(NN), far = new Float32Array(NN);
  for (i = 0; i < NN; i++) { near[i] = near8[i] / 255; far[i] = far8[i] / 255; }

  // ---------- 係數場 ----------
  var F = { mu: new Float32Array(NN), nu: new Float32Array(NN), l1: new Float32Array(NN), l2: new Float32Array(NN) };
  var $ = function (id) { return document.getElementById(id); };

  function mode() { return root.querySelector("input[name=cv-mode]:checked").value; }
  function val(id) { return parseFloat($(id).value); }

  function buildFields() {
    var m = mode();
    if (m === "global") {
      var a = val("cv-mu"), b = val("cv-nu"), c = val("cv-l1"), d = val("cv-l2");
      F.mu.fill(a); F.nu.fill(b); F.l1.fill(c); F.l2.fill(d);
      return;
    }
    var add = val("cv-nuadd");
    for (var k = 0; k < NN; k++) {
      var s = m === "flip" ? NN - 1 - k : k; // 上下左右翻轉
      F.mu[k] = 0.15;
      F.nu[k] = 0.05 + 0.8 * far[s] + add;
      F.l1[k] = 0.3 + 1.5 * far[s];
      F.l2[k] = 0.3 + 2.5 * near[s];
    }
  }

  // ---------- 演化 ----------
  var phi = new Float32Array(NN), px = new Float32Array(NN), py = new Float32Array(NN), step = 0;

  // 同 numpy.gradient：內部中央差分、邊界單側差分
  function gradX(src, dst) {
    for (var y = 0; y < N; y++) {
      var r = y * N;
      dst[r] = src[r + 1] - src[r];
      dst[r + N - 1] = src[r + N - 1] - src[r + N - 2];
      for (var x = 1; x < N - 1; x++) dst[r + x] = (src[r + x + 1] - src[r + x - 1]) / 2;
    }
  }
  function gradY(src, dst) {
    for (var x = 0; x < N; x++) {
      dst[x] = src[N + x] - src[x];
      dst[(N - 1) * N + x] = src[(N - 1) * N + x] - src[(N - 2) * N + x];
      for (var y = 1; y < N - 1; y++) dst[y * N + x] = (src[(y + 1) * N + x] - src[(y - 1) * N + x]) / 2;
    }
  }
  var nx = new Float32Array(NN), ny = new Float32Array(NN), kx = new Float32Array(NN), ky = new Float32Array(NN);

  function evolveOnce() {
    var sH = 0, sIH = 0, sI = 0, k;
    for (k = 0; k < NN; k++) {
      var H = 0.5 * (1 + (2 / Math.PI) * Math.atan(phi[k] / EPS));
      sH += H; sIH += z[k] * H; sI += z[k];
    }
    var c1 = sIH / (sH + 1e-6), c2 = (sI - sIH) / (NN - sH + 1e-6);
    gradX(phi, px); gradY(phi, py);
    for (k = 0; k < NN; k++) {
      var g = Math.sqrt(px[k] * px[k] + py[k] * py[k]) + 1e-8;
      nx[k] = px[k] / g; ny[k] = py[k] / g;
    }
    gradX(nx, kx); gradY(ny, ky);
    for (k = 0; k < NN; k++) {
      var p = phi[k];
      var delta = EPS / (Math.PI * (EPS * EPS + p * p));
      var mu = F.mu[k], nu = F.nu[k], l1 = F.l1[k], l2 = F.l2[k];
      var a = z[k] - c1, b = z[k] - c2;
      var s = Math.abs(mu) + Math.abs(nu) + Math.abs(l1) + Math.abs(l2) + ETA;
      var v = p + delta * (mu * (kx[k] + ky[k]) - nu - l1 * a * a + l2 * b * b) / s;
      phi[k] = v > 3 ? 3 : v < -3 ? -3 : v;
    }
    step++;
  }

  function dice() {
    var tp = 0, ps = 0, gs = 0;
    for (var k = 0; k < NN; k++) {
      var s = phi[k] > 0;
      if (s) ps++;
      if (gt[k]) gs++;
      if (s && gt[k]) tp++;
    }
    return (2 * tp) / (ps + gs + 1e-9);
  }

  // ---------- 繪圖 ----------
  var cImg = $("cv-canvas-img"), cCmp = $("cv-canvas-cmp");
  var ctxI = cImg.getContext("2d"), ctxC = cCmp.getContext("2d");
  var bufI = ctxI.createImageData(N, N), bufC = ctxC.createImageData(N, N);

  function draw() {
    var di = bufI.data, dc = bufC.data;
    for (var k = 0; k < NN; k++) {
      var g = img8[k], o = k * 4, s = phi[k] > 0;
      // 左：影像＋分割外輪廓（青色）
      var edge = false;
      if (s) {
        var x = k % N, y = (k / N) | 0;
        edge = (x > 0 && !(phi[k - 1] > 0)) || (x < N - 1 && !(phi[k + 1] > 0)) ||
               (y > 0 && !(phi[k - N] > 0)) || (y < N - 1 && !(phi[k + N] > 0));
      }
      if (edge) { di[o] = 0; di[o + 1] = 229; di[o + 2] = 255; }
      else { di[o] = g; di[o + 1] = g; di[o + 2] = g; }
      di[o + 3] = 255;
      // 右：與真值對照（黃＝正確、紅＝漏檢、綠＝誤檢）
      var t = gt[k];
      if (s && t) { dc[o] = 255; dc[o + 1] = 221; dc[o + 2] = 0; }
      else if (!s && t) { dc[o] = 230; dc[o + 1] = 40; dc[o + 2] = 40; }
      else if (s && !t) { dc[o] = 40; dc[o + 1] = 200; dc[o + 2] = 60; }
      else { dc[o] = 0; dc[o + 1] = 0; dc[o + 2] = 0; }
      dc[o + 3] = 255;
    }
    ctxI.putImageData(bufI, 0, 0);
    ctxC.putImageData(bufC, 0, 0);
    $("cv-step").textContent = step;
    $("cv-dice").textContent = (dice() * 100).toFixed(1) + "%";
    $("cv-bar").style.width = (step / MAX_STEPS) * 100 + "%";
  }

  // 四個係數場的小圖（白 → 紫，與論文圖 3-6 同色系；四張共用同一色階）
  var fieldCanvases = ["mu", "nu", "l1", "l2"].map(function (k) { return { key: k, el: $("cv-f-" + k) }; });
  function drawFields() {
    var mx = 0, k, f;
    for (f = 0; f < 4; f++) {
      var arr = F[fieldCanvases[f].key];
      for (k = 0; k < NN; k++) if (arr[k] > mx) mx = arr[k];
    }
    mx = Math.max(mx, 1e-6);
    for (f = 0; f < 4; f++) {
      var c = fieldCanvases[f].el, ctx = c.getContext("2d"), buf = ctx.createImageData(N, N), d = buf.data;
      var a2 = F[fieldCanvases[f].key];
      for (k = 0; k < NN; k++) {
        var u = Math.min(1, a2[k] / mx), o = k * 4;
        d[o] = Math.round(255 - u * (255 - 63)); d[o + 1] = Math.round(255 - u * (255 - 0)); d[o + 2] = Math.round(255 - u * (255 - 125));
        d[o + 3] = 255;
      }
      ctx.putImageData(buf, 0, 0);
    }
    $("cv-fmax").textContent = mx.toFixed(2);
  }

  // ---------- 控制 ----------
  var timer = null;
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    root.classList.remove("is-playing");
  }
  function reset() {
    stop();
    phi.set(phi0); step = 0;
    buildFields(); drawFields(); draw();
  }
  function play() {
    if (timer) { stop(); return; }
    if (step >= MAX_STEPS) reset();
    root.classList.add("is-playing");
    timer = setInterval(function () {
      evolveOnce(); draw();
      if (step >= MAX_STEPS) stop();
    }, 70);
  }

  function syncMode() {
    var m = mode();
    root.dataset.mode = m;
    reset();
  }

  $("cv-play").addEventListener("click", play);
  $("cv-reset").addEventListener("click", reset);
  root.querySelectorAll("input[name=cv-mode]").forEach(function (r) { r.addEventListener("change", syncMode); });
  ["cv-mu", "cv-nu", "cv-l1", "cv-l2", "cv-nuadd"].forEach(function (id) {
    var el = $(id), out = $(id + "-v");
    el.addEventListener("input", function () { out.textContent = parseFloat(el.value).toFixed(2); reset(); });
    out.textContent = parseFloat(el.value).toFixed(2);
  });

  // 預設情境
  root.querySelectorAll("[data-preset]").forEach(function (b) {
    b.addEventListener("click", function () {
      var p = b.dataset.preset;
      var set = function (id, v) { $(id).value = v; $(id + "-v").textContent = Number(v).toFixed(2); };
      if (p === "global") { set("cv-mu", 0.2); set("cv-nu", 0); set("cv-l1", 1); set("cv-l2", 1); }
      if (p === "global-best") { set("cv-mu", 0.5); set("cv-nu", 1); set("cv-l1", 4); set("cv-l2", 2); }
      if (p === "pixel" || p === "flip" || p === "collapse") set("cv-nuadd", p === "collapse" ? 8 : 0);
      var m = p.indexOf("global") === 0 ? "global" : p === "flip" ? "flip" : "pixel";
      root.querySelector("input[name=cv-mode][value=" + m + "]").checked = true;
      root.dataset.mode = m;
      reset(); play();
    });
  });

  // 一進到畫面就自動播放一次
  root.dataset.mode = mode();
  reset();
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { play(); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(root);
  }
})();
