import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Item, UserProfile } from "../types";
import styles from "./PetPanel.module.css";

interface PetPanelProps {
  profile: UserProfile;
  items: Item[];
  bubble: string;
  currentDateLabel: string;
  interactionTick: number;
  isBusy: boolean;
  busyItemId: number | null;
  onInteract: (itemId: number) => void;
  onGiftClick: () => void;
  onPetTap: () => void;
}

export const PetPanel = ({
  profile,
  items,
  bubble,
  currentDateLabel,
  interactionTick,
  isBusy,
  busyItemId,
  onInteract,
  onGiftClick,
  onPetTap
}: PetPanelProps) => {
  const progress = Math.min((profile.pet.currentXp / profile.pet.maxXp) * 100, 100);
  const [reaction, setReaction] = useState<"idle" | "nudge" | "happy">("idle");

  useEffect(() => {
    if (reaction === "idle") {
      return;
    }

    const timeoutId = window.setTimeout(() => setReaction("idle"), reaction === "happy" ? 960 : 560);
    return () => window.clearTimeout(timeoutId);
  }, [reaction]);

  useEffect(() => {
    if (interactionTick === 0) {
      return;
    }
    setReaction("happy");
  }, [interactionTick]);

  const handlePetTap = () => {
    setReaction("nudge");
    onPetTap();
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.dateCard}>
        <span className={styles.dateLabel}>今天是</span>
        <strong>{currentDateLabel}</strong>
      </div>

      <div className={styles.header}>
        <div className={styles.headerText}>
          <div className={styles.nickname}>{profile.nickname}</div>
          <small className={styles.statusText}>{bubble}</small>
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
        <motion.button
          type="button"
          className={`${styles.petOrb} ${reaction === "happy" ? styles.petOrbHappy : ""}`}
          onClick={handlePetTap}
          whileTap={{ scale: 0.98 }}
          aria-label={`和 ${profile.pet.name} 轻轻互动`}
        >
          {reaction === "happy" ? (
            <motion.div
              key={interactionTick}
              className={styles.reactionBurst}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <motion.span
                className={`${styles.reactionEmoji} ${styles.reactionEmojiLeft}`}
                initial={{ opacity: 0, x: -8, y: 18, scale: 0.6 }}
                animate={{ opacity: [0, 1, 0], x: -28, y: -24, scale: [0.6, 1.1, 0.92] }}
                transition={{ duration: 0.92, ease: "easeOut" }}
              >
                ✨
              </motion.span>
              <motion.span
                className={`${styles.reactionEmoji} ${styles.reactionEmojiCenter}`}
                initial={{ opacity: 0, y: 16, scale: 0.62 }}
                animate={{ opacity: [0, 1, 0], y: -34, scale: [0.62, 1.08, 0.94] }}
                transition={{ duration: 0.88, ease: "easeOut", delay: 0.06 }}
              >
                💛
              </motion.span>
              <motion.span
                className={`${styles.reactionEmoji} ${styles.reactionEmojiRight}`}
                initial={{ opacity: 0, x: 8, y: 18, scale: 0.6 }}
                animate={{ opacity: [0, 1, 0], x: 28, y: -22, scale: [0.6, 1.08, 0.92] }}
                transition={{ duration: 0.92, ease: "easeOut", delay: 0.1 }}
              >
                ✨
              </motion.span>
            </motion.div>
          ) : null}
          <motion.div
            className={styles.petFace}
            animate={
              reaction === "happy"
                ? { rotate: [0, -8, 8, -4, 0], scale: [1, 1.1, 0.98, 1.06, 1], y: [0, -18, -6, 0] }
                : reaction === "nudge"
                ? { rotate: [0, -5, 5, 0], scale: [1, 1.04, 0.98, 1], y: [0, -10, 0] }
                : profile.pendingDraw
                  ? { rotate: [0, 2, -2, 0], y: [0, -6, 0] }
                  : { y: [0, -2, 0] }
            }
            transition={
              reaction === "happy"
                ? { duration: 0.96, ease: "easeOut" }
                : reaction === "nudge"
                  ? { duration: 0.56, ease: "easeOut" }
                : { duration: 2.4, repeat: Infinity }
            }
          >
            🐱
          </motion.div>
          <span className={styles.tapHint}>点一点，和它打个招呼</span>
        </motion.button>
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
          <div className={styles.xpText}>
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
