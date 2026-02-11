# users/urls.py

from django.urls import path, include
from rest_framework_nested.routers import DefaultRouter, NestedSimpleRouter

from . import views
from .views import (
    # Auth & Profile
    LoginView, LoginSendOTPView, LoginVerifyOTPView,
    UserProfileView, UpdateProfileView, ChangePasswordView,
    me, password_reset_request, password_reset_confirm,

    # User Management
    UserViewSet, AdminUserViewSet, UserListView, AllUsersView,
    list_users, sidebar_users, SidebarUsersView,

    # Admin & Export
    admin_dashboard_stats, AdminResetPasswordView,
    admin_users_export_csv, admin_users_export_pdf,

    # Chat & Messages
    ChatMessageListCreateView, MessageListCreateView,
    mark_delivered, mark_seen, react_to_message, delete_message,
    search_messages, chat_history, chat_users,
    UploadAttachment, UploadAudioMessage,

    # Stickers
    list_stickers, upload_sticker,

    # Groups & Rooms
    CreateGroupView, MyRoomsView, GroupInfoView,
    AddMemberToGroupView, RemoveMemberFromGroupView,
    MakeAdminView, LeaveGroupView, BanUserView, UnbanUserView,
    DeleteGroupView, ToggleAdminOnlyMessagingView,
    UpdateGroupInfoView, SetAnnouncementView, PinMessageView, UnpinMessageView,
    GenerateInviteLinkView, JoinViaInviteView,

    # Social Features (ViewSets)
    PostViewSet, CommentViewSet, ReactionViewSet,
    ShareViewSet, FriendshipViewSet, ActivityViewSet,

    # Collector & Analytics
    collector_stats, collector_locations, collector_leaderboard,
    analytics_summary, send_report_email,

    # Search & Notifications
    GlobalSearchView, SearchClickView,
    get_notifications, mark_as_read, mark_all_as_read,
    save_push_subscription, send_push_notification,
    update_last_seen, UserAnalyticsAPIView, ExportUsersPDFAPIView, ExportUsersExcelAPIView, BlockedUserAnalyticsAPIView,
    BlockListCreateAPIView, CheckUniqueAPIView, BlockDetailAPIView,
)

# ─── REST Framework Router for ViewSets ─────────────────────────────────────
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'admin/users', AdminUserViewSet, basename='admin-user')
router.register(r'posts', PostViewSet, basename='post')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'reactions', ReactionViewSet, basename='reaction')
router.register(r'shares', ShareViewSet, basename='share')
router.register(r'friendships', FriendshipViewSet, basename='friendship')
router.register(r'activities', ActivityViewSet, basename='activity')

# Nested comments
post_router = NestedSimpleRouter(router, r'posts', lookup='post')
post_router.register(r'comments', CommentViewSet, basename='post-comments')

# ─── Main URL Patterns ──────────────────────────────────────────────────────
urlpatterns = [
    # 1. Authentication & Profile
    path('login/', LoginView.as_view(), name='login'),
    path('login/send-otp/', LoginSendOTPView.as_view(), name='login-send-otp'),
    path('login/verify-otp/', LoginVerifyOTPView.as_view(), name='login-verify-otp'),
    path('password/reset/request/', password_reset_request, name='password-reset-request'),
    path('password/reset/confirm/', password_reset_confirm, name='password-reset-confirm'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/update/', UpdateProfileView.as_view(), name='profile-update'),
    path('password/change/', ChangePasswordView.as_view(), name='change-password'),
    path('me/', me, name='current-user'),
    path('update-last-seen/', update_last_seen, name='update-last-seen'),

    path('blocks/', BlockListCreateAPIView.as_view(), name='block-list-create'),
    path('blocks/<int:block_id>/', BlockDetailAPIView.as_view(), name='block-detail'),

    # 2. User Lists & Search
    path('list/', list_users, name='list-users'),
    path('all/', AllUsersView.as_view(), name='all-users'),
    path('sidebar/', SidebarUsersView.as_view(), name='sidebar-users'),
    path('search/', GlobalSearchView.as_view(), name='global-search'),
    path('search-click/', SearchClickView.as_view(), name='search-click'),
    path('check-unique/', CheckUniqueAPIView.as_view(), name='check-unique'),

    # 3. Admin & Stats
    path('stats/', admin_dashboard_stats, name='admin-dashboard-stats'),
    path('admin/reset-password/<int:user_id>/', AdminResetPasswordView.as_view(), name='admin-reset-password'),
    path('admin/export/csv/', admin_users_export_csv, name='admin-users-export-csv'),
    path('admin/export/pdf/', admin_users_export_pdf, name='admin-users-export-pdf'),
    path('admin/analytics/', UserAnalyticsAPIView.as_view(), name='user-analytics'),
    path('admin/users/export_pdf/', ExportUsersPDFAPIView.as_view(), name='export-users-pdf'),
    path('admin/users/export_excel/', ExportUsersExcelAPIView.as_view(), name='export-users-excel'),
    path('admin/blocked-analytics/', BlockedUserAnalyticsAPIView.as_view(), name='blocked-user-analytics'),

    # 4. Chat & Messaging
    path('messages/', ChatMessageListCreateView.as_view(), name='messages-list-create'),
    path('messages/mark-delivered/', mark_delivered, name='mark-delivered'),
    path('messages/mark-seen/', mark_seen, name='mark-seen'),
    path('messages/react/', react_to_message, name='react-to-message'),
    path('messages/delete/', delete_message, name='delete-message'),
    path('messages/search/', search_messages, name='search-messages'),
    path('chat/history/', chat_history, name='chat-history'),
    path('chat/users/', chat_users, name='chat-users'),
    path('upload/', UploadAttachment.as_view(), name='upload-attachment'),
    path('upload-audio/', UploadAudioMessage.as_view(), name='upload-audio'),

    # 5. Stickers
    path('stickers/', list_stickers, name='list-stickers'),
    path('stickers/upload/', upload_sticker, name='upload-sticker'),

    # 6. Groups & Rooms
    path('groups/create/', CreateGroupView.as_view(), name='create-group'),
    path('groups/my/', MyRoomsView.as_view(), name='my-groups'),
    path('groups/<str:room_id>/', GroupInfoView.as_view(), name='group-info'),
    path('groups/<str:room_id>/add-member/', AddMemberToGroupView.as_view(), name='add-member-to-group'),
    path('groups/<str:room_id>/remove-member/', RemoveMemberFromGroupView.as_view(), name='remove-member-from-group'),
    path('groups/<str:room_id>/make-admin/', MakeAdminView.as_view(), name='make-admin'),
    path('groups/<str:room_id>/leave/', LeaveGroupView.as_view(), name='leave-group'),
    path('groups/<str:room_id>/ban/', BanUserView.as_view(), name='ban-user'),
    path('groups/<str:room_id>/unban/', UnbanUserView.as_view(), name='unban-user'),
    path('groups/<str:room_id>/delete/', DeleteGroupView.as_view(), name='delete-group'),
    path('groups/<str:room_id>/toggle-admin-only/', ToggleAdminOnlyMessagingView.as_view(), name='toggle-admin-only'),
    path('groups/<str:room_id>/update/', UpdateGroupInfoView.as_view(), name='update-group-info'),
    path('groups/<str:room_id>/announcement/', SetAnnouncementView.as_view(), name='set-announcement'),
    path('groups/<str:room_id>/pin/', PinMessageView.as_view(), name='pin-message'),
    path('groups/<str:room_id>/unpin/', UnpinMessageView.as_view(), name='unpin-message'),
    path('groups/<str:room_id>/invite/generate/', GenerateInviteLinkView.as_view(), name='generate-invite-link'),
    path('groups/join/invite/', JoinViaInviteView.as_view(), name='join-via-invite'),

    # 7. Collector & Analytics
    path('collectors/stats/', collector_stats, name='collector-stats'),
    path('collectors/locations/', collector_locations, name='collector-locations'),
    path('collectors/leaderboard/', collector_leaderboard, name='collector-leaderboard'),
    path('analytics/summary/', analytics_summary, name='analytics-summary'),
    path('analytics/send-report/', send_report_email, name='send-report-email'),

    # 8. Notifications & Push
    path('notifications/', get_notifications, name='notifications-list'),
    path('notifications/<int:pk>/read/', mark_as_read, name='mark-notification-read'),
    path('notifications/mark-all-read/', mark_all_as_read, name='mark-all-notifications-read'),
    path('push/subscribe/', save_push_subscription, name='push-subscribe'),
    path('push/send/', send_push_notification, name='push-send'),

    # 9. Include all ViewSet routes
    path('', include(router.urls)),
    path('', include(post_router.urls)),
]