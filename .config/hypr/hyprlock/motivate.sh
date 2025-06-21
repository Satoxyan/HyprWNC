#!/usr/bin/env bash

# Pastikan 'motivate' tersedia
if ! command -v motivate &> /dev/null; then
  echo "Install 'motivate'"
  exit 1
fi

# Ambil quote, hilangkan ANSI, dan pecah tiap ~40 karakter
motivate | sed 's/\x1b\[[0-9;]*m//g' | fold -s -w 70
