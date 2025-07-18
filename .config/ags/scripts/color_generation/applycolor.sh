#!/usr/bin/env bash

XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"
CONFIG_DIR="$XDG_CONFIG_HOME/ags"
CACHE_DIR="$XDG_CACHE_HOME/ags"
STATE_DIR="$XDG_STATE_HOME/ags"

term_alpha=100 #Set this to < 100 make all your terminals transparent
# sleep 0 # idk i wanted some delay or colors dont get applied properly
if [ ! -d "$CACHE_DIR"/user/generated ]; then
  mkdir -p "$CACHE_DIR"/user/generated
fi
cd "$CONFIG_DIR" || exit

colornames=''
colorstrings=''
colorlist=()
colorvalues=()

# wallpath=$(swww query | head -1 | awk -F 'image: ' '{print $2}')
# wallpath_png="$CACHE_DIR/user/generated/hypr/lockscreen.png"
# convert "$wallpath" "$wallpath_png"
# wallpath_png=$(echo "$wallpath_png" | sed 's/\//\\\//g')
# wallpath_png=$(sed 's/\//\\\\\//g' <<< "$wallpath_png")

transparentize() {
  local hex="$1"
  local alpha="$2"
  local red green blue

  red=$((16#${hex:1:2}))
  green=$((16#${hex:3:2}))
  blue=$((16#${hex:5:2}))

  printf 'rgba(%d, %d, %d, %.2f)\n' "$red" "$green" "$blue" "$alpha"
}

get_light_dark() {
  lightdark=""
  if [ ! -f "$STATE_DIR/user/colormode.txt" ]; then
    echo "" >"$STATE_DIR/user/colormode.txt"
  else
    lightdark=$(sed -n '1p' "$STATE_DIR/user/colormode.txt")
  fi
  echo "$lightdark"
}

apply_fuzzel() {
  # Check if template exists
  if [ ! -f "scripts/templates/fuzzel/fuzzel.theme" ]; then
    echo "Template file not found for Fuzzel. Skipping that."
    return
  fi
  # Copy template
  cp "scripts/templates/fuzzel/fuzzel.theme" "$XDG_CONFIG_HOME"/fuzzel/fuzzel.theme
  # Apply colors
  for i in "${!colorlist[@]}"; do
    sed -i "s/{{ ${colorlist[$i]} }}/${colorvalues[$i]#\#}/g" "$XDG_CONFIG_HOME"/fuzzel/fuzzel.theme
  done
}

apply_term() {
  # Check if terminal escape sequence template exists
  if [ ! -f "scripts/templates/terminal/sequences.txt" ]; then
    echo "Template file not found for Terminal. Skipping that."
    return
  fi
  # Copy template
  mkdir -p "$CACHE_DIR"/user/generated/terminal
  cp "scripts/templates/terminal/sequences.txt" "$CACHE_DIR"/user/generated/terminal/sequences.txt
  # Apply colors
  for i in "${!colorlist[@]}"; do
    sed -i "s/${colorlist[$i]} #/${colorvalues[$i]#\#}/g" "$CACHE_DIR"/user/generated/terminal/sequences.txt
  done

  sed -i "s/\$alpha/$term_alpha/g" "$CACHE_DIR/user/generated/terminal/sequences.txt"

  for file in /dev/pts/*; do
    if [[ $file =~ ^/dev/pts/[0-9]+$ ]]; then
      cat "$CACHE_DIR"/user/generated/terminal/sequences.txt >"$file"
    fi
  done
}

apply_hyprland() {
  # Check if template exists
  if [ ! -f "scripts/templates/hypr/hyprland/colors.conf" ]; then
    echo "Template file not found for Hyprland colors. Skipping that."
    return
  fi
  # Copy template
  mkdir -p "$CACHE_DIR"/user/generated/hypr/hyprland
  cp "scripts/templates/hypr/hyprland/colors.conf" "$CACHE_DIR"/user/generated/hypr/hyprland/colors.conf
  # Apply colors
  for i in "${!colorlist[@]}"; do
    sed -i "s/{{ ${colorlist[$i]} }}/${colorvalues[$i]#\#}/g" "$CACHE_DIR"/user/generated/hypr/hyprland/colors.conf
  done

  cp "$CACHE_DIR"/user/generated/hypr/hyprland/colors.conf "$XDG_CONFIG_HOME"/hypr/hyprland/colors.conf
}

apply_hyprlock() {
  # Check if template exists
  if [ ! -f "scripts/templates/hypr/hyprlock.conf" ]; then
    echo "Template file not found for hyprlock. Skipping that."
    return
  fi
  
  # Copy template
  mkdir -p "$CACHE_DIR"/user/generated/hypr/
  cp "scripts/templates/hypr/hyprlock.conf" "$CACHE_DIR"/user/generated/hypr/hyprlock.conf

  # Process each color
  for i in "${!colorlist[@]}"; do
    hex_color="${colorvalues[$i]#\#}"  # Remove # from hex
    
    # Replace HEX placeholder
    sed -i "s/({{ ${colorlist[$i]} }})/(${hex_color})/g" "$CACHE_DIR"/user/generated/hypr/hyprlock.conf
    
    # Convert and replace RGBA if hex is valid
    if [[ "$hex_color" =~ ^[0-9A-Fa-f]{6}$ ]]; then
      r=$((0x${hex_color:0:2}))
      g=$((0x${hex_color:2:2}))
      b=$((0x${hex_color:4:2}))
      rgba_color="($r, $g, $b, 1.0)"
      
      sed -i "s/({{ ${colorlist[$i]}_rgba }})/${rgba_color}/g" "$CACHE_DIR"/user/generated/hypr/hyprlock.conf
    fi
  done

  cp "$CACHE_DIR"/user/generated/hypr/hyprlock.conf "$XDG_CONFIG_HOME"/hypr/hyprlock.conf
}

apply_ags_sourceview() {
  # Check if template file exists
  if [ ! -f "scripts/templates/ags/sourceviewtheme.xml" ]; then
    echo "Template file not found for ags sourceview. Skipping that."
    return
  fi
  # Copy template
  mkdir -p "$CACHE_DIR"/user/generated/ags
  cp "scripts/templates/ags/sourceviewtheme.xml" "$CACHE_DIR"/user/generated/ags/sourceviewtheme.xml
  cp "scripts/templates/ags/sourceviewtheme-light.xml" "$CACHE_DIR"/user/generated/ags/sourceviewtheme-light.xml
  # Apply colors
  for i in "${!colorlist[@]}"; do
    sed -i "s/{{ ${colorlist[$i]} }}/#${colorvalues[$i]#\#}/g" "$CACHE_DIR"/user/generated/ags/sourceviewtheme.xml
    sed -i "s/{{ ${colorlist[$i]} }}/#${colorvalues[$i]#\#}/g" "$CACHE_DIR"/user/generated/ags/sourceviewtheme-light.xml
  done

  cp "$CACHE_DIR"/user/generated/ags/sourceviewtheme.xml "$XDG_CONFIG_HOME"/ags/assets/themes/sourceviewtheme.xml
  cp "$CACHE_DIR"/user/generated/ags/sourceviewtheme-light.xml "$XDG_CONFIG_HOME"/ags/assets/themes/sourceviewtheme-light.xml
}

apply_lightdark() {
  lightdark=$(get_light_dark)
  if [ "$lightdark" = "light" ]; then
    gsettings set org.gnome.desktop.interface color-scheme 'prefer-light'
  else
    gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'
  fi
}

apply_gtk() {
  # Check if template exists
  if [ ! -f "scripts/templates/gtk/gtk-colors.css" ]; then
    echo "Template file not found for gtk colors. Skipping that."
    return
  fi
  # Copy template
  mkdir -p "$CACHE_DIR"/user/generated/gtk/
  cp "scripts/templates/gtk/gtk-colors.css" "$CACHE_DIR"/user/generated/gtk/gtk-colors.css
  # Apply colors
  for i in "${!colorlist[@]}"; do
    sed -i "s/{{ ${colorlist[$i]} }}/#${colorvalues[$i]#\#}/g" "$CACHE_DIR"/user/generated/gtk/gtk-colors.css
  done

  # Apply to both gtk3 and gtk4
  cp "$CACHE_DIR"/user/generated/gtk/gtk-colors.css "$XDG_CONFIG_HOME"/gtk-3.0/gtk.css
  cp "$CACHE_DIR"/user/generated/gtk/gtk-colors.css "$XDG_CONFIG_HOME"/gtk-4.0/gtk.css

  # And set the right variant of adw gtk3
  lightdark=$(get_light_dark)
  if [ "$lightdark" = "light" ]; then
    gsettings set org.gnome.desktop.interface gtk-theme 'adw-gtk3'
  else
    gsettings set org.gnome.desktop.interface gtk-theme adw-gtk3-dark
  fi
}

apply_ags() {
  agsv1 run-js "handleStyles(false);"
  agsv1 run-js 'openColorScheme.value = true; Utils.timeout(2000, () => openColorScheme.value = false);'
}

apply_qt() {
  sh "$CONFIG_DIR/scripts/kvantum/materialQT.sh"          # generate kvantum theme
  python "$CONFIG_DIR/scripts/kvantum/changeAdwColors.py" # apply config colors
}

colornames=$(cat $STATE_DIR/scss/_material.scss | cut -d: -f1)
colorstrings=$(cat $STATE_DIR/scss/_material.scss | cut -d: -f2 | cut -d ' ' -f2 | cut -d ";" -f1)
IFS=$'\n'
colorlist=($colornames)     # Array of color names
colorvalues=($colorstrings) # Array of color values

apply_ags &
apply_ags_sourceview &
apply_hyprland &
apply_hyprlock &
apply_lightdark &
apply_gtk &
apply_qt &
apply_fuzzel &
apply_term &

#Executing any script that needs to be run after colors are applied
cleanup() {
    "$HOME/.config/ags/scripts/color_generation/cavacolor.sh"
    "$HOME/.config/ags/scripts/color_generation/kandocolor.sh"
}

trap cleanup EXIT
