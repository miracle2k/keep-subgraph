import {
  NotifyFundingTimedOutCall,
  NotifySignerSetupFailedCall,
  ProvideFundingECDSAFraudProofCall
} from "../generated/templates/DepositContract/DepositContract";
import {BondedECDSAKeep, Deposit, SetupFailedEvent} from "../generated/schema";
import {completeLogEventRaw, getDepositIdFromAddress, getDepositSetup, saveDeposit, setDepositState} from "./mapping";
import { Address, log } from "@graphprotocol/graph-ts";
import {ethereum} from "@graphprotocol/graph-ts/index";


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

// It seems call handlers only run for successful transactions, so we can assume this succeeded and a SetupFailed
// event was raised. We have to look into the call handlers directly to figure out *why* a SetupFailed event
// was raised.
export function handleNotifyFundingTimedOut(call: NotifyFundingTimedOutCall): void {
  let contractAddress = call.to;
  setDepositState(contractAddress, "FAILED_SETUP", call.block);
  newSetupFailedEvent(contractAddress, "FUNDING_TIMEOUT", call);

  let setup = getDepositSetup(contractAddress);
  setup.failureReason = 'FUNDING_TIMEOUT';
  setup.save()
}

export function handleNotifySignerSetupFailed(call: NotifySignerSetupFailedCall): void {
  let contractAddress = call.to;
  newSetupFailedEvent(contractAddress, "SIGNER_SETUP_FAILED", call)

  let deposit = Deposit.load(getDepositIdFromAddress(contractAddress))!;
  deposit.currentState = 'FAILED_SETUP';
  saveDeposit(deposit, call.block);

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

  let setup = getDepositSetup(contractAddress);
  setup.failureReason = failureReason;
  setup.save()
}

export function handleProvideFundingECDSAFraudProof(call: ProvideFundingECDSAFraudProofCall): void {
  let contractAddress = call.to;
  setDepositState(contractAddress, "FAILED_SETUP", call.block);
  newSetupFailedEvent(contractAddress, "FUNDING_ECDSA_FRAUD", call)

  let setup = getDepositSetup(contractAddress);
  setup.failureReason = 'FUNDING_ECDSA_FRAUD';
  setup.save()
}
