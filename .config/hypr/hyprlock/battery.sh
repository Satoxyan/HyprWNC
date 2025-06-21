#!/usr/bin/env bash

############ Variables ############
enable_battery=false
battery_charging=false
battery_level=0
battery_icon=""
charging_icon=""

####### Check availability ########
for battery in /sys/class/power_supply/*BAT*; do
  if [[ -f "$battery/uevent" ]]; then
    enable_battery=true
    battery_status=$(cat "$battery/status")
    if [[ "$battery_status" == "Charging" ]]; then
      battery_charging=true
    fi
    battery_level=$(cat "$battery/capacity")
    break
  fi
done

########## Choose icon ###########
if [[ $enable_battery == true ]]; then
  if (( battery_level >= 100 )); then
    battery_icon="󰁹"
  elif (( battery_level >= 90 )); then
    battery_icon="󰂂"
  elif (( battery_level >= 80 )); then
    battery_icon="󰂁"
  elif (( battery_level >= 70 )); then
    battery_icon="󰂀"
  elif (( battery_level >= 60 )); then
    battery_icon="󰁿"
  elif (( battery_level >= 50 )); then
    battery_icon="󰁾"
  elif (( battery_level >= 40 )); then
    battery_icon="󰁽"
  elif (( battery_level >= 30 )); then
    battery_icon="󰁼"
  elif (( battery_level >= 20 )); then
    battery_icon="󰁻"
  else
    battery_icon="󰁺"
  fi

  if [[ "$battery_charging" == true ]]; then
    charging_icon="󱐋"
  fi
fi

############# Output #############
if [[ $enable_battery == true ]]; then
  echo "${battery_level}% ${battery_icon}${charging_icon}"
fi
