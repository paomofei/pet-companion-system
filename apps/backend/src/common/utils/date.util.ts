const ASIA_SHANGHAI = "Asia/Shanghai";

export function toDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ASIA_SHANGHAI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function todayDateString(): string {
  return toDateString(new Date());
}

export function addDays(dateString: string, delta: number): string {
  const date = new Date(`${dateString}T00:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + delta);
  return toDateString(date);
}

export function weekdayLabel(dateString: string): string {
  if (dateString === todayDateString()) {
    return "今天";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: ASIA_SHANGHAI,
    weekday: "short"
  }).format(new Date(`${dateString}T00:00:00+08:00`));
}

export function matchesRepeatType(dateString: string, repeatType: number): boolean {
  if (repeatType === 0) {
    return false;
  }
  if (repeatType === 1) {
    return true;
  }

  const weekday = new Date(`${dateString}T12:00:00+08:00`).getUTCDay();
  if (repeatType === 2) {
    return weekday >= 1 && weekday <= 5;
  }
  if (repeatType === 3) {
    return weekday === 0 || weekday === 6;
  }
  return false;
}
