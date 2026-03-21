#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="/workspace"
FRONTEND_DIR="${ROOT_DIR}/frontend"
LOG_DIR="${ROOT_DIR}/.cloud-env-logs"
INSTALL_LOG="${LOG_DIR}/frontend-install.log"
BUILD_LOG="${LOG_DIR}/frontend-build.log"
TEST_LOG="${LOG_DIR}/frontend-test.log"

mkdir -p "${LOG_DIR}"

echo "==> [cloud-env] 前端环境初始化开始"
echo "==> [cloud-env] 工作目录: ${FRONTEND_DIR}"
echo "==> [cloud-env] 日志目录: ${LOG_DIR}"

if [[ ! -d "${FRONTEND_DIR}" ]]; then
  echo "ERROR: 未找到 frontend 目录: ${FRONTEND_DIR}" >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: 未检测到 node，请在云环境中预装 Node.js 20+ 与 npm" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: 未检测到 npm，请在云环境中预装 Node.js 20+ 与 npm" >&2
  exit 1
fi

NODE_VERSION="$(node -v || true)"
NPM_VERSION="$(npm -v || true)"

echo "==> [cloud-env] node 版本: ${NODE_VERSION}"
echo "==> [cloud-env] npm 版本: ${NPM_VERSION}"

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo "0")"
if [[ "${NODE_MAJOR}" -lt 20 ]]; then
  echo "ERROR: Node 版本过低(${NODE_VERSION})，要求 20+" >&2
  exit 1
fi

cd "${FRONTEND_DIR}"

echo "==> [cloud-env] 安装依赖（优先 npm ci）..."
if npm ci 2>&1 | tee "${INSTALL_LOG}"; then
  echo "==> [cloud-env] npm ci 成功"
else
  echo "WARN: npm ci 失败，回退 npm install（常见于 lock 与 package 变化）" | tee -a "${INSTALL_LOG}"
  npm install 2>&1 | tee -a "${INSTALL_LOG}"
fi

echo "==> [cloud-env] 验证 npm run build ..."
npm run build 2>&1 | tee "${BUILD_LOG}"

echo "==> [cloud-env] 验证 npm run test ..."
npm run test 2>&1 | tee "${TEST_LOG}"

echo "==> [cloud-env] 诊断信息"
echo "node: ${NODE_VERSION}"
echo "npm: ${NPM_VERSION}"
echo "npm 缓存目录: ${HOME}/.npm"
echo "依赖目录: ${FRONTEND_DIR}/node_modules"
echo "安装日志: ${INSTALL_LOG}"
echo "构建日志: ${BUILD_LOG}"
echo "测试日志: ${TEST_LOG}"

echo "==> [cloud-env] 前端环境初始化完成"
