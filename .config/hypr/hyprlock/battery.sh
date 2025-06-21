#!/usr/bin/env bash

############ Variables ############
enable_battery=false
battery_charging=false
battery_level=0
battery_icon=""

####### Check availability ########
for battery in /sys/class/power_supply/*BAT*; do
  if [[ -f "$battery/uevent" ]]; then
    enable_battery=true
    battery_status=$(cat "$battery/status")
    battery_charging=[[ "$battery_status" == "Charging" ]]
    battery_level=$(cat "$battery/capacity")
    break
  fi
done

########## Choose icon ###########
if [[ $enable_battery == true ]]; then
  if (( battery_level >= 95 )); then
    battery_icon="" # Full
  elif (( battery_level >= 75 )); then
    battery_icon=""
  elif (( battery_level >= 50 )); then
    battery_icon=""
  elif (( battery_level >= 25 )); then
    battery_icon=""
  else
    battery_icon="" # Low
  fi
fi

############# Output #############
if [[ $enable_battery == true ]]; then
  if [[ "$battery_charging" == true ]]; then
    echo -n "(+) "
  fi
  echo "${battery_level}% ${battery_icon}"
fi
