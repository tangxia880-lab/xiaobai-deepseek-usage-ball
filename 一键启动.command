#!/bin/bash
# 一键启动 DeepSeek 用量悬浮球
cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "首次运行，正在安装依赖..."
  export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
  npm install --cache /tmp/npm-cache
fi

nohup npm start > /tmp/deepseek-usage-ball.log 2>&1 &
echo "悬浮球已启动，本窗口可以关闭。"
echo "查看日志：/tmp/deepseek-usage-ball.log"
