import base64
import uuid
from datetime import timedelta

from celery import shared_task
from django.core.mail import send_mail, EmailMessage, EmailMultiAlternatives
from django.conf import settings
import requests
import json
from django.db.models import Sum
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from io import BytesIO
from .models import Post, CustomUser
from payments.models import Payment
from .views import analytics_summary  # Reuse your summary logic
from django.template.loader import render_to_string
from django.utils import timezone
from datetime import timedelta
from customers.models import Customer
from .admin import SPAM_KEYWORDS  # Import if defined in admin.py, or move to models/utils

@shared_task(name='flag_suspicious_posts')
def flag_suspicious_posts():
    print("Running automatic spam detection...")
    flagged = 0
    threshold = 50

    recent_threshold = timezone.now() - timedelta(days=7)  # Only check recent posts

    for post in Post.objects.filter(created_at__gte=recent_threshold):
        score = 0

        if (not post.content or len(post.content) < 15) and not post.media:
            score += 40
        if post.views > 0 and post.shares / post.views > 5:
            score += 30
        if any(kw in (post.content or '').lower() for kw in SPAM_KEYWORDS):
            score += 25
        similar = Post.objects.filter(user=post.user, content=post.content).count() - 1
        if similar > 2:
            score += 30
        recent_count = Post.objects.filter(
            user=post.user,
            created_at__gte=timezone.now() - timedelta(hours=1)
        ).count()
        if recent_count > 5:
            score += 35

        if score >= threshold:
            post.privacy = 'private'
            post.save(update_fields=['privacy'])
            flagged += 1

    print(f"Flagged {flagged} suspicious posts automatically.")
    return flagged

@shared_task(name='auto_flag_spam_posts')
def auto_flag_spam_posts():
    """
    Runs periodically - finds and flags suspicious posts
    """
    print("Starting automatic spam flagging...")
    flagged = 0
    threshold = 60  # stricter for automatic action

    # Only check relatively recent posts
    recent = timezone.now() - timedelta(days=14)

    for post in Post.objects.filter(created_at__gte=recent):
        score = 0

        if (not post.content or len(post.content.strip()) < 15) and not post.media:
            score += 45
        if post.views > 0 and post.shares / post.views > 6:
            score += 35
        if any(kw in (post.content or '').lower() for kw in SPAM_KEYWORDS):
            score += 30
        similar = Post.objects.filter(
            user=post.user,
            content=post.content
        ).exclude(id=post.id).count()
        if similar > 3:
            score += 35
        recent_count = Post.objects.filter(
            user=post.user,
            created_at__gte=timezone.now() - timedelta(hours=1)
        ).count()
        if recent_count > 8:
            score += 40

        if score >= threshold:
            post.privacy = 'private'
            post.is_announcement = False
            post.save(update_fields=['privacy', 'is_announcement'])
            flagged += 1

    print(f"Auto-flagged {flagged} suspicious posts.")
    return flagged

@shared_task
def send_weekly_analytics_report():
    today = timezone.now().date()
    start_of_week = today - timedelta(days=today.weekday())  # Monday
    end_of_week = start_of_week + timedelta(days=6)

    payments = Payment.objects.filter(created_at__date__range=[start_of_week, end_of_week])

    total_revenue = payments.aggregate(total=Sum('amount'))['total'] or 0
    collections = payments.filter(status='completed').aggregate(total=Sum('amount'))['total'] or 0
    pending = payments.filter(status='pending').aggregate(total=Sum('amount'))['total'] or 0

    top_village = payments.values('customer__village').annotate(total=Sum('amount')).order_by('-total').first()
    top_village_name = top_village['customer__village'] if top_village else "N/A"
    top_village_revenue = top_village['total'] or 0

    context = {
        "week": f"{start_of_week.strftime('%b %d')} - {end_of_week.strftime('%b %d, %Y')}",
        "total_revenue": f"{total_revenue:,} RWF",
        "collections": f"{collections:,} RWF",
        "pending": f"{pending:,} RWF",
        "top_village": top_village_name,
        "top_village_revenue": f"{top_village_revenue:,} RWF",
        "company_name": "High Prosper Services",
    }

    html_content = render_to_string("emails/weekly_report.html", context)
    text_content = render_to_string("emails/weekly_report.txt", context)

    msg = EmailMultiAlternatives(
        subject=f"Weekly Analytics Report - {context['week']}",
        body=text_content,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.ADMIN_EMAIL],  # CEO/admin
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send()

    print("Weekly report email sent!")

@shared_task
def send_weekly_pdf_report():
    # Simulate request object for analytics_summary
    class FakeRequest:
        GET = {}
        user = None  # You can add auth if needed

    request = FakeRequest()
    response = analytics_summary(request)
    data = response.data

    # Generate PDF in memory
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    p.setFillColorRGB(124/255, 58/255, 237/255)
    p.rect(0, height - 100, width, 100, fill=1)

    p.setFillColorRGB(1, 1, 1)
    p.setFont("Helvetica-Bold", 24)
    p.drawCentredString(width / 2, height - 60, "High Prosper Services")

    p.setFont("Helvetica", 14)
    p.drawCentredString(width / 2, height - 80, "Weekly Analytics Report")

    p.setFont("Helvetica", 12)
    p.drawString(50, height - 120, f"Week: {timezone.now().strftime('%b %d - %b %d, %Y')}")

    # Add summary
    p.drawString(50, height - 160, f"Total Revenue: {data['totalRevenue']:,} RWF")
    p.drawString(50, height - 180, f"Collections: {data['collections']:,} RWF")
    p.drawString(50, height - 200, f"Pending: {data['pending']:,} RWF")

    # Add AI Summary
    p.setFillColorRGB(0, 0, 0)
    p.setFont("Helvetica-Bold", 14)
    p.drawString(50, height - 240, "AI Report Summary:")
    p.setFont("Helvetica", 12)
    y = height - 260
    for line in data['reportSummary'].split('\n'):
        p.drawString(50, y, line)
        y -= 20

    # Add critical alerts
    if any(i['type'] == 'warning' for i in data['insights']):
        p.setFillColorRGB(1, 0, 0)
        p.setFont("Helvetica-Bold", 14)
        p.drawString(50, y - 20, "Critical Alerts:")
        p.setFillColorRGB(0, 0, 0)
        p.setFont("Helvetica", 12)
        y -= 40
        for i in data['insights']:
            if i['type'] == 'warning':
                p.drawString(50, y, f"- {i['title']}: {i['message']}")
                y -= 20

    p.save()
    buffer.seek(0)

    # Send email
    email = EmailMessage(
        subject=f"Weekly Analytics Report - {timezone.now().strftime('%b %d, %Y')}",
        body="Please find attached the weekly branded analytics report.",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[settings.ADMIN_EMAIL],
    )
    email.attach(f"HPS_Weekly_Report_{timezone.now().strftime('%Y-%m-%d')}.pdf", buffer.getvalue(), "application/pdf")
    email.send()

    print("Weekly PDF report sent!")

@shared_task
def send_email_notification(recipient_email, subject, message):
    """
    Async email notification via SMTP (Gmail).
    """
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
        )
        return f"Email sent to {recipient_email}"
    except Exception as e:
        return f"Email failed for {recipient_email}: {str(e)}"

@shared_task
def send_mtn_sms_notification(phone_number, message):
    """
    Async MTN SMS notification using MTN API.
    """
    try:
        url = settings.MTN_SMS['BASE_URL'] + '/collection/token/'
        headers = {
            'Authorization': 'Basic ' + base64.b64encode(f"{settings.MTN_CLIENT_ID}:{settings.MTN_CLIENT_SECRET}".encode()).decode(),
            'Ocp-Apim-Subscription-Key': settings.MTN_API_KEY,
        }
        response = requests.post(url, headers=headers)
        token = response.json().get('access_token')

        sms_url = settings.MTN_SMS['BASE_URL'] + '/collection/v1_0/requesttopay'
        sms_headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': settings.MTN_API_KEY,
        }
        sms_data = {
            'amount': '1',  # MTN SMS requires amount for requesttopay
            'currency': 'RWF',
            'externalId': str(uuid.uuid4()),
            'payer': {'partyIdType': 'MSISDN', 'partyId': phone_number},
            'payerMessage': message[:160],  # MTN SMS limit
            'payeeNote': 'High Prosper Notification',
        }
        sms_response = requests.post(sms_url, headers=sms_headers, json=sms_data)
        return f"SMS sent to {phone_number}: {sms_response.status_code}"
    except Exception as e:
        return f"SMS failed for {phone_number}: {str(e)}"

@shared_task
def send_notification(notification_id):
    """
    Main task to send notification (email or SMS based on type).
    Call this from your views/models.
    """
    from notifications.models import Notification  # Adjust app if different
    notification = Notification.objects.get(id=notification_id)
    if notification.notification_type == 'email':
        return send_email_notification.delay(notification.recipient.email, notification.title, notification.message)
    elif notification.notification_type == 'sms':
        return send_mtn_sms_notification.delay(notification.recipient.phone_number, notification.message)
    else:
        return "Unsupported notification type"

@shared_task
def clean_online_status():
    threshold = timezone.now() - timedelta(minutes=10)
    updated = CustomUser.objects.filter(
        is_online=True,
        last_seen__lt=threshold
    ).update(is_online=False)
    print(f"Set {updated} users offline.")
