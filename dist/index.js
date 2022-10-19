"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CgcSdk = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
const tcp_channel_1 = require("./tcp-channel");
const uuid_1 = require("uuid");
class CgcSdk {
    constructor(clientId, clientSecret, devMode) {
        this.accessToken = '';
        this.refreshToken = '';
        this.expiryAccessDate = 0;
        this.credentials = {
            client_id: clientId,
            client_secret: clientSecret,
        };
        this.axiosInstance = axios_1.default.create({
            baseURL: devMode ? config_1.HTTP_DEV_URL : config_1.HTTP_URL,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        this.init(devMode);
    }
    init(devMode) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.requestAccessToken();
            this.accessToken = response.access_token;
            this.refreshToken = response.refresh_token;
            this.expiryAccessDate = response.expiry_access_date;
            if (this.accessToken) {
                this.tcpChannel = new tcp_channel_1.TcpChannel(devMode, this.accessToken);
            }
            setInterval(() => {
                this.refreshTokens.bind(this)();
            }, 10000);
        });
    }
    prepareRequestParams(params) {
        return Object.keys(params)
            .map((key) => `${key}=${params[key]}`)
            .join('&');
    }
    requestAccessToken() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const params = Object.assign(Object.assign({}, this.credentials), { grant_type: 'authorization_code' });
            const requestData = this.prepareRequestParams(params);
            try {
                const { data } = yield this.axiosInstance.post('v1/api/oauth2/token', requestData);
                this.accessToken = data.access_token;
                (_a = this.tcpChannel) === null || _a === void 0 ? void 0 : _a.setNewToken(data.access_token);
                return data;
            }
            catch (e) {
                throw new Error(`Request access token failed: ${JSON.stringify(e.message)}`);
            }
        });
    }
    refreshTokens() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.expiryAccessDate < Date.now() + 300000) {
                const response = yield this.renewAccessToken(this.refreshToken);
                if (response) {
                    this.accessToken = response.access_token;
                    this.refreshToken = response.refresh_token;
                    this.expiryAccessDate = response.expiry_access_date;
                }
            }
        });
    }
    renewAccessToken(refresh_token) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const params = Object.assign(Object.assign({}, this.credentials), { refresh_token, grant_type: 'refresh_token' });
            const requestData = this.prepareRequestParams(params);
            try {
                const { data } = yield this.axiosInstance.post('v1/api/oauth2/token', requestData);
                this.accessToken = data.access_token;
                (_a = this.tcpChannel) === null || _a === void 0 ? void 0 : _a.setNewToken(data.access_token);
                return data;
            }
            catch (e) {
                throw new Error(`Renew access token failed: ${JSON.stringify(e.message)}`);
            }
        });
    }
    revokeAccessToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = Object.assign(Object.assign({}, this.credentials), { token });
            const requestData = this.prepareRequestParams(params);
            try {
                const { data } = yield this.axiosInstance.post('v1/api/oauth2/token/revoke', requestData);
                return data;
            }
            catch (e) {
                return { status: 'Error', message: `Revoke token failed with error: ${JSON.stringify(e)}` };
            }
        });
    }
    authorizeUser(email, password) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.axiosInstance.get('v1/api/user', {
                    params: { email },
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-type': 'application/json',
                    },
                });
                return { status: 'Ok', message: 'Successfully authorized' };
            }
            catch (e) {
                if (e.response.status === 422) {
                    try {
                        yield this.axiosInstance.post('v1/api/user', { email, password }, {
                            headers: {
                                Authorization: `Bearer ${this.accessToken}`,
                                'Content-type': 'application/json',
                            },
                        });
                        return { status: 'Ok', message: 'Successfully authorized' };
                    }
                    catch (e) {
                        return {
                            status: 'Error',
                            message: `Create user failed with error: ${JSON.stringify(e)}`,
                        };
                    }
                }
                return {
                    status: 'Error',
                    message: `authorizeUser failed with error: ${JSON.stringify(e)}`,
                };
            }
        });
    }
    getRewardBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            const { data } = yield this.axiosInstance.get('v1/api/reward/balance', {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            });
            return Number(data);
        });
    }
    spendBalance(amount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.axiosInstance.post('v1/api/reward/spend', { amount }, {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                        'Content-type': 'application/json',
                        'unique-request-guid': (0, uuid_1.v4)(),
                    },
                });
                return { status: 'Ok', message: `Successfully spent ${amount}` };
            }
            catch (e) {
                return {
                    status: 'Error',
                    message: `Balance spent failed with error: ${e.response.data.message}`,
                };
            }
        });
    }
    on(event, callback) {
        tcp_channel_1.TcpChannel.userHandlers.set(event, callback);
    }
    sendBalance(eventData, balance) {
        var _a;
        (_a = this.tcpChannel) === null || _a === void 0 ? void 0 : _a.sendBalance(eventData, balance);
    }
    sendWithdrawResult(eventData, result) {
        var _a;
        (_a = this.tcpChannel) === null || _a === void 0 ? void 0 : _a.sendResult(eventData.requestId, result);
    }
    sendRollbackResult(eventData, result) {
        var _a;
        (_a = this.tcpChannel) === null || _a === void 0 ? void 0 : _a.sendResult(eventData.requestId, result);
    }
}
exports.CgcSdk = CgcSdk;
exports.default = CgcSdk;
