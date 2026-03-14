const apiBaseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:3000/api";
const deviceId = process.env.SMOKE_DEVICE_ID ?? "smoke-device-001";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, options);
  const body = await response.json().catch(() => null);

  if (!response.ok || !body || body.code !== 0) {
    throw new Error(`request failed: ${path} => ${response.status} ${JSON.stringify(body)}`);
  }

  return body.data;
}

async function waitForHealth() {
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      const health = await request("/health");
      if (health.status === "ok" && health.database === "up") {
        return health;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new Error("health check did not become ready in time");
}

async function main() {
  console.log(`[smoke] waiting for ${apiBaseUrl}/health`);
  const health = await waitForHealth();
  console.log(`[smoke] health ok at ${health.timestamp}`);

  const headers = {
    "Content-Type": "application/json",
    "X-Device-Id": deviceId
  };

  const init = await request("/users/init", {
    method: "POST",
    headers,
    body: JSON.stringify({
      nickname: "联调用户",
      petName: "团子",
      onboardingOption: 0
    })
  });

  if (typeof init.userId !== "number" || typeof init.pendingDraw !== "boolean") {
    throw new Error(`unexpected init response: ${JSON.stringify(init)}`);
  }
  console.log(`[smoke] init ok user=${init.userId}`);

  const me = await request("/users/me", {
    headers: {
      "X-Device-Id": deviceId
    }
  });
  if (me.userId !== init.userId || typeof me.energyBalance !== "number") {
    throw new Error(`unexpected me response: ${JSON.stringify(me)}`);
  }
  console.log(`[smoke] me ok energy=${me.energyBalance}`);

  const items = await request("/items", {
    headers: {
      "X-Device-Id": deviceId
    }
  });
  if (!Array.isArray(items) || items.length < 5) {
    throw new Error(`unexpected items response: ${JSON.stringify(items)}`);
  }
  console.log(`[smoke] items ok count=${items.length}`);

  const tasks = await request(`/tasks?date=${todayDateString()}`, {
    headers: {
      "X-Device-Id": deviceId
    }
  });
  if (!Array.isArray(tasks.pending) || tasks.date !== todayDateString()) {
    throw new Error(`unexpected tasks response: ${JSON.stringify(tasks)}`);
  }
  console.log(`[smoke] tasks ok pending=${tasks.pending.length}`);

  console.log("[smoke] all checks passed");
}

main().catch((error) => {
  console.error("[smoke] failed");
  console.error(error);
  process.exitCode = 1;
});
