import axios, { AxiosInstance } from 'axios';
import {
  ActionResponse,
  BalanceRequestedEvent,
  Credentials,
  RenewTokenParams,
  RequestAccessParams,
  RevokeAccessParams, RollbackWithdrawalEvent,
  TokenResponse, WithdrawalEvent
} from "./interfaces";
import { HTTP_DEV_URL, HTTP_URL } from './config';
import { TcpChannel } from './tcp-channel';
import { v4 } from 'uuid';

export class CgcSdk {
  tcpChannel: TcpChannel | undefined;
  private readonly credentials: Credentials;
  private axiosInstance: AxiosInstance;
  private accessToken: string;
  private refreshToken: string;
  private expiryAccessDate: number;

  constructor(clientId: string, clientSecret: string, devMode: boolean) {
    this.accessToken = '';
    this.refreshToken = '';
    this.expiryAccessDate = 0;
    this.credentials = {
      client_id: clientId,
      client_secret: clientSecret,
    };

    this.axiosInstance = axios.create({
      baseURL: devMode ? HTTP_DEV_URL : HTTP_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    this.init(devMode);
  }

  async init(devMode: boolean) {
    const response = await this.requestAccessToken();
    this.accessToken = response.access_token;
    this.refreshToken = response.refresh_token;
    this.expiryAccessDate = response.expiry_access_date;
    if (this.accessToken) {
      this.tcpChannel = new TcpChannel(devMode, this.accessToken);
    }
    setInterval(() => {
      this.refreshTokens.bind(this)();
    }, 10000);
  }

  prepareRequestParams<T>(params: T): string {
    return Object.keys(params)
      .map((key) => `${key}=${params[key as keyof T]}`)
      .join('&');
  }

  async requestAccessToken(): Promise<TokenResponse> {
    const params: RequestAccessParams = {
      ...this.credentials,
      grant_type: 'authorization_code',
    };
    const requestData = this.prepareRequestParams(params);
    try {
      const { data } = await this.axiosInstance.post('v1/api/oauth2/token', requestData);
      this.accessToken = data.access_token;
      this.tcpChannel?.setNewToken(data.access_token);
      return data;
    } catch (e: any) {
      throw new Error(`Request access token failed: ${JSON.stringify(e.message)}`);
    }
  }

  async refreshTokens(): Promise<void> {
    if (this.expiryAccessDate < Date.now() + 300000) {
      const response = await this.renewAccessToken(this.refreshToken);
      if (response) {
        this.accessToken = response.access_token;
        this.refreshToken = response.refresh_token;
        this.expiryAccessDate = response.expiry_access_date;
      }
    }
  }

  async renewAccessToken(refresh_token: string): Promise<TokenResponse> {
    const params: RenewTokenParams = {
      ...this.credentials,
      refresh_token,
      grant_type: 'refresh_token',
    };
    const requestData = this.prepareRequestParams(params);
    try {
      const { data } = await this.axiosInstance.post('v1/api/oauth2/token', requestData);
      this.accessToken = data.access_token;
      this.tcpChannel?.setNewToken(data.access_token);
      return data;
    } catch (e: any) {
      throw new Error(`Renew access token failed: ${JSON.stringify(e.message)}`);
    }
  }

  async revokeAccessToken(token: string): Promise<ActionResponse> {
    const params: RevokeAccessParams = {
      ...this.credentials,
      token,
    };
    const requestData = this.prepareRequestParams(params);
    try {
      const { data } = await this.axiosInstance.post('v1/api/oauth2/token/revoke', requestData);
      return data;
    } catch (e) {
      return { status: 'Error', message: `Revoke token failed with error: ${JSON.stringify(e)}` };
    }
  }

  async authorizeUser(email: string, password: string): Promise<ActionResponse> {
    try {
      await this.axiosInstance.get('v1/api/user', {
        params: { email },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-type': 'application/json',
        },
      });
      return { status: 'Ok', message: 'Successfully authorized' };
    } catch (e: any) {
      if (e.response.status === 422) {
        try {
          await this.axiosInstance.post(
            'v1/api/user',
            { email, password },
            {
              headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-type': 'application/json',
              },
            }
          );
          return { status: 'Ok', message: 'Successfully authorized' };
        } catch (e) {
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
  }

  async getRewardBalance(): Promise<number> {
    const { data } = await this.axiosInstance.get('v1/api/reward/balance', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
    return Number(data);
  }

  async spendBalance(amount: number): Promise<ActionResponse> {
    try {
      await this.axiosInstance.post(
        'v1/api/reward/spend',
        { amount },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-type': 'application/json',
            'unique-request-guid': v4(),
          },
        }
      );
      return { status: 'Ok', message: `Successfully spent ${amount}` };
    } catch (e: any) {
      return {
        status: 'Error',
        message: `Balance spent failed with error: ${e.response.data.message}`,
      };
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    TcpChannel.userHandlers.set(event, callback);
  }

  sendBalance(eventData: BalanceRequestedEvent, balance: number) {
    this.tcpChannel?.sendBalance(eventData, balance);
  }

  sendWithdrawResult(eventData: WithdrawalEvent, result: string) {
    this.tcpChannel?.sendResult(eventData.requestId, result);
  }

  sendRollbackResult(eventData: RollbackWithdrawalEvent, result: string) {
    this.tcpChannel?.sendResult(eventData.requestId, result);
  }
}

export default CgcSdk;
