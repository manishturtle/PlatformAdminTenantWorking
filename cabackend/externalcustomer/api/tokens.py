from rest_framework_simplejwt.tokens import Token, RefreshToken

class CustomerRefreshToken(RefreshToken):
    @classmethod
    def for_user(cls, user):
        """
        Create a token for the given user.
        """
        token = cls()
        token['CustomerID'] = user.CustomerID
        token['Email'] = user.Email
        token['user_id'] = user.CustomerID  # Required by JWT
        return token
