# manage.py - lightweight placeholder to indicate Django manage file
import os, sys
if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'high_prosper.settings')
    try:
        from django.core.management import execute_from_command_line
    except Exception as e:
        print('This is a skeleton manage.py for the delivered zip. Install dependencies and run migrations in a real env.')
        raise
    execute_from_command_line(sys.argv)
#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # Ensure the project base directory is correctly added to sys.path
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, BASE_DIR)  # Makes local 'notifications' override take priority

    # Default Django settings module
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'high_prosper.settings')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Make sure it's installed and available on your PYTHONPATH environment variable, "
            "and that you have activated your virtual environment."
        ) from exc

    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
