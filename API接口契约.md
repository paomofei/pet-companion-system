# 伴读宠物系统 - API 接口契约（V4）

> **用途**：前后端并行开发的共同约定。后端按此产出 Swagger，前端按此 Mock 数据。
>
> **基础约定**：
> - Base URL: `/api`
> - 统一响应格式：`{ code: 0, message: "ok", data: {...} }`
> - 错误响应：`{ code: 40001, message: "参数校验失败", data: null }`
> - 鉴权：Header `X-Device-Id`（V1 设备号静默注册；客户端首次安装生成并本地持久化的 UUID，不是真实硬件号）
> - 时间格式：ISO 8601（`2026-03-12T10:30:00Z`）
> - 日期格式：`YYYY-MM-DD`
> - V1 身份边界：一个安装实例 = 一个 `X-Device-Id` = 一个用户；暂不支持换机恢复或多设备登录

---

## 1. 用户模块

### POST `/users/init` — 初始化（引导页提交）

**行为约定**：
- 后端按 `X-Device-Id` 查询 `users.device_id`。
- 若当前 `X-Device-Id` 尚未绑定用户：创建 `user + pet + 默认数据`，并完成绑定。
- 若当前 `X-Device-Id` 已绑定用户：直接返回已绑定用户当前数据，`code` 仍为 `0`，不重复创建。

```json
// Request
{
  "nickname": "小明",
  "petName": "汤圆",
  "onboardingOption": 0   // 0=一键开启 1=自定义
}

// Response
{
  "code": 0,
  "data": {
    "userId": 1,
    "nickname": "小明",
    "pet": { "id": 1, "name": "汤圆", "level": 1, "currentXp": 0, "maxXp": 100, "appearance": "cat_default" },
    "energyBalance": 0,
    "pendingDraw": false,
    "defaultGoals": [          // 仅 onboardingOption=0 时有值
      { "id": 1, "icon": "🎯", "title": "每日好习惯" }
    ],
    "defaultTasks": [
      { "id": 1, "title": "早起喝一杯水", "rewardEnergy": 10 },
      { "id": 2, "title": "阅读课外书20分钟", "rewardEnergy": 20 },
      { "id": 3, "title": "整理书桌", "rewardEnergy": 10 }
    ]
  }
}
```

### GET `/users/me` — 当前用户全量信息

**行为约定**：
- 后端按 `X-Device-Id` 查询 `users.device_id`。
- 若当前 `X-Device-Id` 未绑定用户：返回 `{ "code": 40002, "message": "用户未初始化", "data": null }`，前端跳转 `/onboarding`。

```json
// Response
{
  "code": 0,
  "data": {
    "userId": 1,
    "nickname": "小明",
    "energyBalance": 120,
    "pendingDraw": false,
    "currentStreak": 7,
    "maxStreak": 12,
    "totalEnergyEarned": 3450,
    "totalTasksDone": 128,
    "pet": {
      "id": 1, "name": "汤圆", "level": 3,
      "currentXp": 78, "maxXp": 100, "appearance": "cat_default"
    }
  }
}
```

---

## 2. 宠物模块

### GET `/pets/status` — 宠物状态

```json
// Response
{
  "code": 0,
  "data": {
    "id": 1, "name": "汤圆", "level": 3,
    "currentXp": 78, "maxXp": 100,
    "appearance": "cat_default",
    "pendingDraw": false       // 前端用于🎁礼物盒状态判断
  }
}
```

### POST `/pets/interact` — 宠物互动 ⭐

```json
// Request
{ "itemId": 2 }

// Response（未升级）
{
  "code": 0,
  "data": {
    "energyBalance": 100,     // 扣除后余额
    "pet": { "level": 3, "currentXp": 83, "maxXp": 100 },
    "interaction": { "energyCost": 20, "xpGained": 5 },
    "leveledUp": false,
    "pendingDraw": false      // 布尔值
  }
}

// Response（升级了！前端 → 🎁亮起）
{
  "code": 0,
  "data": {
    "energyBalance": 30,
    "pet": { "level": 4, "currentXp": 3, "maxXp": 100 },
    "interaction": { "energyCost": 50, "xpGained": 15 },
    "leveledUp": true,        // 前端触发升级庆典
    "pendingDraw": true       // 前端触发🎁弹跳（布尔值）
  }
}
```

---

## 3. 任务模块

### GET `/tasks?date=2026-03-12` — 按日期查任务

```json
// Response
{
  "code": 0,
  "data": {
    "date": "2026-03-12",
    "pending": [
      {
        "id": 5, "title": "背诵英语课文", "status": 0,
        "rewardEnergy": 20, "repeatType": 4, "repeatWeekdays": [1, 3, 5],
        "goalId": 1, "goalIcon": "🎯", "goalTitle": "期末冲刺",
        "isDelayedCopy": false
      }
    ],
    "completed": [
      {
        "id": 3, "title": "完成数学练习册", "status": 1,
        "rewardEnergy": 20, "repeatType": 4, "repeatWeekdays": [1, 3, 5], "completedAt": "2026-03-12T09:30:00Z",
        "goalId": 1, "goalIcon": "🎯", "goalTitle": "期末冲刺",
        "isDelayedCopy": false
      }
    ]
  }
}
```

### POST `/tasks` — 新增任务

```json
// Request
{
  "title": "跳绳500下",
  "rewardEnergy": 15,
  "goalId": null,           // 可选，null=散装任务
  "repeatType": 4,          // 0=仅一次 1=每天 2=工作日 3=周末 4=按周指定
  "targetDate": "2026-03-18", // repeatType=0 时表示执行日期；repeatType>0 时表示开始执行日期
  "repeatWeekdays": [3]     // 仅 repeatType=4 必填；1=周一 ... 7=周日
}

// Response
{
  "code": 0,
  "data": {
    "id": 8, "title": "跳绳500下", "status": 0,
    "rewardEnergy": 15, "repeatType": 4,
    "targetDate": "2026-03-18", "repeatWeekdays": [3], "goalId": null,
    "templateId": 12       // repeatType>0 时返回模板ID
  }
}
```

**校验规则**：
- `repeatType=4` 时，`repeatWeekdays` 必填，且去重后至少包含 1 个 `1-7` 之间的整数。
- `repeatType=0|1|2|3` 时，`repeatWeekdays` 省略或返回空数组。
- `repeatType=2`（工作日）时，`targetDate` 不能落在周六/周日。
- `repeatType=3`（周末）时，`targetDate` 只能落在周六/周日。
- `repeatType=4`（按周指定）时，`targetDate` 的星期必须包含在 `repeatWeekdays` 中。

### PUT `/tasks/:id` — 编辑任务

```json
// Request
{
  "title": "跳绳800下",
  "rewardEnergy": 20,
  "goalId": 1,
  "scope": "this"           // "this"=仅此任务 "future"=此及未来（重复任务用）
}

// Response: 同 POST 结构
```

**本轮约束**：
- `PUT /tasks/:id` 暂不支持修改 `repeatType`、`targetDate`、`repeatWeekdays`。
- 若后续需要支持“修改未来重复规则”，单独扩接口。

### DELETE `/tasks/:id` — 删除任务（软删除）

```json
// Response
{ "code": 0, "data": { "id": 8, "deleted": true } }
```

### POST `/tasks/:id/check` — 打卡 ⭐

```json
// Response
{
  "code": 0,
  "data": {
    "taskId": 5,
    "rewardEnergy": 20,       // 前端用于飞行动效数字
    "energyBalance": 140,     // 最新余额
    "currentStreak": 8,
    "goalProgress": {         // 仅关联目标时返回
      "goalId": 1,
      "completed": 16, "total": 30,
      "percentage": 53,
      "justCompleted": false  // true=目标刚达成100%
    }
  }
}
```

### POST `/tasks/:id/uncheck` — 取消打卡

```json
// Response
{
  "code": 0,
  "data": {
    "taskId": 5,
    "energyDeducted": 20,     // 实际扣除（可能 < rewardEnergy，扣至0）
    "energyBalance": 120,
    "currentStreak": 7,       // 重算后
    "goalProgress": { "goalId": 1, "completed": 15, "total": 30, "percentage": 50 }
  }
}
```

### POST `/tasks/:id/postpone` — 顺延

```json
// Request
{ "targetDate": "2026-03-13" }   // 顺延到哪天

// Response
{
  "code": 0,
  "data": {
    "originalTaskId": 5,
    "newTask": {
      "id": 9, "title": "背诵英语课文",
      "targetDate": "2026-03-13", "isDelayedCopy": true
    }
  }
}
```

### GET `/tasks/overdue` — 昨日遗留

```json
// Response
{
  "code": 0,
  "data": {
    "date": "2026-03-11",
    "tasks": [
      { "id": 4, "title": "整理书桌", "rewardEnergy": 10 }
    ]
  }
}
```

---

## 4. 目标模块

### GET `/goals` — 目标列表（含动态进度）

```json
// Response
{
  "code": 0,
  "data": [
    {
      "id": 1, "icon": "🎯", "title": "期末数学冲刺100分",
      "completed": 15, "total": 30, "percentage": 50
    },
    {
      "id": 2, "icon": "🎯", "title": "养成每日阅读好习惯",
      "completed": 0, "total": 0, "percentage": 0
    }
  ]
}
```

### POST `/goals` — 新增目标（固定图标）

```json
// Request
{ "title": "期末英语95分" }
// `icon` 可省略；V2 起前端不再提供图标选择，服务端固定使用默认目标图标 `🎯`

// Response
{ "code": 0, "data": { "id": 3, "icon": "🎯", "title": "期末英语95分", "completed": 0, "total": 0, "percentage": 0 } }
```

### PUT `/goals/:id` — 编辑目标（固定图标）

```json
// Request
{ "title": "期末英语98分" }
// `icon` 可省略；若传入则服务端忽略并回写系统默认目标图标 `🎯`

// Response: 同 POST 结构
```

### DELETE `/goals/:id` — 删除目标（软删除+软解绑）

```json
// Response
{
  "code": 0,
  "data": {
    "id": 3, "deleted": true,
    "unboundTaskCount": 5    // 前端用于弹窗提示"5个任务将解绑"
  }
}
```

---

## 5. 许愿池模块

### GET `/wishes` — 心愿列表（待抽取）

```json
// Response
{
  "code": 0,
  "data": [
    { "id": 1, "icon": "🎁", "title": "周末玩Switch", "weight": 50, "rarity": 1, "status": 0 },
    { "id": 2, "icon": "🎁", "title": "吃一次麦当劳", "weight": 20, "rarity": 2, "status": 0 },
    { "id": 3, "icon": "🎁", "title": "全家去游乐园", "weight": 5, "rarity": 3, "status": 0 }
  ]
}
// rarity: 1=⭐小愿望(w50) 2=⭐⭐中愿望(w20) 3=⭐⭐⭐大愿望(w5)
```

### POST `/wishes` — 新增心愿（固定图标）

```json
// Request
{ "title": "周末玩Switch", "rarity": 1 }
// `icon` 可省略；V2 起前端不再提供图标选择，服务端固定使用默认心愿图标 `🎁`
// 后端根据 rarity 映射 weight: 1→50, 2→20, 3→5

// Response
{ "code": 0, "data": { "id": 4, "icon": "🎁", "title": "周末玩Switch", "weight": 50, "rarity": 1, "status": 0 } }
```

### PUT `/wishes/:id` — 编辑心愿（仅 status=0 可改，固定图标）

```json
// Request
{ "title": "周末玩Switch 2小时", "rarity": 2 }
// `icon` 可省略；若传入则服务端忽略并回写系统默认心愿图标 `🎁`

// Response: 同 POST 结构
```

### DELETE `/wishes/:id` — 删除心愿（仅 status=0 可删）

```json
// Response
{ "code": 0, "data": { "id": 4, "deleted": true } }
```

### POST `/wishes/draw` — 🎰 抽奖 ⭐

```json
// Request
{ "clientRequestId": "draw-6f1d7d2f-8f3a-4b3d-9ef0-2f6df0d2c123" }
// clientRequestId 由前端在点击金色🎁时生成；超时重试时必须沿用同一个值

// Response（成功）
{
  "code": 0,
  "data": {
    "drawnWish": {
      "id": 2, "icon": "🎁", "title": "吃一次麦当劳",
      "rarity": 2, "drawnAt": "2026-03-12T15:30:00Z"
    },
    "pendingDraw": false,    // 抽奖后置 false，🎁变灰
    "poolRemaining": 2       // 奖池剩余心愿数
  }
}

// Response（失败：无抽奖次数）
{ "code": 40005, "message": "无可用抽奖次数", "data": null }

// Response（失败：奖池为空）
{ "code": 40006, "message": "奖池为空，先许几个愿望吧", "data": null }
```

**幂等约定**：
- 后端按 `userId + clientRequestId` 做幂等校验。
- 若同一个 `clientRequestId` 重复提交，且首次请求已成功抽奖，则返回第一次抽奖的同一结果，`code` 仍为 `0`。
- 前端请求超时后，可使用同一个 `clientRequestId` 自动重试 1 次。

### GET `/wishes/history` — 中奖记录

```json
// Response
{
  "code": 0,
  "data": [
    { "id": 2, "icon": "🎁", "title": "吃一次麦当劳", "rarity": 2, "drawnAt": "2026-03-12T15:30:00Z" },
    { "id": 5, "icon": "🎁", "title": "看动画片30分钟", "rarity": 1, "drawnAt": "2026-03-10T18:00:00Z" }
  ]
}
```

---

## 6. 成长模块

### GET `/growth/stats` — 高光数据

```json
// Response
{
  "code": 0,
  "data": {
    "currentStreak": 7,
    "totalEnergyEarned": 3450,
    "totalTasksDone": 128
  }
}
```

### GET `/growth/weekly` — 7日趋势

```json
// Response
{
  "code": 0,
  "data": [
    { "date": "2026-03-06", "label": "周五", "completed": 2, "missed": 1 },
    { "date": "2026-03-07", "label": "周六", "completed": 4, "missed": 0 },
    { "date": "2026-03-08", "label": "周日", "completed": 3, "missed": 1 },
    { "date": "2026-03-09", "label": "周一", "completed": 5, "missed": 1 },
    { "date": "2026-03-10", "label": "周二", "completed": 4, "missed": 0 },
    { "date": "2026-03-11", "label": "周三", "completed": 6, "missed": 1 },
    { "date": "2026-03-12", "label": "今天", "completed": 2, "missed": 0 }
  ]
}
```

### GET `/badges` — 勋章列表

`description` 用于成长页勋章墙二级文案展示。
- 首版下发 `12` 枚 badge，分为 `任务习惯`、`目标成长`、`宠物互动` 三类。
- `first_feed` 与 `first_wish_claim` 暂不在 V2 首版下发：
  - `first_feed` 需要服务端区分喂食型互动
  - `first_wish_claim` 需要独立的愿望领取状态/事件

```json
// Response
{
  "code": 0,
  "data": [
    { "id": 1, "code": "first_task", "name": "初出茅庐", "description": "第一次完成任务", "icon": "⭐", "category": "任务习惯",
      "threshold": 1, "unlocked": true, "unlockedAt": "2026-03-06T10:00:00Z", "progress": 1 },
    { "id": 2, "code": "week_completion_80", "name": "本周小明星", "description": "单周完成率达到80%", "icon": "🌟", "category": "任务习惯",
      "threshold": 80, "unlocked": true, "unlockedAt": "2026-03-12T09:00:00Z", "progress": 80 },
    { "id": 3, "code": "first_interact", "name": "小手碰碰", "description": "第一次与宠物互动", "icon": "🐾", "category": "宠物互动",
      "threshold": 1, "unlocked": false, "unlockedAt": null, "progress": 0 }
  ]
}
```

---

## 7. 道具模块

### GET `/items` — 道具列表

```json
// Response
{
  "code": 0,
  "data": [
    { "id": 1, "name": "小饼干", "icon": "🍪", "costEnergy": 10, "gainXp": 2, "sortOrder": 1 },
    { "id": 2, "name": "鲜水果", "icon": "🍎", "costEnergy": 20, "gainXp": 5, "sortOrder": 2 },
    { "id": 3, "name": "玩球",   "icon": "🎾", "costEnergy": 30, "gainXp": 8, "sortOrder": 3 },
    { "id": 4, "name": "大肉肉", "icon": "🍖", "costEnergy": 50, "gainXp": 15, "sortOrder": 4 },
    { "id": 5, "name": "飞盘",   "icon": "🥏", "costEnergy": 80, "gainXp": 25, "sortOrder": 5 }
  ]
}
```

---

## 8. 错误码速查

| 码 | 含义 | 典型场景 |
|----|------|---------|
| 0 | 成功 | — |
| 40001 | 参数校验失败 | 标题为空、超长 |
| 40002 | 资源不存在 | taskId 无效 |
| 40003 | 状态冲突 | 已完成任务再打卡 |
| 40004 | 能量不足 | 互动扣费不够 |
| 40005 | 无可用抽奖机会 | pendingDraw=false |
| 40006 | 奖池为空 | 无待抽取心愿 |
| 40007 | 敏感词命中 | 名称触发黑名单 |
| 50000 | 服务器错误 | 未知异常 |
