#!/bin/sh
# 純靜態：把 src 複製到 dist（classic script，file:// 可直接開）
cd "$(dirname "$0")" && rm -rf dist && cp -r src dist && echo "built dist/"
