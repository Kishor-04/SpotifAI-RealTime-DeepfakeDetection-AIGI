"""
Initialize database tables.
Run this script to create all database tables.
"""
from app import create_app, db
from app.models import User, VideoUpload, DetectionSession, FrameResult, AggregatedVerdict, ExtensionLink

def init_database():
    """Create all database tables."""
    app = create_app('development')
    
    with app.app_context():
        print("Creating database tables...")
        
        # Drop all tables (optional - uncomment if you want to reset)
        # db.drop_all()
        # print("Dropped existing tables.")
        
        # Create all tables
        db.create_all()
        print("✓ All tables created successfully!")
        
        # Print created tables
        print("\nCreated tables:")
        print("- users")
        print("- video_uploads")
        print("- detection_sessions")
        print("- frame_results")
        print("- aggregated_verdicts")
        print("- extension_links")
        
        print("\nDatabase initialization complete!")

if __name__ == '__main__':
    init_database()
