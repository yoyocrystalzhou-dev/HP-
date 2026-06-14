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

export const ROSTER = [
  { name: "哈利・詹姆斯・波特", house: HOUSE.GRYFFINDOR, role: "student" },
  { name: "罗恩・比利尔斯・韦斯莱", house: HOUSE.GRYFFINDOR, role: "student" },
  { name: "赫敏・简・格兰杰", house: HOUSE.GRYFFINDOR, role: "student" },
  { name: "纳威・弗朗西斯・隆巴顿", house: HOUSE.GRYFFINDOR, role: "student" },
  { name: "米勒娃・麦格", house: HOUSE.GRYFFINDOR, role: "professor" },
  { name: "阿不思・珀西瓦尔・伍尔弗里克・布赖恩・邓布利多", house: HOUSE.NONE, role: "headmaster" },
  { name: "德拉科・马尔福", house: HOUSE.SLYTHERIN, role: "student" },
  { name: "西弗勒斯・斯内普", house: HOUSE.SLYTHERIN, role: "professor" },
  { name: "潘西・帕金森", house: HOUSE.SLYTHERIN, role: "student" },
  { name: "塞德里克・迪戈里", house: HOUSE.HUFFLEPUFF, role: "student" },
  { name: "汉娜・艾博", house: HOUSE.HUFFLEPUFF, role: "student" },
  { name: "秋・张", house: HOUSE.RAVENCLAW, role: "student" },
  { name: "卢娜・洛夫古德", house: HOUSE.RAVENCLAW, role: "student" },
  { name: "汤姆・马沃罗・里德尔", house: HOUSE.SLYTHERIN, role: "villain" },
  { name: "鲁伯・海格", house: HOUSE.GRYFFINDOR, role: "staff" },
  { name: "小天狼星・布莱克", house: HOUSE.GRYFFINDOR, role: "adult" },
  { name: "莱姆斯・约翰・卢平", house: HOUSE.GRYFFINDOR, role: "adult" },
  { name: "金妮・莫丽・韦斯莱", house: HOUSE.GRYFFINDOR, role: "student" },
  { name: "弗雷德・韦斯莱 & 乔治・韦斯莱", house: HOUSE.GRYFFINDOR, role: "student" },
  { name: "贝拉特里克斯・莱斯特兰奇", house: HOUSE.SLYTHERIN, role: "villain" },
];

export const ROSTER_NAMES = ROSTER.map((r) => r.name);
