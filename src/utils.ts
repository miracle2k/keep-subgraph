import { ethereum, BigInt } from "@graphprotocol/graph-ts";
import {BIGINT_ZERO} from "./constants";

/**
 * If nothing better is available, this generates a unique id from the transaction hash + log index.
 */
export function getIDFromEvent(event: ethereum.Event): string {
  return event.transaction.hash.toHex() + "-" + event.logIndex.toString()
}

export function bigIntMax (args: BigInt[]): BigInt {
  return args.reduce<BigInt>((m, e) => e > m ? e : m, BIGINT_ZERO);
}
export function bigIntMin (args: BigInt[]): BigInt {
  return args.reduce((m, e) => e < m ? e : m);
}