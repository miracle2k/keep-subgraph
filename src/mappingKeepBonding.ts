import {
  BondCreated,
  BondReassigned,
  BondReleased,
  BondSeized,
  UnbondedValueDeposited,
  UnbondedValueWithdrawn
} from "../generated/KeepBonding/KeepBondingContract"

import { toDecimal } from "./decimalUtils";
import {getOrCreateOperator, getStats} from "./models";
import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  Bond, BondReassignedEvent,
  BondSeizedEvent,
  UnbondedValueDepositedEvent,
  UnbondedValueWithdrawnEvent
} from "../generated/schema";
import {BIGDECIMAL_ZERO, BIGINT_ZERO} from "./constants";
import {getIDFromEvent} from "./utils";
import {completeLogEvent} from "./mapping";


// TODO: Consider whether, instead of doing the math ourselves, we should/can call inot the contract to get the
// bonded amounts per member.


function getBondId(operator: Address,  referenceId: BigInt): string {
  return operator.toHex()  + "-" + referenceId.toString();
}


export function handleBondCreated(event: BondCreated): void {
  let bond = new Bond(getBondId(event.params.operator, event.params.referenceID));
  bond.status = 'ACTIVE';
  bond.bondedAmount = BIGDECIMAL_ZERO.plus(toDecimal(event.params.amount));
  bond.holder = event.params.holder;
  bond.operator = event.params.operator.toHexString();
  bond.keep = event.params.holder.toHexString();
  bond.referenceID = event.params.referenceID;
  bond.save()

  let operator = getOrCreateOperator(event.params.operator);
  operator.unboundAvailable = operator.unboundAvailable.minus(toDecimal(event.params.amount));
  operator.bonded = operator.bonded.plus(toDecimal(event.params.amount));
  operator.save();

  let stats = getStats();
  stats.availableToBeBonded = stats.availableToBeBonded.minus(toDecimal(event.params.amount));
  stats.totalBonded = stats.totalBonded.plus(toDecimal(event.params.amount));
  stats.save()
}

// TODO: Reassign
export function handleBondReassigned(event: BondReassigned): void {
  // let bondId = getBondId(event.params.operator, event.params.referenceID);
  // let bond = Bond.load(bondId)!;
  //
  // let newBond =
  //
  //
  // let operatorAddress = event.params.operator;
  // let referenceID = event.params.referenceID;
  // let newReferenceId = event.params.newReferenceID;
  // const id = generateMemberId(operatorAddress.toHex(),referenceID.toString());
  // let oldMemberLocked = MemberLocked.load(id);
  // if (oldMemberLocked != null) {
  //   const newId = generateMemberId(
  //       operatorAddress.toHex(),
  //       newReferenceId.toString()
  //   );
  //   let newMemberLocked = getOrCreateMemberLocked(newId);
  //   newMemberLocked.holder = oldMemberLocked.holder;
  //   newMemberLocked.operator = oldMemberLocked.operator;
  //   newMemberLocked.referenceID = oldMemberLocked.referenceID;
  //   newMemberLocked.bonded = oldMemberLocked.bonded;
  //   newMemberLocked.save();
  //
  //   let member = getOrCreateOperator(event.params.operator.toHex());
  //   let memberLockes = member.memberLocks;
  //   const index = memberLockes.indexOf(oldMemberLocked.id);
  //   memberLockes.splice(index, 1);
  //   memberLockes.push(oldMemberLocked.id);
  //   member.memberLocks = memberLockes;
  //   member.save();
  //}

  let logEvent = new BondReassignedEvent(getIDFromEvent(event))
  logEvent.operator = event.params.operator.toHexString();
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleBondReleased(event: BondReleased): void {
  // We do not get the amount here from the contract event, so we have to read it from the bond.
  let bondId = getBondId(event.params.operator, event.params.referenceID);
  let bond = Bond.load(bondId)!;
  let bondedAmount: BigDecimal = bond.bondedAmount;
  bond.bondedAmount = BIGDECIMAL_ZERO;
  bond.status = 'RELEASED';
  bond.save();

  let operator = getOrCreateOperator(event.params.operator);
  operator.unboundAvailable = operator.unboundAvailable.plus(bondedAmount);
  operator.bonded = operator.bonded.minus(bondedAmount);
  operator.save()

  let stats = getStats();
  stats.availableToBeBonded = stats.availableToBeBonded.plus(bondedAmount);
  stats.totalBonded = stats.totalBonded.minus(bondedAmount);
  stats.save()
}

export function handleBondSeized(event: BondSeized): void {
  let bondId = getBondId(event.params.operator, event.params.referenceID);
  let bond = Bond.load(bondId)!;
  bond.bondedAmount = BIGDECIMAL_ZERO;
  bond.status = 'SEIZED';
  bond.save();

  let operator = getOrCreateOperator(event.params.operator);
  operator.bonded = operator.bonded.minus(toDecimal(event.params.amount));
  operator.save()

  let logEvent = new BondSeizedEvent(getIDFromEvent(event))
  logEvent.operator = event.params.operator.toHexString();
  completeLogEvent(logEvent, event); logEvent.save()

  let stats = getStats();
  stats.totalBonded = stats.totalBonded.minus(toDecimal(event.params.amount));
  stats.totalBondsSeized = stats.totalBondsSeized.plus(toDecimal(event.params.amount));
  stats.save()
}

export function handleUnbondedValueDeposited(
    event: UnbondedValueDeposited
): void {
  let operator = getOrCreateOperator(event.params.operator);
  operator.unboundAvailable = operator.unboundAvailable.plus(toDecimal(event.params.amount));
  operator.save()

  let stats = getStats();
  stats.availableToBeBonded = stats.availableToBeBonded.plus(toDecimal(event.params.amount));
  stats.save()

  let logEvent = new UnbondedValueDepositedEvent(getIDFromEvent(event))
  logEvent.operator = event.params.operator.toHexString();
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleUnbondedValueWithdrawn(
    event: UnbondedValueWithdrawn
): void {
  let operator = getOrCreateOperator(event.params.operator);
  operator.unboundAvailable = operator.unboundAvailable.minus(toDecimal(event.params.amount));
  operator.save()

  let stats = getStats();
  stats.availableToBeBonded = stats.availableToBeBonded.minus(toDecimal(event.params.amount));
  stats.save()

  let logEvent = new UnbondedValueWithdrawnEvent(getIDFromEvent(event))
  logEvent.operator = event.params.operator.toHexString();
  completeLogEvent(logEvent, event); logEvent.save()
}