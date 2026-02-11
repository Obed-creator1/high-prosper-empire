# backend/upload/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import UploadedFile, ProfilePicture, ChatAttachment, VideoRecording, AudioRecording, StickerFile
from .serializers import UploadedFileSerializer, ProfilePictureSerializer, ChatAttachmentSerializer, VideoRecordingSerializer, AudioRecordingSerializer, StickerFileSerializer
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)


class UploadFileView(APIView):
    """
    Generic file upload view
    POST /api/v1/upload/file/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = UploadedFileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfilePictureUploadView(APIView):
    """
    Upload or update a user's profile picture.
    POST /api/v1/upload/profile-picture/

    - Regular users: upload for themselves (no target_user_id)
    - Admins/CEOs: can upload for any user by sending target_user_id
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.info(f"Profile picture upload started by user: {request.user.username} (ID: {request.user.id})")

        # ─── 1. Determine target user ────────────────────────────────────────
        target_user_id = request.data.get('target_user_id')  # Optional: for admins

        if target_user_id:
            # Admin/CEOs can upload for others
            if not (request.user.is_superuser or request.user.is_global_admin):
                logger.warning(f"Non-admin {request.user.username} tried to upload for user ID {target_user_id}")
                raise PermissionDenied("Only admins can upload profile pictures for other users")

            target_user = get_object_or_404(CustomUser, id=target_user_id)
            logger.info(f"Admin {request.user.username} uploading profile picture for user ID {target_user_id}")
        else:
            # Regular user uploads for themselves
            target_user = request.user
            logger.info(f"User {request.user.username} uploading own profile picture")

        # ─── 2. Validate file presence & type/size ─────────────────────────────
        if 'file' not in request.FILES:
            logger.warning(f"No file provided by {request.user.username}")
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        file = request.FILES['file']

        if file.size == 0:
            return Response({"error": "Empty file uploaded"}, status=400)

        if file.size > 10 * 1024 * 1024:  # 10MB
            return Response({"error": "File too large (maximum 10MB)"}, status=400)

        allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        if file.content_type not in allowed_types:
            return Response(
                {"error": f"Invalid file type. Allowed: {', '.join(allowed_types)}"},
                status=400
            )

        # ─── 3. Get or create profile picture record for target user ───────────
        profile_pic, created = ProfilePicture.objects.get_or_create(user=target_user)

        # ─── 4. Prepare serializer with file ───────────────────────────────────
        data = request.data.copy()
        data['file'] = file

        serializer = ProfilePictureSerializer(
            profile_pic,
            data=data,
            partial=True,
            context={'request': request}
        )

        # ─── 5. Validate & save photo ──────────────────────────────────────────
        if not serializer.is_valid():
            logger.warning(f"Profile picture validation failed: {serializer.errors}")
            return Response(
                {"error": "Validation failed", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            saved_pic = serializer.save()

            # ─── 6. Update target user's profile_picture_url ────────────────────
            target_user.profile_picture_url = saved_pic.file.url
            target_user.profile_picture = saved_pic.file  # if using ImageField
            target_user.save(update_fields=['profile_picture_url', 'profile_picture'])

            logger.info(f"Profile picture updated for user {target_user.username}. URL: {target_user.profile_picture_url}")

            return Response({
                "message": "Profile picture updated successfully",
                "profile_picture_url": target_user.profile_picture_url,
                "url": saved_pic.file.url,
                "id": str(saved_pic.id),
                "original_name": saved_pic.original_name,
                "size": saved_pic.size_bytes,
                "was_new": created
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Error during profile picture upload/save")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChatAttachmentUploadView(APIView):
    """
    Upload attachment for chat message
    POST /api/v1/upload/chat-attachment/
    Body: file + message_id
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message_id = request.data.get('message_id')
        if not message_id:
            return Response({"error": "message_id required"}, status=status.HTTP_400_BAD_REQUEST)

        message = get_object_or_404('chat.ChatMessage', id=message_id)  # adjust app if needed

        data = request.data.copy()
        data['message'] = message.id
        serializer = ChatAttachmentSerializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VideoUploadView(APIView):
    """
    Upload video recording
    POST /api/v1/upload/video/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VideoRecordingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AudioUploadView(APIView):
    """
    Upload audio recording
    POST /api/v1/upload/audio/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AudioRecordingSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StickerUploadView(APIView):
    """
    Upload sticker file
    POST /api/v1/upload/sticker/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = StickerFileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)