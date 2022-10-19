import { BalanceRequestedEvent, ReceivedEvent } from "./interfaces";
export declare class TcpChannel {
    private token;
    static userHandlers: Map<string, (...args: any[]) => void>;
    private client;
    private readonly host;
    private handlers;
    constructor(devMode: boolean, token: string);
    setNewToken(token: string): void;
    parseData(data: string): ReceivedEvent;
    handleIncomingData(data: string): void;
    send(data: string): void;
    handleInGameCurrencyDeposit(parsed: ReceivedEvent): void;
    handleBalanceRequested(parsed: ReceivedEvent): void;
    handleLinkChanged(parsed: ReceivedEvent): void;
    sendBalance(data: BalanceRequestedEvent, balance: number): void;
    handleInGameCurrencyWithdrawal(parsed: ReceivedEvent): void;
    handleRollbackWithdrawal(parsed: ReceivedEvent): void;
    sendResult(requestId: string, result: string): void;
    handlePing(parsed: ReceivedEvent): void;
}
