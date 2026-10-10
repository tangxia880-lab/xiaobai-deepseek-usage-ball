# xiaobai-deepseek-usage-ball

极简悬浮球（macOS），实时显示 DeepSeek API 余额 + 今日/本周/本月用量与花费，登录即用。

一枚悬浮在桌面角落的小球，把 DeepSeek 开放平台的余额、调用量和花费，实时钉在你的屏幕上，不打断工作流。

## ✨ 特性

- 🎈 **桌面悬浮球**：42×42 小球常驻桌面，一眼看到余额
- 💰 **实时余额**：登录后自动拉取 DeepSeek 平台余额
- 📊 **用量统计**：今日 / 本周 / 本月 调用量与花费
- 📉 **本地追踪**：Python + SQLite 本地记录每次调用，按模型拆分统计
- ⚙️ **预算提醒**：可设置月度预算，超支一目了然
- 🔔 **余额告急**：余额不足时悬浮球给出明确提示

## 🖼️ 截图

### 悬浮球

![悬浮球](docs/screenshot-2.png)

### 展开面板

![展开面板](docs/screenshot-1.png)

## 📦 安装

### 方式一：下载安装包（推荐）

前往 [Releases](https://github.com/tangxia880-lab/xiaobai-deepseek-usage-ball/releases) 下载最新的 `.dmg`，拖入「应用程序」即可。

> **macOS 首次打开提示**：本应用为开源软件，未做 Apple 付费签名（付费签名每年需 ¥688），博主仅无偿分享。首次打开时 macOS 会提示「无法验证开发者」，这是正常现象，按下面任一方式即可打开：
>
> 1. **右键打开**：在 App 图标上右键（或按住 Control 点按）→ 选择「打开」→ 再点「打开」。
> 2. **命令行**：打开「终端」执行以下命令后，再双击 App 即可：
>
> ```bash
> xattr -cr "/Applications/DeepSeek用量悬浮球.app"
> ```

### 方式二：从源码运行

依赖：Node.js ≥ 18、Python 3

```bash
git clone https://github.com/tangxia880-lab/xiaobai-deepseek-usage-ball.git
cd xiaobai-deepseek-usage-ball
npm install
npm start
```

## 🚀 使用

1. 启动后桌面出现悬浮球
2. 右键悬浮球 →「切换账号」，扫码登录 DeepSeek 平台
3. 登录成功后，悬浮球自动显示余额
4. 点击悬浮球展开用量面板，查看今日 / 本周 / 本月统计
5. 右键 →「设置」，可配置预算与手动粘贴 Token

## ⚙️ 配置

首次运行会在项目目录生成 `config.json`（已被 `.gitignore` 忽略）。模板见 [config.example.json](config.example.json)。

| 字段 | 说明 |
|------|------|
| `api_key` | DeepSeek API Key（可选） |
| `user_token` | 登录后自动抓取的平台 Token |
| `budget` | 月度预算（用于超支提醒） |

## 🛠️ 开发与打包

```bash
npm start          # 开发运行
npm run dist:mac   # 打包 macOS dmg + zip
npm run dist:win   # 打包 Windows nsis
```

打包产物输出到 `release/` 目录。

## 🧱 技术栈

- **Electron 33** — 桌面窗口与悬浮球
- **HTML / CSS / JS** — 悬浮球与面板 UI
- **Python 3 + SQLite** — 本地用量追踪与统计

## 📄 许可证

[MIT](LICENSE)
