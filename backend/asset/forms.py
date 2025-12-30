from django import forms
from .models import Asset

class AssetForm(forms.ModelForm):
    class Meta:
        model = Asset
        fields = ["name", "description", "category", "purchase_date", "value", "status"]
