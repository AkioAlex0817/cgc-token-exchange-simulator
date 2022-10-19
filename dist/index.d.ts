import { ActionResponse, BalanceRequestedEvent, RollbackWithdrawalEvent, TokenResponse, WithdrawalEvent } from "./interfaces";
import { TcpChannel } from './tcp-channel';
export declare class CgcSdk {
    tcpChannel: TcpChannel | undefined;
    private readonly credentials;
    private axiosInstance;
    private accessToken;
    private refreshToken;
    private expiryAccessDate;
    constructor(clientId: string, clientSecret: string, devMode: boolean);
    init(devMode: boolean): Promise<void>;
    prepareRequestParams<T>(params: T): string;
    requestAccessToken(): Promise<TokenResponse>;
    refreshTokens(): Promise<void>;
    renewAccessToken(refresh_token: string): Promise<TokenResponse>;
    revokeAccessToken(token: string): Promise<ActionResponse>;
    authorizeUser(email: string, password: string): Promise<ActionResponse>;
    getRewardBalance(): Promise<number>;
    spendBalance(amount: number): Promise<ActionResponse>;
    on(event: string, callback: (...args: any[]) => void): void;
    sendBalance(eventData: BalanceRequestedEvent, balance: number): void;
    sendWithdrawResult(eventData: WithdrawalEvent, result: string): void;
    sendRollbackResult(eventData: RollbackWithdrawalEvent, result: string): void;
}
export default CgcSdk;
