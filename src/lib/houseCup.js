import { labelSortKey } from "./timeline.js";

export const HOUSES = ["格兰芬多", "斯莱特林", "拉文克劳", "赫奇帕奇"];

const FIRST_YEAR_KEY = "1991-1992";
const FIRST_YEAR_FINAL = 19920620;
const FINAL_SCORES_1992 = {
  格兰芬多: 482,
  斯莱特林: 472,
  拉文克劳: 426,
  赫奇帕奇: 352,
};

const SCORE_TRACK = [
  [19910901, { 格兰芬多: 20, 斯莱特林: 30, 拉文克劳: 25, 赫奇帕奇: 22 }],
  [19911031, { 格兰芬多: 60, 斯莱特林: 92, 拉文克劳: 72, 赫奇帕奇: 68 }],
  [19911123, { 格兰芬多: 118, 斯莱特林: 156, 拉文克劳: 104, 赫奇帕奇: 96 }],
  [19911225, { 格兰芬多: 154, 斯莱特林: 198, 拉文克劳: 138, 赫奇帕奇: 130 }],
  [19920307, { 格兰芬多: 218, 斯莱特林: 266, 拉文克劳: 194, 赫奇帕奇: 182 }],
  [19920523, { 格兰芬多: 286, 斯莱特林: 366, 拉文克劳: 258, 赫奇帕奇: 250 }],
  [19920605, { 格兰芬多: 312, 斯莱特林: 472, 拉文克劳: 426, 赫奇帕奇: 352 }],
];

function normalizeHouse(house) {
  return HOUSES.includes(house) ? house : "";
}

function contributionOf(player) {
  return Math.max(0, Math.round(Number(player?.stats?.housePoints || 0)));
}

function firstYearKeyFor(label) {
  const key = labelSortKey(label);
  if (key >= 19910901 && key <= 19920630) return FIRST_YEAR_KEY;
  return "";
}

function baseScoresFor(label) {
  const key = labelSortKey(label);
  if (!key || key < 19910901) return Object.fromEntries(HOUSES.map((h) => [h, 0]));
  if (key >= FIRST_YEAR_FINAL) return { ...FINAL_SCORES_1992 };
  let current = SCORE_TRACK[0][1];
  for (const [k, scores] of SCORE_TRACK) {
    if (k <= key) current = scores;
    else break;
  }
  return { ...current };
}

export function personalHouseHonor(points = 0) {
  const p = Math.max(0, Number(points || 0));
  if (p >= 100) return "学院荣誉墙候选";
  if (p >= 60) return "年度突出贡献";
  if (p >= 25) return "学院认可";
  if (p > 0) return "有贡献记录";
  return "暂无显著贡献";
}

export function houseCupBoard(player, currentTimeLabel = "", houseCupResults = {}) {
  const yearKey = firstYearKeyFor(currentTimeLabel) || FIRST_YEAR_KEY;
  const settled = houseCupResults?.[yearKey] || null;
  const playerHouse = normalizeHouse(player?.meta?.house);
  const playerContribution = contributionOf(player);
  const key = labelSortKey(currentTimeLabel);
  const canonicalLock = yearKey === FIRST_YEAR_KEY && key >= FIRST_YEAR_FINAL;
  const scores = settled?.scores ? { ...settled.scores } : baseScoresFor(currentTimeLabel);

  if (playerHouse && !canonicalLock && !settled) {
    scores[playerHouse] = Math.max(0, (scores[playerHouse] || 0) + playerContribution);
  }

  const ranking = HOUSES
    .map((house) => ({ house, score: Number(scores[house] || 0) }))
    .sort((a, b) => b.score - a.score || HOUSES.indexOf(a.house) - HOUSES.indexOf(b.house));
  const winner = settled?.winner || ranking[0]?.house || "";
  const playerRank = playerHouse ? ranking.findIndex((x) => x.house === playerHouse) + 1 : 0;

  return {
    yearKey,
    scores,
    ranking,
    winner,
    playerHouse,
    playerRank,
    playerContribution,
    honor: personalHouseHonor(playerContribution),
    canonicalLock,
    settled,
  };
}

export function houseCupSummary(player, currentTimeLabel = "", houseCupResults = {}) {
  const board = houseCupBoard(player, currentTimeLabel, houseCupResults);
  return {
    yearKey: board.yearKey,
    leader: board.ranking[0]?.house || "",
    leaderScore: board.ranking[0]?.score || 0,
    playerHouse: board.playerHouse,
    playerRank: board.playerRank,
    playerContribution: board.playerContribution,
    honor: board.honor,
    settled: !!board.settled,
    canonicalLock: board.canonicalLock,
  };
}

export function settleHouseCup({ player, currentTimeLabel = "", houseCupResults = {} }) {
  const board = houseCupBoard(player, currentTimeLabel, houseCupResults);
  if (board.yearKey !== FIRST_YEAR_KEY) return null;
  if (labelSortKey(currentTimeLabel) < FIRST_YEAR_FINAL) return null;
  if (board.settled) return { isNew: false, result: board.settled, board };

  const result = {
    key: FIRST_YEAR_KEY,
    winner: "格兰芬多",
    scores: { ...FINAL_SCORES_1992 },
    playerHouse: board.playerHouse,
    playerContribution: board.playerContribution,
    honor: board.honor,
    canonLocked: true,
    reason: "1991-1992 学年结业晚宴为原著锚点：邓布利多宣布追加分数后，格兰芬多夺得学院杯。",
    settledAt: Date.now(),
  };
  return { isNew: true, result, board: { ...board, settled: result } };
}

export function formatHouseCupLine(settlement) {
  if (!settlement?.result) return "";
  const { result, isNew } = settlement;
  const suffix = result.playerHouse
    ? ` · ${result.playerHouse}个人贡献 ${result.playerContribution}（${result.honor}）`
    : "";
  return `🏆 学院杯：${result.winner}夺冠${suffix}${isNew ? "" : " · 已结算"}`;
}

export function houseCupAnchor(settlement) {
  if (!settlement?.result) return "";
  const r = settlement.result;
  return [
    "【学院杯结算（旁白必须据此叙事，不得改判）】",
    `学年：${r.key}`,
    `最终结果：${r.winner}夺得学院杯。`,
    `官方总分：${HOUSES.map((h) => `${h}${r.scores[h]}`).join("；")}。`,
    r.playerHouse ? `玩家所在学院：${r.playerHouse}；玩家个人贡献：${r.playerContribution}；个人荣誉评价：${r.honor}。` : "",
    r.reason,
    "玩家贡献可以影响同院同学的反应、个人荣誉、教授评价和小范围庆祝，但不得改写本学年的原著学院杯冠军。",
  ].filter(Boolean).join("\n");
}

export function formatHouseCupBlock(player, currentTimeLabel = "", houseCupResults = {}) {
  const board = houseCupBoard(player, currentTimeLabel, houseCupResults);
  const scoreLine = board.ranking.map((x, idx) => `${idx + 1}. ${x.house}${x.score}`).join("；");
  return [
    "【学院杯 / 学院分规则】",
    `当前学院杯参考榜：${scoreLine || "暂无榜单"}。`,
    board.playerHouse ? `玩家学院：${board.playerHouse}；玩家个人贡献分：${board.playerContribution}；贡献评价：${board.honor}。` : "玩家尚未明确学院。",
    "- 学院分必须有具体剧情依据：教授/级长加扣分、课堂表现、违反校规被抓、帮助他人、魁地奇或公开竞赛表现。",
    "- 日常叙事可以描写学院沙漏、同院压力、同学反应，但不要无依据增减分。",
    "- 玩家贡献影响个人荣誉、学院氛围、同院关系和年终评价；不是随意改写原著大事件的开关。",
    "- 1991-1992 学年结业晚宴为原著锚点：最终学院杯由格兰芬多夺得。若玩家不在格兰芬多，仍可获得个人贡献认可，但不得改判冠军。",
  ].join("\n");
}
