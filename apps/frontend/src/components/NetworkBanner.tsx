import { useState } from "react";
import { apiRuntime } from "../api/runtime";
import { flushOfflineJournal } from "../offline/useOfflineSync";
import { useNetworkStore } from "../store/networkStore";
import styles from "./NetworkBanner.module.css";

export const NetworkBanner = () => {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const isSyncing = useNetworkStore((state) => state.isSyncing);
  const pendingSyncCount = useNetworkStore((state) => state.pendingSyncCount);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  const retrySync = async () => {
    setRetryError("");
    setRetrying(true);
    try {
      await flushOfflineJournal();
    } catch {
      setRetryError("同步失败，请稍后再试。");
    } finally {
      setRetrying(false);
    }
  };

  if (!isOnline) {
    return (
      <div className={`${styles.banner} ${styles.offline}`} role="status" aria-live="polite">
        <span>
          {apiRuntime.supportsOfflineQueue
            ? `当前处于离线模式，操作仍会本地生效，待同步队列：${pendingSyncCount}`
            : "当前处于离线模式，后端联调版需要联网后才能继续请求数据"}
        </span>
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className={`${styles.banner} ${styles.syncing}`} role="status" aria-live="polite">
        网络已恢复，正在同步离线操作...
      </div>
    );
  }

  if (apiRuntime.supportsOfflineQueue && pendingSyncCount > 0) {
    return (
      <div className={`${styles.banner} ${styles.pending}`} role="status" aria-live="polite">
        <span>仍有 {pendingSyncCount} 个离线操作待确认同步</span>
        <div className={styles.actions}>
          {retryError ? <span className={styles.errorText}>{retryError}</span> : null}
          <button type="button" className={styles.actionButton} onClick={() => void retrySync()} disabled={retrying}>
            {retrying ? "同步中..." : "立即同步"}
          </button>
        </div>
      </div>
    );
  }

  return null;
};
