import { useOrganizationPaymentStatus } from '@/hooks/queries'
import { 
  CheckCircleIcon, 
  ArrowRightIcon,
  CreditCardIcon,
  CubeIcon,
  LinkIcon,
  ChevronRightIcon
} from '@heroicons/react/20/solid'
import { schemas } from '@polar-sh/client'
import Button from '@polar-sh/ui/components/atoms/Button'
import Link from 'next/link'
import { twMerge } from 'tailwind-merge'

interface SetupStep {
  key: string
  label: string
  description: string
  href: string
  completed: boolean
  icon: React.ComponentType<{ className?: string }>
}

interface OrganizationSetupBannerProps {
  organization: schemas['Organization']
}

const OrganizationSetupBanner: React.FC<OrganizationSetupBannerProps> = ({
  organization,
}) => {
  const { data: paymentStatus, isLoading } = useOrganizationPaymentStatus(
    organization.id,
  )

  if (isLoading || !paymentStatus || paymentStatus.payment_ready) {
    return null
  }

  const steps: SetupStep[] = [
    {
      key: 'create_product',
      label: 'Create a Product',
      description: 'Add your first product or service to start selling',
      href: `/dashboard/${organization.slug}/products/new`,
      completed: !paymentStatus.missing_steps.includes('create_product'),
      icon: CubeIcon,
    },
    {
      key: 'integrate_polar',
      label: 'Integrate Polar',
      description: 'Connect Polar to your platform for seamless payments',
      href: `/dashboard/${organization.slug}/finance/account`,
      completed: !paymentStatus.missing_steps.includes('integrate_polar'),
      icon: LinkIcon,
    },
    {
      key: 'complete_account_setup',
      label: 'Complete Account Setup',
      description: 'Finalize your payout details and verification',
      href: `/dashboard/${organization.slug}/finance/account`,
      completed: !paymentStatus.missing_steps.includes('complete_account_setup'),
      icon: CreditCardIcon,
    },
  ]

  const completedSteps = steps.filter((s) => s.completed).length
  const totalSteps = steps.length
  const progressPercentage = (completedSteps / totalSteps) * 100
  const currentStepIndex = steps.findIndex(step => !step.completed)

  return (
    <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-sm dark:border-blue-800 dark:from-blue-950/50 dark:to-indigo-950/50">
      {/* Background decoration */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-100/50 dark:bg-blue-900/20" />
      <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-100/50 dark:bg-indigo-900/20" />
      
      <div className="relative">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Complete Your Setup
            </h3>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              {completedSteps === totalSteps 
                ? "You're all set! Ready to accept payments."
                : `${completedSteps} of ${totalSteps} steps completed to start accepting payments`
              }
            </p>
          </div>
          
          {/* Progress circle */}
          <div className="relative h-16 w-16">
            <svg className="h-16 w-16 -rotate-90 transform" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-blue-200 dark:text-blue-800"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${progressPercentage}, 100`}
                className="text-blue-600 dark:text-blue-400"
                style={{
                  transition: 'stroke-dasharray 0.6s ease-in-out',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {completedSteps}/{totalSteps}
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-800">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex && !step.completed
            const StepIcon = step.icon
            
            return (
              <div
                key={step.key}
                className={twMerge(
                  'group relative flex items-center gap-4 rounded-lg p-4 transition-all duration-200',
                  step.completed
                    ? 'bg-green-50/50 dark:bg-green-950/20'
                    : isActive
                    ? 'bg-blue-100/70 shadow-sm dark:bg-blue-900/30'
                    : 'bg-white/50 dark:bg-gray-900/20',
                  !step.completed && 'hover:bg-blue-100 hover:shadow-md dark:hover:bg-blue-900/40'
                )}
              >
                {/* Step indicator */}
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-sm">
                      <CheckCircleIcon className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className={twMerge(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                      isActive
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500'
                    )}>
                      <StepIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Step content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={twMerge(
                      'font-medium',
                      step.completed
                        ? 'text-green-900 dark:text-green-100'
                        : isActive
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-700 dark:text-gray-300'
                    )}>
                      {step.label}
                    </h4>
                    {step.completed && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-800 dark:text-green-100">
                        Complete
                      </span>
                    )}
                  </div>
                  <p className={twMerge(
                    'mt-1 text-sm',
                    step.completed
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-gray-600 dark:text-gray-400'
                  )}>
                    {step.description}
                  </p>
                </div>

                {/* Action */}
                {!step.completed && (
                  <div className="flex-shrink-0">
                    <Link href={step.href}>
                      <Button
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        className="group-hover:shadow-sm"
                      >
                        {isActive ? 'Continue' : 'Start'}
                        <ChevronRightIcon className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Call to action for next step */}
        {currentStepIndex !== -1 && (
          <div className="mt-6 flex items-center justify-between rounded-lg bg-blue-600 p-4 text-white dark:bg-blue-700">
            <div>
              <p className="font-medium">Ready to continue?</p>
              <p className="text-sm text-blue-100">
                Complete "{steps[currentStepIndex]?.label}" to move forward
              </p>
            </div>
            <Link href={steps[currentStepIndex]?.href || '#'}>
              <Button variant="outline" className="border-blue-400 text-blue-100 hover:bg-blue-500 hover:text-white">
                Continue Setup
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default OrganizationSetupBanner