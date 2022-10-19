// @ts-ignore
import CatheonGamingSdk from "cgc-js-sdk";
import {
  InGameCurrencyDepositEvent,
  BalanceRequestedEvent,
  NftStateEvent,
  WithdrawalEvent, RollbackWithdrawalEvent
} from "cgc-js-sdk/src/interfaces";

const cgcSdk = new CatheonGamingSdk("32b0e3fd-42d0-42a3-8b1e-3993cf956837", "1qaz2wsx", true);
//const cgcSdk = new CatheonGamingSdk("773124bb-57cf-4eae-a7be-980c76ccd339", "1qaz2wsx", true);

const userBalances = new Map<string, number>();

const run = async () => {

  setInterval(() => {
    console.log("userBalances", userBalances);
  }, 5000);

  try {
    const cgcTokenResponse = await cgcSdk.requestAccessToken();
    console.log("Response: ", cgcTokenResponse);
    // const renew = await cgcSdk.renewAccessToken(cgcTokenResponse.refresh_token)
    // console.log('Renew: ', renew);
    // const result = await cgcSdk.revokeAccessToken(renew.access_token)
    // console.log('result: ', result);
    // const response = await cgcSdk.authorizeUser('test@hotmail.co.uk', '1qaz2wsx');
    // const response = await cgcSdk.authorizeUser('test2@hotmail.co.uk', '1qaz2wsx');
    // const result = await cgcSdk.getRewardBalance()
    // console.log('reward balance: ', result);
    // const result1 = await cgcSdk.spendBalance(5000)
    // console.log('spend balance: ', result1);
    // const result2 = await cgcSdk.getRewardBalance()
    // console.log('reward balance: ', result2);


    cgcSdk.on("BalanceRequested", handleBalanceRequested);
    cgcSdk.on("InGameCurrencyDeposit", handleInGameCurrencyDeposit);
    cgcSdk.on("NftLinkStatusChanged", handleNftLinkStatusChanged);
    cgcSdk.on("InGameCurrencyWithdrawal", handleInGameCurrencyWithdrawal);
    cgcSdk.on("RollbackWithdrawal", handleRollbackWithdrawal);
  } catch (e) {
    console.log(e);
  }
};

const handleBalanceRequested = (eventData: BalanceRequestedEvent) => {
  console.log("Balance requested: ", eventData);
  console.log("User Balance: ", userBalances.get(eventData.email));
  cgcSdk.sendBalance(eventData, userBalances.get(eventData.email) ?? 0);
};

const handleInGameCurrencyDeposit = (eventData: InGameCurrencyDepositEvent) => {
  console.log("New deposit for user with email ", eventData.email, " :", eventData.balanceIncrease);
  userBalances.set(eventData.email, (userBalances.get(eventData.email) ?? 0) + eventData.balanceIncrease);
};

const handleNftLinkStatusChanged = (eventData: NftStateEvent) => {
  console.log("Nft link state changed:");
  console.log("userEmail: ", eventData.user_email);
  console.log("walletAddress: ", eventData.wallet_address);
  console.log("tokenAddress: ", eventData.token_address);
  console.log("status: ", eventData.status);
  console.log("metadata: ", eventData.metadata);
};

const handleInGameCurrencyWithdrawal = (eventData: WithdrawalEvent) => {
  console.log('Client wants to withdraw ' + eventData.balanceDecrease + ' coins, email: ', eventData.email);
  userBalances.set(eventData.email, (userBalances.get(eventData.email) ?? 0) - eventData.balanceDecrease);
  cgcSdk.sendWithdrawResult(eventData, 'success');
};

const handleRollbackWithdrawal = (eventData: RollbackWithdrawalEvent) => {
  console.log('Need to restore client balance ' + eventData.balanceIncrease + ' coins, email: ', eventData.email);
  userBalances.set(eventData.email, (userBalances.get(eventData.email) ?? 0) + eventData.balanceIncrease);
  cgcSdk.sendRollbackResult(eventData, 'success');
};
run().then();
