import {
  advanceCalendarClock,
  calendarPhase,
  formatScheduleContextBlock,
  scheduleContext,
} from "../src/lib/schoolCalendar.js";

let pass = 0;
let fail = 0;
const ok = (cond, msg) => {
  if (cond) pass += 1;
  else {
    fail += 1;
    console.error("FAIL:", msg);
  }
};

{
  const ctx = scheduleContext({ currentTimeLabel: "1991年8月16日 · 对角巷采购", periodId: "morning" });
  ok(ctx.phase.id === "shopping" && ctx.isBeforeTerm, "shopping day is classified before term");
  ok(ctx.moment.title === "对角巷采购", "shopping day uses Diagon Alley calendar moment");
  ok(!ctx.timetable.hasClass, "shopping day has no regular class");
  ok(formatScheduleContextBlock(ctx).includes("当前不按校内课表运行"), "shopping prompt block avoids school timetable");
}

{
  const ctx = scheduleContext({ currentTimeLabel: "1991年8月20日", periodId: "afternoon" });
  ok(ctx.phase.id === "pre_term" && ctx.moment.title === "开学前的日子", "pre-term days are classified as preparation");
  ok(ctx.moment.choices.some((choice) => choice.label === "预习课本" && choice.advancePeriod === false), "pre-term growth choices do not auto-advance");
}

{
  const ctx = scheduleContext({ currentTimeLabel: "1991年9月1日", periodId: "afternoon" });
  ok(ctx.phase.id === "opening_day" && ctx.isOpeningDay, "Sep 1 is opening day");
  ok(ctx.moment.choices.some((choice) => choice.label === "列车上闲逛"), "opening afternoon offers train choices");
  ok(formatScheduleContextBlock(ctx).includes("下午列车"), "opening prompt explains period-specific sequence");
  ok(formatScheduleContextBlock(ctx).includes("霍格沃茨特快"), "opening afternoon period guidance stays on train context");
}

{
  const ctx = scheduleContext({ currentTimeLabel: "1991年9月2日", periodId: "morning" });
  ok(ctx.phase.id === "special_event" && ctx.isRegularClassTime, "first class calendar node is also class time");
  ok(ctx.firstLesson.course === "魔咒学", "schedule context exposes first lesson");
  ok(ctx.moment.title === "上午课表", "calendar moment follows timetable when classes exist");
  ok(formatScheduleContextBlock(ctx).includes("本时段课表"), "prompt block lists current lessons");
}

{
  const ctx = scheduleContext({ currentTimeLabel: "1991年9月7日", periodId: "morning" });
  ok(ctx.phase.id === "school_day" && !ctx.isRegularClassTime, "Saturday is in school term but has no regular class");
  ok(ctx.isFreeSchoolTime, "Saturday is treated as free school time");
}

{
  const ctx = scheduleContext({ currentTimeLabel: "1991年12月25日", periodId: "morning" });
  ok(ctx.phase.id === "special_event" && ctx.isSpecialEvent, "Christmas event remains a special calendar node");
  ok(ctx.timetable.holiday && !ctx.timetable.hasClass, "Christmas has no regular class");
  ok(ctx.moment.title === "圣诞晚宴", "special event moment is preserved");
}

{
  const next = advanceCalendarClock({ currentTimeLabel: "1991年9月1日", periodId: "late" });
  ok(next.currentTimeLabel === "1991年9月2日" && next.periodId === "morning" && next.dayRollover, "late opening day advances to next morning");
  const ctx = scheduleContext({ currentTimeLabel: "1991年9月1日", periodId: "late" });
  ok(ctx.nextClock.currentTimeLabel === "1991年9月2日" && ctx.nextPeriodLabel === "上午", "schedule context exposes next clock");
}

{
  ok(calendarPhase("无法解析").id === "unknown", "invalid dates are classified as unknown");
}

console.log(`\nSchedule system tests: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
