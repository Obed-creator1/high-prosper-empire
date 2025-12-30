from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import (
    UserViewSet,
    LoginView,
    UserProfileView,
    admin_dashboard_stats,
    collector_stats,
    AdminUserViewSet,
    admin_users_export_pdf,
    admin_users_export_csv,
    UserListView,

    all_users,
    collector_locations,
    collector_leaderboard,
    LoginSendOTPView,
    LoginVerifyOTPView,
    UploadAudioMessage,
    UploadAttachment,
    UpdateProfileView,
    sidebar_users,
    SidebarUsersView, send_report_email, SearchClickView, GlobalSearchView,
)

# ------------------------------
# REST Framework Router
# ------------------------------
router = DefaultRouter()
router.register(r"", UserViewSet, basename="user")
router.register(r"users/admin/users", AdminUserViewSet, basename="admin-users")

urlpatterns = [
    path("login/", LoginView.as_view(), name="user-login"),
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("chat-users/", views.chat_users, name="chat-users"),
    path("stats/", admin_dashboard_stats, name="user-stats"),
    path("collector-stats/", collector_stats, name="collector-stats"),
    path('admin/users/', views.AdminUserListView.as_view(), name='admin_users'),
    path("admin/users/export_pdf/", admin_users_export_pdf, name="admin_users_export_pdf"),
    path("admin/users/export_csv/", admin_users_export_csv, name="admin_users_export_csv"),
    path('users/', UserListView.as_view(), name='user-list'),
    path("all-users/", views.AllUsersView.as_view(), name="all-users"),
    path("update-last-seen/", views.UpdateLastSeenView.as_view(), name="update-last-seen"),
    path("collector/locations/", collector_locations, name="collector-locations"),
    path("collector/leaderboard/", collector_leaderboard, name="collector-leaderboard"),
    path("password-reset-request/", views.password_reset_request, name="password_reset_request"),
    path("password-reset-confirm/", views.password_reset_confirm, name="password_reset_confirm"),
    path("login/send-otp/", LoginSendOTPView.as_view(), name="login-send-otp"),
    path("login/verify-otp/", LoginVerifyOTPView.as_view(), name="login-verify-otp"),
    path("stickers/", views.list_stickers, name="list-stickers"),
    path("stickers/upload/", views.upload_sticker, name="upload-sticker"),
    path("upload-audio/", UploadAudioMessage.as_view(), name="upload-audio"),
    path('upload/', UploadAttachment.as_view(), name='upload_attachment'),
    path("update-profile/", UpdateProfileView.as_view(), name="update-profile"),
    path("sidebar-users/", SidebarUsersView.as_view(), name="sidebar-users"),
    path("messages/mark-delivered/", views.mark_delivered, name="mark_delivered"),
    path("messages/mark-seen/", views.mark_seen, name="mark_seen"),
    path("me/", views.me, name="user-me"),
    path("groups/create/", views.CreateGroupView.as_view(), name="create-group"),
    path("groups/my/", views.MyRoomsView.as_view(), name="my-groups"),
    path("group/<str:room_id>/add-member/", views.AddMemberToGroupView.as_view(), name="group-add-member"),
    path("group/<str:room_id>/remove-member/", views.RemoveMemberFromGroupView.as_view(), name="group-remove-member"),
    path("group/<str:room_id>/make-admin/", views.MakeAdminView.as_view(), name="group-make-admin"),
    path("group/<str:room_id>/update/", views.UpdateGroupInfoView.as_view(), name="group-update"),
    path("group/<str:room_id>/leave/", views.LeaveGroupView.as_view(), name="group-leave"),
    path("group/<str:room_id>/ban/", views.BanUserView.as_view(), name="group-ban"),
    path("group/<str:room_id>/unban/", views.UnbanUserView.as_view(), name="group-unban"),
    path("group/<str:room_id>/delete/", views.DeleteGroupView.as_view(), name="group-delete"),
    path("group/<str:room_id>/toggle-admin-only/", views.ToggleAdminOnlyMessagingView.as_view(), name="toggle-admin-only"),
    path("group/<str:room_id>/info/", views.GroupInfoView.as_view(), name="group-info"),
    path("group/<str:room_id>/generate-invite/", views.GenerateInviteLinkView.as_view(), name="generate-invite"),
    path("join-invite/", views.JoinViaInviteView.as_view(), name="join-invite"),
    path("group/<str:room_id>/announcement/", views.SetAnnouncementView.as_view(), name="set-announcement"),
    path("group/<str:room_id>/pin/", views.PinMessageView.as_view(), name="pin-message"),
    path("group/<str:room_id>/unpin/", views.UnpinMessageView.as_view(), name="unpin-message"),
    path("messages/<int:message_id>/delete/", views.DeleteMessageView.as_view(), name="delete-message"),
    path("messages/", views.ChatMessageListCreateView.as_view(), name="chat-messages"),
    path('notifications/', views.get_notifications),
    path('notifications/<int:pk>/mark_as_read/', views.mark_as_read),
    path('notifications/mark_all_as_read/', views.mark_all_as_read),
    path('notification-settings/', views.notification_settings, name='notification-settings'),
    path('analytics/summary/', views.analytics_summary, name='analytics-summary'),
    path('analytics/send-report/', send_report_email, name='send-report-email'),
    path('search/', GlobalSearchView.as_view(), name='global-search'),
    path('search-click/', SearchClickView.as_view()),
]
urlpatterns += router.urls