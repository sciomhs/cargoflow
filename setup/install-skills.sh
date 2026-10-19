#!/usr/bin/env bash
# Установка skills для CargoFlow. Запускать на своей машине (здесь, в песочнице Claude, сети нет).
# Нужны: git, node (npx), по желанию — Claude Code CLI и Codex CLI.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/.agents/skills" "$ROOT/.claude/skills"

echo "==> 1. mobile-taste-skill (React Native / Expo, anti-slop) — основной"
if [ ! -d /tmp/mobile-taste-skill ]; then
  git clone --depth 1 https://github.com/draftbit/mobile-taste-skill /tmp/mobile-taste-skill
fi
# в репо проекта — чтобы Codex и Claude Code видели skills из любой сессии
cp -r /tmp/mobile-taste-skill/skills/* "$ROOT/.agents/skills/"
cp -r /tmp/mobile-taste-skill/skills/* "$ROOT/.claude/skills/"

# Claude Code как плагин (если установлен CLI)
if command -v claude >/dev/null 2>&1; then
  claude plugin marketplace add draftbit/mobile-taste-skill || true
  claude plugin install mobile-taste-skill || true
fi

echo "==> 2. taste-skill (веб) — только для веб-дашборда/лендинга, опционально"
# npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend

echo "==> 3. Codex: skills читаются из .agents/skills (см. 'codex --help' / документацию)"
echo "    Для глобальной установки: cp -r $ROOT/.agents/skills/* ~/.codex/skills/ 2>/dev/null || true"

echo "==> 4. Плагины из каталога организации ставятся из чата Claude (карточка):"
echo "    Mobile Design System, react-native-best-practices, Skills For Real React/React Native Engineers"

echo "Готово. Проверка: ls $ROOT/.agents/skills"
