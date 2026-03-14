import { FormEvent, useEffect, useRef, useState } from "react";
import { sanitizeTextInput } from "../lib/sanitize";
import { GoalSummary } from "../types";
import { Modal } from "./Modal";
import styles from "../pages/TodayPage.module.css";

interface GoalsTabProps {
  goals: GoalSummary[];
  autoOpenCreate?: boolean;
  onAutoOpened?: () => void;
  onCreateGoal: (payload: { icon: string; title: string }) => Promise<void>;
  onUpdateGoal: (id: number, payload: { icon: string; title: string }) => Promise<void>;
  onDeleteGoal: (id: number) => Promise<void>;
}

const emptyGoal = { icon: "🎯", title: "" };

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
  const autoOpenedRef = useRef(false);

  const openCreate = () => {
    setEditing({ id: -1, icon: "🎯", title: "", completed: 0, total: 0, percentage: 0 });
    setFormState(emptyGoal);
  };

  const openEdit = (goal: GoalSummary) => {
    setEditing(goal);
    setFormState({ icon: goal.icon, title: goal.title });
  };

  const closeModal = () => {
    setEditing(null);
    setFormState(emptyGoal);
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
    setSaving(true);
    const cleanPayload = {
      icon: sanitizeTextInput(formState.icon) || "🎯",
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
    <section className={styles.contentPanel}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>我的大目标</h2>
          <p>目标本身不产能量，任务关联后会自动推目标进度。</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openCreate}>
          + 新增目标
        </button>
      </div>

      <div className={styles.listGrid}>
        {goals.length ? (
          goals.map((goal) => (
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
          ))
        ) : (
          <div className={styles.emptyCard}>还没有设定大目标哦，和爸爸妈妈一起定个小目标吧！</div>
        )}
      </div>

      <Modal open={Boolean(editing)} title={editing?.id === -1 ? "创建新目标" : "编辑目标"} onClose={closeModal} width="520px">
        <form className={styles.formGrid} onSubmit={submit}>
          <label>
            目标图标
            <input value={formState.icon} maxLength={2} onChange={(event) => setFormState((state) => ({ ...state, icon: event.target.value }))} />
          </label>
          <label>
            目标名称
            <input
              value={formState.title}
              maxLength={20}
              placeholder="例如：期末数学冲刺 100 分"
              onChange={(event) => setFormState((state) => ({ ...state, title: event.target.value }))}
            />
          </label>
          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>
              取消
            </button>
            <button className={styles.primaryButton} type="submit" disabled={saving || formState.title.trim().length === 0}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
};
