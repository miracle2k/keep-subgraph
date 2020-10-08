import { BigInt } from "@graphprotocol/graph-ts";
import {
  RelayEntryGenerated,
  RelayEntryRequested
} from "../generated/KeepRandomBeaconService/KeepRandomBeaconServiceImplV1";
import {RelayEntry} from "../generated/schema";
import {log} from "@graphprotocol/graph-ts/index";


function getRelayEntryId(requestId: BigInt): string {
  return 're_' + requestId.toString()
}

export function handleRelayEntryGenerated(event: RelayEntryGenerated): void {
  let entry = new RelayEntry(getRelayEntryId(event.params.requestId));
  entry.requestId = event.params.requestId;
  entry.generatedAt = event.block.timestamp;
  entry.value = event.params.entry;
  entry.save();

  // let status = getStatusRecord();
  // status.isRandomBeaconEntryInProgress = false;
  // status.save();
}

export function handleRelayEntryRequested(event: RelayEntryRequested): void {
  // let status = getStatusRecord();
  // status.isRandomBeaconEntryInProgress = true;
  // status.save();

  // NB: This runs *after* the operator one. The solution then is to make the id of the relay entry
  // the tx + logIndex + store it in stats.
  log.info("handleRelayEntryRequested SERVICE", [])

  let entry = new RelayEntry(getRelayEntryId(event.params.requestId));
  entry.requestId = event.params.requestId;
  entry.requestedAt = event.block.timestamp;
  entry.requestedBy = event.transaction.from;
  entry.save();
}
