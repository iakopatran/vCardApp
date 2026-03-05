# tile-service/app.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from generator import create_name_tile  # CHANGED: import correct function
from pathlib import Path
import os

app = FastAPI()

# Get allowed origins from environment variable
# In development: localhost URLs
# In production: your actual domain(s)
ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001"
).split(",")

# Add CORS middleware to allow frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Restricted to specific origins for security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use project's tiles directory by default, or env variable if set
default_tiles_dir = Path(__file__).parent.parent / "tiles"
OUT_DIR = Path(os.environ.get("TILE_OUTPUT_DIR", str(default_tiles_dir)))
OUT_DIR.mkdir(parents=True, exist_ok=True)


class TileRequest(BaseModel):
    first: str
    last: str
    hue: int | None = None  # Optional hue in degrees (0-360)
    is_preview: bool = False  # If true, generate preview tile with different filename


@app.post("/tile")
def create_tile(req: TileRequest):
    # Use different filename for previews to avoid overwriting saved tiles
    if req.is_preview:
        filename = f"{req.first}_{req.last}_preview.png"
    else:
        filename = f"{req.first}_{req.last}_tile.png"

    output_path = OUT_DIR / filename

    # Use overwrite=True to allow updating the same preview/tile file
    result = create_name_tile(req.first, req.last, str(output_path), req.hue, overwrite=True)

    # result includes:
    #   output_path
    #   background_color
    #   text_color
    #   contrast_ratio

    # Extract the actual filename from the full path returned by generator
    actual_filename = Path(result["output_path"]).name

    return {
        "ok": True,
        "file_path": f"tiles/{actual_filename}",  # Return the actual filename created
        "background_color": result["background_color"],
        "text_color": result["text_color"],
        "contrast_ratio": result["contrast_ratio"],
    }


@app.delete("/tile/{filename}")
def delete_tile(filename: str):
    """Delete a specific tile file."""
    try:
        file_path = OUT_DIR / filename

        # Security: ensure filename doesn't contain path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            return {"ok": False, "error": "Invalid filename"}

        # Check if file exists
        if not file_path.exists():
            return {"ok": False, "error": "File not found"}

        # Delete the file
        file_path.unlink()

        return {"ok": True, "message": f"Deleted {filename}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# Mount static files AFTER routes to serve generated tiles
app.mount("/tiles", StaticFiles(directory=str(OUT_DIR)), name="tiles")
