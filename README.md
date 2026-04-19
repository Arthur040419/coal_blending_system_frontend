# 煤矿智能配煤管理系统 · 前端

本科毕业设计配套前端：Vue 3 + Vite + **Element Plus**（Vue 3 官方维护的 Element 组件库；课题原型文档中的「Vue3 管理系统」与之对应。若课程材料仍写「Element UI」，一般指 Vue 2 时代的命名；本项目技术栈与 Vue 3 一致。）

## 运行方式

1. 启动后端（默认端口 `8080`，与 `coal_blending_system` 中 `application.yml` 一致）。
2. 在本目录执行：

```bash
npm install
npm run dev
```

浏览器访问终端提示的本地地址（一般为 `http://127.0.0.1:5173`）。

### npm install 报 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`

说明本机 Node 不信任访问 `registry.npmjs.org` 时看到的 HTTPS 证书链，常见于公司/校园网 SSL 检查、代理或本机缺少中间证书。

**优先推荐（安全）：** 向网络管理员索取根 CA 或代理证书（`.pem` / `.crt`），然后任选其一：

```bash
# 仅当前终端生效
export NODE_EXTRA_CA_CERTS="/绝对路径/你的公司或学校根证书.pem"
npm install
```

或写入 npm 配置（长期生效）：

```bash
npm config set cafile "/绝对路径/你的根证书.pem"
npm install
```

**临时绕过（仅本机开发、降低安全性，勿提交到仓库）：**

```bash
npm config set strict-ssl false
npm install
# 装完后建议恢复：npm config delete strict-ssl
```

若仍失败，可换国内镜像再试（与证书问题无必然关系，但有时可避开异常链路）：

```bash
npm config set registry https://registry.npmmirror.com
npm install
```

## 接口代理

开发环境下，`/api` 会由 Vite 代理到 `http://127.0.0.1:8080`，并去掉 `/api` 前缀，因此前端请求 `/api/order/page` 即对应后端 `/order/page`。

生产构建后需由 Nginx 等配置同样的反向代理，或改为直接请求后端域名（并处理跨域）。

## 目录说明

- `src/api/http.js`：Axios 实例，统一解析后端 `Result`（`code === 200` 时返回 `data`）。
- `src/router`：侧边栏菜单与页面路由，与《前端原型方案》模块划分对齐。
- `src/layouts/MainLayout.vue`：后台整体布局（顶栏 + 侧栏 + 内容区）。
- `src/views`：页面；其中 `placeholder` 为待实现模块占位，订单与智能配煤已做最小联调示例。
