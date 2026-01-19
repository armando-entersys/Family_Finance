"""
Google Cloud Storage client configuration.
Re-exports StorageService for backward compatibility.
"""

from src.services.storage_service import StorageService

__all__ = ["StorageService"]
