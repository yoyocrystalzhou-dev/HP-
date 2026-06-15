/**
 * Hogwarts life-scene matrix.
 *
 * This layer is intentionally not a fixed menu. It gives the narrator a map of
 * playable places, event families, and recurrence rules so the same location or
 * event can mutate, deepen, or resolve across later scenes.
 */

const loc = (id, label, zone, tags, opts = {}) => ({
  id,
  label,
  zone,
  tags,
  aliases: opts.aliases || [],
  access: opts.access || "open",
  periods: opts.periods || ["morning", "afternoon", "dinner", "night"],
  risk: opts.risk || "low",
  likelyPeople: opts.likelyPeople || [],
  eventFamilies: opts.eventFamilies || [],
});

export const HOGWARTS_LOCATIONS = [
  loc("great_hall", "礼堂", "城堡公共区", ["用餐", "公告", "学院氛围"], {
    aliases: ["大厅", "大礼堂", "晚宴", "早餐", "午餐", "晚餐"],
    periods: ["morning", "afternoon", "dinner", "night"],
    likelyPeople: ["同学院学生", "教授", "级长", "哈利三人组", "德拉科一行"],
    eventFamilies: ["rumor", "house_pressure", "public_encounter", "canon_echo", "letter"],
  }),
  loc("entrance_hall", "入口大厅", "城堡公共区", ["转场", "拥挤", "偶遇"], {
    aliases: ["门厅", "城堡入口", "大门"],
    likelyPeople: ["费尔奇", "级长", "匆忙赶课的学生"],
    eventFamilies: ["corridor_encounter", "rule_risk", "lost_object", "public_encounter"],
  }),
  loc("grand_staircase", "大理石楼梯与移动楼梯", "城堡公共区", ["迷路", "移动", "画像"], {
    aliases: ["楼梯", "移动楼梯", "大理石楼梯", "画像走廊"],
    risk: "medium",
    likelyPeople: ["画像", "赶课学生", "幽灵", "费尔奇"],
    eventFamilies: ["lost", "portrait_gossip", "rule_risk", "secret_clue"],
  }),
  loc("corridors", "城堡走廊", "城堡公共区", ["日常", "流言", "巡逻"], {
    aliases: ["走廊", "过道", "城堡里走走"],
    periods: ["morning", "afternoon", "dinner", "night", "late"],
    risk: "medium",
    likelyPeople: ["同学", "级长", "幽灵", "费尔奇", "教授"],
    eventFamilies: ["corridor_encounter", "rumor", "rule_risk", "rivalry", "secret_clue"],
  }),
  loc("courtyard", "庭院", "城堡公共区", ["透气", "闲聊", "天气"], {
    aliases: ["院子", "庭院", "中庭"],
    periods: ["morning", "afternoon", "dinner"],
    likelyPeople: ["结伴学生", "独处的同学", "低年级新生"],
    eventFamilies: ["quiet_moment", "friendship", "weather", "public_encounter"],
  }),
  loc("library", "图书馆", "学习区", ["学习", "资料", "安静"], {
    aliases: ["图书馆", "查资料", "复习", "借书"],
    periods: ["morning", "afternoon", "dinner", "night"],
    likelyPeople: ["赫敏", "拉文克劳学生", "平斯夫人", "赶作业的学生"],
    eventFamilies: ["quiet_study", "research_clue", "study_help", "misunderstanding", "rule_risk"],
  }),
  loc("restricted_section", "禁书区", "学习区", ["禁区", "秘密", "风险"], {
    aliases: ["禁书区", "禁书", "限制区"],
    access: "restricted",
    periods: ["night", "late"],
    risk: "high",
    likelyPeople: ["平斯夫人", "费尔奇", "夜游者"],
    eventFamilies: ["secret_clue", "rule_risk", "magical_mishap", "canon_echo"],
  }),
  loc("common_room", "公共休息室", "学院生活区", ["同学院", "休息", "社交"], {
    aliases: ["公共休息室", "休息室", "壁炉边"],
    periods: ["dinner", "night", "late"],
    likelyPeople: ["同学院学生", "级长", "室友"],
    eventFamilies: ["friendship", "house_pressure", "homework", "letter", "quiet_moment"],
  }),
  loc("dormitory", "宿舍", "学院生活区", ["休息", "私人物品", "室友"], {
    aliases: ["宿舍", "寝室", "床铺"],
    periods: ["night", "late", "morning"],
    likelyPeople: ["室友"],
    eventFamilies: ["quiet_moment", "letter", "lost_object", "friendship"],
  }),
  loc("owlery", "猫头鹰棚", "城堡高处", ["书信", "高处", "风"], {
    aliases: ["猫头鹰棚", "猫头鹰屋", "寄信"],
    periods: ["morning", "afternoon", "dinner"],
    risk: "medium",
    likelyPeople: ["寄信的学生", "猫头鹰"],
    eventFamilies: ["letter", "quiet_moment", "public_encounter", "weather"],
  }),
  loc("hospital_wing", "校医院", "城堡服务区", ["受伤", "照顾", "庞弗雷夫人"], {
    aliases: ["校医院", "医疗翼", "庞弗雷夫人"],
    likelyPeople: ["庞弗雷夫人", "受伤学生", "探病者"],
    eventFamilies: ["care", "consequence", "friendship", "professor_attention"],
  }),
  loc("trophy_room", "奖杯陈列室", "城堡公共区", ["荣誉", "夜游", "学院"], {
    aliases: ["奖杯室", "陈列室", "盔甲走廊", "盔甲"],
    periods: ["afternoon", "night", "late"],
    risk: "medium",
    likelyPeople: ["费尔奇", "夜游者"],
    eventFamilies: ["house_pressure", "rule_risk", "secret_clue", "rivalry"],
  }),
  loc("bathrooms", "盥洗室", "城堡公共区", ["私密", "躲避", "偶遇"], {
    aliases: ["盥洗室", "厕所", "洗手间", "女生盥洗室", "男生盥洗室"],
    periods: ["morning", "afternoon", "dinner", "night"],
    risk: "medium",
    likelyPeople: ["学生", "幽灵"],
    eventFamilies: ["misunderstanding", "secret_clue", "rule_risk", "canon_echo"],
  }),
  loc("kitchens", "厨房", "隐藏区域", ["食物", "家养小精灵", "隐藏"], {
    aliases: ["厨房", "找吃的", "家养小精灵"],
    access: "hidden",
    periods: ["dinner", "night", "late"],
    risk: "medium",
    likelyPeople: ["家养小精灵", "偷溜出来的学生"],
    eventFamilies: ["quiet_moment", "help_request", "rule_risk", "friendship"],
  }),
  loc("staff_room", "教工休息室", "限制区域", ["教授", "纪律", "误入"], {
    aliases: ["教工休息室", "教师休息室"],
    access: "restricted",
    periods: ["morning", "afternoon", "dinner"],
    risk: "high",
    likelyPeople: ["教授", "费尔奇"],
    eventFamilies: ["professor_attention", "rule_risk", "misunderstanding"],
  }),
  loc("filch_office", "费尔奇办公室", "限制区域", ["惩罚", "证据", "纪律"], {
    aliases: ["费尔奇办公室", "管理员办公室"],
    access: "restricted",
    periods: ["afternoon", "night", "late"],
    risk: "high",
    likelyPeople: ["费尔奇", "洛丽丝夫人", "被罚学生"],
    eventFamilies: ["rule_risk", "consequence", "secret_clue"],
  }),
  loc("charms_classroom", "魔咒课教室", "课堂区", ["魔咒", "练习", "弗立维"], {
    aliases: ["魔咒课", "魔咒教室", "弗立维"],
    periods: ["morning", "afternoon"],
    likelyPeople: ["弗立维教授", "同班同学"],
    eventFamilies: ["class_challenge", "practice", "magical_mishap", "professor_attention"],
  }),
  loc("transfiguration_classroom", "变形术教室", "课堂区", ["变形术", "严谨", "麦格"], {
    aliases: ["变形术", "变形术教室", "麦格"],
    periods: ["morning", "afternoon"],
    likelyPeople: ["麦格教授", "同班同学"],
    eventFamilies: ["class_challenge", "practice", "professor_attention", "house_pressure"],
  }),
  loc("potions_dungeon", "魔药课地下教室", "课堂区", ["魔药", "地窖", "斯内普"], {
    aliases: ["魔药课", "魔药教室", "地窖", "斯内普"],
    periods: ["morning", "afternoon"],
    risk: "medium",
    likelyPeople: ["斯内普教授", "斯莱特林学生", "同班同学"],
    eventFamilies: ["class_challenge", "rivalry", "magical_mishap", "professor_attention"],
  }),
  loc("dada_classroom", "黑魔法防御术教室", "课堂区", ["防御术", "奇洛", "异常"], {
    aliases: ["黑魔法防御术", "防御术教室", "奇洛"],
    periods: ["morning", "afternoon"],
    risk: "medium",
    likelyPeople: ["奇洛教授", "同班同学"],
    eventFamilies: ["class_challenge", "canon_echo", "misunderstanding", "secret_clue"],
  }),
  loc("herbology_greenhouses", "草药课温室", "课堂区", ["草药", "温室", "植物"], {
    aliases: ["温室", "草药课", "草药课温室", "斯普劳特"],
    periods: ["morning", "afternoon"],
    likelyPeople: ["斯普劳特教授", "同班同学"],
    eventFamilies: ["class_challenge", "creature_plant", "help_request", "practice"],
  }),
  loc("history_magic_classroom", "魔法史教室", "课堂区", ["魔法史", "宾斯", "昏昏欲睡"], {
    aliases: ["魔法史", "宾斯"],
    periods: ["morning", "afternoon"],
    likelyPeople: ["宾斯教授", "犯困的学生"],
    eventFamilies: ["class_challenge", "quiet_moment", "rumor", "study_help"],
  }),
  loc("astronomy_tower", "天文塔", "城堡高处", ["天文", "夜晚", "高处"], {
    aliases: ["天文塔", "塔楼", "观星"],
    periods: ["night", "late"],
    risk: "medium",
    likelyPeople: ["天文课学生", "夜游者", "教授"],
    eventFamilies: ["class_challenge", "quiet_moment", "secret_clue", "weather"],
  }),
  loc("flying_lawn", "飞行课草坪", "户外课堂区", ["飞行", "扫帚", "敏捷"], {
    aliases: ["飞行课", "飞行草坪", "扫帚课"],
    periods: ["morning", "afternoon"],
    risk: "medium",
    likelyPeople: ["霍琦夫人", "同班同学", "纳威", "德拉科"],
    eventFamilies: ["class_challenge", "practice", "rivalry", "canon_echo"],
  }),
  loc("quidditch_pitch", "魁地奇球场", "户外活动区", ["魁地奇", "训练", "比赛"], {
    aliases: ["球场", "魁地奇球场", "训练场", "看台"],
    periods: ["afternoon", "dinner"],
    risk: "medium",
    likelyPeople: ["球队成员", "伍德", "看训练的学生"],
    eventFamilies: ["practice", "house_pressure", "rivalry", "public_encounter", "weather"],
  }),
  loc("lawns", "城堡草坪", "户外公共区", ["散步", "阳光", "课后"], {
    aliases: ["草坪", "斜坡草地", "花坛"],
    periods: ["morning", "afternoon", "dinner"],
    likelyPeople: ["三两成群的学生", "独处的同学"],
    eventFamilies: ["quiet_moment", "friendship", "weather", "public_encounter"],
  }),
  loc("black_lake", "黑湖边", "户外公共区", ["湖", "安静", "水中生物"], {
    aliases: ["黑湖", "湖边", "湖畔"],
    periods: ["afternoon", "dinner", "night"],
    risk: "medium",
    likelyPeople: ["散步学生", "独处的人", "巨乌贼"],
    eventFamilies: ["quiet_moment", "creature_plant", "friendship", "secret_clue", "weather"],
  }),
  loc("boathouse", "船坞", "户外边缘区", ["抵达", "湖", "边缘"], {
    aliases: ["船坞", "小船", "码头"],
    periods: ["morning", "afternoon", "dinner"],
    risk: "medium",
    likelyPeople: ["低年级学生", "海格"],
    eventFamilies: ["quiet_moment", "lost_object", "public_encounter", "weather"],
  }),
  loc("hagrids_hut", "海格小屋", "户外边缘区", ["海格", "茶", "动物"], {
    aliases: ["海格小屋", "海格", "小屋"],
    periods: ["afternoon", "dinner"],
    risk: "medium",
    likelyPeople: ["海格", "哈利三人组", "牙牙"],
    eventFamilies: ["friendship", "creature_plant", "help_request", "canon_echo"],
  }),
  loc("forbidden_forest_edge", "禁林边缘", "限制户外区", ["禁林", "危险", "边缘"], {
    aliases: ["禁林边缘", "禁林外", "森林边"],
    periods: ["afternoon", "dinner", "night", "late"],
    access: "restricted",
    risk: "high",
    likelyPeople: ["海格", "费尔奇", "夜游者", "未知动静"],
    eventFamilies: ["rule_risk", "creature_plant", "secret_clue", "canon_echo", "weather"],
  }),
  loc("forbidden_forest_deep", "禁林深处", "禁区", ["禁林", "高危险", "越界"], {
    aliases: ["禁林深处", "深入禁林"],
    periods: ["night", "late"],
    access: "forbidden",
    risk: "very_high",
    likelyPeople: ["海格", "未知生物"],
    eventFamilies: ["rule_risk", "creature_plant", "secret_clue", "consequence"],
  }),
  loc("whomping_willow", "打人柳附近", "禁区", ["打人柳", "秘密通道", "危险"], {
    aliases: ["打人柳", "柳树"],
    periods: ["afternoon", "night", "late"],
    access: "forbidden",
    risk: "very_high",
    likelyPeople: ["远远围观的学生", "教授"],
    eventFamilies: ["rule_risk", "secret_clue", "consequence"],
  }),
  loc("secret_passages", "秘密通道与隐藏门", "隐藏区域", ["秘密", "捷径", "画像/雕像"], {
    aliases: ["秘密通道", "暗道", "隐藏门", "密道", "雕像"],
    periods: ["dinner", "night", "late"],
    access: "hidden",
    risk: "high",
    likelyPeople: ["韦斯莱双胞胎", "费尔奇", "夜游者"],
    eventFamilies: ["secret_clue", "rule_risk", "lost", "rivalry"],
  }),
  loc("hogsmeade_station", "霍格莫德车站", "校外交通", ["列车", "抵达", "离校"], {
    aliases: ["霍格莫德车站", "车站", "特快列车"],
    periods: ["morning", "afternoon", "dinner"],
    access: "calendar",
    likelyPeople: ["新生", "海格", "同学"],
    eventFamilies: ["public_encounter", "lost_object", "canon_echo", "weather"],
  }),
  loc("hogsmeade_village", "霍格莫德村", "校外许可区", ["三年级以上", "周末", "商店"], {
    aliases: ["霍格莫德", "蜂蜜公爵", "三把扫帚", "尖叫棚屋"],
    periods: ["afternoon", "dinner"],
    access: "permission",
    risk: "medium",
    likelyPeople: ["三年级以上学生", "店主", "教授"],
    eventFamilies: ["public_encounter", "friendship", "rumor", "secret_clue"],
  }),
];

export const LIFE_EVENT_FAMILIES = [
  ["quiet_moment", "安静日常：休息、观察、写信、整理物品、发呆；可以没有收益，但应留下生活质感。"],
  ["public_encounter", "公共偶遇：某人自然出现，反应受时间、学院、好感度、上次互动影响。"],
  ["friendship", "关系推进：一起完成小事、互相试探、误会修复、共同秘密；不得直接越过好感门槛。"],
  ["rivalry", "竞争/摩擦：学院立场、课堂表现、魁地奇、流言引发轻微冲突。"],
  ["rumor", "传闻：礼堂、走廊、公共休息室里出现不完整消息，可真可假，可成为支线线索。"],
  ["portrait_gossip", "画像/幽灵信息：提供偏颇、古怪、半真半假的线索或吐槽。"],
  ["lost", "迷路/路线变化：移动楼梯、走廊、隐藏门改变路线，带来偶遇或延误。"],
  ["lost_object", "遗失物：捡到、弄丢、误拿、归还物品，制造关系和后续钩子。"],
  ["homework", "作业/复习：可以变成合作、拖延、被纠正、发现资料，不固定加学术。"],
  ["study_help", "学习互助：有人帮忙或需要帮助，结果取决于具体行为和关系。"],
  ["research_clue", "资料线索：书页、脚注、旧报纸、借阅记录等引出可追踪线索。"],
  ["class_challenge", "课堂挑战：提问、练习、示范、小测、被教授点名；必要时触发判定。"],
  ["practice", "练习突破：施法、飞行、魁地奇或技能训练；可能成功、卡住或出糗。"],
  ["magical_mishap", "魔法小事故：咒语、魔药、物品或植物出问题；通常轻量、不致命。"],
  ["creature_plant", "生物/植物接触：猫头鹰、巨乌贼、温室植物、牙牙、禁林边缘动静。"],
  ["rule_risk", "违规风险：宵禁、禁区、教授/级长/费尔奇巡逻；可能只是擦肩而过。"],
  ["professor_attention", "教授关注：提醒、扣/加分、提问、留堂、私下观察。"],
  ["house_pressure", "学院压力：学院分、同院期待、学院偏见、魁地奇荣誉。"],
  ["help_request", "求助：同学、教授、幽灵或小精灵提出小请求，可形成短支线。"],
  ["secret_clue", "秘密线索：异常声音、脚印、藏起的纸条、禁区提示；不直接剧透。"],
  ["canon_echo", "原著锚点回声：让大事件以背景、传闻、旁观、边缘参与的方式自然靠近。"],
  ["weather", "天气/季节：雨、雾、雪、风、寒冷、阳光改变人物行为和氛围。"],
  ["letter", "书信/家庭：猫头鹰、家信、包裹、吼叫信或无人来信影响情绪。"],
  ["care", "照顾/恢复：受伤、疲惫、探病、被照顾或照顾别人。"],
  ["consequence", "后果回收：上次事件造成的关系、惩罚、流言、物品、伤势被再次提及。"],
  ["misunderstanding", "误会：听错、撞见片段、被误认、立场误读；可升级或澄清。"],
];

const FAMILY_MAP = new Map(LIFE_EVENT_FAMILIES);

export const LIFE_SCENE_ENGINE_RULES =
  "【霍格沃茨生活场景引擎】\n" +
  "- 地点不是固定按钮，事件不是固定结算。请把地点、时间段、校历、人物关系、上一轮记忆和原著锚点组合成一次具体生活片段。\n" +
  "- 玩家是在扮演角色，不是在写导演提示。请从角色行为里读倾向：闲逛、坐下、写信、整理物品偏日常；寻找/靠近某人偏人物互动；偷听、翻找、跟踪、观察异常偏线索或风险；躲避巡逻、夜游、进入禁区偏危险。\n" +
  "- 同一个地点可以发生完全不同的事；同一种事件再次出现时，必须体现变化：记得上次、关系有进展、风险升级、线索推进、误会发酵、或后果回收。\n" +
  "- 不要把事件写成列表或任务板；只把最自然的一到两个事件融进叙事。\n" +
  "- 事件可平静、可空转、可只留下氛围；不是每次都要奖励、危险或主线推进。\n" +
  "- 禁区/深夜/秘密通道/禁书区必须带风险，但风险可以是擦肩而过、被警告、留下疑点，不必每次被抓。\n" +
  "- 课堂、施法、飞行、夜游、告白、冲突胜负等明确成败必须服从系统判定；没有判定时只描写准备、尝试、卡住或后续待定，不要擅自宣布重大成功。\n" +
  "- 纯观察、闲逛、聊天、吃饭、写信通常不需要判定；只有玩家明确尝试做成某事、进入风险区域、被点名表现、发生冲突或考试时，系统才会给出判定结果。";

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function hasNegatedRisk(text) {
  return /(?:不要|别|不想|不希望|避免|别太|不要太).{0,8}(?:危险|严重|刺激|吓人|麻烦|被抓|被发现)/.test(text);
}

function captureMeetTarget(text) {
  const patterns = [
    /(?:看看|看一眼|看一下|留意|观察)([^，。！？；\n]{1,12}?)(?:为什么|怎么|是不是|好像|还没|没有|在|的|那边|附近)/,
    /([^，。！？；\n]{1,12}?)(?:为什么|怎么|是不是|好像|还没|没有)(?:回|来|出现|离开|说话|动静)/,
    /(?:我想|我要|我去|去|想去)?(?:找|寻找|去找|追上|靠近|跟上|等|等着|坐到|凑到|叫住)([^，。！？；\n]{1,12})/,
    /(?:遇见|遇到|碰见|撞见)([^，。！？；\n]{1,12})/,
    /(?:找|和)([^，。！？；\n]{1,12}?)(?:聊天|说话|谈谈|一起|同行|见面)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const target = match?.[1]?.trim();
    if (target) return target
      .replace(/^(一个|某个|合适的|可以|能不能|一下|看看|那个|这个|为什么|怎么)/, "")
      .replace(/(为什么|怎么|是不是|好像|还没|没有).*$/, "")
      .trim();
  }
  return "";
}

export function inferRoleplayIntent(text) {
  const raw = String(text || "");
  const compact = raw.replace(/\s+/g, "");
  const intents = [];
  const target = captureMeetTarget(compact);

  if (hasAny(compact, ["闲逛", "逛逛", "散步", "坐下", "坐在", "发呆", "写信", "整理", "看书", "吃饭", "回休息室", "回宿舍", "休息", "透透气", "待一会", "随便看看", "慢慢走"])) {
    intents.push("角色行为偏日常停留：优先生活质感、观察、轻微互动或小变化，不必强行制造大事件。");
  }
  if (target) {
    intents.push(`角色正在寻找、靠近或关注某人：${target}。该人物是否出现仍需符合时间、地点、关系和原著阶段。`);
  }
  if (hasAny(compact, ["偷听", "听听", "听见", "翻找", "查", "查找", "调查", "观察", "盯着", "留意", "跟踪", "跟着", "纸条", "脚印", "声音", "动静", "异常", "可疑", "传闻", "秘密", "藏", "借阅记录"])) {
    intents.push("角色行为偏调查/捕捉线索：可以给一点可追踪的异常、传闻、物品或未解问题，但不要直接揭晓答案。");
  }
  if (!hasNegatedRisk(compact) && hasAny(compact, ["离开休息室", "走出休息室", "溜出", "偷偷", "悄悄", "躲开", "避开", "绕过", "夜游", "宵禁", "禁区", "禁书区", "费尔奇", "洛丽丝夫人", "不被发现", "别被发现", "溜进", "潜入"])) {
    intents.push("角色行为带来风险：允许出现巡逻、禁区压力、误会或危险预兆，但风险程度必须符合当前地点和时间。");
  }
  if (hasAny(compact, ["只是", "只想", "先不", "没有目的", "没什么目的", "随便", "照常", "普通", "不打算", "不准备"]) && !hasAny(compact, ["调查", "跟踪", "潜入", "禁区", "偷听"])) {
    intents.push("角色没有主动追逐大事件：让原著主线保持背景存在，本轮优先校园生活和自然互动。");
  }
  if (hasNegatedRisk(compact) || hasAny(compact, ["小心", "谨慎", "压低声音", "放轻脚步", "假装", "装作", "先看看", "远远看", "不靠太近"])) {
    intents.push("角色姿态谨慎：可以有波澜，但优先试探、擦肩而过、轻微后果，不直接写成严重伤害或不可逆惩罚。");
  }

  return intents;
}

export const inferDirectorIntent = inferRoleplayIntent;

export function matchHogwartsLocations(text, limit = 5) {
  const raw = normalizeText(text);
  if (!raw) return [];
  const scored = [];
  for (const place of HOGWARTS_LOCATIONS) {
    let score = 0;
    const names = [place.label, place.id, ...(place.aliases || [])];
    for (const name of names) {
      const n = normalizeText(name);
      if (n && raw.includes(n)) score += n.length > 2 ? 3 : 1;
    }
    for (const tag of place.tags || []) {
      if (raw.includes(normalizeText(tag))) score += 1;
    }
    if (score) scored.push({ place, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.place.label.localeCompare(b.place.label, "zh-Hans-CN"))
    .slice(0, limit)
    .map((x) => x.place);
}

export function locationsForPeriod(periodId, limit = 12) {
  const id = periodId || "morning";
  const accessRank = { open: 0, calendar: 1, permission: 2, hidden: 3, restricted: 4, forbidden: 5 };
  return HOGWARTS_LOCATIONS
    .filter((place) => (place.periods || []).includes(id))
    .sort((a, b) => (accessRank[a.access] ?? 9) - (accessRank[b.access] ?? 9) || a.label.localeCompare(b.label, "zh-Hans-CN"))
    .slice(0, limit);
}

export function formatLocationBrief(place) {
  const tags = (place.tags || []).join("/");
  const people = (place.likelyPeople || []).slice(0, 4).join("、");
  const families = (place.eventFamilies || []).slice(0, 5).map((id) => FAMILY_MAP.get(id)?.split("：")[0] || id).join("、");
  return `${place.label}（${place.zone}${place.access !== "open" ? `；${place.access}` : ""}${place.risk !== "low" ? `；风险${place.risk}` : ""}）：${tags}${people ? `；常见人物：${people}` : ""}${families ? `；可触发：${families}` : ""}`;
}

function recentContinuityLines(currentState, storyMemory, worldMemory) {
  const stateBits = [
    ...(currentState?.recentEvents || []).map((x) => x.content || x).filter(Boolean),
    ...(currentState?.unresolvedThreads || []).map((x) => x.content || x).filter(Boolean),
  ].slice(-6);
  const storyBits = (storyMemory || []).map((x) => x.content || x).filter(Boolean).slice(-4);
  const worldBits = (worldMemory || []).map((x) => x.content || x).filter(Boolean).slice(-3);
  return [...stateBits, ...storyBits, ...worldBits].slice(-8);
}

export function buildHogwartsLifeContext({
  userText = "",
  period,
  currentTimeLabel = "",
  currentState,
  storyMemory = [],
  worldMemory = [],
} = {}) {
  const matched = matchHogwartsLocations(userText);
  const periodPlaces = locationsForPeriod(period?.id, 10);
  const places = matched.length ? matched : periodPlaces;
  const continuity = recentContinuityLines(currentState, storyMemory, worldMemory);
  const roleplayIntents = inferRoleplayIntent(userText);
  const familyIds = new Set();
  places.forEach((place) => (place.eventFamilies || []).forEach((id) => familyIds.add(id)));
  const familyLines = [...familyIds].slice(0, 12).map((id) => `- ${FAMILY_MAP.get(id) || id}`);

  return [
    "【本轮霍格沃茨生活矩阵】",
    currentTimeLabel ? `当前日期：${currentTimeLabel}` : "",
    period ? `当前时间段：${period.label}（${period.instruction}）` : "",
    matched.length
      ? `玩家意图匹配地点：\n- ${matched.map(formatLocationBrief).join("\n- ")}`
      : `此时间段自然可活动地点示例：\n- ${places.map(formatLocationBrief).join("\n- ")}`,
    familyLines.length ? `可组合事件族：\n${familyLines.join("\n")}` : "",
    roleplayIntents.length ? `从玩家扮演行为推断出的软倾向（不是按钮，不是固定结果）：\n- ${roleplayIntents.join("\n- ")}` : "",
    continuity.length ? `近期连续性线索（同类事件再次出现时必须变化或推进）：\n- ${continuity.join("\n- ")}` : "",
    "本轮请只选择最自然的一到两个地点/事件族组合，不要穷举；如果与过去事件相似，必须写出差异、后果或进展。",
  ].filter(Boolean).join("\n");
}

export function buildCalendarLifeContext(choiceItem, period, currentTimeLabel, currentState, storyMemory, worldMemory) {
  return buildHogwartsLifeContext({
    userText: `${choiceItem?.label || ""}\n${choiceItem?.intent || ""}`,
    period,
    currentTimeLabel,
    currentState,
    storyMemory,
    worldMemory,
  });
}
