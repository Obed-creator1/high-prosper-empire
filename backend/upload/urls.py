# backend/upload/urls.py
from django.urls import path
from .views import (
    UploadFileView, ProfilePictureUploadView, ChatAttachmentUploadView,
    VideoUploadView, AudioUploadView, StickerUploadView
)

urlpatterns = [
    path('file/', UploadFileView.as_view(), name='upload-file'),
    path('profile-picture/', ProfilePictureUploadView.as_view(), name='upload-profile-picture'),
    path('chat-attachment/', ChatAttachmentUploadView.as_view(), name='upload-chat-attachment'),
    path('video/', VideoUploadView.as_view(), name='upload-video'),
    path('audio/', AudioUploadView.as_view(), name='upload-audio'),
    path('sticker/', StickerUploadView.as_view(), name='upload-sticker'),
]