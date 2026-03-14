export const getTodayIso = () => new Date().toISOString().slice(0, 10);

export const addDays = (dateString: string, diff: number) => {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
};

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
  const date = new Date(`${dateString}T00:00:00`);
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
