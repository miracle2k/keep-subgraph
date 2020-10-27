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
import {BondedECDSAKeep as BondedECDSAKeepTemplate, DepositContract} from "../generated/templates";
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
  CourtesyCalledEvent,
  LiquidatedEvent,
  CreatedEvent, DepositSetup, StakedropInterval,
} from "../generated/schema";
import {getIDFromEvent} from "./utils";
import {Value} from "@graphprotocol/graph-ts/index";
import {getOrCreateOperator, getOrCreateUser} from "./models";
import {
  BIGINT_ZERO,
  FORMATION_TIMEOUT,
  FUNDING_PROOF_TIMEOUT,
  REDEMPTION_PROOF_TIMEOUT,
  REDEMPTION_SIGNATURE_TIMEOUT
} from "./constants";
import {getStats} from "./models";
import {getOrCreateStakedropInterval} from "./stakeDrop";


// Wild-card re-export compiles but then does not find the functions at runtime.
export {handleLotSizesUpdateStarted} from './mappingGovernance';
export {handleLotSizesUpdated} from './mappingGovernance';
export {handleKeepFactoriesUpdateStarted} from './mappingGovernance';
export {handleKeepFactoriesUpdated} from './mappingGovernance';


const DPL = 'dpl-';
const DPS = 'dps-';
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


export function getDepositSetup(depositAddress: Address): DepositSetup {
  let id = DPS+depositAddress.toHexString();
  let setup = DepositSetup.load(id);
  if (setup == null) {
    setup = new DepositSetup(id);
    setup.deposit = getDepositIdFromAddress(depositAddress);
  }
  return setup!;
}

export function getDepositLiquidation(depositAddress: Address, block: ethereum.Block, tx: ethereum.Transaction): DepositLiquidation {
  let id = DPL+depositAddress.toHexString();
  let liq = DepositLiquidation.load(id);
  if (liq == null) {
    liq = new DepositLiquidation(id);
    liq.deposit = getDepositIdFromAddress(depositAddress);
    liq.isLiquidated = false;
    liq.liquidationInitiated = block.timestamp;
    liq.initiateTxhash = tx.hash;
    liq.liquidationInitiator = tx.from;
  }
  return liq!;
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
  let stats = getStats();
  stats.depositCount += 1;
  stats.save()

  let contractAddress = event.params._depositContractAddress;
  let keepAddress = event.params._keepAddress;
  
  let deposit = getOrCreateDeposit(getDepositIdFromAddress(contractAddress));
  deposit.index = stats.depositCount;
  deposit.tbtcSystem = event.address;
  deposit.contractAddress = contractAddress;
  deposit.currentState = "AWAITING_SIGNER_SETUP";
  deposit.keepAddress = event.params._keepAddress;
  deposit.createdAt = event.block.timestamp;
  deposit.updatedAt = event.block.timestamp;
  deposit.tdtToken = getDepositTokenIdFromDepositAddress(contractAddress)
  deposit.owner = event.transaction.from;
  deposit.creator = event.transaction.from;
  deposit.currentStateTimesOutAt = event.block.timestamp.plus(FORMATION_TIMEOUT);

  // Instantiate the graph templates: this indexes the newly created contracts for events
  let context = new DataSourceContext()
  BondedECDSAKeepTemplate.createWithContext(keepAddress, context);
  DepositContract.create(contractAddress);

  let depositSmartContract = DepositSmartContract.bind(contractAddress);
  deposit.lotSizeSatoshis = depositSmartContract.lotSizeSatoshis();
  deposit.initialCollateralizedPercent = depositSmartContract.initialCollateralizedPercent();
  deposit.undercollateralizedThresholdPercent = depositSmartContract.undercollateralizedThresholdPercent();
  deposit.severelyUndercollateralizedThresholdPercent = depositSmartContract.severelyUndercollateralizedThresholdPercent();
  deposit.signerFee = depositSmartContract.signerFeeTbtc();

  let bondedECDSAKeep = newBondedECDSAKeep(deposit, keepAddress, event);

  deposit.bondedECDSAKeep = bondedECDSAKeep.id;
  saveDeposit(deposit, event.block);

  let logEvent = new CreatedEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  completeLogEvent(logEvent, event); logEvent.save()

  // Deposit setup record
  let setup = getDepositSetup(contractAddress);
  setup.save()

  // User who created it. We are assuming here the tx went to the contract directly, from the user.
  let user = getOrCreateUser(event.transaction.from);
  user.numDepositsCreated += 1;
  user.save();
}

// Do not save a deposit directly. There are certain denormalized values which need to be recalculated
export function saveDeposit(deposit: Deposit, block: ethereum.Block): void {
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
  );
  deposit.filter_liquidationLikeOrSignerFailureState = deposit.filter_liquidationLikeState || (
      deposit.currentState === "FAILED_SETUP" && (
          deposit.failureReason === "SIGNER_SETUP_FAILED" ||
          deposit.failureReason === "FUNDING_ECDSA_FRAUD"
      )
  );

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

  deposit.updatedAt = block.timestamp;

  deposit!.save();
}


/**
 * Helper to change the deposit state & save. Useful if you don't have to do anything else.
 */
export function setDepositState(contractAddress: Address, newState: string, block: ethereum.Block): Deposit {
  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;
  deposit.currentState = newState;
  saveDeposit(deposit, block);
  return deposit
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
  bondedECDSAKeep.pubkeySubmissions = [];

  let members: string[] = [];
  let memberAddresses = contract.getMembers();
  for (let i = 0; i < memberAddresses.length; i++) {
    let memberAddress = memberAddresses[i];
    let operator = getOrCreateOperator(memberAddress);
    members.push(operator.id);
    operator.totalKeepCount += 1;
    operator.activeKeepCount += 1;
    operator.save()
  }
  bondedECDSAKeep.members = members;

  let interval = getOrCreateStakedropInterval(event);
  if (interval) {
    interval.keepCount += 1;
    interval.save();

    bondedECDSAKeep.stakedropInterval = interval.id;
    // We then probably want to calculate the allocation for this interval, and can then estimate the
    // number of keeps in it.
  }

  bondedECDSAKeep.save();

  return bondedECDSAKeep;
}


/**
 * Event: StartedLiquidation
 *
 * We also have call handlers for all functions that may cause a liquidation to start, and for now, those and
 * this one work in concert.
 */
export function handleStartedLiquidationEvent(event: StartedLiquidation): void {
  let contractAddress = event.params._depositContractAddress;

  let depositLiquidation = getDepositLiquidation(contractAddress, event.block, event.transaction);
  depositLiquidation.save();

  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;
  let oldState = deposit.currentState;
  deposit.updatedAt = event.block.timestamp;
  // If this is already set, then redemption was already in progress, and the liquidation is due to signers failing
  // to respond. In that case, redemptionStartedAt is not updated. It is only set if the liquidation begins due to
  // undercollateralization.
  if (!deposit.redemptionStartedAt) {
    deposit.redemptionStartedAt = event.block.timestamp;
  }
  deposit.depositLiquidation = depositLiquidation.id;
  deposit.currentStateTimesOutAt = null;

  // We keep both of those states to make the status values in the contract, but we really track the
  // liquidation reason in LiquidationCause.
  if (event.params._wasFraud) {
    deposit.currentState = "FRAUD_LIQUIDATION_IN_PROGRESS";
  } else {
    deposit.currentState = "LIQUIDATION_IN_PROGRESS";
  }

  saveDeposit(deposit, event.block);

  // If this liquidation started from a withdrawal state, do not update stats again, we already did so.
  if (oldState == 'COURTESY_CALL' || oldState == 'ACTIVE') {
    let stats = getStats()
    stats.btcInActiveDeposits = stats.btcInActiveDeposits.minus(deposit.lotSizeSatoshis!);
    stats.save()
  }
}


export function handleCourtesyCalledEvent(event: CourtesyCalled): void {
  let contractAddress = event.params._depositContractAddress;
  let depositLiquidation = DepositLiquidation.load(DPL+contractAddress.toHexString())!;
  depositLiquidation.courtesyCallInitiated = event.block.timestamp;
  depositLiquidation.save();

  setDepositState(contractAddress, "COURTESY_CALL", event.block);

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

  let deposit = setDepositState(contractAddress, "LIQUIDATED", event.block);

  let logEvent = new LiquidatedEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  completeLogEvent(logEvent, event); logEvent.save()

  let stats = getStats()
  stats.btcUnderDeposit = stats.btcUnderDeposit.minus(deposit.lotSizeSatoshis!);
  stats.save()
}

/**
 * Event: RedemptionRequested
 *
 * Note that this can be emitted in two ways: By requestRedemption() or increaseRedemptionFee(). The latter
 * can be emitted multiple times.
 */
export function handleRedemptionRequestedEvent(
  event: RedemptionRequested
): void {
  let contractAddress = event.params._depositContractAddress;
  let depositRedemption = new DepositRedemption(DPR+contractAddress.toHexString());
  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;

  // This indicates that this is from `increaseRedemptionFee`. Rather than watching for that contract call
  // directly, we can be certain that it this was the code path based on these previous states.
  if (deposit.currentState == 'AWAITING_WITHDRAWAL_SIGNATURE' || deposit.currentState == 'AWAITING_WITHDRAWAL_PROOF') {
    handleFeeIncrease(deposit, event);
    return;
  }

  depositRedemption.deposit = deposit.id;
  depositRedemption.redeemerOutputScript = event.params._redeemerOutputScript;
  depositRedemption.requestedFee = event.params._requestedFee;
  depositRedemption.withdrawalRequestAt = event.block.timestamp;
  depositRedemption.lastRequestedDigest = event.params._digest;
  depositRedemption.outpoint = event.params._outpoint;
  depositRedemption.utxoSize = event.params._utxoValue;
  depositRedemption.save();

  deposit.redemptionStartedAt = event.block.timestamp;
  deposit.withdrawalRequestTimerStart = event.block.timestamp;
  deposit.currentStateTimesOutAt = event.block.timestamp.plus(REDEMPTION_SIGNATURE_TIMEOUT);
  deposit.currentState = "AWAITING_WITHDRAWAL_SIGNATURE"
  saveDeposit(deposit, event.block);

  let logEvent = new RedemptionRequestedEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  logEvent.redeemerOutputScript = event.params._redeemerOutputScript;
  logEvent.requestedFee = event.params._requestedFee;
  logEvent.utxoValue = event.params._utxoValue;
  logEvent.redeemer = event.params._requester;
  logEvent.utxoOutpoint = event.params._outpoint;
  logEvent.sigHashDigest = event.params._digest;
  completeLogEvent(logEvent, event); logEvent.save()

  let stats = getStats()
  stats.btcInActiveDeposits = stats.btcInActiveDeposits.minus(deposit.lotSizeSatoshis!);
  stats.save()

  // Update the redeeming user.
  let user = getOrCreateUser(event.transaction.from);
  user.numDepositsRedeemed += 1;
  if (deposit.creator == event.transaction.from) {
    user.numOwnDepositsRedeemed += 1;
  }
  user.save();
}


/**
 * When `increaseRedemptionFee` is called. Called not via an event from the graph, but
 * by us when the `handleRedemptionRequestedEvent` handler recognizes this scenario.
 */
function handleFeeIncrease(deposit: Deposit, event: RedemptionRequested) {
  // This resets the state from AWAITING_PROOF TO AWAITING_SIGNATURE: another signature needs to be provided.
  // We also must reset the timers.
  deposit.currentState = "AWAITING_WITHDRAWAL_SIGNATURE"
  deposit.withdrawalRequestTimerStart = event.block.timestamp;
  deposit.currentStateTimesOutAt = event.block.timestamp.plus(REDEMPTION_SIGNATURE_TIMEOUT);
  saveDeposit(deposit, event.block);
}

export function handleGotRedemptionSignatureEvent(
  event: GotRedemptionSignature
): void {
  let deposit = Deposit.load(getDepositIdFromAddress(event.params._depositContractAddress))!;
  deposit.currentState = "AWAITING_WITHDRAWAL_PROOF";
  deposit.currentStateTimesOutAt = deposit.withdrawalRequestTimerStart!.plus(REDEMPTION_PROOF_TIMEOUT);
  saveDeposit(deposit, event.block);

  let logEvent = new GotRedemptionSignatureEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleRedeemedEvent(event: Redeemed): void {
  let contractAddress = event.params._depositContractAddress;

  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;
  deposit.currentState = "REDEEMED";
  deposit.currentStateTimesOutAt = null;
  saveDeposit(deposit, event.block);

  let depositRedemption = DepositRedemption.load(DPR+contractAddress.toHexString())!;
  depositRedemption.txid = event.params._txid;
  depositRedemption.redeemedAt = event.block.timestamp;
  depositRedemption.save();

  let logEvent = new RedeemedEvent(getIDFromEvent(event))
  logEvent.deposit = deposit.id;
  logEvent.tx = event.params._txid
  completeLogEvent(logEvent, event); logEvent.save()

  let stats = getStats()
  stats.btcUnderDeposit = stats.btcUnderDeposit.minus(deposit.lotSizeSatoshis!);
  stats.save()
}

export function handleFundedEvent(event: Funded): void {
  let deposit = Deposit.load(getDepositIdFromAddress(event.params._depositContractAddress))!;
  deposit.currentState = "ACTIVE";
  deposit.currentStateTimesOutAt = null;

  // At this point those values will be set
  let depositSmartContract = DepositSmartContract.bind(event.params._depositContractAddress);
  let utxoValue = depositSmartContract.try_utxoValue();
  deposit.utxoSize = utxoValue.reverted ? new BigInt(0) : utxoValue.value;
  deposit.endOfTerm = depositSmartContract.remainingTerm().plus(event.block.timestamp);
  saveDeposit(deposit, event.block);

  let logEvent = new FundedEvent(getIDFromEvent(event))
  logEvent.deposit = getDepositIdFromAddress(event.params._depositContractAddress);
  logEvent.tx = event.params._txid;
  completeLogEvent(logEvent, event); logEvent.save()

  let stats = getStats()
  stats.btcUnderDeposit = stats.btcUnderDeposit.plus(deposit.lotSizeSatoshis!);
  stats.btcInActiveDeposits = stats.btcInActiveDeposits.plus(deposit.lotSizeSatoshis!);
  stats.save()
}

export function handleRegisteredPubkey(event: RegisteredPubkey): void {
  let deposit = Deposit.load(getDepositIdFromAddress(event.params._depositContractAddress))!;
  deposit.currentState = "AWAITING_BTC_FUNDING_PROOF";
  deposit.currentStateTimesOutAt = event.block.timestamp.plus(FUNDING_PROOF_TIMEOUT);
  saveDeposit(deposit, event.block);

  let setup = getDepositSetup(event.params._depositContractAddress)
  setup.fundingProofTimerStartedAt = event.block.timestamp
  setup.save();

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
    saveDeposit(deposit!, event.block);
  }
}
