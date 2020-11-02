import {
  ExpiredLockReleased,
  LockReleased,
  OperatorStaked,
  RecoveredStake,
  StakeDelegated,
  StakeLocked,
  StakeOwnershipTransferred,
  TokensSeized,
  TokensSlashed,
  TopUpCompleted,
  TopUpInitiated,
  Undelegated,
} from "../generated/StakingContract/StakingContract"
import {getOrCreateOperator} from "./models";
import {toDecimal} from "./decimalUtils";
import { Lock, Operator } from "../generated/schema";
import { store } from "@graphprotocol/graph-ts";
import {BIGDECIMAL_ZERO} from "./constants";
import {bigIntMax} from "./utils";


/**
 * Event: OperatorStaked.
 *
 * Always emitted together with `StakeDelegated`.
 *
 * This is really where a owner/operator/authorizer/beneficiary group (collectively called a "Staker") is created.
 */
export function handleOperatorStaked(event: OperatorStaked): void {
  let member = getOrCreateOperator(event.params.operator);
  member.stakedAt = event.block.timestamp;
  member.stakedAmount = toDecimal(event.params.value);
  member.authorizer = event.params.authorizer;
  member.beneficiary = event.params.beneficiary;
  member.owner = event.transaction.from;
  member.save()

  // these are like the config arguments of the staking contract. not sure what the best way to store them is.
  //let contract = StakingContract.bind(event.address);
  // let tokenStaking = getTokenStaking();
  // let mainContract = MainContract.bind(Address.fromString(KEEP_CONTRACT));
  // tokenStaking.initializationPeriod = contract.initializationPeriod();
  // tokenStaking.minimumStake = contract.minimumStake();
  // tokenStaking.undelegationPeriod = contract.undelegationPeriod();
  // tokenStaking.totalStaker = tokenStaking.totalStaker.plus(BIGINT_ONE);
  // tokenStaking.totalTokenStaking = toDecimal(mainContract.balanceOf(event.address));
}

/**
 * Event: StakeDelegated.
 *
 * Only ever raised together with OperatorStaked, we might only need one of them.
 */
export function handleStakeDelegated(event: StakeDelegated): void {
  // let member = getOrCreateOperator(event.params.operator);
  // member.stakingState = "DELEGATED";
  // member.save()
}

/**
 * Certain authorized contracts can place a hold on the stake (for example, when the operator becomes part of a
 * signing group, then their full stake will be locked. We keep track of each lock placed on the stake.
 */
export function handleStakeLocked(event: StakeLocked): void {
  let lock = new Lock("lock-" + event.params.operator.toHexString() + "-" + event.params.lockCreator.toHexString());
  lock.until = event.params.until;
  lock.operator = event.params.operator.toHexString();
  lock.creator = event.params.lockCreator;
  lock.save()

  // Maintain `Operator.stakeLockExpiresAt`, which requires a helper-list.
  let operator = getOrCreateOperator(event.params.operator);
  if (!operator.stakeLockExpiryPoints) { operator.stakeLockExpiryPoints = []; }
  operator.stakeLockExpiryPoints.push(event.params.until);
  operator.stakeLockExpiresAt = bigIntMax(operator.stakeLockExpiryPoints!);
  operator.save();
}


/**
 * Event: LockReleased
 */
export function handleLockReleased(event: LockReleased): void {
  let lockId = "lock-" + event.params.operator.toHexString() + "-" + event.params.lockCreator.toHexString();
  let lock = Lock.load(lockId)!;
  store.remove("Lock", lockId);

  // Maintain `Operator.stakeLockExpiresAt`, which requires a helper-list.
  let operator = getOrCreateOperator(event.params.operator);
  if (!operator.stakeLockExpiryPoints) { operator.stakeLockExpiryPoints = []; }
  let points = operator.stakeLockExpiryPoints!;
  points.splice(points.indexOf(lock.until), 1);
  operator.stakeLockExpiryPoints = points;
  operator.stakeLockExpiresAt = bigIntMax(operator.stakeLockExpiryPoints!);
  operator.save();
}

/**
 * Event: RecoveredStake.
 *
 * Emitted by `recoverStake()`, once called after the undelegation period expired.
 */
export function handleRecoveredStake(event: RecoveredStake): void{
  let member = getOrCreateOperator(event.params.operator);
  member.stakedAmount = BIGDECIMAL_ZERO;
  //member.recoveredAt = event.block.timestamp;
  member.save()

  // TODO: This would count how many operators are staking
  //let mainContract = MainContract.bind(Address.fromString(KEEP_CONTRACT));
  // let tokenStaking = getTokenStaking();
  // tokenStaking.totalStaker = tokenStaking.totalStaker.minus(BIGINT_ONE);
  // tokenStaking.totalTokenStaking = toDecimal(mainContract.balanceOf(event.address));
  // tokenStaking.save()
}

/**
 * Apparently releaseExpiredLock() needs to be called manually after a lock's "until" expires (or, may
 * only necessary in same cases, not sure).
 *
 * This will find all expired locks, and then `LockRelease` will be emitted for all of them.
 */
export function handleExpiredLockReleased(event: ExpiredLockReleased): void {
  // let member = getOrCreateOperator(event.params.operator);
  // member.stakingState = "EXPIRED_LOCK_RELEASED";
  // member.save()
}

export function handleTokensSlashed(event: TokensSlashed): void {
  let member = getOrCreateOperator(event.params.operator);
  member.stakedAmount = member.stakedAmount.minus(toDecimal(event.params.amount));
  member.save()

  // TODO: We want to log this as an event somehow, and maybe a per-operator total.

  // let tokenStaking = getTokenStaking();
  // tokenStaking.totalTokenSlash = tokenStaking.totalTokenSlash.plus(toDecimal(event.params.amount));
  // tokenStaking.save()
}

export function handleTokensSeized(event: TokensSeized): void {
  let member = getOrCreateOperator(event.params.operator);
  member.stakedAmount = member.stakedAmount.minus(toDecimal(event.params.amount));
  member.save()

  // TODO: We want to log this as an event somehow, and maybe a per-operator total.

  // let tokenStaking = getTokenStaking();
  // tokenStaking.totalTokenSlash = tokenStaking.totalTokenSlash.plus(toDecimal(event.params.amount));
  // tokenStaking.save()
}

// Tokens go back to the owner after an undelegation period, but not yet.
export function handleUndelegated(event: Undelegated): void {
  // TODO: Somehow store as a state that the undelegation period started.
  // let member = getOrCreateOperator(event.params.operator);
  // member.stakingState = "UNDELEGATED";
  // //member.undelegatedAt = event.params.undelegatedAt;
  // member.save()

  // let mainContract = MainContract.bind(Address.fromString(KEEP_CONTRACT));
  // let tokenStaking = getTokenStaking();
  // tokenStaking.totalStaker = tokenStaking.totalStaker.minus(BIGINT_ONE);
  // tokenStaking.totalTokenStaking = toDecimal(mainContract.balanceOf(event.address));
  // tokenStaking.save()
}


export function handleStakeOwnershipTransferred(
    event: StakeOwnershipTransferred
): void {}

export function handleTopUpCompleted(event: TopUpCompleted): void {
  let operator = getOrCreateOperator(event.params.operator);
  operator.stakedAmount = toDecimal(event.params.newAmount);
  operator.save()
}

export function handleTopUpInitiated(event: TopUpInitiated): void {}