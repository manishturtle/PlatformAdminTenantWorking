from django.urls import path
from .views import (
    CustomerPortalCheckEmailView,
    CustomerPortalRequestOTPView,
    CustomerPortalVerifyOTPView,
    CustomerPortalSignupView,
    CustomerPortalResendOTPView,
    CustomerPortalSetPasswordView,
    CustomerPortalRequestSignupOTPView
)
from .auth import (
    PortalLoginView,
    PortalOTPLoginView,
    PortalProfileView
)

urlpatterns = [
    # Auth endpoints
    path('check-email/', CustomerPortalCheckEmailView.as_view(), name='portal-check-email'),
    path('login/', PortalLoginView.as_view(), name='portal-login'),
    path('login-otp/', PortalOTPLoginView.as_view(), name='portal-login-otp'),
    path('profile/', PortalProfileView.as_view(), name='portal-profile'),

    # OTP endpoints
    path('request-otp/', CustomerPortalRequestOTPView.as_view(), name='portal-request-otp'),
    path('request-signup-otp/', CustomerPortalRequestSignupOTPView.as_view(), name='portal-request-signup-otp'),
    path('verify-otp/', CustomerPortalVerifyOTPView.as_view(), name='portal-verify-otp'),
    path('resend-otp/', CustomerPortalResendOTPView.as_view(), name='portal-resend-otp'),

    # Registration
    path('signup/', CustomerPortalSignupView.as_view(), name='portal-signup'),
    path('set-password/', CustomerPortalSetPasswordView.as_view(), name='portal-set-password'),
]
