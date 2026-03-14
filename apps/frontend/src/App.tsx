import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { apiRuntime } from "./api/runtime";
import { NetworkBanner } from "./components/NetworkBanner";
import { useOfflineSync } from "./offline/useOfflineSync";

const OnboardingPage = lazy(() => import("./pages/OnboardingPage").then((module) => ({ default: module.OnboardingPage })));
const TodayPage = lazy(() => import("./pages/TodayPage").then((module) => ({ default: module.TodayPage })));

const Landing = () => (
  <Navigate to={apiRuntime.isInitialized() ? "/today?tab=tasks" : "/onboarding"} replace />
);

export const App = () => <AppShell />;

const AppShell = () => {
  useOfflineSync();

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateRows: "auto minmax(0, 1fr)" }}>
      <NetworkBanner />
      <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>正在加载页面...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/today" element={<TodayPage />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </Suspense>
    </div>
  );
};
