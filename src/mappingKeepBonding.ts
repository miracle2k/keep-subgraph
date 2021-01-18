import {
  AuthorizeSortitionPoolContractCall,
  BondCreated,
  BondReassigned,
  BondReleased,
  BondSeized, DeauthorizeSortitionPoolContractCall,
  UnbondedValueDeposited,
  UnbondedValueWithdrawn
} from "../generated/KeepBonding/KeepBondingContract"

import { toDecimal } from "./decimalUtils";
import {getOrCreateOperator, getStats, updateStakedropRewardFormula} from "./models";
import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  Bond, BondReassignedEvent,
  BondSeizedEvent, Operator, OperatorAuthorizationEvent,
  UnbondedValueDepositedEvent,
  UnbondedValueWithdrawnEvent
} from "../generated/schema";
import {BIGDECIMAL_ZERO, BIGINT_ZERO} from "./constants";
import {getIDFromCall, getIDFromEvent} from "./utils";
import {completeLogEvent, completeLogEventRaw} from "./mapping";


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
  operator.ethLocked = operator.ethLocked.minus(toDecimal(event.params.amount));
  updateStakedropRewardFormula(operator);
  operator.save()

  let logEvent = new BondSeizedEvent(getIDFromEvent(event))
  logEvent.operator = event.params.operator.toHexString();
  logEvent.amount = event.params.amount;
  logEvent.destination = event.params.destination;
  logEvent.referenceId = event.params.referenceID;
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
  operator.ethLocked = operator.ethLocked.plus(toDecimal(event.params.amount));
  updateStakedropRewardFormula(operator);
  operator.save()

  let stats = getStats();
  stats.availableToBeBonded = stats.availableToBeBonded.plus(toDecimal(event.params.amount));
  stats.save()

  let logEvent = new UnbondedValueDepositedEvent(getIDFromEvent(event))
  logEvent.operator = event.params.operator.toHexString();
  logEvent.amount = event.params.amount;
  logEvent.beneficiary = event.params.beneficiary;
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleUnbondedValueWithdrawn(
    event: UnbondedValueWithdrawn
): void {
  // TODO: Fix this: there is a withdraw operation from what I assume is not the operator but the owner, maybe:
  // https://etherscan.io/address/0x207d73dce73ec3a10037fc2a0c926186002c6aa2
  let member = Operator.load(event.params.operator.toHexString());
  if (!member) {
    return;
  }

  let operator = getOrCreateOperator(event.params.operator);
  operator.unboundAvailable = operator.unboundAvailable.minus(toDecimal(event.params.amount));
  operator.ethLocked = operator.ethLocked.minus(toDecimal(event.params.amount));
  updateStakedropRewardFormula(operator);
  operator.save()

  let stats = getStats();
  stats.availableToBeBonded = stats.availableToBeBonded.minus(toDecimal(event.params.amount));
  stats.save()

  let logEvent = new UnbondedValueWithdrawnEvent(getIDFromEvent(event))
  logEvent.operator = event.params.operator.toHexString();
  logEvent.amount = event.params.amount;
  logEvent.beneficiary = event.params.beneficiary;
  completeLogEvent(logEvent, event); logEvent.save()
}


// The address returned by BondedECDSAKeepFactory.getSortitionPool(address(TBTCSystem)). Not sure if this can
// change, but if it does, we will need to introduce a new property on the operator to represent the new
// sortition pool, as we would not be able to reset a flag on all existing operators, given limitations in the
// graph's system.
const TBTC_SYSTEM_SORTITION_POOL_ADDRESS = "0xa3748633c6786e1842b5cc44fa43db1ecc710501";

/**
 * Call: authorizeSortitionPoolContract().
 *
 * Called by the node operator (that is, it's authorizer) with the address of the sortition pool used
 * by the TBTCSystem.
 *
 * The ECDSAFactory contract can have multiple sortition pools for multiple "applications", one of them being
 * the TBTCSystem contract.
 */
export function handleAuthorizeSortitionPoolContract(call: AuthorizeSortitionPoolContractCall): void {
  let operator = getOrCreateOperator(call.inputs._operator);
  let authType = 'UnknownContract';

  if (call.inputs._poolAddress.toHexString() == TBTC_SYSTEM_SORTITION_POOL_ADDRESS) {
    operator.tbtcSystemSortitionPoolAuthorized = true;
    authType = 'TBTCSystemSortitionPool';
  }
  operator.save()

  let logEvent = new OperatorAuthorizationEvent(getIDFromCall(call))
  logEvent.operator = call.inputs._operator.toHexString();
  logEvent.authorizationType = authType;
  logEvent.contractAddress = call.inputs._poolAddress;
  logEvent.isDeauthorization = false;
  completeLogEventRaw(logEvent, call.transaction, call.block); logEvent.save()
}


/**
 * Call: deauthorizeSortitionPoolContract().
 */
export function handleDeauthorizeSortitionPoolContract(call: DeauthorizeSortitionPoolContractCall): void {
  let operator = getOrCreateOperator(call.inputs._operator);
  let authType = 'UnknownContract';

  if (call.inputs._poolAddress.toHexString() == TBTC_SYSTEM_SORTITION_POOL_ADDRESS) {
    operator.tbtcSystemSortitionPoolAuthorized = true;
    authType = 'TBTCSystemSortitionPool';
  }
  operator.save()

  let logEvent = new OperatorAuthorizationEvent(getIDFromCall(call))
  logEvent.operator = call.inputs._operator.toHexString();
  logEvent.contractAddress = call.inputs._poolAddress;
  logEvent.authorizationType = authType;
  logEvent.isDeauthorization = true;
  completeLogEventRaw(logEvent, call.transaction, call.block); logEvent.save()
}