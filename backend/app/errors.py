"""
Error handlers for Flask application.
"""
from flask import jsonify
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError


def register_error_handlers(app):
    """Register error handlers for the Flask app."""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': str(error)
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication required'
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({
            'error': 'Forbidden',
            'message': 'You do not have permission to access this resource'
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found'
        }), 404
    
    @app.errorhandler(413)
    def request_entity_too_large(error):
        return jsonify({
            'error': 'Payload Too Large',
            'message': 'The uploaded file exceeds the maximum allowed size'
        }), 413
    
    @app.errorhandler(500)
    def internal_server_error(error):
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        }), 500
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        return jsonify({
            'error': error.name,
            'message': error.description
        }), error.code
    
    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error):
        app.logger.error(f'Database error: {str(error)}')
        return jsonify({
            'error': 'Database Error',
            'message': 'A database error occurred'
        }), 500
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.error(f'Unexpected error: {str(error)}')
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        }), 500
