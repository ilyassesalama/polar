'use client'

import { useCheckoutConfirmedRedirect } from '@/hooks/checkout'
import { ExclamationCircleIcon } from '@heroicons/react/20/solid'
import {
  CheckoutForm,
  CheckoutProductSwitcher,
  CheckoutPWYWForm,
} from '@polar-sh/checkout/components'
import { useCheckoutFulfillmentListener } from '@polar-sh/checkout/hooks'
import { useCheckout, useCheckoutForm } from '@polar-sh/checkout/providers'
import type { CheckoutConfirmStripe } from '@polar-sh/sdk/models/components/checkoutconfirmstripe'
import type { CheckoutPublicConfirmed } from '@polar-sh/sdk/models/components/checkoutpublicconfirmed'
import type { CheckoutUpdatePublic } from '@polar-sh/sdk/models/components/checkoutupdatepublic'
import { ProductPriceCustom } from '@polar-sh/sdk/models/components/productpricecustom.js'
import { ExpiredCheckoutError } from '@polar-sh/sdk/models/errors/expiredcheckouterror'
import ShadowBox, {
  ShadowBoxOnMd,
} from '@polar-sh/ui/components/atoms/ShadowBox'
import Banner from '@polar-sh/ui/components/molecules/Banner'
import { useThemePreset } from '@polar-sh/ui/hooks/theming'
import type { Stripe, StripeElements } from '@stripe/stripe-js'
import { useTheme } from 'next-themes'
import { useCallback, useMemo, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { CheckoutCard } from './CheckoutCard'
import CheckoutProductInfo from './CheckoutProductInfo'

export interface CheckoutProps {
  embed?: boolean
  theme?: 'light' | 'dark'
}

const Checkout = ({ embed: _embed, theme: _theme }: CheckoutProps) => {
  const { client } = useCheckout()
  const {
    checkout,
    form,
    update: _update,
    confirm: _confirm,
    loading: confirmLoading,
    loadingLabel,
  } = useCheckoutForm()
  const embed = _embed === true
  const { resolvedTheme } = useTheme()
  const theme = _theme || (resolvedTheme as 'light' | 'dark')

  const themePreset = useThemePreset(
    checkout.organization.slug === 'midday' ? 'midday' : 'polar',
    theme,
  )

  const [fullLoading, setFullLoading] = useState(false)
  const loading = useMemo(
    () => confirmLoading || fullLoading,
    [confirmLoading, fullLoading],
  )
  const [listenFulfillment, fullfillmentLabel] = useCheckoutFulfillmentListener(
    client,
    checkout,
  )
  const label = useMemo(
    () => fullfillmentLabel || loadingLabel,
    [fullfillmentLabel, loadingLabel],
  )
  const checkoutConfirmedRedirect = useCheckoutConfirmedRedirect(
    embed,
    theme,
    listenFulfillment,
  )

  const update = useCallback(
    async (data: CheckoutUpdatePublic) => {
      try {
        return await _update(data)
      } catch (error) {
        if (error instanceof ExpiredCheckoutError) {
          window.location.reload()
        }
        throw error
      }
    },
    [_update],
  )

  const confirm = useCallback(
    async (
      data: CheckoutConfirmStripe,
      stripe: Stripe | null,
      elements: StripeElements | null,
    ) => {
      setFullLoading(true)
      let confirmedCheckout: CheckoutPublicConfirmed
      try {
        confirmedCheckout = await _confirm(data, stripe, elements)
      } catch (error) {
        if (error instanceof ExpiredCheckoutError) {
          window.location.reload()
        }
        setFullLoading(false)
        throw error
      }

      await checkoutConfirmedRedirect(
        checkout,
        confirmedCheckout.customerSessionToken,
      )

      return confirmedCheckout
    },
    [_confirm, checkout, checkoutConfirmedRedirect],
  )

  // Component to show when organization is not ready for payments
  const OrganizationNotReadyBanner = () => (
    <Banner color="red">
      <ExclamationCircleIcon className="h-5 w-5" />
      <span className="text-sm">
        This organization is not yet ready to accept payments. The merchant
        needs to complete their account setup first.
      </span>
    </Banner>
  )

  if (embed) {
    return (
      <ShadowBox
        className={twMerge(
          themePreset.polar.checkoutInnerWrapper,
          'flex flex-col gap-y-12 overflow-hidden',
        )}
      >
        {(checkout as any).organizationPaymentReady === false && (
          <OrganizationNotReadyBanner />
        )}

        <CheckoutProductInfo
          organization={checkout.organization}
          product={checkout.product}
        />

        <CheckoutProductSwitcher
          checkout={checkout}
          update={update}
          themePreset={themePreset}
        />

        {checkout.productPrice.amountType === 'custom' && (
          <CheckoutPWYWForm
            checkout={checkout}
            update={update}
            productPrice={checkout.productPrice as ProductPriceCustom}
            themePreset={themePreset}
          />
        )}

        <CheckoutForm
          form={form}
          checkout={checkout}
          update={update}
          confirm={confirm}
          loading={loading}
          loadingLabel={label}
          theme={theme}
          themePreset={themePreset}
          disabled={(checkout as any).organizationPaymentReady === false}
        />
      </ShadowBox>
    )
  }

  var banner = null

  if ((checkout as any).organizationPaymentReady === false) {
    banner = <OrganizationNotReadyBanner />
  }

  return (
    <ShadowBoxOnMd
      className={twMerge(
        themePreset.polar.checkoutInnerWrapper,
        'md:dark:border-polar-700 grid w-full auto-cols-fr grid-flow-row auto-rows-max gap-y-12 md:grid-flow-col md:grid-rows-1 md:items-stretch md:gap-y-24 md:divide-x md:overflow-hidden md:border md:border-gray-100 md:p-0 md:shadow-sm',
      )}
    >
      <div
        className={twMerge(
          themePreset.polar.checkoutInfoWrapper,
          'flex flex-col gap-y-8 md:p-12',
        )}
      >
        {banner}

        <CheckoutProductInfo
          organization={checkout.organization}
          product={checkout.product}
        />
        <CheckoutProductSwitcher
          checkout={checkout}
          update={update}
          themePreset={themePreset}
        />
        {checkout.productPrice.amountType === 'custom' && (
          <CheckoutPWYWForm
            checkout={checkout}
            update={update}
            productPrice={checkout.productPrice as ProductPriceCustom}
            themePreset={themePreset}
          />
        )}
        <CheckoutCard
          checkout={checkout}
          update={update}
          themePreset={themePreset}
        />
      </div>
      <div className="flex flex-col gap-y-8 md:p-12">
        <CheckoutForm
          form={form}
          checkout={checkout}
          update={update}
          confirm={confirm}
          loading={loading}
          loadingLabel={label}
          theme={theme}
          themePreset={themePreset}
          disabled={(checkout as any).organizationPaymentReady === false}
        />
      </div>
    </ShadowBoxOnMd>
  )
}

export default Checkout
