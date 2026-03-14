import { useMemo } from "react";
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
  onPrimaryAction: () => void;
}

const badgeCategories = ["任务习惯", "目标成长", "宠物互动"] as const;

export const GrowthTab = ({ stats, weekly, badges, onPrimaryAction }: GrowthTabProps) => {
  const groupedBadges = useMemo(
    () =>
      badgeCategories.map((category) => ({
        category,
        items: (badges ?? []).filter((badge) => badge.category === category)
      })),
    [badges]
  );

  const hasWeeklyData = Boolean(weekly?.length);
  const hasBadgeData = Boolean(badges?.length);

  return (
    <section className={`${styles.contentPanel} ${styles.fixedPanel}`}>
      <div className={`${styles.sectionHeader} ${styles.stickySectionHeader}`}>
        <div>
          <h2>成长轨迹</h2>
          <p>看高光数据、最近七天走势和已经点亮的勋章。</p>
        </div>
      </div>

      <div className={styles.scrollSection}>
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
          {hasWeeklyData ? (
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
          ) : (
            <div className={styles.emptyStateCard}>
              <div className={styles.emptyArtwork}>📈</div>
              <strong>暂时还没有成长趋势</strong>
              <p>先完成今天的任务，连续几天后这里就会出现你的成长曲线。</p>
              <button className={styles.primaryButton} type="button" onClick={onPrimaryAction}>
                去看今日任务
              </button>
            </div>
          )}
        </div>

        {hasBadgeData ? (
          <div className={styles.badgeSectionList}>
            {groupedBadges.map((group) => (
              <section key={group.category} className={styles.badgeSection}>
                <div className={styles.subHeader}>
                  <h3>{group.category}</h3>
                  <span>{group.items.length} 枚</span>
                </div>
                <div className={styles.badgeGrid}>
                  {group.items.map((badge) => (
                    <article
                      key={badge.id}
                      className={`${styles.badgeCard} ${badge.unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked}`}
                    >
                      <span className={styles.badgeIcon}>{badge.icon}</span>
                      <div className={styles.badgeContent}>
                        <strong>{badge.name}</strong>
                        <p>{badge.description}</p>
                        <small>
                          {badge.unlocked
                            ? `解锁于 ${formatDateTime(badge.unlockedAt!)}`
                            : `当前进度 ${badge.progress}/${badge.threshold}`}
                        </small>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={styles.emptyStateCard}>
            <div className={styles.emptyArtwork}>🏅</div>
            <strong>还没有任何勋章</strong>
            <p>完成第一个任务、建立第一个目标，或者去和宠物互动，都会点亮你的勋章墙。</p>
            <button className={styles.primaryButton} type="button" onClick={onPrimaryAction}>
              去点亮第一枚勋章
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
