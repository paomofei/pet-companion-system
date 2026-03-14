import { Suspense, lazy, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  queryKeys,
  useBadges,
  useCurrentUser,
  useGoalMutations,
  useGoals,
  useGrowthStats,
  useGrowthWeekly,
  useInteractMutation,
  useItems,
  useOverdueTasks,
  useTaskMutations,
  useTasks,
  useWishHistory,
  useWishMutations,
  useWishes
} from "../api/hooks";
import { isApiError } from "../api/errors";
import { apiRuntime } from "../api/runtime";
import { useActionGuard } from "../hooks/useActionGuard";
import { runOfflineCapableAction } from "../offline/useOfflineSync";
import { PetPanel } from "../components/PetPanel";
import { ToastViewport } from "../components/ToastViewport";
import { formatFullDate, getTodayIso } from "../lib/date";
import { useNetworkStore } from "../store/networkStore";
import { useUiStore } from "../store/uiStore";
import { TodayTab } from "../types";
import styles from "./TodayPage.module.css";

const TasksTab = lazy(() => import("../components/TasksTab").then((module) => ({ default: module.TasksTab })));
const GoalsTab = lazy(() => import("../components/GoalsTab").then((module) => ({ default: module.GoalsTab })));
const GrowthTab = lazy(() => import("../components/GrowthTab").then((module) => ({ default: module.GrowthTab })));
const WishOverlay = lazy(() => import("../components/WishOverlay").then((module) => ({ default: module.WishOverlay })));

const tabs: Array<{ key: TodayTab; label: string }> = [
  { key: "tasks", label: "📅 今日任务" },
  { key: "goals", label: "🎯 大目标" },
  { key: "growth", label: "📈 成长轨迹" }
];

const getErrorMessage = (error: unknown, fallback: string) => (isApiError(error) ? error.message : fallback);

export const TodayPage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDate = useUiStore((state) => state.selectedDate);
  const setSelectedDate = useUiStore((state) => state.setSelectedDate);
  const bubble = useUiStore((state) => state.petBubble);
  const setPetBubble = useUiStore((state) => state.setPetBubble);
  const addToast = useUiStore((state) => state.addToast);
  const wishOverlayOpen = useUiStore((state) => state.isWishOverlayOpen);
  const openWishOverlay = useUiStore((state) => state.openWishOverlay);
  const closeWishOverlay = useUiStore((state) => state.closeWishOverlay);
  const drawModal = useUiStore((state) => state.drawModal);
  const setDrawModal = useUiStore((state) => state.setDrawModal);
  const closeDrawModal = useUiStore((state) => state.closeDrawModal);
  const activeTab = (searchParams.get("tab") ?? "tasks") as TodayTab;
  const shouldAutoOpenGoal = searchParams.get("openGoal") === "1";
  const isOnline = useNetworkStore((state) => state.isOnline);

  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [interactionTick, setInteractionTick] = useState(0);
  const guardAction = useActionGuard();
  const currentDateLabel = useMemo(() => formatFullDate(getTodayIso()), []);

  const userQuery = useCurrentUser();
  const profile = userQuery.data;
  const ready = Boolean(profile);
  const shouldLoadGoals = activeTab !== "growth";
  const shouldLoadTasks = activeTab === "tasks";
  const shouldLoadGrowth = activeTab === "growth";
  const shouldLoadWishes = wishOverlayOpen || Boolean(profile?.pendingDraw) || drawModal.phase !== "closed";
  const shouldLoadWishHistory = wishOverlayOpen;

  const itemsQuery = useItems();
  const goalsQuery = useGoals(shouldLoadGoals);
  const tasksQuery = useTasks(selectedDate, shouldLoadTasks);
  const overdueQuery = useOverdueTasks(shouldLoadTasks);
  const growthStatsQuery = useGrowthStats(shouldLoadGrowth);
  const growthWeeklyQuery = useGrowthWeekly(shouldLoadGrowth);
  const badgesQuery = useBadges(shouldLoadGrowth);
  const wishesQuery = useWishes(shouldLoadWishes);
  const wishHistoryQuery = useWishHistory(shouldLoadWishHistory);

  const interactMutation = useInteractMutation(selectedDate);
  const goalMutations = useGoalMutations(selectedDate);
  const taskMutations = useTaskMutations(selectedDate);
  const wishMutations = useWishMutations(selectedDate);

  const handleError = (error: unknown) => {
    if (isApiError(error)) {
      addToast(error.message, "danger");
    } else {
      addToast("操作失败，请稍后重试", "danger");
    }
  };

  const renderStateCard = (title: string, description: string, onRetry: () => void, actionLabel = "重试") => (
    <div className={styles.stateCard} role="status" aria-live="polite">
      <h2>{title}</h2>
      <p>{description}</p>
      <div className={styles.modalActions}>
        <button className={styles.primaryButton} type="button" onClick={onRetry}>
          {actionLabel}
        </button>
      </div>
    </div>
  );

  const wishLoadError =
    wishesQuery.isError || wishHistoryQuery.isError
      ? getErrorMessage(wishesQuery.error ?? wishHistoryQuery.error, "许愿池数据暂时加载失败，请稍后再试。")
      : null;

  const switchTab = (tab: TodayTab) => {
    setSearchParams({ tab });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: TodayTab) => {
    const currentIndex = tabs.findIndex((item) => item.key === tab);
    if (currentIndex === -1) {
      return;
    }

    const focusTab = (targetTab: TodayTab) => {
      switchTab(targetTab);
      window.requestAnimationFrame(() => {
        const element = document.getElementById(`today-tab-${targetTab}`);
        if (element instanceof HTMLButtonElement) {
          element.focus();
        }
      });
    };

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(tabs[(currentIndex + 1) % tabs.length].key);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length].key);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusTab(tabs[0].key);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusTab(tabs[tabs.length - 1].key);
    }
  };

  const handleGiftClick = async () => {
    if (!profile) {
      return;
    }
    await guardAction("gift-draw", async () => {
      if (!profile.pendingDraw) {
        addToast("多陪伴宠物升级就能抽奖哦", "info");
        return;
      }
      if (!isOnline) {
        addToast("抽奖需要联网后才能进行", "info");
        return;
      }
      if (wishesQuery.isLoading) {
        addToast("许愿池还在加载，请稍后再试", "info");
        return;
      }
      if (wishesQuery.isError) {
        addToast(getErrorMessage(wishesQuery.error, "许愿池加载失败，请稍后重试"), "danger");
        return;
      }
      if ((wishesQuery.data?.length ?? 0) === 0) {
        setDrawModal({ phase: "empty", result: null });
        return;
      }

      setDrawModal({ phase: "spinning", result: null });
      const clientRequestId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `draw-${crypto.randomUUID()}`
          : `draw-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      try {
        const response = await wishMutations.drawWish.mutateAsync({ clientRequestId });
        window.setTimeout(() => {
          setDrawModal({ phase: "result", result: response.data.drawnWish });
          setPetBubble(`哇！${response.data.drawnWish.title} 中啦！快和爸爸妈妈说吧！`);
        }, 800);
      } catch (error) {
        handleError(error);
        closeDrawModal();
      }
    });
  };

  const handleInteract = async (itemId: number) => {
    setBusyItemId(itemId);
    try {
      const response = await guardAction(`interact-${itemId}`, () =>
        runOfflineCapableAction("interactPet", { itemId }, () => interactMutation.mutateAsync(itemId))
      );
      if (!response) {
        return;
      }
      setPetBubble(
        response.data.leveledUp
          ? "升级啦！点击🎁看看有什么惊喜！"
          : `谢谢你，我获得了 ${response.data.interaction.xpGained} XP！`
      );
      setInteractionTick((value) => value + 1);
      addToast(`-${response.data.interaction.energyCost}⚡ / +${response.data.interaction.xpGained} XP`, "success");
    } catch (error) {
      handleError(error);
    } finally {
      window.setTimeout(() => setBusyItemId(null), 300);
    }
  };

  const prefetchGrowthPanel = () => {
    void Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.growthStats,
        queryFn: async () => (await apiRuntime.getGrowthStats()).data
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.growthWeekly,
        queryFn: async () => (await apiRuntime.getWeeklyGrowth()).data
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.badges,
        queryFn: async () => (await apiRuntime.getBadges()).data
      })
    ]);
  };

  const prefetchWishPool = () => {
    void Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.wishes,
        queryFn: async () => (await apiRuntime.getWishes()).data
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.wishHistory,
        queryFn: async () => (await apiRuntime.getWishHistory()).data
      })
    ]);
  };

  const handlePetTap = () => {
    const petMessages = [
      `${profile?.pet.name ?? "小猫"} 正在蹭蹭你，好像很开心。`,
      "它轻轻晃了晃尾巴，像是在给你打气。",
      "喵呜～它今天也想和你一起完成任务。",
      "它抬头看了看你，像是在说“继续加油呀”。"
    ];
    const nextBubble = petMessages[Math.floor(Math.random() * petMessages.length)];
    setPetBubble(nextBubble);
  };

  const tabContent = useMemo(() => {
    if (!ready) {
      return null;
    }
    switch (activeTab) {
      case "goals":
        if (goalsQuery.isError) {
          return renderStateCard(
            "目标页加载失败",
            getErrorMessage(goalsQuery.error, "目标数据暂时不可用，请稍后重试。"),
            () => {
              void goalsQuery.refetch();
            }
          );
        }
        return (
          <Suspense fallback={<div className={styles.contentPanel}>正在加载目标页...</div>}>
            <GoalsTab
              goals={goalsQuery.data ?? []}
              autoOpenCreate={shouldAutoOpenGoal}
              onAutoOpened={() => {
                setSearchParams({ tab: "goals" }, { replace: true });
              }}
              onCreateGoal={async (payload) => {
                try {
                  const response = await guardAction("create-goal", () =>
                    runOfflineCapableAction("createGoal", payload, () => goalMutations.createGoal.mutateAsync(payload))
                  );
                  if (!response) {
                    return;
                  }
                  setPetBubble(`好的，新的目标「${payload.title}」记住了！`);
                } catch (error) {
                  handleError(error);
                }
              }}
              onUpdateGoal={async (id, payload) => {
                try {
                  const response = await guardAction(`update-goal-${id}`, () =>
                    runOfflineCapableAction("updateGoal", { id, payload }, () =>
                      goalMutations.updateGoal.mutateAsync({ id, payload })
                    )
                  );
                  if (!response) {
                    return;
                  }
                  addToast("目标已更新", "success");
                } catch (error) {
                  handleError(error);
                }
              }}
              onDeleteGoal={async (id) => {
                try {
                  const response = await guardAction(`delete-goal-${id}`, () =>
                    runOfflineCapableAction("deleteGoal", { id }, () => goalMutations.deleteGoal.mutateAsync(id))
                  );
                  if (!response) {
                    return;
                  }
                  addToast(`目标已删除，${response.data.unboundTaskCount} 个任务已解绑`, "info");
                } catch (error) {
                  handleError(error);
                }
              }}
            />
          </Suspense>
        );
      case "growth":
        if (growthStatsQuery.isError || growthWeeklyQuery.isError || badgesQuery.isError) {
          return renderStateCard(
            "成长页加载失败",
            getErrorMessage(
              growthStatsQuery.error ?? growthWeeklyQuery.error ?? badgesQuery.error,
              "成长统计暂时不可用，请稍后重试。"
            ),
            () => {
              void Promise.all([growthStatsQuery.refetch(), growthWeeklyQuery.refetch(), badgesQuery.refetch()]);
            }
          );
        }
        return (
          <Suspense fallback={<div className={styles.contentPanel}>正在加载成长页...</div>}>
            <GrowthTab
              stats={growthStatsQuery.data}
              weekly={growthWeeklyQuery.data}
              badges={badgesQuery.data}
              onPrimaryAction={() => setSearchParams({ tab: "tasks" })}
            />
          </Suspense>
        );
      case "tasks":
      default:
        if (tasksQuery.isError || overdueQuery.isError || goalsQuery.isError) {
          return renderStateCard(
            "任务页加载失败",
            getErrorMessage(tasksQuery.error ?? overdueQuery.error ?? goalsQuery.error, "任务数据暂时不可用，请稍后重试。"),
            () => {
              void Promise.all([tasksQuery.refetch(), overdueQuery.refetch(), goalsQuery.refetch()]);
            }
          );
        }
        return (
          <Suspense fallback={<div className={styles.contentPanel}>正在加载任务页...</div>}>
            <TasksTab
              date={selectedDate}
              goals={goalsQuery.data ?? []}
              tasksData={tasksQuery.data}
              overdue={overdueQuery.data}
              onDateChange={setSelectedDate}
              onCreateTask={async (payload) => {
                try {
                  const response = await guardAction("create-task", () =>
                    runOfflineCapableAction("createTask", payload, () => taskMutations.createTask.mutateAsync(payload))
                  );
                  if (!response) {
                    return;
                  }
                  addToast("任务已创建", "success");
                } catch (error) {
                  handleError(error);
                }
              }}
              onUpdateTask={async (id, payload) => {
                try {
                  const response = await guardAction(`update-task-${id}`, () =>
                    runOfflineCapableAction("updateTask", { id, payload }, () =>
                      taskMutations.updateTask.mutateAsync({ id, payload })
                    )
                  );
                  if (!response) {
                    return;
                  }
                  addToast("任务已更新", "success");
                } catch (error) {
                  handleError(error);
                }
              }}
              onDeleteTask={async (id) => {
                try {
                  const response = await guardAction(`delete-task-${id}`, () =>
                    runOfflineCapableAction("deleteTask", { id }, () => taskMutations.deleteTask.mutateAsync(id))
                  );
                  if (!response) {
                    return;
                  }
                  addToast("任务已删除", "info");
                } catch (error) {
                  handleError(error);
                }
              }}
              onCheckTask={async (id) => {
                try {
                  const response = await guardAction(`check-task-${id}`, () =>
                    runOfflineCapableAction("checkTask", { id }, () => taskMutations.checkTask.mutateAsync(id))
                  );
                  if (!response) {
                    return;
                  }
                  setPetBubble(`干得漂亮！又赚到了 ${response.data.rewardEnergy} 点能量！`);
                  addToast(`+${response.data.rewardEnergy}⚡ 已飞入能量栏`, "success");
                } catch (error) {
                  handleError(error);
                }
              }}
              onUncheckTask={async (id) => {
                try {
                  const response = await guardAction(`uncheck-task-${id}`, () =>
                    runOfflineCapableAction("uncheckTask", { id }, () => taskMutations.uncheckTask.mutateAsync(id))
                  );
                  if (!response) {
                    return;
                  }
                  addToast(`撤销成功，扣回 ${response.data.energyDeducted}⚡`, "info");
                } catch (error) {
                  handleError(error);
                }
              }}
              onPostponeTask={async (id, targetDate) => {
                try {
                  const response = await guardAction(`postpone-task-${id}`, () =>
                    runOfflineCapableAction("postponeTask", { id, targetDate }, () =>
                      taskMutations.postponeTask.mutateAsync({ id, targetDate })
                    )
                  );
                  if (!response) {
                    return;
                  }
                  addToast("任务已顺延", "success");
                } catch (error) {
                  handleError(error);
                }
              }}
            />
          </Suspense>
        );
    }
  }, [
    activeTab,
    addToast,
    badgesQuery.data,
    badgesQuery.error,
    badgesQuery.isError,
    badgesQuery.refetch,
    guardAction,
    goalMutations.createGoal,
    goalMutations.deleteGoal,
    goalMutations.updateGoal,
    goalsQuery.data,
    goalsQuery.error,
    goalsQuery.isError,
    goalsQuery.refetch,
    growthStatsQuery.data,
    growthStatsQuery.error,
    growthStatsQuery.isError,
    growthStatsQuery.refetch,
    growthWeeklyQuery.data,
    growthWeeklyQuery.error,
    growthWeeklyQuery.isError,
    growthWeeklyQuery.refetch,
    handleError,
    isOnline,
    overdueQuery.data,
    overdueQuery.error,
    overdueQuery.isError,
    overdueQuery.refetch,
    selectedDate,
    setPetBubble,
    setSelectedDate,
    taskMutations.checkTask,
    taskMutations.createTask,
    taskMutations.deleteTask,
    taskMutations.postponeTask,
    taskMutations.uncheckTask,
    taskMutations.updateTask,
    tasksQuery.data,
    tasksQuery.error,
    tasksQuery.isError,
    tasksQuery.refetch
  ]);

  if (!apiRuntime.isInitialized()) {
    return <Navigate to="/onboarding" replace />;
  }

  if (userQuery.isError || itemsQuery.isError) {
    return (
      <div className={styles.loading}>
        {renderStateCard(
          "主界面加载失败",
          getErrorMessage(userQuery.error ?? itemsQuery.error, "用户或宠物数据暂时不可用，请稍后重试。"),
          () => {
            void Promise.all([userQuery.refetch(), itemsQuery.refetch()]);
          },
          "重新加载"
        )}
      </div>
    );
  }

  if (userQuery.isLoading || !profile) {
    return <div className={styles.loading}>正在加载页面数据...</div>;
  }

  return (
    <>
      <main className={styles.page}>
        <PetPanel
          profile={profile}
          items={itemsQuery.data ?? []}
          bubble={bubble}
          currentDateLabel={currentDateLabel}
          interactionTick={interactionTick}
          isBusy={interactMutation.isPending}
          busyItemId={busyItemId}
          onInteract={handleInteract}
          onGiftClick={handleGiftClick}
          onPetTap={handlePetTap}
        />

        <div className={styles.main}>
          <div className={styles.topBar}>
            <nav className={styles.tabRow} role="tablist" aria-label="主内容页签">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  id={`today-tab-${tab.key}`}
                  type="button"
                  className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  aria-controls={`today-panel-${tab.key}`}
                  tabIndex={activeTab === tab.key ? 0 : -1}
                  onClick={() => switchTab(tab.key)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.key)}
                  onMouseEnter={tab.key === "growth" ? prefetchGrowthPanel : undefined}
                  onFocus={tab.key === "growth" ? prefetchGrowthPanel : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <div className={styles.wishBanner}>
              <div>
                <strong>🎁 许愿池：管理你的心愿单</strong>
                <div>抽奖入口只在宠物面板礼物盒，横幅只做心愿管理。</div>
              </div>
              <button
                className={styles.bannerLink}
                type="button"
                onClick={openWishOverlay}
                onMouseEnter={prefetchWishPool}
                onFocus={prefetchWishPool}
              >
                去看看 &gt;
              </button>
            </div>
          </div>
          <div
            id={`today-panel-${activeTab}`}
            className={styles.tabPanelShell}
            role="tabpanel"
            aria-labelledby={`today-tab-${activeTab}`}
          >
            {tabContent}
          </div>
        </div>
      </main>

      <Suspense fallback={null}>
        <WishOverlay
          open={wishOverlayOpen}
          wishes={wishesQuery.data ?? []}
          history={wishHistoryQuery.data ?? []}
          loadError={wishLoadError}
          drawPhase={drawModal.phase}
          drawResult={drawModal.result}
          onClose={closeWishOverlay}
          onOpenCreate={openWishOverlay}
          onCloseDraw={closeDrawModal}
          onRetryLoad={() => {
            void Promise.all([wishesQuery.refetch(), wishHistoryQuery.refetch()]);
          }}
          onCreateWish={async (payload) => {
            try {
              const response = await guardAction("create-wish", () =>
                runOfflineCapableAction("createWish", payload, () => wishMutations.createWish.mutateAsync(payload))
              );
              if (!response) {
                return;
              }
              addToast("心愿已放进许愿池", "success");
            } catch (error) {
              handleError(error);
            }
          }}
          onUpdateWish={async (id, payload) => {
            try {
              const response = await guardAction(`update-wish-${id}`, () =>
                runOfflineCapableAction("updateWish", { id, payload }, () =>
                  wishMutations.updateWish.mutateAsync({ id, payload })
                )
              );
              if (!response) {
                return;
              }
              addToast("心愿已更新", "success");
            } catch (error) {
              handleError(error);
            }
          }}
        />
      </Suspense>

      <ToastViewport />
    </>
  );
};
