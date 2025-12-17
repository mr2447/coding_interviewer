"""
Lambda function triggered by Cognito PostConfirmation event.
This automatically creates a user record in RDS when a user confirms their email.

Cognito will invoke this Lambda automatically after email confirmation.
Event structure:
{
    "version": "1",
    "region": "us-east-2",
    "userPoolId": "us-east-2_xxxxx",
    "userName": "user@example.com",
    "triggerSource": "PostConfirmation_ConfirmSignUp",
    "request": {
        "userAttributes": {
            "sub": "abc123-def-456-ghi",  # This is the userId we need!
            "email": "user@example.com",
            "email_verified": "true"
        }
    },
    "response": {}
}
"""

import logging
import os
import psycopg2
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    """
    Handle Cognito PostConfirmation trigger.
    Creates user record in RDS when user confirms their email.
    """
    logger.info(f"PostConfirmation event received: {event}")
    
    try:
        # Extract user information from Cognito event
        user_attributes = event.get('request', {}).get('userAttributes', {})
        user_id = user_attributes.get('sub')  # Cognito 'sub' claim - this is the unique user ID
        username = user_attributes.get('preferred_username') or user_attributes.get('cognito:username', '')
        
        if not user_id:
            logger.error("No 'sub' attribute found in event. Cannot create user record.")
            return event  # Return event unchanged so Cognito flow continues
        
        logger.info(f"Creating RDS record for user: userId={user_id}, username={username}")
        
        # Create user record in RDS
        success = create_user_in_rds(user_id, username)
        
        if success:
            logger.info(f"Successfully created user record in RDS for {user_id}")
        else:
            logger.warning(f"Failed to create user record in RDS for {user_id}, but continuing Cognito flow")
            # Don't fail the Cognito confirmation - user should still be able to log in
        
        # Return event unchanged (required by Cognito)
        return event
        
    except Exception as e:
        logger.error(f"Error in PostConfirmation handler: {e}", exc_info=True)
        # Return event anyway - don't block Cognito confirmation
        return event


def create_user_in_rds(user_id, username):
    """
    Create a user record in RDS database.
    
    Args:
        user_id: Cognito 'sub' claim (unique user identifier)
        username: User's username
    
    Returns:
        True if successful, False otherwise
    """
    connection = None
    try:
        # Get database credentials from environment variables
        DB_HOST = os.environ.get('DB_Host')
        DB_USER = os.environ.get('DB_User')
        DB_PASS = os.environ.get('DB_Pass')
        DB_NAME = os.environ.get('DB_Name')
        DB_PORT = os.environ.get('DB_Port', '5432')
        
        if not all([DB_HOST, DB_USER, DB_PASS, DB_NAME]):
            logger.warning("RDS credentials not configured, cannot create user record")
            return False
        
        logger.info(f"Connecting to RDS: host={DB_HOST}, db={DB_NAME}")
        connection = psycopg2.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASS,
            database=DB_NAME,
            port=DB_PORT,
            connect_timeout=5
        )
        
        cursor = connection.cursor()
        
        # Insert user record into coder table
        # Using ON CONFLICT to handle race conditions (if trigger fires twice)
        # Note: cognito_sub is UUID type, Cognito returns it as UUID string - PostgreSQL will auto-convert
        cursor.execute(
            """
            INSERT INTO public.coder (cognito_sub, user_name, u_time_stamp)
            VALUES (%s::uuid, %s, CURRENT_TIMESTAMP)
            ON CONFLICT (cognito_sub) 
            DO UPDATE SET 
                user_name = EXCLUDED.user_name,
                u_time_stamp = EXCLUDED.u_time_stamp;
            """,
            (user_id, username)
        )
        
        connection.commit()
        logger.info(f"Successfully created/updated user record for {user_id}")
        return True
        
    except psycopg2.IntegrityError as e:
        # User already exists (shouldn't happen with ON CONFLICT, but just in case)
        if connection:
            connection.rollback()
        logger.info(f"User {user_id} already exists in RDS")
        return True
    except psycopg2.OperationalError as e:
        logger.error(f"Database connection error: {e}")
        return False
    except Exception as e:
        logger.error(f"Error creating user in RDS: {e}", exc_info=True)
        if connection:
            connection.rollback()
        return False
    finally:
        if connection:
            connection.close()

