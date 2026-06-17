/**
 * 子世代（1991）NPC 名册 —— 内置常量，玩家不可见 / 不可编辑。
 *
 * 名册用于「锚定式解析」：人物群像卡.txt 是三遍重复、标题格式不一致的脏数据，
 * 只有靠已知的规范角色名才能可靠地切分与合并各片段（详见 parsePersona.js）。
 *
 * 每个角色附最小元数据（学院 / 身份），供分院、好感度初始化、状态条等使用。
 * name 必须与人物群像卡.txt 中的标题（去掉编号与括号后）逐字一致（含「・」与空格）。
 */

export const HOUSE = {
  GRYFFINDOR: "格兰芬多",
  SLYTHERIN: "斯莱特林",
  HUFFLEPUFF: "赫奇帕奇",
  RAVENCLAW: "拉文克劳",
  NONE: "",
};

const student = (name, house, note) => ({ name, house, role: "student", persona: note });
const professor = (name, house, note) => ({ name, house, role: "professor", persona: note });
const staff = (name, house, note) => ({ name, house, role: "staff", persona: note });
const adult = (name, house, note) => ({ name, house, role: "adult", persona: note });

export const ROSTER = [
  { name: "哈利・詹姆斯・波特", house: HOUSE.GRYFFINDOR, role: "student" },
  { name: "罗恩・比利尔斯・韦斯莱", house: HOUSE.GRYFFINDOR, role: "student" },
  { name: "赫敏・简・格兰杰", house: HOUSE.GRYFFINDOR, role: "student" },
  { name: "纳威・弗朗西斯・隆巴顿", house: HOUSE.GRYFFINDOR, role: "student" },
  student("西莫・斐尼甘", HOUSE.GRYFFINDOR, "格兰芬多同届学生，热情、冲动，常把课堂练习弄得火花四溅；适合宿舍闲聊、课堂事故、魁地奇观赛和朋友间的轻松冲突。"),
  student("迪安・托马斯", HOUSE.GRYFFINDOR, "格兰芬多同届学生，麻瓜出身，温和健谈，喜欢足球与绘画；常在宿舍、礼堂和课堂间提供普通学生视角。"),
  student("拉文德・布朗", HOUSE.GRYFFINDOR, "格兰芬多同届学生，外向、爱八卦，容易被浪漫气氛和占卜课吸引；适合寝室谈心、舞会、流言与青春期情感线。"),
  student("帕瓦蒂・佩蒂尔", HOUSE.GRYFFINDOR, "格兰芬多同届学生，活泼敏锐，与双胞胎妹妹帕德玛关系亲近；适合课堂搭档、舞会、占卜课和跨学院日常。"),
  student("珀西・韦斯莱", HOUSE.GRYFFINDOR, "格兰芬多高年级学生，守规矩、重视成绩和级长责任；常出现在公共休息室、走廊巡查、学院分和校规相关事件中。"),
  student("奥利弗・伍德", HOUSE.GRYFFINDOR, "格兰芬多魁地奇队长，对训练和比赛极度投入；适合魁地奇球场、飞行训练、赛前动员和体育线剧情。"),
  student("李・乔丹", HOUSE.GRYFFINDOR, "格兰芬多高年级学生，弗雷德与乔治的好友，擅长吐槽和魁地奇解说；适合看台、恶作剧和走廊热闹场景。"),
  student("安吉丽娜・约翰逊", HOUSE.GRYFFINDOR, "格兰芬多魁地奇队追球手，爽朗果断，训练时认真、有竞争心；适合魁地奇队日常和高年级女生社交。"),
  student("艾丽娅・斯平内特", HOUSE.GRYFFINDOR, "格兰芬多魁地奇队追球手，灵活、可靠，常和安吉丽娜、凯蒂一起行动；适合训练、比赛与宿舍边缘社交。"),
  student("凯蒂・贝尔", HOUSE.GRYFFINDOR, "格兰芬多魁地奇队追球手，年纪较低但飞行天赋明显；适合球场训练、比赛准备和后续被诅咒项链相关暗线。"),
  student("科林・克里维", HOUSE.GRYFFINDOR, "比哈利低一届的格兰芬多学生，热情崇拜哈利，喜欢拍照；1992 学年后适合摄影、崇拜英雄和密室事件线。"),
  { name: "米勒娃・麦格", house: HOUSE.GRYFFINDOR, role: "professor" },
  { name: "阿不思・珀西瓦尔・伍尔弗里克・布赖恩・邓布利多", house: HOUSE.NONE, role: "headmaster" },
  { name: "德拉科・马尔福", house: HOUSE.SLYTHERIN, role: "student" },
  student("西奥多・诺特", HOUSE.SLYTHERIN, "斯莱特林同届学生，纯血家族出身，安静、独立、观察力强，不像克拉布和高尔那样依附德拉科；适合图书馆、魔药课、家族话题和慢热社交。"),
  student("布雷斯・扎比尼", HOUSE.SLYTHERIN, "斯莱特林同届学生，举止讲究，冷淡而挑剔，习惯用旁观者姿态审视他人；适合礼堂、公共休息室、纯血社交与暧昧拉扯。"),
  student("达芙妮・格林格拉斯", HOUSE.SLYTHERIN, "斯莱特林同届学生，纯血家族出身，克制、优雅、擅长保持距离；适合女生寝室、课堂搭档、家族宴会和学院内部关系线。"),
  student("阿斯托利亚・格林格拉斯", HOUSE.SLYTHERIN, "达芙妮的妹妹，年纪较小，早期不作为霍格沃茨同届学生频繁出场；可在家族背景、书信和后期斯莱特林社交中出现。"),
  student("文森特・克拉布", HOUSE.SLYTHERIN, "斯莱特林同届学生，德拉科身边常见跟班，迟钝但有压迫感；适合走廊堵人、课堂小冲突和斯莱特林群体场景。"),
  student("格雷戈里・高尔", HOUSE.SLYTHERIN, "斯莱特林同届学生，德拉科身边常见跟班，沉默、笨重、跟随性强；常与克拉布一起出现。"),
  student("米莉森・伯斯德", HOUSE.SLYTHERIN, "斯莱特林女生，强硬、直接，不怕肢体冲突；适合女生寝室、决斗俱乐部、密室年份的学院摩擦。"),
  student("马库斯・弗林特", HOUSE.SLYTHERIN, "斯莱特林魁地奇队队长，高年级学生，粗鲁且好胜；适合魁地奇对抗、球场挑衅和学院竞争。"),
  student("阿德里安・普塞", HOUSE.SLYTHERIN, "斯莱特林魁地奇队追球手，高年级学生，重视战术和胜负；适合球场、训练和斯莱特林体育线。"),
  { name: "西弗勒斯・斯内普", house: HOUSE.SLYTHERIN, role: "professor" },
  { name: "潘西・帕金森", house: HOUSE.SLYTHERIN, role: "student" },
  { name: "塞德里克・迪戈里", house: HOUSE.HUFFLEPUFF, role: "student" },
  { name: "汉娜・艾博", house: HOUSE.HUFFLEPUFF, role: "student" },
  student("苏珊・博恩斯", HOUSE.HUFFLEPUFF, "赫奇帕奇同届学生，出身博恩斯家族，温和但并不软弱；适合课堂互助、宿舍日常、魔法部家族背景与战争阴影线。"),
  student("厄尼・麦克米兰", HOUSE.HUFFLEPUFF, "赫奇帕奇同届学生，纯血，重视礼貌、公平与体面，有时显得一本正经；适合学院荣誉、课堂讨论和误会澄清。"),
  student("贾斯廷・芬列里", HOUSE.HUFFLEPUFF, "赫奇帕奇同届学生，麻瓜出身，原本差点去伊顿，性格友善；适合麻瓜世界对照、密室年份紧张气氛和跨学院友情。"),
  student("扎卡赖斯・史密斯", HOUSE.HUFFLEPUFF, "赫奇帕奇学生，尖刻、怀疑心重，常把话说得不好听；适合邓布利多军、魁地奇解说和社交摩擦。"),
  { name: "秋・张", house: HOUSE.RAVENCLAW, role: "student" },
  { name: "卢娜・洛夫古德", house: HOUSE.RAVENCLAW, role: "student" },
  student("帕德玛・佩蒂尔", HOUSE.RAVENCLAW, "拉文克劳同届学生，帕瓦蒂的双胞胎妹妹，聪明、细致，社交上比姐姐更冷静；适合课堂、图书馆、舞会和跨学院日常。"),
  student("泰瑞・布特", HOUSE.RAVENCLAW, "拉文克劳同届学生，好奇心强，重视知识和逻辑；适合图书馆、课堂问答、邓布利多军训练和学术竞争。"),
  student("迈克尔・科纳", HOUSE.RAVENCLAW, "拉文克劳学生，聪明、好胜，后期与金妮、秋有情感线交集；适合青春社交、魁地奇观赛和 D.A. 场景。"),
  student("安东尼・戈德斯坦", HOUSE.RAVENCLAW, "拉文克劳同届学生，理性、守礼，后期成为级长与 D.A. 成员；适合课堂、级长事务和学院间合作。"),
  student("佩内洛・克里瓦特", HOUSE.RAVENCLAW, "拉文克劳高年级学生，珀西的女友，聪明且谨慎；适合图书馆、级长线、密室年份石化事件。"),
  student("罗杰・戴维斯", HOUSE.RAVENCLAW, "拉文克劳魁地奇队长，高年级学生，风度好，社交能力强；适合球场、舞会和高年级社交。"),
  { name: "汤姆・马沃罗・里德尔", house: HOUSE.SLYTHERIN, role: "villain" },
  { name: "鲁伯・海格", house: HOUSE.GRYFFINDOR, role: "staff" },
  professor("菲利乌斯・弗立维", HOUSE.RAVENCLAW, "魔咒课教授，拉文克劳院长，个子矮小但魔咒造诣极高，课堂气氛轻快；适合魔咒学习、课堂加分和决斗技巧线。"),
  professor("波莫娜・斯普劳特", HOUSE.HUFFLEPUFF, "草药学教授，赫奇帕奇院长，务实温暖，重视照料与耐心；适合温室、植物实践和照顾受伤学生。"),
  professor("奎里纳斯・奇洛", HOUSE.RAVENCLAW, "1991 学年的黑魔法防御术教授，表面紧张结巴，实际暗藏魔法石主线危险；早期只能作为可疑暗线谨慎出现。"),
  professor("吉德罗・洛哈特", HOUSE.RAVENCLAW, "第二学年黑魔法防御术教授，浮夸、自恋、擅长包装自己；在 1992 学年后出现，适合签名会、课堂闹剧和名声主题。"),
  professor("西比尔・特里劳妮", HOUSE.RAVENCLAW, "占卜课教授，神神叨叨、沉浸在预兆与水晶球里；三年级后适合占卜课、预言气氛和真假预兆。"),
  staff("阿格斯・费尔奇", HOUSE.NONE, "霍格沃茨管理员，严厉、爱抓违规学生，与洛丽丝夫人一起巡逻；适合夜游风险、走廊追逐和校规压力。"),
  staff("波比・庞弗雷", HOUSE.NONE, "校医院护士长，专业、强势、可靠；适合受伤、疲惫、照护和病房探望剧情。"),
  staff("罗兰达・霍琦", HOUSE.NONE, "飞行课教师兼魁地奇裁判，干练、眼神锐利；适合飞行课、扫帚训练和比赛规则。"),
  { name: "小天狼星・布莱克", house: HOUSE.GRYFFINDOR, role: "adult" },
  { name: "莱姆斯・约翰・卢平", house: HOUSE.GRYFFINDOR, role: "adult" },
  adult("卢修斯・马尔福", HOUSE.SLYTHERIN, "德拉科的父亲，马尔福家族家主，傲慢、精于权势与体面；适合对角巷、董事会、纯血社交和家族压力线。"),
  adult("纳西莎・马尔福", HOUSE.SLYTHERIN, "德拉科的母亲，冷淡优雅，极重视家族与儿子的安全；适合家族场景、礼仪压力和斯莱特林纯血社交。"),
  adult("亚瑟・韦斯莱", HOUSE.GRYFFINDOR, "韦斯莱家的父亲，魔法部职员，温和正直且迷恋麻瓜物品；适合陋居、魔法部和麻瓜文化话题。"),
  adult("莫丽・韦斯莱", HOUSE.GRYFFINDOR, "韦斯莱家的母亲，热情、强势、护短，擅长把关心变成一桌热饭；适合家庭线、假期和照顾学生。"),
  adult("加里克・奥利凡德", HOUSE.RAVENCLAW, "奥利凡德魔杖店店主，记忆力惊人，对魔杖与巫师的关系近乎虔诚；适合魔杖选择与魔法天赋暗示。"),
  adult("摩金夫人", HOUSE.NONE, "摩金夫人长袍专卖店店主，亲切、熟练，见惯新生的局促与骄傲；适合对角巷校服采购和学生初遇。"),
  { name: "金妮・莫丽・韦斯莱", house: HOUSE.GRYFFINDOR, role: "student" },
  { name: "弗雷德・韦斯莱 & 乔治・韦斯莱", house: HOUSE.GRYFFINDOR, role: "student" },
  { name: "贝拉特里克斯・莱斯特兰奇", house: HOUSE.SLYTHERIN, role: "villain" },
];

export const ROSTER_NAMES = ROSTER.map((r) => r.name);
