import { BigDecimal, BigInt, Bytes, Address, Value } from "@graphprotocol/graph-ts";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const TBTC_CONTRACT = "0x1bbe271d15bb64df0bc6cd28df9ff322f2ebd847";
export let BIGINT_ZERO = BigInt.fromI32(0);
export let BIGINT_ONE = BigInt.fromI32(1);
export let BIGDECIMAL_ZERO = new BigDecimal(BIGINT_ZERO);
export let MAX_SUPPLY = BigInt.fromI32(21000000);

export let REDEMPTION_SIGNATURE_TIMEOUT = BigInt.fromI32(2 * 60 * 60);
export let INCREASE_FEE_TIMER = BigInt.fromI32(4 * 60 * 60);  // seconds
export let REDEMPTION_PROOF_TIMEOUT = BigInt.fromI32(6 * 60 * 60);  // seconds

export let FUNDING_PROOF_TIMEOUT = BigInt.fromI32(3 * 60 * 60); // seconds
export let FORMATION_TIMEOUT = BigInt.fromI32(3 * 60 * 60); // seconds