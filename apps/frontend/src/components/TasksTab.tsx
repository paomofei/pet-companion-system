import { FormEvent, useMemo, useState } from "react";
import { sanitizeTextInput } from "../lib/sanitize";
import { Modal } from "./Modal";
import { addDays, formatDateLabel, getTodayIso, isFutureDate } from "../lib/date";
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

  const isToday = date === getTodayIso();

  const openCreate = () => {
    setEditingTask(null);
    setFormState(emptyTask);
    setIsModalOpen(true);
  };

  const openEdit = (task: TaskSummary) => {
    setEditingTask(task);
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
    setFormState(emptyTask);
    setIsModalOpen(false);
  };

  const dateWindow = useMemo(
    () => [-2, -1, 0, 1, 2].map((offset) => addDays(getTodayIso(), offset)),
    []
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
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
    <section className={styles.contentPanel}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>今日任务</h2>
          <p>默认首页，任务完成后会把能量飞到宠物面板里。</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={openCreate}>
          + 添加任务
        </button>
      </div>

      <div className={styles.dateRail}>
        {dateWindow.map((value) => (
          <button
            key={value}
            type="button"
            className={`${styles.dateChip} ${value === date ? styles.dateChipActive : ""}`}
            onClick={() => onDateChange(value)}
          >
            {formatDateLabel(value)}
          </button>
        ))}
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
                移动「{task.title}」
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={styles.dualColumn}>
        <div className={styles.cardPane}>
          <div className={styles.subHeader}>
            <h3>未完成</h3>
            <span>{tasksData?.pending.length ?? 0}</span>
          </div>
          <div className={styles.cardStack}>
            {tasksData?.pending.length ? (
              tasksData.pending.map((task) => (
                <article key={task.id} className={`${styles.taskCard} ${task.status === 2 ? styles.taskCardMissed : ""}`}>
                  <button
                    type="button"
                    className={styles.checkButton}
                    disabled={isFutureDate(date)}
                    onClick={() => onCheckTask(task.id)}
                    aria-label={`完成任务 ${task.title}`}
                  >
                    {task.status === 2 ? "×" : "○"}
                  </button>
                  <div className={styles.taskBody}>
                    <strong>{task.title}</strong>
                    <small>
                      {task.goalTitle ? `${task.goalIcon} ${task.goalTitle}` : "未关联目标"} · +{task.rewardEnergy}⚡
                    </small>
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
              ))
            ) : (
              <div className={styles.emptyCard}>今天还没有安排任何任务哦~给宠物赚点能量口粮吧！</div>
            )}
          </div>
        </div>

        <div className={styles.cardPane}>
          <div className={styles.subHeader}>
            <h3>已完成</h3>
            <span>{tasksData?.completed.length ?? 0}</span>
          </div>
          <div className={styles.cardStack}>
            {tasksData?.completed.length ? (
              tasksData.completed.map((task) => (
                <article key={task.id} className={`${styles.taskCard} ${styles.taskCardDone}`}>
                  <button
                    type="button"
                    className={styles.checkButtonFilled}
                    onClick={() => onUncheckTask(task.id)}
                    aria-label={`撤销任务 ${task.title} 的完成状态`}
                  >
                    ✓
                  </button>
                  <div className={styles.taskBody}>
                    <strong>{task.title}</strong>
                    <small>{task.completedAt ? `完成于 ${new Date(task.completedAt).toLocaleTimeString("zh-CN")}` : "已完成"}</small>
                  </div>
                </article>
              ))
            ) : (
              <div className={styles.emptyCard}>完成一个任务，第一波能量就会飞过去。</div>
            )}
          </div>
        </div>
      </div>

      <Modal open={isModalOpen} title={editingTask ? "编辑任务" : "添加新任务"} onClose={closeModal} width="640px">
        <form className={styles.formGrid} onSubmit={submit}>
          <label>
            任务名称
            <input
              value={formState.title}
              maxLength={20}
              onChange={(event) => setFormState((state) => ({ ...state, title: event.target.value }))}
              placeholder="例如：阅读课外书 20 分钟"
              autoComplete="off"
            />
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
                  {goal.icon} {goal.title}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className={styles.fieldLabel}>能量奖励</span>
            <div className={styles.choiceRow}>
              {rewardPresets.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.choiceChip} ${formState.rewardMode === String(value) ? styles.choiceChipActive : ""}`}
                  onClick={() => setFormState((state) => ({ ...state, rewardMode: String(value), customReward: String(value) }))}
                >
                  +{value}⚡
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
            {formState.rewardMode === "custom" ? (
              <input
                value={formState.customReward}
                type="number"
                min={1}
                max={100}
                onChange={(event) => setFormState((state) => ({ ...state, customReward: event.target.value }))}
              />
            ) : null}
          </div>

          {!editingTask ? (
            <label>
              重复频次
              <select
                value={formState.repeatType}
                onChange={(event) => setFormState((state) => ({ ...state, repeatType: event.target.value }))}
              >
                <option value="0">仅今天</option>
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
            <button className={styles.primaryButton} type="submit" disabled={submitting || formState.title.trim().length === 0}>
              {submitting ? "保存中..." : editingTask ? "保存修改" : "确定添加"}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
};
