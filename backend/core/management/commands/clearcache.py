from django.core.management.base import BaseCommand
import os

class Command(BaseCommand):
    help = "Remove all __pycache__ and .pyc files"

    def handle(self, *args, **kwargs):
        for root, dirs, files in os.walk('.'):
            for d in dirs:
                if d == "__pycache__":
                    os.system(f"rm -rf '{os.path.join(root, d)}'")
            for f in files:
                if f.endswith(".pyc"):
                    os.remove(os.path.join(root, f))
        self.stdout.write(self.style.SUCCESS("✅ Python cache cleared"))
