FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libfreetype6-dev libjpeg-dev zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY generator.py ./
COPY NeogroteskSC-Black.otf ./
COPY app.py ./

ENV TILE_OUTPUT_DIR=/tmp/tiles
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]