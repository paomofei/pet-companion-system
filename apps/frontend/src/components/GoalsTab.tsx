import { FormEvent, useEffect, useRef, useState } from "react";
import { hasUnsupportedCharacters, sanitizeTextInput } from "../lib/sanitize";
import { GoalSummary } from "../types";
import { Modal } from "./Modal";
import styles from "../pages/TodayPage.module.css";

interface GoalsTabProps {
  goals: GoalSummary[];
  autoOpenCreate?: boolean;
  onAutoOpened?: () => void;
  onCreateGoal: (payload: { title: string }) => Promise<void>;
  onUpdateGoal: (id: number, payload: { title: string }) => Promise<void>;
  onDeleteGoal: (id: number) => Promise<void>;
}

const emptyGoal = { title: "" };

const validateGoalTitle = (value: string) => {
  if (hasUnsupportedCharacters(value)) {
    return "不支持输入 < 或 >";
  }
  if (!sanitizeTextInput(value)) {
    return "请输入目标名称";
  }
  return "";
};

export const GoalsTab = ({
  goals,
  autoOpenCreate = false,
  onAutoOpened,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal
}: GoalsTabProps) => {
  const [editing, setEditing] = useState<GoalSummary | null>(null);
  const [formState, setFormState] = useState(emptyGoal);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  const autoOpenedRef = useRef(false);

  const titleError = touched ? validateGoalTitle(formState.title) : "";

  const openCreate = () => {
    setEditing({ id: -1, icon: "🎯", title: "", completed: 0, total: 0, percentage: 0 });
    setFormState(emptyGoal);
    setTouched(false);
  };

  const openEdit = (goal: GoalSummary) => {
    setEditing(goal);
    setFormState({ title: goal.title });
    setTouched(false);
  };

  const closeModal = () => {
    setEditing(null);
    setFormState(emptyGoal);
    setTouched(false);
  };

  useEffect(() => {
    if (autoOpenCreate && !autoOpenedRef.current) {
      openCreate();
      autoOpenedRef.current = true;
      onAutoOpened?.();
    }
  }, [autoOpenCreate, onAutoOpened]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextError = validateGoalTitle(formState.title);
    setTouched(true);
    if (nextError) {
      return;
    }

    setSaving(true);
    const cleanPayload = {
      title: sanitizeTextInput(formState.title)
    };
    try {
      if (editing?.id === -1) {
        await onCreateGoal(cleanPayload);
      } else if (editing) {
        await onUpdateGoal(editing.id, cleanPayload);
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={`${styles.contentPanel} ${styles.fixedPanel}`}>
      <div className={`${styles.sectionHeader} ${styles.stickySectionHeader}`}>
        <div>
          <h2>我的大目标</h2>
          <p>目标页头保持固定，列表独立滚动，方便长期规划时集中浏览。</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openCreate}>
          + 新增目标
        </button>
      </div>

      <div className={styles.scrollSection}>
        {goals.length ? (
          <div className={styles.listGrid}>
            {goals.map((goal) => (
              <article key={goal.id} className={styles.goalCard}>
                <div className={styles.goalHead}>
                  <div>
                    <h3>
                      {goal.icon} {goal.title}
                    </h3>
                    <small>
                      关联任务进度：{goal.completed}/{goal.total} 已完成
                    </small>
                  </div>
                  <div className={styles.taskActions}>
                    <button type="button" onClick={() => openEdit(goal)}>
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("删除后，关联任务会自动解绑为无目标状态，确认继续吗？")) {
                          void onDeleteGoal(goal.id);
                        }
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
                <div className={styles.goalProgressTrack}>
                  <div className={styles.goalProgressFill} style={{ width: `${goal.percentage}%` }} />
                </div>
                <p className={styles.goalHint}>
                  {goal.total === 0 ? "暂无关联任务，快去“今日任务”里添加吧。" : `${goal.percentage}% 已完成`}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyStateCard}>
            <div className={styles.emptyArtwork}>🎯</div>
            <strong>还没有设定大目标</strong>
            <p>先定一个清晰的方向，任务才会更有成就感。</p>
            <button className={styles.primaryButton} type="button" onClick={openCreate}>
              去创建目标
            </button>
          </div>
        )}
      </div>

      <Modal open={Boolean(editing)} title={editing?.id === -1 ? "创建新目标" : "编辑目标"} onClose={closeModal} width="520px">
        <form className={styles.formGrid} onSubmit={submit}>
          <label>
            目标名称
            <input
              className={titleError ? styles.inputError : ""}
              value={formState.title}
              maxLength={20}
              placeholder="例如：期末数学冲刺 100 分"
              onChange={(event) => {
                setTouched(true);
                setFormState({ title: event.target.value });
              }}
            />
            {titleError ? <span className={styles.inlineError}>{titleError}</span> : null}
          </label>
          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>
              取消
            </button>
            <button className={styles.primaryButton} type="submit" disabled={saving || Boolean(titleError)}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
};
