import {
  AuthorizeOperatorContractCall,
  CancelStakeCall,
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
import {getOrCreateOperator, updateStakedropRewardFormula} from "./models";
import {toDecimal} from "./decimalUtils";
import {
  Lock,
  Operator, OperatorAuthorizationEvent,
  OperatorStakedEvent,
  RedemptionRequestedEvent, StakeOwnershipTransferredEvent, TokensSeizedEvent, TokensSlashedEvent,
  TopUpCompletedEvent,
  TopUpInitiatedEvent, UndelegatedEvent
} from "../generated/schema";
import {store, ethereum, Address} from "@graphprotocol/graph-ts";
import {BIGDECIMAL_ZERO} from "./constants";
import {bigIntMax, getIDFromCall, getIDFromEvent} from "./utils";
import {completeLogEvent, completeLogEventRaw, getDepositIdFromAddress} from "./mapping";


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
  let points = operator.stakeLockExpiryPoints!;
  points.push(event.params.until);
  operator.stakeLockExpiryPoints = points;
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
  let operator = getOrCreateOperator(event.params.operator);
  operator.stakedAmount = BIGDECIMAL_ZERO;
  //member.recoveredAt = event.block.timestamp;
  operator.save()

  let logEvent = new OperatorStakedEvent(getIDFromEvent(event))
  logEvent.operator = operator.id;
  completeLogEvent(logEvent, event); logEvent.save()

  // TODO: This would count how many operators are staking
  //let mainContract = MainContract.bind(Address.fromString(KEEP_CONTRACT));
  // let tokenStaking = getTokenStaking();
  // tokenStaking.totalStaker = tokenStaking.totalStaker.minus(BIGINT_ONE);
  // tokenStaking.totalTokenStaking = toDecimal(mainContract.balanceOf(event.address));
  // tokenStaking.save()
}

/**
 * Call: cancelStake().
 *
 * Called when a delegation is cancelled a few hours after it was started
 */
export function handleCancelledStake(call: CancelStakeCall): void{
  let operator = getOrCreateOperator(call.inputs._operator);
  operator.stakedAmount = BIGDECIMAL_ZERO;
  operator.save();
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
  let operator = getOrCreateOperator(event.params.operator);
  operator.stakedAmount = operator.stakedAmount.minus(toDecimal(event.params.amount));
  updateStakedropRewardFormula(operator);
  operator.save()

  let logEvent = new TokensSlashedEvent(getIDFromEvent(event))
  logEvent.operator = operator.id;
  completeLogEvent(logEvent, event); logEvent.save()

  // TODO: We want to log this as an event somehow, and maybe a per-operator total.

  // let tokenStaking = getTokenStaking();
  // tokenStaking.totalTokenSlash = tokenStaking.totalTokenSlash.plus(toDecimal(event.params.amount));
  // tokenStaking.save()
}

export function handleTokensSeized(event: TokensSeized): void {
  let operator = getOrCreateOperator(event.params.operator);
  operator.stakedAmount = operator.stakedAmount.minus(toDecimal(event.params.amount));
  updateStakedropRewardFormula(operator);
  operator.save()

  let logEvent = new TokensSeizedEvent(getIDFromEvent(event))
  logEvent.operator = operator.id;
  logEvent.amount = event.params.amount;
  completeLogEvent(logEvent, event); logEvent.save()

  // TODO: We want to log this as an event somehow, and maybe a per-operator total.

  // let tokenStaking = getTokenStaking();
  // tokenStaking.totalTokenSlash = tokenStaking.totalTokenSlash.plus(toDecimal(event.params.amount));
  // tokenStaking.save()
}

/**
 * Event: Undelegated.
 *
 * This starts the undelegation period - the tokens are still staked, until `recoverStake` is called
 * once the undelegation period ends. At this point, they go to the owner.
 */
export function handleUndelegated(event: Undelegated): void {
  // TODO: Store as state that the undelegation period started.

  let logEvent = new UndelegatedEvent(getIDFromEvent(event))
  logEvent.operator = event.params.operator.toHexString();
  completeLogEvent(logEvent, event); logEvent.save()
}


export function handleStakeOwnershipTransferred(
    event: StakeOwnershipTransferred
): void {
  let logEvent = new StakeOwnershipTransferredEvent(getIDFromEvent(event))
  logEvent.operator = event.params.operator.toHexString();
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleTopUpCompleted(event: TopUpCompleted): void {
  let operator = getOrCreateOperator(event.params.operator);
  operator.stakedAmount = toDecimal(event.params.newAmount);
  updateStakedropRewardFormula(operator);
  operator.save()

  let logEvent = new TopUpCompletedEvent(getIDFromEvent(event))
  logEvent.operator = event.params.operator.toHexString();
  logEvent.newAmount = event.params.newAmount;
  completeLogEvent(logEvent, event); logEvent.save()
}

export function handleTopUpInitiated(event: TopUpInitiated): void {
  let logEvent = new TopUpInitiatedEvent(getIDFromEvent(event))
  logEvent.operator = event.params.operator.toHexString();
  logEvent.amount = event.params.topUp;
  completeLogEvent(logEvent, event); logEvent.save()
}

/**
 * Call: authorizeOperatorContract().
 *
 * This is called by the node operators during setup, to allow system contracts to access their staked KEEP.
 */
export function handleAuthorizeOperatorContract(call: AuthorizeOperatorContractCall): void {
  let operator = getOrCreateOperator(call.inputs._operator);
  let type = "";
  if (call.inputs._operatorContract == Address.fromString("0xA7d9E842EFB252389d613dA88EDa3731512e40bD")) {
    operator.bondedECDSAKeepFactoryAuthorized = true;
    type = "BondedECDSAKeepFactory";
  }
  else if (call.inputs._operatorContract == Address.fromString("0xdF708431162Ba247dDaE362D2c919e0fbAfcf9DE")) {
    operator.randomBeaconOperatorAuthorized = true;
    type = "RandomBeaconOperator";
  }
  else {
    type = "UnknownContract";
  }

  operator.save();

  if (type) {
    let logEvent = new OperatorAuthorizationEvent(getIDFromCall(call))
    logEvent.operator = call.inputs._operator.toHexString();
    logEvent.authorizationType = type;
    logEvent.contractAddress = call.inputs._operatorContract;
    logEvent.isDeauthorization = false;
    completeLogEventRaw(logEvent, call.transaction, call.block); logEvent.save()
  }
}