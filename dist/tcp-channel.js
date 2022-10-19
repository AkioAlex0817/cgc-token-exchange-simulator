"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TcpChannel = void 0;
const net_1 = __importDefault(require("net"));
const config_1 = require("./config");
class TcpChannel {
    constructor(devMode, token) {
        this.token = token;
        this.handlers = new Map();
        this.host = devMode ? config_1.SOCKET_DEV_HOST : config_1.SOCKET_HOST;
        this.client = net_1.default.createConnection({ port: config_1.SOCKET_PORT, host: this.host }, () => {
            console.log(`Connecting to server: ${this.host}:${config_1.SOCKET_PORT}`);
            this.send(`connect|${token}`);
        });
        this.client.on('error', (err) => {
            var _a;
            console.log('Channel error: ', err);
            (_a = this.client) === null || _a === void 0 ? void 0 : _a.end();
        });
        this.client.on('end', () => {
            console.log('Disconnected from server, trying to reconnect...');
            this.client = net_1.default.createConnection({ port: config_1.SOCKET_PORT, host: this.host }, () => {
                this.send(`connect|${token}`);
            });
        });
        this.client.on('data', (data) => {
            this.handleIncomingData(data.toString());
        });
        this.handlers.set('InGameCurrencyDeposit', this.handleInGameCurrencyDeposit);
        this.handlers.set('BalanceRequested', this.handleBalanceRequested);
        this.handlers.set('NftLinkStatusChanged', this.handleLinkChanged);
        this.handlers.set('InGameCurrencyWithdrawal', this.handleInGameCurrencyWithdrawal);
        this.handlers.set('RollbackWithdrawal', this.handleRollbackWithdrawal);
        this.handlers.set('ping', this.handlePing);
    }
    setNewToken(token) {
        this.token = token;
    }
    parseData(data) {
        console.log('Event received: ', data);
        const parsed = data.split('|');
        if (parsed[0] === 'BalanceRequested') {
            const [event, requestId, email] = parsed;
            return { event, requestId, email };
        }
        else if (parsed[0] === 'InGameCurrencyDeposit') {
            const [event, requestId, email, balance, txHash] = parsed;
            return { event, requestId, email, balanceIncrease: Number(balance), txHash };
        }
        else if (parsed[0] === 'NftLinkStatusChanged') {
            const [event, requestId, msg] = parsed;
            return { event, requestId, msg: JSON.parse(msg) };
        }
        else if (parsed[0] === 'InGameCurrencyWithdrawal') {
            const [event, requestId, email, amount] = parsed;
            return { event, requestId, email, balanceDecrease: Number(amount) };
        }
        else if (parsed[0] === 'RollbackWithdrawal') {
            const [event, requestId, email, amount, txHash] = parsed;
            return { event, requestId, email, balanceIncrease: Number(amount), txHash };
        }
        else if (parsed[0] === 'ping') {
            const [event, requestId] = parsed;
            return { event, requestId };
        }
        const [event] = parsed;
        return { event };
    }
    handleIncomingData(data) {
        const parsed = this.parseData(data);
        try {
            console.log('Get handler for: ', parsed.event);
            const fn = this.handlers.get(parsed.event);
            if (fn) {
                fn.bind(this)(parsed);
            }
        }
        catch (_a) {
            console.error('Failed to handle incoming data');
        }
    }
    send(data) {
        var _a;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.write(data);
    }
    handleInGameCurrencyDeposit(parsed) {
        var _a;
        const data = parsed;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.write(`accepted|${this.token}|${data.requestId}`);
        const fn = TcpChannel.userHandlers.get(data.event);
        if (fn) {
            fn(data);
        }
    }
    handleBalanceRequested(parsed) {
        const data = parsed;
        const fn = TcpChannel.userHandlers.get(data.event);
        if (fn) {
            fn(data);
        }
    }
    handleLinkChanged(parsed) {
        var _a;
        const data = parsed;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.write(`accepted|${this.token}|${data.requestId}`);
        const fn = TcpChannel.userHandlers.get(data.event);
        if (fn) {
            fn(data.msg);
        }
    }
    sendBalance(data, balance) {
        var _a;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.write(`balance|${this.token}|${data.requestId}|${data.email}|${balance}`);
    }
    handleInGameCurrencyWithdrawal(parsed) {
        const data = parsed;
        const fn = TcpChannel.userHandlers.get(data.event);
        if (fn) {
            fn(data);
        }
    }
    handleRollbackWithdrawal(parsed) {
        const data = parsed;
        const fn = TcpChannel.userHandlers.get(data.event);
        if (fn) {
            fn(data);
        }
    }
    sendResult(requestId, result) {
        var _a;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.write(`withdrawal|${this.token}|${requestId}|${result}`);
    }
    handlePing(parsed) {
        var _a;
        const data = parsed;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.write(`pong|${this.token}|${data.requestId}`);
    }
}
exports.TcpChannel = TcpChannel;
TcpChannel.userHandlers = new Map();
