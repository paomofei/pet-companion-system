import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRuntime, type ApiRuntime } from "./runtime";

export const queryKeys = {
  user: ["user"] as const,
  pet: ["pet"] as const,
  items: ["items"] as const,
  goals: ["goals"] as const,
  tasks: (date: string) => ["tasks", date] as const,
  overdue: ["tasks", "overdue"] as const,
  growthStats: ["growth", "stats"] as const,
  growthWeekly: ["growth", "weekly"] as const,
  badges: ["badges"] as const,
  wishes: ["wishes"] as const,
  wishHistory: ["wishes", "history"] as const
};

const isQueryEnabled = (enabled = true) => apiRuntime.isInitialized() && enabled;

const invalidateDashboard = async (queryClient: ReturnType<typeof useQueryClient>, date?: string) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.user }),
    queryClient.invalidateQueries({ queryKey: queryKeys.pet }),
    queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
    queryClient.invalidateQueries({ queryKey: queryKeys.growthStats }),
    queryClient.invalidateQueries({ queryKey: queryKeys.growthWeekly }),
    queryClient.invalidateQueries({ queryKey: queryKeys.badges }),
    queryClient.invalidateQueries({ queryKey: queryKeys.wishes }),
    queryClient.invalidateQueries({ queryKey: queryKeys.wishHistory }),
    queryClient.invalidateQueries({ queryKey: queryKeys.overdue }),
    date ? queryClient.invalidateQueries({ queryKey: queryKeys.tasks(date) }) : Promise.resolve()
  ]);
};

export const useCurrentUser = () =>
  useQuery({
    queryKey: queryKeys.user,
    queryFn: async () => (await apiRuntime.getCurrentUser()).data,
    enabled: isQueryEnabled()
  });

export const useItems = () =>
  useQuery({
    queryKey: queryKeys.items,
    queryFn: async () => (await apiRuntime.getItems()).data,
    enabled: isQueryEnabled()
  });

export const useGoals = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.goals,
    queryFn: async () => (await apiRuntime.getGoals()).data,
    enabled: isQueryEnabled(enabled)
  });

export const useTasks = (date: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.tasks(date),
    queryFn: async () => (await apiRuntime.getTasks(date)).data,
    enabled: isQueryEnabled(enabled)
  });

export const useOverdueTasks = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.overdue,
    queryFn: async () => (await apiRuntime.getOverdueTasks()).data,
    enabled: isQueryEnabled(enabled)
  });

export const useGrowthStats = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.growthStats,
    queryFn: async () => (await apiRuntime.getGrowthStats()).data,
    enabled: isQueryEnabled(enabled)
  });

export const useGrowthWeekly = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.growthWeekly,
    queryFn: async () => (await apiRuntime.getWeeklyGrowth()).data,
    enabled: isQueryEnabled(enabled)
  });

export const useBadges = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.badges,
    queryFn: async () => (await apiRuntime.getBadges()).data,
    enabled: isQueryEnabled(enabled)
  });

export const useWishes = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.wishes,
    queryFn: async () => (await apiRuntime.getWishes()).data,
    enabled: isQueryEnabled(enabled)
  });

export const useWishHistory = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.wishHistory,
    queryFn: async () => (await apiRuntime.getWishHistory()).data,
    enabled: isQueryEnabled(enabled)
  });

export const useInitUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiRuntime.initUser,
    onSuccess: async () => {
      await invalidateDashboard(queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.items });
    }
  });
};

export const useInteractMutation = (date: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiRuntime.interactPet,
    onSuccess: async () => invalidateDashboard(queryClient, date)
  });
};

export const useGoalMutations = (date: string) => {
  const queryClient = useQueryClient();
  return {
    createGoal: useMutation({
      mutationFn: apiRuntime.createGoal,
      onSuccess: async () => invalidateDashboard(queryClient, date)
    }),
    updateGoal: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: Parameters<ApiRuntime["updateGoal"]>[1] }) =>
        apiRuntime.updateGoal(id, payload),
      onSuccess: async () => invalidateDashboard(queryClient, date)
    }),
    deleteGoal: useMutation({
      mutationFn: apiRuntime.deleteGoal,
      onSuccess: async () => invalidateDashboard(queryClient, date)
    })
  };
};

export const useTaskMutations = (date: string) => {
  const queryClient = useQueryClient();
  return {
    createTask: useMutation({
      mutationFn: apiRuntime.createTask,
      onSuccess: async () => invalidateDashboard(queryClient, date)
    }),
    updateTask: useMutation({
      mutationFn: ({
        id,
        payload
      }: {
        id: number;
        payload: Parameters<ApiRuntime["updateTask"]>[1];
      }) => apiRuntime.updateTask(id, payload),
      onSuccess: async () => invalidateDashboard(queryClient, date)
    }),
    deleteTask: useMutation({
      mutationFn: apiRuntime.deleteTask,
      onSuccess: async () => invalidateDashboard(queryClient, date)
    }),
    checkTask: useMutation({
      mutationFn: apiRuntime.checkTask,
      onSuccess: async () => invalidateDashboard(queryClient, date)
    }),
    uncheckTask: useMutation({
      mutationFn: apiRuntime.uncheckTask,
      onSuccess: async () => invalidateDashboard(queryClient, date)
    }),
    postponeTask: useMutation({
      mutationFn: ({ id, targetDate }: { id: number; targetDate: string }) => apiRuntime.postponeTask(id, targetDate),
      onSuccess: async () => invalidateDashboard(queryClient, date)
    })
  };
};

export const useWishMutations = (date: string) => {
  const queryClient = useQueryClient();
  return {
    createWish: useMutation({
      mutationFn: apiRuntime.createWish,
      onSuccess: async () => invalidateDashboard(queryClient, date)
    }),
    updateWish: useMutation({
      mutationFn: ({ id, payload }: { id: number; payload: Parameters<ApiRuntime["updateWish"]>[1] }) =>
        apiRuntime.updateWish(id, payload),
      onSuccess: async () => invalidateDashboard(queryClient, date)
    }),
    drawWish: useMutation({
      mutationFn: apiRuntime.drawWish,
      onSuccess: async () => invalidateDashboard(queryClient, date)
    })
  };
};
