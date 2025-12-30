# backend/users/admin.py

from django.contrib import admin, messages
from django.utils.translation import gettext_lazy as _
from django.contrib.postgres.search import SearchVector


from .models import (
    CustomUser, UserProfile, ChatRoom, RoomMember, ChatMessage,
    MessageReaction, BlockedUser, StarredMessage, OTP, Sticker,
    CryptoKeyBundle, SearchAnalytics
)

# --- Inline Classes for Related Data ---

class RoomMemberInline(admin.TabularInline):
    """Inline to show members when viewing a ChatRoom."""
    model = RoomMember
    extra = 1
    raw_id_fields = ('user', 'added_by')
    fields = ('user', 'role', 'is_muted', 'unread_count', 'added_by')
    readonly_fields = ('joined_at',)

class MessageReactionInline(admin.TabularInline):
    """Inline to show reactions when viewing a ChatMessage."""
    model = MessageReaction
    extra = 0
    raw_id_fields = ('user',)
    fields = ('user', 'emoji', 'created_at')
    readonly_fields = ('created_at',)

class StarredMessageInline(admin.TabularInline):
    """Inline to show which users starred a message."""
    model = StarredMessage
    extra = 0
    raw_id_fields = ('user',)
    fields = ('user', 'starred_at')
    readonly_fields = ('starred_at',)


# --- Model Admin Classes ---

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user', 'role', 'group', 'receive_email_notifications',
        'theme_preference'
    )
    search_fields = (
        'user__username', 'user__email', 'role', 'group', 'bio'
    )
    list_filter = (
        'receive_email_notifications', 'theme_preference'
    )
    raw_id_fields = ('user',)
    fieldsets = (
        (None, {'fields': ('user', 'role', 'group')}),
        (_('Appearance & Communication'), {'fields': (
            'bio', 'theme_preference', 'receive_email_notifications',
            'profile_picture'
        )}),
    )


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'room_id', 'type', 'creator', 'is_active',
        'member_count', 'online_count', 'is_public', 'created_at'
    )
    list_filter = (
        'type', 'is_active', 'is_public', 'only_admins_can_send',
        'allow_invite_link', 'require_admin_approval'
    )
    search_fields = (
        'name', 'room_id', 'creator__username', 'description'
    )
    raw_id_fields = ('creator', 'last_message', 'pinned_message', 'announcement_updated_by')
    inlines = [RoomMemberInline]
    readonly_fields = (
        'room_id', 'created_at', 'updated_at', 'member_count',
        'online_count', 'invite_used_count', 'invite_link'
    )
    fieldsets = (
        (None, {'fields': ('name', 'room_id', 'type', 'is_active', 'image', 'description')}),
        (_('Membership & Creator'), {'fields': ('creator', 'banned_users', 'last_message')}),
        (_('Group Settings'), {'fields': (
            'only_admins_can_send', 'is_public', 'allow_invite_link',
            'require_admin_approval'
        )}),
        (_('Announcements & Pinned Message'), {'fields': (
            'announcement', 'pinned_message', 'announcement_updated_by'
        )}),
        (_('Invite Link Management'), {'fields': (
            'invite_code', 'invite_expires_at', 'invite_max_uses',
            'invite_used_count', 'invite_link'
        )}),
    )
    # Action to regenerate invite code
    actions = ['regenerate_invite_codes']

    @admin.action(description=_('Regenerate invite code for selected rooms'))
    def regenerate_invite_codes(self, request, queryset):
        for room in queryset:
            room.generate_invite_link()
        self.message_user(request, _(f'Successfully regenerated invite codes for {queryset.count()} rooms.'), messages.SUCCESS)

    # Display properties on list view
    @admin.display(description=_('Members'))
    def member_count(self, obj):
        return obj.member_count

    @admin.display(description=_('Online'))
    def online_count(self, obj):
        return obj.online_count


@admin.register(RoomMember)
class RoomMemberAdmin(admin.ModelAdmin):
    list_display = (
        'room', 'user', 'role', 'is_muted', 'joined_at', 'unread_count'
    )
    list_filter = (
        'role', 'is_muted', 'room__name'
    )
    search_fields = (
        'user__username', 'room__name', 'room__room_id'
    )
    raw_id_fields = ('room', 'user', 'added_by')
    actions = ['mute_members', 'unmute_members']

    @admin.action(description=_('Mute selected members'))
    def mute_members(self, request, queryset):
        queryset.update(is_muted=True)
        self.message_user(request, _('Selected members have been muted.'), admin.messages.SUCCESS)

    @admin.action(description=_('Unmute selected members'))
    def unmute_members(self, request, queryset):
        queryset.update(is_muted=False)
        self.message_user(request, _('Selected members have been unmuted.'), admin.messages.SUCCESS)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = (
        'timestamp', 'sender', 'room', 'receiver', 'message_snippet',
        'attachment_type', 'is_deleted', 'seen_at'
    )
    list_filter = (
        'room__name', 'attachment_type', 'is_deleted',
        'deleted_for_everyone', 'is_scheduled', 'is_announcement'
    )
    search_fields = (
        'message', 'sender__username', 'receiver__username', 'room__name'
    )
    date_hierarchy = 'timestamp'
    raw_id_fields = ('sender', 'receiver', 'room', 'reply_to')
    inlines = [MessageReactionInline, StarredMessageInline]
    readonly_fields = ('search_vector', 'timestamp', 'delivered_at', 'seen_at', 'deleted_at')

    fieldsets = (
        (None, {'fields': ('sender', 'room', 'receiver', 'message', 'reply_to')}),
        (_('Attachments'), {'fields': ('attachment', 'attachment_type', 'attachment_duration')}),
        (_('Status & Scheduling'), {'fields': (
            'delivered_at', 'seen_at', 'is_deleted', 'deleted_for_everyone',
            'scheduled_for', 'is_scheduled', 'is_announcement'
        )}),
        (_('Indexing'), {'fields': ('search_vector', 'mentioned_users')}),
    )

    @admin.display(description=_('Message Snippet'))
    def message_snippet(self, obj):
        return obj.message[:50] + ('...' if len(obj.message) > 50 else '')

    # Action to manually update search vectors (optional, as it's in save() too)
    actions = ['update_search_vector']

    @admin.action(description=_('Recalculate search vector for selected messages'))
    def update_search_vector(self, request, queryset):
        for message in queryset:
            message.save() # Re-triggers the search vector update
        self.message_user(request, _(f'Successfully updated search vectors for {queryset.count()} messages.'), admin.messages.SUCCESS)


@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'blocked', 'created_at')
    raw_id_fields = ('blocker', 'blocked')
    search_fields = ('blocker__username', 'blocked__username')
    list_filter = ('created_at',)


@admin.register(StarredMessage)
class StarredMessageAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'starred_at')
    raw_id_fields = ('user', 'message')
    search_fields = ('user__username', 'message__message')
    list_filter = ('starred_at',)


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'created_at', 'expires_at', 'is_used', 'is_expired')
    list_filter = ('is_used', 'expires_at')
    search_fields = ('user__username', 'code', 'session_id')
    raw_id_fields = ('user',)
    readonly_fields = ('session_id', 'created_at', 'expires_at')

    @admin.display(boolean=True)
    def is_expired(self, obj):
        return obj.is_expired()


@admin.register(Sticker)
class StickerAdmin(admin.ModelAdmin):
    list_display = ('name', 'uploaded_at', 'url_link')
    search_fields = ('name',)
    readonly_fields = ('uploaded_at', 'url_link')

    @admin.display(description=_('Sticker Preview'))
    def url_link(self, obj):
        if obj.file:
            from django.utils.html import format_html
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 50px;" />',
                obj.file.url
            )
        return 'N/A'


@admin.register(CryptoKeyBundle)
class CryptoKeyBundleAdmin(admin.ModelAdmin):
    list_display = ('user',)
    raw_id_fields = ('user',)
    search_fields = ('user__username',)
    # Display the fields, but make them read-only as they are sensitive
    readonly_fields = (
        'user', 'identity_key', 'signed_pre_key',
        'signed_pre_key_signature', 'pre_keys'
    )
    fieldsets = (
        (None, {'fields': ('user',)}),
        (_('Key Data (Sensitive - Read Only)'), {'fields': (
            'identity_key', 'signed_pre_key', 'signed_pre_key_signature',
            'pre_keys'
        ), 'classes': ('collapse',)}),
    )

@admin.register(SearchAnalytics)
class SearchAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['user', 'query', 'results_count', 'timestamp']
    list_filter = ['timestamp', 'has_results', 'filters']
    search_fields = ['query', 'user__username']
    readonly_fields = ['timestamp']