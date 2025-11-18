# Native Host Dockerfile for Deepfake Detection Server
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies for OpenCV, dlib, and deep learning
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    wget \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    libboost-python-dev \
    libopencv-dev \
    python3-opencv \
    && rm -rf /var/lib/apt/lists/*

# Copy root requirements
COPY ../requirements.txt ./requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy DeepfakeBench framework
COPY ../DeepfakeBench ./DeepfakeBench

# Copy native host server
COPY . ./native_host

# Create directories for models
RUN mkdir -p DeepfakeBench/training/weights DeepfakeBench/preprocessing

# Expose WebSocket port
EXPOSE 8765

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Default command
CMD ["python", "native_host/server.py", "--host", "0.0.0.0", "--port", "8765"]
