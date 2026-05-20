#!/usr/bin/env bash
# GymPal Multi-Agent
#
# Usage:
#   ./scripts/multiagent.sh                          # orchestrator only
#   ./scripts/multiagent.sh web                      # orchestrator + web
#   ./scripts/multiagent.sh web line-bot             # orchestrator + web + line-bot
#   ./scripts/multiagent.sh web line-bot db qa       # all 5 agents
#
# Available agents: web | line-bot | db | qa
#
# Each agent runs in its own named tmux window:
#   orchestrator, web-agent, line-bot-agent, db-agent, qa-agent
#
# Navigate: Ctrl+b <number>  or  Ctrl+b n/p (next/prev)
#
# ── Sending tasks to agents ──────────────────────────────────────────────────
#   ./scripts/send-task.sh web "implement the workout logger component"
#   ./scripts/send-task.sh db  "add isBodyweight column to workout_sets"
#   ./scripts/send-task.sh qa  "run /quality-gate"
#
# send_task <window> <message>
send_task() {
  local window="$1"
  local message="$2"
  tmux send-keys -t "gympal-agents:${window}" "$message" Enter
  sleep 0.2
  tmux send-keys -t "gympal-agents:${window}" "" Enter
}

# agent_status — print one-line status for every active agent window.
# IDLE = Claude Code is waiting for input (no "esc to interrupt" visible).
#
# Usage:  agent_status
agent_status() {
  local session="gympal-agents"
  local windows
  windows=$(tmux list-windows -t "$session" -F "#{window_index}:#{window_name}" 2>/dev/null) || {
    echo "Session '$session' not found."
    return 1
  }

  printf "\n  %-22s %s\n" "AGENT" "STATUS"
  printf "  %-22s %s\n" "----------------------" "----------"

  while IFS=: read -r idx name; do
    [[ "$name" == "👁watch" ]] && continue
    local pane_text
    pane_text=$(tmux capture-pane -t "${session}:${idx}" -p 2>/dev/null)

    if echo "$pane_text" | grep -q "esc to interrupt"; then
      local activity
      activity=$(echo "$pane_text" | grep -E "^\s*(Reading|Writing|Searching|Running|Boondoggling|Tomfoolering|⏺)" | tail -1 | sed 's/^[[:space:]]*//' | cut -c1-50)
      printf "  %-22s \033[33m⏳ WORKING\033[0m  %s\n" "$name" "$activity"
    else
      printf "  %-22s \033[32m✓  IDLE\033[0m\n" "$name"
    fi
  done <<< "$windows"
  echo ""
}

# ── Sourced for helpers? Stop here. ──────────────────────────────────────────
(return 0 2>/dev/null) && return 0

set -e

SESSION="gympal-agents"
ROOT="$HOME/github/saifit"
PROFILES="$HOME/.claude/profiles"

# ── Validate args ─────────────────────────────────────────────────────────────
VALID_AGENTS=("web" "line-bot" "db" "qa")
AGENTS=()

for arg in "$@"; do
  valid=false
  for v in "${VALID_AGENTS[@]}"; do
    [[ "$arg" == "$v" ]] && valid=true && break
  done
  if $valid; then
    AGENTS+=("$arg")
  else
    echo "Unknown agent: '$arg'"
    echo "Available: web | line-bot | db | qa"
    exit 1
  fi
done

# ── Agent working directory ───────────────────────────────────────────────────
agent_cwd() {
  case "$1" in
    web)      echo "$ROOT/apps/web" ;;
    line-bot) echo "$ROOT/apps/line-bot" ;;
    db)       echo "$ROOT/packages/db" ;;
    qa)       echo "$ROOT" ;;
  esac
}

# Emoji window name shown in tmux status bar
agent_window_name() {
  case "$1" in
    orchestrator) echo "🎯orch" ;;
    web)          echo "🌐web" ;;
    line-bot)     echo "💬line" ;;
    db)           echo "🗄db" ;;
    qa)           echo "✅qa" ;;
    *)            echo "$1" ;;
  esac
}

# ── iTerm2 badge + tab color helpers ─────────────────────────────────────────
# Escape codes are silently ignored outside iTerm2 — safe to always emit.
agent_badge() {
  case "$1" in
    orchestrator) echo "🎯 ORCH" ;;
    web)          echo "🌐 WEB" ;;
    line-bot)     echo "💬 LINE" ;;
    db)           echo "🗄 DB" ;;
    qa)           echo "✅ QA" ;;
    *)            echo "$1" ;;
  esac
}

agent_tab_rgb() {
  # Catppuccin Mocha-inspired dark tab backgrounds
  case "$1" in
    orchestrator) echo "18 40 70" ;;   # dark sapphire (Blue)
    web)          echo "20 59 25" ;;   # dark green (Green)
    line-bot)     echo "15 56 51" ;;   # dark teal (Teal)
    db)           echo "40 25 75" ;;   # dark mauve (Mauve)
    qa)           echo "60 33 12" ;;   # dark peach (Peach)
    *)            echo "40 40 40" ;;
  esac
}

# Returns a shell snippet that sets badge + tab color from inside the pane.
iterm2_init_cmd() {
  local label="$1"
  local badge r g b rgb
  badge=$(agent_badge "$label")
  rgb=$(agent_tab_rgb "$label")
  r=$(echo "$rgb" | awk '{print $1}')
  g=$(echo "$rgb" | awk '{print $2}')
  b=$(echo "$rgb" | awk '{print $3}')
  echo "printf '\e]1337;SetBadgeFormat=%s\a' \"\$(printf '%s' '${badge}' | base64)\"; printf '\e]6;1;bg;red;brightness;${r}\a\e]6;1;bg;green;brightness;${g}\a\e]6;1;bg;blue;brightness;${b}\a'"
}

# ── Kill old session ──────────────────────────────────────────────────────────
tmux kill-session -t "$SESSION" 2>/dev/null || true
echo "Starting agents: orchestrator${AGENTS:+ + ${AGENTS[*]}}"

# ── Create session — window 0 is orchestrator ─────────────────────────────────
tmux new-session -d -s "$SESSION" -n "$(agent_window_name orchestrator)" -c "$ROOT"
tmux send-keys -t "$SESSION:$(agent_window_name orchestrator)" \
  "claude --dangerously-skip-permissions --append-system-prompt-file \"$PROFILES/gympal-orchestrator.md\"" Enter

# ── Create a named window for each agent ─────────────────────────────────────
for agent in "${AGENTS[@]}"; do
  wname="$(agent_window_name "$agent")"
  tmux new-window -t "$SESSION" -n "$wname" -c "$(agent_cwd "$agent")"
  tmux send-keys -t "$SESSION:$wname" \
    "claude --dangerously-skip-permissions --append-system-prompt-file \"$PROFILES/gympal-${agent}-agent.md\"" Enter
done

# ── Watch window ──────────────────────────────────────────────────────────────
# display-message needs an attached client; session is still detached here.
# Use tput lines as fallback, default 40 if both fail.
term_height=$(tput lines 2>/dev/null || echo 40)
term_height=${term_height:-40}
min_height=$(( ${#AGENTS[@]} * 6 ))

if [ ${#AGENTS[@]} -gt 0 ] && [ "$term_height" -ge "$min_height" ]; then
  set +e
  watch_ok=true
  tmux new-window -t "$SESSION" -n "👁watch" -c "$ROOT"

  tmux send-keys -t "$SESSION:👁watch.0" \
    "while true; do clear; echo '── $(agent_window_name orchestrator) ──'; tmux capture-pane -pt $SESSION:$(agent_window_name orchestrator) 2>/dev/null; sleep 2; done" Enter

  tmux split-window -t "$SESSION:👁watch.0" -h -c "$ROOT" || watch_ok=false
  if $watch_ok; then
    wname0="$(agent_window_name "${AGENTS[0]}")"
    tmux send-keys -t "$SESSION:👁watch.1" \
      "while true; do clear; echo '── ${wname0} ──'; tmux capture-pane -pt $SESSION:${wname0} 2>/dev/null; sleep 2; done" Enter
  fi

  if $watch_ok; then
    for i in "${!AGENTS[@]}"; do
      [[ $i -eq 0 ]] && continue
      agent="${AGENTS[$i]}"
      wname="$(agent_window_name "$agent")"
      if ! tmux split-window -t "$SESSION:👁watch.$i" -v -c "$ROOT" 2>/dev/null; then
        watch_ok=false
        break
      fi
      tmux send-keys -t "$SESSION:👁watch.$((i+1))" \
        "while true; do clear; echo '── ${wname} ──'; tmux capture-pane -pt $SESSION:${wname} 2>/dev/null; sleep 2; done" Enter
    done
  fi

  if $watch_ok; then
    tmux resize-pane -t "$SESSION:👁watch.0" -x "50%"
    tmux select-pane -t "$SESSION:👁watch.0"
  else
    tmux kill-window -t "$SESSION:👁watch" 2>/dev/null
    echo "  (watch window skipped — terminal too small for ${#AGENTS[@]} stacked panes)"
  fi
  set -e
elif [ ${#AGENTS[@]} -gt 0 ]; then
  echo "  (watch window skipped — terminal height ${term_height} < ${min_height} needed)"
fi

# ── Focus orchestrator ────────────────────────────────────────────────────────
tmux select-window -t "$SESSION:🎯orch"

# ── Print layout ──────────────────────────────────────────────────────────────
echo ""
echo "  Session: gympal-agents"
echo "  Windows:"
echo "    0: 🎯orch  ← type tasks here"
idx=1
for agent in "${AGENTS[@]}"; do
  echo "    $idx: $(agent_window_name "$agent")"
  ((idx++))
done
if tmux list-windows -t "$SESSION" -F '#{window_name}' 2>/dev/null | grep -q 'watch'; then
  echo "    $idx: 👁watch  ← all agents progress"
fi
echo ""
echo "  Ctrl+b <number>  jump to window"
echo "  Ctrl+b n / p     next / prev window"
echo ""

tmux attach-session -t "$SESSION"
