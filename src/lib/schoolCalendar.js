import { addDays, labelSortKey } from "./timeline.js";
import { classChoiceFromTimetable, formatLesson, formatTimetableBlock, isHoliday, timetableContext } from "./timetable.js";

export const CLASS_DAY_RULES = [
  "标准课时：9:00-10:00 上午第1节，10:30-11:30 上午第2节；11:45-12:45 午餐；13:00-14:00 下午第1节，14:30-15:30 下午第2节；17:00-19:00 晚餐。",
  "连堂课：9:00-11:00 上午连堂；13:00-15:00 下午连堂；17:00-19:00 晚餐。",
  "1-4 年级通常 21:00 前返回公共休息室；5-7 年级通常 22:00 前返回公共休息室。",
];

export const DAY_PERIODS = [
  { id: "morning", label: "上午", instruction: "课程、早餐后的走廊、教授与同学更容易出现" },
  { id: "afternoon", label: "下午", instruction: "课程后、图书馆、庭院、球场和社团活动更自然" },
  { id: "dinner", label: "晚饭后", instruction: "礼堂、公共休息室、走廊闲聊和小支线更自然" },
  { id: "night", label: "夜晚", instruction: "公共休息室、宿舍、低声谈话和轻微违规更自然" },
  { id: "late", label: "深夜", instruction: "宵禁风险高，夜游、被发现、秘密线索更自然" },
];

const byId = Object.fromEntries(DAY_PERIODS.map((p) => [p.id, p]));
const periodOrder = DAY_PERIODS.map((p) => p.id);

export function dayPeriod(id) {
  return byId[id] || byId.morning;
}

export function nextDayPeriod(id) {
  const i = periodOrder.indexOf(id || "morning");
  return periodOrder[Math.min(periodOrder.length - 1, Math.max(0, i) + 1)] || "morning";
}

/**
 * 推进一个时段；走到最后一个时段（深夜）之后回到次日「上午」，并标记跨天。
 * 返回 { period, dayRollover }。日期 +1 由调用方在 dayRollover 时处理。
 */
export function advanceDayPeriod(id) {
  const i = Math.max(0, periodOrder.indexOf(id || "morning"));
  if (i >= periodOrder.length - 1) return { period: "morning", dayRollover: true };
  return { period: periodOrder[i + 1], dayRollover: false };
}

export function advanceCalendarClock({ currentTimeLabel = "", periodId = "morning" } = {}) {
  const { period, dayRollover } = advanceDayPeriod(periodId);
  const key = labelSortKey(currentTimeLabel);
  return {
    currentTimeLabel: dayRollover && key >= 19910816 ? addDays(currentTimeLabel, 1) : currentTimeLabel,
    periodId: period,
    dayRollover,
  };
}

/** 当前日期之后的下一个校历事件节点（用于「快进到下一个重要日子」）。 */
export function nextCalendarEvent(currentTimeLabel) {
  const k = labelSortKey(currentTimeLabel);
  const keys = Object.keys(HOGWARTS_CALENDAR_EVENTS).map(Number).sort((a, b) => a - b);
  const nxt = keys.find((x) => x > k);
  if (!nxt) return null;
  const s = String(nxt);
  return {
    key: nxt,
    label: `${s.slice(0, 4)}年${Number(s.slice(4, 6))}月${Number(s.slice(6, 8))}日`,
    title: HOGWARTS_CALENDAR_EVENTS[nxt].title,
  };
}

export function formatCalendarPeriodBlock(period) {
  if (!period) return "";
  return `【当前生活时间段】${period.label}：${period.instruction}。这只是生活氛围与事件池参考，不代表固定剧情。`;
}

export function calendarPhase(currentTimeLabel = "") {
  const key = labelSortKey(currentTimeLabel);
  const month = key ? Math.floor((key % 10000) / 100) : 0;
  if (!key) return { key, id: "unknown", label: "未识别日期", lockedToSchool: false };
  if (key <= 19910816) return { key, id: "shopping", label: "开学前采购", lockedToSchool: false };
  if (key >= 19910817 && key < 19910901) return { key, id: "pre_term", label: "开学前准备", lockedToSchool: false };
  if (key === 19910901) return { key, id: "opening_day", label: "开学日", lockedToSchool: false };
  if (HOGWARTS_CALENDAR_EVENTS[key]) return { key, id: "special_event", label: HOGWARTS_CALENDAR_EVENTS[key].title, lockedToSchool: key >= 19910901 };
  if (key >= 19910901 && (month === 7 || month === 8)) return { key, id: "summer", label: "暑假", lockedToSchool: false };
  if (key >= 19910901 && isHoliday(currentTimeLabel)) return { key, id: "holiday", label: "假期 / 离校阶段", lockedToSchool: false };
  return { key, id: "school_day", label: "普通在校日", lockedToSchool: true };
}

const choice = (label, intent, opts = {}) => ({ label, intent, ...opts });

const eventChoice = (label, intent, opts = {}) => choice(label, intent, opts);

// 跨学年/跨日期推进的选项：选中后把当前日期推进到 nextTimeLabel。
const advanceChoice = (label, intent, nextTimeLabel) => choice(label, intent, { nextTimeLabel, nextPeriodId: "morning" });

// 养成型选项：选中后给予确定性的数值成长（由 App 读取 choice.growth 应用）。
const growthChoice = (label, intent, growth, opts = {}) => choice(label, intent, { growth, ...opts });

export const HOGWARTS_CALENDAR_EVENTS = {
  19910816: {
    title: "对角巷采购",
    periodLabel: "采购日",
    note: "开学前采购序章。根据校历与开局资料，准新生会在八月中下旬完成入学用品采购。",
    choices: [
      eventChoice("去古灵阁", "我想先去古灵阁兑换巫师货币，顺便感受第一次进入魔法银行的气氛。"),
      eventChoice("买校袍", "我想去摩金夫人长袍店量校袍，看看会遇见谁。"),
      eventChoice("挑选魔杖", "我想去奥利凡德魔杖店，让魔杖选择我。"),
      eventChoice("买课本材料", "我想去丽痕书店和魔药材料店采购课本、坩埚、药材和其他用品。"),
      eventChoice("继续逛逛", "我想在对角巷随便逛逛，不预设收获，只看会自然发生什么。"),
      eventChoice("结束采购 · 回去备课", "采购差不多结束了，我想回去，利用开学前的日子做些准备。", {
        nextTimeLabel: "1991年8月17日",
        nextPeriodId: "morning",
      }),
    ],
  },
  19910901: {
    title: "新学期分院晚宴",
    note: "校历节点：9 月 1 日新生入学、分院、开学晚宴。选择只是镜头入口，不固定分院或剧情结果。",
    choices: [
      eventChoice("寻找站台", "我想先在国王十字车站寻找九又四分之三站台。"),
      eventChoice("上车找包厢", "我想登上霍格沃茨特快，找一个包厢坐下。"),
      eventChoice("列车上闲逛", "我想在列车上走走，看看会遇见哪些同届新生。"),
      eventChoice("抵达与分院", "我想把镜头推进到抵达霍格沃茨和分院仪式。"),
    ],
  },
  19910902: {
    title: "第一节课 · 初遇教授们",
    note: "校历节点：开学第二天，课程正式展开。魔咒课的荧光闪烁、变形课的火柴变针、还有魔药课上斯内普的第一次刁难，都在这几天里。",
    choices: [
      eventChoice("认真上第一课", "我想认真上好开学的第一节课，给教授留个好印象。"),
      eventChoice("应对斯内普", "魔药课上斯内普步步紧逼，我想沉住气应对他的提问。"),
      eventChoice("课后结识同学", "第一天课后，我想结识身边的同届同学。"),
      eventChoice("熟悉城堡与课表", "我想趁课间熟悉城堡路线和各间教室。"),
    ],
  },
  19910904: {
    title: "黑魔法防御术 · 奇洛教授",
    note: "校历节点：开学第一周的黑魔法防御术课。奇洛教授裹着一股大蒜味的紫色头巾、说话结结巴巴，课堂沉闷，却总有种说不清的怪异。（分院宴上望向教工席时，有人的疤痕曾莫名刺痛。）",
    choices: [
      eventChoice("认真听讲", "我想认真听奇洛教授的课，尽管气氛沉闷。"),
      eventChoice("留意怪异之处", "我想留意奇洛教授那股大蒜味和紧张神色背后的怪异。"),
      eventChoice("和同学吐槽", "我想和同学小声吐槽这位结巴又胆小的教授。"),
      eventChoice("照常上课", "我想照常上完这节课，不多想。"),
    ],
  },
  19911030: {
    title: "魔咒课 · 漂浮咒",
    note: "校历节点：弗立维教授教「羽加迪姆·勒维奥萨」漂浮咒。罗恩笨手笨脚还嘲笑赫敏的发音，赫敏听见后委屈地哭着躲进盥洗室——这为万圣夜的危机埋下了伏笔。",
    choices: [
      eventChoice("练好漂浮咒", "我想认真练习漂浮咒，把羽毛稳稳浮起来。"),
      eventChoice("安慰赫敏", "我想去安慰被罗恩气哭、躲起来的赫敏。"),
      eventChoice("劝劝罗恩", "我想劝罗恩别那样说话，太伤人了。"),
      eventChoice("照常上课", "我想照常上完魔咒课，看后面会发生什么。"),
    ],
  },
  19911031: {
    title: "万圣夜",
    note: "校历节点：万圣夜。晚宴、城堡气氛和意外事件都更容易被触发。",
    choices: [
      eventChoice("参加晚宴", "我想参加万圣节晚宴，留意礼堂里的气氛和人物互动。"),
      eventChoice("城堡动静", "我想注意城堡里是否有不同寻常的动静。"),
      eventChoice("找同学同行", "我想找一个同学一起度过万圣夜。"),
      eventChoice("避开风头", "我想低调一点，尽量不要卷入太大的麻烦。"),
    ],
  },
  19911102: {
    title: "魁地奇揭幕战",
    note: "校历节点：11 月第一个周六为魁地奇揭幕赛。看台、训练、学院情绪会更活跃。",
    choices: [
      eventChoice("去看比赛", "我想去看魁地奇揭幕战，感受学院之间的气氛。"),
      eventChoice("留意队伍", "我想观察各学院球队和找球手的表现。"),
      eventChoice("和同学押聊", "我想和同学聊聊比赛、学院荣誉和传闻。"),
      eventChoice("避开人群", "我想避开看台人潮，在城堡里过一段安静日常。"),
    ],
  },
  19911108: {
    title: "飞行课 · 初上扫帚",
    note: "校历节点：第一堂飞行课。霍琦夫人教大家驭帚；纳威摔伤手腕、德拉科抢走他的记忆球，哈利第一次骑扫帚就追了回来，被麦格教授看中、成为一个世纪以来最年轻的找球手（不久后收到一把光轮 2000）。",
    choices: [
      eventChoice("认真练习驭帚", "我想认真练习控制扫帚，争取在飞行课上有好表现。"),
      eventChoice("留意选拔机会", "我想留意有没有展示天赋、被选中进队的机会。"),
      eventChoice("照应怕飞的同学", "我想照应身边害怕飞行的同学，别让他们出意外。"),
      eventChoice("稳妥为先", "第一次骑扫帚，我想稳妥一点，不逞强。"),
    ],
  },
  19911109: {
    title: "午夜决斗 · 三头犬路威",
    note: "校历节点：德拉科约哈利在奖品陈列室来一场午夜巫师决斗——其实是个圈套。慌乱躲避费尔奇时，几人误闯三楼禁地，撞见一条守着活板门的巨大三头犬「路威」。",
    choices: [
      eventChoice("一同夜探", "我想跟着去看看这场午夜决斗到底是不是圈套。"),
      eventChoice("撞见三头犬", "我想看看三楼禁地里那条三头犬到底在守着什么。"),
      eventChoice("劝大家别去", "我想劝大家别中德拉科的激将法，免得惹麻烦。"),
      eventChoice("守口如瓶", "误闯禁地后，我想对撞见三头犬的事守口如瓶。"),
    ],
  },
  19911123: {
    title: "魁地奇常规赛",
    note: "校历节点：11 月第四个周六魁地奇常规赛。",
    choices: [
      eventChoice("去看比赛", "我想去看今天的魁地奇常规赛。"),
      eventChoice("赛前走动", "我想在赛前的城堡和球场附近走走。"),
      eventChoice("关注学院分", "我想留意比赛对学院气氛和学院分的影响。"),
      eventChoice("照常生活", "我想让比赛成为背景，继续我的校园日常。"),
    ],
  },
  19911221: {
    title: "厄里斯魔镜",
    note: "校历节点：圣诞，哈利收到一件匿名礼物——父亲留下的隐形衣。他借着隐形衣在城堡夜游，撞见一面照出人内心最深渴望的镜子——厄里斯魔镜，在镜中看见了从未谋面的父母。",
    choices: [
      eventChoice("凝视魔镜", "若遇到那面镜子，我想看看它会照出我内心最深的渴望。"),
      eventChoice("提醒沉迷的人", "我想提醒在镜前迷失的人，那只是幻象。"),
      eventChoice("探究来历", "我想探究这面镜子的来历与原理。"),
      eventChoice("默默离开", "看清那只是幻象后，我想默默离开。"),
    ],
  },
  19911224: {
    title: "圣诞假期开始",
    note: "校历节点：12 月 24 日放假。学生可返家，也可留校。",
    choices: [
      eventChoice("准备返家", "圣诞假期开始了，我想准备离校返家。"),
      eventChoice("选择留校", "圣诞假期开始了，我想留在霍格沃茨过节。"),
      eventChoice("告别同学", "我想在假期前和同学说说话。"),
      eventChoice("整理行李", "我想整理行李和这一学期以来的物品。"),
    ],
  },
  19911225: {
    title: "圣诞晚宴",
    note: "校历节点：圣诞节与圣诞晚宴。留校学生会迎来较安静、温暖的节日氛围。",
    choices: [
      eventChoice("参加晚宴", "我想参加圣诞晚宴，感受留校过节的霍格沃茨。"),
      eventChoice("拆礼物", "我想看看圣诞礼物和随之而来的小插曲。"),
      eventChoice("写信", "我想写信给家人或朋友。"),
      eventChoice("城堡散步", "我想在节日装饰下的城堡里走走。"),
    ],
  },
  19920105: {
    title: "圣诞假期返校",
    note: "校历节点：一月第一个周日返校。假期结束后的关系、传闻和课程会重新接上。",
    choices: [
      eventChoice("回到城堡", "我想回到霍格沃茨，看看假期后学校有什么变化。"),
      eventChoice("找同学聊天", "我想找同学聊聊假期发生的事。"),
      eventChoice("准备上课", "我想整理状态，准备恢复课程。"),
      eventChoice("留意传闻", "我想留意假期后城堡里的新传闻。"),
    ],
  },
  19920112: {
    title: "尼可·勒梅之谜",
    note: "校历节点：假期后，三人组在图书馆苦苦追查「尼可·勒梅」与魔法石的线索，渐渐逼近三楼走廊的秘密。",
    choices: [
      eventChoice("协助查资料", "我想在图书馆帮忙查找尼可·勒梅与魔法石的资料。"),
      eventChoice("留意三楼走廊", "我想留意被禁止入内的三楼走廊究竟藏着什么。"),
      eventChoice("旁观三人组", "我想观察哈利三人最近的反常举动，不一定插手。"),
      eventChoice("专心功课", "我想把心思放回功课上，别卷进危险。"),
    ],
  },
  19920215: { title: "魁地奇常规赛", note: "校历节点：2 月第三个周六魁地奇常规赛。" },
  19920307: { title: "魁地奇常规赛", note: "校历节点：3 月第一个周六魁地奇常规赛。" },
  19920323: {
    title: "海格的龙蛋",
    note: "校历节点：海格从陌生人手里赢得一枚龙蛋，孵出了挪威脊背龙诺伯——在木屋里养龙可不是小事。",
    choices: [
      eventChoice("帮海格照看", "我想帮海格照看这只越长越大的小龙，又担心被发现。"),
      eventChoice("劝海格送走", "我想劝海格把诺伯送到安全的地方（比如查理的龙保护区）。"),
      eventChoice("替他保密", "我想替海格保守养龙的秘密。"),
      eventChoice("远观不掺和", "养龙太危险，我想远远看着、不掺和。"),
    ],
  },
  19920411: {
    title: "春假开始",
    note: "校历节点：复活节假期前一周左右春假开始。",
    choices: [
      eventChoice("准备假期", "春假开始了，我想安排这段假期怎么过。"),
      eventChoice("留校日常", "我想留在学校，看看假期中的霍格沃茨。"),
      eventChoice("复习功课", "我想利用假期复习，但不预设固定收益。"),
      eventChoice("找人同行", "我想找人一起度过春假开头的这段时间。"),
    ],
  },
  19920419: { title: "复活节", note: "校历节点：复活节。" },
  19920426: { title: "春假返校", note: "校历节点：复活节假期结束返校。" },
  19920502: { title: "魁地奇常规赛", note: "校历节点：5 月第一个周六魁地奇常规赛。" },
  19920510: {
    title: "禁林劳动 · 林中异象",
    note: "校历节点：违规的学生被罚在禁林劳动。林中有什么正在猎食独角兽，马人费伦泽出手相救，并道出隐情。",
    choices: [
      eventChoice("追查黑影", "我想看看那抹猎食独角兽的黑影到底是什么。"),
      eventChoice("留意马人", "我想留意马人费伦泽，听听他对星象与命运的说法。"),
      eventChoice("护着同伴", "禁林危机四伏，我想护着同行的同伴。"),
      eventChoice("尽快离开", "感到极度危险时，我想尽快离开这片林子。"),
    ],
  },
  19920523: { title: "魁地奇决赛", note: "校历节点：5 月第四个周六魁地奇决赛。" },
  19920601: {
    title: "期末考开始",
    note: "校历节点：6 月第一个整周期末考试开始。考试结果仍由系统判定或日常叙事自然结算。",
    choices: [
      eventChoice("参加考试", "期末考试开始了，我想进入今天的考试场景。"),
      eventChoice("考前复习", "我想抓紧考前最后一点时间复习。"),
      eventChoice("互相打气", "我想和同学在考试前互相打气。"),
      eventChoice("观察氛围", "我想观察考试周里城堡和同学们的状态。"),
    ],
  },
  19920604: {
    title: "魔法石 · 重重关卡",
    note: "校历节点（原著大事件）：哈利三人闯过路威三头犬、魔鬼网、飞行钥匙、巨型巫师棋、逻辑谜题，最终直面奇洛与附身其上的伏地魔。你无需直接对抗，但可在前期出一份力。",
    choices: [
      eventChoice("照看三头犬", "我想在地下室帮海格照看那条三头犬路威，间接帮上忙。"),
      eventChoice("提供禁书线索", "我想在图书馆为哈利三人提供禁书区借阅的线索。"),
      eventChoice("守在休息室", "我想守在公共休息室，安抚不安的同学、随时接应。"),
      eventChoice("协助善后", "我想在这场风波后协助善后、照看受伤的人。"),
    ],
  },
  19920605: { title: "期末考结束", note: "校历节点：期末考试结束。" },
  19920619: {
    title: "学院杯庆典",
    note: "校历节点：年终宴会上格兰芬多惊天逆袭夺得学院杯，全校沸腾。无论你在哪个学院，这都是难忘的一夜。",
    choices: [
      eventChoice("尽情庆祝", "我想在公共休息室和大家一起庆祝这一学年的落幕。"),
      eventChoice("与好友合影", "我想和这一年结识的好友合影、留个纪念。"),
      eventChoice("回顾第一年", "我想安静地回顾入学第一年的全部经历。"),
      eventChoice("约定暑假联系", "我想和同学约定暑假保持联系。"),
    ],
  },
  19920620: { title: "结业晚宴", note: "校历节点：结业晚宴。" },
  19920621: {
    title: "离校 · 一年级结束",
    note: "校历节点：次日离校，第一学年结束。前方是密室阴影笼罩的第二学年。",
    choices: [
      advanceChoice("升入二年级 · 开启新学年", "暑假一晃而过，我准备返校开始第二学年。", "1992年9月1日"),
      eventChoice("结业告别", "学年结束了，我想和朋友、同学好好告别。"),
      eventChoice("收拾返家", "我想收拾行李，结束这一学年返家过暑假。"),
      eventChoice("回顾这一年", "我想回顾魔法石这一年的经历与成长。"),
    ],
  },

  // ── 第二学年（1992–1993）· 密室的阴影 ──
  19920901: {
    title: "二年级开学 · 密室的阴影",
    note: "校历节点：第二学年开学。城堡暗流涌动，密室的传说即将苏醒。",
    choices: [
      eventChoice("登上特快返校", "我想登上霍格沃茨特快回到学校，开始第二学年。"),
      eventChoice("留意新生分院", "我想留意今年的新生分院，金妮·韦斯莱也在其中。"),
      eventChoice("选定选修课", "我想为今年确定选修课方向（古代如尼文、算术占卜、保护神奇生物、占卜学、麻瓜研究）。"),
      eventChoice("照常开始日常", "我想照常开始新学年的校园日常。"),
    ],
  },
  19921031: {
    title: "万圣夜 · 密室被打开了",
    note: "校历节点：万圣夜。墙上将出现血字「密室被打开了」，洛丽丝夫人被石化。",
    choices: [
      eventChoice("参加万圣节晚宴", "我想参加万圣节晚宴，留意礼堂与城堡的异样气氛。"),
      eventChoice("查看走廊血字", "我想去看看走廊墙上的血字和被石化的洛丽丝夫人。"),
      eventChoice("保护现场", "我想保护现场、通知教授，避免混乱。"),
      eventChoice("暗中留意线索", "我想低调地留意密室相关的蛛丝马迹。"),
    ],
  },
  19921108: { title: "石化事件蔓延", note: "校历节点：科林·克里维被石化，多比再度警告；复方汤剂的熬制悄然开始。" },
  19921225: {
    title: "圣诞 · 复方汤剂",
    note: "校历节点：圣诞假期。哈利与罗恩借复方汤剂潜入斯莱特林公共休息室调查。",
    choices: [
      eventChoice("留校过节", "我想留在霍格沃茨过圣诞，顺便留意密室的动静。"),
      eventChoice("协助配药", "我想帮忙收集复方汤剂所需的草药与材料。"),
      eventChoice("调查斯莱特林", "我想旁敲侧击地打听斯莱特林一方的传闻。"),
      eventChoice("安静过节", "我想安静地过个圣诞，写信、拆礼物。"),
    ],
  },
  19930131: { title: "神秘的日记", note: "校历节点：金妮持有的汤姆·里德尔日记开始显露端倪，密室之谜渐明。" },
  19930502: { title: "赫敏被石化", note: "校历节点：赫敏与级长佩内洛被石化，手中留有写着「蛇怪」的纸条；邓布利多被停职。" },
  19930524: {
    title: "禁林 · 阿拉戈克",
    note: "校历节点：循着「跟着蜘蛛走」的线索，哈利与罗恩进入禁林，从巨蛛阿拉戈克口中得知五十年前的真凶是蛇怪、海格是无辜的。",
    choices: [
      eventChoice("追查蜘蛛线索", "我想帮忙追查「跟着蜘蛛走」背后的真相。"),
      eventChoice("为海格洗冤", "我想收集证据，证明海格当年是无辜的。"),
      eventChoice("守在城堡", "禁林太危险，我想守在城堡里接应、留意消息。"),
      eventChoice("保护低年级", "石化事件人心惶惶，我想护着低年级同学。"),
    ],
  },
  19930529: {
    title: "密室对决",
    note: "校历节点（原著大事件）：哈利进入密室面对里德尔与蛇怪，拔出格兰芬多宝剑、以蛇牙毁掉日记魂器，金妮获救。",
    choices: [
      eventChoice("协助善后", "我想在外围协助安抚同学、配合教授处理密室危机的善后。"),
      eventChoice("守在休息室", "我想守在公共休息室，照看惊慌的同学。"),
      eventChoice("留意城堡变化", "我想留意密室事件后城堡与师生的变化。"),
      eventChoice("照常生活", "我想让这场风波成为背景，继续我的日常。"),
    ],
  },
  19930601: { title: "学年末 · 取消考试", note: "校历节点：密室危机解除，本学年期末考试被取消，全校松一口气。" },
  19930620: { title: "结业晚宴", note: "校历节点：结业晚宴，邓布利多复职、海格归来。" },
  19930621: {
    title: "离校 · 二年级结束",
    note: "校历节点：第二学年结束。下一年，阿兹卡班的囚徒越狱，摄魂怪将笼罩城堡。",
    choices: [
      advanceChoice("升入三年级 · 开启新学年", "暑假结束，我准备返校开始第三学年。", "1993年9月1日"),
      eventChoice("结业告别", "我想在离校前和朋友好好告别。"),
      eventChoice("收拾返家", "我想收拾行李返家过暑假。"),
      eventChoice("回顾这一年", "我想回顾密室这一年的经历。"),
    ],
  },

  // ── 第三学年（1993–1994）· 阿兹卡班的囚徒 ──
  19930901: {
    title: "三年级开学 · 摄魂怪登车",
    note: "校历节点：第三学年开学。霍格沃茨特快被摄魂怪登车搜查，卢平教授以守护神咒驱散。",
    choices: [
      eventChoice("登上特快返校", "我想登上特快返校，留意一路的反常气氛。"),
      eventChoice("面对摄魂怪", "列车上摄魂怪逼近，我想看看自己如何应对那股寒意。"),
      eventChoice("结识卢平教授", "我想留意新任黑魔法防御术教师卢平。"),
      eventChoice("照常开始日常", "我想照常开始第三学年的校园日常。"),
    ],
  },
  19931031: {
    title: "万圣夜 · 小天狼星闯城堡",
    note: "校历节点：万圣夜。小天狼星·布莱克划破胖夫人画像闯入城堡，全校进入紧急状态、在礼堂过夜。",
    choices: [
      eventChoice("礼堂过夜", "城堡戒严，我想和同学一起在礼堂度过这一夜。"),
      eventChoice("留意搜查", "我想留意教授彻夜搜查城堡的动静。"),
      eventChoice("安抚同学", "我想安抚身边受惊的同学。"),
      eventChoice("暗中观察", "我想暗中观察这场骚动里的反常之处。"),
    ],
  },
  19931218: { title: "活点地图", note: "校历节点：弗雷德、乔治赠出活点地图；霍格莫德的密道悄然开启。" },
  19931225: { title: "圣诞 · 神秘的火弩箭", note: "校历节点：圣诞节。一把来路不明的火弩箭被送到，麦格教授暂时没收检查。" },
  19940601: { title: "学年末考试 · 博格特", note: "校历节点：期末考试。黑魔法防御术考试为对抗博格特，直面并克服恐惧。" },
  19940606: {
    title: "时间转换器 · 巴克比克",
    note: "校历节点（原著大事件）：哈利与赫敏用时间转换器救下巴克比克、助小天狼星逃离，真相大白。",
    choices: [
      eventChoice("为巴克比克作证", "我想为巴克比克作证、收集它无辜的证据。"),
      eventChoice("留意异常", "我想留意这一夜城堡里时间与人事的反常。"),
      eventChoice("守口如瓶", "我想对自己偶然知道的秘密守口如瓶。"),
      eventChoice("照常生活", "我想让这件事成为背景，继续日常。"),
    ],
  },
  19940620: {
    title: "离校 · 三年级结束",
    note: "校历节点：第三学年结束。下一年，三强争霸赛将点燃整座城堡。",
    choices: [
      advanceChoice("升入四年级 · 开启新学年", "暑假结束，我准备返校开始第四学年。", "1994年9月1日"),
      eventChoice("结业告别", "我想在离校前和朋友好好告别。"),
      eventChoice("收拾返家", "我想收拾行李返家过暑假。"),
      eventChoice("回顾这一年", "我想回顾阿兹卡班囚徒这一年的经历。"),
    ],
  },

  // ── 第四学年（1994–1995）· 三强争霸赛（本年停办魁地奇）──
  19940901: {
    title: "四年级开学 · 两校来访",
    note: "校历节点：第四学年开学。布斯巴顿与德姆斯特朗到访，三强争霸赛在即；本学年魁地奇停办。",
    choices: [
      eventChoice("迎接两校学生", "我想在开学宴会上结识布斯巴顿与德姆斯特朗的来客。"),
      eventChoice("讨论争霸赛", "我想和同学讨论即将到来的三强争霸赛。"),
      eventChoice("准备 O.W.L. 学业", "本年课程难度提升，我想及早准备学业。"),
      eventChoice("照常开始日常", "我想照常开始第四学年的日常。"),
    ],
  },
  19941031: {
    title: "火焰杯 · 四位勇士",
    note: "校历节点（原著大事件）：火焰杯选出塞德里克、克鲁姆、芙蓉，并意外多选出第四个名字——哈利。",
    choices: [
      eventChoice("观看选拔", "我想到礼堂见证火焰杯选出勇士的一刻。"),
      eventChoice("支持本校勇士", "我想为塞德里克或哈利加油打气。"),
      eventChoice("分析各方实力", "我想分析四位勇士的优势与争霸赛规则。"),
      eventChoice("旁观议论", "我想旁观全校对「第四名勇士」的议论。"),
    ],
  },
  19941124: { title: "第一项任务 · 火龙", note: "校历节点：第一项任务，勇士们从龙巢夺取金蛋。" },
  19941225: {
    title: "圣诞舞会",
    note: "校历节点（特殊年份）：本年圣诞举办三强争霸赛圣诞舞会，全体参加，次日离校。",
    choices: [
      eventChoice("邀请舞伴", "我想鼓起勇气邀请心仪的人作舞伴（好感度足够才更可能成功）。"),
      eventChoice("与朋友结伴", "我想和朋友结伴参加舞会，轻松度过这一夜。"),
      eventChoice("尽情跳舞", "我想在舞会上尽情跳舞、享受气氛。"),
      eventChoice("旁观一切", "我想在角落旁观舞会上的人与事。"),
    ],
  },
  19950224: { title: "第二项任务 · 黑湖救人", note: "校历节点：第二项任务，勇士们潜入黑湖湖底营救人质。" },
  19950624: {
    title: "第三项任务 · 迷宫 · 伏地魔复活",
    note: "校历节点（原著大事件）：迷宫寻杯，哈利与塞德里克被传送到墓地，伏地魔复活，塞德里克遇害。全校陷入哀悼。",
    choices: [
      eventChoice("赛场等待", "我想在迷宫外的看台等待勇士归来。"),
      eventChoice("安抚恐慌", "噩耗传来，我想安抚陷入恐慌的同学。"),
      eventChoice("默哀致意", "我想为塞德里克默哀致意。"),
      eventChoice("警惕未来", "我想在悲痛中开始警惕即将到来的黑暗。"),
    ],
  },
  19950629: {
    title: "结业晚宴 · 离校",
    note: "校历节点（特殊年份）：本年 6 月 24 日下午争霸赛收尾，6 月 29 日结业晚宴，次日离校。",
    choices: [
      advanceChoice("升入五年级 · 开启新学年", "在伏地魔归来的阴影下，我准备返校开始第五学年。", "1995年9月1日"),
      eventChoice("沉默告别", "我想在哀伤的气氛里和朋友默默告别。"),
      eventChoice("收拾返家", "我想收拾行李返家过暑假。"),
      eventChoice("回顾这一年", "我想回顾火焰杯这一年的经历。"),
    ],
  },

  // ── 第五学年（1995–1996）· 凤凰社 ──
  19950901: {
    title: "五年级开学 · 乌姆里奇任教",
    note: "校历节点：第五学年开学，O.W.L.s 关键年。魔法部强行指派乌姆里奇任黑魔法防御术教师，禁止实践魔法。",
    choices: [
      eventChoice("登上特快返校", "我想返校开始紧张的 O.W.L.s 学年。"),
      eventChoice("观察乌姆里奇", "我想留意乌姆里奇的课堂与教育令。"),
      eventChoice("私下练习防御", "我想在私下偷偷练习防御魔法。"),
      eventChoice("照常开始日常", "我想照常开始第五学年的日常。"),
    ],
  },
  19951008: {
    title: "邓布利多军成立",
    note: "校历节点：在霍格莫德猪头酒吧，学生们秘密成立邓布利多军（D.A.），私下学习防御魔法。",
    choices: [
      eventChoice("加入邓布利多军", "我想加入邓布利多军，秘密学习真正的防御魔法。"),
      eventChoice("观望考虑", "我想先观望，再决定是否卷入这场反抗。"),
      eventChoice("协助保密", "我想帮忙为 D.A. 的秘密集会望风、保密。"),
      eventChoice("专注学业", "我想把精力放在 O.W.L.s 学业上。"),
    ],
  },
  19951218: { title: "亚瑟·韦斯莱遇袭", note: "校历节点：哈利梦见亚瑟·韦斯莱被巨蛇纳吉尼袭击，预言得证，亚瑟被送圣芒戈医院抢救。" },
  19960113: { title: "大脑封闭术", note: "校历节点：为抵御伏地魔的思想入侵，邓布利多安排哈利向斯内普学习大脑封闭术。" },
  19960601: { title: "O.W.L.s 考试", note: "校历节点：O.W.L.s 考试涵盖各必修与选修科目，擅长学科可获「优秀」，关乎未来职业。" },
  19960620: {
    title: "神秘事务司之战",
    note: "校历节点（原著大事件）：哈利受幻象诱导带队前往魔法部神秘事务司，与食死徒激战，小天狼星被害。",
    choices: [
      eventChoice("随队前往", "我想随哈利等人前往魔法部援战。"),
      eventChoice("留校报信", "我想留在霍格沃茨向邓布利多与凤凰社报信。"),
      eventChoice("守护同伴", "战斗中我想用魔法掩护、守护身边的同伴。"),
      eventChoice("安抚善后", "我想在事后安抚哈利、处理这场战斗的余波。"),
    ],
  },
  19960628: {
    title: "离校 · 五年级结束",
    note: "校历节点：第五学年结束。混血王子的笔记与魂器之谜，将在下一年揭开。",
    choices: [
      advanceChoice("升入六年级 · 开启新学年", "暑假结束，我准备返校开始第六学年。", "1996年9月1日"),
      eventChoice("沉默告别", "我想在沉重的气氛里和朋友告别。"),
      eventChoice("收拾返家", "我想收拾行李返家过暑假。"),
      eventChoice("回顾这一年", "我想回顾凤凰社这一年的经历。"),
    ],
  },

  // ── 第六学年（1996–1997）· 混血王子（斯内普教黑魔法防御术）──
  19960901: {
    title: "六年级开学 · 混血王子的课本",
    note: "校历节点：第六学年开学，斯内普改教黑魔法防御术、斯拉格霍恩任魔药学。哈利获得署名「混血王子」的旧魔药课本。",
    choices: [
      eventChoice("登上特快返校", "我想返校开始第六学年。"),
      eventChoice("留意混血王子课本", "我想留意那本写满批注的旧魔药课本。"),
      eventChoice("旁听魂器传闻", "我想留意邓布利多与「魂器」有关的只言片语。"),
      eventChoice("照常开始日常", "我想照常开始第六学年的日常。"),
    ],
  },
  19961101: { title: "被诅咒的项链", note: "校历节点：凯蒂·贝尔被夺魂咒控制、触碰被诅咒的项链而昏迷，马尔福的嫌疑浮现。" },
  19961224: {
    title: "斯拉格霍恩圣诞晚会",
    note: "校历节点：圣诞。斯拉格霍恩的圣诞晚会上暗流涌动，斯内普带走鬼祟的马尔福。",
    choices: [
      eventChoice("出席晚会", "我想出席斯拉格霍恩的圣诞晚会，结识鼻涕虫俱乐部的人。"),
      eventChoice("留意马尔福", "我想留意马尔福在晚会上的鬼祟举动。"),
      eventChoice("安静过节", "我想安静地过个圣诞。"),
      eventChoice("旁观议论", "我想旁观晚会上的名流与议论。"),
    ],
  },
  19970101: { title: "魂器课", note: "校历节点：邓布利多开始向哈利讲述伏地魔的历史与魂器的秘密，作为击败他的准备。" },
  19970616: { title: "学年末考试", note: "校历节点（特殊年份）：6 月 16–20 日结业考试。N.E.W.T. 方向的课业压力达到顶点。" },
  19970630: {
    title: "天文塔之战 · 邓布利多之死",
    note: "校历节点（原著大事件，特殊设定 6 月 30 日晚）：食死徒潜入城堡，马尔福未能下手，斯内普替他杀死邓布利多。全校哀悼。",
    choices: [
      eventChoice("察觉异常", "我想在天文塔附近察觉异常并示警。"),
      eventChoice("参与防御", "我想参与对抗潜入城堡的食死徒。"),
      eventChoice("守护同学", "混乱中我想守护身边的低年级同学。"),
      eventChoice("默哀送别", "我想参加邓布利多的葬礼，为他默哀送别。"),
    ],
  },
  19970705: {
    title: "结业晚宴 · 离校",
    note: "校历节点（特殊年份）：7 月 5 日结业晚宴，7 月 6 日离校。前方是不再有安稳校园的最终之年。",
    choices: [
      advanceChoice("走向最终之年", "邓布利多已逝、黑暗降临，我准备迎接最终决战的一年。", "1997年9月1日"),
      eventChoice("沉默告别", "我想在沉痛中和朋友告别。"),
      eventChoice("收拾返家", "我想收拾行李离校。"),
      eventChoice("回顾这一年", "我想回顾混血王子这一年的经历。"),
    ],
  },

  // ── 第七学年（1997–1998）· 死亡圣器 · 最终决战 ──
  19970901: {
    title: "最终之年 · 魂器搜寻",
    note: "校历节点：魔法部垮台、伏地魔当权。哈利、罗恩、赫敏逃亡在外寻找魂器，本年极少在校。你可选择追随搜寻、传递消息或在城堡内潜伏。",
    choices: [
      eventChoice("追随魂器搜寻", "我想设法追随、协助哈利等人寻找魂器。"),
      eventChoice("城堡内潜伏", "我想留在霍格沃茨，在卡罗兄妹的高压下暗中收集情报。"),
      eventChoice("传递消息", "我想在霍格莫德一带为抵抗者传递消息、提供接应。"),
      eventChoice("日常生存", "逃亡与潜伏中，我想先解决日常的生存与安全。"),
    ],
  },
  19971201: { title: "死亡圣器的传说", note: "校历节点：三人获悉死亡圣器的传说——集齐三件宝物者可成为死神的主人。" },
  19980501: {
    title: "重返霍格沃茨 · 战役打响",
    note: "校历节点（原著大事件）：三人返校寻找最后的魂器，霍格沃茨战役打响，全城投入防御。",
    choices: [
      eventChoice("加入城堡防御", "我想加入保卫霍格沃茨的防御战。"),
      eventChoice("救护伤员", "我想为受伤的同学疗伤、运送物资。"),
      eventChoice("守护低年级", "我想护送、守护无法作战的低年级学生撤离。"),
      eventChoice("搜寻魂器", "我想协助在城堡里搜寻、摧毁最后的魂器。"),
    ],
  },
  19980502: {
    title: "最终决战 · 胜利",
    note: "校历节点（原著大事件）：纳威斩杀纳吉尼，哈利击败伏地魔，黑暗瓦解，黎明降临。",
    choices: [
      eventChoice("并肩到最后", "我想在最后的对抗里站到自己该站的位置。"),
      eventChoice("守护同伴", "我想拼尽全力守护身边的同伴。"),
      eventChoice("见证黎明", "我想见证伏地魔覆灭、城堡迎来黎明。"),
      eventChoice("清点幸存", "战火平息后，我想清点幸存的人、记住逝去的人。"),
    ],
  },
  19980601: {
    title: "战后重建 · 毕业",
    note: "校历节点：战后哀悼与重建。霍格沃茨为这一届学生补办毕业典礼，七年旅程走到终点。",
    choices: [
      advanceChoice("走向结局 · 十九年后", "尘埃落定，我想看看七年之后、十九年之后，我成为了怎样的人。", "2017年9月1日"),
      eventChoice("参与重建", "我想留下来协助重建霍格沃茨、哀悼牺牲的师友。"),
      eventChoice("与挚友合影", "我想和并肩走过七年的挚友合影留念。"),
      eventChoice("回望七年", "我想完整地回望从对角巷采购到最终决战的七年。"),
    ],
  },
  20170901: {
    title: "尾声 · 十九年后",
    note: "校历节点：2017 年 9 月 1 日，九又四分之三站台。当年的少年已为人父母，新一代踏上霍格沃茨之旅。结局将依据你七年来的全部数据生成。",
    choices: [
      eventChoice("生成我的结局", "我想根据这七年的养成、关系与抉择，生成属于我的十九年后结局。"),
      eventChoice("送孩子入学", "我想在站台上送下一代登上霍格沃茨特快。"),
      eventChoice("与老友重逢", "我想和哈利、罗恩、赫敏这些老友重逢叙旧。"),
      eventChoice("回望一生", "我想回望从 1991 到 2017 的整段人生。"),
    ],
  },
};

function calendarEvent(key) {
  const event = HOGWARTS_CALENDAR_EVENTS[key];
  if (!event) return null;
  if (event.choices?.length) return event;
  return {
    ...event,
    choices: [
      eventChoice("参与节点", `我想参与「${event.title}」这个校历节点，让它自然发生。`),
      eventChoice("旁观氛围", `我想让「${event.title}」作为背景，观察周围人物和学校气氛。`),
      eventChoice("找人同行", `我想在「${event.title}」这天找一个合适的人同行或聊天。`),
      eventChoice("照常生活", `我想在「${event.title}」这天照常生活，看它怎样影响我的日常。`),
    ],
  };
}

function shoppingMoment() {
  return calendarEvent(19910816);
}

function openingDayMoment(periodId) {
  const p = dayPeriod(periodId);
  const sets = {
    morning: [
      eventChoice("寻找站台", "我想先在国王十字车站寻找九又四分之三站台。"),
      eventChoice("穿过屏障", "我想推着行李穿过站台屏障，真正踏进魔法世界。"),
      eventChoice("上车找包厢", "我想登上霍格沃茨特快，找一个包厢坐下。"),
      eventChoice("站台遇见同学", "我想在站台上看看会不会遇见同届新生或熟面孔。"),
    ],
    afternoon: [
      eventChoice("列车包厢", "下午列车还在北上，我想在包厢里度过一段真实的旅程。"),
      eventChoice("列车上闲逛", "我想在列车上走走，看看会遇见哪些同届新生。"),
      eventChoice("买些零食", "食品推车经过时，我想买点巧克力蛙或比比多味豆。"),
      eventChoice("抵达霍格莫德", "窗外天色渐暗，我想把镜头推进到抵达霍格莫德站。"),
    ],
    dinner: [
      eventChoice("抵达城堡", "我想跟随新生队伍抵达霍格沃茨，第一次看见城堡和礼堂。"),
      eventChoice("等待分院", "我想站在新生队伍里等待分院，观察教授和同学的反应。"),
      eventChoice("分院仪式", "我想让分院帽进行分院，但不要替我固定之后的人生。"),
      eventChoice("开学晚宴", "我想参加开学晚宴，听邓布利多讲话，感受第一晚的气氛。"),
    ],
    night: [
      eventChoice("前往公共休息室", "晚宴结束后，我想跟着级长前往公共休息室，记住路线和口令。"),
      eventChoice("认识室友", "我想在寝室或休息室里认识同学院的新同学。"),
      eventChoice("整理行李", "我想整理今天买来的东西和带来的行李，让自己安顿下来。"),
      eventChoice("结束开学日", "第一天太漫长了，我想回寝室休息，明天正式开始上课。", {
        nextTimeLabel: "1991年9月2日",
        nextPeriodId: "morning",
      }),
    ],
    late: [
      eventChoice("直接休息", "已经深夜了，我想回寝室睡下，让开学第一天自然结束。", {
        nextTimeLabel: "1991年9月2日",
        nextPeriodId: "morning",
      }),
      eventChoice("深夜低声谈话", "已经深夜了，我想和室友低声说几句，但不再把主线往前推太多。"),
      eventChoice("记下第一天", "我想在睡前记录开学第一天发生的事。"),
    ],
  };
  return {
    title: `开学日 · ${p.label}`,
    periodLabel: p.label,
    note: "9 月 1 日按生活时段推进：上午站台，下午列车，晚饭后抵达与分院，夜晚回到公共休息室。你可以自由扮演，也可以随时进入下一时段。",
    choices: sets[p.id] || sets.morning,
  };
}

// 开学前养成（8/17–8/31）：预习、练咒、飞行、写信等，确定性小幅成长；准备好就出发。
function preTermMoment() {
  return {
    title: "开学前的日子",
    periodLabel: "假期",
    note: "距离开学还有些日子。你可以预习课本、练习魔咒、熟悉飞行或给家人写信——每做一件都会带来一点成长；准备好了就出发去国王十字车站。也可以直接在输入框自由写。",
    choices: [
      growthChoice("预习课本", "我想预习这学期的课本，为开学做准备。", { academic: 2 }, { advancePeriod: false }),
      growthChoice("练习魔咒", "我想偷偷练习几个基础魔咒，熟悉挥杖的手感。", { magic: 2 }, { advancePeriod: false }),
      growthChoice("熟悉飞行", "我想找机会熟悉一下扫帚和飞行的感觉。", { agility: 2 }, { advancePeriod: false }),
      growthChoice("给家人写信", "我想给家人写信，聊聊即将到来的霍格沃茨生活。", { family: 2 }, { advancePeriod: false }),
      growthChoice("读《一段校史》", "我想读一读《霍格沃茨，一段校史》，多了解这个魔法世界。", { academic: 1, courage: 1 }, { advancePeriod: false }),
      advanceChoice("准备出发 · 前往国王十字车站", "开学前的准备做得差不多了，我想出发前往国王十字车站。", "1991年9月1日"),
    ],
  };
}

// 暑假（7-8 月，非开学前采购序章）的通用日常入口，避免在假期里错误地套用校内课表。
function summerMoment() {
  return {
    title: "暑假",
    note: "假期中的日常：家里、对角巷、给朋友写信，或为新学年做准备。这不是固定收益菜单，你也可以直接自由写。",
    choices: [
      choice("在家度日", "假期里我想在家过一段普通日子，看看会自然发生什么。"),
      choice("给朋友写信", "我想给朋友或同学写信，维系假期里的联系。"),
      choice("逛对角巷", "我想去对角巷采购或闲逛，为新学年做准备。"),
      choice("预习与练习", "我想利用假期预习课本或练习咒语，但不预设固定收益。"),
    ],
  };
}

function dailyMoment(period, currentTimeLabel = "") {
  const p = dayPeriod(period);
  const tt = timetableContext({ currentTimeLabel, periodId: p.id });
  const classChoice = classChoiceFromTimetable(tt);
  const sets = {
    morning: [
      classChoice || choice("按课表上课", "我想按今天上午的课表去上课，看看课堂上会发生什么。", { mechanic: "课堂" }),
      choice("早餐后找人", "早餐后我想找一个合适的人同行或聊天。"),
      choice("去图书馆", "上午我想去图书馆，不预设收获，只看会自然发生什么。"),
      choice("在城堡里走走", "上午我想在城堡里走走，熟悉路线和气氛。"),
    ],
    afternoon: [
      classChoice || choice("下午课后活动", "下午课后我想自由安排一段时间，看学校里自然发生什么。"),
      choice("去球场看看", "下午我想去魁地奇球场看看训练或选拔动静。"),
      choice("去庭院或黑湖边", "下午我想去庭院或黑湖边透透气。"),
      choice("继续查资料", "下午我想找地方查资料或复习，但不把它固定成数值收益。"),
    ],
    dinner: [
      choice("去礼堂晚餐", "晚饭后我想留意礼堂里的聊天、传闻和人物互动。"),
      choice("公共休息室", "晚饭后我想回公共休息室，看看同学院的人在做什么。"),
      choice("找人谈谈", "晚饭后我想找一个人谈谈或一起消磨时间。"),
      choice("轻微支线", "晚饭后我想遇到一点小插曲或支线线索，但不要强推主线。"),
    ],
    night: [
      choice("休息室日常", "夜晚我想待在公共休息室，过一段安静但真实的校园生活。"),
      choice("低声谈话", "夜晚我想和某个人低声谈谈，看看关系会怎么发展。"),
      choice("写信或整理", "夜晚我想写信、整理物品或记录今天发生的事。"),
      choice("轻微违规", "夜晚我想做一点轻微违规的事，但不要直接跳到严重危险。"),
    ],
    late: [
      choice("直接休息", "已经深夜了，我想回去休息，让今天自然结束。", { nextPeriodId: "morning" }),
      choice("夜游试探", "深夜我想小心地夜游试探一下，但要遵守宵禁风险。"),
      choice("秘密线索", "深夜我想碰到一点秘密线索或异常动静，但不要越过当前原著阶段。"),
      choice("被发现风险", "深夜我想让风险靠近一些，可能被级长、教授或费尔奇发现。"),
    ],
  };
  return {
    title: classChoice ? `${p.label}课表` : `${p.label}安排`,
    note: [
      formatTimetableBlock(tt).replace(/^【今日课表】\n?/, ""),
      "这些是校历和时间段给出的日常入口，不是固定收益菜单。你也可以直接在输入框自由写。",
    ].filter(Boolean).join(" "),
    choices: sets[p.id] || sets.morning,
    timetable: tt,
  };
}

export function calendarMoment({ currentTimeLabel, periodId }) {
  const k = labelSortKey(currentTimeLabel);
  if (k && k <= 19910816) return shoppingMoment();                  // 8/16 对角巷采购
  if (k && k >= 19910817 && k < 19910901) return preTermMoment();   // 8/17–8/31 开学前养成
  if (k === 19910901) return openingDayMoment(periodId);            // 9/1 按时段推进站台/列车/分院
  if (k === 19910902) return withFastForward(dailyMoment(periodId, currentTimeLabel), currentTimeLabel);
  const event = calendarEvent(k);
  if (event) return event;
  const month = k ? Math.floor((k % 10000) / 100) : 0;
  if (k >= 19910901 && (month === 7 || month === 8)) return withFastForward(summerMoment(), currentTimeLabel);
  return withFastForward(dailyMoment(periodId, currentTimeLabel), currentTimeLabel);
}

// 给日常 / 暑假入口追加一个「快进到下一个重要日子」选项，让玩家自行决定玩一天还是很多天。
function withFastForward(moment, currentTimeLabel) {
  const nextEv = nextCalendarEvent(currentTimeLabel);
  if (!nextEv) return moment;
  return {
    ...moment,
    choices: [
      ...(moment.choices || []),
      advanceChoice(`⏭ 快进到「${nextEv.title}」`, `日子平静地过着，我想把时间快进到下一个重要的日子（${nextEv.label} · ${nextEv.title}）。`, nextEv.label),
    ],
  };
}

export function buildCalendarChoiceInput(choiceItem, period, currentTimeLabel) {
  const beforeTerm = labelSortKey(currentTimeLabel) && labelSortKey(currentTimeLabel) < 19910901;
  const tt = timetableContext({ currentTimeLabel, periodId: period?.id || "morning" });
  const p = beforeTerm
    ? "当前阶段：开学前采购日（对角巷采购，不按霍格沃茨校内课表运行）。"
    : (period ? `当前时间段：${period.label}（${period.instruction}）。` : "");
  const t = currentTimeLabel ? `当前日期：${currentTimeLabel}。` : "";
  const schedule = beforeTerm ? "" : `校历作息：${CLASS_DAY_RULES.join(" ")}`;
  const timetable = beforeTerm ? "" : formatTimetableBlock(tt);
  const next = choiceItem.nextTimeLabel ? `本次选择后，当前日期应推进到：${choiceItem.nextTimeLabel}。` : "";
  const nextPeriod = choiceItem.nextPeriodId ? `本次选择后，当前生活时段应为：${dayPeriod(choiceItem.nextPeriodId).label}。` : "";
  const lesson = choiceItem.lesson ? `本次选择对应课程：${choiceItem.lesson.course}；地点：${choiceItem.lesson.location}；教授：${choiceItem.lesson.teacher}。` : "";
  return [
    "【校历安排】",
    t,
    p,
    schedule,
    timetable,
    next,
    nextPeriod,
    lesson,
    choiceItem.intent,
    "请根据校历、当前时间、地点、人物关系和已有记忆自由生成发生的事；这不是固定收益选项。"
  ].filter(Boolean).join("\n");
}

export function scheduleContext({ currentTimeLabel = "", periodId = "morning" } = {}) {
  const period = dayPeriod(periodId);
  const phase = calendarPhase(currentTimeLabel);
  const timetable = timetableContext({ currentTimeLabel, periodId: period.id });
  const moment = calendarMoment({ currentTimeLabel, periodId: period.id });
  const nextClock = advanceCalendarClock({ currentTimeLabel, periodId: period.id });
  const nextEvent = nextCalendarEvent(currentTimeLabel);
  const firstLesson = timetable.lessons?.[0] || null;
  const nextPeriod = dayPeriod(nextClock.periodId);
  const isRegularClassTime = phase.lockedToSchool && timetable.hasClass;
  const isFreeSchoolTime = phase.lockedToSchool && !timetable.hasClass && !timetable.holiday;
  const summaryBits = [
    currentTimeLabel || "未设定日期",
    period.label,
    phase.label,
    firstLesson ? `当前课：${firstLesson.course}` : "",
    timetable.holiday ? "无常规课堂" : "",
    isFreeSchoolTime ? "自由活动时段" : "",
  ].filter(Boolean);
  return {
    currentTimeLabel,
    period,
    phase,
    timetable,
    moment,
    nextClock,
    nextEvent,
    firstLesson,
    isRegularClassTime,
    isFreeSchoolTime,
    isBeforeTerm: phase.id === "shopping" || phase.id === "pre_term",
    isOpeningDay: phase.id === "opening_day",
    isSpecialEvent: phase.id === "special_event",
    nextPeriodLabel: nextPeriod.label,
    summary: summaryBits.join(" · "),
  };
}

export function formatScheduleContextBlock(ctx) {
  if (!ctx) return "";
  const openingPeriodGuide = {
    morning: "站台、屏障、上车前的行李与人群更自然。",
    afternoon: "霍格沃茨特快、包厢、食品推车和同届新生更自然。",
    dinner: "抵达霍格莫德、入湖、城堡、礼堂与分院更自然。",
    night: "公共休息室、级长带路、室友、口令和安顿更自然。",
    late: "寝室、低声谈话、写下第一天或直接休息更自然。",
  };
  const periodInstruction = ctx.isBeforeTerm
    ? "开学前/校外生活节奏；采购、备课、写信、整理行李更自然。"
    : ctx.isOpeningDay
      ? openingPeriodGuide[ctx.period.id] || ctx.period.instruction
      : ctx.timetable?.holiday
        ? "假期或留校生活节奏；通信、返校准备、节日活动和安静日常更自然。"
        : ctx.period.instruction;
  const lines = [
    "【统一日程上下文】",
    `当前：${ctx.summary}`,
    `阶段：${ctx.phase.label}（${ctx.phase.id}）。`,
    `时段：${ctx.period.label}；${periodInstruction}`,
  ];
  if (ctx.firstLesson) {
    lines.push(`本时段课表：${ctx.timetable.lessons.map(formatLesson).join("；")}。课堂可发生互动、点名、练习或平静上课，不是固定收益。`);
  } else if (ctx.timetable?.holiday) {
    lines.push("本时段无常规课堂：按假期、留校、返校准备、通信或日常处理。");
  } else if (ctx.isBeforeTerm) {
    lines.push("当前不按校内课表运行：优先采购、备课、写信、行李、家中或对角巷生活。");
  } else if (ctx.isOpeningDay) {
    lines.push("开学日按时段推进：上午站台，下午列车，晚饭后抵达/分院，夜晚公共休息室与安顿。");
  } else if (ctx.isFreeSchoolTime) {
    lines.push("当前不是常规上课时段：可进行日常、社交、作业、社团、晚餐或地点事件。");
  }
  if (ctx.nextClock) {
    lines.push(`下一时段按钮将进入：${ctx.nextClock.currentTimeLabel || ctx.currentTimeLabel} · ${ctx.nextPeriodLabel}${ctx.nextClock.dayRollover ? "（跨天）" : ""}。`);
  }
  if (ctx.nextEvent) {
    lines.push(`下一个重要校历节点：${ctx.nextEvent.label} · ${ctx.nextEvent.title}。`);
  }
  return lines.filter(Boolean).join("\n");
}
