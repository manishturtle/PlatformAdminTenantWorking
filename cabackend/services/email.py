from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

import requests

class EmailAPI:
    ZEPTO_API_URL = 'https://api.zeptomail.in/v1.1/email'
    ZEPTO_API_KEY = 'Zoho-enczapikey PHtE6r0FRejqjTUu9UJVs/TuEcakMth8ruNmLwBA44wTW/5VTU0Dq9ovljK3rBh+BqYUQPGam4Jst72fte7UIm67NT5KD2qyqK3sx/VYSPOZsbq6x00atV0ff0XdV4Drd9Fq0CXfudzTNA=='

    @staticmethod
    def send_otp_email(email: str, otp: str) -> bool:
        """Send OTP verification email to the customer using Zepto mail."""
        try:
            payload = {
                "from": { 
                    "address": "notifications@turtleit.in"
                },
                "to": [{
                    "email_address": {
                        "address": email,
                        "name": email.split('@')[0]
                    }
                }],
                "subject": 'Your OTP for ITR App',
                "htmlbody": f'''
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #333;">Your One-Time Password (OTP)</h2>
                        <p style="color: #666; font-size: 16px;">Please use the following OTP to login to your account:</p>
                        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                            <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #333;">{otp}</span>
                        </div>
                        <p style="color: #666; font-size: 14px;">This OTP will expire in 5 minutes.</p>
                        <p style="color: #666; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
                    </div>
                '''
            }

            headers = {
                'accept': 'application/json',
                'content-type': 'application/json',
                'authorization': EmailAPI.ZEPTO_API_KEY
            }

            response = requests.post(
                EmailAPI.ZEPTO_API_URL,
                json=payload,
                headers=headers
            )
            
            # Log response for debugging
            print(f"Zepto API Response: {response.status_code}")
            print(f"Response body: {response.text}")
            
            # Both 200 and 201 are success codes
            if response.status_code in [200, 201]:
                print(f"Successfully sent OTP email to {email}")
                return True
            else:
                print(f"Failed to send OTP email. Status code: {response.status_code}")
                response.raise_for_status()
                return False

        except requests.RequestException as e:
            print(f"Network error sending OTP email: {str(e)}")
            if hasattr(e.response, 'text'):
                print(f"Error response: {e.response.text}")
            return False
        except Exception as e:
            print(f"Unexpected error sending OTP email: {str(e)}")
            return False

    @staticmethod
    def send_welcome_email(email: str, first_name: str) -> bool:
        """Send welcome email to newly registered customer."""
        try:
            subject = 'Welcome to ITR App'
            html_message = render_to_string('emails/welcome.html', {
                'first_name': first_name
            })
            
            send_mail(
                subject=subject,
                message=f'Welcome {first_name}! Thank you for registering with ITR App.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                html_message=html_message,
                fail_silently=False,
            )
            return True
        except Exception as e:
            print(f"Error sending welcome email: {str(e)}")
            return False

emailApi = EmailAPI()
