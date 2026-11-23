# Perfect Creative

演讲台品牌独立站的本地演示。英文默认入口、中文切换和员工后台共用数据库。商品默认走询盘。公开的型号名称和编号是示例，图片来自项目提供的产品与场景素材。

## 公开展示

[英文预览](https://qml780.github.io/perfect-creative/) · [中文预览](https://qml780.github.io/perfect-creative/zh/)

GitHub Pages 从 `gh-pages` 分支发布静态展示版，包含产品目录、场景图、拆装交互和滚动动效。首页 3D 展示支持拖动旋转、缩放、四种材质、正背面预设视角和板件展开。模型根据图片制作，供外观和结构展示。询价入口显示展示说明，在线客服和员工后台需要服务端环境。

本机安装依赖与 Microsoft Edge 后，在项目目录运行 `node scripts/export-showcase.mjs` 可重新生成展示版。脚本使用独立的内存示例数据库，并打印 `.data` 下的输出目录。

3D 源文件为 `scripts/lectern-viewer.mjs`，执行 `npm run build:viewer` 打包为自托管浏览器模块。生产构建与展示导出会自动运行此步骤。运行时按视口加载，WebGL 或网络不可用时显示产品照片。

## 本地启动

使用 Node.js 24.11 或更高版本。在 PowerShell 中执行：

```powershell
Set-Location 'D:\red\perfect-creative'
npm install
npm run dev -- --port 3100
```

| 入口 | 本地地址 |
| --- | --- |
| 英文首页 | http://127.0.0.1:3100/en |
| 中文首页 | http://127.0.0.1:3100/zh |
| 产品目录 | http://127.0.0.1:3100/en/products |
| 批发询盘 | http://127.0.0.1:3100/zh/quote |
| 后台登录 | http://127.0.0.1:3100/admin/login |

首次访问时建立本地 SQLite 数据库，默认文件为 `.data/demo.sqlite`。可以先运行 `npm run db:migrate` 初始化。后台首次使用需另开一个终端，从项目目录运行 `npm run admin:init`，输入自选邮箱和至少 12 个字符的密码。初始化命令仅在本地开发模式运行。演示文件、上传、数据库及密钥配置请留在本机。

## 测试

```powershell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

浏览器测试需要本机 Microsoft Edge。测试使用独立端口、独立构建目录和独立 SQLite 文件。预览截图在 [docs/screenshots](docs/screenshots/)。

## 交接

- [进度和测试证据](docs/PROGRESS.md)
- [技术决策](docs/DECISIONS.md)
- [中文运营手册](docs/OPERATOR_GUIDE_zh.md)
- [生产上线清单](docs/PRODUCTION_CHECKLIST.md)
- [集成说明](docs/INTEGRATIONS.md)
- [阶段缺口](docs/handover.md)

生产构建用于验证可编译性。正式身份、正式目录与询盘服务接入前，生产模式不会加载本地演示数据或接受公开询盘。
