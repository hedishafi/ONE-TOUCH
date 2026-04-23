from .test_signup import SignupFlowTests
from .test_login import LoginFlowTests
from .test_logout import LogoutFlowTests
from .test_auth_security import AuthSecurityTests
from .test_admin_user import UserAdminTests
from .test_admin_provider_verification import ProviderManualVerificationAdminTests
from .test_admin_provider_profile import ProviderProfileAdminTests
# from .test_admin_service_catalog import (
#     ServiceCategoryAdminTests,
#     SubServiceAdminTests,
#     ProviderServiceAdminTests,
# )
from .test_admin_otp import PhoneOTPAdminTests
from .test_admin_deleted_provider import DeletedProviderRecordAdminTests

__all__ = [
    'SignupFlowTests',
    'LoginFlowTests',
    'LogoutFlowTests',
    'AuthSecurityTests',
    'UserAdminTests',
    'ProviderManualVerificationAdminTests',
    'ProviderProfileAdminTests',
    # 'ServiceCategoryAdminTests',
    # 'SubServiceAdminTests',
    # 'ProviderServiceAdminTests',
    'PhoneOTPAdminTests',
    'DeletedProviderRecordAdminTests',
]
