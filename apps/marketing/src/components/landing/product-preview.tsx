import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  Search,
  Users,
} from "lucide-react";

const sidebarItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Students", icon: Users, active: false },
  { label: "Academics", icon: BookOpen, active: false },
  { label: "Attendance", icon: CalendarDays, active: false },
  { label: "Finance", icon: CircleDollarSign, active: false },
] as const;

const feeRows = [
  {
    name: "Amina Yusuf",
    className: "JSS 2A",
    amount: "₦85,000",
    status: "Paid",
  },
  {
    name: "David Okoye",
    className: "SS 1B",
    amount: "₦62,500",
    status: "Partial",
  },
  {
    name: "Zainab Musa",
    className: "Primary 6",
    amount: "₦45,000",
    status: "Paid",
  },
] as const;

export function ProductPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-[76rem]">
      <div className="absolute -inset-6 -z-10 rounded-[2.75rem] bg-primary-foreground/7 blur-2xl" />
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-[1.25rem] border border-white/15 bg-[#f7f8f3] shadow-[0_34px_100px_rgba(4,24,17,0.35)] sm:rounded-[1.75rem]"
      >
        <div className="flex h-10 items-center justify-between border-b border-[#dfe4de] bg-white px-4 sm:h-12 sm:px-5">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-[#f29c8f]" />
            <span className="size-2.5 rounded-full bg-[#e5bd62]" />
            <span className="size-2.5 rounded-full bg-[#73b992]" />
          </div>
          <div className="hidden h-7 w-64 items-center justify-center rounded-md bg-[#f0f2ed] text-[10px] text-[#78837d] sm:flex">
            dashboard.greenfield.schoolclerk.com
          </div>
          <div className="w-10" />
        </div>

        <div className="grid min-h-[31rem] grid-cols-1 md:grid-cols-[13rem_1fr] lg:min-h-[38rem] lg:grid-cols-[15rem_1fr]">
          <aside className="hidden border-r border-[#dfe4de] bg-[#f1f3ee] px-4 py-5 md:block">
            <div className="flex items-center gap-2.5 border-b border-[#dfe4de] pb-5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-[#143f30] text-xs font-bold text-white">
                GF
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-[#183126]">
                  Greenfield College
                </p>
                <p className="mt-0.5 text-[10px] text-[#748077]">
                  2026 / 2027 session
                </p>
              </div>
              <ChevronDown className="ml-auto text-[#7d8981]" size={13} />
            </div>

            <nav
              aria-label="Dashboard preview navigation"
              className="mt-5 space-y-1"
            >
              {sidebarItems.map((item) => (
                <div
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium ${
                    item.active
                      ? "bg-[#dcece3] text-[#15583e]"
                      : "text-[#647168]"
                  }`}
                  key={item.label}
                >
                  <item.icon size={14} />
                  {item.label}
                </div>
              ))}
            </nav>

            <div className="mt-8 rounded-xl border border-[#d8ded8] bg-white p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a867e]">
                Term setup
              </p>
              <p className="mt-2 text-xs font-semibold text-[#183126]">
                First term is ready
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8ece8]">
                <div className="h-full w-[86%] rounded-full bg-[#1d7955]" />
              </div>
              <p className="mt-2 text-[10px] text-[#748077]">
                6 of 7 setup steps complete
              </p>
            </div>
          </aside>

          <div className="min-w-0 bg-[#fafbf7]">
            <div className="flex h-14 items-center border-b border-[#e1e5df] bg-white px-4 sm:px-6">
              <div>
                <p className="text-[10px] text-[#7b867f]">Monday, 3 August</p>
                <p className="text-xs font-semibold text-[#173126]">
                  Good morning, Mariam
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <div className="hidden h-8 w-40 items-center gap-2 rounded-lg border border-[#e0e5df] bg-[#fafbf8] px-3 text-[10px] text-[#879189] sm:flex">
                  <Search size={12} /> Search
                </div>
                <div className="flex size-8 items-center justify-center rounded-lg border border-[#e0e5df] bg-white text-[#617068]">
                  <Bell size={13} />
                </div>
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#173f31] text-[10px] font-semibold text-white">
                  MA
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7d8981]">
                    School overview
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#142d23] sm:text-xl">
                    Everything that needs attention
                  </h3>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#e0efe6] px-2.5 py-1 text-[10px] font-semibold text-[#176342]">
                  <span className="size-1.5 rounded-full bg-[#2b9a68]" />
                  Sample data
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {[
                  ["1,248", "Active students", "+34 this term"],
                  ["93.8%", "Attendance today", "Above 90% target"],
                  ["₦18.4m", "Fees collected", "78% of term billables"],
                  ["42", "Staff present", "2 currently away"],
                ].map(([value, label, detail]) => (
                  <div
                    className="rounded-xl border border-[#e0e5df] bg-white p-3.5"
                    key={label}
                  >
                    <p className="text-lg font-semibold tracking-[-0.04em] text-[#173126] lg:text-xl">
                      {value}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-[#5f6d64]">
                      {label}
                    </p>
                    <p className="mt-2 text-[9px] text-[#8a948d]">{detail}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="rounded-xl border border-[#e0e5df] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-[#173126]">
                        Fee collection
                      </p>
                      <p className="mt-0.5 text-[9px] text-[#859087]">
                        First term, all classrooms
                      </p>
                    </div>
                    <span className="text-[9px] font-medium text-[#2b7254]">
                      View finance
                    </span>
                  </div>
                  <div
                    className="mt-4 flex h-24 items-end gap-2 sm:h-28 sm:gap-3"
                    aria-hidden="true"
                  >
                    {[42, 58, 51, 72, 64, 82, 78, 91, 86, 96].map(
                      (height, index) => (
                        <div
                          className="flex h-full flex-1 items-end rounded-t-sm bg-[#edf1ed]"
                          key={`${height}-${index}`}
                        >
                          <div
                            className="w-full rounded-t-sm bg-[#2b7656]"
                            style={{
                              height: `${height}%`,
                              opacity: 0.58 + index * 0.04,
                            }}
                          />
                        </div>
                      ),
                    )}
                  </div>
                  <div className="mt-3 hidden border-t border-[#edf0ec] pt-3 sm:block">
                    {feeRows.map((row) => (
                      <div
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-1.5 text-[9px]"
                        key={row.name}
                      >
                        <span className="font-medium text-[#35483e]">
                          {row.name} · {row.className}
                        </span>
                        <span className="text-[#647168]">{row.amount}</span>
                        <span
                          className={
                            row.status === "Paid"
                              ? "text-[#21704d]"
                              : "text-[#a3741d]"
                          }
                        >
                          {row.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#e0e5df] bg-white p-4">
                  <p className="text-xs font-semibold text-[#173126]">Today</p>
                  <div className="mt-3 space-y-3">
                    {[
                      ["08:00", "Morning attendance", "All classes"],
                      ["10:30", "JSS 2 assessment", "Mathematics"],
                      ["13:00", "Fee reminder batch", "128 families"],
                    ].map(([time, title, detail], index) => (
                      <div className="flex gap-2.5" key={time}>
                        <div
                          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${index === 0 ? "bg-[#dceee4] text-[#176343]" : "bg-[#f0f1ed] text-[#7f8a82]"}`}
                        >
                          {index === 0 ? (
                            <Check size={10} />
                          ) : (
                            <span className="size-1 rounded-full bg-current" />
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] text-[#8a948d]">{time}</p>
                          <p className="text-[10px] font-medium text-[#35483e]">
                            {title}
                          </p>
                          <p className="text-[9px] text-[#8a948d]">{detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-[11px] leading-5 text-white/55">
        Illustrative SchoolClerk administrator interface with sample student,
        attendance, finance, and daily operations data.
      </figcaption>
    </figure>
  );
}
