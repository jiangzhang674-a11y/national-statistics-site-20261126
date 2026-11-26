/* 中国国家统计站 —— 路由、画图接线、数据总表。
 * 数字全部取自 CHINA_STATS（app/data.js），图由 ChartKit
 * （app/charts.js）在浏览器本地画。全站不发任何网络请求。
 */
"use strict";

(function () {
  var S = CHINA_STATS;

  /* 页面上的开关状态：GDP 看几年、贸易看哪个口径、省份按什么排。 */
  var ui = { years: 10, trade: "total", prov: "gdp" };

  function $(id) { return document.getElementById(id); }
  function group(v) { return v.toLocaleString("en-US"); }
  function wanYi(v) { return (v / 10000).toFixed(2) + "万亿"; }
  function signed(v, digits) { return (v > 0 ? "+" : "") + v.toFixed(digits) + "%"; }

  /* ---------- 路由：8 个页面，顶部导航与首页卡片都能到达 ---------- */
  var PAGES = ["home", "economy", "population", "employment", "prices", "trade", "tables", "about"];

  function routeNow() {
    var hash = (location.hash || "#/").replace(/^#\/?/, "");
    return PAGES.indexOf(hash) >= 0 ? hash : "home";
  }

  function openPage(route) {
    PAGES.forEach(function (name) {
      var page = $("page-" + name);
      if (page) page.style.display = name === route ? "" : "none";
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#/" + route);
    });
    var pageEl = $("page-" + route);
    document.title = "中国国家统计 · " + (pageEl ? pageEl.getAttribute("data-title") : "首页");
    window.scrollTo(0, 0);
    paintPage(route);
  }
  window.addEventListener("hashchange", function () { openPage(routeNow()); });

  /* 只画当前页的图；切走再回来时重画一次。 */
  function paintPage(route) {
    requestAnimationFrame(function () {
      var paint = PAINTERS[route];
      if (paint) paint();
    });
  }

  function gdpRateRows() {
    return S.gdpRates.slice(-ui.years).map(function (r) {
      return { label: String(r.year), value: r.rate };
    });
  }

  function paintHome() {
    var c = $("chart-gdp-home");
    if (c) ChartKit.columns(c, gdpRateRows(), { unit: "%", decimals: 1 });
  }

  function paintEconomy() {
    var gdp = $("chart-gdp");
    if (gdp) ChartKit.columns(gdp, gdpRateRows(), { unit: "%", decimals: 1 });
    var quarter = $("chart-quarter");
    if (quarter) ChartKit.columns(quarter, S.gdpDetail.quarters.map(function (q) {
      return { label: q.q, value: q.rate };
    }), { unit: "%", decimals: 1 });
    var industry = $("chart-industry");
    if (industry) ChartKit.shareRing(industry, [
      { label: "第一产业 Primary", value: S.gdpDetail.primary.share, amount: S.gdpDetail.primary.value, color: "#2e7d6b" },
      { label: "第二产业 Secondary", value: S.gdpDetail.secondary.share, amount: S.gdpDetail.secondary.value, color: "#16324f" },
      { label: "第三产业 Tertiary", value: S.gdpDetail.tertiary.share, amount: S.gdpDetail.tertiary.value, color: "#b03a2e" }
    ]);
    paintProvinces();
  }

  function paintProvinces() {
    var c = $("chart-province");
    if (!c) return;
    var byGrowth = ui.prov === "growth";
    var rows = S.topProvinces.slice().sort(function (a, b) {
      return byGrowth ? b.growth - a.growth : b.gdp - a.gdp;
    });
    ChartKit.rankBars(c, rows.map(function (p) {
      return { label: p.name, value: byGrowth ? p.growth : p.gdp };
    }), { unit: byGrowth ? "%" : "亿元", decimals: byGrowth ? 1 : 0 });
    var note = $("prov-note");
    if (note) note.textContent = byGrowth
      ? "按2024年实际增速排序（%）。广东总量第一但增速 3.5% 居末。"
      : "按2024年地区生产总值排序（亿元）。广东连续36年居全国首位。";
  }

  function paintPopulation() {
    var pop = $("chart-pop");
    if (pop) ChartKit.trendLine(pop, S.popSeries.map(function (p) {
      return { label: String(p.year), value: p.total };
    }), { unit: "万人", decimals: 0 });
    var births = $("chart-births");
    if (births) ChartKit.columns(births, S.popSeries.map(function (p) {
      return { label: String(p.year), value: p.births, color: "#2e7d6b" };
    }), { unit: "万人", decimals: 0 });
    var age = $("chart-age");
    if (age) ChartKit.rankBars(age, S.ageMix.map(function (a) {
      return { label: a.group + " " + a.share + "%", value: a.value };
    }), { unit: "万人", decimals: 0 });
  }

  function paintEmployment() {
    var unemp = $("chart-unemp");
    if (unemp) ChartKit.trendLine(unemp, S.jobsSeries.map(function (e) {
      return { label: String(e.year), value: e.unemployment };
    }), { unit: "%", decimals: 1 });
    var jobs = $("chart-jobs");
    if (jobs) ChartKit.columns(jobs, S.jobsSeries.map(function (e) {
      return { label: String(e.year), value: e.newJobs };
    }), { unit: "万人", decimals: 0 });
  }

  function paintPrices() {
    var cpi = $("chart-cpi");
    if (cpi) ChartKit.trendLine(cpi, S.priceSeries.map(function (p) {
      return { label: String(p.year), value: p.cpi };
    }), { unit: "%", decimals: 1 });
    var cats = $("chart-cpi-cat");
    if (cats) ChartKit.rankBars(cats, S.cpiGroups.map(function (cat) {
      return { label: cat.name, value: cat.change, color: cat.change < 0 ? "#2e7d6b" : "#b03a2e" };
    }), { unit: "%", decimals: 1 });
  }

  function paintTrade() {
    var c = $("chart-trade");
    if (!c) return;
    if (ui.trade === "total") {
      ChartKit.stackedColumns(c, S.tradeSeries.map(function (t) {
        return { label: String(t.year), a: t.exports, b: t.imports };
      }), { unit: "亿元", aLabel: "出口 Exports", bLabel: "进口 Imports" });
    } else {
      var key = ui.trade === "exports" ? "exports" : "imports";
      ChartKit.columns(c, S.tradeSeries.map(function (t) {
        return { label: String(t.year), value: t[key] };
      }), { unit: "亿元", decimals: 0 });
    }
    var note = $("trade-note");
    if (note) note.textContent = ui.trade === "total"
      ? "堆叠柱：下段出口、上段进口；柱顶数字为进出口总额。"
      : ui.trade === "exports"
        ? "只看出口：2024年出口 25.45万亿元，增长 7.1%。"
        : "只看进口：2024年进口 18.39万亿元，增长 2.3%。";
  }

  /* 每页一张图的画法，路由按名字查表调用。 */
  var PAINTERS = {
    home: paintHome,
    economy: paintEconomy,
    population: paintPopulation,
    employment: paintEmployment,
    prices: paintPrices,
    trade: paintTrade
  };

  /* ---------- 数据总表：2021–2024 年主要指标 ----------
   * GDP 总量与增速直接取 data.js 的 gdpLevels（第五次全国经济
   * 普查修订后数：2021 年 1173823 亿元 +8.6%，2022 年 1234029 亿元
   * +3.1%，2023 年 1294272 亿元 +5.4%；2024 年为初步核算数），
   * 页面代码里不另写数字，避免两处口径打架。
   *
   * 列定义是总表的唯一口径：渲染、点列头排序、下载 CSV 都
   * 读同一份 COLUMNS，改一处三处一起变。 */
  var COLUMNS = [
    { key: "year", head: "年份" },
    { key: "gdp", head: "国内生产总值" },
    { key: "pop", head: "年末人口" },
    { key: "urban", head: "城镇化率" },
    { key: "unemp", head: "城镇调查失业率" },
    { key: "jobs", head: "城镇新增就业" },
    { key: "cpi", head: "CPI" },
    { key: "ppi", head: "PPI" },
    { key: "trade", head: "货物进出口总额" },
    { key: "income", head: "人均可支配收入" },
    { key: "retail", head: "社会消费品零售总额" }
  ];

  /* 把各条年度数列按年份并成一行：每行先有 GDP，再由各数列
   * 往对应年份上贴格子，缺的年份留空，渲染时显示“—”。 */
  var MASTER_ROWS = (function mergeYearRows() {
    var byYear = {};
    S.gdpLevels.forEach(function (g) {
      byYear[g.year] = {
        year: g.year,
        gdp: group(g.total) + "亿元（" + signed(g.rate, 1) + "）"
      };
    });
    function cell(year, key, value) {
      if (byYear[year]) byYear[year][key] = value;
    }
    S.popSeries.forEach(function (p) {
      cell(p.year, "pop", p.total + "万人（" + (p.naturalRate > 0 ? "+" : "") + p.naturalRate + "‰）");
      cell(p.year, "urban", p.urbanRate + "%");
    });
    S.jobsSeries.forEach(function (e) {
      cell(e.year, "unemp", e.unemployment + "%");
      cell(e.year, "jobs", e.newJobs + "万人");
    });
    S.priceSeries.forEach(function (p) {
      cell(p.year, "cpi", signed(p.cpi, 1));
      cell(p.year, "ppi", signed(p.ppi, 1));
    });
    S.tradeSeries.forEach(function (t) {
      if (t.year >= 2021) cell(t.year, "trade", wanYi(t.total) + "（" + signed(t.growth, 1) + "）");
    });
    S.incomeSeries.forEach(function (i) { cell(i.year, "income", i.disposable + "元"); });
    S.retailSeries.forEach(function (r) {
      cell(r.year, "retail", r.total + "亿元（" + signed(r.growth, 1) + "）");
    });
    return Object.keys(byYear).map(function (y) { return byYear[y]; });
  })();

  /* 当前排序：默认按年份倒序。 */
  var sortState = { key: "year", dir: -1 };

  function paintTable() {
    var query = ($("table-search").value || "").trim().toLowerCase();
    var body = $("master-table-body");
    var rows = MASTER_ROWS.filter(function (r) {
      if (!query) return true;
      return JSON.stringify(r).toLowerCase().indexOf(query) >= 0;
    });
    rows.sort(function (a, b) {
      var key = sortState.key, dir = sortState.dir;
      var av = a[key], bv = b[key];
      if (av == null) return 1;
      if (bv == null) return -1;
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir;
    });
    body.innerHTML = rows.map(function (r) {
      return "<tr>" + COLUMNS.map(function (col) {
        return "<td>" + (r[col.key] == null ? "—" : r[col.key]) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    $("table-count").textContent = "共 " + rows.length + " 行（2021–2024年）";
  }

  function saveCSV() {
    var lines = [COLUMNS.map(function (col) { return col.head; }).join(",")];
    MASTER_ROWS.slice().sort(function (a, b) { return a.year - b.year; }).forEach(function (r) {
      lines.push(COLUMNS.map(function (col) {
        var v = r[col.key] == null ? "" : String(r[col.key]);
        return '"' + v.replace(/"/g, '""') + '"';
      }).join(","));
    });
    var blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "china-key-indicators-2021-2024.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- 控件接线 ---------- */
  function bindToggle(id, onPick) {
    var el = $(id);
    if (!el) return;
    el.addEventListener("click", function (ev) {
      var btn = ev.target.closest("button");
      if (!btn) return;
      el.querySelectorAll("button").forEach(function (b) { b.classList.remove("on"); });
      btn.classList.add("on");
      onPick(btn.getAttribute("data-v"));
    });
  }

  function setGdpYears(v) {
    ui.years = parseInt(v, 10);
    paintHome();
    paintEconomy();
  }
  bindToggle("gdp-range", setGdpYears);
  bindToggle("gdp-range-eco", setGdpYears);
  bindToggle("trade-metric", function (v) { ui.trade = v; paintTrade(); });
  bindToggle("prov-sort", function (v) { ui.prov = v; paintProvinces(); });

  var search = $("table-search");
  if (search) search.addEventListener("input", paintTable);
  var csvBtn = $("csv-btn");
  if (csvBtn) csvBtn.addEventListener("click", saveCSV);

  document.querySelectorAll("#master-table th[data-k]").forEach(function (th) {
    th.addEventListener("click", function () {
      var k = th.getAttribute("data-k");
      if (sortState.key === k) sortState.dir *= -1;
      else { sortState.key = k; sortState.dir = 1; }
      document.querySelectorAll("#master-table th").forEach(function (x) { x.classList.remove("sorted"); });
      th.classList.add("sorted");
      paintTable();
    });
  });

  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { paintPage(routeNow()); }, 150);
  });

  paintTable();
  openPage(routeNow());
})();
