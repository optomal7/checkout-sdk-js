import { omit, pick } from 'lodash';
import { MissingDataError } from '../common/error/errors';

export default class PlaceOrderService {
    /**
     * @constructor
     * @param {DataStore} store
     * @param {OrderActionCreator} orderActionCreator
     * @param {PaymentActionCreator} paymentActionCreator
     */
    constructor(store, orderActionCreator, paymentActionCreator) {
        this._store = store;
        this._orderActionCreator = orderActionCreator;
        this._paymentActionCreator = paymentActionCreator;
    }

    /**
     * @todo Remove `shouldVerifyCart` flag in the future. Always verify cart by default
     * @param {OrderRequestBody} payload
     * @param {boolean} [shouldVerifyCart=false]
     * @param {RequestOptions} [options]
     * @return {Promise<CheckoutSelectors>}
     */
    submitOrder(payload, shouldVerifyCart = false, options) {
        const { checkout } = this._store.getState();
        const cart = checkout.getCart();

        if (!cart) {
            throw new MissingDataError();
        }

        const action = this._orderActionCreator.submitOrder(
            payload,
            shouldVerifyCart ? cart : undefined,
            options
        );

        return this._store.dispatch(action);
    }

    /**
     * @param {number} orderId
     * @param {RequestOptions} [options]
     * @return {Promise<CheckoutSelectors>}
     */
    finalizeOrder(orderId, options) {
        return this._store.dispatch(this._orderActionCreator.finalizeOrder(orderId, options));
    }

    /**
     * @param {Payment} payment
     * @param {boolean} [useStoreCredit=false]
     * @param {RequestOptions} [options]
     * @return {Promise<CheckoutSelectors>}
     */
    submitPayment(payment, useStoreCredit = false, options) {
        if (!this._shouldSubmitPayment(useStoreCredit)) {
            return Promise.resolve(this._store.getState());
        }

        const payload = this._getPaymentRequestBody(payment);

        return this._store.dispatch(this._paymentActionCreator.submitPayment(payload, options))
            .then(({ checkout }) => {
                const { orderId } = checkout.getOrder();

                return this._store.dispatch(this._orderActionCreator.loadOrder(orderId, options));
            });
    }

    /**
     * @param {Payment} payment
     * @param {boolean} [useStoreCredit=false]
     * @param {RequestOptions} [options]
     * @return {Promise<CheckoutSelectors>}
     */
    initializeOffsitePayment(payment, useStoreCredit = false, options) {
        if (!this._shouldSubmitPayment(useStoreCredit)) {
            return Promise.resolve(this._store.getState());
        }

        const payload = this._getPaymentRequestBody(payment);

        return this._store.dispatch(this._paymentActionCreator.initializeOffsitePayment(payload, options));
    }

    /**
     * @private
     * @param {boolean} useStoreCredit
     * @return {boolean}
     */
    _shouldSubmitPayment(useStoreCredit) {
        const { checkout } = this._store.getState();

        return checkout.isPaymentDataRequired(useStoreCredit);
    }

    /**
     * @private
     * @param {Payment} payment
     * @return {PaymentRequestBody}
     */
    _getPaymentRequestBody(payment) {
        const { checkout } = this._store.getState();
        const deviceSessionId = payment.paymentData && payment.paymentData.deviceSessionId || checkout.getCheckoutMeta().deviceSessionId;
        const checkoutMeta = checkout.getCheckoutMeta();
        const billingAddress = checkout.getBillingAddress();
        const cart = checkout.getCart();
        const customer = checkout.getCustomer();
        const order = checkout.getOrder();
        const paymentMethod = checkout.getPaymentMethod(payment.name, payment.gateway);
        const shippingAddress = checkout.getShippingAddress();
        const shippingOption = checkout.getSelectedShippingOption();
        const config = checkout.getConfig();

        const authToken = payment.paymentData && payment.paymentData.instrumentId
            ? `${checkoutMeta.paymentAuthToken}, ${checkoutMeta.vaultAccessToken}`
            : checkoutMeta.paymentAuthToken;

        return {
            billingAddress,
            cart,
            customer,
            order,
            paymentMethod,
            shippingAddress,
            shippingOption,
            authToken,
            orderMeta: pick(checkoutMeta, ['deviceFingerprint']),
            payment: omit(payment.paymentData, ['deviceSessionId']),
            quoteMeta: {
                request: {
                    ...pick(checkoutMeta, [
                        'geoCountryCode',
                        'sessionHash',
                    ]),
                    deviceSessionId,
                },
            },
            source: payment.source || 'bcapp-checkout-uco',
            store: pick(config, [
                'storeHash',
                'storeId',
                'storeLanguage',
                'storeName',
            ]),
        };
    }
}
