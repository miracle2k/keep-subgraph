import {Transfer as TDTTransfer} from "../generated/TBTCDepositToken/TBTCDepositToken";
import {Deposit, TBTCDepositToken} from "../generated/schema";
import {getDepositIdFromTokenID, getDepositTokenIdFromTokenID, saveDeposit} from "./mapping";
import {ZERO_ADDRESS} from "./constants";
import {log} from "@graphprotocol/graph-ts/index";


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
  log.info('fooo: tokenid={}, depositid={}', [event.params.tokenId.toHex(), getDepositIdFromTokenID(event.params.tokenId)])
  if (deposit) {
    deposit.owner = depositToken!.owner;
    log.info('fooo: tokenid={}: deposit found! {}, {}', [event.params.tokenId.toHex(), depositToken!.owner.toHexString(), deposit.owner.toHexString()])
    saveDeposit(deposit!, event.block);
  } else {
    log.info('fooo: tokenid={}: not found!', [event.params.tokenId.toHex()])
  }
}
