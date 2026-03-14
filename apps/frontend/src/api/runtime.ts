import axios, { AxiosHeaders } from "axios";
import {
  ApiEnvelope,
  Badge,
  DrawResponse,
  DrawWishRequest,
  GoalSummary,
  GrowthStats,
  InitRequest,
  InitResponse,
  InteractionResponse,
  Item,
  OverdueTasksResponse,
  TaskCheckResponse,
  TaskSummary,
  TasksByDate,
  TaskUncheckResponse,
  UserProfile,
  WeeklyGrowthPoint,
  Wish,
  WishHistoryItem
} from "../types";
import { ApiError, isApiError } from "./errors";
import { mockApi } from "./mockServer";

export type ApiMode = "mock" | "http";

export interface ApiRuntime {
  mode: ApiMode;
  supportsOfflineQueue: boolean;
  isInitialized(): boolean;
  initUser(payload: InitRequest): Promise<ApiEnvelope<InitResponse>>;
  getCurrentUser(): Promise<ApiEnvelope<UserProfile>>;
  getPetStatus(): Promise<ApiEnvelope<UserProfile["pet"] & { pendingDraw: boolean }>>;
  getItems(): Promise<ApiEnvelope<Item[]>>;
  interactPet(itemId: number): Promise<ApiEnvelope<InteractionResponse>>;
  getGoals(): Promise<ApiEnvelope<GoalSummary[]>>;
  createGoal(payload: { title: string }): Promise<ApiEnvelope<GoalSummary>>;
  updateGoal(id: number, payload: { title: string }): Promise<ApiEnvelope<GoalSummary>>;
  deleteGoal(id: number): Promise<ApiEnvelope<{ id: number; deleted: boolean; unboundTaskCount: number }>>;
  getTasks(date: string): Promise<ApiEnvelope<TasksByDate>>;
  createTask(payload: {
    title: string;
    rewardEnergy: number;
    goalId: number | null;
    repeatType: 0 | 1 | 2 | 3;
    targetDate: string;
  }): Promise<ApiEnvelope<TaskSummary>>;
  updateTask(
    id: number,
    payload: { title: string; rewardEnergy: number; goalId: number | null; scope: "this" | "future" }
  ): Promise<ApiEnvelope<TaskSummary>>;
  deleteTask(id: number): Promise<ApiEnvelope<{ id: number; deleted: boolean }>>;
  checkTask(id: number): Promise<ApiEnvelope<TaskCheckResponse>>;
  uncheckTask(id: number): Promise<ApiEnvelope<TaskUncheckResponse>>;
  postponeTask(id: number, targetDate: string): Promise<ApiEnvelope<{ originalTaskId: number; newTask: { id: number; title: string; targetDate: string; isDelayedCopy: boolean } }>>;
  getOverdueTasks(): Promise<ApiEnvelope<OverdueTasksResponse>>;
  getGrowthStats(): Promise<ApiEnvelope<GrowthStats>>;
  getWeeklyGrowth(): Promise<ApiEnvelope<WeeklyGrowthPoint[]>>;
  getBadges(): Promise<ApiEnvelope<Badge[]>>;
  getWishes(): Promise<ApiEnvelope<Wish[]>>;
  createWish(payload: { title: string; rarity: 1 | 2 | 3 }): Promise<ApiEnvelope<Wish>>;
  updateWish(id: number, payload: { title: string; rarity: 1 | 2 | 3 }): Promise<ApiEnvelope<Wish>>;
  drawWish(payload: DrawWishRequest): Promise<ApiEnvelope<DrawResponse>>;
  getWishHistory(): Promise<ApiEnvelope<WishHistoryItem[]>>;
}

const API_MODE: ApiMode = import.meta.env.VITE_API_MODE === "http" ? "http" : "mock";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";
const HTTP_INIT_CACHE_KEY = "pet-sys-http-init-v1";
const DEVICE_ID_CACHE_KEY = "pet-sys-device-id-v1";

const canUseStorage = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const readHttpInitCache = () => (canUseStorage() ? window.localStorage.getItem(HTTP_INIT_CACHE_KEY) === "1" : false);

const writeHttpInitCache = (initialized: boolean) => {
  if (!canUseStorage()) {
    return;
  }
  if (initialized) {
    window.localStorage.setItem(HTTP_INIT_CACHE_KEY, "1");
    return;
  }
  window.localStorage.removeItem(HTTP_INIT_CACHE_KEY);
};

const createDeviceId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getDeviceId = () => {
  if (!canUseStorage()) {
    return "pet-sys-web";
  }

  const cached = window.localStorage.getItem(DEVICE_ID_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const nextId = createDeviceId();
  window.localStorage.setItem(DEVICE_ID_CACHE_KEY, nextId);
  return nextId;
};

const http = axios.create({
  baseURL: API_BASE_URL
});

http.interceptors.request.use((config) => {
  const deviceId = getDeviceId();
  const headers = AxiosHeaders.from(config.headers ?? {});
  headers.set("X-Device-Id", deviceId);
  config.headers = headers;

  return config;
});

const normalizeApiError = (error: unknown) => {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const response = error.response?.data as Partial<ApiEnvelope<null>> | undefined;
    return new ApiError(
      typeof response?.code === "number" ? response.code : 50000,
      typeof response?.message === "string" ? response.message : error.message || "请求失败"
    );
  }

  return new ApiError(50000, error instanceof Error ? error.message : "请求失败");
};

const request = async <T,>(promise: Promise<{ data: ApiEnvelope<T> }>) => {
  try {
    const response = await promise;
    if (response.data.code !== 0) {
      throw new ApiError(response.data.code, response.data.message ?? "请求失败");
    }
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
};

const httpApi: ApiRuntime = {
  mode: "http",
  supportsOfflineQueue: false,
  isInitialized() {
    return readHttpInitCache();
  },
  async initUser(payload) {
    const response = await request(http.post<ApiEnvelope<InitResponse>>("/users/init", payload));
    writeHttpInitCache(true);
    return response;
  },
  async getCurrentUser() {
    try {
      const response = await request(http.get<ApiEnvelope<UserProfile>>("/users/me"));
      writeHttpInitCache(true);
      return response;
    } catch (error) {
      if (isApiError(error) && [40002, 401, 403].includes(error.code)) {
        writeHttpInitCache(false);
      }
      throw error;
    }
  },
  getPetStatus() {
    return request(http.get<ApiEnvelope<UserProfile["pet"] & { pendingDraw: boolean }>>("/pets/status"));
  },
  getItems() {
    return request(http.get<ApiEnvelope<Item[]>>("/items"));
  },
  interactPet(itemId) {
    return request(http.post<ApiEnvelope<InteractionResponse>>("/pets/interact", { itemId }));
  },
  getGoals() {
    return request(http.get<ApiEnvelope<GoalSummary[]>>("/goals"));
  },
  createGoal(payload) {
    return request(http.post<ApiEnvelope<GoalSummary>>("/goals", payload));
  },
  updateGoal(id, payload) {
    return request(http.put<ApiEnvelope<GoalSummary>>(`/goals/${id}`, payload));
  },
  deleteGoal(id) {
    return request(http.delete<ApiEnvelope<{ id: number; deleted: boolean; unboundTaskCount: number }>>(`/goals/${id}`));
  },
  getTasks(date) {
    return request(http.get<ApiEnvelope<TasksByDate>>("/tasks", { params: { date } }));
  },
  createTask(payload) {
    return request(http.post<ApiEnvelope<TaskSummary>>("/tasks", payload));
  },
  updateTask(id, payload) {
    return request(http.put<ApiEnvelope<TaskSummary>>(`/tasks/${id}`, payload));
  },
  deleteTask(id) {
    return request(http.delete<ApiEnvelope<{ id: number; deleted: boolean }>>(`/tasks/${id}`));
  },
  checkTask(id) {
    return request(http.post<ApiEnvelope<TaskCheckResponse>>(`/tasks/${id}/check`));
  },
  uncheckTask(id) {
    return request(http.post<ApiEnvelope<TaskUncheckResponse>>(`/tasks/${id}/uncheck`));
  },
  postponeTask(id, targetDate) {
    return request(
      http.post<ApiEnvelope<{ originalTaskId: number; newTask: { id: number; title: string; targetDate: string; isDelayedCopy: boolean } }>>(
        `/tasks/${id}/postpone`,
        { targetDate }
      )
    );
  },
  getOverdueTasks() {
    return request(http.get<ApiEnvelope<OverdueTasksResponse>>("/tasks/overdue"));
  },
  getGrowthStats() {
    return request(http.get<ApiEnvelope<GrowthStats>>("/growth/stats"));
  },
  getWeeklyGrowth() {
    return request(http.get<ApiEnvelope<WeeklyGrowthPoint[]>>("/growth/weekly"));
  },
  getBadges() {
    return request(http.get<ApiEnvelope<Badge[]>>("/badges"));
  },
  getWishes() {
    return request(http.get<ApiEnvelope<Wish[]>>("/wishes"));
  },
  createWish(payload) {
    return request(http.post<ApiEnvelope<Wish>>("/wishes", payload));
  },
  updateWish(id, payload) {
    return request(http.put<ApiEnvelope<Wish>>(`/wishes/${id}`, payload));
  },
  drawWish(payload) {
    return request(http.post<ApiEnvelope<DrawResponse>>("/wishes/draw", payload));
  },
  getWishHistory() {
    return request(http.get<ApiEnvelope<WishHistoryItem[]>>("/wishes/history"));
  }
};

const mockRuntime: ApiRuntime = {
  mode: "mock",
  supportsOfflineQueue: true,
  isInitialized: () => mockApi.isInitialized(),
  initUser: (payload) => mockApi.initUser(payload),
  getCurrentUser: () => mockApi.getCurrentUser(),
  getPetStatus: () => mockApi.getPetStatus(),
  getItems: () => mockApi.getItems(),
  interactPet: (itemId) => mockApi.interactPet(itemId),
  getGoals: () => mockApi.getGoals(),
  createGoal: (payload) => mockApi.createGoal(payload),
  updateGoal: (id, payload) => mockApi.updateGoal(id, payload),
  deleteGoal: (id) => mockApi.deleteGoal(id),
  getTasks: (date) => mockApi.getTasks(date),
  createTask: (payload) => mockApi.createTask(payload),
  updateTask: (id, payload) => mockApi.updateTask(id, payload),
  deleteTask: (id) => mockApi.deleteTask(id),
  checkTask: (id) => mockApi.checkTask(id),
  uncheckTask: (id) => mockApi.uncheckTask(id),
  postponeTask: (id, targetDate) => mockApi.postponeTask(id, targetDate),
  getOverdueTasks: () => mockApi.getOverdueTasks(),
  getGrowthStats: () => mockApi.getGrowthStats(),
  getWeeklyGrowth: () => mockApi.getWeeklyGrowth(),
  getBadges: () => mockApi.getBadges(),
  getWishes: () => mockApi.getWishes(),
  createWish: (payload) => mockApi.createWish(payload),
  updateWish: (id, payload) => mockApi.updateWish(id, payload),
  drawWish: (payload) => mockApi.drawWish(payload),
  getWishHistory: () => mockApi.getWishHistory()
};

export const apiRuntime = API_MODE === "http" ? httpApi : mockRuntime;
export const apiMode = apiRuntime.mode;
