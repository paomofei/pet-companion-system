import {
  ApiEnvelope,
  Badge,
  DrawResponse,
  GoalProgress,
  GoalSummary,
  GrowthStats,
  InitRequest,
  InitResponse,
  InteractionResponse,
  Item,
  OverdueTasksResponse,
  PetCore,
  PostponeResponse,
  TaskCheckResponse,
  TaskSummary,
  TaskUncheckResponse,
  TasksByDate,
  UserProfile,
  WeeklyGrowthPoint,
  DrawWishRequest,
  Wish,
  WishHistoryItem
} from "../types";
import { addDays, formatWeekdayLabel, getTodayIso } from "../lib/date";
import { ApiError } from "./errors";

const STORAGE_KEY = "pet-sys-mock-db-v1";

interface GoalRecord extends GoalSummary {
  createdAt: string;
  deleted: boolean;
}

interface TaskRecord extends TaskSummary {
  createdAt: string;
  deleted: boolean;
}

interface WishRecord extends Wish {
  createdAt: string;
  drawnAt?: string;
}

interface BadgeTemplate {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  metric: "tasks" | "streak" | "energy" | "petLevel" | "goals" | "completedGoals" | "interactions";
}

interface MockDb {
  counters: {
    user: number;
    pet: number;
    goal: number;
    task: number;
    template: number;
    wish: number;
  };
  user: {
    userId: number;
    nickname: string;
    onboardingOption: 0 | 1;
    energyBalance: number;
    currentStreak: number;
    maxStreak: number;
    totalEnergyEarned: number;
    totalTasksDone: number;
    totalInteractions: number;
  } | null;
  pet: (PetCore & { pendingDraw: boolean }) | null;
  items: Item[];
  goals: GoalRecord[];
  tasks: TaskRecord[];
  wishes: WishRecord[];
  drawRequests: Record<string, DrawResponse>;
  badgeUnlocks: Record<string, string>;
}

const defaultItems: Item[] = [
  { id: 1, name: "小饼干", icon: "🍪", costEnergy: 10, gainXp: 2, sortOrder: 1 },
  { id: 2, name: "鲜水果", icon: "🍎", costEnergy: 20, gainXp: 5, sortOrder: 2 },
  { id: 3, name: "玩球", icon: "🎾", costEnergy: 30, gainXp: 8, sortOrder: 3 },
  { id: 4, name: "大肉肉", icon: "🍖", costEnergy: 50, gainXp: 15, sortOrder: 4 },
  { id: 5, name: "飞盘", icon: "🥏", costEnergy: 80, gainXp: 25, sortOrder: 5 }
];

const goalIcon = "🎯";
const wishIcon = "🎁";

const badgeTemplates: BadgeTemplate[] = [
  { id: 1, code: "first_task", name: "初出茅庐", description: "第一次完成任务", icon: "⭐", category: "任务习惯", threshold: 1, metric: "tasks" },
  { id: 2, code: "tasks_10", name: "勤奋小帮手", description: "累计完成 10 个任务", icon: "📚", category: "任务习惯", threshold: 10, metric: "tasks" },
  { id: 3, code: "streak_3", name: "三日连胜", description: "连续完成任务 3 天", icon: "🌤️", category: "任务习惯", threshold: 3, metric: "streak" },
  { id: 4, code: "streak_7", name: "本周小明星", description: "连续完成任务 7 天", icon: "🌟", category: "任务习惯", threshold: 7, metric: "streak" },
  { id: 5, code: "first_goal", name: "梦想起航", description: "创建第一个大目标", icon: "🎯", category: "目标成长", threshold: 1, metric: "goals" },
  { id: 6, code: "goals_3", name: "目标收藏家", description: "累计创建 3 个大目标", icon: "🗂️", category: "目标成长", threshold: 3, metric: "goals" },
  { id: 7, code: "goal_complete_1", name: "目标达阵", description: "第一次完成一个大目标", icon: "🏁", category: "目标成长", threshold: 1, metric: "completedGoals" },
  { id: 8, code: "goal_complete_3", name: "坚持规划家", description: "累计完成 3 个大目标", icon: "🏆", category: "目标成长", threshold: 3, metric: "completedGoals" },
  { id: 9, code: "first_interact", name: "小手碰碰", description: "第一次与宠物互动", icon: "🐾", category: "宠物互动", threshold: 1, metric: "interactions" },
  { id: 10, code: "interact_10", name: "陪伴达人", description: "累计完成 10 次宠物互动", icon: "💞", category: "宠物互动", threshold: 10, metric: "interactions" },
  { id: 11, code: "pet_level_2", name: "默契发芽", description: "把宠物升到 2 级", icon: "🌱", category: "宠物互动", threshold: 2, metric: "petLevel" },
  { id: 12, code: "pet_level_5", name: "超级拍档", description: "把宠物升到 5 级", icon: "👑", category: "宠物互动", threshold: 5, metric: "petLevel" }
];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const delay = <T,>(fn: () => T, ms = 180): Promise<ApiEnvelope<T>> =>
  new Promise((resolve, reject) => {
    window.setTimeout(() => {
      try {
        resolve({ code: 0, message: "ok", data: fn() });
      } catch (error) {
        reject(error);
      }
    }, ms);
  });

const shiftDate = (base: string, diff: number) => addDays(base, diff);

const formatWeekLabel = (dateString: string) => {
  const today = getTodayIso();
  if (dateString === today) {
    return "今天";
  }
  return formatWeekdayLabel(dateString);
};

const createEmptyDb = (): MockDb => ({
  counters: { user: 1, pet: 1, goal: 1, task: 1, template: 1, wish: 1 },
  user: null,
  pet: null,
  items: clone(defaultItems),
  goals: [],
  tasks: [],
  wishes: [],
  drawRequests: {},
  badgeUnlocks: {}
});

const readDb = (): MockDb => {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyDb();
  }

  return {
    ...createEmptyDb(),
    ...JSON.parse(raw)
  } as MockDb;
};

const writeDb = (db: MockDb) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

const ensureInitialized = (db: MockDb) => {
  if (!db.user || !db.pet) {
    throw new ApiError(40002, "请先完成初始化");
  }
};

const nextId = (db: MockDb, key: keyof MockDb["counters"]) => {
  const value = db.counters[key];
  db.counters[key] += 1;
  return value;
};

const getGoalProgress = (db: MockDb, goalId: number): GoalProgress => {
  const related = db.tasks.filter((task) => !task.deleted && task.goalId === goalId);
  const completed = related.filter((task) => task.status === 1).length;
  const total = related.length;
  return {
    goalId,
    completed,
    total,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100)
  };
};

const sortGoals = (goals: GoalRecord[]) =>
  goals
    .filter((goal) => !goal.deleted)
    .sort((left, right) => {
      if (left.percentage === 100 && right.percentage !== 100) {
        return 1;
      }
      if (left.percentage !== 100 && right.percentage === 100) {
        return -1;
      }
      return right.createdAt.localeCompare(left.createdAt);
    });

const recomputeStreaks = (db: MockDb) => {
  if (!db.user) {
    return;
  }

  const completedDates = Array.from(
    new Set(
      db.tasks
        .filter((task) => !task.deleted && task.status === 1)
        .map((task) => task.targetDate ?? getTodayIso())
    )
  ).sort();

  db.user.totalTasksDone = db.tasks.filter((task) => !task.deleted && task.status === 1).length;
  db.user.totalEnergyEarned = db.tasks
    .filter((task) => !task.deleted && task.status === 1)
    .reduce((sum, task) => sum + task.rewardEnergy, 0);

  if (completedDates.length === 0) {
    db.user.currentStreak = 0;
    db.user.maxStreak = 0;
    return;
  }

  let max = 1;
  let run = 1;
  for (let index = 1; index < completedDates.length; index += 1) {
    const previous = completedDates[index - 1];
    const current = completedDates[index];
    if (shiftDate(previous, 1) === current) {
      run += 1;
      max = Math.max(max, run);
    } else {
      run = 1;
    }
  }

  let currentStreak = 0;
  let cursor = getTodayIso();
  while (completedDates.includes(cursor)) {
    currentStreak += 1;
    cursor = shiftDate(cursor, -1);
  }

  db.user.currentStreak = currentStreak;
  db.user.maxStreak = max;
};

const syncGoalSnapshots = (db: MockDb) => {
  db.goals.forEach((goal) => {
    const progress = getGoalProgress(db, goal.id);
    goal.completed = progress.completed;
    goal.total = progress.total;
    goal.percentage = progress.percentage;
  });
};

const updateBadgeUnlocks = (db: MockDb) => {
  if (!db.user || !db.pet) {
    return;
  }

  const metrics = {
    tasks: db.user.totalTasksDone,
    streak: db.user.currentStreak,
    energy: db.user.totalEnergyEarned,
    petLevel: db.pet.level,
    goals: db.goals.filter((goal) => !goal.deleted).length,
    completedGoals: db.goals.filter((goal) => !goal.deleted && goal.percentage === 100).length,
    interactions: db.user.totalInteractions ?? 0
  };

  badgeTemplates.forEach((badge) => {
    if (metrics[badge.metric] >= badge.threshold && !db.badgeUnlocks[badge.code]) {
      db.badgeUnlocks[badge.code] = new Date().toISOString();
    }
  });
};

const persistAndReturn = <T,>(db: MockDb, data: T): T => {
  syncGoalSnapshots(db);
  recomputeStreaks(db);
  updateBadgeUnlocks(db);
  writeDb(db);
  return data;
};

const mapUserProfile = (db: MockDb): UserProfile => {
  ensureInitialized(db);
  return {
    userId: db.user!.userId,
    nickname: db.user!.nickname,
    energyBalance: db.user!.energyBalance,
    currentStreak: db.user!.currentStreak,
    maxStreak: db.user!.maxStreak,
    totalEnergyEarned: db.user!.totalEnergyEarned,
    totalTasksDone: db.user!.totalTasksDone,
    pendingDraw: db.pet!.pendingDraw,
    pet: clone({
      id: db.pet!.id,
      name: db.pet!.name,
      level: db.pet!.level,
      currentXp: db.pet!.currentXp,
      maxXp: db.pet!.maxXp,
      appearance: db.pet!.appearance
    })
  };
};

const mapTask = (db: MockDb, task: TaskRecord): TaskSummary => {
  const goal = db.goals.find((entry) => !entry.deleted && entry.id === task.goalId);
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    rewardEnergy: task.rewardEnergy,
    repeatType: task.repeatType,
    goalId: task.goalId,
    goalIcon: goal?.icon,
    goalTitle: goal?.title,
    isDelayedCopy: task.isDelayedCopy,
    completedAt: task.completedAt,
    targetDate: task.targetDate,
    templateId: task.templateId ?? null
  };
};

const getTargetTask = (db: MockDb, id: number) => {
  const task = db.tasks.find((entry) => entry.id === id && !entry.deleted);
  if (!task) {
    throw new ApiError(40002, "任务不存在");
  }
  return task;
};

const defaultGoalTitle = "每日好习惯";

export const mockApi = {
  isInitialized() {
    return Boolean(readDb().user);
  },
  reset() {
    window.localStorage.removeItem(STORAGE_KEY);
  },
  initUser(payload: InitRequest) {
    return delay<InitResponse>(() => {
      const db = readDb();
      if (payload.nickname.trim().length === 0 || payload.petName.trim().length === 0) {
        throw new ApiError(40001, "昵称不能为空");
      }

      if (payload.nickname.includes("坏")) {
        throw new ApiError(40007, "哎呀，这个名字不太合适，换一个吧~");
      }

      const userId = 1;
      const petId = 1;
      const now = new Date().toISOString();
      db.user = {
        userId,
        nickname: payload.nickname.trim(),
        onboardingOption: payload.onboardingOption,
        energyBalance: 0,
        currentStreak: 0,
        maxStreak: 0,
        totalEnergyEarned: 0,
        totalTasksDone: 0,
        totalInteractions: 0
      };
      db.pet = {
        id: petId,
        name: payload.petName.trim(),
        level: 1,
        currentXp: 0,
        maxXp: 100,
        appearance: "cat_default",
        pendingDraw: false
      };

      db.goals = [];
      db.tasks = [];
      db.wishes = [];
      db.drawRequests = {};
      db.badgeUnlocks = {};

      let defaultGoals: GoalSummary[] | undefined;
      let defaultTasks: TaskSummary[] | undefined;

      if (payload.onboardingOption === 0) {
        const goalId = nextId(db, "goal");
        const goal: GoalRecord = {
          id: goalId,
          icon: goalIcon,
          title: defaultGoalTitle,
          completed: 0,
          total: 3,
          percentage: 0,
          createdAt: now,
          deleted: false
        };

        db.goals.push(goal);

        const seedTasks = [
          { title: "早起喝一杯水", rewardEnergy: 10 },
          { title: "阅读课外书20分钟", rewardEnergy: 20 },
          { title: "整理书桌", rewardEnergy: 10 }
        ];

        defaultTasks = seedTasks.map((task) => {
          const record: TaskRecord = {
            id: nextId(db, "task"),
            title: task.title,
            status: 0,
            rewardEnergy: task.rewardEnergy,
            repeatType: 1,
            goalId,
            isDelayedCopy: false,
            targetDate: getTodayIso(),
            createdAt: now,
            deleted: false,
            completedAt: undefined,
            templateId: nextId(db, "template")
          };
          db.tasks.push(record);
          return mapTask(db, record);
        });

        defaultGoals = [goal];
      }

      syncGoalSnapshots(db);
      writeDb(db);

      return {
        userId,
        nickname: db.user.nickname,
        pet: clone({
          id: db.pet.id,
          name: db.pet.name,
          level: db.pet.level,
          currentXp: db.pet.currentXp,
          maxXp: db.pet.maxXp,
          appearance: db.pet.appearance
        }),
        energyBalance: 0,
        pendingDraw: false,
        defaultGoals,
        defaultTasks
      };
    });
  },
  getCurrentUser() {
    return delay<UserProfile>(() => mapUserProfile(readDb()));
  },
  getPetStatus() {
    return delay(() => {
      const db = readDb();
      ensureInitialized(db);
      return clone(db.pet!);
    });
  },
  getItems() {
    return delay<Item[]>(() => clone(readDb().items).sort((left, right) => left.sortOrder - right.sortOrder));
  },
  interactPet(itemId: number) {
    return delay<InteractionResponse>(() => {
      const db = readDb();
      ensureInitialized(db);
      const item = db.items.find((entry) => entry.id === itemId);
      if (!item) {
        throw new ApiError(40002, "道具不存在");
      }
      if (db.user!.energyBalance < item.costEnergy) {
        throw new ApiError(40004, "能量不足");
      }

      db.user!.energyBalance -= item.costEnergy;
      db.user!.totalInteractions = (db.user!.totalInteractions ?? 0) + 1;
      const nextXp = db.pet!.currentXp + item.gainXp;
      const leveledUp = nextXp >= db.pet!.maxXp;
      if (leveledUp) {
        db.pet!.level += 1;
        db.pet!.currentXp = nextXp % db.pet!.maxXp;
        db.pet!.pendingDraw = true;
      } else {
        db.pet!.currentXp = nextXp;
      }

      return persistAndReturn(db, {
        energyBalance: db.user!.energyBalance,
        pet: {
          level: db.pet!.level,
          currentXp: db.pet!.currentXp,
          maxXp: db.pet!.maxXp
        },
        interaction: {
          energyCost: item.costEnergy,
          xpGained: item.gainXp
        },
        leveledUp,
        pendingDraw: db.pet!.pendingDraw
      });
    });
  },
  getGoals() {
    return delay<GoalSummary[]>(() => {
      const db = readDb();
      ensureInitialized(db);
      syncGoalSnapshots(db);
      writeDb(db);
      return sortGoals(db.goals).map((goal) => clone(goal));
    });
  },
  createGoal(payload: { title: string }) {
    return delay<GoalSummary>(() => {
      const db = readDb();
      ensureInitialized(db);
      const now = new Date().toISOString();
      const goal: GoalRecord = {
        id: nextId(db, "goal"),
        icon: goalIcon,
        title: payload.title.trim(),
        completed: 0,
        total: 0,
        percentage: 0,
        createdAt: now,
        deleted: false
      };
      db.goals.push(goal);
      return persistAndReturn(db, clone(goal));
    });
  },
  updateGoal(id: number, payload: { title: string }) {
    return delay<GoalSummary>(() => {
      const db = readDb();
      ensureInitialized(db);
      const goal = db.goals.find((entry) => entry.id === id && !entry.deleted);
      if (!goal) {
        throw new ApiError(40002, "目标不存在");
      }
      goal.icon = goalIcon;
      goal.title = payload.title.trim();
      return persistAndReturn(db, clone(goal));
    });
  },
  deleteGoal(id: number) {
    return delay(() => {
      const db = readDb();
      ensureInitialized(db);
      const goal = db.goals.find((entry) => entry.id === id && !entry.deleted);
      if (!goal) {
        throw new ApiError(40002, "目标不存在");
      }
      goal.deleted = true;
      const unboundTaskCount = db.tasks.filter((task) => !task.deleted && task.goalId === id).length;
      db.tasks.forEach((task) => {
        if (!task.deleted && task.goalId === id) {
          task.goalId = null;
        }
      });
      return persistAndReturn(db, { id, deleted: true, unboundTaskCount });
    });
  },
  getTasks(date: string) {
    return delay<TasksByDate>(() => {
      const db = readDb();
      ensureInitialized(db);
      const dateTasks = db.tasks.filter((task) => !task.deleted && task.targetDate === date);
      const pending = dateTasks.filter((task) => task.status !== 1).map((task) => mapTask(db, task));
      const completed = dateTasks.filter((task) => task.status === 1).map((task) => mapTask(db, task));
      return {
        date,
        pending,
        completed
      };
    });
  },
  createTask(payload: {
    title: string;
    rewardEnergy: number;
    goalId: number | null;
    repeatType: 0 | 1 | 2 | 3;
    targetDate: string;
  }) {
    return delay<TaskSummary>(() => {
      const db = readDb();
      ensureInitialized(db);
      const now = new Date().toISOString();
      const task: TaskRecord = {
        id: nextId(db, "task"),
        title: payload.title.trim(),
        status: 0,
        rewardEnergy: payload.rewardEnergy,
        repeatType: payload.repeatType,
        goalId: payload.goalId,
        isDelayedCopy: false,
        targetDate: payload.targetDate,
        createdAt: now,
        deleted: false,
        completedAt: undefined,
        templateId: payload.repeatType > 0 ? nextId(db, "template") : null
      };
      db.tasks.push(task);
      return persistAndReturn(db, mapTask(db, task));
    });
  },
  updateTask(
    id: number,
    payload: { title: string; rewardEnergy: number; goalId: number | null; scope: "this" | "future" }
  ) {
    return delay<TaskSummary>(() => {
      const db = readDb();
      ensureInitialized(db);
      const task = getTargetTask(db, id);
      task.title = payload.title.trim();
      task.rewardEnergy = payload.rewardEnergy;
      task.goalId = payload.goalId;
      return persistAndReturn(db, mapTask(db, task));
    });
  },
  deleteTask(id: number) {
    return delay(() => {
      const db = readDb();
      ensureInitialized(db);
      const task = getTargetTask(db, id);
      task.deleted = true;
      return persistAndReturn(db, { id, deleted: true });
    });
  },
  checkTask(id: number) {
    return delay<TaskCheckResponse>(() => {
      const db = readDb();
      ensureInitialized(db);
      const task = getTargetTask(db, id);
      if (task.status === 1) {
        throw new ApiError(40003, "任务已完成");
      }
      task.status = 1;
      task.completedAt = new Date().toISOString();
      db.user!.energyBalance += task.rewardEnergy;

      const goalProgress = task.goalId ? getGoalProgress(db, task.goalId) : undefined;
      const response = persistAndReturn(db, {
        taskId: task.id,
        rewardEnergy: task.rewardEnergy,
        energyBalance: db.user!.energyBalance,
        currentStreak: db.user!.currentStreak,
        goalProgress: goalProgress
          ? {
              ...goalProgress,
              justCompleted: goalProgress.percentage === 100
            }
          : undefined
      });

      return response;
    });
  },
  uncheckTask(id: number) {
    return delay<TaskUncheckResponse>(() => {
      const db = readDb();
      ensureInitialized(db);
      const task = getTargetTask(db, id);
      if (task.status !== 1) {
        throw new ApiError(40003, "任务尚未完成");
      }
      task.status = 0;
      task.completedAt = undefined;
      const energyDeducted = Math.min(task.rewardEnergy, db.user!.energyBalance);
      db.user!.energyBalance -= energyDeducted;
      const goalProgress = task.goalId ? getGoalProgress(db, task.goalId) : undefined;
      const response = persistAndReturn(db, {
        taskId: task.id,
        energyDeducted,
        energyBalance: db.user!.energyBalance,
        currentStreak: db.user!.currentStreak,
        goalProgress
      });

      return response;
    });
  },
  postponeTask(id: number, targetDate: string) {
    return delay<PostponeResponse>(() => {
      const db = readDb();
      ensureInitialized(db);
      const source = getTargetTask(db, id);
      const task: TaskRecord = {
        ...clone(source),
        id: nextId(db, "task"),
        targetDate,
        status: 0,
        completedAt: undefined,
        isDelayedCopy: true,
        createdAt: new Date().toISOString(),
        deleted: false
      };
      db.tasks.push(task);
      return persistAndReturn(db, {
        originalTaskId: source.id,
        newTask: {
          id: task.id,
          title: task.title,
          targetDate,
          isDelayedCopy: true
        }
      });
    });
  },
  getOverdueTasks() {
    return delay<OverdueTasksResponse>(() => {
      const db = readDb();
      ensureInitialized(db);
      const yesterday = shiftDate(getTodayIso(), -1);
      const tasks = db.tasks
        .filter((task) => !task.deleted && task.targetDate === yesterday && task.status === 0)
        .map((task) => ({
          id: task.id,
          title: task.title,
          rewardEnergy: task.rewardEnergy
        }));
      return {
        date: yesterday,
        tasks
      };
    });
  },
  getGrowthStats() {
    return delay<GrowthStats>(() => {
      const db = readDb();
      ensureInitialized(db);
      recomputeStreaks(db);
      writeDb(db);
      return {
        currentStreak: db.user!.currentStreak,
        totalEnergyEarned: db.user!.totalEnergyEarned,
        totalTasksDone: db.user!.totalTasksDone
      };
    });
  },
  getWeeklyGrowth() {
    return delay<WeeklyGrowthPoint[]>(() => {
      const db = readDb();
      ensureInitialized(db);
      const today = getTodayIso();
      return Array.from({ length: 7 }, (_, index) => {
        const date = shiftDate(today, index - 6);
        const tasks = db.tasks.filter((task) => !task.deleted && task.targetDate === date);
        return {
          date,
          label: formatWeekLabel(date),
          completed: tasks.filter((task) => task.status === 1).length,
          missed: tasks.filter((task) => task.status === 2 || (date < today && task.status === 0)).length
        };
      });
    });
  },
  getBadges() {
    return delay<Badge[]>(() => {
      const db = readDb();
      ensureInitialized(db);
      syncGoalSnapshots(db);
      recomputeStreaks(db);
      updateBadgeUnlocks(db);
      writeDb(db);
      const metrics = {
        tasks: db.user!.totalTasksDone,
        streak: db.user!.currentStreak,
        energy: db.user!.totalEnergyEarned,
        petLevel: db.pet!.level,
        goals: db.goals.filter((goal) => !goal.deleted).length,
        completedGoals: db.goals.filter((goal) => !goal.deleted && goal.percentage === 100).length,
        interactions: db.user!.totalInteractions ?? 0
      };
      return badgeTemplates.map((template) => ({
        id: template.id,
        code: template.code,
        name: template.name,
        description: template.description,
        icon: template.icon,
        category: template.category,
        threshold: template.threshold,
        unlocked: Boolean(db.badgeUnlocks[template.code]),
        unlockedAt: db.badgeUnlocks[template.code] ?? null,
        progress: Math.min(metrics[template.metric], template.threshold)
      }));
    });
  },
  getWishes() {
    return delay<Wish[]>(() => {
      const db = readDb();
      ensureInitialized(db);
      return db.wishes.filter((wish) => wish.status === 0).map((wish) => clone(wish));
    });
  },
  createWish(payload: { title: string; rarity: 1 | 2 | 3 }) {
    return delay<Wish>(() => {
      const db = readDb();
      ensureInitialized(db);
      const weightMap = { 1: 50, 2: 20, 3: 5 } as const;
      const wish: WishRecord = {
        id: nextId(db, "wish"),
        icon: wishIcon,
        title: payload.title.trim(),
        rarity: payload.rarity,
        weight: weightMap[payload.rarity],
        status: 0,
        createdAt: new Date().toISOString()
      };
      db.wishes.push(wish);
      return persistAndReturn(db, clone(wish));
    });
  },
  updateWish(id: number, payload: { title: string; rarity: 1 | 2 | 3 }) {
    return delay<Wish>(() => {
      const db = readDb();
      ensureInitialized(db);
      const wish = db.wishes.find((entry) => entry.id === id && entry.status === 0);
      if (!wish) {
        throw new ApiError(40002, "心愿不存在");
      }
      const weightMap = { 1: 50, 2: 20, 3: 5 } as const;
      wish.icon = wishIcon;
      wish.title = payload.title.trim();
      wish.rarity = payload.rarity;
      wish.weight = weightMap[payload.rarity];
      return persistAndReturn(db, clone(wish));
    });
  },
  drawWish(payload: DrawWishRequest) {
    return delay<DrawResponse>(() => {
      const db = readDb();
      ensureInitialized(db);
      const clientRequestId = payload.clientRequestId.trim();
      if (!clientRequestId) {
        throw new ApiError(40001, "缺少 clientRequestId");
      }

      if (db.drawRequests[clientRequestId]) {
        return clone(db.drawRequests[clientRequestId]);
      }

      if (!db.pet!.pendingDraw) {
        throw new ApiError(40005, "无可用抽奖机会");
      }
      const pool = db.wishes.filter((wish) => wish.status === 0);
      if (pool.length === 0) {
        throw new ApiError(40006, "奖池为空，先许几个愿望吧");
      }

      const totalWeight = pool.reduce((sum, wish) => sum + wish.weight, 0);
      let pointer = Math.random() * totalWeight;
      let selected = pool[0];
      for (const wish of pool) {
        pointer -= wish.weight;
        if (pointer <= 0) {
          selected = wish;
          break;
        }
      }

      selected.status = 1;
      selected.drawnAt = new Date().toISOString();
      db.pet!.pendingDraw = false;

      const response = {
        drawnWish: {
          id: selected.id,
          icon: selected.icon,
          title: selected.title,
          rarity: selected.rarity,
          drawnAt: selected.drawnAt
        },
        pendingDraw: false,
        poolRemaining: db.wishes.filter((wish) => wish.status === 0).length
      };
      db.drawRequests[clientRequestId] = response;

      return persistAndReturn(db, response);
    }, 420);
  },
  getWishHistory() {
    return delay<WishHistoryItem[]>(() => {
      const db = readDb();
      ensureInitialized(db);
      return db.wishes
        .filter((wish) => wish.status === 1 && wish.drawnAt)
        .sort((left, right) => (right.drawnAt ?? "").localeCompare(left.drawnAt ?? ""))
        .map((wish) => ({
          id: wish.id,
          icon: wish.icon,
          title: wish.title,
          rarity: wish.rarity,
          drawnAt: wish.drawnAt!
        }));
    });
  }
};
