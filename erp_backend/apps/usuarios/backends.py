import logging
from django.contrib.auth.backends import ModelBackend
from .models import Usuario

logger = logging.getLogger(__name__)


class EmailOrUsernameBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        logger.warning(f"[BACKEND] authenticate called: username={username}, password_provided={bool(password)}")

        # Try to authenticate by email first
        try:
            user = Usuario.objects.get(email=username)
            logger.warning(f"[BACKEND] Found user by email: {user}")
        except Usuario.DoesNotExist:
            logger.warning(f"[BACKEND] User not found by email, trying username")
            # If not found, try by username
            try:
                user = Usuario.objects.get(username=username)
                logger.warning(f"[BACKEND] Found user by username: {user}")
            except Usuario.DoesNotExist:
                logger.warning(f"[BACKEND] User not found by username either")
                return None

        logger.warning(f"[BACKEND] Checking password: {password}")
        if user.check_password(password):
            logger.warning(f"[BACKEND] Password correct")
            if self.user_can_authenticate(user):
                logger.warning(f"[BACKEND] User can authenticate, returning {user}")
                return user
            else:
                logger.warning(f"[BACKEND] User cannot authenticate")
        else:
            logger.warning(f"[BACKEND] Password incorrect")

        return None
