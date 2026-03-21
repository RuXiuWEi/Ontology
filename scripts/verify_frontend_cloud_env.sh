#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/workspace"
FRONTEND_DIR="${ROOT_DIR}/frontend"
LOG_DIR="${ROOT_DIR}/.cloud-env-logs"
mkdir -p "${LOG_DIR}"

BUILD_LOG="${LOG_DIR}/frontend-build.log"
TEST_LOG="${LOG_DIR}/frontend-test.log"

cd "${FRONTEND_DIR}"

echo "=== 前端环境验证开始 ==="
echo "时间: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "node: $(node -v)"
echo "npm: $(npm -v)"
echo "日志目录: ${LOG_DIR}"

echo "执行 npm run build（日志: ${BUILD_LOG}）"
if ! npm run build >"${BUILD_LOG}" 2>&1; then
  echo "[错误] npm run build 失败"
  echo "--- node/npm 版本 ---"
  echo "node: $(node -v)"
  echo "npm: $(npm -v)"
  echo "--- build.log 尾部 ---"
  tail -n 80 "${BUILD_LOG}" || true
  exit 1
fi

echo "执行 npm run test（日志: ${TEST_LOG}）"
if ! npm run test >"${TEST_LOG}" 2>&1; then
  echo "[错误] npm run test 失败"
  echo "--- node/npm 版本 ---"
  echo "node: $(node -v)"
  echo "npm: $(npm -v)"
  echo "--- test.log 尾部 ---"
  tail -n 80 "${TEST_LOG}" || true
  exit 1
fi

echo "=== 前端环境验证通过 ==="
