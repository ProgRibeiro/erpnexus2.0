from django.contrib.auth.backends import ModelBackend
from .models import Usuario


class EmailOrUsernameBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        # Try to authenticate by email first
        try:
            user = Usuario.objects.get(email=username)
        except Usuario.DoesNotExist:
            # If not found, try by username
            try:
                user = Usuario.objects.get(username=username)
            except Usuario.DoesNotExist:
                return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
