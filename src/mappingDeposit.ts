import {
  NotifyFundingTimedOutCall,
  NotifySignerSetupFailedCall,
  ProvideFundingECDSAFraudProofCall
} from "../generated/templates/DepositContract/DepositContract";
import {SetupFailedEvent} from "../generated/schema";
import {completeLogEventRaw, getDepositIdFromAddress, setDepositState} from "./mapping";
import { Address, log } from "@graphprotocol/graph-ts";
import {ethereum} from "@graphprotocol/graph-ts/index";


function newSetupFailedEvent(depositAddress: Address, reason: string, call: ethereum.Call): SetupFailedEvent {
  // All other LogEvent objects are generated from TheGraph "event handlers", and can use `txHash-logIndex` as the
  // format for the Graph object id. We do not have access to this here. Since there should only ever be a single
  // successful `failedSetup` call per deposit, we use this.

  let logEvent = new SetupFailedEvent(`${depositAddress}-failedSetup`);
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
  log.info("foobar", []);
  let contractAddress = call.to;
  setDepositState(contractAddress, "FAILED_SETUP");
  newSetupFailedEvent(contractAddress, "FUNDING_TIMEOUT", call)
}

export function handleNotifySignerSetupFailed(call: NotifySignerSetupFailedCall): void {
  log.info("foobar2", []);
  let contractAddress = call.to;
  setDepositState(contractAddress, "FAILED_SETUP");
  newSetupFailedEvent(contractAddress, "SIGNER_SETUP_FAILED", call)
}

export function handleProvideFundingECDSAFraudProof(call: ProvideFundingECDSAFraudProofCall): void {
  let contractAddress = call.to;
  setDepositState(contractAddress, "FAILED_SETUP");
  newSetupFailedEvent(contractAddress, "FUNDING_ECDSA_FRAUD", call)
}
