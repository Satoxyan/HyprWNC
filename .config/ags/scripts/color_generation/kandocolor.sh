#!/usr/bin/env bash

# File path
SCSS="$HOME/.local/state/ags/scss/_material.scss"
CONFIG="$HOME/.config/kando/config.json"

SCRIPT_PID=$$

# Kill the kando process except this
pgrep -f kando | while read pid; do
    if [[ "$pid" != "$SCRIPT_PID" ]]; then
        kill "$pid"
    fi
done

sleep 0.2

# Convert HEX to RGBA
hex_to_rgba() {
    local hex=$1
    R_DEC=$((16#${hex:1:2}))
    G_DEC=$((16#${hex:3:2}))
    B_DEC=$((16#${hex:5:2}))
    echo "rgba(${R_DEC}, ${G_DEC}, ${B_DEC}, 1)"
}

# Pick from _material.scss
get_color() {
    grep "$1" "$SCSS" | awk '{print $2}' | tr -d ';'
}

PRIMARY=$(get_color '\$primary:')
SURFACE_CONTAINER_LOW=$(get_color '\$surfaceContainerLow:')
SURFACE=$(get_color '\$surface:')

# Validation
if [[ ! $PRIMARY =~ ^#([A-Fa-f0-9]{6})$ ]] ||
   [[ ! $SURFACE_CONTAINER_LOW =~ ^#([A-Fa-f0-9]{6})$ ]] ||
   [[ ! $SURFACE =~ ^#([A-Fa-f0-9]{6})$ ]]; then
    echo "Salah satu warna tidak valid!"
    exit 1
fi

# Convert RGBA
PRIMARY_RGBA=$(hex_to_rgba "$PRIMARY")
SURFACE_CONTAINER_LOW_RGBA=$(hex_to_rgba "$SURFACE_CONTAINER_LOW")
SURFACE_RGBA=$(hex_to_rgba "$SURFACE")

# Debug
echo "primary -> $PRIMARY_RGBA"
echo "surfaceContainerLow -> $SURFACE_CONTAINER_LOW_RGBA"
echo "surface -> $SURFACE_RGBA"

# change color in config.json
sed -i -E "s#(\"text-color\":\s*\")[^\"]+\"#\1$PRIMARY_RGBA\"#" "$CONFIG"
sed -i -E "s#(\"hover-color\":\s*\")[^\"]+\"#\1$SURFACE_CONTAINER_LOW_RGBA\"#" "$CONFIG"
sed -i -E "s#(\"background-color\":\s*\")[^\"]+\"#\1$SURFACE_CONTAINER_LOW_RGBA\"#" "$CONFIG"
sed -i -E "s#(\"border-color\":\s*\")[^\"]+\"#\1$SURFACE_RGBA\"#" "$CONFIG"

# kando
exec kando