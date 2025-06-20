#!/bin/bash
set -e  # Exit on errors
set -u  # Treat unset variables as errors

# Paths configuration
THUMBNAIL_DIR="$HOME/.cache/ags/user/wallpapers/"
WALLPAPER_DIR="$HOME/Pictures/Wallpapers"

# Ensure the thumbnail directory exists
mkdir -p "$THUMBNAIL_DIR"

# Loop through valid image files including GIFs
for image in "$WALLPAPER_DIR"/*.{jpg,JPG,jpeg,JPEG,png,PNG,gif,GIF}; do
    [ -e "$image" ] || continue

    filename=$(basename "$image")
    thumbnail="$THUMBNAIL_DIR/$filename"

    # Skip if thumbnail already exists
    if [[ -f "$thumbnail" ]]; then
        echo "Skip: Thumbnail already exists for $filename"
        continue
    fi

    echo "Generating thumbnail for $filename..."

    if [[ "$image" =~ \.gif$|\.GIF$ ]]; then
        # Extract first frame of GIF
        magick "$image[0]" -resize 150x90^ -gravity center -extent 150x90 "$thumbnail"
    else
        # Other images
        magick "$image" -resize 150x90^ -gravity center -extent 150x90 "$thumbnail"
    fi
done

echo "Thumbnails generated in $THUMBNAIL_DIR"
