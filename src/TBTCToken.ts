import { TBTCToken } from "../generated/schema";
import { ByteArray, Bytes } from "@graphprotocol/graph-ts";

const TBTC_ADDRESS = "0x1bBE271d15Bb64dF0bc6CD28Df9Ff322F2eBD847";
const TBTC_DECIMALS = 18;
const TBTC_NAME = "tBTC";
const TBTC_SYMBOL = "TBTC";

/**
 * Since the details of TBTCTokens are not generated on the fly, we can just hardcode its details here
 * and return the TBTCToken object as a singleton
 */
export function getTBTCToken(): TBTCToken {
  let token = TBTCToken.load(TBTC_ADDRESS);
  if (token == null) {
    token = createTBTCTokenFromConstants();
  }
  return <TBTCToken>token;
}

function createTBTCTokenFromConstants(): TBTCToken {
  let token = new TBTCToken(TBTC_ADDRESS);
  token.address = <Bytes>ByteArray.fromHexString(TBTC_ADDRESS);
  token.decimals = TBTC_DECIMALS;
  token.symbol = TBTC_SYMBOL;
  token.name = TBTC_NAME;
  token.save();
  return token;
}
