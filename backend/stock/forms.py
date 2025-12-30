from django import forms
from .models import Purchase
from .models import Stock

class StockForm(forms.ModelForm):
    class Meta:
        model = Stock
        fields = ['item', 'quantity', 'price']  # fields you want editable
        widgets = {
            'item': forms.TextInput(attrs={'class': 'form-control'}),
            'quantity': forms.NumberInput(attrs={'class': 'form-control'}),
            'price': forms.NumberInput(attrs={'class': 'form-control'}),
        }

class PurchaseForm(forms.ModelForm):
    class Meta:
        model = Purchase
        fields = ['item', 'quantity', 'price']
        widgets = {
            'purchase_date': forms.DateInput(attrs={'type': 'date'})
        }

