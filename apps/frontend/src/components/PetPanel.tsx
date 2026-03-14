import { motion } from "framer-motion";
import { Item, UserProfile } from "../types";
import styles from "./PetPanel.module.css";

interface PetPanelProps {
  profile: UserProfile;
  items: Item[];
  bubble: string;
  isBusy: boolean;
  busyItemId: number | null;
  onInteract: (itemId: number) => void;
  onGiftClick: () => void;
}

export const PetPanel = ({
  profile,
  items,
  bubble,
  isBusy,
  busyItemId,
  onInteract,
  onGiftClick
}: PetPanelProps) => {
  const progress = Math.min((profile.pet.currentXp / profile.pet.maxXp) * 100, 100);

  return (
    <aside className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div>{profile.nickname}</div>
          <small>今天有任务，宠物在等你。</small>
        </div>
        <motion.div
          className={styles.energy}
          key={profile.energyBalance}
          initial={{ scale: 0.94 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
        >
          ⚡ {profile.energyBalance}
        </motion.div>
      </div>

      <div className={styles.stage}>
        <motion.div
          className={styles.bubble}
          key={bubble}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {bubble}
        </motion.div>
        <div className={styles.petOrb}>
          <motion.div
            className={styles.petFace}
            animate={profile.pendingDraw ? { rotate: [0, 2, -2, 0], y: [0, -6, 0] } : { y: [0, -2, 0] }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            🐱
          </motion.div>
        </div>
        <div className={styles.petName}>
          {profile.pet.name} · LV.{profile.pet.level}
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.xpRow}>
          <div className={styles.level}>LV.{profile.pet.level}</div>
          <div className={styles.track}>
            <motion.div className={styles.progress} animate={{ width: `${progress}%` }} />
          </div>
          <div>
            {profile.pet.currentXp}/{profile.pet.maxXp} XP
          </div>
          <button
            type="button"
            className={`${styles.gift} ${profile.pendingDraw ? styles.giftActive : ""}`}
            onClick={onGiftClick}
            aria-label="打开礼物盒"
            aria-pressed={profile.pendingDraw}
          >
            🎁
          </button>
        </div>
        <p className={styles.hint}>
          {profile.pendingDraw ? "升级啦，点击礼物盒看看有什么惊喜！" : "多陪伴宠物升级就能抽奖哦。"}
        </p>
        <div className={styles.items}>
          {items.map((item) => {
            const disabled = profile.energyBalance < item.costEnergy || isBusy;
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.item} ${busyItemId === item.id ? styles.itemBusy : ""}`}
                disabled={disabled}
                onClick={() => onInteract(item.id)}
                aria-label={`${item.name}，消耗 ${item.costEnergy} 点能量，获得 ${item.gainXp} 点 XP`}
              >
                <span className={styles.itemIcon}>{item.icon}</span>
                <strong>{item.name}</strong>
                <span className={styles.meta}>-{item.costEnergy} ⚡</span>
                <span className={styles.meta}>+{item.gainXp} XP</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
