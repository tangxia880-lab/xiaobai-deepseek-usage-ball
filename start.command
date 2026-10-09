#!/bin/bash
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
  npm install --cache /tmp/npm-cache
fi
npm start
