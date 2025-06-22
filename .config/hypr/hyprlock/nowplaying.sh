#!/usr/bin/env bash

# Fungsi potong teks
shorten() {
  local input="$1"
  local max=50
  [[ ${#input} -gt $max ]] && echo "${input:0:$max}…" || echo "$input"
}

# Format detik ke mm:ss
format_time() {
  local T=$1
  printf "%02d:%02d" $((T / 60)) $((T % 60))
}

# Fungsi progress bar rata kiri
progress_bar() {
  local current=$1
  local total=$2
  local width=20  # total panjang bar

  if (( total == 0 )); then
    echo "───●───"
    return
  fi

  local pos=$(( current * width / total ))
  local bar=""
  for ((i = 0; i < width; i++)); do
    if (( i == pos )); then
      bar+="●"
    else
      bar+="─"
    fi
  done
  echo "$bar"
}

# Pastikan playerctl ada
if ! command -v playerctl &> /dev/null; then
  echo "󰎇 Playerctl not installed"
  exit 1
fi

# Status player
status=$(playerctl status 2>/dev/null)
if [[ "$status" == "Playing" || "$status" == "Paused" ]]; then
  title=$(playerctl metadata title 2>/dev/null)
  artist=$(playerctl metadata artist 2>/dev/null)

  # Bersihkan judul dari YouTube
  if [[ "$title" == *" - YouTube Music"* ]]; then
    title="${title%% - YouTube Music*}"
    title=$(echo "$title" | sed 's/^([0-9]\+)\s*//')
    echo "󰎇 $(shorten "$title") • YouTube Music"
  elif [[ "$title" == Spotify* ]]; then
    echo "󰎇 Spotify Web Player"
  else
    if [[ -n "$artist" ]]; then
      echo "󰎇 $(shorten "$title") • $(shorten "$artist")"
    else
      echo "󰎇 $(shorten "$title")"
    fi
  fi

  # Progress bar
  current=$(playerctl position 2>/dev/null | cut -d'.' -f1)
  total_raw=$(playerctl metadata mpris:length 2>/dev/null)
  total=$(( total_raw / 1000000 ))

  echo "$(format_time "$current") $(progress_bar "$current" "$total") $(format_time "$total")"
else
  echo "󰎇 No media playing"
fi
