const padDatePart = (value: number) => String(value).padStart(2, "0");

const parseIsoDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;

export const getTodayIso = () => toIsoDate(new Date());

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

export const addDays = (dateString: string, diff: number) => {
  const date = parseIsoDate(dateString);
  date.setDate(date.getDate() + diff);
  return toIsoDate(date);
};

export const getWeekDates = (dateString: string) => {
  const date = parseIsoDate(dateString);
  const weekday = date.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = addDays(dateString, mondayOffset);

  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
};

export const formatWeekdayLabel = (dateString: string) =>
  WEEKDAY_LABELS[parseIsoDate(dateString).getDay()];

export const formatMonthDay = (dateString: string) => {
  const date = parseIsoDate(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export const formatFullDate = (dateString: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(parseIsoDate(dateString));

export const formatDateLabel = (dateString: string) => {
  const today = getTodayIso();
  if (dateString === today) {
    return "今天";
  }
  if (dateString === addDays(today, -1)) {
    return "昨天";
  }
  if (dateString === addDays(today, 1)) {
    return "明天";
  }
  const date = parseIsoDate(dateString);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
};

export const isFutureDate = (dateString: string) => dateString > getTodayIso();

export const formatCompactNumber = (value: number) => {
  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(1)}w`;
  }
  return new Intl.NumberFormat("zh-CN").format(value);
};

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
