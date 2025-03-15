#!/bin/bash
set -e  # Exit on errors
set -u  # Treat unset variables as errors

# Paths configuration
THUMBNAIL_DIR="$HOME/Pictures/Wallpapers/thumbnails"
WALLPAPER_DIR="$HOME/Pictures/Wallpapers"

# Ensure the thumbnail directory exists
mkdir -p "$THUMBNAIL_DIR"

# Loop through valid image files including GIFs
for image in "$WALLPAPER_DIR"/*.{jpg,JPG,jpeg,JPEG,png,PNG,gif,GIF}; do
    # Check if the file exists (handles the case where no files match the pattern)
    [ -e "$image" ] || continue

    filename=$(basename "$image")

    # If the image is a GIF, extract the first frame
    if [[ "$image" =~ \.gif$|\.GIF$ ]]; then
        # Extract the first frame and create a thumbnail
        magick "$image[0]" -resize 150x90^ -gravity center -extent 150x90 "$THUMBNAIL_DIR/$filename"
    else
        # For non-GIF images, just create a thumbnail
        magick "$image" -resize 150x90^ -gravity center -extent 150x90 "$THUMBNAIL_DIR/$filename"
    fi
done

echo "Thumbnails generated in $THUMBNAIL_DIR"