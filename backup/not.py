# users/views.py - FIXED: No blank page, header & footer visible on ALL pages

from rest_framework.views import APIView
from rest_framework.permissions import IsAdminUser
from django.http import HttpResponse
from reportlab.lib.pagesizes import landscape, letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as ReportLabImage, PageTemplate
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q
from .models import CustomUser
import os

# Configuration (unchanged)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC_DIR = os.path.join(BASE_DIR, 'static')
LOGO_PATH = os.path.join(STATIC_DIR, 'logo.png')

SOCIAL_ICONS = {
    "Twitter/X": {"icon": os.path.join(STATIC_DIR, 'social', 'twitter.png'), "url": "https://twitter.com/highprosper_rw"},
    "Facebook": {"icon": os.path.join(STATIC_DIR, 'social', 'facebook.png'), "url": "https://facebook.com/highprosper"},
    "LinkedIn": {"icon": os.path.join(STATIC_DIR, 'social', 'linkedin.png'), "url": "https://linkedin.com/company/highprosper"},
    "Instagram": {"icon": os.path.join(STATIC_DIR, 'social', 'instagram.png'), "url": "https://instagram.com/highprosper_rw"},
    "WhatsApp": {"icon": os.path.join(STATIC_DIR, 'social', 'whatsapp.png'), "url": "https://wa.me/250788123456"},
    "Telegram": {"icon": os.path.join(STATIC_DIR, 'social', 'telegram.png'), "url": "https://t.me/highprosper_rw"}
}

COMPANY_NAME = "High Prosper Services Ltd"
COMPANY_LOCATION = "Kigali, Rwanda"
COMPANY_PHONE = "+250 788 123 456"
COMPANY_EMAIL = "info@highprosper.com"

class ExportUsersPDFAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Filters (unchanged)
        queryset = CustomUser.objects.all()
        # ... (role, search, is_active, date_from/to filters - keep your code)

        users = queryset.order_by('-date_joined')

        # Summary stats (unchanged)
        total_users = users.count()
        users_by_role = dict(users.values('role').annotate(count=Count('id')).values_list('role', 'count'))
        total_online = users.filter(is_online=True).count()
        total_offline = total_users - total_online
        now = timezone.now()
        today = now.date()
        month_start = today.replace(day=1)
        new_today = users.filter(date_joined__date=today).count()
        new_month = users.filter(date_joined__gte=month_start).count()
        inactive_users = users.filter(is_active=True, last_seen__lt=now - timedelta(days=30)).count()

        # Daily new users trend
        daily_new = []
        for day in range(29, -1, -1):
            day_date = today - timedelta(days=day)
            count = users.filter(date_joined__date=day_date).count()
            daily_new.append((day_date.strftime('%Y-%m-%d'), count))

        # PDF response
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="high_prosper_users_report.pdf"'

        doc = SimpleDocTemplate(
            response,
            pagesize=landscape(letter),
            rightMargin=0.5*inch,
            leftMargin=0.5*inch,
            topMargin=1.5*inch,
            bottomMargin=1.2*inch
        )

        elements = []
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(name='Title', fontSize=22, leading=26, textColor=colors.darkblue, spaceAfter=12, alignment=1)
        heading_style = ParagraphStyle(name='Heading2', fontSize=16, leading=20, textColor=colors.darkblue, spaceAfter=8)
        normal_style = styles['Normal']

        # ─── Header: Logo on EVERY page ─────────────────────────────────────────
        def add_header(canvas, doc):
            canvas.saveState()
            if os.path.exists(LOGO_PATH):
                try:
                    logo = ReportLabImage(LOGO_PATH, width=1.8*inch, height=1.2*inch)
                    logo.drawOn(canvas, 0.5*inch, doc.height + doc.topMargin - 1.4*inch)
                except Exception as e:
                    print(f"Logo error: {e}")
            canvas.restoreState()

        # ─── Footer: Detailed on page 1, simple on others ───────────────────────
        def add_footer(canvas, doc):
            canvas.saveState()
            canvas.setFont("Helvetica", 9)
            canvas.setFillColor(colors.darkgray)

            page_num = canvas.getPageNumber()
            y = 0.4*inch

            # Detailed footer ONLY on first page
            if page_num == 1:
                canvas.drawString(0.5*inch, y,
                                  f"{COMPANY_NAME} • {COMPANY_LOCATION} • {COMPANY_PHONE} • {COMPANY_EMAIL}")

                x = doc.width + doc.rightMargin - 5*inch
                canvas.drawString(x, y + 0.1*inch, "Follow us on:")
                x += canvas.stringWidth("Follow us on: ", "Helvetica", 9) + 0.1*inch

                icon_size = 0.3*inch
                for platform, data in SOCIAL_ICONS.items():
                    icon_path = data["icon"]
                    url = data["url"]

                    if os.path.exists(icon_path):
                        try:
                            icon = ReportLabImage(icon_path, width=icon_size, height=icon_size)
                            icon.drawOn(canvas, x, y - 0.05*inch)
                        except:
                            canvas.drawString(x, y, platform[:3])
                    else:
                        canvas.drawString(x, y, platform[:3])

                    canvas.linkURL(url, (x, y-0.1*inch, x+icon_size, y+icon_size+0.1*inch))
                    x += icon_size + 0.2*inch

                canvas.setStrokeColor(colors.lightblue)
                canvas.line(0.5*inch, y-0.2*inch, doc.width + doc.rightMargin - 0.5*inch, y-0.2*inch)

            # All pages: Simple footer (current page only)
            canvas.setFont("Helvetica-Oblique", 8)
            canvas.drawCentredString(doc.width/2 + doc.leftMargin, 0.3*inch,
                                     f"Page {page_num} • Confidential Document")

            canvas.restoreState()

        # Apply templates (no frames needed for full-page default)
        full_frame = Frame(
            doc.leftMargin,          # x
            doc.bottomMargin,        # y
            doc.width,               # width
            doc.height,              # height
            id='full'
        )

        doc.addPageTemplates([
            PageTemplate(
                id='AllPages',
                frames=[full_frame],     # ← list with one frame
                onPage=add_header,
                onPageEnd=add_footer
            )
        ])

        # ─── Title Page (no early PageBreak) ────────────────────────────────────
        elements.append(Paragraph("High Prosper Services", title_style))
        elements.append(Paragraph("Comprehensive Users Management Report", title_style))
        elements.append(Spacer(1, 0.4*inch))
        elements.append(Paragraph(f"Generated on: {timezone.now().strftime('%B %d, %Y %H:%M:%S')} by {request.user.get_full_name()}", normal_style))
        elements.append(Spacer(1, 0.8*inch))  # Space instead of PageBreak

        # ─── Summary & Charts on same page or next ──────────────────────────────
        elements.append(Paragraph("Executive Summary", heading_style))
        elements.append(Spacer(1, 0.2*inch))

        summary_data = [
            ["Total Users", total_users],
            ["Online / Offline", f"{total_online} / {total_offline}"],
            ["New Today", new_today],
            ["New This Month", new_month],
            ["Inactive (30+ days)", inactive_users],
        ]

        summary_table = Table(summary_data, colWidths=[3.5*inch, 2.5*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.lightblue),
            ('TEXTCOLOR', (0,0), (-1,0), colors.black),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 0.4*inch))

        # Pie Chart
        elements.append(Paragraph("Users Distribution by Role", heading_style))
        drawing = Drawing(400, 200)
        pie = Pie()
        top_roles = sorted(users_by_role.items(), key=lambda x: x[1], reverse=True)[:8]
        others = sum(count for _, count in sorted(users_by_role.items())[8:])
        pie.data = [count for _, count in top_roles] + [others]
        pie.labels = [role.capitalize() for role, _ in top_roles] + ['Others']
        pie.x = 100
        pie.y = 50
        pie.width = 180
        pie.height = 180
        pie.slices.strokeWidth = 0.5
        pie.slices.strokeColor = colors.white
        drawing.add(pie)
        elements.append(drawing)
        elements.append(Spacer(1, 0.3*inch))

        # Bar Chart
        elements.append(Paragraph("Key Metrics Overview", heading_style))
        drawing = Drawing(500, 250)
        bc = VerticalBarChart()
        bc.x = 50
        bc.y = 50
        bc.height = 180
        bc.width = 400
        bc.categoryAxis.categoryNames = ['Online', 'Offline', 'New Today', 'New Month', 'Inactive']
        bc.data = [[total_online, total_offline, new_today, new_month, inactive_users]]
        bc.bars.strokeWidth = 0.5
        bc.bars[0].fillColor = colors.HexColor('#1f77b4')
        drawing.add(bc)
        elements.append(drawing)
        elements.append(PageBreak())  # Now safe - after content

        # ─── Compact Full User Table ────────────────────────────────────────────
        elements.append(Paragraph("Complete Users List", heading_style))

        table_data = [[
            "ID", "Username", "Full Name", "Email", "Phone", "Role",
            "Company", "Branch", "Last Login", "Joined", "Online", "Verified", "Active"
        ]]

        for user in users:
            company_name = getattr(user.company, 'name', '—') if user.company else '—'
            branch_name = user.branch or '—'
            last_login = user.last_login.strftime("%Y-%m-%d %H:%M") if user.last_login else "Never"
            date_joined = user.date_joined.strftime("%Y-%m-%d")

            table_data.append([
                str(user.id),
                user.username[:15] + '...' if len(user.username) > 15 else user.username,
                user.get_full_name()[:20] + '...' if len(user.get_full_name()) > 20 else user.get_full_name(),
                user.email[:25] + '...' if len(user.email) > 25 else user.email,
                user.phone or "—",
                user.role.capitalize(),
                company_name[:20] + '...' if len(company_name) > 20 else company_name,
                branch_name[:15] + '...' if len(branch_name) > 15 else branch_name,
                last_login,
                date_joined,
                "Yes" if user.is_online else "No",
                "Yes" if user.is_verified else "No",
                "Yes" if user.is_active else "No"
            ])

        from reportlab.platypus import LongTable
        table = LongTable(table_data, repeatRows=1, colWidths=[0.6*inch, 1.1*inch, 1.3*inch, 1.7*inch, 0.9*inch, 0.8*inch, 1.1*inch, 0.9*inch, 1.2*inch, 0.9*inch, 0.6*inch, 0.7*inch, 0.6*inch])

        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.darkblue),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('BOTTOMPADDING', (0,0), (-1,0), 6),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTSIZE', (0,1), (-1,-1), 8),
            ('LEFTPADDING', (0,0), (-1,-1), 3),
            ('RIGHTPADDING', (0,0), (-1,-1), 3),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (3,1), (3,-1), 'LEFT'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.lightgrey]),
        ]))

        elements.append(table)

        # Build PDF
        doc.build(elements)

        return response