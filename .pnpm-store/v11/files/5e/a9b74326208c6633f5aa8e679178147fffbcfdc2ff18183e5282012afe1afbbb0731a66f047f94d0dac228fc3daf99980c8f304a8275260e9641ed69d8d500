'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var React = require('react');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return Object.freeze(n);
}

var React__namespace = /*#__PURE__*/_interopNamespace(React);
var React__default = /*#__PURE__*/_interopDefaultLegacy(React);

function _arrayLikeToArray(r, a) {
  (null == a || a > r.length) && (a = r.length);
  for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e];
  return n;
}
function _arrayWithHoles(r) {
  if (Array.isArray(r)) return r;
}
function _iterableToArrayLimit(r, l) {
  var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"];
  if (null != t) {
    var e,
      n,
      i,
      u,
      a = [],
      f = !0,
      o = !1;
    try {
      if (i = (t = t.call(r)).next, 0 === l) {
        if (Object(t) !== t) return;
        f = !1;
      } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0);
    } catch (r) {
      o = !0, n = r;
    } finally {
      try {
        if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return;
      } finally {
        if (o) throw n;
      }
    }
    return a;
  }
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
function _slicedToArray(r, e) {
  return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest();
}
function _unsupportedIterableToArray(r, a) {
  if (r) {
    if ("string" == typeof r) return _arrayLikeToArray(r, a);
    var t = {}.toString.call(r).slice(8, -1);
    return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0;
  }
}

var ConnectComponentsContext = /*#__PURE__*/React__namespace.createContext(null);
ConnectComponentsContext.displayName = 'ConnectComponents';
var ConnectComponentsProvider = function ConnectComponentsProvider(_ref) {
  var connectInstance = _ref.connectInstance,
    children = _ref.children;
  return /*#__PURE__*/React__namespace.createElement(ConnectComponentsContext.Provider, {
    value: {
      connectInstance: connectInstance
    }
  }, children);
};
var useConnectComponents = function useConnectComponents() {
  var context = React__namespace.useContext(ConnectComponentsContext);
  if (!context) {
    throw new Error("Could not find Components context; You need to wrap the part of your app in an <ConnectComponentsProvider> provider.");
  }
  return context;
};

var useCreateComponent = function useCreateComponent(tagName) {
  var _React$useState = React__namespace.useState(null),
    _React$useState2 = _slicedToArray(_React$useState, 2),
    component = _React$useState2[0],
    setComponent = _React$useState2[1];
  var _useConnectComponents = useConnectComponents(),
    connectInstance = _useConnectComponents.connectInstance;
  var wrapperDivRef = React__namespace.useRef(null);
  // We set width to 100% to preserve this functionality aspect of embedded components even though
  // we are introducing a wrapper div for this element
  // https://docs.corp.stripe.com/connect/get-started-connect-embedded-components#width-and-height
  var wrapper = /*#__PURE__*/React__namespace.createElement("div", {
    style: {
      width: '100%'
    },
    "data-stripe-connect-js-wrapper": true,
    ref: wrapperDivRef
  });
  React__namespace.useLayoutEffect(function () {
    if (wrapperDivRef.current !== null && component === null) {
      var newComponent = connectInstance.create(tagName);
      setComponent(newComponent);
      if (newComponent !== null) {
        try {
          newComponent.setAttribute('reactSdkAnalytics', '3.4.4');
        } catch (e) {
          console.log('Error setting React Sdk version with error message: ', e);
        }
        while (wrapperDivRef.current.firstChild) {
          wrapperDivRef.current.removeChild(wrapperDivRef.current.firstChild);
        }
        wrapperDivRef.current.appendChild(newComponent);
      }
    }
  }, [connectInstance, tagName]);
  return {
    wrapper: wrapper,
    component: component
  };
};

var useUpdateWithSetter = function useUpdateWithSetter(component, value, onUpdated) {
  React__default["default"].useEffect(function () {
    if (!component) return;
    try {
      onUpdated(component, value);
    } catch (error) {
      console.error('Error when calling setter! ', error);
      return;
    }
  }, [component, value, onUpdated]);
};

var ConnectPayments = function ConnectPayments(_ref) {
  var defaultFilters = _ref.defaultFilters,
    onLoadError = _ref.onLoadError,
    onLoaderStart = _ref.onLoaderStart;
  var _useCreateComponent = useCreateComponent('payments'),
    wrapper = _useCreateComponent.wrapper,
    payments = _useCreateComponent.component;
  useUpdateWithSetter(payments, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(payments, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  useUpdateWithSetter(payments, defaultFilters, function (comp, val) {
    comp.setDefaultFilters(val);
  });
  return wrapper;
};
var ConnectPayouts = function ConnectPayouts(_ref2) {
  var onLoadError = _ref2.onLoadError,
    onLoaderStart = _ref2.onLoaderStart;
  var _useCreateComponent2 = useCreateComponent('payouts'),
    wrapper = _useCreateComponent2.wrapper,
    payouts = _useCreateComponent2.component;
  useUpdateWithSetter(payouts, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(payouts, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectPaymentDetails = function ConnectPaymentDetails(_ref3) {
  var payment = _ref3.payment,
    onClose = _ref3.onClose,
    onLoadError = _ref3.onLoadError,
    onLoaderStart = _ref3.onLoaderStart;
  var _useCreateComponent3 = useCreateComponent('payment-details'),
    wrapper = _useCreateComponent3.wrapper,
    paymentDetails = _useCreateComponent3.component;
  useUpdateWithSetter(paymentDetails, payment, function (comp, val) {
    return comp.setPayment(val);
  });
  useUpdateWithSetter(paymentDetails, onClose, function (comp, val) {
    return comp.setOnClose(val);
  });
  useUpdateWithSetter(paymentDetails, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(paymentDetails, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectPaymentDisputes = function ConnectPaymentDisputes(_ref4) {
  var payment = _ref4.payment,
    onDisputesLoaded = _ref4.onDisputesLoaded,
    onLoadError = _ref4.onLoadError,
    onLoaderStart = _ref4.onLoaderStart;
  var _useCreateComponent4 = useCreateComponent('payment-disputes'),
    wrapper = _useCreateComponent4.wrapper,
    component = _useCreateComponent4.component;
  useUpdateWithSetter(component, payment, function (comp, val) {
    return comp.setPayment(val);
  });
  useUpdateWithSetter(component, onDisputesLoaded, function (comp, val) {
    return comp.setOnDisputesLoaded(val);
  });
  useUpdateWithSetter(component, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(component, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectDisputesList = function ConnectDisputesList(_ref5) {
  var onLoadError = _ref5.onLoadError,
    onLoaderStart = _ref5.onLoaderStart;
  var _useCreateComponent5 = useCreateComponent('disputes-list'),
    wrapper = _useCreateComponent5.wrapper,
    component = _useCreateComponent5.component;
  useUpdateWithSetter(component, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(component, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectAccountOnboarding = function ConnectAccountOnboarding(_ref6) {
  var onExit = _ref6.onExit,
    recipientTermsOfServiceUrl = _ref6.recipientTermsOfServiceUrl,
    fullTermsOfServiceUrl = _ref6.fullTermsOfServiceUrl,
    privacyPolicyUrl = _ref6.privacyPolicyUrl,
    skipTermsOfServiceCollection = _ref6.skipTermsOfServiceCollection,
    collectionOptions = _ref6.collectionOptions,
    onLoadError = _ref6.onLoadError,
    onLoaderStart = _ref6.onLoaderStart,
    onStepChange = _ref6.onStepChange;
  var _useCreateComponent6 = useCreateComponent('account-onboarding'),
    wrapper = _useCreateComponent6.wrapper,
    onboarding = _useCreateComponent6.component;
  useUpdateWithSetter(onboarding, recipientTermsOfServiceUrl, function (comp, val) {
    return comp.setRecipientTermsOfServiceUrl(val);
  });
  useUpdateWithSetter(onboarding, fullTermsOfServiceUrl, function (comp, val) {
    return comp.setFullTermsOfServiceUrl(val);
  });
  useUpdateWithSetter(onboarding, privacyPolicyUrl, function (comp, val) {
    return comp.setPrivacyPolicyUrl(val);
  });
  useUpdateWithSetter(onboarding, skipTermsOfServiceCollection, function (comp, val) {
    return comp.setSkipTermsOfServiceCollection(val);
  });
  useUpdateWithSetter(onboarding, collectionOptions, function (comp, val) {
    return comp.setCollectionOptions(val);
  });
  useUpdateWithSetter(onboarding, onExit, function (comp, val) {
    return comp.setOnExit(val);
  });
  useUpdateWithSetter(onboarding, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(onboarding, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  useUpdateWithSetter(onboarding, onStepChange, function (comp, val) {
    return comp.setOnStepChange(val);
  });
  return wrapper;
};
var ConnectAccountManagement = function ConnectAccountManagement(_ref7) {
  var collectionOptions = _ref7.collectionOptions,
    onLoadError = _ref7.onLoadError,
    onLoaderStart = _ref7.onLoaderStart,
    onSectionOpen = _ref7.onSectionOpen;
  var _useCreateComponent7 = useCreateComponent('account-management'),
    wrapper = _useCreateComponent7.wrapper,
    accountManagement = _useCreateComponent7.component;
  useUpdateWithSetter(accountManagement, collectionOptions, function (comp, val) {
    return comp.setCollectionOptions(val);
  });
  useUpdateWithSetter(accountManagement, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(accountManagement, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  useUpdateWithSetter(accountManagement, onSectionOpen, function (comp, val) {
    return comp.setOnSectionOpen(val);
  });
  return wrapper;
};
var ConnectNotificationBanner = function ConnectNotificationBanner(_ref8) {
  var collectionOptions = _ref8.collectionOptions,
    onNotificationsChange = _ref8.onNotificationsChange,
    onLoadError = _ref8.onLoadError,
    onLoaderStart = _ref8.onLoaderStart;
  var _useCreateComponent8 = useCreateComponent('notification-banner'),
    wrapper = _useCreateComponent8.wrapper,
    notificationBanner = _useCreateComponent8.component;
  useUpdateWithSetter(notificationBanner, collectionOptions, function (comp, val) {
    return comp.setCollectionOptions(val);
  });
  useUpdateWithSetter(notificationBanner, onNotificationsChange, function (comp, val) {
    return comp.setOnNotificationsChange(val);
  });
  useUpdateWithSetter(notificationBanner, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(notificationBanner, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectIssuingCard = function ConnectIssuingCard(_ref9) {
  var defaultCard = _ref9.defaultCard,
    cardSwitching = _ref9.cardSwitching,
    showSpendControls = _ref9.showSpendControls,
    fetchEphemeralKey = _ref9.fetchEphemeralKey,
    onLoadError = _ref9.onLoadError,
    onLoaderStart = _ref9.onLoaderStart;
  var _useCreateComponent9 = useCreateComponent('issuing-card'),
    wrapper = _useCreateComponent9.wrapper,
    issuingCard = _useCreateComponent9.component;
  useUpdateWithSetter(issuingCard, defaultCard, function (comp, val) {
    return comp.setDefaultCard(val);
  });
  useUpdateWithSetter(issuingCard, cardSwitching, function (comp, val) {
    return comp.setCardSwitching(val);
  });
  useUpdateWithSetter(issuingCard, showSpendControls, function (comp, val) {
    return comp.setShowSpendControls(val);
  });
  useUpdateWithSetter(issuingCard, fetchEphemeralKey, function (comp, val) {
    return comp.setFetchEphemeralKey(val);
  });
  useUpdateWithSetter(issuingCard, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(issuingCard, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectIssuingCardsList = function ConnectIssuingCardsList(_ref0) {
  var showSpendControls = _ref0.showSpendControls,
    issuingProgram = _ref0.issuingProgram,
    fetchEphemeralKey = _ref0.fetchEphemeralKey,
    onLoadError = _ref0.onLoadError,
    onLoaderStart = _ref0.onLoaderStart;
  var _useCreateComponent0 = useCreateComponent('issuing-cards-list'),
    wrapper = _useCreateComponent0.wrapper,
    issuingCardsList = _useCreateComponent0.component;
  useUpdateWithSetter(issuingCardsList, showSpendControls, function (comp, val) {
    return comp.setShowSpendControls(val);
  });
  useUpdateWithSetter(issuingCardsList, issuingProgram, function (comp, val) {
    return comp.setIssuingProgram(val);
  });
  useUpdateWithSetter(issuingCardsList, fetchEphemeralKey, function (comp, val) {
    return comp.setFetchEphemeralKey(val);
  });
  useUpdateWithSetter(issuingCardsList, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(issuingCardsList, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectFinancialAccount = function ConnectFinancialAccount(_ref1) {
  var financialAccount = _ref1.financialAccount,
    onLoadError = _ref1.onLoadError,
    onLoaderStart = _ref1.onLoaderStart;
  var _useCreateComponent1 = useCreateComponent('financial-account'),
    wrapper = _useCreateComponent1.wrapper,
    financialAccountComponent = _useCreateComponent1.component;
  useUpdateWithSetter(financialAccountComponent, financialAccount, function (comp, val) {
    return comp.setFinancialAccount(val);
  });
  useUpdateWithSetter(financialAccountComponent, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(financialAccountComponent, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectFinancialAccountTransactions = function ConnectFinancialAccountTransactions(_ref10) {
  var financialAccount = _ref10.financialAccount,
    onLoadError = _ref10.onLoadError,
    onLoaderStart = _ref10.onLoaderStart;
  var _useCreateComponent10 = useCreateComponent('financial-account-transactions'),
    wrapper = _useCreateComponent10.wrapper,
    financialAccountTransactionsComponent = _useCreateComponent10.component;
  useUpdateWithSetter(financialAccountTransactionsComponent, financialAccount, function (comp, val) {
    return comp.setFinancialAccount(val);
  });
  useUpdateWithSetter(financialAccountTransactionsComponent, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(financialAccountTransactionsComponent, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectDocuments = function ConnectDocuments(_ref11) {
  var onLoadError = _ref11.onLoadError,
    onLoaderStart = _ref11.onLoaderStart;
  var _useCreateComponent11 = useCreateComponent('documents'),
    wrapper = _useCreateComponent11.wrapper,
    documents = _useCreateComponent11.component;
  useUpdateWithSetter(documents, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(documents, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectPayoutsList = function ConnectPayoutsList(_ref12) {
  var onLoadError = _ref12.onLoadError,
    onLoaderStart = _ref12.onLoaderStart;
  var _useCreateComponent12 = useCreateComponent('payouts-list'),
    wrapper = _useCreateComponent12.wrapper,
    payoutsList = _useCreateComponent12.component;
  useUpdateWithSetter(payoutsList, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(payoutsList, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectBalances = function ConnectBalances(_ref13) {
  var onLoadError = _ref13.onLoadError,
    onLoaderStart = _ref13.onLoaderStart;
  var _useCreateComponent13 = useCreateComponent('balances'),
    wrapper = _useCreateComponent13.wrapper,
    balances = _useCreateComponent13.component;
  useUpdateWithSetter(balances, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(balances, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectTaxRegistrations = function ConnectTaxRegistrations(_ref14) {
  var onLoadError = _ref14.onLoadError,
    onLoaderStart = _ref14.onLoaderStart,
    displayCountries = _ref14.displayCountries,
    onAfterTaxRegistrationAdded = _ref14.onAfterTaxRegistrationAdded,
    onAfterTaxRegistrationExpired = _ref14.onAfterTaxRegistrationExpired;
  var _useCreateComponent14 = useCreateComponent('tax-registrations'),
    wrapper = _useCreateComponent14.wrapper,
    taxRegistrations = _useCreateComponent14.component;
  useUpdateWithSetter(taxRegistrations, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(taxRegistrations, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  useUpdateWithSetter(taxRegistrations, displayCountries, function (comp, val) {
    comp.setDisplayCountries(val);
  });
  useUpdateWithSetter(taxRegistrations, onAfterTaxRegistrationAdded, function (comp, val) {
    comp.setOnAfterTaxRegistrationAdded(val);
  });
  useUpdateWithSetter(taxRegistrations, onAfterTaxRegistrationExpired, function (comp, val) {
    comp.setOnAfterTaxRegistrationExpired(val);
  });
  return wrapper;
};
var ConnectTaxSettings = function ConnectTaxSettings(_ref15) {
  var onLoadError = _ref15.onLoadError,
    onLoaderStart = _ref15.onLoaderStart,
    hideProductTaxCodeSelector = _ref15.hideProductTaxCodeSelector,
    displayHeadOfficeCountries = _ref15.displayHeadOfficeCountries,
    onTaxSettingsUpdated = _ref15.onTaxSettingsUpdated;
  var _useCreateComponent15 = useCreateComponent('tax-settings'),
    wrapper = _useCreateComponent15.wrapper,
    taxSettings = _useCreateComponent15.component;
  useUpdateWithSetter(taxSettings, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(taxSettings, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  useUpdateWithSetter(taxSettings, hideProductTaxCodeSelector, function (comp, val) {
    comp.setHideProductTaxCodeSelector(val);
  });
  useUpdateWithSetter(taxSettings, displayHeadOfficeCountries, function (comp, val) {
    comp.setDisplayHeadOfficeCountries(val);
  });
  useUpdateWithSetter(taxSettings, onTaxSettingsUpdated, function (comp, val) {
    comp.setOnTaxSettingsUpdated(val);
  });
  return wrapper;
};
var ConnectInstantPayoutsPromotion = function ConnectInstantPayoutsPromotion(_ref16) {
  var onInstantPayoutsPromotionLoaded = _ref16.onInstantPayoutsPromotionLoaded,
    onInstantPayoutCreated = _ref16.onInstantPayoutCreated,
    onLoadError = _ref16.onLoadError,
    onLoaderStart = _ref16.onLoaderStart;
  var _useCreateComponent16 = useCreateComponent('instant-payouts-promotion'),
    wrapper = _useCreateComponent16.wrapper,
    instantPayoutsPromotion = _useCreateComponent16.component;
  useUpdateWithSetter(instantPayoutsPromotion, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(instantPayoutsPromotion, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  useUpdateWithSetter(instantPayoutsPromotion, onInstantPayoutsPromotionLoaded, function (comp, val) {
    comp.setOnInstantPayoutsPromotionLoaded(val);
  });
  useUpdateWithSetter(instantPayoutsPromotion, onInstantPayoutCreated, function (comp, val) {
    comp.setOnInstantPayoutCreated(val);
  });
  return wrapper;
};
var ConnectPayoutDetails = function ConnectPayoutDetails(_ref17) {
  var payout = _ref17.payout,
    onClose = _ref17.onClose,
    onLoadError = _ref17.onLoadError,
    onLoaderStart = _ref17.onLoaderStart;
  var _useCreateComponent17 = useCreateComponent('payout-details'),
    wrapper = _useCreateComponent17.wrapper,
    payoutDetails = _useCreateComponent17.component;
  useUpdateWithSetter(payoutDetails, payout, function (comp, val) {
    return comp.setPayout(val);
  });
  useUpdateWithSetter(payoutDetails, onClose, function (comp, val) {
    return comp.setOnClose(val);
  });
  useUpdateWithSetter(payoutDetails, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(payoutDetails, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectBalanceReport = function ConnectBalanceReport(_ref18) {
  var onLoadError = _ref18.onLoadError,
    onLoaderStart = _ref18.onLoaderStart;
  var _useCreateComponent18 = useCreateComponent('balance-report'),
    wrapper = _useCreateComponent18.wrapper,
    balanceReport = _useCreateComponent18.component;
  useUpdateWithSetter(balanceReport, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(balanceReport, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};
var ConnectPayoutReconciliationReport = function ConnectPayoutReconciliationReport(_ref19) {
  var onReportAvailabilityLoaded = _ref19.onReportAvailabilityLoaded,
    onLoadError = _ref19.onLoadError,
    onLoaderStart = _ref19.onLoaderStart;
  var _useCreateComponent19 = useCreateComponent('payout-reconciliation-report'),
    wrapper = _useCreateComponent19.wrapper,
    payoutReconciliationReport = _useCreateComponent19.component;
  useUpdateWithSetter(payoutReconciliationReport, onReportAvailabilityLoaded, function (comp, val) {
    comp.setOnReportAvailabilityLoaded(val);
  });
  useUpdateWithSetter(payoutReconciliationReport, onLoaderStart, function (comp, val) {
    comp.setOnLoaderStart(val);
  });
  useUpdateWithSetter(payoutReconciliationReport, onLoadError, function (comp, val) {
    comp.setOnLoadError(val);
  });
  return wrapper;
};

/**
 * @deprecated The method should not be used as we are deprecating the use of attributes directly.
 * Define a setter for your use case and use useUpdateWithSetter instead.
 */
var useAttachAttribute = function useAttachAttribute(component, attribute, value) {
  React__default["default"].useEffect(function () {
    if (!component) return;
    if (value !== undefined) {
      component.setAttribute(attribute, value.toString());
    } else {
      // RemoveAttribute is a no-op if the attribute is not present
      component.removeAttribute(attribute);
    }
  }, [component, attribute, value]);
};

exports.ConnectElementEventNames = void 0;
(function (ConnectElementEventNames) {
  ConnectElementEventNames["exit"] = "exit";
  ConnectElementEventNames["close"] = "close";
  ConnectElementEventNames["instantPayoutCreated"] = "instantpayoutcreated";
})(exports.ConnectElementEventNames || (exports.ConnectElementEventNames = {}));
/**
 * @deprecated The method should not be used as we are deprecating the use of events directly. Define a setter for
 * your use case and use useUpdateWithSetter instead.
 */
var useAttachEvent = function useAttachEvent(component, eventName, listener) {
  React__default["default"].useEffect(function () {
    if (component) {
      component.addEventListener(eventName, listener);
    }
    return function () {
      if (component) {
        component.removeEventListener(eventName, listener);
      }
    };
  }, [component, eventName, listener]);
};

exports.ConnectAccountManagement = ConnectAccountManagement;
exports.ConnectAccountOnboarding = ConnectAccountOnboarding;
exports.ConnectBalanceReport = ConnectBalanceReport;
exports.ConnectBalances = ConnectBalances;
exports.ConnectComponentsProvider = ConnectComponentsProvider;
exports.ConnectDisputesList = ConnectDisputesList;
exports.ConnectDocuments = ConnectDocuments;
exports.ConnectFinancialAccount = ConnectFinancialAccount;
exports.ConnectFinancialAccountTransactions = ConnectFinancialAccountTransactions;
exports.ConnectInstantPayoutsPromotion = ConnectInstantPayoutsPromotion;
exports.ConnectIssuingCard = ConnectIssuingCard;
exports.ConnectIssuingCardsList = ConnectIssuingCardsList;
exports.ConnectNotificationBanner = ConnectNotificationBanner;
exports.ConnectPaymentDetails = ConnectPaymentDetails;
exports.ConnectPaymentDisputes = ConnectPaymentDisputes;
exports.ConnectPayments = ConnectPayments;
exports.ConnectPayoutDetails = ConnectPayoutDetails;
exports.ConnectPayoutReconciliationReport = ConnectPayoutReconciliationReport;
exports.ConnectPayouts = ConnectPayouts;
exports.ConnectPayoutsList = ConnectPayoutsList;
exports.ConnectTaxRegistrations = ConnectTaxRegistrations;
exports.ConnectTaxSettings = ConnectTaxSettings;
exports.useAttachAttribute = useAttachAttribute;
exports.useAttachEvent = useAttachEvent;
exports.useConnectComponents = useConnectComponents;
exports.useCreateComponent = useCreateComponent;
exports.useUpdateWithSetter = useUpdateWithSetter;
