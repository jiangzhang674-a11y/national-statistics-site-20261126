/* 中国国家统计站 —— 站内全部数字的数据底本。
 *
 * 每一个数字都能在国家统计局或海关总署的公开报刊里找到出处，
 * 本文件只做搬运和整理，不做估算、不编数字。金额以亿元计，
 * 人口以万人计，比率以 % 计，另有说明的地方除外。
 *
 * 口径：2021–2023 年的 GDP 总量与增速，采用第五次全国经济
 * 普查修订后的数字；2024 年的 GDP 采用初步核算数。脚注与
 * 总表都按这个口径写，不再混用旧的初步核算数。
 *
 * 写法：成行的年度数字先写成紧凑的数表，再由 zipFields 按列
 * 名拼成对象；单年的明细直接写成对象。这样数字和结构分开，
 * 改数字不用动结构。
 */
"use strict";

/* 把列名和数表拼成对象数组，例如
 * zipFields(["year", "total"], [[2021, 1173823]]) →
 * [{ year: 2021, total: 1173823 }]。 */
function zipFields(names, tuples) {
  return tuples.map(function (tuple) {
    var row = {};
    names.forEach(function (name, i) { row[name] = tuple[i]; });
    return row;
  });
}

var CHINA_STATS = {
  meta: {
    country: "China",
    countryZh: "中国",
    latestYear: 2024,
    updated: "2025-02-28",
    unitNote: "金额单位：亿元；人口单位：万人；比率单位：%"
  },

  /* 出处清单。about 页的文字版与这里一一对应。 */
  refs: [
    { id: "nbs2024", text: "国家统计局《中华人民共和国2024年国民经济和社会发展统计公报》，2025年2月28日" },
    { id: "nbs2023", text: "国家统计局《中华人民共和国2023年国民经济和社会发展统计公报》，2024年2月29日" },
    { id: "nbs2022", text: "国家统计局《中华人民共和国2022年国民经济和社会发展统计公报》，2023年2月28日" },
    { id: "nbs2021", text: "国家统计局《中华人民共和国2021年国民经济和社会发展统计公报》，2022年2月28日" },
    { id: "gac2024", text: "海关总署2024年货物贸易进出口数据，2025年1月13日发布" },
    { id: "gac2023", text: "海关总署2023年货物贸易进出口数据，2024年1月12日发布" },
    { id: "nbs-rd", text: "国家统计局《2024年我国研究与试验发展（R&D）经费超过3.6万亿元》，2025年1月23日" },
    { id: "prov2024", text: "各省（自治区、直辖市）统计局2024年地区生产总值初步核算数（广东、江苏、山东、浙江、四川、河南、湖北、福建）" }
  ],

  /* GDP 总量（亿元）与不变价增速。2021–2023 年为第五次全国
   * 经济普查修订后数，2024 年为初步核算数。 */
  gdpLevels: zipFields(["year", "total", "rate"], [
    [2021, 1173823, 8.6],
    [2022, 1234029, 3.1],
    [2023, 1294272, 5.4],
    [2024, 1349084, 5.0]
  ]),

  /* GDP 不变价增速，2015–2024 年。2023 年初步核算为 5.2%，
   * 普查修订后为 5.4%，这里取修订后的 5.4%。 */
  gdpRates: zipFields(["year", "rate"], [
    [2015, 7.0], [2016, 6.8], [2017, 6.9], [2018, 6.8], [2019, 6.1],
    [2020, 2.3], [2021, 8.6], [2022, 3.1], [2023, 5.4], [2024, 5.0]
  ]),

  gdpDetail: {
    total: 1349084,
    growth: 5.0,
    quarters: zipFields(["q", "rate"], [
      ["一季度 Q1", 5.3],
      ["二季度 Q2", 4.7],
      ["三季度 Q3", 4.6],
      ["四季度 Q4", 5.4]
    ]),
    primary: { value: 91414, growth: 3.5, share: 6.8 },
    secondary: { value: 492087, growth: 5.3, share: 36.5 },
    tertiary: { value: 765583, growth: 5.0, share: 56.7 },
    perCapita: 95749,
    perCapitaGrowth: 5.1,
    gni: 1339672,
    labourProductivity: 173898,
    demand: { consumption: 2.2, investment: 1.3, netExports: 1.5 }
  },

  /* 2024 年省份 GDP 前八名，初步核算数，亿元。 */
  topProvinces: zipFields(["name", "gdp", "growth"], [
    ["广东 Guangdong", 141634, 3.5],
    ["江苏 Jiangsu", 137008, 5.8],
    ["山东 Shandong", 98566, 5.7],
    ["浙江 Zhejiang", 90131, 5.5],
    ["四川 Sichuan", 64697, 5.7],
    ["河南 Henan", 63590, 5.1],
    ["湖北 Hubei", 60013, 5.8],
    ["福建 Fujian", 57761, 5.5]
  ]),

  /* 2024 年四大区域，亿元。 */
  regions: zipFields(["name", "gdp", "growth"], [
    ["东部 Eastern", 702356, 5.0],
    ["中部 Central", 287156, 5.0],
    ["西部 Western", 287350, 5.2],
    ["东北 Northeast", 63451, 4.4]
  ]),

  /* 年末人口，万人；出生、死亡为全年人数，万人；比率为 ‰。 */
  popSeries: zipFields(
    ["year", "total", "births", "deaths", "birthRate", "deathRate", "naturalRate", "urban", "urbanRate"],
    [
      [2021, 141260, 1062, 1014, 7.52, 7.18, 0.34, 91425, 64.72],
      [2022, 141175, 956, 1041, 6.77, 7.37, -0.60, 92071, 65.22],
      [2023, 140967, 902, 1110, 6.39, 7.87, -1.48, 93267, 66.16],
      [2024, 140828, 954, 1093, 6.77, 7.76, -0.99, 94350, 67.00]
    ]),

  /* 2024 年末年龄结构，万人；share 为占总人口 %。 */
  ageMix: zipFields(["group", "value", "share"], [
    ["0–15岁 Age 0–15", 23999, 17.1],
    ["16–59岁 Age 16–59", 85798, 60.9],
    ["60岁及以上 Age 60+", 31031, 22.0],
    ["其中65岁及以上 incl. 65+", 22023, 15.6]
  ]),
  genderSplit: { male: 71909, female: 68919, ratio: 104.34 },

  /* 就业，2021–2024 年。employed、urbanEmployed、newJobs、
   * migrants 以万人计，unemployment 为全年平均值 %。 */
  jobsSeries: zipFields(["year", "employed", "urbanEmployed", "newJobs", "unemployment", "migrants"], [
    [2021, 74652, 46773, 1269, 5.1, 29251],
    [2022, 73351, 45931, 1206, 5.6, 29562],
    [2023, 74041, 47032, 1244, 5.2, 29753],
    [2024, 73439, 47345, 1256, 5.1, 29973]
  ]),
  weeklyHours: 49.0,

  /* 物价：CPI、核心 CPI、PPI，同比 %。 */
  priceSeries: zipFields(["year", "cpi", "core", "ppi"], [
    [2021, 0.9, 0.8, 8.1],
    [2022, 2.0, 0.9, 4.1],
    [2023, 0.2, 0.7, -3.0],
    [2024, 0.2, 0.5, -2.2]
  ]),

  /* 2024 年 CPI 八大类涨跌，同比 %。 */
  cpiGroups: zipFields(["name", "change"], [
    ["食品烟酒 Food & tobacco", -0.1],
    ["衣着 Clothing", 1.4],
    ["居住 Housing", 0.1],
    ["生活用品及服务 Household goods & services", 0.5],
    ["交通通信 Transport & communication", -1.9],
    ["教育文化娱乐 Education, culture & recreation", 1.5],
    ["医疗保健 Health care", 1.3],
    ["其他用品及服务 Other goods & services", 3.8]
  ]),

  /* 居民人均可支配收入，元。 */
  incomeSeries: zipFields(["year", "disposable", "urban", "rural"], [
    [2022, 36883, 49283, 20133],
    [2023, 39218, 51821, 21691],
    [2024, 41314, 54188, 23119]
  ]),
  incomeDetail: {
    median: 34707,
    consumption: 28227,
    engel: 29.8,
    serviceShare: 46.1,
    quintiles: zipFields(["group", "value"], [
      ["低收入组 Lowest", 9542],
      ["中间偏下组 Lower-middle", 21608],
      ["中间收入组 Middle", 33925],
      ["中间偏上组 Upper-middle", 53359],
      ["高收入组 Highest", 98809]
    ])
  },

  /* 社会消费品零售总额，亿元；growth 为同比 %。 */
  retailSeries: zipFields(["year", "total", "growth"], [
    [2022, 439733, -0.2],
    [2023, 471495, 7.2],
    [2024, 487895, 3.5]
  ]),
  retailDetail: {
    urban: 421166, rural: 66729, goods: 432177, catering: 55718,
    onlinePhysical: 130816, onlineShare: 26.8, services: 6.2
  },

  /* 货物贸易，亿元；growth 为总额同比 %。海关总署发布。 */
  tradeSeries: zipFields(["year", "total", "exports", "imports", "growth"], [
    [2020, 321600, 179300, 142300, 1.9],
    [2021, 391009, 217348, 173661, 21.4],
    [2022, 420700, 239700, 181000, 7.7],
    [2023, 417568, 237726, 179842, 0.2],
    [2024, 438468, 254545, 183923, 5.0]
  ]),
  tradeDetail: {
    surplus: 70622, exportGrowth: 7.1, importGrowth: 2.3,
    bri: 220700, briGrowth: 6.4, briShare: 50.3,
    aseanGrowth: 9.0, aseanNote: "连续5年互为第一大贸易伙伴",
    mechShare: 59.4, mechGrowth: 8.7,
    december: 40670
  },

  /* 粮食产量，万吨。只列公报里有数的年份。 */
  grainSeries: zipFields(["year", "output"], [
    [2021, 68285],
    [2023, 69541],
    [2024, 70650]
  ]),

  industryDetail: {
    equipmentGrowth: 7.7, equipmentShare: 34.6,
    highTechGrowth: 8.9, highTechShare: 16.3,
    nev: 1316.8, nevGrowth: 38.7,
    solarCells: 6.8, solarGrowth: 15.7,
    serviceRobots: 1051.9, robotGrowth: 15.6
  },

  rdDetail: { value: 36130, growth: 8.3, intensity: 2.68, basic: 2497, basicGrowth: 10.5 }
};
