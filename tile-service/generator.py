from PIL import Image, ImageDraw, ImageFont
import random
import colorsys
import os
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")  # py3.7+
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def rgb_to_luminance(r, g, b):
    """Calculate relative luminance of RGB color for WCAG contrast calculations."""

    def linearize(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)


def contrast_ratio(color1, color2):
    """Calculate contrast ratio between two RGB colors."""
    lum1 = rgb_to_luminance(*color1)
    lum2 = rgb_to_luminance(*color2)
    lighter = max(lum1, lum2)
    darker = min(lum1, lum2)
    return (lighter + 0.05) / (darker + 0.05)


def generate_aaa_colors(hue_degrees=None):
    """Generate random hue colors with AAA contrast (7:1 ratio)."""
    # Generate random hue (0-1) or use provided hue in degrees
    if hue_degrees is not None:
        hue = hue_degrees / 360.0  # Convert degrees to 0-1 range
        # When hue is provided, use deterministic light/dark based on hue range
        # Warm colors (red, orange, yellow) -> dark background
        # Cool colors (green, blue, purple) -> light background
        dark_background = hue < 0.17 or hue > 0.83  # Red/orange/pink range
    else:
        hue = random.random()
        # Random when hue not specified
        dark_background = random.choice([True, False])

    # If hue is provided, use more consistent saturation/value for predictability
    if hue_degrees is not None:
        if dark_background:
            # Dark background, light text
            bg_saturation = 0.7  # Consistent vibrant saturation
            bg_value = 0.2  # Consistent dark value
            text_saturation = 0.3
            text_value = 0.95
        else:
            # Light background, dark text
            bg_saturation = 0.4  # Consistent medium saturation
            bg_value = 0.9  # Consistent light value
            text_saturation = 0.8
            text_value = 0.15
    else:
        # Random saturation/value when hue not specified
        if dark_background:
            # Dark background, light text
            bg_saturation = random.uniform(0.3, 0.9)  # Medium to high saturation
            bg_value = random.uniform(0.1, 0.3)  # Dark value
            text_saturation = random.uniform(0.2, 0.7)  # Lower saturation for contrast
            text_value = random.uniform(0.85, 1.0)  # Very light value
        else:
            # Light background, dark text
            bg_saturation = random.uniform(0.2, 0.6)  # Lower saturation
            bg_value = random.uniform(0.8, 1.0)  # Light value
            text_saturation = random.uniform(0.4, 1.0)  # Higher saturation
            text_value = random.uniform(0.05, 0.2)  # Very dark value

    # Convert HSV to RGB
    bg_rgb = colorsys.hsv_to_rgb(hue, bg_saturation, bg_value)
    text_rgb = colorsys.hsv_to_rgb(hue, text_saturation, text_value)

    bg_color = tuple(int(c * 255) for c in bg_rgb)
    text_color = tuple(int(c * 255) for c in text_rgb)

    # Verify AAA contrast (7:1 minimum)
    contrast = contrast_ratio(bg_color, text_color)

    # If contrast is not AAA, adjust values
    if contrast < 7.0:
        if dark_background:
            # Make text lighter or background darker
            text_value = 1.0
            bg_value = 0.1
        else:
            # Make text darker or background lighter
            text_value = 0.05
            bg_value = 1.0

        # Recalculate colors
        bg_rgb = colorsys.hsv_to_rgb(hue, bg_saturation, bg_value)
        text_rgb = colorsys.hsv_to_rgb(hue, text_saturation, text_value)
        bg_color = tuple(int(c * 255) for c in bg_rgb)
        text_color = tuple(int(c * 255) for c in text_rgb)

    return bg_color, text_color, contrast_ratio(bg_color, text_color)


def get_neogrotesk_font(size):
    """Get NeogroteskSC-Black font from local file - NO FALLBACK to system fonts."""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    font_path = os.path.join(script_dir, "NeogroteskSC-Black.otf")

    if os.path.exists(font_path):
        print(f"✓ Using NeogroteskSC-Black.otf from: {font_path}")
        return ImageFont.truetype(font_path, size)
    else:
        print(f"✗ ERROR: NeogroteskSC-Black.otf not found in: {script_dir}")
        print(
            "Please ensure NeogroteskSC-Black.otf is in the same folder as the script."
        )
        raise FileNotFoundError(f"NeogroteskSC-Black.otf not found in {script_dir}")


def auto_size_font_to_width(draw, text, max_width):
    """Auto-size font to fit text within given width - maximize size."""
    font_size = 10  # Start larger
    best_font = None

    # Find the largest font size that fits
    while font_size <= 1000:  # Much higher limit
        try:
            font = get_neogrotesk_font(font_size)
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]

            if text_width <= max_width:
                best_font = font
                font_size += 5  # Increment by 5 for faster sizing
            else:
                # If we went too big, back down and fine-tune
                if best_font:
                    return best_font
                else:
                    # Fine-tune with smaller increments
                    font_size -= 5
                    while font_size > 1:
                        font = get_neogrotesk_font(font_size)
                        bbox = draw.textbbox((0, 0), text, font=font)
                        text_width = bbox[2] - bbox[0]
                        if text_width <= max_width:
                            return font
                        font_size -= 1
                    break
        except Exception as e:
            print(f"Error loading font at size {font_size}: {e}")
            break

    # Return the best font we found, or minimum size if nothing worked
    return best_font if best_font else get_neogrotesk_font(20)


def get_unique_filename(base_path):
    """Generate a unique filename by adding numbers if file exists."""
    if not os.path.exists(base_path):
        return base_path

    directory = os.path.dirname(base_path)
    filename = os.path.basename(base_path)
    name, ext = os.path.splitext(filename)

    counter = 1
    while True:
        new_name = f"{name}_{counter}{ext}"
        new_path = os.path.join(directory, new_name)

        if not os.path.exists(new_path):
            return new_path

        counter += 1

        if counter > 9999:
            import time

            timestamp = int(time.time())
            new_name = f"{name}_{timestamp}{ext}"
            return os.path.join(directory, new_name)


def create_name_tile(first_name, last_name, output_path="name_tile.png", hue=None, overwrite=False):
    """Create a square name tile with the given specifications.

    Args:
        first_name: First name to display
        last_name: Last name to display
        output_path: Path where the tile should be saved
        hue: Optional hue value (0-360) for color generation
        overwrite: If True, overwrite existing file. If False, create unique filename.
    """
    # Image dimensions
    size = 720

    # Calculate margins (10% on each side)
    margin = int(size * 0.1)  # 72px margins
    available_width = size - (2 * margin)  # 576px available width
    available_height = size - (2 * margin)  # 576px available height

    # Generate colors with same hue and AAA contrast
    bg_color, text_color, contrast = generate_aaa_colors(hue)

    # Create image
    img = Image.new("RGB", (size, size), bg_color)
    draw = ImageDraw.Draw(img)

    print(f"Loading NeogroteskSC-Black.otf font...")

    # Auto-size fonts to fill maximum width (ignore height constraints for maximum size)
    first_font = auto_size_font_to_width(draw, first_name, available_width)
    last_font = auto_size_font_to_width(draw, last_name, available_width)

    print(
        f"First name font size: {first_font.size if hasattr(first_font, 'size') else 'Unknown'}"
    )
    print(
        f"Last name font size: {last_font.size if hasattr(last_font, 'size') else 'Unknown'}"
    )

    # Get actual text bounding boxes for precise positioning
    first_bbox = draw.textbbox((0, 0), first_name, font=first_font)
    last_bbox = draw.textbbox((0, 0), last_name, font=last_font)

    # Calculate dimensions and offsets from bounding boxes
    first_width = first_bbox[2] - first_bbox[0]
    first_height = first_bbox[3] - first_bbox[1]
    first_top_offset = -first_bbox[1]  # Important: handle ascent

    last_width = last_bbox[2] - last_bbox[0]
    last_height = last_bbox[3] - last_bbox[1]
    last_top_offset = -last_bbox[1]  # Important: handle ascent

    # Calculate spacing between lines (5% of image height)
    line_spacing = int(size * 0.05)  # 36px

    # Calculate total text block height using bbox heights
    total_text_height = first_height + line_spacing + last_height

    # Center the ENTIRE text block perfectly in the image
    image_center_y = size // 2  # 360px (center of 720px image)
    block_top = image_center_y - (total_text_height // 2)

    # Position lines using bbox top offsets for precise positioning
    first_x = (size - first_width) // 2
    first_y = block_top + first_top_offset

    last_x = (size - last_width) // 2
    last_y = block_top + first_height + line_spacing + last_top_offset

    print(f"Text dimensions:")
    print(
        f"  First name: {first_width}px x {first_height}px (top_offset: {first_top_offset})"
    )
    print(
        f"  Last name: {last_width}px x {last_height}px (top_offset: {last_top_offset})"
    )
    print(f"  Line spacing: {line_spacing}px")
    print(f"  Total block height: {total_text_height}px")
    print(f"  Available width: {available_width}px")

    print(f"Vertical centering:")
    print(f"  Image center Y: {image_center_y}px")
    print(f"  Block top: {block_top}px")
    print(f"  First name Y: {first_y}px (block_top + {first_top_offset})")
    print(
        f"  Last name Y: {last_y}px (block_top + {first_height} + {line_spacing} + {last_top_offset})"
    )

    print(f"Colors:")
    print(f"  Background: RGB{bg_color}")
    print(f"  Text: RGB{text_color}")
    print(f"  Contrast: {contrast:.2f}:1 ({'AAA' if contrast >= 7.0 else 'Not AAA'})")

    # Draw the text (NeogroteskSC handles small caps automatically)
    draw.text((first_x, first_y), first_name, font=first_font, fill=text_color)
    draw.text((last_x, last_y), last_name, font=last_font, fill=text_color)

    # Determine final output path based on overwrite setting
    if overwrite:
        final_output_path = output_path
    else:
        # Ensure unique filename
        final_output_path = get_unique_filename(output_path)

    # Save image
    img.save(final_output_path, "PNG")

    return {
        "output_path": final_output_path,
        "background_color": bg_color,
        "text_color": text_color,
        "contrast_ratio": contrast,
    }


def main():
    """Main function to generate name tiles."""
    # Get user input
    first_name = input("Enter first name: ").strip()
    last_name = input("Enter last name: ").strip()

    if not first_name or not last_name:
        print("Both first and last names are required!")
        return

    # Generate filename
    filename = f"{first_name}_{last_name}_tile.png"

    # Create the tile
    print(f"\nCreating name tile for {first_name} {last_name}...")

    result = create_name_tile(first_name, last_name, filename)

    if result:
        print(f"\n✓ Name tile created successfully!")
        print(f"  File: {result['output_path']}")
        print(f"  Background: RGB{result['background_color']}")
        print(f"  Text: RGB{result['text_color']}")
        print(f"  Contrast: {result['contrast_ratio']:.2f}:1")


if __name__ == "__main__":
    main()
