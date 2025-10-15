const staffs = {
  saa: "سعيد",
  isl: "إصلاح",
  mb: "مبارك",
  hb: "حبيب",
  moh: "محمد",
  mahmood: "محمود",
  ust: "الأستاذة",
  yun: "يونس",
  abk: "أبو خديجة",
  aby: "أبو يسيروة",
  jimb: "جنبى",
  ish: "إسحاق",
} as const;
export const loadPayments = () => {
  function profile(staff: keyof typeof staffs) {
    const ctx = {
      _term: null,
      list: [],
      term(t: "1st" | "2nd" | "3rd") {
        ctx._term = t;
        return ctx;
      },
      pay(amount, description?: Description) {
        ctx.list.push({
          term: ctx._term,
          amount,
          description,
        });
        return ctx;
      },
    };
    return ctx;
  }
  return [
    ...profile("saa")
      .term("2nd")
      .pay(18, "month1")
      .pay(18, "month2")
      .pay(18, "month3")
      .term("3rd")
      .pay(18, "month1")
      .pay(18, "month2")
      .pay(18, "month3").list,
    ...profile("isl")
      .term("2nd")
      .pay(18, "month1")
      .pay(18, "month2")
      .pay(18, "month3")
      .term("3rd")
      .pay(18, "month1")
      .pay(18, "month2")
      .pay(18, "month3").list,

    ...profile("moh")
      .term("2nd")
      .pay(2, "wk1")
      // .pay(2000,"wk2")
      .pay(3.5, "wk3")
      .pay(3.5, "wk4")
      .pay(3.5, "wk5")
      .pay(3, "wk8")
      .pay(2, "wk9")
      .pay(2, "wk10")
      .pay(2, "wk11")
      .pay(2, "wk12")
      .pay(2, "wk13")
      .pay(2, "wk14")
      .term("3rd") //3RD TERM
      .pay(1, "wk1")
      .pay(2, "wk2")
      .pay(3, "wk3")
      .pay(0, "wk4")
      .pay(2, "wk5")
      .pay(0, "wk6")
      .pay(2, "wk7")
      .pay(2, "wk8")
      .pay(2, "wk9")
      .pay(2, "wk10")
      .pay(0, "wk11").list,

    //
    ...profile("yun")
      .term("2nd")
      .pay(2, "wk1")
      // .pay(2000,"wk2")
      .pay(3.5, "wk3")
      .pay(3.5, "wk4")
      .pay(3.5, "wk5")
      .pay(2.75, "wk8")
      .pay(3.25, "wk9")
      .pay(1.5, "wk10")
      .pay(2.75, "wk11")
      .pay(2.75, "wk12")
      .pay(2.75, "wk13")
      .pay(2, "wk14")
      .term("3rd") //3RD TERM
      .pay(0, "wk1")
      .pay(3.5, "wk2")
      .pay(2.25, "wk3")
      .pay(0, "wk4")
      .pay(0, "wk5")
      .pay(0, "wk6")
      .pay(0, "wk7")
      .pay(0, "wk8")
      .pay(0, "wk9")
      .pay(0, "wk10")
      .pay(0, "wk11").list,
    ...profile("mb").term("3rd").pay(3.75, "wk1").list,
    ...profile("hb")
      .term("2nd")
      .pay(3, "wk1")
      .pay(3.75, "wk2")
      .pay(4.5, "wk3")
      .pay(0.7, "wk4")
      .pay(2.25, "wk5")
      .pay(2.25, "wk6")
      .pay(2.25, "wk7")
      .pay(2.25, "wk8")
      .pay(2.25, "wk9")
      .pay(2.25, "wk10")
      .pay(2.25, "wk11")
      .pay(2.25, "wk12")
      .pay(3.75, "wk13")
      .term("3rd")
      .pay(0, "wk1")
      .pay(2.25, "wk2")
      .pay(0.75, "wk3")
      .pay(0, "wk4")
      .pay(2.25, "wk5")
      .pay(2.25, "wk6")
      .pay(2.25, "wk7")
      .pay(0.75, "wk8")
      .pay(0.75, "wk9")
      .pay(0.75, "wk10")
      .pay(0, "wk11").list,
    ...profile("mahmood")
      .term("2nd")
      .pay(0.75, "wk1")
      .pay(3.75, "wk2")
      .pay(5.25, "wk3")
      .pay(2.25, "wk4")
      .pay(3.0, "wk5")
      .pay(1.5, "wk6")
      .pay(3.0, "wk7")
      .pay(2.25, "wk8")
      //   .pay(0, "wk9")
      .pay(1.25, "wk10")
      .pay(3, "wk11")
      .pay(4.5, "wk12")
      .pay(3.0, "wk14")
      .term("3rd")
      .pay(1.5, "wk1")
      .pay(2.25, "wk2")
      .pay(3.0, "wk3")
      .pay(0, "wk4")
      .pay(0, "wk5")
      .pay(3.75, "wk6")
      .pay(0, "wk7")
      .pay(0.75, "wk8")
      .pay(0, "wk9")
      .pay(0, "wk10")
      .pay(0, "wk11").list,
    ...profile("ust")
      .term("2nd")
      .pay(4.25, "wk1")
      .pay(2.5, "wk2")
      .pay(2.25, "wk3")
      .pay(2.25, "wk4")
      .pay(1.5, "wk5")
      .pay(1.5, "wk6")
      .pay(1.5, "wk8")
      .term("3rd")
      .pay(0, "wk1")
      .pay(3.25, "wk2")
      .pay(3.25, "wk3")
      .pay(0, "wk4")
      .pay(0, "wk5")
      .pay(3.5, "wk6")
      .pay(0, "wk7")
      .pay(0.75, "wk8")
      .pay(1.5, "wk9")
      .pay(0.75, "wk10")
      .pay(0, "wk11").list,
    ...profile("abk").term("2nd").pay(1.5, "wk3").pay(2, "wk5").list,
    ...profile("jimb")
      .pay(19.75, "month1")
      .pay(16.75, "month2")
      .pay(21.75, "month3")
      .term("3rd")
      .pay(10.25, "month1")
      .pay(9.75, "month2")
      .pay(5, "month3").list,
    ,
    ...profile("ish")
      .term("2nd")
      .pay(0, "wk1")
      .pay(3.25, "wk2")
      .pay(3.25, "wk3")
      .pay(3.25, "wk4")
      .pay(3.25, "wk5")
      .pay(3.25, "wk6")
      .pay(0.75, "wk7")
      .pay(3.25, "wk8")
      .pay(3.25, "wk9")
      .pay(3.0, "wk10")
      .pay(0.75, "wk11")
      .pay(3.75, "wk12")
      .pay(3.75, "wk13")
      .pay(3, "wk14")
      .term("3rd")
      .pay(1.5, "wk1")
      .pay(4.45, "wk2")
      .pay(2.5, "wk3")
      .pay(1.75, "wk4")
      .pay(0, "wk5")
      .pay(0, "wk6")
      .pay(0, "wk7")
      .pay(5.75, "wk8")
      .pay(2.5, "wk9")
      .pay(2.25, "wk10")
      .pay(3.5, "wk11").list,
    ...profile("aby")
      .term("3rd")
      .pay(2, "wk8")
      .pay(2.5, "wk9")
      .pay(2.5, "wk10")
      .pay(2.5, "wk11").list,
  ];
};
const amt = {
  1700: 17000,
};
type Description =
  | "wk1"
  | "wk2"
  | "wk3"
  | "wk4"
  | "month1"
  | "wk5"
  | "wk6"
  | "wk7"
  | "wk8"
  | "month2"
  | "wk9"
  | "wk10"
  | "wk11"
  | "wk12"
  | "wk13"
  | "wk14"
  | "month3";
