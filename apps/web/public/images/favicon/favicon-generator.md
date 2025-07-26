# Favicon Generation Instructions

Since we need to generate multiple favicon sizes from the shield-icon.svg, here are the steps:

## Option 1: Online Favicon Generator (Recommended)
1. Go to https://realfavicongenerator.net/
2. Upload the `shield-icon.svg` file
3. Download the generated package
4. Replace the files in this directory

## Option 2: Manual Generation with Online Tools
Use an online SVG to PNG converter to create these sizes:
- favicon.ico (multi-size: 16x16, 32x32, 48x48)
- favicon-16x16.png
- favicon-32x32.png
- apple-touch-icon.png (180x180)
- android-chrome-192x192.png
- android-chrome-512x512.png

## Option 3: Using Command Line (if you install ImageMagick)
```bash
# Install ImageMagick first
brew install imagemagick

# Then run these commands:
convert shield-icon.svg -resize 16x16 favicon-16x16.png
convert shield-icon.svg -resize 32x32 favicon-32x32.png
convert shield-icon.svg -resize 180x180 apple-touch-icon.png
convert shield-icon.svg -resize 192x192 android-chrome-192x192.png
convert shield-icon.svg -resize 512x512 android-chrome-512x512.png

# Create favicon.ico with multiple sizes
convert shield-icon.svg -resize 16x16 -resize 32x32 -resize 48x48 favicon.ico
```

## Colors Used:
- Shield Green: #2D5A2B
- Checkmark Light Green: #8BC34A