# backend/procurement/managers.py
from django.db import models

class TenantQuerySet(models.QuerySet):
    def for_company(self, company):
        if company:
            return self.filter(company=company)
        return self  # Global admin sees all

class TenantManager(models.Manager):
    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db)

    def for_request(self, request):
        return self.get_queryset().for_company(getattr(request, 'company', None))