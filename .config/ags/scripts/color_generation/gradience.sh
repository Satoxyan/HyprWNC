#!/usr/bin/env bash

# Path file
SCSS_FILE="$HOME/.local/state/ags/scss/_material.scss"
PRESET_FILE="$HOME/.config/presets/user/material.json"

# Ambil warna dari _material.scss
PRI=$(grep -Po '\$primary:\s*#\K[0-9A-Fa-f]{6}' "$SCSS_FILE")
ON_PRI=$(grep -Po '\$onPrimary:\s*#\K[0-9A-Fa-f]{6}' "$SCSS_FILE")
SUR=$(grep -Po '\$surface:\s*#\K[0-9A-Fa-f]{6}' "$SCSS_FILE")
ON_SUR=$(grep -Po '\$onSurface:\s*#\K[0-9A-Fa-f]{6}' "$SCSS_FILE")

# Validasi
if [[ -z "$PRI" || -z "$ON_PRI" ]]; then
    echo "Gagal mengambil warna dari $SCSS_FILE"
    exit 1
fi

# Konversi ke lowercase agar konsisten di JSON
PRI_LOWER=$(echo "#$PRI" | tr '[:upper:]' '[:lower:]')
ON_PRI_LOWER=$(echo "#$ON_PRI" | tr '[:upper:]' '[:lower:]')
SURFACE=$(echo "#$SUR" | tr '[:upper:]' '[:lower:]')
ON_SURFACE=$(echo "#$ON_SUR" | tr '[:upper:]' '[:lower:]')

# Debug
echo "Primary      : $PRI_LOWER"
echo "On Primary   : $ON_PRI_LOWER"
echo "Surface  : $SURFACE"
echo "On Surface  : $ON_SURFACE"
echo "Preset Target: $PRESET_FILE"

# Edit JSON preset Gradience
sed -i \
    -e "s/\"accent_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"accent_color\": \"$PRI_LOWER\"/" \
    -e "s/\"accent_bg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"accent_bg_color\": \"$PRI_LOWER\"/" \
    -e "s/\"accent_fg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"accent_fg_color\": \"$ON_PRI_LOWER\"/" \
    -e "s/\"destructive_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"destructive_color\": \"$PRI_LOWER\"/" \
    -e "s/\"destructive_bg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"destructive_bg_color\": \"$PRI_LOWER\"/" \
    -e "s/\"destructive_fg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"destructive_fg_color\": \"$ON_PRI_LOWER\"/" \
    -e "s/\"success_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"success_color\": \"$PRI_LOWER\"/" \
    -e "s/\"success_bg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"success_bg_color\": \"$PRI_LOWER\"/" \
    -e "s/\"success_fg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"success_fg_color\": \"$ON_PRI_LOWER\"/" \
    -e "s/\"warning_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"warning_color\": \"$PRI_LOWER\"/" \
    -e "s/\"warning_bg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"warning_bg_color\": \"$PRI_LOWER\"/" \
    -e "s/\"warning_fg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"warning_fg_color\": \"$ON_PRI_LOWER\"/" \
    -e "s/\"error_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"error_color\": \"$PRI_LOWER\"/" \
    -e "s/\"error_bg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"error_bg_color\": \"$PRI_LOWER\"/" \
    -e "s/\"error_fg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"error_fg_color\": \"$ON_PRI_LOWER\"/" \
    -e "s/\"window_bg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"window_bg_color\": \"$SURFACE\"/" \
    -e "s/\"window_fg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"window_fg_color\": \"$ON_SURFACE\"/" \
    -e "s/\"view_bg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"view_bg_color\": \"$SURFACE\"/" \
    -e "s/\"view_fg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"view_fg_color\": \"$ON_SURFACE\"/" \
    -e "s/\"headerbar_bg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"headerbar_bg_color\": \"$SURFACE\"/" \
    -e "s/\"headerbar_fg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"headerbar_fg_color\": \"$ON_SURFACE\"/" \
    -e "s/\"card_bg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"card_bg_color\": \"$SURFACE\"/" \
    -e "s/\"card_fg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"card_fg_color\": \"$ON_SURFACE\"/" \
    -e "s/\"dialog_bg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"dialog_bg_color\": \"$SURFACE\"/" \
    -e "s/\"dialog_fg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"dialog_fg_color\": \"$ON_SURFACE\"/" \
    -e "s/\"popover_bg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"popover_bg_color\": \"$SURFACE\"/" \
    -e "s/\"popover_fg_color\": *\"#\?[0-9a-fA-F]\{6\}\"/\"popover_fg_color\": \"$ON_SURFACE\"/" \
    "$PRESET_FILE"

echo "Preset berhasil diperbarui dengan warna dari _material.scss."

# (Opsional) Terapkan preset
gradience-cli apply -p "$PRESET_FILE"
