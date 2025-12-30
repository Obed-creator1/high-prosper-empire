def role_based_sidebar(request):
    """
    Provide role-based sidebar links dynamically to all templates.
    """

    # Default sidebar (guest / unknown)
    sidebar_links = [
        {"url": "/", "label": "🏠 Home"},
    ]

    # Example: check if user is authenticated and has group/role
    if request.user.is_authenticated:
        if request.user.groups.filter(name="HR").exists():
            sidebar_links = [
                {"url": "/hr/employees/", "label": "👥 Employees"},
                {"url": "/hr/leaves/", "label": "📝 Leave Requests"},
            ]
        elif request.user.groups.filter(name="Staff").exists():
            sidebar_links = [
                {"url": "/staff/my-tasks/", "label": "✅ My Tasks"},
                {"url": "/staff/progress/", "label": "📊 Progress"},
                {"url": "/staff/leaves/", "label": "📝 Leave Requests"},
            ]
        elif request.user.is_superuser:
            sidebar_links = [
                {"url": "/admin/", "label": "⚙️ Admin Panel"},
                {"url": "/accounting/", "label": "💰 Accounting"},
                {"url": "/hr/employees/", "label": "👥 HR Management"},
            ]

    return {"sidebar_links": sidebar_links}
