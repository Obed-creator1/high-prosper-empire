# backend/upload/serializers.py
from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from .models import UploadedFile, ProfilePicture, ChatAttachment, VideoRecording, AudioRecording, StickerFile


class UploadedFileSerializer(serializers.ModelSerializer):
    """
    Base serializer for UploadedFile and its subclasses.
    Handles common fields + dynamic URL and human-readable size.
    """
    url = serializers.SerializerMethodField(help_text="Public or signed URL to the file")
    file_size_display = serializers.SerializerMethodField(help_text="Human-readable file size")
    uploaded_by = serializers.SerializerMethodField(help_text="Username of uploader if available")

    class Meta:
        model = UploadedFile
        fields = [
            'id',
            'user',
            'uploaded_by',
            'file',
            'original_name',
            'mime_type',
            'size_bytes',
            'file_size_display',
            'is_image', 'is_video', 'is_audio', 'is_document',
            'title', 'description', 'tags',
            'uploaded_at', 'expires_at',
            'url',
        ]
        read_only_fields = [
            'id', 'mime_type', 'size_bytes', 'file_size_display',
            'is_image', 'is_video', 'is_audio', 'is_document',
            'uploaded_at', 'url', 'uploaded_by',
        ]

    def get_url(self, obj):
        """
        Returns the file URL — supports signed URLs for private S3 buckets
        """
        if not obj.file:
            return ""
        request = self.context.get('request')
        if request and hasattr(obj.file.storage, 'url'):
            # For S3 private buckets — generate signed URL (expires in 1 hour)
            if hasattr(obj.file.storage, 'querystring_expire'):
                return obj.file.storage.url(obj.file.name, expire=3600)
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url

    def get_file_size_display(self, obj):
        """Human-readable file size (e.g. 2.3 MB)"""
        if not obj.size_bytes:
            return "0 B"
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if obj.size_bytes < 1024:
                return f"{obj.size_bytes:.1f} {unit}"
            obj.size_bytes /= 1024
        return f"{obj.size_bytes:.1f} PB"

    def get_uploaded_by(self, obj):
        """Display username or fallback"""
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return "Anonymous"

    def create(self, validated_data):
        """Virus scan hook + user assignment"""
        file_obj = validated_data.get('file')
        if file_obj and CLAMD_AVAILABLE:
            file_obj.seek(0)
            scan_result = pyclamd.ClamdAgnostic().scan_stream(file_obj.read())
            file_obj.seek(0)
            if scan_result:
                raise serializers.ValidationError(_("File contains potential virus/malware"))

        # Assign current user if not provided
        if 'user' not in validated_data and self.context['request'].user.is_authenticated:
            validated_data['user'] = self.context['request'].user

        return super().create(validated_data)


class ProfilePictureSerializer(UploadedFileSerializer):
    """
    Serializer specifically for profile pictures.
    Enforces user relation and adds avatar-specific logic.
    """
    class Meta:
        model = ProfilePicture
        fields = UploadedFileSerializer.Meta.fields + ['user']
        read_only_fields = UploadedFileSerializer.Meta.read_only_fields + ['user']

    # backend/upload/views.py – ProfilePictureUploadView.post
    def post(self, request):
        profile_pic, created = ProfilePicture.objects.get_or_create(user=request.user)

        # FIX: Pass request in context
        serializer = ProfilePictureSerializer(
            profile_pic,
            data=request.data,
            partial=True,
            context={'request': request}   # ← ADD THIS LINE
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # upload/serializers.py – ProfilePictureSerializer
    def validate(self, attrs):
        """
        Ensure only one profile picture per user (extra safety)
        """
        request = self.context.get('request')
        user = attrs.get('user') or (request.user if request and request.user.is_authenticated else None)

        if not user:
            raise serializers.ValidationError("User is required for profile picture upload")

        existing = ProfilePicture.objects.filter(user=user).exclude(id=self.instance.id if self.instance else None)
        if existing.exists():
            raise serializers.ValidationError(_("This user already has a profile picture"))

        return attrs


class ChatAttachmentSerializer(UploadedFileSerializer):
    class Meta:
        model = ChatAttachment
        fields = UploadedFileSerializer.Meta.fields + ['message']
        read_only_fields = UploadedFileSerializer.Meta.read_only_fields + ['message']


class VideoRecordingSerializer(UploadedFileSerializer):
    class Meta:
        model = VideoRecording
        fields = UploadedFileSerializer.Meta.fields + ['duration_seconds', 'thumbnail']
        read_only_fields = UploadedFileSerializer.Meta.read_only_fields + ['duration_seconds', 'thumbnail']


class AudioRecordingSerializer(UploadedFileSerializer):
    class Meta:
        model = AudioRecording
        fields = UploadedFileSerializer.Meta.fields + ['duration_seconds']
        read_only_fields = UploadedFileSerializer.Meta.read_only_fields + ['duration_seconds']


class StickerFileSerializer(UploadedFileSerializer):
    class Meta:
        model = StickerFile
        fields = UploadedFileSerializer.Meta.fields + ['is_public', 'category', 'emoji']
        read_only_fields = UploadedFileSerializer.Meta.read_only_fields