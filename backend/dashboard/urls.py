from django.urls import path
from . import views
#from users.views import user_profile  # imported directly

urlpatterns = [
    path('dashboard/summary/', views.summary, name='dashboard_summary'),
    #path('users/profile/', user_profile, name='user_profile'),  # use the imported reference
]
