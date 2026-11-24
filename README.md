# 中药材种植数字化平台

面向药材基地的纯前端演示。默认显示管理端。在顶部选择「员工端预览」进入 H5 工作台，在「我的」页面返回管理端。默认界面用户为管理员，员工端可切换本地模拟执行身份。

## 功能

- 管理端的 11 个模块包括数据总览、基地地块、视频监测、环境监测、作物监测、土壤监测、灌溉监测、产量分析、种植计划、任务管理及告警中心。
- 员工端包括首页、任务、地块、计划、我的。支持上下班打卡、任务接收和执行、提交审核、巡检和异常上报。
- 监测与统计图由 ECharts 绘制。环境、土壤、灌溉与采收记录可导出 Excel。
- 农业照片和山水装饰由 ImageGen 为本项目生成。地图为可交互示意图，摄像头画面为标注过的本地演示图片。

基地、天气、地图、设备和种植记录均为演示数据。两端共用当前浏览器和站点的数据，跨设备同步、服务端认证、多人协同、真实设备及视频服务未接入。人工观察与演示报告不构成正式质量检验结论。

## 开发与预览

使用 Node.js 24 和 npm。依赖版本由 package-lock.json 锁定。主要技术包括 Vue 3、TypeScript、Vite、Element Plus、Apache ECharts、Vue Router、Pinia、Lucide、SheetJS、Vitest 和 Playwright。

```powershell
Set-Location -LiteralPath 'D:\Projects\herbal-planting-demo'
npm ci
npm run dev
```

管理端访问 [本地总览](http://127.0.0.1:5173/#/admin/overview)，员工端访问 [我的田地](http://127.0.0.1:5173/#/employee/plots)。在同一可信局域网演示时，可运行 `npx vite --host 0.0.0.0` 并用手机访问电脑局域网地址。不同设备各自保存演示数据。

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run preview
```

`npm run preview` 默认使用 4173 端口。Windows 已安装 Chrome 时，可先设置 `$env:PLAYWRIGHT_CHANNEL = 'chrome'`，再运行浏览器测试。测试脚本从 dist 同时托管根路径和模拟 Pages 子路径。

## 发布到 GitHub Pages

在 GitHub 创建空仓库 `herbal-planting-demo`，并在 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。在本地执行以下命令，将 `YOUR_GITHUB_USER` 替换为实际账号。

```powershell
Set-Location -LiteralPath 'D:\Projects\herbal-planting-demo'
git status --short
git remote add origin https://github.com/YOUR_GITHUB_USER/herbal-planting-demo.git
git add --all
git commit -m "Build herbal planting frontend demo"
git push -u origin main
```

推送后查看 **Actions → Deploy GitHub Pages**。工作流使用 `npm ci`，通过单元测试、TypeScript 检查、Vite 构建和浏览器测试后上传 dist。Pages 地址的形式为 `https://YOUR_GITHUB_USER.github.io/herbal-planting-demo/#/admin/overview`。Vite 采用相对资源路径，Vue Router 使用 Hash，因此仓库改名后仍可挂载到实际子路径并刷新页面。[GitHub Pages 发布源配置](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 项目资料

- [演示实施范围](docs/requirements.md)
- [功能清单](docs/feature-inventory.md)
- [验收报告](docs/test-report.md)
- [开发记录](ai-log.md)
