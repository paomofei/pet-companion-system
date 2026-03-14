import { FormEvent, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { hasUnsupportedCharacters, sanitizeTextInput } from "../lib/sanitize";
import { Modal } from "./Modal";
import { formatDateTime } from "../lib/date";
import { Wish, WishHistoryItem } from "../types";
import styles from "./WishOverlay.module.css";
import pageStyles from "../pages/TodayPage.module.css";

interface WishOverlayProps {
  open: boolean;
  wishes: Wish[];
  history: WishHistoryItem[];
  loadError?: string | null;
  drawPhase: "closed" | "empty" | "spinning" | "result";
  drawResult: WishHistoryItem | null;
  onClose: () => void;
  onOpenCreate: () => void;
  onCloseDraw: () => void;
  onRetryLoad?: () => void;
  onCreateWish: (payload: { title: string; rarity: 1 | 2 | 3 }) => Promise<void>;
  onUpdateWish: (id: number, payload: { title: string; rarity: 1 | 2 | 3 }) => Promise<void>;
}

const initialWish = { title: "", rarity: 1 as 1 | 2 | 3 };

const validateWishTitle = (value: string) => {
  if (hasUnsupportedCharacters(value)) {
    return "不支持输入 < 或 >";
  }
  if (!sanitizeTextInput(value)) {
    return "请输入心愿内容";
  }
  return "";
};

export const WishOverlay = ({
  open,
  wishes,
  history,
  loadError,
  drawPhase,
  drawResult,
  onClose,
  onOpenCreate,
  onCloseDraw,
  onRetryLoad,
  onCreateWish,
  onUpdateWish
}: WishOverlayProps) => {
  const [editing, setEditing] = useState<Wish | null>(null);
  const [formState, setFormState] = useState(initialWish);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open && wishes.length === 0) {
      setEditing(null);
    }
  }, [open, wishes.length]);

  const formOpen = open && editing !== null;
  const spinDeck = useMemo(() => ["🎁", "⭐", "🍭"], []);
  const titleError = touched ? validateWishTitle(formState.title) : "";

  const openCreate = () => {
    onOpenCreate();
    setEditing({ id: -1, icon: "🎁", title: "", weight: 50, rarity: 1, status: 0 });
    setFormState(initialWish);
    setTouched(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextError = validateWishTitle(formState.title);
    setTouched(true);
    if (nextError) {
      return;
    }

    setSaving(true);
    const cleanPayload = {
      title: sanitizeTextInput(formState.title),
      rarity: formState.rarity
    };
    try {
      if (editing?.id === -1) {
        await onCreateWish(cleanPayload);
      } else if (editing) {
        await onUpdateWish(editing.id, cleanPayload);
      }
      setEditing(null);
      setFormState(initialWish);
      setTouched(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Modal open={open} title="🎁 我的许愿池" onClose={onClose} width="920px">
        <div className={styles.layout}>
          <div className={styles.stickyHeader}>
            <div className={pageStyles.sectionHeader}>
              <div>
                <h3>心愿单 ({wishes.length})</h3>
                <p>这里仅管理心愿，不触发抽奖。</p>
              </div>
              <button className={pageStyles.primaryButton} type="button" onClick={openCreate}>
                + 许个新愿望
              </button>
            </div>
          </div>

          {loadError ? (
            <div className={pageStyles.bannerCard}>
              <div>
                <strong>许愿池加载失败</strong>
                <p>{loadError}</p>
              </div>
              {onRetryLoad ? (
                <div className={pageStyles.bannerActions}>
                  <button className={pageStyles.primaryButton} type="button" onClick={onRetryLoad}>
                    重新加载
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={styles.sections}>
            <section className={styles.sectionPane}>
              <div className={styles.sectionTitle}>待抽心愿</div>
              <div className={styles.scrollArea}>
                {!loadError && wishes.length ? (
                  <div className={styles.grid}>
                    {wishes.map((wish) => (
                      <article key={wish.id} className={styles.wishCard}>
                        <span className={styles.wishIcon}>{wish.icon}</span>
                        <strong>{wish.title}</strong>
                        <small>{"⭐".repeat(wish.rarity)} · 权重 {wish.weight}</small>
                        <button
                          className={pageStyles.secondaryButton}
                          type="button"
                          onClick={() => {
                            setEditing(wish);
                            setFormState({ title: wish.title, rarity: wish.rarity });
                            setTouched(false);
                          }}
                        >
                          编辑
                        </button>
                      </article>
                    ))}
                  </div>
                ) : !loadError ? (
                  <div className={pageStyles.emptyStateCard}>
                    <div className={pageStyles.emptyArtwork}>🎁</div>
                    <strong>还没有许愿</strong>
                    <p>先放一个小愿望进许愿池，升级后才能抽到惊喜。</p>
                    <button className={pageStyles.primaryButton} type="button" onClick={openCreate}>
                      去许个愿望
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <section className={styles.sectionPane}>
              <div className={styles.sectionTitle}>中奖记录</div>
              <div className={styles.scrollArea}>
                {!loadError && history.length ? (
                  <div className={styles.historyList}>
                    {history.map((item) => (
                      <div key={`${item.id}-${item.drawnAt}`} className={styles.historyItem}>
                        <span>
                          {item.icon} {item.title}
                        </span>
                        <small>{formatDateTime(item.drawnAt)}</small>
                      </div>
                    ))}
                  </div>
                ) : !loadError ? (
                  <div className={pageStyles.emptyStateCard}>
                    <div className={pageStyles.emptyArtwork}>🏷️</div>
                    <strong>还没有中奖记录</strong>
                    <p>等礼物盒点亮并抽到愿望后，这里会自动留下记录。</p>
                    <button className={pageStyles.secondaryButton} type="button" onClick={onClose}>
                      先去做任务
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </Modal>

      <Modal open={formOpen} title={editing?.id === -1 ? "许个新愿望" : "编辑心愿"} onClose={() => setEditing(null)} width="520px">
        <form className={pageStyles.formGrid} onSubmit={submit}>
          <label>
            想要什么
            <input
              className={titleError ? pageStyles.inputError : ""}
              value={formState.title}
              maxLength={20}
              onChange={(event) => {
                setTouched(true);
                setFormState((state) => ({ ...state, title: event.target.value }));
              }}
              placeholder="例如：周末玩 Switch"
              autoComplete="off"
            />
            {titleError ? <span className={pageStyles.inlineError}>{titleError}</span> : null}
          </label>

          <div>
            <span className={pageStyles.fieldLabel}>稀有度</span>
            <div className={pageStyles.choiceRow}>
              {[1, 2, 3].map((rarity) => (
                <button
                  key={rarity}
                  type="button"
                  className={`${pageStyles.choiceChip} ${formState.rarity === rarity ? pageStyles.choiceChipActive : ""}`}
                  onClick={() => setFormState((state) => ({ ...state, rarity: rarity as 1 | 2 | 3 }))}
                >
                  {"⭐".repeat(rarity)}
                </button>
              ))}
            </div>
          </div>

          <div className={pageStyles.modalActions}>
            <button className={pageStyles.secondaryButton} type="button" onClick={() => setEditing(null)}>
              取消
            </button>
            <button className={pageStyles.primaryButton} type="submit" disabled={saving || Boolean(titleError)}>
              {saving ? "保存中..." : editing?.id === -1 ? "放进许愿池" : "保存修改"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={drawPhase !== "closed"} title="礼物盒惊喜" onClose={onCloseDraw} width="460px">
        {drawPhase === "spinning" ? (
          <div className={styles.spinning}>
            <div className={styles.spinningWheel}>
              {spinDeck.map((item, index) => (
                <motion.div
                  key={`${item}-${index}`}
                  className={styles.spinCard}
                  animate={{ y: [0, -12, 0], rotate: [0, 3, -3, 0] }}
                  transition={{ repeat: Infinity, duration: 0.9, delay: index * 0.12 }}
                >
                  {item}
                </motion.div>
              ))}
            </div>
            <div>翻牌中…</div>
          </div>
        ) : null}

        {drawPhase === "empty" ? (
          <div className={styles.emptyState}>
            <h3>许愿池空了～</h3>
            <p>先许个愿望再来抽奖吧！</p>
            <div className={pageStyles.modalActions}>
              <button className={pageStyles.secondaryButton} type="button" onClick={onCloseDraw}>
                关闭
              </button>
              <button
                className={pageStyles.primaryButton}
                type="button"
                onClick={() => {
                  onCloseDraw();
                  onClose();
                  openCreate();
                }}
              >
                + 许个新愿望
              </button>
            </div>
          </div>
        ) : null}

        {drawPhase === "result" && drawResult ? (
          <div className={styles.resultState}>
            <div className={styles.resultHero}>{drawResult.icon}</div>
            <h3>🎉 恭喜中奖！</h3>
            <strong>{drawResult.title}</strong>
            <div>稀有度：{"⭐".repeat(drawResult.rarity)}</div>
            <p>快和爸爸妈妈说这个好消息！</p>
            <div className={pageStyles.modalActions}>
              <button
                className={pageStyles.secondaryButton}
                type="button"
                onClick={() => {
                  onCloseDraw();
                  onClose();
                  openCreate();
                }}
              >
                再许个新愿望
              </button>
              <button className={pageStyles.primaryButton} type="button" onClick={onCloseDraw}>
                好的
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
};
