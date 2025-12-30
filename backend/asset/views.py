from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, get_object_or_404, redirect
from notifications.signals import notify

from .models import Asset


# List & Search
def asset_list(request):
    query = request.GET.get('q')
    if query:
        assets = Asset.objects.filter(name__icontains=query)
    else:
        assets = Asset.objects.all()
    return render(request, 'asset/asset_list.html', {'assets': assets, 'query': query})

