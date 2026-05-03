import base64
import hashlib
import json

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models


def _fernet():
    digest = hashlib.sha256(settings.SECRET_KEY.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


class EncryptedJSONField(models.TextField):
    description = "JSON criptografado em repouso"

    def from_db_value(self, value, expression, connection):
        return self.to_python(value)

    def to_python(self, value):
        if value in (None, "") or isinstance(value, (dict, list)):
            return value

        try:
            decrypted = _fernet().decrypt(str(value).encode("utf-8")).decode("utf-8")
            return json.loads(decrypted)
        except (InvalidToken, json.JSONDecodeError, TypeError, ValueError):
            return value

    def get_prep_value(self, value):
        if value in (None, ""):
            return value

        if isinstance(value, str):
            try:
                _fernet().decrypt(value.encode("utf-8"))
                return value
            except InvalidToken:
                pass

        payload = json.dumps(value, ensure_ascii=False, default=str)
        return _fernet().encrypt(payload.encode("utf-8")).decode("utf-8")
