import { InternalAddress } from '../address';
import { BillingAddressActionCreator } from '../billing';
import { CartActionCreator } from '../cart';
import { MissingDataError } from '../common/error/errors';
import { RequestOptions } from '../common/http-request';
import { ConfigActionCreator } from '../config';
import { CouponActionCreator, GiftCertificateActionCreator } from '../coupon';
import { CustomerCredentials, CustomerStrategyActionCreator } from '../customer';
import { CountryActionCreator } from '../geography';
import { OrderActionCreator, OrderRequestBody } from '../order';
import { PaymentMethodActionCreator, PaymentStrategyActionCreator } from '../payment';
import { InstrumentActionCreator } from '../payment/instrument';
import { QuoteActionCreator } from '../quote';
import { ShippingCountryActionCreator, ShippingOptionActionCreator, ShippingStrategyActionCreator } from '../shipping';

import CheckoutSelectors from './checkout-selectors';
import CheckoutStore from './checkout-store';

/**
 * @todo Convert this file into TypeScript properly
 * i.e.: Instrument, InitializePaymentOptions etc...
 */
export default class CheckoutService {
    constructor(
        private _store: CheckoutStore,
        private _billingAddressActionCreator: BillingAddressActionCreator,
        private _cartActionCreator: CartActionCreator,
        private _configActionCreator: ConfigActionCreator,
        private _countryActionCreator: CountryActionCreator,
        private _couponActionCreator: CouponActionCreator,
        private _customerStrategyActionCreator: CustomerStrategyActionCreator,
        private _giftCertificateActionCreator: GiftCertificateActionCreator,
        private _instrumentActionCreator: InstrumentActionCreator,
        private _orderActionCreator: OrderActionCreator,
        private _paymentMethodActionCreator: PaymentMethodActionCreator,
        private _paymentStrategyActionCreator: PaymentStrategyActionCreator,
        private _quoteActionCreator: QuoteActionCreator,
        private _shippingCountryActionCreator: ShippingCountryActionCreator,
        private _shippingOptionActionCreator: ShippingOptionActionCreator,
        private _shippingStrategyActionCreator: ShippingStrategyActionCreator
    ) {}

    getState(): CheckoutSelectors {
        return this._store.getState();
    }

    notifyState(): void {
        this._store.notifyState();
    }

    subscribe(
        subscriber: (state: CheckoutSelectors) => void,
        ...filters: Array<(state: CheckoutSelectors) => any>
    ): () => void {
        return this._store.subscribe(
            () => subscriber(this.getState()),
            ...filters
        );
    }

    loadCheckout(options?: RequestOptions): Promise<CheckoutSelectors> {
        return Promise.all([
            this._store.dispatch(this._quoteActionCreator.loadQuote(options)),
            this._store.dispatch(this._configActionCreator.loadConfig(options), { queueId: 'config' }),
        ]).then(() => this._store.getState());
    }

    loadCart(options?: RequestOptions): Promise<CheckoutSelectors> {
        const action = this._cartActionCreator.loadCart(options);

        return this._store.dispatch(action);
    }

    /**
     * @deprecated
     */
    verifyCart(options?: RequestOptions): Promise<CheckoutSelectors> {
        const { checkout } = this._store.getState();
        const action = this._cartActionCreator.verifyCart(checkout.getCart(), options);

        return this._store.dispatch(action);
    }

    loadOrder(orderId: number, options?: RequestOptions): Promise<CheckoutSelectors> {
        const action = this._orderActionCreator.loadOrder(orderId, options);

        return this._store.dispatch(action);
    }

    submitOrder(payload: OrderRequestBody, options?: RequestOptions): Promise<CheckoutSelectors> {
        const action = this._paymentStrategyActionCreator.execute(payload, options);

        return this._store.dispatch(action, { queueId: 'paymentStrategy' });
    }

    /**
     * @deprecated
     */
    finalizeOrder(orderId: number, options?: RequestOptions): Promise<CheckoutSelectors> {
        const action = this._orderActionCreator.finalizeOrder(orderId, options);

        return this._store.dispatch(action);
    }

    finalizeOrderIfNeeded(options?: RequestOptions): Promise<CheckoutSelectors> {
        const action = this._paymentStrategyActionCreator.finalize(options);

        return this._store.dispatch(action, { queueId: 'paymentStrategy' });
    }

    loadPaymentMethods(options?: RequestOptions): Promise<CheckoutSelectors> {
        const action = this._paymentMethodActionCreator.loadPaymentMethods(options);

        return this._store.dispatch(action, { queueId: 'paymentMethods' });
    }

    loadPaymentMethod(methodId: string, options: RequestOptions): Promise<CheckoutSelectors> {
        const action = this._paymentMethodActionCreator.loadPaymentMethod(methodId, options);

        return this._store.dispatch(action, { queueId: 'paymentMethods' });
    }

    initializePaymentMethod(methodId: string, gatewayId?: string, options?: any): Promise<CheckoutSelectors> {
        const action = this._paymentStrategyActionCreator.initialize(methodId, gatewayId, options);

        return this._store.dispatch(action, { queueId: 'paymentStrategy' });
    }

    deinitializePaymentMethod(methodId: string, gatewayId?: string, options?: any): Promise<CheckoutSelectors> {
        const action = this._paymentStrategyActionCreator.deinitialize(methodId, gatewayId, options);

        return this._store.dispatch(action, { queueId: 'paymentStrategy' });
    }

    loadBillingCountries(options?: RequestOptions): Promise<CheckoutSelectors> {
        const action = this._countryActionCreator.loadCountries(options);

        return this._store.dispatch(action, { queueId: 'billingCountries' });
    }

    loadShippingCountries(options?: RequestOptions): Promise<CheckoutSelectors> {
        const action = this._shippingCountryActionCreator.loadCountries(options);

        return this._store.dispatch(action, { queueId: 'shippingCountries' });
    }

    loadBillingAddressFields(options?: RequestOptions): Promise<CheckoutSelectors> {
        return this.loadBillingCountries(options);
    }

    loadShippingAddressFields(options?: RequestOptions): Promise<CheckoutSelectors> {
        return this.loadShippingCountries(options);
    }

    initializeCustomer(options: any = {}): Promise<CheckoutSelectors> {
        return this._store.dispatch(
            this._customerStrategyActionCreator.initialize(options),
            { queueId: 'customerStrategy' }
        );
    }

    deinitializeCustomer(options: any = {}): Promise<CheckoutSelectors> {
        return this._store.dispatch(
            this._customerStrategyActionCreator.deinitialize(options),
            { queueId: 'customerStrategy' }
        );
    }

    signInCustomer(credentials: CustomerCredentials, options: any = {}): Promise<CheckoutSelectors> {
        return this._store.dispatch(
            this._customerStrategyActionCreator.signIn(credentials, options),
            { queueId: 'customerStrategy' }
        );
    }

    signOutCustomer(options: any = {}): Promise<CheckoutSelectors> {
        return this._store.dispatch(
            this._customerStrategyActionCreator.signOut(options),
            { queueId: 'customerStrategy' }
        );
    }

    loadShippingOptions(options?: RequestOptions): Promise<CheckoutSelectors> {
        const action = this._shippingOptionActionCreator.loadShippingOptions(options);

        return this._store.dispatch(action);
    }

    initializeShipping(options?: any): Promise<CheckoutSelectors> {
        const action = this._shippingStrategyActionCreator.initialize(options);

        return this._store.dispatch(action, { queueId: 'shippingStrategy' });
    }

    deinitializeShipping(options?: any): Promise<CheckoutSelectors> {
        const action = this._shippingStrategyActionCreator.deinitialize(options);

        return this._store.dispatch(action, { queueId: 'shippingStrategy' });
    }

    selectShippingOption(addressId: string, shippingOptionId: string, options?: any): Promise<CheckoutSelectors> {
        const action = this._shippingStrategyActionCreator.selectOption(addressId, shippingOptionId, options);

        return this._store.dispatch(action, { queueId: 'shippingStrategy' });
    }

    updateShippingAddress(address: InternalAddress, options?: any): Promise<CheckoutSelectors> {
        const action = this._shippingStrategyActionCreator.updateAddress(address, options);

        return this._store.dispatch(action, { queueId: 'shippingStrategy' });
    }

    updateBillingAddress(address: InternalAddress, options: RequestOptions = {}): Promise<CheckoutSelectors> {
        const action = this._billingAddressActionCreator.updateAddress(address, options);

        return this._store.dispatch(action);
    }

    applyCoupon(code: string, options: RequestOptions = {}): Promise<CheckoutSelectors> {
        const action = this._couponActionCreator.applyCoupon(code, options);

        return this._store.dispatch(action);
    }

    removeCoupon(code: string, options: RequestOptions = {}): Promise<CheckoutSelectors> {
        const action = this._couponActionCreator.removeCoupon(code, options);

        return this._store.dispatch(action);
    }

    applyGiftCertificate(code: string, options: RequestOptions = {}): Promise<CheckoutSelectors> {
        const action = this._giftCertificateActionCreator.applyGiftCertificate(code, options);

        return this._store.dispatch(action);
    }

    removeGiftCertificate(code: string, options: RequestOptions = {}): Promise<CheckoutSelectors> {
        const action = this._giftCertificateActionCreator.removeGiftCertificate(code, options);

        return this._store.dispatch(action);
    }

    loadInstruments(): Promise<CheckoutSelectors> {
        const { storeId, customerId, token } = this._getInstrumentState();

        const action = this._instrumentActionCreator.loadInstruments(
            storeId,
            customerId,
            token
        );

        return this._store.dispatch(action);
    }

    vaultInstrument(instrument: any): Promise<CheckoutSelectors> {
        const { storeId, customerId, token } = this._getInstrumentState();

        const action = this._instrumentActionCreator.vaultInstrument(
            storeId,
            customerId,
            token,
            instrument
        );

        return this._store.dispatch(action);
    }

    deleteInstrument(instrumentId: string): Promise<CheckoutSelectors> {
        const { storeId, customerId, token } = this._getInstrumentState();

        const action = this._instrumentActionCreator.deleteInstrument(
            storeId,
            customerId,
            token,
            instrumentId
        );

        return this._store.dispatch(action);
    }

    private _getInstrumentState(): any {
        const { checkout } = this._store.getState();

        if (!checkout.getConfig() || !checkout.getCustomer() || !checkout.getCheckoutMeta()) {
            throw new MissingDataError();
        }

        const { customerId } = checkout.getCustomer()!;
        const { storeId } = checkout.getConfig();
        const { vaultAccessToken, vaultAccessExpiry } = checkout.getCheckoutMeta();

        return {
            customerId,
            storeId,
            token: {
                vaultAccessToken,
                vaultAccessExpiry,
            },
        };
    }
}