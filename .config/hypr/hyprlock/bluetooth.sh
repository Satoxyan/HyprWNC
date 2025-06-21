#!/usr/bin/env bash

############ Variables ############
bluetooth_powered=false
bluetooth_connected=false
bluetooth_icon="󰂲"  # Default: mati

############ Check status ##########
# Cek apakah Bluetooth aktif
if bluetoothctl show | grep -q "Powered: yes"; then
  bluetooth_powered=true

  # Cek apakah ada perangkat terhubung
  if bluetoothctl info | grep -q "Connected: yes"; then
    bluetooth_connected=true
  fi
fi

########### Tentukan ikon ##########
if [[ "$bluetooth_powered" == false ]]; then
  bluetooth_icon="󰂲"  # Mati
elif [[ "$bluetooth_connected" == true ]]; then
  bluetooth_icon="󰂱"  # Tersambung
else
  bluetooth_icon="󰂯"  # Hidup tapi tidak tersambung
fi

############# Output ##############
echo "$bluetooth_icon"
