# 煤矿智能配煤管理系统 · 前端

本科毕业设计“基于大模型的煤矿智能配煤系统设计与实现”的前端管理端。项目基于 Vue 3、Vite、Vue Router、Axios、Element Plus 和 ECharts 实现，面向配煤计划员、煤质检测员和系统管理员提供订单管理、智能配煤、知识库、模型效果评估和全链路追溯页面。

## 环境要求

- Node.js 18+
- npm 9+
- 已启动后端服务：默认 `http://127.0.0.1:8080`

后端项目位于：

```text
../coal_blending_system
```

## 安装与启动

在本目录执行：

```bash
npm install
npm run dev
```

开发服务器默认端口为 `5173`，浏览器访问：

```text
http://127.0.0.1:5173
```

生产构建：

```bash
npm run build
npm run preview
```

## 接口代理

开发环境下，前端请求默认走 `/api`：

```text
/api/order/page
```

Vite 会代理到后端：

```text
http://127.0.0.1:8080/order/page
```

代理配置在 `vite.config.js`。如需指定其他后端地址，可修改代理目标，或在生产环境中通过 Nginx 配置同样的 `/api` 反向代理。

Axios 实例位于 `src/api/http.js`，默认 `baseURL` 为：

```js
import.meta.env.VITE_API_BASE || '/api'
```

生产部署如果不使用 `/api` 代理，也可以在构建环境中设置：

```bash
VITE_API_BASE=https://你的后端域名
```

## 登录账号

初始化数据库后可使用以下账号登录：

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| `admin` | `123456` | 管理员 |
| `operator` | `123456` | 配煤业务员 |
| `quality` | `123456` | 煤质检测员 |

登录成功后，前端会将用户信息保存到浏览器 `localStorage`，并在业务请求头中附带：

```text
X-User-Id: 当前用户 ID
```

如果出现登录状态异常，可退出登录或清理浏览器本地存储后重新登录。

## 页面功能

| 页面 | 路由 | 用途 |
| --- | --- | --- |
| 首页总览 | `/dashboard` | 查看订单、库存、方案、模型配置等概览数据 |
| 订单管理 | `/orders` | 新增、编辑、删除订单，维护质量约束和交付日期 |
| 智能配煤 | `/blend` | 选择订单并生成配煤方案，查看评分、风险、解释和推荐依据 |
| 煤种管理 | `/coal-types` | 维护煤种编码、名称、产地、价格和是否可配 |
| 煤质管理 | `/coal-quality` | 维护灰分、硫分、水分、挥发分、发热量等化验指标 |
| 库存管理 | `/inventory` | 查看和维护可用库存、仓库、批次和锁定数量 |
| 全链路数据 | `/full-chain` | 管理矿区来源、原煤、洗选、产品批次、质检、发运和追溯 |
| 规则知识 | `/rules` | 维护配煤规则、适用范围、优先级和启用状态 |
| 历史案例 | `/cases` | 维护历史成功或风险案例，支持案例检索 |
| RAG 知识库 | `/rag` | 查看知识文档、知识块、检索健康状态并触发入库 |
| 方案追溯 | `/plan-history` | 查询历史配煤方案、明细、执行状态和解释内容 |
| 模型效果 | `/model-effect` | 查看模型实验记录、雷达图指标和模型效果对比 |
| 模型配置 | `/model-config` | 配置 Ollama 或 OpenAI 兼容模型接口 |
| 用户管理 | `/users` | 管理用户、角色和启用状态 |

## 系统使用流程

推荐按以下顺序使用：

1. 启动后端并导入数据库快照。
2. 启动前端，使用 `admin / 123456` 登录。
3. 在“煤种管理”“煤质管理”“库存管理”中确认物料和库存数据。
4. 在“订单管理”新增或选择一条待配煤订单。
5. 在“规则知识”“历史案例”“RAG 知识库”中确认规则、案例和知识内容。
6. 在“模型配置”中启用一个 OpenAI Chat Completions 兼容接口；离线演示时可由后端关闭模型调用。
7. 进入“智能配煤”，选择订单并点击生成方案。
8. 对比候选方案的预测煤质、成本、库存可执行性、风险提示、规则依据和综合评分。
9. 选择推荐方案并执行，执行后可进入“全链路数据”查看批次追溯。
10. 在“模型效果”中查看同一订单不同模型生成方案的评分对比。

## 智能配煤说明

“智能配煤”页面会调用后端 `/blendPlan/generate`。后端返回内容包括：

- 候选方案列表
- 每个方案的配比明细
- 预测灰分、硫分、水分、挥发分、发热量
- 质量评分、成本评分、库存稳定性评分、综合评分
- 可行性、风险等级、约束摘要
- 规则依据、案例参考、推荐理由、风险提示、最终解释
- RAG 检索结果和模型实验记录

如果大模型不可用，后端会返回兜底说明，页面仍可展示系统评分和候选方案。

## 模型配置说明

“模型配置”页面用于维护后端 `model_config` 表。常见 Ollama 配置：

```text
模型名称：qwen3:4b
接口地址：http://127.0.0.1:11434/v1/chat/completions
API Key：按服务要求填写，可为空
状态：启用
```

如果后端运行在 Docker 容器内，而 Ollama 在宿主机运行，接口地址不要写 `127.0.0.1`，应改为 `host.docker.internal`、宿主机网桥地址或 Compose 服务名。

## 目录结构

```text
src/api/                 后端接口封装
src/components/          通用组件，如 Markdown、雷达图、Pareto 散点图
src/composables/         组合式逻辑
src/layouts/             后台整体布局
src/router/              页面路由和登录拦截
src/stores/              登录态存储
src/utils/               格式化工具
src/views/               业务页面
```

关键文件：

- `src/api/http.js`：Axios 实例，统一处理 `Result` 响应、错误提示和登录失效跳转。
- `src/router/index.js`：路由表、登录拦截和页面标题。
- `src/layouts/MainLayout.vue`：顶栏、侧栏和内容区。
- `src/stores/auth.js`：登录态本地存储。
- `vite.config.js`：开发端口和 `/api` 代理。

## 常见问题

**页面提示网络错误**

确认后端已启动并能访问 `http://127.0.0.1:8080/health`，再检查 `vite.config.js` 中代理目标是否正确。

**登录后又回到登录页**

后端可能返回 401，或浏览器本地登录信息异常。重新登录，必要时清理 `localStorage` 中的 `coal_blend_auth_v1`。

**npm install 报 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`**

说明本机 Node 不信任当前网络访问 npm registry 时的 HTTPS 证书链。优先向网络管理员索取根 CA 或代理证书，然后设置：

```bash
export NODE_EXTRA_CA_CERTS="/绝对路径/你的根证书.pem"
npm install
```

或写入 npm 配置：

```bash
npm config set cafile "/绝对路径/你的根证书.pem"
npm install
```

仅本机临时开发可降低安全校验，完成后建议恢复：

```bash
npm config set strict-ssl false
npm install
npm config delete strict-ssl
```

也可尝试国内镜像：

```bash
npm config set registry https://registry.npmmirror.com
npm install
```
