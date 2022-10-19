import net, { Socket } from 'net';
import { SOCKET_DEV_HOST, SOCKET_HOST, SOCKET_PORT } from './config';
import {
  InGameCurrencyDepositEvent,
  BalanceRequestedEvent,
  NftLinkStatusChangedEvent, PingEvent,
  ReceivedEvent,
  WithdrawalEvent, RollbackWithdrawalEvent
} from "./interfaces";

export class TcpChannel {
  static userHandlers = new Map<string, (...args: any[]) => void>();
  private client: Socket | undefined;
  private readonly host: string;
  private handlers = new Map<string, (data: ReceivedEvent) => void>();

  constructor(devMode: boolean, private token: string) {
    this.host = devMode ? SOCKET_DEV_HOST : SOCKET_HOST;
    this.client = net.createConnection({ port: SOCKET_PORT, host: this.host }, () => {
      console.log(`Connecting to server: ${this.host}:${SOCKET_PORT}`);
      this.send(`connect|${token}`);
    });

    this.client.on('error', (err:any) => {
      console.log('Channel error: ', err);
      this.client?.end();
    });

    this.client.on('end', () => {
      console.log('Disconnected from server, trying to reconnect...');
      this.client = net.createConnection({ port: SOCKET_PORT, host: this.host }, () => {
        this.send(`connect|${token}`);
      });
    });

    this.client.on('data', (data:any) => {
      this.handleIncomingData(data.toString());
    });

    this.handlers.set('InGameCurrencyDeposit', this.handleInGameCurrencyDeposit);
    this.handlers.set('BalanceRequested', this.handleBalanceRequested);
    this.handlers.set('NftLinkStatusChanged', this.handleLinkChanged);
    this.handlers.set('InGameCurrencyWithdrawal', this.handleInGameCurrencyWithdrawal);
    this.handlers.set('RollbackWithdrawal', this.handleRollbackWithdrawal);
    this.handlers.set('ping', this.handlePing);
  }

  setNewToken(token: string) {
    this.token = token;
  }

  parseData(data: string): ReceivedEvent {
    console.log('Event received: ', data);
    const parsed = data.split('|');
    if (parsed[0] === 'BalanceRequested') {
      const [event, requestId, email] = parsed;
      return { event, requestId, email};
    } else if (parsed[0] === 'InGameCurrencyDeposit') {
      const [event, requestId, email, balance, txHash] = parsed;
      return { event,  requestId, email, balanceIncrease: Number(balance), txHash };
    } else if (parsed[0] === 'NftLinkStatusChanged') {
      const [event, requestId, msg] = parsed;
      return { event,  requestId, msg: JSON.parse(msg) };
    } else if (parsed[0] === 'InGameCurrencyWithdrawal') {
      const [event, requestId, email, amount] = parsed;
      return { event,  requestId, email, balanceDecrease: Number(amount) };
    }else if (parsed[0] === 'RollbackWithdrawal') {
      const [event, requestId, email, amount, txHash] = parsed;
      return { event,  requestId, email, balanceIncrease: Number(amount), txHash };
    } else if (parsed[0] === 'ping') {
      const [event, requestId] = parsed;
      return { event,  requestId };
    }
    const [event] = parsed;
    return { event };
  }

  handleIncomingData(data: string) {
    const parsed = this.parseData(data);
    try {
      console.log('Get handler for: ', parsed.event);
      const fn = this.handlers.get(parsed.event);
      if (fn) {
        fn.bind(this)(parsed);
      }
    } catch {
      console.error('Failed to handle incoming data');
    }
  }

  send(data: string) {
    this.client?.write(data);
  }

  handleInGameCurrencyDeposit(parsed: ReceivedEvent) {
    const data = parsed as InGameCurrencyDepositEvent;
    this.client?.write(`accepted|${this.token}|${data.requestId}`);
    const fn = TcpChannel.userHandlers.get(data.event);
    if (fn) {
      fn(data);
    }
  }

  handleBalanceRequested(parsed: ReceivedEvent) {
    const data = parsed as BalanceRequestedEvent;
    const fn = TcpChannel.userHandlers.get(data.event);
    if (fn) {
      fn(data);
    }
  }

  handleLinkChanged(parsed: ReceivedEvent) {
    const data = parsed as NftLinkStatusChangedEvent;
    this.client?.write(`accepted|${this.token}|${data.requestId}`);
    const fn = TcpChannel.userHandlers.get(data.event);
    if (fn) {
      fn(data.msg);
    }
  }

  sendBalance(data: BalanceRequestedEvent, balance: number) {
    this.client?.write(`balance|${this.token}|${data.requestId}|${data.email}|${balance}`);
  }

  handleInGameCurrencyWithdrawal(parsed: ReceivedEvent) {
    const data = parsed as WithdrawalEvent;
    const fn = TcpChannel.userHandlers.get(data.event);
    if (fn) {
      fn(data);
    }
  }

  handleRollbackWithdrawal(parsed: ReceivedEvent) {
    const data = parsed as RollbackWithdrawalEvent;
    const fn = TcpChannel.userHandlers.get(data.event);
    if (fn) {
      fn(data);
    }
  }

  sendResult(requestId: string, result: string) {
    this.client?.write(`withdrawal|${this.token}|${requestId}|${result}`);
  }

  handlePing(parsed: ReceivedEvent) {
    const data = parsed as PingEvent;
    this.client?.write(`pong|${this.token}|${data.requestId}`);
  }
}