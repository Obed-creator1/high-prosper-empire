# accounting/admin.py
from django.contrib import admin
from .models import JournalEntry, Revenue, Expense, Receivable, Payable, GeneralLedger, Account

admin.site.register(Account)
admin.site.register(JournalEntry)
admin.site.register(Revenue)
admin.site.register(Expense)
admin.site.register(Receivable)
admin.site.register(Payable)
admin.site.register(GeneralLedger)

