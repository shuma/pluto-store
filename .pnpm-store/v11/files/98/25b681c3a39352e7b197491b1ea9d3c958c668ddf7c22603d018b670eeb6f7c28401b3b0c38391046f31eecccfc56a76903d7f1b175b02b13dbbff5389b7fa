/// <reference types="react" />
import * as React from "react";
import * as connectJs from "@stripe/connect-js";
import { CollectionOptions, LoadError, LoaderStart, NotificationCount, StepChange, PaymentsListDefaultFilters, SectionOpen, ConnectHTMLElementRecord } from "@stripe/connect-js";
type FetchEphemeralKeyFunction = (fetchParams: {
    issuingCard: string;
    nonce: string;
}) => Promise<{
    issuingCard: string;
    nonce: string;
    ephemeralKeySecret: string;
}>;
type CommonComponentProps = {
    onLoaderStart?: ({ elementTagName }: LoaderStart) => void;
    onLoadError?: ({ error, elementTagName }: LoadError) => void;
};
declare const ConnectPayments: ({ defaultFilters, onLoadError, onLoaderStart }: {
    defaultFilters?: PaymentsListDefaultFilters | undefined;
} & CommonComponentProps) => React.JSX.Element;
declare const ConnectPayouts: ({ onLoadError, onLoaderStart }: CommonComponentProps) => React.JSX.Element;
declare const ConnectPaymentDetails: ({ payment, onClose, onLoadError, onLoaderStart }: {
    payment: string;
    onClose: () => void;
} & CommonComponentProps) => React.JSX.Element | null;
declare const ConnectPaymentDisputes: ({ payment, onDisputesLoaded, onLoadError, onLoaderStart }: {
    payment: string;
    onDisputesLoaded?: (({ total }: {
        total: number;
    }) => void) | undefined;
} & CommonComponentProps) => React.JSX.Element | null;
declare const ConnectDisputesList: ({ onLoadError, onLoaderStart }: CommonComponentProps) => React.JSX.Element | null;
declare const ConnectAccountOnboarding: ({ onExit, recipientTermsOfServiceUrl, fullTermsOfServiceUrl, privacyPolicyUrl, skipTermsOfServiceCollection, collectionOptions, onLoadError, onLoaderStart, onStepChange }: {
    onExit: () => void;
    onStepChange?: ((stepChange: StepChange) => void) | undefined;
    recipientTermsOfServiceUrl?: string | undefined;
    fullTermsOfServiceUrl?: string | undefined;
    privacyPolicyUrl?: string | undefined;
    skipTermsOfServiceCollection?: boolean | undefined;
    collectionOptions?: CollectionOptions | undefined;
} & CommonComponentProps) => React.JSX.Element | null;
declare const ConnectAccountManagement: ({ collectionOptions, onLoadError, onLoaderStart, onSectionOpen }: {
    collectionOptions?: CollectionOptions | undefined;
    onSectionOpen?: (({ sectionName }: SectionOpen) => void) | undefined;
} & CommonComponentProps) => React.JSX.Element | null;
declare const ConnectNotificationBanner: ({ collectionOptions, onNotificationsChange, onLoadError, onLoaderStart }: {
    collectionOptions?: CollectionOptions | undefined;
    onNotificationsChange?: (({ total, actionRequired }: NotificationCount) => void) | undefined;
} & CommonComponentProps) => React.JSX.Element | null;
declare const ConnectIssuingCard: ({ defaultCard, cardSwitching, showSpendControls, fetchEphemeralKey, onLoadError, onLoaderStart }: {
    defaultCard?: string | undefined;
    cardSwitching?: boolean | undefined;
    showSpendControls?: boolean | undefined;
    fetchEphemeralKey?: FetchEphemeralKeyFunction | undefined;
} & CommonComponentProps) => React.JSX.Element;
declare const ConnectIssuingCardsList: ({ showSpendControls, issuingProgram, fetchEphemeralKey, onLoadError, onLoaderStart }: {
    showSpendControls?: boolean | undefined;
    issuingProgram?: string | undefined;
    fetchEphemeralKey?: FetchEphemeralKeyFunction | undefined;
} & CommonComponentProps) => React.JSX.Element;
declare const ConnectFinancialAccount: ({ financialAccount, onLoadError, onLoaderStart }: {
    financialAccount: string;
} & CommonComponentProps) => React.JSX.Element;
declare const ConnectFinancialAccountTransactions: ({ financialAccount, onLoadError, onLoaderStart }: {
    financialAccount: string;
} & CommonComponentProps) => React.JSX.Element;
declare const ConnectDocuments: ({ onLoadError, onLoaderStart }: CommonComponentProps) => React.JSX.Element;
declare const ConnectPayoutsList: ({ onLoadError, onLoaderStart }: CommonComponentProps) => React.JSX.Element;
declare const ConnectBalances: ({ onLoadError, onLoaderStart }: CommonComponentProps) => React.JSX.Element;
declare const ConnectTaxRegistrations: ({ onLoadError, onLoaderStart, displayCountries, onAfterTaxRegistrationAdded, onAfterTaxRegistrationExpired }: {
    displayCountries?: string[] | undefined;
    onAfterTaxRegistrationAdded?: (({ id }: {
        id: string;
    }) => void) | undefined;
    onAfterTaxRegistrationExpired?: (({ id }: {
        id: string;
    }) => void) | undefined;
} & CommonComponentProps) => React.JSX.Element;
declare const ConnectTaxSettings: ({ onLoadError, onLoaderStart, hideProductTaxCodeSelector, displayHeadOfficeCountries, onTaxSettingsUpdated }: {
    hideProductTaxCodeSelector?: boolean | undefined;
    displayHeadOfficeCountries?: string[] | undefined;
    onTaxSettingsUpdated?: (({ id }: {
        id: string;
    }) => void) | undefined;
} & CommonComponentProps) => React.JSX.Element;
declare const ConnectInstantPayoutsPromotion: ({ onInstantPayoutsPromotionLoaded, onInstantPayoutCreated, onLoadError, onLoaderStart }: {
    onInstantPayoutsPromotionLoaded?: (({ promotionShown }: {
        promotionShown: boolean;
    }) => void) | undefined;
    onInstantPayoutCreated?: (({ payoutId }: {
        payoutId: string;
    }) => void) | undefined;
} & CommonComponentProps) => React.JSX.Element;
declare const ConnectPayoutDetails: ({ payout, onClose, onLoadError, onLoaderStart }: {
    payout: string;
    onClose: () => void;
} & CommonComponentProps) => React.JSX.Element | null;
declare const ConnectBalanceReport: ({ onLoadError, onLoaderStart }: CommonComponentProps) => React.JSX.Element;
declare const ConnectPayoutReconciliationReport: ({ onReportAvailabilityLoaded, onLoadError, onLoaderStart }: {
    onReportAvailabilityLoaded?: (({ isReportAvailable }: {
        isReportAvailable: boolean;
    }) => void) | undefined;
} & CommonComponentProps) => React.JSX.Element;
type ConnectComponentsPayload = {
    connectInstance: connectJs.StripeConnectInstance;
};
declare const ConnectComponentsProvider: ({ connectInstance, children }: {
    connectInstance: connectJs.StripeConnectInstance;
    children: any;
}) => React.JSX.Element;
declare const useConnectComponents: () => ConnectComponentsPayload;
declare const useCreateComponent: <T extends "account-onboarding" | "disputes-list" | "payments" | "payment-details" | "payment-disputes" | "payouts" | "payouts-list" | "payout-details" | "balances" | "account-management" | "notification-banner" | "instant-payouts-promotion" | "issuing-card" | "issuing-cards-list" | "financial-account" | "financial-account-transactions" | "documents" | "tax-registrations" | "tax-settings" | "balance-report" | "payout-reconciliation-report">(tagName: T) => {
    wrapper: React.JSX.Element;
    component: ConnectHTMLElementRecord[T] | null;
};
/**
 * @deprecated The method should not be used as we are deprecating the use of attributes directly.
 * Define a setter for your use case and use useUpdateWithSetter instead.
 */
declare const useAttachAttribute: (component: HTMLElement | null, attribute: string, value: string | boolean | undefined) => void;
declare enum ConnectElementEventNames {
    exit = "exit",
    close = "close",
    instantPayoutCreated = "instantpayoutcreated"
}
/**
 * @deprecated The method should not be used as we are deprecating the use of events directly. Define a setter for
 * your use case and use useUpdateWithSetter instead.
 */
declare const useAttachEvent: (component: HTMLElement | null, eventName: ConnectElementEventNames, listener: () => void) => void;
declare const useUpdateWithSetter: <T extends HTMLElement, V extends string | boolean | PaymentsListDefaultFilters | FetchEphemeralKeyFunction | CollectionOptions | string[] | (() => void) | ((notificationCount: NotificationCount) => void) | ((loaderStart: LoaderStart) => void) | ((loaderError: LoadError) => void) | ((stepChange: StepChange) => void) | (({ sectionName }: SectionOpen) => void) | (({ id }: {
    id: string;
}) => void) | (({ promotionShown }: {
    promotionShown: boolean;
}) => void) | (({ payoutId }: {
    payoutId: string;
}) => void) | (({ isReportAvailable }: {
    isReportAvailable: boolean;
}) => void) | undefined>(component: T | null, value: V, onUpdated: (component: T, value: V) => void) => void;
export type { CollectionOptions };
export { CommonComponentProps, ConnectPayments, ConnectPayouts, ConnectPaymentDetails, ConnectPaymentDisputes, ConnectDisputesList, ConnectAccountOnboarding, ConnectAccountManagement, ConnectNotificationBanner, ConnectIssuingCard, ConnectIssuingCardsList, ConnectFinancialAccount, ConnectFinancialAccountTransactions, ConnectDocuments, ConnectPayoutsList, ConnectBalances, ConnectTaxRegistrations, ConnectTaxSettings, ConnectInstantPayoutsPromotion, ConnectPayoutDetails, ConnectBalanceReport, ConnectPayoutReconciliationReport, ConnectComponentsProvider, useConnectComponents, useCreateComponent, useAttachAttribute, ConnectElementEventNames, useAttachEvent, useUpdateWithSetter };
