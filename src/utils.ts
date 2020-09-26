import { ethereum } from "@graphprotocol/graph-ts";

/**
 * If nothing better is available, this generates a unique id from the trransaction hash + log index.
 */
export function getIDFromEvent(event: ethereum.Event): string {
  return event.transaction.hash.toHex() + "-" + event.logIndex.toString()
}