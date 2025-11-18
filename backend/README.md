# Flask Backend for SpotifAI

Real-time deepfake detection backend API with JWT authentication, video upload processing, and WebSocket support.

## Features

- **Authentication**: JWT-based auth with email/password and Google OAuth2
- **Video Upload**: 10 FPS frame extraction and processing
- **Real-time Updates**: WebSocket support for live processing status
- **Analytics API**: Session history, frame-level results, aggregated statistics
- **Extension Integration**: Browser extension account linking and data sync
- **Async Processing**: Celery task queue for background video processing

## Tech Stack

- **Framework**: Flask 3.0
- **Database**: PostgreSQL + SQLAlchemy
- **Cache**: Redis
- **WebSockets**: Flask-SocketIO
- **Task Queue**: Celery
- **Auth**: Flask-JWT-Extended

## Installation

1. **Create virtual environment**:
```bash
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize database**:
```bash
flask db init
flask db migrate -m "Initial migration"
flask db upgrade
```

## Running the Application

### 1. Start Redis (required for caching and Celery)
```bash
redis-server
```

### 2. Start Celery worker (for async video processing)
```bash
celery -A celery_worker.celery worker --loglevel=info
```

### 3. Start Flask server
```bash
python run.py
```

Server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/google` - Google OAuth login

### Videos
- `POST /api/videos/upload` - Upload video for processing
- `GET /api/videos` - List user's uploaded videos
- `GET /api/videos/<id>` - Get video details
- `GET /api/videos/<id>/results` - Get detection results
- `DELETE /api/videos/<id>` - Delete video

### Analytics
- `GET /api/analytics/sessions` - List detection sessions
- `GET /api/analytics/sessions/<id>` - Get session details
- `GET /api/analytics/sessions/<id>/frames` - Get frame-level results
- `GET /api/analytics/sessions/<id>/aggregated` - Get aggregated verdicts
- `GET /api/analytics/stats` - Get user statistics

### Extension Integration
- `POST /api/extension/link` - Link extension to account
- `POST /api/extension/unlink` - Unlink extension
- `GET /api/extension/status` - Check link status
- `POST /api/extension/verify` - Verify extension token
- `POST /api/extension/sync` - Sync extension detection data

## WebSocket Events

Connect to `ws://localhost:5000`

- `join_video_room` - Join room for video processing updates
- `leave_video_room` - Leave video room
- `processing_progress` - Receive progress updates

## Database Schema

- **users** - User accounts
- **video_uploads** - Uploaded video files
- **detection_sessions** - Detection sessions (extension + web)
- **frame_results** - Frame-level detection results
- **aggregated_verdicts** - Sliding window verdicts
- **extension_links** - Extension-to-account links

## Development

### Running migrations
```bash
flask db migrate -m "Description"
flask db upgrade
```

### Testing endpoints
Use the Swagger UI at `http://localhost:5000/api/docs`

## Configuration

Key environment variables:

- `SECRET_KEY` - Flask secret key
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET_KEY` - JWT signing key
- `GOOGLE_OAUTH_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_OAUTH_CLIENT_SECRET` - Google OAuth secret

## Architecture

```
backend/
├── app/
│   ├── __init__.py          # App factory
│   ├── models.py            # Database models
│   ├── errors.py            # Error handlers
│   ├── auth/                # Authentication blueprint
│   ├── videos/              # Video processing blueprint
│   ├── analytics/           # Analytics blueprint
│   └── extension/           # Extension API blueprint
├── config.py                # Configuration classes
├── run.py                   # Application entry point
├── celery_worker.py         # Celery worker
└── requirements.txt         # Python dependencies
```

## Integration with Existing System

- **Inference Server**: Connects to existing `native_host/server.py` on port 8765
- **Models**: Uses DeepfakeBench weights
- **Extension**: Separate 1 FPS WebSocket on port 8765 (preserved)
- **Web Uploads**: New 10 FPS processing pipeline

## Next Steps

1. Install frontend dependencies
2. Setup Docker Compose for deployment
3. Implement Google OAuth redirect flow
4. Integrate with existing inference pipeline
5. Add comprehensive error logging
