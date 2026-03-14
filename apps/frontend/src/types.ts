export type TodayTab = "tasks" | "goals" | "growth";
export type ToastTone = "info" | "success" | "danger";

export interface ApiEnvelope<T> {
  code: number;
  message?: string;
  data: T;
}

export interface UserProfile {
  userId: number;
  nickname: string;
  energyBalance: number;
  pendingDraw: boolean;
  currentStreak: number;
  maxStreak: number;
  totalEnergyEarned: number;
  totalTasksDone: number;
  pet: PetCore;
}

export interface PetCore {
  id: number;
  name: string;
  level: number;
  currentXp: number;
  maxXp: number;
  appearance: string;
}

export interface InitRequest {
  nickname: string;
  petName: string;
  onboardingOption: 0 | 1;
}

export interface InitResponse {
  userId: number;
  nickname: string;
  pet: PetCore;
  energyBalance: number;
  pendingDraw: boolean;
  defaultGoals?: GoalSummary[];
  defaultTasks?: TaskSummary[];
}

export interface Item {
  id: number;
  name: string;
  icon: string;
  costEnergy: number;
  gainXp: number;
  sortOrder: number;
}

export interface InteractionResponse {
  energyBalance: number;
  pet: Pick<PetCore, "level" | "currentXp" | "maxXp">;
  interaction: {
    energyCost: number;
    xpGained: number;
  };
  leveledUp: boolean;
  pendingDraw: boolean;
}

export interface GoalSummary {
  id: number;
  icon: string;
  title: string;
  completed: number;
  total: number;
  percentage: number;
}

export interface TaskSummary {
  id: number;
  title: string;
  status: 0 | 1 | 2;
  rewardEnergy: number;
  repeatType: 0 | 1 | 2 | 3;
  goalId: number | null;
  goalIcon?: string;
  goalTitle?: string;
  isDelayedCopy: boolean;
  completedAt?: string;
  targetDate?: string;
  templateId?: number | null;
}

export interface TasksByDate {
  date: string;
  pending: TaskSummary[];
  completed: TaskSummary[];
}

export interface GoalProgress {
  goalId: number;
  completed: number;
  total: number;
  percentage: number;
  justCompleted?: boolean;
}

export interface TaskCheckResponse {
  taskId: number;
  rewardEnergy: number;
  energyBalance: number;
  currentStreak: number;
  goalProgress?: GoalProgress;
}

export interface TaskUncheckResponse {
  taskId: number;
  energyDeducted: number;
  energyBalance: number;
  currentStreak: number;
  goalProgress?: GoalProgress;
}

export interface PostponeResponse {
  originalTaskId: number;
  newTask: {
    id: number;
    title: string;
    targetDate: string;
    isDelayedCopy: boolean;
  };
}

export interface OverdueTasksResponse {
  date: string;
  tasks: Array<Pick<TaskSummary, "id" | "title" | "rewardEnergy">>;
}

export interface GrowthStats {
  currentStreak: number;
  totalEnergyEarned: number;
  totalTasksDone: number;
}

export interface WeeklyGrowthPoint {
  date: string;
  label: string;
  completed: number;
  missed: number;
}

export interface Badge {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
}

export interface Wish {
  id: number;
  icon: string;
  title: string;
  weight: number;
  rarity: 1 | 2 | 3;
  status: 0 | 1;
}

export interface WishHistoryItem {
  id: number;
  icon: string;
  title: string;
  rarity: 1 | 2 | 3;
  drawnAt: string;
}

export interface DrawResponse {
  drawnWish: WishHistoryItem;
  pendingDraw: boolean;
  poolRemaining: number;
}

export interface DrawWishRequest {
  clientRequestId: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  tone: ToastTone;
}
