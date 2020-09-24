import {
  Created,
  StartedLiquidation,
  CourtesyCalled,
  Liquidated,
  RedemptionRequested,
  GotRedemptionSignature,
  Redeemed,
  Funded,
  SetupFailed,
} from "../generated/TBTCSystem/TBTCSystem";
import { log, BigInt } from "@graphprotocol/graph-ts";
import { Transfer as TDTTransfer } from "../generated/TBTCDepositToken/TBTCDepositToken";
import { Transfer as TBTCTransfer } from "../generated/TBTCToken/TBTCToken";
import { DepositContract as DepositSmartContract } from "../generated/templates/DepositContract/DepositContract";
import { BondedECDSAKeep as KeepSmartContract } from "../generated/templates/BondedECDSAKeep/BondedECDSAKeep";
import { BondedECDSAKeep as BondedECDSAKeepTemplate } from "../generated/templates";
import {
  Deposit,
  BondedECDSAKeep,
  KeepMember,
  DepositLiquidation,
  DepositRedemption,
  TBTCDepositToken,
  TBTCToken,
} from "../generated/schema";

import { Address } from "@graphprotocol/graph-ts";


const DPL = 'dpl-';
const DPR = 'dpr-';
const DP = 'dp-'


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

  log.debug('handleCreatedEvent for ' + contractAddress.toHexString(), [])
  let deposit = getOrCreateDeposit(DP+contractAddress.toHexString());
  deposit.tbtcSystem = event.address;
  deposit.owner = event.transaction.from;
  deposit.contractAddress = contractAddress;
  deposit.currentState = "AWAITING_SIGNER_SETUP";
  deposit.keepAddress = event.params._keepAddress;
  deposit.createdAt = event.block.timestamp;

  // this indexes the newly created contract address for events
  BondedECDSAKeepTemplate.create(keepAddress);

  updateDepositDetails(deposit, contractAddress);

  let bondedECDSAKeep = newBondedECDSAKeep(deposit, keepAddress);
  deposit.bondedECDSAKeep = bondedECDSAKeep.id;

  log.debug('handleCreatedEvent for ' + contractAddress.toHexString() + " is now saving deposit " + deposit.id, [])
  deposit.save();
}

function setDepositState(contractAddress: Address, newState: string): void {
  let deposit = Deposit.load(DP+contractAddress.toHexString());
  deposit.currentState = newState;
  deposit.save();
}

function updateDepositDetails(
  deposit: Deposit,
  contractAddress: Address
): Deposit {
  // we backfill the deposit contract's data by querying the ethereum smart contract
  let depositSmartContract = DepositSmartContract.bind(contractAddress);

  deposit.lotSizeSatoshis = depositSmartContract.lotSizeSatoshis();
  deposit.initialCollateralizedPercent = depositSmartContract.initialCollateralizedPercent();
  deposit.undercollateralizedThresholdPercent = depositSmartContract.undercollateralizedThresholdPercent();
  deposit.severelyUndercollateralizedThresholdPercent = depositSmartContract.severelyUndercollateralizedThresholdPercent();
  deposit.signerFee = depositSmartContract.signerFeeTbtc();

  let utxoValue = depositSmartContract.try_utxoValue();
  deposit.utxoSize = utxoValue.reverted ? new BigInt(0) : utxoValue.value;
  deposit.remainingTerm = depositSmartContract.remainingTerm();
  let auctionValue = depositSmartContract.try_auctionValue();
  deposit.auctionValue = auctionValue.reverted ? new BigInt(0) : auctionValue.value; 
  deposit.collateralizationPercent = depositSmartContract
    .collateralizationPercentage()
    .toI32();

  return deposit;
}

function getOrCreateKeepMember(keeperAddress: Address): KeepMember {
  let member = KeepMember.load(keeperAddress.toHexString());
  if (member == null) {
    member = new KeepMember(keeperAddress.toHexString());
    member.address = keeperAddress;
    member.save();
  }
  return <KeepMember>member;
}

function newBondedECDSAKeep(
  deposit: Deposit,
  keepAddress: Address
): BondedECDSAKeep {
  let contract = KeepSmartContract.bind(keepAddress);

  let bondedECDSAKeep = new BondedECDSAKeep(keepAddress.toHexString());
  bondedECDSAKeep.deposit = deposit.id;
  bondedECDSAKeep.keepAddress = keepAddress;
  bondedECDSAKeep.publicKey = contract.getPublicKey();
  bondedECDSAKeep.totalBondAmount = contract.checkBondAmount();
  bondedECDSAKeep.status = "ACTIVE";
  bondedECDSAKeep.honestThreshold = contract.honestThreshold().toI32();

  let members: string[] = [];
  let memberAddresses = contract.getMembers();
  for (let i = 0; i < memberAddresses.length; i++) {
    let memberAddress = memberAddresses[i];
    let keepMember = getOrCreateKeepMember(memberAddress);
    members.push(keepMember.id);
  }
  bondedECDSAKeep.members = members;
  bondedECDSAKeep.save();

  return bondedECDSAKeep;
}


export function handleStartedLiquidationEvent(event: StartedLiquidation): void {
  let contractAddress = event.params._depositContractAddress;
  let depositLiquidation = new DepositLiquidation(DPL+contractAddress.toHexString());

  let deposit = Deposit.load(DP+contractAddress.toHexString());
  depositLiquidation.deposit = deposit.id;
  depositLiquidation.isLiquidated = false;
  depositLiquidation.wasFraud = event.params._wasFraud;
  depositLiquidation.liquidationInitiated = event.block.timestamp;
  depositLiquidation.initiateTxhash = event.transaction.hash;
  depositLiquidation.liquidationInitiator = event.transaction.from;
  depositLiquidation.save();

  deposit.depositLiquidation = depositLiquidation.id;
  deposit.save();

  if (event.params._wasFraud) {
    setDepositState(contractAddress, "FRAUD_LIQUIDATION_IN_PROGRESS");
  } else {
    setDepositState(contractAddress, "LIQUIDATION_IN_PROGRESS");
  }
}

export function handleCourtesyCalledEvent(event: CourtesyCalled): void {
  let contractAddress = event.params._depositContractAddress;
  let depositLiquidation = DepositLiquidation.load(DPL+contractAddress.toHexString());
  depositLiquidation.courtesyCallInitiated = event.block.timestamp;
  depositLiquidation.save();

  setDepositState(contractAddress, "COURTESY_CALL");
}

export function handleLiquidatedEvent(event: Liquidated): void {
  let contractAddress = event.params._depositContractAddress;
  let depositLiquidation = DepositLiquidation.load(DPL+contractAddress.toHexString());
  depositLiquidation.liquidatedAt = event.block.timestamp;
  depositLiquidation.isLiquidated = true;
  depositLiquidation.save();

  setDepositState(contractAddress, "LIQUIDATED");
}

export function handleRedemptionRequestedEvent(
  event: RedemptionRequested
): void {
  let contractAddress = event.params._depositContractAddress;
  let depositRedemption = new DepositRedemption(DPR+contractAddress.toHexString());
  let deposit = Deposit.load(DP+contractAddress.toHexString());

  depositRedemption.deposit = deposit.id;
  depositRedemption.redeemerOutputScript = event.params._redeemerOutputScript;
  depositRedemption.requestedFee = event.params._requestedFee;
  depositRedemption.withdrawalRequestAt = event.block.timestamp;
  depositRedemption.lastRequestedDigest = event.params._digest;
  depositRedemption.outpoint = event.params._outpoint;
  depositRedemption.utxoSize = event.params._utxoValue;
  depositRedemption.save();

  setDepositState(contractAddress, "AWAITING_WITHDRAWAL_SIGNATURE");
}

export function handleGotRedemptionSignatureEvent(
  event: GotRedemptionSignature
): void {
  let contractAddress = event.params._depositContractAddress;
  let deposit = Deposit.load(DP+contractAddress.toHexString());
  deposit.currentState = "AWAITING_WITHDRAWAL_PROOF";
  deposit.save();
}

export function handleRedeemedEvent(event: Redeemed): void {
  let contractAddress = event.params._depositContractAddress;
  let deposit = Deposit.load(DP+contractAddress.toHexString());
  setDepositState(contractAddress, "REDEEMED");

  let depositRedemption = DepositRedemption.load(DPR+contractAddress.toHexString());
  depositRedemption.txid = event.params._txid;
  depositRedemption.redeemedAt = event.block.timestamp;
  depositRedemption.save();

  let keep = BondedECDSAKeep.load(deposit.keepAddress.toHexString());
  keep.status = "CLOSED";
  keep.save();
}

export function handleFundedEvent(event: Funded): void {
  setDepositState(event.params._depositContractAddress, "ACTIVE");
}


export function handleSetupFailedEvent(event: SetupFailed): void {
  setDepositState(event.params._depositContractAddress, "FAILED_SETUP");
}

/**
 * TBTC minting and burning
 */
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// TODO: Owner has to be updated when there is a transfer...
export function handleMintTBTCDepositToken(event: TDTTransfer): void {
  // handle the mint() call
  if (event.params.from.toHexString() == ZERO_ADDRESS) {
    let depositToken = new TBTCDepositToken(event.params.tokenId.toHexString());
    depositToken.deposit = DP + event.params.tokenId.toHexString();
    depositToken.tokenID = event.params.tokenId;
    depositToken.owner = event.params.to;
    depositToken.mintedAt = event.block.timestamp;
    depositToken.isBurned = false;
    depositToken.save();
  } else {
    log.info("Transfer not from zero address (not mint), ignoring", []);
  }
}

export function handleMintTBTCToken(event: TBTCTransfer): void {
  if (event.params.from.toHexString() == ZERO_ADDRESS) {
    let tbtc = new TBTCToken(
      event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    );
    tbtc.amount = event.params.value;
    tbtc.owner = event.params.to;
    tbtc.mintedAt = event.block.timestamp;
    tbtc.isBurned = false;
    tbtc.save();
  } else {
    log.info("Transfer not from zero address (not mint), ignoring", []);
  }
}
