export interface Credentials {
    client_id: string;
    client_secret: string;
}
export interface RequestAccessParams extends Credentials {
    grant_type: string;
}
export interface RevokeAccessParams extends Credentials {
    token: string;
}
export interface RenewTokenParams extends RequestAccessParams {
    refresh_token: string;
}
export interface TokenResponse {
    access_token: string;
    expiry_access_date: number;
    refresh_token: string;
    token_type: string;
}
export interface ActionResponse {
    status?: string | undefined;
    statusCode?: number | undefined;
    message: string;
}
export interface NftStateEvent {
    user_email: number;
    wallet_address: string;
    token_address: string;
    status: number;
    metadata: string;
}
export declare type ReceivedEvent = BalanceRequestedEvent | InGameCurrencyDepositEvent | NftLinkStatusChangedEvent | BadTokenEvent | WithdrawalEvent | PingEvent | RollbackWithdrawalEvent;
export interface BalanceRequestedEvent extends BadTokenEvent {
    requestId: string;
    email: string;
}
export interface InGameCurrencyDepositEvent extends BalanceRequestedEvent {
    balanceIncrease: number;
    txHash: string;
}
export interface NftLinkStatusChangedEvent {
    event: string;
    requestId: string;
    msg: NftStateEvent;
}
export interface BadTokenEvent {
    event: string;
}
export interface PingEvent extends BadTokenEvent {
    requestId: string;
}
export interface WithdrawalEvent extends BalanceRequestedEvent {
    balanceDecrease: number;
}
export interface RollbackWithdrawalEvent extends BalanceRequestedEvent {
    balanceIncrease: number;
    txHash: string;
}
