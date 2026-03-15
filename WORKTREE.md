# WORKTREE.md

## 目标

本手册只解决一件事：在 `Pet_Sys` 中如何使用 Git worktree 管理基线版、前端工作树、后端工作树和联调工作树，避免“线程名、目录名、分支名”混淆后无法合并。

## 先记住 5 条规则

- `Pet_Sys` 根目录永远只挂 `main`，它就是基线版。
- 工作树是本地目录，分支才是合并对象。
- 每一轮新功能都从最新 `origin/main` 新开分支，不在旧分支上无限续写。
- 前端、后端、联调目录可以长期复用，但里面的分支每轮都要换新。
- `API接口契约.md`、`package.json`、`.nvmrc`、CI 和其他公共约束默认只在基线版处理。

## 当前仓库分支角色

以下分支可以作为当前仓库的实际示例：

- `main`：基线版
- `codex/back-port-main`：第一轮后端实现示例
- `codex/front-port-main`：第一轮前端实现示例
- `codex/integration-pass`：第一轮联调示例
- `codex/front-target-date`：合并后从新主线再开的前端下一轮示例

以下分支不建议继续复用：

- `codex/frontend`
- `codex/backend`

原因：它们是早期分叉点，不是后续真实承载改动的主分支。

## 推荐目录约定

固定 4 个目录：

```text
/Users/wy/Documents/New project/Pet_Sys              -> main
/Users/wy/Documents/New project/Pet_Sys-frontend     -> 前端当前分支
/Users/wy/Documents/New project/Pet_Sys-backend      -> 后端当前分支
/Users/wy/Documents/New project/Pet_Sys-integration  -> 联调当前分支
```

说明：

- `Pet_Sys` 是主工作树，只负责 `main`。
- `Pet_Sys-frontend`、`Pet_Sys-backend`、`Pet_Sys-integration` 只是工作位置，不对应固定分支名。
- 不要手动复制仓库目录；工作树统一用 `git worktree add` 或 Codex 的“派生到新工作树”创建。

## 0. 每次开始前先检查当前状态

在基线版执行：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
nvm use 22
git status --short --branch
git branch -vv
git worktree list --porcelain
```

如果看到失效 worktree 记录，清一次：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
git worktree prune
git worktree list --porcelain
```

## 1. 基线版如何维护

所有公共动作都先在基线版做：

- 建目录结构
- 调整公共文档
- 调整根配置
- 调整 Node / npm / CI 约束
- 打 tag
- 最终合并

常用命令：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
nvm use 22
git switch main
git pull --ff-only
npm ci
npm run check:fast
```

如果当前主线稳定，建议补基线 tag：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
git tag -a v0.1.0-baseline -m "Pet_Sys baseline"
git push origin main --tags
```

## 2. 首次创建工作树

### 前端工作树

从最新 `origin/main` 新开前端分支：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
git fetch origin
git worktree add -b codex/front-next-feature "/Users/wy/Documents/New project/Pet_Sys-frontend" origin/main
```

### 后端工作树

从最新 `origin/main` 新开后端分支：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
git fetch origin
git worktree add -b codex/back-next-feature "/Users/wy/Documents/New project/Pet_Sys-backend" origin/main
```

### 联调工作树

从最新 `origin/main` 新开联调分支：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
git fetch origin
git worktree add -b codex/integration-next "/Users/wy/Documents/New project/Pet_Sys-integration" origin/main
```

## 3. 如果目录已经存在，下一轮如何复用

不要重新创建目录，直接在现有工作树里切新分支。

### 前端下一轮

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-frontend"
git status --short --branch
git fetch origin
git switch -c codex/front-next-feature origin/main
nvm use 22
npm ci
npm run check:fast
```

### 后端下一轮

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-backend"
git status --short --branch
git fetch origin
git switch -c codex/back-next-feature origin/main
nvm use 22
npm ci
npm run check:fast
```

### 联调下一轮

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-integration"
git status --short --branch
git fetch origin
git switch -c codex/integration-next origin/main
nvm use 22
npm ci
npm run check:fast
```

注意：

- 如果 `git status` 不是干净的，先处理完当前变更再切新分支。
- 不要在前端或后端工作树里执行 `git switch main`，因为 `main` 已经在基线版目录中占用。

## 4. 每次开发前的固定动作

### 前端

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-frontend"
nvm use 22
git status --short --branch
git fetch origin
git rebase origin/main
npm ci
npm run check:fast
```

### 后端

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-backend"
nvm use 22
git status --short --branch
git fetch origin
git rebase origin/main
npm ci
npm run check:fast
```

### 联调

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-integration"
nvm use 22
git status --short --branch
git fetch origin
git rebase origin/main
npm ci
npm run check:fast
```

## 5. 开发完成后提交

前端示例：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-frontend"
git add .
git commit -m "feat(frontend): describe the task"
git push -u origin HEAD
```

后端示例：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-backend"
git add .
git commit -m "feat(backend): describe the task"
git push -u origin HEAD
```

联调示例：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-integration"
git add .
git commit -m "fix(integration): describe the fix"
git push -u origin HEAD
```

## 6. 合并回 main 的标准顺序

推荐顺序：

1. 先后端
2. 再前端
3. 最后联调

### 6.1 后端合并前

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-backend"
nvm use 22
git fetch origin
git rebase origin/main
npm ci
npm run check:fast
git push --force-with-lease origin HEAD
```

### 6.2 在基线版合并后端

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
nvm use 22
git switch main
git pull --ff-only
git merge --no-ff codex/back-next-feature -m "merge backend: codex/back-next-feature"
npm run check:fast
git push origin main
```

### 6.3 前端合并前

后端合完后，前端必须再同步一次新主线：

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-frontend"
nvm use 22
git fetch origin
git rebase origin/main
npm ci
npm run check:fast
git push --force-with-lease origin HEAD
```

### 6.4 在基线版合并前端

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
nvm use 22
git switch main
git pull --ff-only
git merge --no-ff codex/front-next-feature -m "merge frontend: codex/front-next-feature"
npm run check:fast
git push origin main
```

### 6.5 联调合并前

```bash
cd "/Users/wy/Documents/New project/Pet_Sys-integration"
nvm use 22
git fetch origin
git rebase origin/main
npm ci
npm run check:full
git push --force-with-lease origin HEAD
```

### 6.6 在基线版合并联调

```bash
cd "/Users/wy/Documents/New project/Pet_Sys"
nvm use 22
git switch main
git pull --ff-only
git merge --no-ff codex/integration-next -m "merge integration: codex/integration-next"
npm run check:full
git push origin main
```

## 7. 用当前仓库分支名理解一遍

按你当前仓库的历史，正确理解应该是：

- `main`：基线版
- `codex/back-port-main`：第一轮后端分支
- `codex/front-port-main`：第一轮前端分支
- `codex/integration-pass`：第一轮联调分支
- `codex/front-target-date`：主线更新后，新开的下一轮前端分支

也就是说，`codex/front-target-date` 这种做法是对的：它代表“前一轮合并结束后，再从最新主线开下一轮前端分支”。

相反，这两条分支不该继续使用：

- `codex/frontend`
- `codex/backend`

## 8. 排错命令

### 8.1 我现在到底在哪个分支

```bash
git status --short --branch
git branch -vv
```

### 8.2 当前有哪些工作树

```bash
git worktree list --porcelain
```

### 8.3 找不到分支时先看最近分支图

```bash
git log --graph --decorate --oneline --all -n 40
```

### 8.4 工作树目录被删了，但 Git 还记着

```bash
git worktree prune
```

## 9. 最重要的一句话

工作树只是工作位置，分支才是合并对象；基线版永远守住 `main`，每一轮功能都从最新 `origin/main` 新开分支。
