import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge, GrowthStats, WeeklyGrowthPoint } from "../types";
import { formatCompactNumber, formatDateTime } from "../lib/date";
import styles from "../pages/TodayPage.module.css";

interface GrowthTabProps {
  stats?: GrowthStats;
  weekly?: WeeklyGrowthPoint[];
  badges?: Badge[];
}

export const GrowthTab = ({ stats, weekly, badges }: GrowthTabProps) => (
  <section className={styles.contentPanel}>
    <div className={styles.sectionHeader}>
      <div>
        <h2>成长轨迹</h2>
        <p>看高光数据、最近七天走势和已经点亮的勋章。</p>
      </div>
    </div>

    <div className={styles.statsGrid}>
      <article className={styles.statCard}>
        <span>🔥 连续打卡</span>
        <strong>{stats?.currentStreak ?? 0} 天</strong>
      </article>
      <article className={styles.statCard}>
        <span>⚡ 累计获取能量</span>
        <strong>{formatCompactNumber(stats?.totalEnergyEarned ?? 0)}</strong>
      </article>
      <article className={styles.statCard}>
        <span>✅ 累计完成任务</span>
        <strong>{formatCompactNumber(stats?.totalTasksDone ?? 0)}</strong>
      </article>
    </div>

    <div className={styles.chartCard}>
      <div className={styles.subHeader}>
        <h3>最近 7 天</h3>
      </div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={weekly}>
            <CartesianGrid vertical={false} stroke="rgba(90, 66, 40, 0.12)" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip formatter={(value: number) => `${value} 个`} />
            <Bar dataKey="completed" stackId="tasks" fill="#e47832" radius={[8, 8, 0, 0]} />
            <Bar dataKey="missed" stackId="tasks" fill="#f6d6b9" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    <div className={styles.badgeGrid}>
      {badges?.map((badge) => (
        <article key={badge.id} className={`${styles.badgeCard} ${badge.unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked}`}>
          <span className={styles.badgeIcon}>{badge.icon}</span>
          <strong>{badge.name}</strong>
          <small>{badge.unlocked ? `解锁于 ${formatDateTime(badge.unlockedAt!)}` : `进度 ${badge.progress}/${badge.threshold}`}</small>
        </article>
      ))}
    </div>
  </section>
);
