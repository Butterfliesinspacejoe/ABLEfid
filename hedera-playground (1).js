
const {
    AccountId,
    PrivateKey,
    Client,
    TokenCreateTransaction,
    TokenType
  } = require("@hashgraph/sdk"); // v2.64.5

async function main() {
  let client;
  try {
    // Your account ID and private key from string value
    const MY_ACCOUNT_ID = AccountId.fromString("0.0.6558560");
    const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA("bf8d246fe3b9f921044339065d334dc6071711eb893b9d7e3303dd783cd800cc");

    // Pre-configured client for test network (testnet)
    client = Client.forTestnet();

    //Set the operator with the account ID and private key
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    // Start your code here
  
    
    //Create the transaction and freeze for manual signing
    const txTokenCreate = await new TokenCreateTransaction()
      .setTokenName("USDC ABLE Account on Hedera")
      .setTokenSymbol("USDC")
      .setTokenType(TokenType.FungibleCommon)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setInitialSupply(1000000)
      .freezeWith(client);

    //Sign the transaction with the token treasury account private key
    const signTxTokenCreate =  await txTokenCreate.sign(MY_PRIVATE_KEY);

    //Sign the transaction with the client operator private key and submit to a Hedera network
    const txTokenCreateResponse = await signTxTokenCreate.execute(client);

    //Get the receipt of the transaction
    const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(client);

    //Get the token ID from the receipt
    const tokenId = receiptTokenCreateTx.tokenId;

    //Get the transaction consensus status
    const statusTokenCreateTx = receiptTokenCreateTx.status;

    //Get the Transaction ID
    const txTokenCreateId = txTokenCreateResponse.transactionId.toString();

    console.log("--------------------------------- Token Creation ---------------------------------");
    console.log("Receipt status           :", statusTokenCreateTx.toString());
    console.log("Transaction ID           :", txTokenCreateId);
    console.log("Hashscan URL             :", "https://hashscan.io/testnet/tx/" + txTokenCreateId);
    console.log("Token ID                 :", tokenId.toString());
    
  } catch (error) {
    console.error(error);
  } finally {
    if (client) client.close();
  }
}

main();
