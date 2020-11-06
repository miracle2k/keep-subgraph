import {Transfer as TDTTransfer} from "../generated/TBTCDepositToken/TBTCDepositToken";
import {Deposit, TBTCDepositToken} from "../generated/schema";
import {getDepositIdFromTokenID, getDepositTokenIdFromTokenID, saveDeposit} from "./mapping";
import {ZERO_ADDRESS} from "./constants";


/**
 * Event: TDTTransfer
 *
 * Emitted when the tBTC Deposit NFT token changes owner, and also, when it is first minted.
 */
export function handleTDTTransfer(event: TDTTransfer): void {
  let tokenId = getDepositTokenIdFromTokenID(event.params.tokenId);

  let depositToken: TBTCDepositToken;

  // A mint
  if (event.params.from.toHexString() == ZERO_ADDRESS) {
    depositToken = new TBTCDepositToken(tokenId);
    depositToken.deposit = getDepositIdFromTokenID(event.params.tokenId);
    depositToken.tokenID = event.params.tokenId;
    depositToken.owner = event.params.to;
    depositToken.minter = event.params.to;
    depositToken.mintedAt = event.block.timestamp;
    depositToken.save();
  }
  else {
    depositToken = new TBTCDepositToken(tokenId);
    depositToken.owner = event.params.to;
    depositToken.save()
  }

  // The "owner" field is copied into the deposit, update it there a well. Note this will not work
  // during minting, the deposit does not exist yet. This mint event is emitted *before* the
  // "deposit create" event.
  let deposit = Deposit.load(getDepositIdFromTokenID(event.params.tokenId))
  if (deposit) {
    deposit.owner = depositToken!.owner;
    saveDeposit(deposit!, event.block);
  }
}
