import {
  Created,
  StartedLiquidation,
  CourtesyCalled,
  Liquidated,
  RedemptionRequested,
  GotRedemptionSignature,
  Redeemed,
  Funded,
  RegisteredPubkey,
  SetupFailed,
} from "../generated/TBTCSystem/TBTCSystem";
import { log, BigInt, Address, ethereum, Entity, DataSourceContext, BigDecimal } from "@graphprotocol/graph-ts";
import { Transfer as TDTTransfer } from "../generated/TBTCDepositToken/TBTCDepositToken";
import { DepositContract as DepositSmartContract } from "../generated/templates/DepositContract/DepositContract";
import { BondedECDSAKeep as KeepSmartContract } from "../generated/templates/BondedECDSAKeep/BondedECDSAKeep";
import { BondedECDSAKeep as BondedECDSAKeepTemplate } from "../generated/templates";
import {
  Deposit,
  BondedECDSAKeep,
  DepositLiquidation,
  DepositRedemption,
  TBTCDepositToken,
  RedeemedEvent,
  FundedEvent,
  GotRedemptionSignatureEvent,
  RedemptionRequestedEvent,
  RegisteredPubKeyEvent,
  SetupFailedEvent,
  CourtesyCalledEvent,
  LiquidatedEvent,
  StartedLiquidationEvent,
  CreatedEvent,
} from "../generated/schema";
import {getIDFromEvent} from "./utils";
import {Value} from "@graphprotocol/graph-ts/index";
import {getOrCreateKeepMember} from "./helpers";
import {BIGINT_ZERO} from "./constants";


// Wild-card re-export compiles but then does not find the functions at runtime.
export {handleLotSizesUpdateStarted} from './mappingGovernance';
export {handleLotSizesUpdated} from './mappingGovernance';
export {handleKeepFactoriesUpdateStarted} from './mappingGovernance';
export {handleKeepFactoriesUpdated} from './mappingGovernance';


const DPL = 'dpl-';
const DPR = 'dpr-';
const DP = 'dp-';


/**
 * As the id of the deposit we use the address of the generated deposit contract. Keep itself uses the
 * token id encoded for that address. We can therefore determine the ID of a deposit through either the
 * token id, or through the contract address.
 */
export function getDepositIdFromAddress(address: Address): string {
  return DP+address.toHexString();
}
export function getDepositIdFromTokenID(tokenID: BigInt): string {
  return DP + getDepositTokenIdFromTokenID(tokenID);
}


function getDepositTokenIdFromTokenID(tokenID: BigInt): string {
  // A simple toHexString() does not work, as a leading 0 would often be not included, which would make
  // the id returned not match the deposit contract address used by Keep.
  // See also: https://github.com/graphprotocol/graph-ts/issues/16
  return ("0x" + tokenID.toHexString().slice(2).padStart(40, '0'))
}
function getDepositTokenIdFromDepositAddress(address: Address): string {
  return address.toHexString();
}


export function completeLogEvent<T extends Entity>(log: T, event: ethereum.Event): void {
  completeLogEventRaw(log, event.transaction, event.block)
}

export function completeLogEventRaw<T extends Entity>(log: T, tx: ethereum.Transaction, block: ethereum.Block): void {
  log.set("submitter", Value.fromBytes(tx.from));
  log.set("transactionHash", Value.fromString(tx.hash.toHexString()))
  log.set("timestamp", Value.fromBigInt(block.timestamp))
  // Why is  nameof() not avaialble?
  //store.set(nameof(typeof log), log.getString("id"), log);
}


function getOrCreateDeposit(depositID: string): Deposit {
  let deposit = Deposit.load(depositID);
  if (deposit == null) {
    deposit = new Deposit(depositID);
  }
  return <Deposit>deposit;
}

export function handleCreatedEvent(event: Created): void {
  let contractAddress = event.params._depositContractAddress;
  let keepAddress = event.params._keepAddress;
  
  let deposit = getOrCreateDeposit(getDepositIdFromAddress(contractAddress));
  deposit.tbtcSystem = event.address;
  deposit.contractAddress = contractAddress;
  deposit.currentState = "AWAITING_SIGNER_SETUP";
  deposit.keepAddress = event.params._keepAddress;
  deposit.createdAt = event.block.timestamp;
  deposit.tdtToken = getDepositTokenIdFromDepositAddress(contractAddress)
  deposit.owner = event.transaction.from;

  // this indexes the newly created contract address for events
  let context = new DataSourceContext()
  BondedECDSAKeepTemplate.createWithContext(keepAddress, context);

  let depositSmartContract = DepositSmartContract.bind(contractAddress);
  deposit.lotSizeSatoshis = depositSmartContract.lotSizeSatoshis();
  deposit.initialCollateralizedPercent = depositSmartContract.initialCollateralizedPercent();
  deposit.undercollateralizedThresholdPercent = depositSmartContract.undercollateralizedThresholdPercent();
  deposit.severelyUndercollateralizedThresholdPercent = depositSmartContract.severelyUndercollateralizedThresholdPercent();
  deposit.signerFee = depositSmartContract.signerFeeTbtc();

  let bondedECDSAKeep = newBondedECDSAKeep(deposit, keepAddress, event);

  deposit.bondedECDSAKeep = bondedECDSAKeep.id;
  saveDeposit(deposit);

  let logEvent = new CreatedEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  completeLogEvent(logEvent, event); logEvent.save()
}

// Do not save a deposit directly. There are certain denormalized values which need to be recalculated
function saveDeposit(deposit: Deposit): void {
  deposit.filter_activeLikeState = (
      deposit.currentState !== "FAILED_SETUP" &&
      deposit.currentState !== "LIQUIDATED" &&
      deposit.currentState !== "REDEEMED"
  )
  deposit.filter_liquidationLikeState = (
      deposit.currentState === "COURTESY_CALL" ||
      deposit.currentState === "FRAUD_LIQUIDATION_IN_PROGRESS" ||
      deposit.currentState === "LIQUIDATION_IN_PROGRESS" ||
      deposit.currentState === "LIQUIDATED"
  )

  let ownedByVendingMachine = deposit.owner.toHexString() == '0x526c08e5532a9308b3fb33b7968ef78a5005d2ac';

  deposit.filter_unmintedTDT = (
      deposit.currentState === "ACTIVE" ||
      deposit.currentState === "AWAITING_WITHDRAWAL_SIGNATURE" ||
      deposit.currentState === "AWAITING_WITHDRAWAL_PROOF" ||
      deposit.currentState === "COURTESY_CALL" ||
      deposit.currentState === "FRAUD_LIQUIDATION_IN_PROGRESS" ||
      deposit.currentState === "LIQUIDATION_IN_PROGRESS"

  ) && !ownedByVendingMachine;

  if (deposit.currentState === "COURTESY_CALL" || ownedByVendingMachine) {
    deposit.filter_redeemableAsOf = BigInt.fromI32(2147483647);  // equiv to about year 2038 - need to figure out how to do fromI64()
  }
  else if (deposit.currentState !== "ACTIVE") {
    deposit.filter_redeemableAsOf = BIGINT_ZERO;
  }
  else {
    deposit.filter_redeemableAsOf = deposit.endOfTerm ? deposit.endOfTerm! : BIGINT_ZERO;
  }


  deposit!.save();
}


/**
 * Helper to change the deposit state & save. Useful if you don't have to do anything else.
 */
export function setDepositState(contractAddress: Address, newState: string): void {
  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;
  deposit.currentState = newState;
  saveDeposit(deposit);
}

function newBondedECDSAKeep(
  deposit: Deposit,
  keepAddress: Address,
  event: ethereum.Event
): BondedECDSAKeep {
  let contract = KeepSmartContract.bind(keepAddress);

  let bondedECDSAKeep = new BondedECDSAKeep(keepAddress.toHexString());
  bondedECDSAKeep.createdAt = event.block.timestamp;
  bondedECDSAKeep.deposit = deposit.id;
  bondedECDSAKeep.keepAddress = keepAddress;
  bondedECDSAKeep.totalBondAmount = contract.checkBondAmount();
  bondedECDSAKeep.status = "ACTIVE";
  bondedECDSAKeep.honestThreshold = contract.honestThreshold().toI32();

  let members: string[] = [];
  let memberAddresses = contract.getMembers();
  for (let i = 0; i < memberAddresses.length; i++) {
    let memberAddress = memberAddresses[i];
    let keepMember = getOrCreateKeepMember(memberAddress);
    members.push(keepMember.id);
    keepMember.totalKeepCount += 1;
    keepMember.activeKeepCount += 1;
    keepMember.save()
  }
  bondedECDSAKeep.members = members;
  bondedECDSAKeep.save();

  return bondedECDSAKeep;
}


export function handleStartedLiquidationEvent(event: StartedLiquidation): void {
  let contractAddress = event.params._depositContractAddress;
  let depositLiquidation = new DepositLiquidation(DPL+contractAddress.toHexString());
  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;

  depositLiquidation.deposit = deposit.id;
  depositLiquidation.isLiquidated = false;
  depositLiquidation.wasFraud = event.params._wasFraud;
  depositLiquidation.liquidationInitiated = event.block.timestamp;
  depositLiquidation.initiateTxhash = event.transaction.hash;
  depositLiquidation.liquidationInitiator = event.transaction.from;
  depositLiquidation.save();

  deposit.depositLiquidation = depositLiquidation.id;
  saveDeposit(deposit);

  if (event.params._wasFraud) {
    setDepositState(contractAddress, "FRAUD_LIQUIDATION_IN_PROGRESS");
  } else {
    setDepositState(contractAddress, "LIQUIDATION_IN_PROGRESS");
  }

  let logEvent = new StartedLiquidationEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  logEvent.wasFraud = event.params._wasFraud
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleCourtesyCalledEvent(event: CourtesyCalled): void {
  let contractAddress = event.params._depositContractAddress;
  let depositLiquidation = DepositLiquidation.load(DPL+contractAddress.toHexString())!;
  depositLiquidation.courtesyCallInitiated = event.block.timestamp;
  depositLiquidation.save();

  setDepositState(contractAddress, "COURTESY_CALL");

  let logEvent = new CourtesyCalledEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleLiquidatedEvent(event: Liquidated): void {
  let contractAddress = event.params._depositContractAddress;
  let depositLiquidation = DepositLiquidation.load(DPL+contractAddress.toHexString())!;
  depositLiquidation.liquidatedAt = event.block.timestamp;
  depositLiquidation.isLiquidated = true;
  depositLiquidation.save();

  setDepositState(contractAddress, "LIQUIDATED");

  let logEvent = new LiquidatedEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleRedemptionRequestedEvent(
  event: RedemptionRequested
): void {
  let contractAddress = event.params._depositContractAddress;
  let depositRedemption = new DepositRedemption(DPR+contractAddress.toHexString());
  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;

  depositRedemption.deposit = deposit.id;
  depositRedemption.redeemerOutputScript = event.params._redeemerOutputScript;
  depositRedemption.requestedFee = event.params._requestedFee;
  depositRedemption.withdrawalRequestAt = event.block.timestamp;
  depositRedemption.lastRequestedDigest = event.params._digest;
  depositRedemption.outpoint = event.params._outpoint;
  depositRedemption.utxoSize = event.params._utxoValue;
  depositRedemption.save();

  setDepositState(contractAddress, "AWAITING_WITHDRAWAL_SIGNATURE");

  let logEvent = new RedemptionRequestedEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  logEvent.redeemerOutputScript = event.params._redeemerOutputScript;
  logEvent.requestedFee = event.params._requestedFee;
  logEvent.utxoValue = event.params._utxoValue;
  logEvent.redeemer = event.params._requester;
  logEvent.utxoOutpoint = event.params._outpoint;
  logEvent.sigHashDigest = event.params._digest;
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleGotRedemptionSignatureEvent(
  event: GotRedemptionSignature
): void {
  setDepositState(event.params._depositContractAddress, "AWAITING_WITHDRAWAL_PROOF");

  let logEvent = new GotRedemptionSignatureEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleRedeemedEvent(event: Redeemed): void {
  let contractAddress = event.params._depositContractAddress;
  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;
  setDepositState(contractAddress, "REDEEMED");

  let depositRedemption = DepositRedemption.load(DPR+contractAddress.toHexString())!;
  depositRedemption.txid = event.params._txid;
  depositRedemption.redeemedAt = event.block.timestamp;
  depositRedemption.save();

  let logEvent = new RedeemedEvent(getIDFromEvent(event))
  logEvent.deposit = deposit.id;
  logEvent.tx = event.params._txid
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleFundedEvent(event: Funded): void {
  let deposit = Deposit.load(getDepositIdFromAddress(event.params._depositContractAddress))!;
  deposit.currentState = "ACTIVE";

  // At this point those values will be set
  let depositSmartContract = DepositSmartContract.bind(event.params._depositContractAddress);
  let utxoValue = depositSmartContract.try_utxoValue();
  deposit.utxoSize = utxoValue.reverted ? new BigInt(0) : utxoValue.value;
  deposit.endOfTerm = depositSmartContract.remainingTerm().plus(event.block.timestamp);
  saveDeposit(deposit);

  let logEvent = new FundedEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  logEvent.tx = event.params._txid;
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleRegisteredPubkey(event: RegisteredPubkey): void {
  setDepositState(event.params._depositContractAddress, "AWAITING_BTC_FUNDING_PROOF");

  let logEvent = new RegisteredPubKeyEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  logEvent.signingGroupPubkeyX = event.params._signingGroupPubkeyX;
  logEvent.signingGroupPubkeyY = event.params._signingGroupPubkeyY;
  completeLogEvent(logEvent, event); logEvent.save()
}


export function handleSetupFailedEvent(event: SetupFailed): void {
  // For now, this is a noop - instead, we handle those notify() contract calls that can cause this event
  // to be triggered in the first place.  Might want to remove this for better indexing performance.
}


const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * TDT token.
 */
export function handleMintTBTCDepositToken(event: TDTTransfer): void {
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
  } else {
    depositToken = new TBTCDepositToken(tokenId);
    depositToken.owner = event.params.to;
    depositToken.save()
  }

  let deposit = Deposit.load(getDepositIdFromTokenID(event.params.tokenId))
  if (deposit) {
    deposit.owner = depositToken!.owner;
    saveDeposit(deposit!);
  }
}
