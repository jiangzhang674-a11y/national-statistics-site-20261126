/* 手绘 canvas 图表 —— 不引任何库、不发网络请求。
 *
 * 画法：每张图先由 openSurface 按设备像素比备好画布，再由
 * 五个绘图函数之一画出来；悬停（或手机上点按）时按预先算
 * 好的热区显示精确数值。窗口尺寸变化时 app.js 会重画当前页。
 * 数字全部来自 CHINA_STATS（app/data.js），这里只管画。
 */
"use strict";

var ChartKit = (function () {
  /* 站内图表共用的配色与墨色。 */
  var INK = ["#b03a2e", "#16324f", "#2e7d6b", "#b98a2f", "#5b7fa6", "#7a4a6e", "#3f6b4f", "#8a6d3b"];
  var GRID_LINE = "#e3ddd2";
  var AXIS_LINE = "#8a8378";
  var LABEL_INK = "#33414f";
  var PAPER = "#f7f4ee";

  /* 备好一块画布：按 devicePixelRatio 放大像素再缩回 CSS 尺寸，
   * 这样在高分屏上字和线都不糊。画布没有尺寸时返回 null。 */
  function openSurface(canvas) {
    var ratio = window.devicePixelRatio || 1;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return null;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif";
    return { canvas: canvas, ctx: ctx, w: w, h: h };
  }

  /* 把一个上限凑成 1、2、2.5、5、10 这样的整齐数，y 轴好看。 */
  function roundUpCeil(v) {
    if (v <= 0) return 1;
    var power = Math.pow(10, Math.floor(Math.log10(v)));
    var scaled = v / power;
    var step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
    return step * power;
  }

  /* 数值 v 在 [lo, hi] 区间里对应的画布 y 坐标。 */
  function scaleY(s, inset, v, lo, hi) {
    return inset.t + (s.h - inset.t - inset.b) * (1 - (v - lo) / (hi - lo));
  }

  /* 大数字缩成“万”：1234029 → “123.4万”，整数不带小数点。 */
  function compact(v) {
    if (Math.abs(v) >= 10000) return (v / 10000).toFixed(v % 10000 === 0 ? 0 : 1) + "万";
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(1);
  }

  function labelValue(v, decimals, unit) {
    return (decimals != null ? v.toFixed(decimals) : compact(v)) + (unit || "");
  }

  /* 画 4 档横网格线与左端刻度；unit 只标在最上面一档。 */
  function paintGrid(s, inset, lo, hi, unit, decimals) {
    var ctx = s.ctx;
    ctx.strokeStyle = GRID_LINE; ctx.fillStyle = AXIS_LINE; ctx.lineWidth = 1;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var i = 0; i <= 4; i++) {
      var v = lo + (hi - lo) * i / 4;
      var y = scaleY(s, inset, v, lo, hi);
      ctx.beginPath(); ctx.moveTo(inset.l, y); ctx.lineTo(s.w - inset.r, y); ctx.stroke();
      var text = decimals != null ? v.toFixed(decimals) : compact(v);
      ctx.fillText(text + (i === 4 && unit ? " " + unit : ""), inset.l - 6, y);
    }
  }

  /* 在画布旁（相对画布容器定位）浮出一张数值小卡片。 */
  function popTip(canvas, rows, clientX, clientY) {
    var stale = canvas.parentNode.querySelector(".chart-tip");
    if (stale) stale.remove();
    if (!rows) return;
    var card = document.createElement("div");
    card.className = "chart-tip";
    card.innerHTML = rows.map(function (row) {
      return "<div><b>" + row.label + "</b> " + row.value + "</div>";
    }).join("");
    var rect = canvas.getBoundingClientRect();
    card.style.left = Math.min(Math.max(clientX - rect.left + 12, 4), rect.width - 170) + "px";
    card.style.top = Math.max(clientY - rect.top - 10, 4) + "px";
    canvas.parentNode.appendChild(card);
  }

  function zoneAt(zones, x, y) {
    for (var i = 0; i < zones.length; i++) {
      var z = zones[i];
      if (x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1) return z;
    }
    return null;
  }

  /* 给一张图挂上悬停与点按：鼠标移过热区显示数值，移出消失；
   * 手机没有悬停，点一下热区同样显示。 */
  function bindHover(canvas, zones, describe) {
    function pointAt(ev) {
      var rect = canvas.getBoundingClientRect();
      return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    }
    canvas.addEventListener("mousemove", function (ev) {
      var p = pointAt(ev);
      var z = zoneAt(zones, p.x, p.y);
      if (z) { popTip(canvas, describe(z), ev.clientX, ev.clientY); canvas.style.cursor = "pointer"; }
      else { popTip(canvas, null); canvas.style.cursor = "default"; }
    });
    canvas.addEventListener("click", function (ev) {
      var p = pointAt(ev);
      var z = zoneAt(zones, p.x, p.y);
      popTip(canvas, z ? describe(z) : null, ev.clientX, ev.clientY);
    });
    canvas.addEventListener("mouseleave", function () { popTip(canvas, null); });
  }

  /* 纵向柱状图。rows: [{label, value, color?}]；opts: {unit, decimals}。
   * 有负值时 y 轴向下延，零线单独描一遍。 */
  function columns(canvas, rows, opts) {
    opts = opts || {};
    var s = openSurface(canvas); if (!s) return;
    var ctx = s.ctx;
    var inset = { l: 76, r: 12, t: 14, b: 30 };
    var values = rows.map(function (r) { return r.value; });
    var hi = roundUpCeil(Math.max.apply(null, values) * 1.08);
    var lo = 0;
    if (Math.min.apply(null, values) < 0) lo = -roundUpCeil(-Math.min.apply(null, values) * 1.15);
    paintGrid(s, inset, lo, hi, opts.unit, opts.decimals);
    var slot = (s.w - inset.l - inset.r) / rows.length;
    var bw = Math.min(slot * 0.62, 64);
    var zeroY = scaleY(s, inset, 0, lo, hi);
    var zones = [];
    rows.forEach(function (r, i) {
      var cx = inset.l + slot * i + slot / 2;
      var x = cx - bw / 2;
      var y = scaleY(s, inset, r.value, lo, hi);
      ctx.fillStyle = r.color || INK[i % INK.length];
      if (r.value >= 0) ctx.fillRect(x, y, bw, zeroY - y);
      else ctx.fillRect(x, zeroY, bw, y - zeroY);
      ctx.fillStyle = LABEL_INK; ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(r.label, cx, s.h - 20);
      var text = labelValue(r.value, opts.decimals, opts.unit);
      if (r.value >= 0) { ctx.textBaseline = "bottom"; ctx.fillText(text, cx, y - 4); }
      else { ctx.textBaseline = "top"; ctx.fillText(text, cx, y + 4); }
      zones.push({ x0: x - 4, x1: x + bw + 4, y0: Math.min(y, zeroY), y1: Math.max(y, zeroY), row: r });
    });
    ctx.strokeStyle = AXIS_LINE;
    ctx.beginPath(); ctx.moveTo(inset.l, zeroY); ctx.lineTo(s.w - inset.r, zeroY); ctx.stroke();
    bindHover(canvas, zones, function (z) {
      return [{ label: z.row.label, value: labelValue(z.row.value, opts.decimals, opts.unit) }];
    });
  }

  /* 折线图。rows: [{label, value}]。首尾两点的数值标在点外侧，
   * 中间的标在点正上方，免得撞到线。 */
  function trendLine(canvas, rows, opts) {
    opts = opts || {};
    var s = openSurface(canvas); if (!s) return;
    var ctx = s.ctx;
    var inset = { l: 76, r: 16, t: 16, b: 30 };
    var values = rows.map(function (r) { return r.value; });
    var span = (Math.max.apply(null, values) - Math.min.apply(null, values)) || 1;
    var lo = Math.min.apply(null, values) - span * 0.25;
    var hi = Math.max.apply(null, values) + span * 0.25;
    paintGrid(s, inset, lo, hi, opts.unit, opts.decimals);
    var n = rows.length;
    function X(i) { return inset.l + (s.w - inset.l - inset.r) * (n === 1 ? 0.5 : i / (n - 1)); }
    function Y(v) { return scaleY(s, inset, v, lo, hi); }
    ctx.strokeStyle = INK[0]; ctx.lineWidth = 2.5; ctx.beginPath();
    rows.forEach(function (r, i) {
      if (i === 0) ctx.moveTo(X(i), Y(r.value)); else ctx.lineTo(X(i), Y(r.value));
    });
    ctx.stroke();
    var zones = [];
    rows.forEach(function (r, i) {
      ctx.fillStyle = "#fff"; ctx.strokeStyle = INK[0]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(i), Y(r.value), 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = LABEL_INK; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(r.label, X(i), s.h - 20);
      var text = labelValue(r.value, opts.decimals, opts.unit);
      ctx.textBaseline = "bottom";
      if (i === 0) { ctx.textAlign = "left"; ctx.fillText(text, X(i) + 8, Y(r.value) - 8); }
      else if (i === n - 1) { ctx.textAlign = "right"; ctx.fillText(text, X(i) - 8, Y(r.value) - 8); }
      else { ctx.textAlign = "center"; ctx.fillText(text, X(i), Y(r.value) - 10); }
      zones.push({ x0: X(i) - 24, x1: X(i) + 24, y0: Y(r.value) - 16, y1: Y(r.value) + 16, row: r });
    });
    bindHover(canvas, zones, function (z) {
      return [{ label: z.row.label, value: labelValue(z.row.value, opts.decimals, opts.unit) }];
    });
  }

  /* 堆叠柱：下段 a、上段 b，柱顶标合计。rows: [{label, a, b}]。 */
  function stackedColumns(canvas, rows, opts) {
    opts = opts || {};
    var s = openSurface(canvas); if (!s) return;
    var ctx = s.ctx;
    var inset = { l: 76, r: 12, t: 14, b: 30 };
    var hi = roundUpCeil(Math.max.apply(null, rows.map(function (r) { return r.a + r.b; })) * 1.06);
    paintGrid(s, inset, 0, hi, opts.unit);
    var slot = (s.w - inset.l - inset.r) / rows.length;
    var bw = Math.min(slot * 0.6, 72);
    var zones = [];
    rows.forEach(function (r, i) {
      var cx = inset.l + slot * i + slot / 2;
      var x = cx - bw / 2;
      var total = r.a + r.b;
      var topY = scaleY(s, inset, total, 0, hi);
      var midY = scaleY(s, inset, r.a, 0, hi);
      ctx.fillStyle = INK[0]; ctx.fillRect(x, topY, bw, midY - topY);
      ctx.fillStyle = INK[1]; ctx.fillRect(x, midY, bw, s.h - inset.b - midY);
      ctx.fillStyle = LABEL_INK; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(r.label, cx, s.h - 20);
      ctx.textBaseline = "bottom";
      ctx.fillText(compact(total) + (opts.unit || ""), cx, topY - 4);
      zones.push({ x0: x - 4, x1: x + bw + 4, y0: topY, y1: s.h - inset.b, row: r });
    });
    bindHover(canvas, zones, function (z) {
      return [
        { label: z.row.label + " · 总额", value: compact(z.row.a + z.row.b) + (opts.unit || "") },
        { label: opts.aLabel || "出口", value: compact(z.row.a) + (opts.unit || "") },
        { label: opts.bLabel || "进口", value: compact(z.row.b) + (opts.unit || "") }
      ];
    });
  }

  /* 环形图：value 为占比 %，amount 为绝对数。图例写在环的右
   * 边，不往环里塞字，窄屏也不会撞字。 */
  function shareRing(canvas, rows, opts) {
    opts = opts || {};
    var s = openSurface(canvas); if (!s) return;
    var ctx = s.ctx;
    var total = rows.reduce(function (sum, r) { return sum + r.value; }, 0);
    var cx = s.w * 0.5 - 70, cy = s.h / 2;
    var R = Math.min(s.w * 0.24, s.h * 0.40), r0 = R * 0.58;
    var arcs = [];
    var start = -Math.PI / 2;
    rows.forEach(function (row, i) {
      var end = start + Math.PI * 2 * row.value / total;
      ctx.beginPath();
      ctx.fillStyle = row.color || INK[i % INK.length];
      ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, start, end); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = PAPER;
      ctx.moveTo(cx, cy); ctx.arc(cx, cy, r0, start, end); ctx.closePath(); ctx.fill();
      arcs.push({ row: row, a0: start, a1: end });
      start = end;
    });
    ctx.fillStyle = LABEL_INK; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText("三产结构", cx, cy - 8);
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("2024", cx, cy + 10);
    var lx = cx + R + 18, ly = cy - rows.length * 13;
    rows.forEach(function (row, i) {
      ctx.fillStyle = row.color || INK[i % INK.length];
      ctx.fillRect(lx, ly + i * 26, 12, 12);
      ctx.fillStyle = LABEL_INK; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      var short = row.label.split(" ")[0];
      ctx.fillText(short + " " + compact(row.amount) + "亿 · " + row.value.toFixed(1) + "%", lx + 18, ly + i * 26 + 6);
    });
    function ringTip(ev) {
      var rect = canvas.getBoundingClientRect();
      var dx = ev.clientX - rect.left - cx, dy = ev.clientY - rect.top - cy;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < r0 || d > R) { popTip(canvas, null); return; }
      var ang = Math.atan2(dy, dx);
      for (var i = 0; i < arcs.length; i++) {
        var a = arcs[i];
        var adjusted = ang < a.a0 ? ang + Math.PI * 2 : ang;
        if (adjusted >= a.a0 && adjusted <= a.a1) {
          popTip(canvas, [{ label: a.row.label, value: compact(a.row.amount) + "亿元 · " + a.row.value.toFixed(1) + "%" }], ev.clientX, ev.clientY);
          return;
        }
      }
      popTip(canvas, null);
    }
    canvas.addEventListener("mousemove", ringTip);
    canvas.addEventListener("click", ringTip);
    canvas.addEventListener("mouseleave", function () { popTip(canvas, null); });
  }

  /* 横向条形图：标签写在条上方，长名不撞数值；数值标在条尾。
   * rows: [{label, value, color?}] */
  function rankBars(canvas, rows, opts) {
    opts = opts || {};
    var s = openSurface(canvas); if (!s) return;
    var ctx = s.ctx;
    var inset = { l: 8, r: 64, t: 10, b: 8 };
    var peak = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.value); })) * 1.08;
    var slot = (s.h - inset.t - inset.b) / rows.length;
    var bh = Math.min(13, slot - 20);
    var zones = [];
    rows.forEach(function (r, i) {
      var y = inset.t + slot * i;
      var barY = y + 17;
      var w = (s.w - inset.l - inset.r) * Math.abs(r.value) / peak;
      ctx.fillStyle = r.color || INK[i % INK.length];
      ctx.fillRect(inset.l, barY, Math.max(w, 2), bh);
      ctx.fillStyle = LABEL_INK; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(r.label, inset.l + 2, y + 8);
      ctx.fillText(labelValue(r.value, opts.decimals, opts.unit), inset.l + w + 8, barY + bh / 2);
      zones.push({ x0: inset.l, x1: inset.l + w + 60, y0: y, y1: barY + bh, row: r });
    });
    bindHover(canvas, zones, function (z) {
      return [{ label: z.row.label, value: labelValue(z.row.value, opts.decimals, opts.unit) }];
    });
  }

  return { columns: columns, trendLine: trendLine, stackedColumns: stackedColumns, shareRing: shareRing, rankBars: rankBars };
})();
