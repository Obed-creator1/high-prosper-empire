from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .admin import admin_site
from .views import (
    CompanyCSVExportView, BranchCSVExportView,
    CompanyExcelExportView, BranchExcelExportView,
    CompanyPDFExportView, BranchPDFExportView, CompanyViewSet, BranchViewSet,
)

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'branches', BranchViewSet)

urlpatterns = [
    path('admin/', admin_site .urls),
    path('companies/export/csv/', CompanyCSVExportView.as_view(), name='company_export_csv'),
    path('branches/export/csv/', BranchCSVExportView.as_view(), name='branch_export_csv'),
    path('companies/export/excel/', CompanyExcelExportView.as_view(), name='company_export_excel'),
    path('branches/export/excel/', BranchExcelExportView.as_view(), name='branch_export_excel'),
    path('companies/export/pdf/', CompanyPDFExportView.as_view(), name='company_export_pdf'),
    path('branches/export/pdf/', BranchPDFExportView.as_view(), name='branch_export_pdf'),

    path('', include(router.urls)),
]