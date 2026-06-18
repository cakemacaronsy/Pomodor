# 番茄時鐘

TL;DR：紅色番茄時鐘已分離成根目錄的 `red.html`、`red.css`、`red.js`。主入口 `index.html` 仍可打開目前紅色版，其他教學版本保留在 `versions/` 底下。

## 版本資料夾

| 版本 | 位置 | 狀態 |
| --- | --- | --- |
| Red version | `red.html` | 獨立紅色版本 |
| Red Strong version | `versions/pomodoro-red-strong_v1/` | 依 09:43 截圖固定的 strong 版本 |
| Main current | `index.html` | 目前主入口 |
| Strong version | `versions/pomodoro-strong_v1/` | 目前只有素材與說明 |
| Color version | `versions/pomodoro-color_v1/` | 可直接打開 `index.html` |
| Green fixed version | `versions/pomodoro-green_v1/` | 既有固定版本，保留不動 |

## 使用方式

紅色獨立版直接打開根目錄的 `red.html`。如果要用本機網址預覽，在根目錄執行：

```bash
python3 -m http.server 4173
```

然後開啟：

| 版本 | 網址 |
| --- | --- |
| 紅色獨立版 | `http://127.0.0.1:4173/red.html` |
| Red Strong 版 | `http://127.0.0.1:4175/` |
| 目前主入口 | `http://127.0.0.1:4173/` |

## 功能

| 功能 | 說明 |
| --- | --- |
| 三種模式 | 專注、短休息、長休息 |
| 可調時間 | 可修改三種模式的分鐘數 |
| 今日完成 | 完成專注倒數後自動累積番茄數 |
| 任務清單 | 可新增、完成、移除任務 |
| 本機儲存 | 任務、時間設定、完成數會保留在同一台瀏覽器 |
