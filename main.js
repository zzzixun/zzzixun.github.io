(function () {
  var root = document.documentElement;

  function store(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }

  // ---------- 中英切換 ----------
  var titles = { zh: "尤梓薰 Yu Tzu-Hsun", en: "Yu Tzu-Hsun 尤梓薰" };
  function setLang(lang) {
    if (lang === "en") root.dataset.lang = "en"; else delete root.dataset.lang;
    root.lang = lang === "en" ? "en" : "zh-Hant";
    document.title = titles[lang] || titles.zh;
    store("lang", lang);
  }
  document.getElementById("lang-btn").addEventListener("click", function () {
    setLang(root.dataset.lang === "en" ? "zh" : "en");
  });
  if (root.dataset.lang === "en") document.title = titles.en;

  // ---------- 深色模式 ----------
  document.getElementById("theme-btn").addEventListener("click", function () {
    var dark = root.dataset.theme
      ? root.dataset.theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    store("theme", root.dataset.theme);
  });

  // ---------- 手機選單 ----------
  var menuBtn = document.getElementById("menu-btn");
  var links = document.getElementById("nav-links");
  menuBtn.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  links.addEventListener("click", function (e) {
    if (e.target.closest("a")) { links.classList.remove("open"); menuBtn.setAttribute("aria-expanded", false); }
  });

  // ---------- 信箱：點擊後才組出地址，避免被爬蟲抓取 ----------
  var emailBtn = document.getElementById("email-btn");
  emailBtn.addEventListener("click", function () {
    var addr = ["az", "1999", "0908"].join("") + "@" + ["gmail", "com"].join(".");
    var a = document.createElement("a");
    a.className = "btn btn-primary";
    a.href = "mailto:" + addr;
    a.textContent = addr;
    emailBtn.replaceWith(a);
    location.href = a.href;
  });
})();
