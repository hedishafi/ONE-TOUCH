"""
AI Service for generating professional rejection messages.
Transforms admin hints into user-friendly, professional messages.
"""
import re


def generate_rejection_message(admin_hint: str, context: str = 'general') -> str:
    """
    Generate a professional rejection message based on admin hint.
    
    Args:
        admin_hint: Internal admin hint (not shown to user)
        context: 'role_change' or 'verification' or 'general'
    
    Returns:
        Professional, user-friendly rejection message
    """
    if not admin_hint or not admin_hint.strip():
        return get_default_message(context)
    
    hint_lower = admin_hint.lower().strip()
    
    # Pattern matching for common rejection reasons
    patterns = {
        # Document issues
        r'suspicious|fake|forged|fraudulent|invalid document': {
            'role_change': 'We were unable to process your role change request at this time. Please ensure all information provided is accurate and authentic.',
            'verification': 'We were unable to verify your submission. Please ensure that all provided documents are clear, valid, and meet our verification requirements before reapplying.',
        },
        r'blurry|unclear|poor quality|not clear|low quality': {
            'role_change': 'We need clearer information to process your request. Please resubmit with better quality documentation.',
            'verification': 'The submitted images do not meet our quality standards. Please capture new, clear photos in good lighting where all text and details are easily readable.',
        },
        r'incomplete|missing|partial|not complete': {
            'role_change': 'Your request appears to be incomplete. Please ensure all required information is provided and resubmit.',
            'verification': 'Your submission is incomplete. Please ensure all required documents (ID front, ID back, and selfie) are provided and clearly visible.',
        },
        r'mismatch|not match|different|inconsistent': {
            'role_change': 'There are inconsistencies in the information provided. Please review and ensure all details are accurate before resubmitting.',
            'verification': 'We noticed inconsistencies between your submitted documents. Please ensure your selfie matches the photo on your ID and all information is consistent.',
        },
        r'expired|old|outdated|not valid': {
            'role_change': 'The information provided appears to be outdated. Please update your details and resubmit.',
            'verification': 'Your identification document appears to be expired or invalid. Please submit a current, valid government-issued ID.',
        },
        r'edited|modified|altered|photoshop|filter': {
            'role_change': 'We require original, unmodified documentation. Please resubmit without any alterations.',
            'verification': 'Your submitted images appear to have been edited or filtered. Please provide original, unedited photos taken directly with your camera.',
        },
        r'duplicate|already exists|multiple account': {
            'role_change': 'We found existing records that conflict with this request. Please contact support for assistance.',
            'verification': 'We found existing records associated with this information. Please contact support if you believe this is an error.',
        },
        r'insufficient|not enough|inadequate': {
            'role_change': 'The information provided is insufficient to process your request. Please provide more detailed information and resubmit.',
            'verification': 'The provided documentation is insufficient for verification. Please ensure all documents are complete and clearly show all required information.',
        },
        r'policy|violation|terms|rules': {
            'role_change': 'Your request does not meet our current policy requirements. Please review our terms and conditions before resubmitting.',
            'verification': 'Your submission does not meet our verification requirements. Please review our guidelines and ensure compliance before reapplying.',
        },
        r'age|minor|underage|too young': {
            'role_change': 'We are unable to process this request at this time. Please ensure you meet all eligibility requirements.',
            'verification': 'We are unable to verify your account at this time. Please ensure you meet all age and eligibility requirements.',
        },
    }
    
    # Check patterns and return appropriate message
    for pattern, messages in patterns.items():
        if re.search(pattern, hint_lower):
            return messages.get(context, messages.get('verification', get_default_message(context)))
    
    # If no pattern matches, generate a generic professional message
    return generate_generic_message(admin_hint, context)


def generate_generic_message(admin_hint: str, context: str) -> str:
    """
    Generate a generic professional message when no specific pattern matches.
    """
    if context == 'role_change':
        return (
            f"We have reviewed your role change request and are unable to approve it at this time. "
            f"Please review your submission and ensure all information is accurate and complete. "
            f"If you have questions, please contact our support team."
        )
    elif context == 'verification':
        return (
            f"We have reviewed your verification submission and are unable to approve it at this time. "
            f"Please ensure all documents are clear, valid, and meet our requirements. "
            f"Review our verification guidelines and resubmit when ready."
        )
    else:
        return (
            f"We are unable to process your request at this time. "
            f"Please review the requirements and resubmit with accurate information."
        )


def get_default_message(context: str) -> str:
    """
    Get default rejection message when no hint is provided.
    """
    if context == 'role_change':
        return (
            "We are unable to approve your role change request at this time. "
            "Please ensure all information provided is accurate and meets our requirements. "
            "You may resubmit your request after reviewing our guidelines."
        )
    elif context == 'verification':
        return (
            "We are unable to verify your account at this time. "
            "Please ensure all submitted documents are clear, valid, and meet our verification requirements. "
            "You may resubmit your verification after addressing any issues."
        )
    else:
        return (
            "We are unable to process your request at this time. "
            "Please review the requirements and resubmit."
        )


def generate_multiple_variations(admin_hint: str, context: str = 'verification', count: int = 3) -> list:
    """
    Generate multiple variations of rejection messages for admin to choose from.
    
    Args:
        admin_hint: Internal admin hint
        context: 'role_change' or 'verification'
        count: Number of variations to generate
    
    Returns:
        List of professional rejection message variations
    """
    base_message = generate_rejection_message(admin_hint, context)
    variations = [base_message]
    
    hint_lower = admin_hint.lower().strip()
    
    # Generate variations based on tone
    if 'blurry' in hint_lower or 'unclear' in hint_lower:
        variations.extend([
            "The quality of your submitted images does not meet our standards. Please retake photos in good lighting with a steady hand, ensuring all text is sharp and readable.",
            "We need clearer images to complete verification. Please capture new photos where all details are clearly visible and in focus.",
        ])
    elif 'mismatch' in hint_lower or 'not match' in hint_lower:
        variations.extend([
            "We noticed discrepancies between your submitted documents. Please ensure your selfie clearly matches the photo on your ID and all information is consistent.",
            "There are inconsistencies in your submission. Please verify that all documents belong to you and match each other before resubmitting.",
        ])
    elif 'incomplete' in hint_lower or 'missing' in hint_lower:
        variations.extend([
            "Your submission is missing required information. Please ensure all documents are included and fully visible before resubmitting.",
            "We need complete documentation to proceed. Please provide all required items (ID front, ID back, and selfie) with all edges visible.",
        ])
    else:
        # Generic variations
        variations.extend([
            f"After careful review, we are unable to approve your submission at this time. Please review our requirements and resubmit with accurate, complete information.",
            f"We need additional clarity to process your request. Please ensure all provided information meets our standards and guidelines before reapplying.",
        ])
    
    return variations[:count]
