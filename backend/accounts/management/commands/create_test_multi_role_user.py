from django.core.management.base import BaseCommand
from accounts.models import User


class Command(BaseCommand):
    help = 'Create a test user with multiple roles for testing role switching'

    def handle(self, *args, **options):
        phone = '+251912999999'
        
        # Check if user already exists
        if User.objects.filter(phone_number=phone).exists():
            user = User.objects.get(phone_number=phone)
            self.stdout.write(self.style.WARNING(f'User already exists: {phone}'))
        else:
            # Create new user
            user = User.objects.create(
                username='testmultirole',
                phone_number=phone,
                first_name='Test',
                last_name='MultiRole',
                role='client',
                approved_roles=['client', 'provider'],
                verification_status='verified',
            )
            user.set_unusable_password()
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created user: {phone}'))
        
        # Update to have multiple roles
        user.approved_roles = ['client', 'provider']
        user.verification_status = 'verified'
        user.save()
        
        self.stdout.write(self.style.SUCCESS('✅ Test user ready!'))
        self.stdout.write(self.style.SUCCESS(f'Phone: {phone}'))
        self.stdout.write(self.style.SUCCESS(f'Current role: {user.role}'))
        self.stdout.write(self.style.SUCCESS(f'Approved roles: {user.approved_roles}'))
        self.stdout.write(self.style.SUCCESS(f'Can switch roles: {user.can_switch_roles}'))
        self.stdout.write(self.style.SUCCESS(f'Available roles: {user.get_available_roles()}'))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('To test:'))
        self.stdout.write('1. Login with phone: +251912999999')
        self.stdout.write('2. Use any OTP code (in dev mode)')
        self.stdout.write('3. Open sidebar - you should see the Role Switcher')
        self.stdout.write('4. Click it to switch between Client and Provider roles')
