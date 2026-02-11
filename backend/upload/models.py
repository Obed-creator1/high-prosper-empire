# backend/upload/models.py
import os
import uuid
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.core.files.storage import default_storage
from django.dispatch import receiver
from django.db.models.signals import post_delete, pre_save

from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile

# Optional: pip install python-clamav (for virus scanning)
try:
    import pyclamd
    CLAMD_AVAILABLE = True
except ImportError:
    CLAMD_AVAILABLE = False


def get_upload_path(instance, filename):
    """
    Dynamic path: uploads/<app>/<model>/<year>/<month>/<uuid>_<filename>
    """
    app = instance._meta.app_label
    model = instance._meta.model_name
    ext = os.path.splitext(filename)[1].lower()
    unique = f"{uuid.uuid4().hex}{ext}"
    return f"uploads/{app}/{model}/{timezone.now():%Y/%m}/{unique}"


class UploadMixin(models.Model):
    """
    Common fields & logic for all upload models
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_uploads'
    )
    file = models.FileField(upload_to=get_upload_path, verbose_name="File")
    original_name = models.CharField(max_length=255, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    size_bytes = models.PositiveBigIntegerField(default=0)
    uploaded_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True, help_text="Optional expiration date")

    class Meta:
        abstract = True
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.original_name or self.file.name} ({self.mime_type})"

    @property
    def url(self):
        return self.file.url if self.file else ""

    @property
    def is_expired(self):
        return self.expires_at and self.expires_at < timezone.now()

    def save(self, *args, **kwargs):
        if not self.original_name and self.file:
            self.original_name = self.file.name

        if self.file:
            self.size_bytes = self.file.size
            self.mime_type = getattr(self.file.file, 'content_type', '') or \
                             self.file.name.split('.')[-1].lower()

        super().save(*args, **kwargs)


# ──────────────────────────────────────────────────────────────
# IMAGE PROCESSING MIXIN (compression + resize + crop)
# ──────────────────────────────────────────────────────────────

class ImageProcessingMixin:
    """
    Mixin for automatic image optimization
    - Resize to max 1920×1920
    - Compress to 75–85% quality
    - Smart center crop for avatars/profile pics
    """

    def save(self, *args, **kwargs):
        if self.file and self.file.name.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            img = Image.open(self.file)
            img = img.convert('RGB')  # remove alpha if present

            # Resize (keep aspect ratio)
            max_size = (1920, 1920)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)

            # Optional: center crop to square (good for avatars)
            if hasattr(self, 'crop_to_square') and self.crop_to_square:
                width, height = img.size
                size = min(width, height)
                left = (width - size) // 2
                top = (height - size) // 2
                img = img.crop((left, top, left + size, top + size))

            # Save with compression
            output = BytesIO()
            img.save(output, format='WEBP', quality=85, optimize=True)
            output.seek(0)

            new_name = os.path.splitext(self.file.name)[0] + '.webp'
            self.file.save(new_name, ContentFile(output.read()), save=False)

        super().save(*args, **kwargs)


# ──────────────────────────────────────────────────────────────
# MAIN GENERIC UPLOAD MODEL
# ──────────────────────────────────────────────────────────────

class UploadedFile(UploadMixin, ImageProcessingMixin):
    """
    Generic upload model with image optimization
    """
    title = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    tags = models.CharField(max_length=255, blank=True)

    # Type flags (auto-detected)
    is_image = models.BooleanField(default=False)
    is_video = models.BooleanField(default=False)
    is_audio = models.BooleanField(default=False)
    is_document = models.BooleanField(default=False)

    # For temporary uploads
    temporary = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Uploaded File"
        verbose_name_plural = "Uploaded Files"
        indexes = [
            models.Index(fields=['user', 'uploaded_at']),
            models.Index(fields=['mime_type']),
        ]

    def save(self, *args, **kwargs):
        # Auto-detect type
        if self.mime_type:
            mt = self.mime_type.lower()
            self.is_image = mt.startswith('image/')
            self.is_video = mt.startswith('video/')
            self.is_audio = mt.startswith('audio/')
            self.is_document = mt in [
                'application/pdf', 'text/plain', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]

        # Auto-expire temporary files after 24h
        if self.temporary and not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)

        super().save(*args, **kwargs)


# ──────────────────────────────────────────────────────────────
# SPECIFIC MODELS
# ──────────────────────────────────────────────────────────────

class ProfilePicture(UploadedFile):
    crop_to_square = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Profile Picture"
        verbose_name_plural = "Profile Pictures"
        # Remove constraints list completely


class ChatAttachment(UploadedFile):
    """
    Files attached to chat messages
    """
    message = models.ForeignKey(
        'users.ChatMessage',  # adjust app name if needed
        on_delete=models.CASCADE,
        related_name='attachments'
    )


class VideoRecording(UploadedFile):
    """
    Recorded video files (e.g. short clips, stories)
    """
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    thumbnail = models.ImageField(upload_to=get_upload_path, null=True, blank=True)


class AudioRecording(UploadedFile):
    """
    Recorded audio files (voice messages, etc.)
    """
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)


class StickerFile(UploadedFile):
    """
    Stickers (images only)
    """
    is_public = models.BooleanField(default=True)
    category = models.CharField(max_length=100, blank=True)
    emoji = models.CharField(max_length=10, blank=True)


# ──────────────────────────────────────────────────────────────
# SIGNALS: Auto-delete files from S3/local when model deleted
# ──────────────────────────────────────────────────────────────

@receiver(pre_save, sender=UploadedFile)
def auto_delete_old_file_on_change(sender, instance, **kwargs):
    """
    Delete old file when new file is uploaded (for profile picture, etc.)
    """
    if not instance.pk:
        return False

    try:
        old_file = sender.objects.get(pk=instance.pk).file
    except sender.DoesNotExist:
        return False

    new_file = instance.file
    if old_file and old_file != new_file:
        if os.path.isfile(old_file.path):
            os.remove(old_file.path)


@receiver(post_delete, sender=UploadedFile)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    """
    Delete file from storage when model is deleted
    """
    if instance.file:
        if os.path.isfile(instance.file.path):
            os.remove(instance.file.path)


# ──────────────────────────────────────────────────────────────
# OPTIONAL: Virus scanning hook (using ClamAV)
# ──────────────────────────────────────────────────────────────

@receiver(pre_save, sender=UploadedFile)
def scan_for_viruses(sender, instance, **kwargs):
    if not CLAMD_AVAILABLE or not instance.file:
        return

    try:
        cd = pyclamd.ClamdAgnostic()
        result = cd.scan_stream(instance.file.read())
        instance.file.seek(0)  # reset file pointer

        if result is not None:
            raise ValidationError(f"Virus detected: {result}")
    except Exception as e:
        raise ValidationError(f"Antivirus scan failed: {str(e)}")