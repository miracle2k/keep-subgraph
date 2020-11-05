import {
  NotifyCourtesyCallExpiredCall,
  NotifyFundingTimedOutCall, NotifyRedemptionProofTimedOutCall, NotifyRedemptionSignatureTimedOutCall,
  NotifySignerSetupFailedCall, NotifyUndercollateralizedLiquidationCall, ProvideECDSAFraudProofCall,
  ProvideFundingECDSAFraudProofCall
} from "../generated/templates/DepositContract/DepositContract";
import {BondedECDSAKeep, Deposit, SetupFailedEvent, StartedLiquidationEvent} from "../generated/schema";
import {
  completeLogEventRaw,
  getDepositIdFromAddress,
  getDepositLiquidation,
  getDepositSetup,
  saveDeposit,
  setDepositState
} from "./mapping";
import { Address, log } from "@graphprotocol/graph-ts";
import {ethereum} from "@graphprotocol/graph-ts/index";
import {getOrCreateOperator, getOrCreateUser} from "./models";


function newSetupFailedEvent(depositAddress: Address, reason: string, call: ethereum.Call): SetupFailedEvent {
  // All other LogEvent objects are generated from TheGraph "event handlers", and can use `txHash-logIndex` as the
  // format for the Graph object id. We do not have access to this here. Since there should only ever be a single
  // successful `failedSetup` call per deposit, we use this.

  let logEvent = new SetupFailedEvent(depositAddress.toHexString() + "-failedSetup");
  logEvent.deposit = getDepositIdFromAddress(depositAddress);
  logEvent.reason = reason;

  completeLogEventRaw(logEvent, call.transaction, call.block);
  logEvent.save()

  return logEvent;
}


function newStartedLiquidationEvent(depositAddress: Address, cause: string, call: ethereum.Call): StartedLiquidationEvent {
  // All other LogEvent objects are generated from TheGraph "event handlers", and can use `txHash-logIndex` as the
  // format for the Graph object id. We do not have access to this here. Since there should only ever be a single
  // successful `failedSetup` call per deposit, we use this.

  let logEvent = new StartedLiquidationEvent(depositAddress.toHexString() + "-startedLiquidation");
  logEvent.deposit = getDepositIdFromAddress(depositAddress);
  logEvent.cause = cause;

  completeLogEventRaw(logEvent, call.transaction, call.block);
  logEvent.save()

  return logEvent;
}


// It seems call handlers only run for successful transactions, so we can assume this succeeded and a SetupFailed
// event was raised. We have to look into the call handlers directly to figure out *why* a SetupFailed event
// was raised.
export function handleNotifyFundingTimedOut(call: NotifyFundingTimedOutCall): void {
  let contractAddress = call.to;

  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;
  deposit.currentState = "FAILED_SETUP";
  deposit.currentStateTimesOutAt = null;
  deposit.failureReason = "FUNDING_TIMEOUT";
  saveDeposit(deposit, call.block);

  newSetupFailedEvent(contractAddress, "FUNDING_TIMEOUT", call);

  let setup = getDepositSetup(contractAddress);
  setup.failureReason = 'FUNDING_TIMEOUT';
  setup.save();

  // Strike against the deposit creator.
  let user = getOrCreateUser(deposit.creator as Address);
  user.numDepositsUnfunded += 1;
  user.save();
}

export function handleNotifySignerSetupFailed(call: NotifySignerSetupFailedCall): void {
  let contractAddress = call.to;

  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;

  // To figure out who actually is at fault here, we have to see if the signers managed to publish a PublicKey
  // to the keep. If they did, it was the depositor who failed to call `retrieveSignerPubKey()` to advance the
  // deposit process, allowing for this timeout to happen.
  let keep = BondedECDSAKeep.load(deposit.bondedECDSAKeep!)!
  let failureReason: string;
  if (keep.publicKey) {
    failureReason = 'SIGNER_SETUP_FAILED_DEPOSITOR';
  } else {
    failureReason = 'SIGNER_SETUP_FAILED';
  }

  if (failureReason == 'SIGNER_SETUP_FAILED') {
    // Credit this failure to the operators which did not submit.
    let members = keep.members;
    for (let i=0; i<members.length; i++) {
      let address = members[i]!;
      if (keep.pubkeySubmissions.indexOf(address) == -1) {
        let operator = getOrCreateOperator(Address.fromString(address));
        operator.totalFaultCount += 1

        // We can blame this operator personally for this failure to respond, unless none of the operators
        // responded, in which case we assume instead blame cannot be assigned.
        if (keep.pubkeySubmissions.length > 0) {
          operator.attributableFaultCount += 1
          operator.save()
        }
      }
    }
  }

  deposit.currentState = 'FAILED_SETUP';
  deposit.currentStateTimesOutAt = null;
  deposit.failureReason = failureReason;
  saveDeposit(deposit, call.block);

  newSetupFailedEvent(contractAddress, failureReason, call)

  let setup = getDepositSetup(contractAddress);
  setup.failureReason = failureReason;
  setup.save()
}

/**
 * Fraud is reported during funding.
 */
export function handleProvideFundingECDSAFraudProof(call: ProvideFundingECDSAFraudProofCall): void {
  let contractAddress = call.to;
  newSetupFailedEvent(contractAddress, "FUNDING_ECDSA_FRAUD", call)

  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;
  deposit.currentState = 'FAILED_SETUP';
  deposit.currentStateTimesOutAt = null;
  deposit.failureReason = 'FUNDING_ECDSA_FRAUD';
  saveDeposit(deposit, call.block);

  let setup = getDepositSetup(contractAddress);
  setup.failureReason = 'FUNDING_ECDSA_FRAUD';
  setup.save()
}

/**
 * Fraud is reported during redemption.
 *
 * NOTE: We also catch the StartedLiquidation event, those two handlers work together.
 */
export function handleProvideECDSAFraudProof(call: ProvideECDSAFraudProofCall): void {
  let contractAddress = call.to;

  let liq = getDepositLiquidation(contractAddress, call.block, call.transaction);
  liq.cause = 'FRAUD'
  liq.save();

  // It seems we do not know who submitted the fraudulent signature?
  faultAllMembers(contractAddress);

  newStartedLiquidationEvent(contractAddress, 'FRAUD', call);
}

/**
 * NOTE: We also catch the StartedLiquidation event, those two handlers work together.
 */
export function handleNotifyUndercollateralizedLiquidation(call: NotifyUndercollateralizedLiquidationCall): void {
  let contractAddress = call.to;
  let liq = getDepositLiquidation(contractAddress, call.block, call.transaction);
  liq.cause = 'UNDERCOLLATERIZED'
  liq.save();

  newStartedLiquidationEvent(contractAddress, 'UNDERCOLLATERIZED', call);
}

/**
 * NOTE: We also catch the StartedLiquidation event, those two handlers work together.
 */
export function handleNotifyRedemptionSignatureTimedOut(call: NotifyRedemptionSignatureTimedOutCall): void {
  let contractAddress = call.to;
  let liq = getDepositLiquidation(contractAddress, call.block, call.transaction);
  liq.cause = 'SIGNATURE_TIMEOUT'
  liq.save();

  faultAllMembers(contractAddress);
  newStartedLiquidationEvent(contractAddress, 'SIGNATURE_TIMEOUT', call);
}

/**
 * NOTE: We also catch the StartedLiquidation event, those two handlers work together.
 */
export function handleNotifyRedemptionProofTimedOut(call: NotifyRedemptionProofTimedOutCall): void {
  let contractAddress = call.to;
  let liq = getDepositLiquidation(contractAddress, call.block, call.transaction);
  liq.cause = 'PROOF_TIMEOUT'
  liq.save();

  faultAllMembers(contractAddress);
  newStartedLiquidationEvent(contractAddress, 'PROOF_TIMEOUT', call);
}

/**
 * NOTE: We also catch the StartedLiquidation event, those two handlers work together.
 */
export function handleNotifyCourtesyCallExpired(call: NotifyCourtesyCallExpiredCall): void {
  let contractAddress = call.to;
  let liq = getDepositLiquidation(contractAddress, call.block, call.transaction);
  liq.cause = 'COURTESY_CALL_EXPIRED'
  liq.save();

  newStartedLiquidationEvent(contractAddress, 'COURTESY_CALL_EXPIRED', call);
}


function faultAllMembers(depositAddress: Address): void {
  let deposit = Deposit.load(getDepositIdFromAddress(depositAddress))!;
  let keep = BondedECDSAKeep.load(deposit.bondedECDSAKeep!)!

  let members = keep.members;
  for (let i=0; i<members.length; i++) {
    let operator = getOrCreateOperator(Address.fromString(members[i]!));
    operator.involvedInFaultCount += 1
    operator.totalFaultCount += 1
    operator.save()
  }
}