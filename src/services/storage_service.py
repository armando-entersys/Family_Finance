"""
Storage service for Google Cloud Storage operations.
Handles image upload with WebP compression.
"""

import io
import uuid
from datetime import datetime
from typing import Optional, Tuple

from PIL import Image
from google.cloud import storage

from src.core.config import get_settings

settings = get_settings()


class StorageService:
    """
    Service for Google Cloud Storage operations.
    Implements stateless file storage as per MD070.
    """

    def __init__(self):
        self.client = storage.Client.from_service_account_json(
            settings.gcs_credentials_path
        )
        self.bucket = self.client.bucket(settings.gcs_bucket_name)

    def _compress_to_webp(
        self,
        image_data: bytes,
        max_size: int = 1024,
        quality: int = 85,
    ) -> bytes:
        """
        Compress image to WebP format.
        Reduces size ~40% vs JPEG.

        Args:
            image_data: Original image bytes
            max_size: Maximum dimension (width or height)
            quality: WebP quality (1-100)

        Returns:
            Compressed WebP image bytes
        """
        img = Image.open(io.BytesIO(image_data))

        # Convert to RGB if necessary (for PNG with alpha)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Resize if larger than max_size
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = tuple(int(dim * ratio) for dim in img.size)
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        # Save as WebP
        output = io.BytesIO()
        img.save(output, format="WebP", quality=quality, optimize=True)
        output.seek(0)

        return output.read()

    def _create_thumbnail(
        self,
        image_data: bytes,
        size: int = 200,
        quality: int = 70,
    ) -> bytes:
        """
        Create a thumbnail image.

        Args:
            image_data: Original image bytes
            size: Thumbnail size (square)
            quality: WebP quality

        Returns:
            Thumbnail WebP bytes
        """
        img = Image.open(io.BytesIO(image_data))

        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Create square thumbnail
        img.thumbnail((size, size), Image.Resampling.LANCZOS)

        output = io.BytesIO()
        img.save(output, format="WebP", quality=quality, optimize=True)
        output.seek(0)

        return output.read()

    async def upload_transaction_image(
        self,
        file_content: bytes,
        family_id: str,
        transaction_id: str,
    ) -> Tuple[str, str]:
        """
        Upload transaction receipt image to GCS.
        Compresses to WebP and creates thumbnail.

        Path structure: uploads/{family_id}/{YYYY}/{MM}/{uuid}.webp

        Args:
            file_content: Raw image bytes
            family_id: Family UUID
            transaction_id: Transaction UUID

        Returns:
            Tuple of (main_url, thumbnail_url)
        """
        now = datetime.utcnow()
        file_uuid = uuid.uuid4()

        # Build path: uploads/{family_id}/{YYYY}/{MM}/{uuid}.webp
        base_path = f"uploads/{family_id}/{now.year}/{now.month:02d}"
        main_filename = f"{file_uuid}.webp"
        thumb_filename = f"{file_uuid}_thumb.webp"

        # Compress images
        main_image = self._compress_to_webp(file_content)
        thumbnail = self._create_thumbnail(file_content)

        # Upload main image
        main_blob = self.bucket.blob(f"{base_path}/{main_filename}")
        main_blob.upload_from_string(main_image, content_type="image/webp")

        # Upload thumbnail
        thumb_blob = self.bucket.blob(f"{base_path}/{thumb_filename}")
        thumb_blob.upload_from_string(thumbnail, content_type="image/webp")

        # Generate public URLs
        main_url = f"https://storage.googleapis.com/{settings.gcs_bucket_name}/{base_path}/{main_filename}"
        thumb_url = f"https://storage.googleapis.com/{settings.gcs_bucket_name}/{base_path}/{thumb_filename}"

        return main_url, thumb_url

    async def delete_file(self, file_url: str) -> bool:
        """
        Delete a file from GCS by URL.

        Args:
            file_url: Full GCS URL

        Returns:
            True if deleted, False if not found
        """
        try:
            # Extract blob name from URL
            prefix = f"https://storage.googleapis.com/{settings.gcs_bucket_name}/"
            if file_url.startswith(prefix):
                blob_name = file_url[len(prefix):]
                blob = self.bucket.blob(blob_name)
                blob.delete()
                return True
        except Exception:
            pass
        return False

    def generate_signed_url(
        self,
        blob_name: str,
        expiration_minutes: int = 60,
    ) -> str:
        """
        Generate a signed URL for private access.

        Args:
            blob_name: Path to blob in bucket
            expiration_minutes: URL validity period

        Returns:
            Signed URL string
        """
        from datetime import timedelta

        blob = self.bucket.blob(blob_name)
        return blob.generate_signed_url(
            version="v4",
            expiration=timedelta(minutes=expiration_minutes),
            method="GET",
        )
