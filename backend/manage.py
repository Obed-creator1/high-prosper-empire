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
