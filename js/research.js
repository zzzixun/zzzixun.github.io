/* 研究區塊的互動：拖曳比較、演化動畫、兩張圖表（語言與深色模式由 main.js 處理） */
(function () {
  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };
  var lang = function () { return root.dataset.lang === "en" ? "en" : "zh"; };
  var T = function (zh, en) { return lang() === "en" ? en : zh; };

  // ---------- ① 拖曳比較 ----------
  var CASES = {
    best: {
      base: 65.74, ours: 89.72, zb: [64.36, 64.08, 64.04], zo: [90.54, 93.72, 93.97],
      note: ["兩方法找到的神經大致相同，差別在外緣：基線的每條神經都被一層誤檢包住（偽陽性 16,059 像素），相鄰神經黏成一團；本方法降到 2,878 像素，輪廓貼合神經本身。",
             "Both methods find roughly the same nerves; the difference is at the edges. The baseline wraps every nerve in a layer of false positives (16,059 pixels) and merges neighbours; the proposed method cuts this to 2,878 pixels and the contour hugs the nerve itself."]
    },
    median: {
      base: 59.42, ours: 76.27, zb: [60.63, 61.47, 54.53], zo: [79.56, 86.93, 80.08],
      note: ["DSC 最接近 438 張全體中位數的一張，代表典型表現。下方三個放大框選在兩方法差異最大之處，整體表現以全圖為準。",
             "The image closest to the median DSC across all 438 images, showing typical performance. The three zoom boxes below are where the two methods differ most; judge overall performance by the full image."]
    }
  };
  var cur = "best";
  var A = "img/research/";
  function renderCase() {
    var c = CASES[cur];
    $("rx-base").src = A + cur + "-whole-base.webp";
    $("rx-ours").src = A + cur + "-whole-ours.webp";
    $("rx-dsc-base").textContent = c.base.toFixed(2) + "%";
    $("rx-dsc-ours").textContent = c.ours.toFixed(2) + "%";
    var h = '<span class="rl">' + T("基線", "Baseline") + "</span>";
    for (var i = 0; i < 3; i++) h += '<figure><img src="' + A + cur + "-zoom-base-" + (i + 1) + '.webp" alt="" loading="lazy"><figcaption>DSC <b>' + c.zb[i].toFixed(2) + "%</b></figcaption></figure>";
    h += '<span class="rl">' + T("本方法", "Proposed") + "</span>";
    for (i = 0; i < 3; i++) h += '<figure><img src="' + A + cur + "-zoom-ours-" + (i + 1) + '.webp" alt="" loading="lazy"><figcaption>DSC <b>' + c.zo[i].toFixed(2) + "%</b></figcaption></figure>";
    $("rx-zooms").innerHTML = h;
    $("rx-case-note").textContent = c.note[lang() === "en" ? 1 : 0];
  }
  document.querySelectorAll(".rx-tab").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".rx-tab").forEach(function (x) { x.classList.toggle("is-on", x === b); x.setAttribute("aria-selected", x === b); });
      cur = b.dataset.case; renderCase();
    });
  });
  var slider = $("rx-slider"), range = slider.querySelector("input");
  range.addEventListener("input", function () { slider.style.setProperty("--pos", range.value + "%"); });
  renderCase();

  // ---------- ② 演化動畫 ----------
  var EVO = [["s00", 0, 55.2], ["s01", 1, 76.4], ["s05", 5, 85.6], ["s15", 15, 87.4], ["s30", 30, 87.9]];
  EVO.forEach(function (e) { new Image().src = A + "evo-" + e[0] + ".webp"; });
  var ei = 0;
  setInterval(function () {
    ei = (ei + 1) % EVO.length;
    $("rx-evo-img").src = A + "evo-" + EVO[ei][0] + ".webp";
    $("rx-evo-step").textContent = EVO[ei][1];
    $("rx-evo-dsc").textContent = EVO[ei][2].toFixed(1) + "%";
  }, 1100);

  // ---------- ④ 圖表 ----------
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function tipper(host) {
    var tip = document.createElement("div"); tip.className = "rx-tip"; host.appendChild(tip);
    return function (target, text) {
      var show = function () {
        var hb = host.getBoundingClientRect(), tb = target.getBoundingClientRect();
        tip.textContent = text; tip.style.left = (tb.left + tb.width / 2 - hb.left) + "px"; tip.style.top = (tb.top - hb.top) + "px";
        tip.classList.add("on");
      };
      target.addEventListener("mouseenter", show);
      target.addEventListener("click", show);
      target.addEventListener("mouseleave", function () { tip.classList.remove("on"); });
    };
  }

  function drawLadder() {
    var host = $("rx-ladder"); host.innerHTML = "";
    var W = 520, H = 300, L = 40, R = 512, Tp = 16, B = 250, y0 = 50, y1 = 72;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": T("自由度階梯", "Resolution ladder") }, host);
    var Y = function (v) { return B - (v - y0) / (y1 - y0) * (B - Tp); };
    for (var g = 50; g <= 70; g += 5) {
      el("line", { x1: L, x2: R, y1: Y(g), y2: Y(g), class: "grid" }, svg);
      el("text", { x: L - 6, y: Y(g) + 4, "text-anchor": "end", class: "axis-t" }, svg, g);
    }
    var lad = [[T("純量", "Scalar"), 53.99], ["4×4", 58.54], ["8×8", 63.42], ["16×16", 67.54], ["32×32", 69.68], [T("逐像素", "Per-pixel"), 70.86]];
    var x0 = 62, dx = 52, pts = [];
    lad.forEach(function (d, i) { pts.push([x0 + i * dx, Y(d[1])]); });
    el("path", { d: "M" + pts.map(function (p) { return p.join(","); }).join("L"), class: "line" }, svg);
    var tip = tipper(host);
    lad.forEach(function (d, i) {
      el("text", { x: pts[i][0], y: B + 18, "text-anchor": "middle", class: "axis-t" }, svg, d[0]);
      el("circle", { cx: pts[i][0], cy: pts[i][1], r: 5, class: "dot" }, svg);
      var hit = el("rect", { x: pts[i][0] - 20, y: Tp, width: 40, height: B - Tp, class: "hit" }, svg);
      tip(hit, d[0] + "：" + d[1].toFixed(2) + "%");
    });
    el("text", { x: pts[0][0], y: pts[0][1] + 20, "text-anchor": "middle", class: "lbl" }, svg, "53.99");
    el("text", { x: pts[5][0] - 4, y: pts[5][1] - 12, "text-anchor": "end", class: "lbl" }, svg, "70.86");
    el("text", { x: (x0 + x0 + 5 * dx) / 2, y: B + 40, "text-anchor": "middle", class: "axis-t" }, svg, T("係數場解析度", "Coefficient-field resolution"));

    // 右側：七種架構
    var ax0 = 390, ax1 = 500;
    el("line", { x1: 362, x2: 362, y1: Tp, y2: B, class: "grid" }, svg);
    var arch = [["寬度 48（主方法）", "Width 48 (main)", 70.86, "17.5M"], ["深度 3 + 寬度 48", "Depth 3 + width 48", 70.72, "4.3M"], ["深度 3", "Depth 3", 70.66, "1.9M"],
                ["寬度 64", "Width 64", 70.60, "31.0M"], ["寬度 32", "Width 32", 70.39, "7.8M"], ["Dilated FCN", "Dilated FCN", 70.36, "0.2M"], ["深度 5", "Depth 5", 70.30, "31.1M"]];
    el("rect", { x: ax0 - 10, y: Y(70.86) - 3, width: ax1 - ax0 + 20, height: Y(70.30) - Y(70.86) + 6, rx: 4, class: "band" }, svg);
    arch.forEach(function (d, i) {
      var cx = ax0 + i * (ax1 - ax0) / 6;
      el("circle", { cx: cx, cy: Y(d[2]), r: 4.5, class: "dot" + (i ? " alt" : "") }, svg);
      var hit = el("rect", { x: cx - 8, y: Y(d[2]) - 14, width: 16, height: 28, class: "hit" }, svg);
      tip(hit, T(d[0], d[1]) + "：" + d[2].toFixed(2) + "%，" + T("參數 ", "params ") + d[3]);
    });
    el("text", { x: (ax0 + ax1) / 2, y: Y(70.30) + 22, "text-anchor": "middle", class: "lbl" }, svg, T("全距 0.56", "range 0.56"));
    el("text", { x: (ax0 + ax1) / 2, y: Y(70.30) + 38, "text-anchor": "middle", class: "axis-t" }, svg, T("參數量相差 155 倍", "155× parameter span"));
    el("text", { x: (ax0 + ax1) / 2, y: B + 18, "text-anchor": "middle", class: "axis-t" }, svg, T("七種架構", "7 architectures"));
    el("text", { x: 8, y: Tp - 4, class: "axis-t" }, svg, T("全圖 DSC (%)", "Full-image DSC (%)"));
  }

  function drawFlip() {
    var host = $("rx-flip"); host.innerHTML = "";
    var rows = [
      [T("原樣（網路預測的係數場）", "As predicted"), 63.37, "main"],
      [T("固定常數，完全不看影像", "Fixed constants, ignore image"), 43.44, ""],
      [T("每個區塊取空間平均", "Spatial mean per patch"), 43.26, ""],
      [T("係數場上下左右翻轉", "Fields flipped"), 31.83, "bad"]
    ];
    var W = 520, rowH = 58, Tp = 8, H = Tp + rows.length * rowH + 20, L = 8, R = 470, xmax = 70;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": T("翻轉實驗", "Flip experiment") }, host);
    var X = function (v) { return L + v / xmax * (R - L); };
    var tip = tipper(host);
    rows.forEach(function (d, i) {
      var y = Tp + i * rowH;
      el("text", { x: L, y: y + 14, class: "axis-t" }, svg, d[0]);
      var bar = el("rect", { x: L, y: y + 22, width: X(d[1]) - L, height: 20, rx: 4, class: "bar " + d[2] }, svg);
      el("text", { x: X(d[1]) + 6, y: y + 37, class: "lbl" }, svg, d[1].toFixed(2));
      tip(bar, d[0] + "：" + d[1].toFixed(2) + "%");
    });
    el("text", { x: L, y: H - 2, class: "axis-t" }, svg, T("區塊影像 DSC (%)，0 起算", "Patch-level DSC (%), axis from 0"));
  }

  function drawCharts() { drawLadder(); drawFlip(); }
  drawCharts();

  // 放大框說明與圖表文字由 JS 依語言產生；main.js 切換 data-lang 時重畫
  new MutationObserver(function () { renderCase(); drawCharts(); })
    .observe(root, { attributes: true, attributeFilter: ["data-lang"] });
})();
