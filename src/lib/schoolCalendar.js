import { labelSortKey } from "./timeline.js";

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

export function formatCalendarPeriodBlock(period) {
  if (!period) return "";
  return `【当前生活时间段】${period.label}：${period.instruction}。这只是生活氛围与事件池参考，不代表固定剧情。`;
}

const choice = (label, intent, opts = {}) => ({ label, intent, ...opts });

const eventChoice = (label, intent, opts = {}) => choice(label, intent, opts);

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
      eventChoice("准备出发", "采购差不多结束了，我想把时间推进到开学日，前往国王十字车站。", {
        nextTimeLabel: "1991年9月1日",
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
  19920215: { title: "魁地奇常规赛", note: "校历节点：2 月第三个周六魁地奇常规赛。" },
  19920307: { title: "魁地奇常规赛", note: "校历节点：3 月第一个周六魁地奇常规赛。" },
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
  19920605: { title: "期末考结束", note: "校历节点：期末考试结束。" },
  19920620: { title: "结业晚宴", note: "校历节点：结业晚宴。" },
  19920621: { title: "离校", note: "校历节点：次日离校，学年结束。" },
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

function dailyMoment(period) {
  const p = dayPeriod(period);
  const sets = {
    morning: [
      choice("按课表上课", "我想按今天上午的课表去上课，看看课堂上会发生什么。"),
      choice("早餐后找人", "早餐后我想找一个合适的人同行或聊天。"),
      choice("去图书馆", "上午我想去图书馆，不预设收获，只看会自然发生什么。"),
      choice("在城堡里走走", "上午我想在城堡里走走，熟悉路线和气氛。"),
    ],
    afternoon: [
      choice("下午课后活动", "下午课后我想自由安排一段时间，看学校里自然发生什么。"),
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
    title: `${p.label}安排`,
    note: "这些是校历和时间段给出的日常入口，不是固定收益菜单。你也可以直接在输入框自由写。",
    choices: sets[p.id] || sets.morning,
  };
}

export function calendarMoment({ currentTimeLabel, periodId }) {
  const k = labelSortKey(currentTimeLabel);
  if (k && k < 19910901) return shoppingMoment();
  return calendarEvent(k) || dailyMoment(periodId);
}

export function buildCalendarChoiceInput(choiceItem, period, currentTimeLabel) {
  const beforeTerm = labelSortKey(currentTimeLabel) && labelSortKey(currentTimeLabel) < 19910901;
  const p = beforeTerm
    ? "当前阶段：开学前采购日（对角巷采购，不按霍格沃茨校内课表运行）。"
    : (period ? `当前时间段：${period.label}（${period.instruction}）。` : "");
  const t = currentTimeLabel ? `当前日期：${currentTimeLabel}。` : "";
  const schedule = beforeTerm ? "" : `校历作息：${CLASS_DAY_RULES.join(" ")}`;
  const next = choiceItem.nextTimeLabel ? `本次选择后，当前日期应推进到：${choiceItem.nextTimeLabel}。` : "";
  return [
    "【校历安排】",
    t,
    p,
    schedule,
    next,
    choiceItem.intent,
    "请根据校历、当前时间、地点、人物关系和已有记忆自由生成发生的事；这不是固定收益选项。"
  ].filter(Boolean).join("\n");
}
