"""
Celery worker configuration.
"""
from app import create_app
from app.videos.tasks import celery
import os

app = create_app(os.getenv('FLASK_ENV', 'development'))

# Configure Celery from Flask config
celery.conf.update(
    broker_url=app.config['CELERY_BROKER_URL'],
    result_backend=app.config['CELERY_RESULT_BACKEND'],
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)

if __name__ == '__main__':
    celery.start()
