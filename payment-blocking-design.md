# Payment Blocking Design Document

## Overview

This document outlines the design for blocking payments for new organizations that haven't completed their setup process. Organizations must complete three key steps before accepting real payments:

1. Submit organization details
2. Create a payout account
3. Complete identity verification

## Current State Analysis

### Existing Models and Fields

1. **Organization Model** (`/server/polar/models/organization.py`):
   - `status`: Enum field with values: CREATED, ONBOARDING_STARTED, UNDER_REVIEW, DENIED, ACTIVE
   - `details`: JSONB field storing organization details
   - `details_submitted_at`: Timestamp when details were submitted
   - `account_id`: Foreign key to Account model

2. **Account Model** (`/server/polar/models/account.py`):
   - `status`: Enum field with values: CREATED, ONBOARDING_STARTED, UNDER_REVIEW, DENIED, ACTIVE
   - `is_details_submitted`: Boolean indicating if account details are submitted
   - `is_charges_enabled`: Boolean indicating if charges are enabled
   - `is_payouts_enabled`: Boolean indicating if payouts are enabled
   - `is_payout_ready()`: Method checking if account is ready for payouts

3. **User Model** (`/server/polar/models/user.py`):
   - `identity_verification_status`: Enum with values: unverified, pending, verified, failed
   - `identity_verified`: Property checking if status is verified

### Existing UI Components

- **Banner Component** (`/clients/packages/ui/src/components/molecules/Banner.tsx`): Reusable banner with different color options
- **AccountBanner** (`/clients/apps/web/src/components/Transactions/AccountBanner.tsx`): Shows account status and setup prompts

## Proposed Solution

### 1. Organization Completeness Check

Create a new method in the Organization model to check if all requirements are met:

```python
# In /server/polar/models/organization.py
def is_payment_ready(self) -> bool:
    """Check if organization can accept payments"""
    # Organization must be active
    if self.status != Organization.Status.ACTIVE:
        return False
    
    # Details must be submitted
    if not self.details or not self.details_submitted_at:
        return False
    
    # Must have an active payout account
    if not self.account_id or not self.account:
        return False
    
    if not self.account.is_payout_ready():
        return False
    
    return True

def get_missing_steps(self, user: User) -> list[str]:
    """Get list of missing setup steps"""
    missing = []
    
    # Check organization details
    if not self.details or not self.details_submitted_at:
        missing.append("organization_details")
    
    # Check payout account
    if not self.account_id or not self.account:
        missing.append("payout_account")
    elif not self.account.is_payout_ready():
        missing.append("payout_account_activation")
    
    # Check identity verification (admin user)
    if user and user.identity_verification_status != IdentityVerificationStatus.verified:
        missing.append("identity_verification")
    
    return missing
```

### 2. API Endpoints

#### Organization Status Endpoint
```python
# In /server/polar/organization/endpoints.py
@router.get(
    "/organizations/{id}/payment-status",
    response_model=OrganizationPaymentStatus,
)
async def get_organization_payment_status(
    organization: Organization = PermittedOrganization(...),
    auth_subject: AuthSubject[User] = Depends(auth_subject),
    session: AsyncSession = Depends(get_db_session),
) -> OrganizationPaymentStatus:
    missing_steps = organization.get_missing_steps(auth_subject.subject)
    
    return OrganizationPaymentStatus(
        payment_ready=organization.is_payment_ready(),
        missing_steps=missing_steps,
        organization_status=organization.status,
        account_status=organization.account.status if organization.account else None,
        identity_verification_status=auth_subject.subject.identity_verification_status,
    )
```

#### Schema
```python
# In /server/polar/organization/schemas.py
class OrganizationPaymentStatus(Schema):
    payment_ready: bool
    missing_steps: list[str]
    organization_status: Organization.Status
    account_status: Account.Status | None
    identity_verification_status: IdentityVerificationStatus
```

### 3. Checkout Blocking

Modify the checkout service to check organization payment readiness:

```python
# In /server/polar/checkout/service.py
async def create_checkout(
    self,
    session: AsyncSession,
    product: Product,
    price: ProductPrice,
    ...
) -> Checkout:
    # Check if organization can accept payments
    if not product.organization.is_payment_ready():
        raise CheckoutNotAllowed("Organization is not ready to accept payments")
    
    # Rest of the existing logic...
```

### 4. Frontend Implementation

#### Dashboard Banner Component

Create a new component to show setup progress:

```tsx
// /clients/apps/web/src/components/Dashboard/OrganizationSetupBanner.tsx
import { useOrganizationPaymentStatus } from '@/hooks/queries'
import { schemas } from '@polar-sh/client'
import Banner from '@polar-sh/ui/components/molecules/Banner'
import Button from '@polar-sh/ui/components/atoms/Button'
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/20/solid'
import Link from 'next/link'

interface SetupStep {
  key: string
  label: string
  href: string
  completed: boolean
}

const OrganizationSetupBanner: React.FC<{
  organization: schemas['Organization']
}> = ({ organization }) => {
  const { data: paymentStatus, isLoading } = useOrganizationPaymentStatus(organization.id)
  
  if (isLoading || !paymentStatus || paymentStatus.payment_ready) {
    return null
  }
  
  const steps: SetupStep[] = [
    {
      key: 'organization_details',
      label: 'Submit organization details',
      href: `/dashboard/${organization.slug}/settings`,
      completed: !paymentStatus.missing_steps.includes('organization_details')
    },
    {
      key: 'payout_account',
      label: 'Create payout account',
      href: `/dashboard/${organization.slug}/finance/account`,
      completed: !paymentStatus.missing_steps.includes('payout_account') && 
                !paymentStatus.missing_steps.includes('payout_account_activation')
    },
    {
      key: 'identity_verification',
      label: 'Verify your identity',
      href: '/settings',
      completed: !paymentStatus.missing_steps.includes('identity_verification')
    }
  ]
  
  const completedSteps = steps.filter(s => s.completed).length
  const totalSteps = steps.length
  
  return (
    <Banner color="blue">
      <div className="flex flex-col gap-3 flex-1">
        <div className="flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5" />
          <span className="font-medium">
            Complete setup to start accepting payments ({completedSteps}/{totalSteps})
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {steps.map((step) => (
            <div key={step.key} className="flex items-center gap-2">
              {step.completed ? (
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-current" />
              )}
              {step.completed ? (
                <span className="text-sm line-through opacity-60">{step.label}</span>
              ) : (
                <Link href={step.href} className="text-sm underline hover:no-underline">
                  {step.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </Banner>
  )
}

export default OrganizationSetupBanner
```

#### Checkout Banner

Add a banner to the checkout page when organization is not ready:

```tsx
// In /clients/apps/web/src/components/Checkout/Checkout.tsx
// Add this component near the top of the checkout form

const OrganizationNotReadyBanner: React.FC<{
  organization: schemas['Organization']
}> = ({ organization }) => {
  return (
    <Banner color="red">
      <ExclamationCircleIcon className="h-5 w-5" />
      <span className="text-sm">
        This organization is not yet ready to accept payments. 
        The merchant needs to complete their account setup first.
      </span>
    </Banner>
  )
}

// In the Checkout component, add check:
if (!checkout.organization_payment_ready) {
  return (
    <div className="flex flex-col gap-4">
      <OrganizationNotReadyBanner organization={checkout.organization} />
      <CheckoutProductInfo checkout={checkout} />
    </div>
  )
}
```

### 5. Database Migration

No database schema changes are required. We'll use existing fields:
- `organizations.details` and `organizations.details_submitted_at`
- `organizations.status` and `organizations.account_id`
- `accounts.status` and account readiness checks
- `users.identity_verification_status`

### 6. Implementation Steps

1. **Backend Implementation**:
   - Add `is_payment_ready()` and `get_missing_steps()` methods to Organization model
   - Create the payment status API endpoint
   - Modify checkout service to check organization readiness
   - Add `organization_payment_ready` field to CheckoutPublic schema

2. **Frontend Implementation**:
   - Create the `OrganizationSetupBanner` component
   - Add the banner to the dashboard layout
   - Create the checkout blocking banner
   - Add payment readiness check to checkout flow

3. **Testing**:
   - Unit tests for `is_payment_ready()` and `get_missing_steps()` methods
   - API endpoint tests
   - Integration tests for checkout blocking
   - E2E tests for the complete flow

### 7. Security Considerations

- Payment blocking is enforced at the API level in the checkout service
- Organization admins can see their setup progress
- Customers see a clear message when checkout is blocked
- No sensitive information is exposed in the payment status endpoint

### 8. Future Enhancements

1. **Email Notifications**: Send reminders to complete setup
2. **Progress Tracking**: Analytics on setup completion rates
3. **Sandbox Mode**: Allow test payments before full verification
4. **Grace Period**: Allow limited payments during setup with holds

## Conclusion

This design provides a secure and user-friendly way to ensure organizations complete all necessary setup steps before accepting real payments. The implementation uses existing models and follows established patterns in the codebase.