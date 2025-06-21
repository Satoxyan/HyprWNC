#!/usr/bin/env bash

############ Variables ############
wifi_connected=false
wifi_strength=0
wifi_icon="󰤮"  # Default: not connected

######### Check WiFi status #########
wifi_status=$(nmcli -t -f WIFI general)

# Pastikan WiFi tidak dimatikan
if [[ "$wifi_status" == "enabled" ]]; then
  connection=$(nmcli -t -f DEVICE,TYPE,STATE dev | grep ":wifi:connected")
  if [[ -n "$connection" ]]; then
    wifi_connected=true
    # Ambil nama interface WiFi (misalnya wlan0 atau wlp3s0)
    wifi_iface=$(echo "$connection" | cut -d: -f1)
    # Ambil kekuatan sinyal dari jaringan yang sedang tersambung
    wifi_strength=$(nmcli -t -f IN-USE,SIGNAL dev wifi list ifname "$wifi_iface" | grep "^\*" | cut -d: -f2)
  fi
fi

######### Tentukan ikon #########
if [[ "$wifi_connected" == true ]]; then
  if (( wifi_strength >= 80 )); then
    wifi_icon="󰤨"  # kuat
  elif (( wifi_strength >= 60 )); then
    wifi_icon="󰤥"
  elif (( wifi_strength >= 40 )); then
    wifi_icon="󰤢"
  else
    wifi_icon="󰤟"  # lemah
  fi
fi

############ Output ############
echo "$wifi_icon"
