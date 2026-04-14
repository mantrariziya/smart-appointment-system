"""
Shared Firebase Firestore client
Single initialization point for all firebase modules
"""
import os
import json
from google.cloud import firestore
from google.oauth2 import service_account


def get_firestore_client():
    """Initialize and return Firestore client using service account from .env"""
    try:
        service_account_path = os.getenv(
            'FIREBASE_SERVICE_ACCOUNT_PATH',
            'loginapp-e7f18-firebase-adminsdk-fbsvc-766ae828f0.json'
        )

        if not os.path.exists(service_account_path):
            return None

        with open(service_account_path) as f:
            sa_info = json.load(f)

        project_id = sa_info.get('project_id')
        credentials = service_account.Credentials.from_service_account_file(service_account_path)
        db = firestore.Client(credentials=credentials, project=project_id)
        return db

    except Exception as e:
        return None
