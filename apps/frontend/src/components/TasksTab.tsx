import { FormEvent, useMemo, useState } from "react";
import { hasUnsupportedCharacters, sanitizeTextInput } from "../lib/sanitize";
import { Modal } from "./Modal";
import {
  formatDateLabel,
  formatMonthDay,
  formatWeekdayLabel,
  formatDateTime,
  getTodayIso,
  getWeekDates,
  isFutureDate
} from "../lib/date";
import { GoalSummary, OverdueTasksResponse, TaskSummary, TasksByDate } from "../types";
import styles from "../pages/TodayPage.module.css";

interface TasksTabProps {
  date: string;
  goals: GoalSummary[];
  tasksData?: TasksByDate;
  overdue?: OverdueTasksResponse;
  onDateChange: (value: string) => void;
  onCreateTask: (payload: {
    title: string;
    rewardEnergy: number;
    goalId: number | null;
    repeatType: 0 | 1 | 2 | 3;
    targetDate: string;
  }) => Promise<void>;
  onUpdateTask: (
    id: number,
    payload: { title: string; rewardEnergy: number; goalId: number | null; scope: "this" | "future" }
  ) => Promise<void>;
  onDeleteTask: (id: number) => Promise<void>;
  onCheckTask: (id: number) => Promise<void>;
  onUncheckTask: (id: number) => Promise<void>;
  onPostponeTask: (id: number, targetDate: string) => Promise<void>;
}

const rewardPresets = [10, 20, 50];

const emptyTask = {
  title: "",
  goalId: "",
  repeatType: "0",
  rewardMode: "10",
  customReward: "10"
};

const validateTitle = (value: string) => {
  if (hasUnsupportedCharacters(value)) {
    return "不支持输入 < 或 >";
  }
  if (!sanitizeTextInput(value)) {
    return "请输入任务名称";
  }
  return "";
};

const validateCustomReward = (value: string) => {
  const reward = Number(value);
  if (!Number.isInteger(reward) || reward < 1 || reward > 100) {
    return "自定义能量值需为 1-100 的整数";
  }
  return "";
};

export const TasksTab = ({
  date,
  goals,
  tasksData,
  overdue,
  onDateChange,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onCheckTask,
  onUncheckTask,
  onPostponeTask
}: TasksTabProps) => {
  const [editingTask, setEditingTask] = useState<TaskSummary | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formState, setFormState] = useState(emptyTask);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({ title: false, customReward: false });

  const isToday = date === getTodayIso();
  const weekDates = useMemo(() => getWeekDates(date), [date]);

  const titleError = touched.title ? validateTitle(formState.title) : "";
  const customRewardError =
    formState.rewardMode === "custom" && touched.customReward ? validateCustomReward(formState.customReward) : "";

  const mergedTasks = useMemo(
    () => [...(tasksData?.pending ?? []), ...(tasksData?.completed ?? [])],
    [tasksData?.completed, tasksData?.pending]
  );

  const resetForm = () => {
    setTouched({ title: false, customReward: false });
    setFormState(emptyTask);
  };

  const openCreate = () => {
    setEditingTask(null);
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (task: TaskSummary) => {
    setEditingTask(task);
    setTouched({ title: false, customReward: false });
    setFormState({
      title: task.title,
      goalId: task.goalId ? String(task.goalId) : "",
      repeatType: String(task.repeatType),
      rewardMode: rewardPresets.includes(task.rewardEnergy) ? String(task.rewardEnergy) : "custom",
      customReward: String(task.rewardEnergy)
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingTask(null);
    resetForm();
    setIsModalOpen(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    const nextTitleError = validateTitle(formState.title);
    const nextCustomRewardError = formState.rewardMode === "custom" ? validateCustomReward(formState.customReward) : "";
    setTouched({ title: true, customReward: formState.rewardMode === "custom" });

    if (nextTitleError || nextCustomRewardError) {
      return;
    }

    setSubmitting(true);
    const rewardEnergy =
      formState.rewardMode === "custom" ? Number(formState.customReward) : Number(formState.rewardMode);
    const cleanTitle = sanitizeTextInput(formState.title);

    try {
      if (editingTask) {
        await onUpdateTask(editingTask.id, {
          title: cleanTitle,
          rewardEnergy,
          goalId: formState.goalId ? Number(formState.goalId) : null,
          scope: "this"
        });
      } else {
        await onCreateTask({
          title: cleanTitle,
          rewardEnergy,
          goalId: formState.goalId ? Number(formState.goalId) : null,
          repeatType: Number(formState.repeatType) as 0 | 1 | 2 | 3,
          targetDate: date
        });
      }
      closeModal();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={`${styles.contentPanel} ${styles.fixedPanel}`}>
      <div className={`${styles.sectionHeader} ${styles.stickySectionHeader}`}>
        <div>
          <h2>{formatDateLabel(date)}的任务清单</h2>
          <p>本周视图固定按周一到周日展示，右侧列表只保留单列任务流。</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openCreate}>
          + 添加任务
        </button>
      </div>

      <div className={styles.scrollSection}>
        <div className={styles.dateGrid}>
          {weekDates.map((value) => {
            const isActive = value === date;
            const isTodayChip = value === getTodayIso();
            return (
              <button
                key={value}
                type="button"
                className={`${styles.dateTile} ${isActive ? styles.dateTileActive : ""} ${isTodayChip ? styles.dateTileToday : ""}`}
                onClick={() => onDateChange(value)}
              >
                <span>{formatWeekdayLabel(value)}</span>
                <strong>{formatMonthDay(value)}</strong>
                <small>{isTodayChip ? "今天" : " "}</small>
              </button>
            );
          })}
        </div>

        {isToday && overdue && overdue.tasks.length > 0 ? (
          <div className={styles.bannerCard}>
            <div>
              <strong>昨天还有 {overdue.tasks.length} 个任务没完成</strong>
              <p>需要的话可以直接顺延到今天继续。</p>
            </div>
            <div className={styles.bannerActions}>
              {overdue.tasks.slice(0, 3).map((task) => (
                <button key={task.id} type="button" className={styles.secondaryButton} onClick={() => onPostponeTask(task.id, date)}>
                  顺延「{task.title}」
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className={styles.taskList}>
          {mergedTasks.length ? (
            mergedTasks.map((task) => {
              const isDone = task.status === 1;
              const isMissed = task.status === 2;

              return (
                <article
                  key={task.id}
                  className={`${styles.taskListCard} ${isDone ? styles.taskCardDone : ""} ${isMissed ? styles.taskCardMissed : ""}`}
                >
                  <button
                    type="button"
                    className={isDone ? styles.checkButtonFilled : styles.checkButton}
                    disabled={!isDone && isFutureDate(date)}
                    onClick={() => (isDone ? onUncheckTask(task.id) : onCheckTask(task.id))}
                    aria-label={isDone ? `撤销任务 ${task.title}` : `完成任务 ${task.title}`}
                  >
                    {isDone ? "✓" : isMissed ? "!" : "○"}
                  </button>

                  <div className={styles.taskMain}>
                    <div className={styles.taskTopLine}>
                      <strong>{task.title}</strong>
                      <span
                        className={`${styles.taskStatusBadge} ${
                          isDone ? styles.taskStatusDone : isMissed ? styles.taskStatusMissed : styles.taskStatusPending
                        }`}
                      >
                        {isDone ? "已完成" : isMissed ? "已漏做" : "待完成"}
                      </span>
                    </div>
                    <div className={styles.taskMetaLine}>
                      <span>⚡ +{task.rewardEnergy}</span>
                      <span>{task.goalTitle ?? "未关联目标"}</span>
                    </div>
                    {isDone && task.completedAt ? (
                      <small className={styles.taskSubtle}>完成于 {formatDateTime(task.completedAt)}</small>
                    ) : null}
                  </div>

                  <div className={styles.taskActions}>
                    <button type="button" onClick={() => openEdit(task)}>
                      编辑
                    </button>
                    <button type="button" onClick={() => onDeleteTask(task.id)}>
                      删除
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className={styles.emptyStateCard}>
              <div className={styles.emptyArtwork}>🗒️</div>
              <strong>今天还没有安排任何任务</strong>
              <p>先加一个简单任务，让宠物今天也能吃上口粮。</p>
              <button className={styles.primaryButton} type="button" onClick={openCreate}>
                去添加任务
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal open={isModalOpen} title={editingTask ? "编辑任务" : "添加新任务"} onClose={closeModal} width="640px">
        <form className={styles.formGrid} onSubmit={submit}>
          <label>
            任务名称
            <input
              className={titleError ? styles.inputError : ""}
              value={formState.title}
              maxLength={20}
              onChange={(event) => {
                setTouched((state) => ({ ...state, title: true }));
                setFormState((state) => ({ ...state, title: event.target.value }));
              }}
              placeholder="例如：阅读课外书 20 分钟"
              autoComplete="off"
            />
            {titleError ? <span className={styles.inlineError}>{titleError}</span> : null}
          </label>

          <label>
            关联大目标
            <select
              value={formState.goalId}
              onChange={(event) => setFormState((state) => ({ ...state, goalId: event.target.value }))}
            >
              <option value="">散装任务</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className={styles.fieldLabel}>能量奖励</span>
            <div className={styles.choiceRow}>
              {rewardPresets.map((reward) => (
                <button
                  key={reward}
                  type="button"
                  className={`${styles.choiceChip} ${formState.rewardMode === String(reward) ? styles.choiceChipActive : ""}`}
                  onClick={() => setFormState((state) => ({ ...state, rewardMode: String(reward) }))}
                >
                  +{reward} ⚡
                </button>
              ))}
              <button
                type="button"
                className={`${styles.choiceChip} ${formState.rewardMode === "custom" ? styles.choiceChipActive : ""}`}
                onClick={() => setFormState((state) => ({ ...state, rewardMode: "custom" }))}
              >
                自定义
              </button>
            </div>
          </div>

          {formState.rewardMode === "custom" ? (
            <label>
              自定义能量值
              <input
                className={customRewardError ? styles.inputError : ""}
                value={formState.customReward}
                inputMode="numeric"
                onChange={(event) => {
                  setTouched((state) => ({ ...state, customReward: true }));
                  setFormState((state) => ({ ...state, customReward: event.target.value.replace(/[^\d]/g, "") }));
                }}
              />
              {customRewardError ? <span className={styles.inlineError}>{customRewardError}</span> : null}
            </label>
          ) : null}

          {!editingTask ? (
            <label>
              重复频次
              <select
                value={formState.repeatType}
                onChange={(event) => setFormState((state) => ({ ...state, repeatType: event.target.value }))}
              >
                <option value="0">仅一次</option>
                <option value="1">每天</option>
                <option value="2">工作日</option>
                <option value="3">周末</option>
              </select>
            </label>
          ) : null}

          <div className={styles.modalActions}>
            <button className={styles.secondaryButton} type="button" onClick={closeModal}>
              取消
            </button>
            <button className={styles.primaryButton} type="submit" disabled={submitting || Boolean(titleError) || Boolean(customRewardError)}>
              {submitting ? "保存中..." : "保存任务"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
};
