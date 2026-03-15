# 团队版SOP

## 适用范围

适用于 `Pet_Sys` 的基线版、前端、后端、联调四类线程协作。目标只有一个：保证每一轮需求都能从 `main` 稳定派生、独立开发、顺利合并、继续下一轮。

## 一句话原则

- `main` 是唯一基线版。
- 分支才是合并对象，线程不是。
- 工作树只是工作位置，不是版本来源。
- 每一轮功能都从最新 `origin/main` 新开分支。
- 公共约束只在基线版处理。

## 四类工作位置

```text
Pet_Sys              -> main（基线版）
Pet_Sys-frontend     -> 当前前端业务分支
Pet_Sys-backend      -> 当前后端业务分支
Pet_Sys-integration  -> 当前联调分支
```

说明：

- `Pet_Sys` 永远只挂 `main`。
- 前端、后端、联调目录可以长期复用。
- 目录可复用，分支不要复用。

## 建仓与首次派生

### 第 1 步：先建立基线版

在 `main` 完成这些事情后，才允许派生：

- 建目录结构：`apps/frontend`、`apps/backend`
- 建根配置：`package.json`、锁文件、`.nvmrc`
- 建公共文档、接口契约、CI、检查脚本
- 至少有 1 个有效 commit

基线版检查命令：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
nvm use 22
git status --short --branch
git branch --list
git log --oneline -1
```

如果这里没有本地 `main` 或没有 commit，就不要派生工作树。

### 第 2 步：从基线版派生工作树

前端：

```bash
git worktree add -b codex/front-next-feature "/Users/wy/Documents/New project/Pet_Sys-frontend" origin/main
```

后端：

```bash
git worktree add -b codex/back-next-feature "/Users/wy/Documents/New project/Pet_Sys-backend" origin/main
```

联调：

```bash
git worktree add -b codex/integration-next "/Users/wy/Documents/New project/Pet_Sys-integration" origin/main
```

## 新工作树进入后的第一件事

不是直接写代码，而是先确认当前是不是业务分支。

检查命令：

```bash
git status --short --branch
git branch -vv
```

判断规则：

- 看到 `main`：先创建分支，再开发
- 看到 `HEAD (no branch)`：先创建分支，再开发
- 看到 `codex/front-*`、`codex/back-*`、`codex/integration-*`：可以开发

## 每轮标准流程

### 1. 基线确认

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
nvm use 22
git switch main
git pull --ff-only
npm ci
npm run check:fast
```

### 2. 前后端分别开发

前端：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-frontend"
nvm use 22
git fetch origin
git rebase origin/main
npm ci
npm run check:fast
```

后端：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-backend"
nvm use 22
git fetch origin
git rebase origin/main
npm ci
npm run check:fast
```

### 3. 开发完成先提交

前端/后端/联调都一样，先提交再谈切换位置或合并：

```bash
git add .
git commit -m "feat: describe the task"
git push -u origin HEAD
```

### 4. 回基线版合并

推荐顺序：

1. 先后端
2. 再前端
3. 最后联调

后端合并示例：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
git switch main
git pull --ff-only
git merge --no-ff codex/back-next-feature -m "merge backend: codex/back-next-feature"
npm run check:fast
git push origin main
```

前端合并示例：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
git switch main
git pull --ff-only
git merge --no-ff codex/front-next-feature -m "merge frontend: codex/front-next-feature"
npm run check:fast
git push origin main
```

联调合并示例：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
git switch main
git pull --ff-only
git merge --no-ff codex/integration-next -m "merge integration: codex/integration-next"
npm run check:full
git push origin main
```

### 5. 下一轮从最新 main 再开新分支

不要继续在已合并旧分支上开发。

前端下一轮：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-frontend"
git fetch origin
git switch -c codex/front-next-feature-2 origin/main
```

后端下一轮：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-backend"
git fetch origin
git switch -c codex/back-next-feature-2 origin/main
```

## Codex 界面按钮速查

### `派生到新工作树`

- 含义：保留当前线程，再新开一个 worktree 线程
- 场景：基线版不动，另外开前端/后端/联调线程

### `创建分支`

- 含义：给当前工作树创建独立 Git 分支
- 场景：刚派生后发现当前还是 `main` 或无分支

### `移至工作树`

- 含义：把当前 `main` 线程原地转成一个 worktree 分支线程
- 场景：你想在当前线程直接开始业务开发，不再留在 `main`

### `移动到本地`

- 含义：把当前 worktree 挂着的分支交回某个本地工作区继续使用
- 场景：准备离开当前线程，但分支还要在本地 IDE/终端里继续

### `提交`

- 含义：把当前改动提交到当前分支
- 场景：开发完成后的第一优先动作

## 哪些文件只能在基线版改

- `API接口契约.md`
- `package.json`
- `.nvmrc`
- `.github/workflows/*`
- 共享类型
- 跨前后端公共配置

前端和后端线程如果发现这些文件要改，先停下来，回基线版处理。

## Pet_Sys 当前分支示例

- `main`：基线版
- `codex/back-port-main`：第一轮后端
- `codex/front-port-main`：第一轮前端
- `codex/integration-pass`：第一轮联调
- `codex/front-target-date`：主线更新后开的下一轮前端

以下旧分支不建议继续复用：

- `codex/frontend`
- `codex/backend`

## 常见错误

- 在 `main` 里直接做业务开发
- 派生后不建分支就开始写代码
- 把线程名当成分支名
- 合并后继续在旧业务分支上追加需求
- 前后端线程顺手改公共契约
- 想靠“移动到本地”完成提交或合并

## 最终执行口令

先基线、再派生；先分支、再开发；先提交、再合并；每轮都从最新 `main` 重开分支。
