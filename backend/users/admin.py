# backend/users/admin.py
from collections import defaultdict

from django.contrib import admin, messages
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from django.db.models import Count, Sum
from django.urls import path, reverse
from django.shortcuts import render
from django.http import HttpResponse
import csv
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment
from datetime import timedelta
from django.utils import timezone

from .models import (
    CustomUser, UserProfile, ChatRoom, RoomMember, ChatMessage,
    MessageReaction, BlockedUser, StarredMessage, OTP, Sticker,
    CryptoKeyBundle, SearchAnalytics,
    Post, Comment, Reaction, Share, Friendship, Activity
)

# Spam keywords (used in spam detection)
SPAM_KEYWORDS = [
    'buy', 'cheap', 'viagra', 'casino', 'bitcoin', 'free money',
    'click here', 'earn money', 'investment', 'adult', 'porn',
    # Add your domain-specific spam keywords here
]

# ──────────────────────────────────────────────────────────────
# Inlines
# ──────────────────────────────────────────────────────────────

class CommentInline(admin.TabularInline):
    model = Comment
    extra = 1
    raw_id_fields = ('user', 'parent')
    fields = ('user', 'content', 'parent', 'created_at')
    readonly_fields = ('created_at',)
    show_change_link = True


class ReactionInline(admin.TabularInline):
    model = Reaction
    extra = 0
    raw_id_fields = ('user',)
    fields = ('user', 'reaction_type', 'created_at')
    readonly_fields = ('created_at',)


class ShareInline(admin.TabularInline):
    model = Share
    extra = 0
    raw_id_fields = ('sharer',)
    fields = ('sharer', 'caption', 'privacy', 'shared_at', 'share_count')
    readonly_fields = ('shared_at', 'share_count')
    show_change_link = True


class ActivityInline(admin.TabularInline):
    model = Activity
    extra = 0
    readonly_fields = ('user', 'action_type', 'target', 'created_at')
    fields = ('user', 'action_type', 'target', 'created_at')
    can_delete = False


# ──────────────────────────────────────────────────────────────
# Post Admin - Main Social Content Management
# ──────────────────────────────────────────────────────────────

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user_link', 'content_snippet', 'media_preview',
        'privacy', 'is_announcement', 'views', 'shares',
        'comment_count', 'spam_score', 'created_at'
    )
    list_filter = (
        'privacy', 'is_announcement', 'media_type', 'created_at'
    )
    search_fields = (
        'content', 'user__username', 'user__email'
    )
    date_hierarchy = 'created_at'
    raw_id_fields = ('user',)
    readonly_fields = ('views', 'shares', 'created_at', 'updated_at')
    inlines = [CommentInline, ShareInline]

    fieldsets = (
        (None, {'fields': ('user', 'content', 'privacy', 'is_announcement', 'allowed_users')}),
        (_('Media'), {'fields': ('media', 'media_type')}),
        (_('Statistics'), {'fields': ('views', 'shares')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at')}),
    )

    # ─── Real-time Spam Score Column ──────────────────────────────────────
    @admin.display(description='Spam Score', ordering='views')
    def spam_score(self, obj):
        score = 0

        # Short/empty content without media
        if (not obj.content or len(obj.content.strip()) < 15) and not obj.media:
            score += 40

        # Suspicious share/view ratio
        if obj.views > 0 and obj.shares / obj.views > 5:
            score += 30

        # Spam keywords
        content_lower = (obj.content or '').lower()
        if any(kw in content_lower for kw in SPAM_KEYWORDS):
            score += 25

        # Duplicate content by same user
        similar = Post.objects.filter(user=obj.user, content=obj.content).exclude(id=obj.id).count()
        if similar > 2:
            score += 30

        # Posting burst
        recent = Post.objects.filter(
            user=obj.user,
            created_at__gte=timezone.now() - timedelta(hours=1)
        ).count()
        if recent > 6:
            score += 35

        score = min(score, 100)

        color = 'success' if score < 40 else 'warning' if score < 70 else 'danger'
        return format_html('<span class="badge bg-{}">{}</span>', color, score)

    # ─── Custom Display Helpers ───────────────────────────────────────────
    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse("admin:users_customuser_change", args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.username)

    @admin.display(description='Content')
    def content_snippet(self, obj):
        return (obj.content[:60] + '...') if obj.content else '—'

    @admin.display(description='Media')
    def media_preview(self, obj):
        if not obj.media:
            return "—"
        if obj.media_type == 'photo':
            return format_html('<img src="{}" style="max-height:60px;border-radius:4px;" />', obj.media.url)
        return obj.media_type.capitalize() if obj.media_type else "—"

    @admin.display(description='Comments')
    def comment_count(self, obj):
        return obj.comments.count()

    # ─── Custom List Views (Extra URLs) ───────────────────────────────────
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('top-shared/', self.admin_site.admin_view(self.top_shared_view), name='post_top_shared'),
            path('most-commented/', self.admin_site.admin_view(self.most_commented_view), name='post_most_commented'),
            path('announcements/', self.admin_site.admin_view(self.announcements_view), name='post_announcements'),
            path('analytics/', self.admin_site.admin_view(self.post_analytics_view), name='post_analytics'),
        ]
        return custom_urls + urls

    def top_shared_view(self, request):
        qs = Post.objects.annotate(total_shares=Sum('shares')).order_by('-total_shares')[:50]
        context = dict(
            self.admin_site.each_context(request),
            title="Top Shared Posts",
            posts=qs,
            headers=['ID', 'User', 'Content', 'Privacy', 'Shares', 'Views', 'Created']
        )
        return render(request, 'admin/custom_post_list.html', context)

    def most_commented_view(self, request):
        qs = Post.objects.annotate(total_comments=Count('comments')).order_by('-total_comments')[:50]
        context = dict(
            self.admin_site.each_context(request),
            title="Most Commented Posts",
            posts=qs,
            headers=['ID', 'User', 'Content', 'Privacy', 'Comments', 'Shares', 'Created']
        )
        return render(request, 'admin/custom_post_list.html', context)

    def announcements_view(self, request):
        qs = Post.objects.filter(is_announcement=True).order_by('-created_at')
        context = dict(
            self.admin_site.each_context(request),
            title="Announcements",
            posts=qs,
            headers=['ID', 'User', 'Content', 'Privacy', 'Views', 'Shares', 'Created']
        )
        return render(request, 'admin/custom_post_list.html', context)

    def post_analytics_view(self, request):
        # Core stats
        total_posts = Post.objects.count()
        total_shares = Post.objects.aggregate(total=Sum('shares'))['total'] or 0
        total_views = Post.objects.aggregate(total=Sum('views'))['total'] or 0

        # Top users
        top_users = Post.objects.values('user__username', 'user__id').annotate(
            post_count=Count('id'),
            total_shares=Sum('shares')
        ).order_by('-total_shares')[:10]

        # Chart data - last 30 days
        last_30 = timezone.now() - timedelta(days=30)
        posts_per_day = defaultdict(int)
        for d in Post.objects.filter(created_at__gte=last_30).values('created_at__date').annotate(c=Count('id')):
            posts_per_day[str(d['created_at__date'])] = d['c']

        shares_per_day = defaultdict(int)
        for d in Share.objects.filter(shared_at__gte=last_30).values('shared_at__date').annotate(c=Sum('original_post__shares')):
            shares_per_day[str(d['shared_at__date'])] = d['c'] or 0

        # Privacy distribution
        privacy_stats = Post.objects.values('privacy').annotate(count=Count('id'))
        privacy_labels = [p['privacy'].capitalize() for p in privacy_stats]
        privacy_counts = [p['count'] for p in privacy_stats]

        # Media types
        media_stats = Post.objects.values('media_type').annotate(count=Count('id')).filter(media_type__isnull=False)
        media_labels = [m['media_type'].capitalize() for m in media_stats]
        media_counts = [m['count'] for m in media_stats]

        # Heatmap data
        heatmap = defaultdict(lambda: defaultdict(int))
        for p in Post.objects.filter(created_at__gte=last_30):
            weekday = p.created_at.weekday()
            hour = p.created_at.hour
            heatmap[weekday][hour] += 1
        heatmap_matrix = [[heatmap[d].get(h, 0) for h in range(24)] for d in range(7)]

        context = dict(
            self.admin_site.each_context(request),
            title="Posts Analytics Dashboard",
            stats={
                'total_posts': total_posts,
                'total_shares': total_shares,
                'total_views': total_views,
                'avg_shares_per_post': round(total_shares / total_posts, 1) if total_posts else 0,
            },
            top_users=top_users,
            chart_labels=list(posts_per_day.keys()),
            chart_posts_data=list(posts_per_day.values()),
            chart_shares_data=list(shares_per_day.values()),
            privacy_labels=privacy_labels,
            privacy_counts=privacy_counts,
            media_labels=media_labels,
            media_counts=media_counts,
            heatmap_matrix=heatmap_matrix,
        )
        return render(request, 'admin/post_analytics_dashboard.html', context)

    # ─── Mass Moderation Actions ───────────────────────────────────────────
    actions = [
        'make_public', 'make_private', 'mark_announcement', 'remove_announcement',
        'advanced_spam_detection', 'bulk_delete_spam', 'reset_statistics',
        'export_posts_csv', 'export_posts_excel',
    ]

    @admin.action(description="Mark selected as Public")
    def make_public(self, request, queryset):
        queryset.update(privacy='public')
        self.message_user(request, f"{queryset.count()} posts set to Public.", messages.SUCCESS)

    @admin.action(description="Mark selected as Private")
    def make_private(self, request, queryset):
        queryset.update(privacy='private')
        self.message_user(request, f"{queryset.count()} posts set to Private.", messages.SUCCESS)

    @admin.action(description="Mark as Announcement")
    def mark_announcement(self, request, queryset):
        queryset.update(is_announcement=True)
        self.message_user(request, f"{queryset.count()} posts marked as Announcement.", messages.SUCCESS)

    @admin.action(description="Remove Announcement flag")
    def remove_announcement(self, request, queryset):
        queryset.update(is_announcement=False)
        self.message_user(request, f"Announcement flag removed from {queryset.count()} posts.", messages.SUCCESS)

    @admin.action(description="Advanced Spam Detection & Flag")
    def advanced_spam_detection(self, request, queryset):
        flagged = 0
        for post in queryset:
            score = 0
            if (not post.content or len(post.content.strip()) < 15) and not post.media:
                score += 45
            if post.views > 0 and post.shares / post.views > 6:
                score += 35
            if any(kw in (post.content or '').lower() for kw in SPAM_KEYWORDS):
                score += 30
            similar = Post.objects.filter(user=post.user, content=post.content).exclude(id=post.id).count()
            if similar > 3:
                score += 35
            recent = Post.objects.filter(
                user=post.user,
                created_at__gte=timezone.now() - timedelta(hours=1)
            ).count()
            if recent > 8:
                score += 40

            if score >= 60:
                post.privacy = 'private'
                post.is_announcement = False
                post.save(update_fields=['privacy', 'is_announcement'])
                flagged += 1

        self.message_user(
            request,
            f"Flagged {flagged} potential spam posts (set to private).",
            messages.WARNING if flagged else messages.INFO
        )

    @admin.action(description="Bulk Delete Suspected Spam")
    def bulk_delete_spam(self, request, queryset):
        to_delete = [p for p in queryset if len(p.content or '') < 10 and not p.media]
        count = len(to_delete)
        if count:
            Post.objects.filter(id__in=[p.id for p in to_delete]).delete()
            self.message_user(request, f"Deleted {count} suspected spam posts.", messages.ERROR)
        else:
            self.message_user(request, "No obvious spam detected.", messages.INFO)

    @admin.action(description="Reset Views & Shares to 0")
    def reset_statistics(self, request, queryset):
        queryset.update(views=0, shares=0)
        self.message_user(request, f"Statistics reset for {queryset.count()} posts.", messages.SUCCESS)

    # ─── Export Actions ─────────────────────────────────────────────────────
    @admin.action(description="Export selected to CSV")
    def export_posts_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="posts_export.csv"'
        writer = csv.writer(response)
        writer.writerow([
            'ID', 'User', 'Content', 'Privacy', 'Is Announcement',
            'Media Type', 'Views', 'Shares', 'Comments', 'Created At'
        ])
        for p in queryset:
            writer.writerow([
                p.id, p.user.username, p.content[:500],
                p.privacy, 'Yes' if p.is_announcement else 'No',
                p.media_type or '-', p.views, p.shares,
                p.comments.count(), p.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])
        return response

    @admin.action(description="Export selected to Excel")
    def export_posts_excel(self, request, queryset):
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="posts_export.xlsx"'

        wb = Workbook()
        ws = wb.active
        ws.title = "Posts"

        headers = [
            'ID', 'User', 'Content', 'Privacy', 'Is Announcement',
            'Media Type', 'Views', 'Shares', 'Comments', 'Created At'
        ]
        ws.append(headers)
        for cell in ws[1]:
            cell.font = Font(bold=True)

        for p in queryset:
            ws.append([
                p.id, p.user.username, p.content[:500],
                p.privacy, 'Yes' if p.is_announcement else 'No',
                p.media_type or '-', p.views, p.shares,
                p.comments.count(), p.created_at.strftime('%Y-%m-%d %H:%M:%S')
            ])

        wb.save(response)
        return response

# ──────────────────────────────────────────────────────────────
# Register remaining models (minimal example)
# ──────────────────────────────────────────────────────────────
admin.site.register(Friendship)

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'post_link', 'user_link', 'content_snippet',
        'parent', 'created_at'
    )
    list_filter = ('created_at',)
    search_fields = ('content', 'user__username', 'post__content')
    date_hierarchy = 'created_at'
    raw_id_fields = ('user', 'post', 'parent')
    readonly_fields = ('created_at', 'updated_at')
    inlines = []

    fieldsets = (
        (None, {'fields': ('post', 'user', 'content', 'parent')}),
        (_('Timestamps'), {'fields': ('created_at', 'updated_at')}),
    )

    @admin.display(description='Post')
    def post_link(self, obj):
        url = reverse("admin:users_post_change", args=[obj.post.id])
        return format_html('<a href="{}">Post #{} ({})</a>', url, obj.post.id, obj.post.user.username)

    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse("admin:users_customuser_change", args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.username)

    @admin.display(description='Content')
    def content_snippet(self, obj):
        return (obj.content[:60] + '...') if obj.content else '—'


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'target_summary', 'user_link',
        'reaction_type', 'created_at'
    )
    list_filter = ('reaction_type', 'created_at')
    search_fields = ('user__username',)
    date_hierarchy = 'created_at'
    raw_id_fields = ('user',)
    readonly_fields = ('created_at',)

    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse("admin:users_customuser_change", args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.username)

    @admin.display(description='Target')
    def target_summary(self, obj):
        if obj.content_type and obj.object_id:
            return f"{obj.content_type.name} #{obj.object_id}"
        return "—"


@admin.register(Share)
class ShareAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'sharer_link', 'original_post_link', 'caption_snippet',
        'privacy', 'shared_at', 'share_count'
    )
    list_filter = ('privacy', 'shared_at')
    search_fields = (
        'sharer__username', 'original_post__content', 'caption'
    )
    date_hierarchy = 'shared_at'
    raw_id_fields = ('sharer', 'original_post')
    readonly_fields = ('shared_at', 'share_count')
    inlines = []

    fieldsets = (
        (None, {'fields': ('sharer', 'original_post', 'caption', 'privacy')}),
        (_('Statistics'), {'fields': ('shared_at', 'share_count')}),
    )

    @admin.display(description='Sharer')
    def sharer_link(self, obj):
        url = reverse("admin:users_customuser_change", args=[obj.sharer.id])
        return format_html('<a href="{}">{}</a>', url, obj.sharer.username)

    @admin.display(description='Original Post')
    def original_post_link(self, obj):
        url = reverse("admin:users_post_change", args=[obj.original_post.id])
        return format_html('<a href="{}">Post #{} ({})</a>',
                           url, obj.original_post.id, obj.original_post.user.username)

    @admin.display(description='Caption')
    def caption_snippet(self, obj):
        return (obj.caption[:50] + '...') if obj.caption else '—'


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = (
        'user_link', 'action_type', 'target_summary',
        'created_at'
    )
    list_filter = ('action_type', 'created_at')
    search_fields = ('user__username', 'action_type')
    date_hierarchy = 'created_at'
    raw_id_fields = ('user',)
    readonly_fields = ('created_at', 'target')

    def target_summary(self, obj):
        if obj.target:
            return f"{obj.content_type.name} #{obj.object_id}"
        return "—"

    @admin.display(description='User')
    def user_link(self, obj):
        url = reverse("admin:users_customuser_change", args=[obj.user.id])
        return format_html('<a href="{}">{}</a>', url, obj.user.username)

# Optional: Enhanced CustomUser admin with profile inline
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'

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