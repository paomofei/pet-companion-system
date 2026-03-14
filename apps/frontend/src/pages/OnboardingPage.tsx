import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isApiError } from "../api/errors";
import { useInitUserMutation } from "../api/hooks";
import { useUiStore } from "../store/uiStore";
import { apiRuntime } from "../api/runtime";
import { useActionGuard } from "../hooks/useActionGuard";
import { hasUnsupportedCharacters, sanitizeTextInput } from "../lib/sanitize";
import { runOfflineCapableAction } from "../offline/useOfflineSync";
import styles from "./OnboardingPage.module.css";

const validateName = (value: string, label: string) => {
  if (hasUnsupportedCharacters(value)) {
    return "不支持输入 < 或 >";
  }
  if (!sanitizeTextInput(value)) {
    return `请输入${label}`;
  }
  return "";
};

export const OnboardingPage = () => {
  const navigate = useNavigate();
  const initMutation = useInitUserMutation();
  const addToast = useUiStore((state) => state.addToast);
  const setPetBubble = useUiStore((state) => state.setPetBubble);
  const guardAction = useActionGuard();
  const [nickname, setNickname] = useState("");
  const [petName, setPetName] = useState("");
  const [option, setOption] = useState<0 | 1>(0);
  const [submittingIntent, setSubmittingIntent] = useState(false);
  const [touched, setTouched] = useState({ nickname: false, petName: false });

  const previewBubble = useMemo(() => {
    if (petName.trim()) {
      return `以后我就叫 ${petName.trim()} 啦！`;
    }
    return "你好呀！我是你的新伙伴，快给我起个名字吧！";
  }, [petName]);

  const nicknameError = touched.nickname ? validateName(nickname, "孩子昵称") : "";
  const petNameError = touched.petName ? validateName(petName, "宠物昵称") : "";

  if (apiRuntime.isInitialized() && !submittingIntent) {
    return <Navigate to="/today?tab=tasks" replace />;
  }

  const submit = async () => {
    const cleanNickname = sanitizeTextInput(nickname);
    const cleanPetName = sanitizeTextInput(petName);
    const nextNicknameError = validateName(nickname, "孩子昵称");
    const nextPetNameError = validateName(petName, "宠物昵称");
    setTouched({ nickname: true, petName: true });

    if (nextNicknameError || nextPetNameError) {
      return;
    }

    setSubmittingIntent(true);

    try {
      const response = await guardAction("init-user", () =>
        runOfflineCapableAction(
          "initUser",
          {
            nickname: cleanNickname,
            petName: cleanPetName,
            onboardingOption: option
          },
          () =>
            initMutation.mutateAsync({
              nickname: cleanNickname,
              petName: cleanPetName,
              onboardingOption: option
            })
        )
      );
      if (!response) {
        return;
      }
      setPetBubble(
        option === 0
          ? `${cleanNickname}，这是我们今天的新任务，快去完成赚取能量吧！`
          : `${cleanNickname}，你想定一个什么样的大目标呢？`
      );
      if (apiRuntime.supportsOfflineQueue && !navigator.onLine) {
        addToast("当前离线，初始化结果已本地保存，联网后会自动清空待同步队列", "info");
      }
      navigate(option === 0 ? "/today?tab=tasks" : "/today?tab=goals&openGoal=1", { replace: true });
    } catch (error) {
      setSubmittingIntent(false);
      if (isApiError(error)) {
        addToast(error.message, "danger");
      }
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.bubble}>{previewBubble}</div>
          <div className={styles.pet}>🐱</div>
          <strong>{petName.trim() || "默认白猫"}</strong>
        </div>
      </section>

      <section className={styles.formCard}>
        <div>
          <h1>欢迎来到学习伙伴计划</h1>
          <p className={styles.subtitle}>领养你的专属学习小助手，一起成长。</p>
        </div>

        <div className={styles.form}>
          <label>
            孩子昵称
            <input
              className={nicknameError ? styles.inputError : ""}
              value={nickname}
              maxLength={10}
              onChange={(event) => {
                setTouched((state) => ({ ...state, nickname: true }));
                setNickname(event.target.value);
              }}
              placeholder="例如：小明"
              autoComplete="off"
            />
            {nicknameError ? <span className={styles.inlineError}>{nicknameError}</span> : null}
          </label>
          <label>
            宠物昵称
            <input
              className={petNameError ? styles.inputError : ""}
              value={petName}
              maxLength={10}
              onChange={(event) => {
                setTouched((state) => ({ ...state, petName: true }));
                setPetName(event.target.value);
              }}
              placeholder="给小猫起个响亮的名字吧"
              autoComplete="off"
            />
            {petNameError ? <span className={styles.inlineError}>{petNameError}</span> : null}
          </label>

          <div className={styles.choiceGrid}>
            <button
              type="button"
              className={`${styles.choiceCard} ${option === 0 ? styles.choiceCardActive : ""}`}
              onClick={() => setOption(0)}
            >
              <strong>一键开启日常习惯</strong>
              <small>系统会自动生成 3 个默认任务，直接进入任务页。</small>
            </button>
            <button
              type="button"
              className={`${styles.choiceCard} ${option === 1 ? styles.choiceCardActive : ""}`}
              onClick={() => setOption(1)}
            >
              <strong>自定义专属目标</strong>
              <small>进入后先去目标页，从 0 开始定自己的计划。</small>
            </button>
          </div>
        </div>

        <div className={styles.actions}>
          <span className={styles.hint}>进入即代表同意《用户协议》与《隐私政策》</span>
          <button
            className={styles.primary}
            type="button"
            disabled={!nickname.trim() || !petName.trim() || initMutation.isPending || Boolean(nicknameError) || Boolean(petNameError)}
            onClick={submit}
          >
            {initMutation.isPending ? "开启中..." : "开启旅程"}
          </button>
        </div>
      </section>
    </main>
  );
};
