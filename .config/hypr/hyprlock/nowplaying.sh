#!/usr/bin/env bash

# Fungsi potong teks
shorten() {
  local input="$1"
  local max=60
  [[ ${#input} -gt $max ]] && echo "${input:0:$max}…" || echo "$input"
}

# Pastikan playerctl tersedia
if ! command -v playerctl &> /dev/null; then
  echo "Install 'playerctl'"
  exit 1
fi

# Cek status
status=$(playerctl status 2>/dev/null)
if [[ "$status" == "Playing" || "$status" == "Paused" ]]; then
  title=$(playerctl metadata title 2>/dev/null)
  player_name=$(playerctl -l | head -n1)

  if [[ "$title" == *" - YouTube Music"* ]]; then
    title="${title%% - YouTube Music*}"
    echo "$(shorten "$title") • YouTube Music"
  elif [[ "$title" == Spotify* ]]; then
    echo "Spotify Web Player"
  else
    artist=$(playerctl metadata artist 2>/dev/null)
    if [[ -n "$artist" ]]; then
      echo "󰎇 $(shorten "$title") • $(shorten "$artist")"
    else
      echo "󰎇 $(shorten "$title")"
    fi
  fi
else
  echo "󰎇 No media playing"
fi
