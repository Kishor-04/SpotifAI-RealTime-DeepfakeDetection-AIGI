"""
Main application entry point for Flask server.
"""
# Monkey patch for eventlet BEFORE importing anything else
import eventlet
eventlet.monkey_patch()

from app import create_app, socketio
import os

app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=app.config['DEBUG']
    )
