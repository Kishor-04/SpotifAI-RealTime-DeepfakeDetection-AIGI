#  SpotifAI - Real-Time Deepfake Detection System

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB.svg)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000.svg)](https://flask.palletsprojects.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.8.0-red.svg)](https://pytorch.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED.svg)](https://www.docker.com/)

AI-powered deepfake detection platform with real-time YouTube analysis, web dashboard, and Chrome extension.

---

##  Key Features

-  **Real-Time YouTube Detection** - Chrome extension for live video analysis
-  **Ensemble AI Models** - 3-model majority voting (87%+ accuracy)
-  **Analytics Dashboard** - Session tracking, frame-level analysis, confidence charts
-  **Secure Authentication** - JWT tokens, email verification, Google OAuth
-  **Docker Deployment** - Production-ready containerized setup

---

##  Quick Start

### Docker (Recommended)

```bash
# Clone repository
git clone https://github.com/Kishor-04/RealTime-LiveStreaming-DeepfakeDetection-AIGI.git
cd RealTime-LiveStreaming-DeepfakeDetection-AIGI

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Add model weights to DeepfakeBench/training/weights/

# Start all services
docker-compose up --build

# Access:
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# WebSocket: ws://localhost:8765
```

### Manual Setup

```bash
# 1. Install dependencies
python -m venv venv39
source venv39/bin/activate  # Windows: venv39\Scripts\activate
pip install -r requirements.txt

# 2. Download face landmarks
# Place shape_predictor_68_face_landmarks.dat in DeepfakeBench/preprocessing/

# 3. Start services
# Terminal 1: Backend
cd backend && python run.py

# Terminal 2: Frontend  
cd frontend && npm install && npm run dev

# Terminal 3: AI Server
python native_host/server.py --weights DeepfakeBench/training/weights/effort_clip_L14_trainOn_FaceForensic.pth
```

---

##  Architecture

```

   Browser     Chrome Extension (YouTube integration)

        WebSocket

 Native Host   AI Detection Server (PyTorch + dlib)
   :8765       Face detection, ensemble inference

       
     
   Backend    PostgreSQL
   :5000           
 Flask + JWT       
                Redis   
     
       

  Frontend     React Dashboard
   :3000       Analytics, Upload, Settings

```

---

##  Project Structure

```
RealTime-LiveStreaming-DeepfakeDetection-AIGI/
 backend/              # Flask REST API
    app/
       auth/        # Authentication routes
       videos/      # Video processing
       analytics/   # Analytics endpoints
       models.py    # Database models
    run.py
    Dockerfile

 frontend/             # React Dashboard
    src/
       pages/       # Dashboard, Upload, Analytics
       components/  # Reusable components
       contexts/    # Auth context
    Dockerfile
    nginx.conf

 native_host/          # AI Detection Server
    server.py        # WebSocket server
    Dockerfile

 extension/            # Chrome Extension
    manifest.json
    content_script.js
    popup.html

 DeepfakeBench/        # AI Framework
    training/
       weights/     # .pth model files
       detectors/
    preprocessing/   # Face landmarks

 docker-compose.yml
 requirements.txt
 .env.example
```

---

##  Technology Stack

**Backend:** Flask, SQLAlchemy, PostgreSQL, Redis, Celery, JWT  
**Frontend:** React 19, Vite, TailwindCSS, Chart.js, Socket.IO  
**AI/ML:** PyTorch 2.8, CLIP, dlib, OpenCV, DeepfakeBench  
**Extension:** Manifest V3, WebSocket Client  
**DevOps:** Docker, Docker Compose, Nginx

---

##  Chrome Extension

### Installation
1. Open chrome://extensions/
2. Enable **Developer mode**
3. Click **Load unpacked**  Select extension/ folder

### Usage
1. Click extension icon  **Link Account**
2. Login to dashboard  Generate extension token
3. Paste token in extension settings
4. Open YouTube video  Click floating badge
5. View real-time deepfake detection results

### Features
-  1 FPS frame analysis
-  Bounding boxes on detected faces
-  10-second rolling verdicts
-  Draggable floating badge
-  Session sync with dashboard

---

##  Web Dashboard

**Pages:**
- **Dashboard** - Recent sessions, quick stats
- **Upload** - Video upload with async processing
- **Analytics** - Session history with filters
- **Session Details** - Frame-by-frame analysis, charts
- **Settings** - Account management, extension token

**Authentication:**
- Email/Password with OTP verification
- Google OAuth integration
- JWT access + refresh tokens

---

##  API Endpoints

### Authentication
- POST /api/auth/signup - Register with email verification
- POST /api/auth/verify-email - Verify OTP
- POST /api/auth/login - Login
- POST /api/auth/google - Google OAuth

### Videos
- POST /api/videos/upload - Upload video for analysis
- GET /api/videos/sessions - Get user sessions
- GET /api/videos/sessions/:id - Get session details

### Extension
- POST /api/extension/link - Link extension to account
- POST /api/extension/session - Create detection session

---

##  Configuration

### Environment Variables (.env)

```env
# Database
POSTGRES_DB=spotifai_db
POSTGRES_USER=spotifai_user
POSTGRES_PASSWORD=your_password

# Flask
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-key

# Email (Gmail)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-secret
```

### Model Configuration

```bash
# Single model
python native_host/server.py --weights path/to/model.pth

# Ensemble (3 models)
python native_host/server.py --ensemble --weights_dir DeepfakeBench/training/weights/
```

---

##  Troubleshooting

**Issue:** WebSocket connection failed  
**Solution:** Ensure native host server is running on ws://127.0.0.1:8765

**Issue:** No face detected  
**Solution:** Switch to 68-point landmarks (more robust than 81-point)

**Issue:** CUDA out of memory  
**Solution:** Use single model instead of ensemble

**Issue:** Extension not working  
**Solution:** Reload extension, check server status, refresh YouTube page

---

##  Contributing

1. Fork the repository
2. Create feature branch (git checkout -b feature/AmazingFeature)
3. Commit changes (git commit -m 'Add AmazingFeature')
4. Push to branch (git push origin feature/AmazingFeature)
5. Open Pull Request

---

##  License

MIT License - see [LICENSE](LICENSE) file

---

##  Contact

**Kishor** - [@Kishor-04](https://github.com/Kishor-04)

**Repository:** [GitHub](https://github.com/Kishor-04/RealTime-LiveStreaming-DeepfakeDetection-AIGI)

---

##  Acknowledgments

- [DeepfakeBench](https://github.com/SCLBD/DeepfakeBench) - Detection framework
- [OpenAI CLIP](https://github.com/openai/CLIP) - Vision-language model
- [dlib](http://dlib.net/) - Face detection and landmarks
- FaceForensics++ dataset

---

**Happy Detecting**
