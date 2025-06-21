#!/usr/bin/env bash

# Pastikan playerctl tersedia
if ! command -v playerctl &> /dev/null; then
  echo "Install 'playerctl'"
  exit 1
fi

# Cek status
status=$(playerctl status 2>/dev/null)
if [[ "$status" == "Playing" || "$status" == "Paused" ]]; then
  title=$(playerctl metadata title 2>/dev/null)
  player_name=$(playerctl -l | head -n1)  # ambil nama player (biasanya chromium atau firefox)

  # Bersihkan title jika dari browser
  if [[ "$title" == *" - YouTube Music"* ]]; then
    title="${title%% - YouTube Music*}"
    echo "$title • YouTube Music"
  elif [[ "$title" == Spotify* ]]; then
    echo "Spotify Web Player"
  else
    # Ambil artist normal kalau tersedia
    artist=$(playerctl metadata artist 2>/dev/null)
    if [[ -n "$artist" ]]; then
      echo "󰎇 $title • $artist"
    else
      echo "󰎇 $title"
    fi
  fi
else
  echo "󰎇 No media playing"
fi
