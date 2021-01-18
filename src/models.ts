import {BIGDECIMAL_ZERO, BIGINT_ZERO} from "./constants";
import {Address, BigInt} from "@graphprotocol/graph-ts/index";
import {Operator, StatsRecord, StatusRecord, User} from "../generated/schema";
import {BEACON_DISTRIBUTION, ECDSA_DISTRIBUTION} from "./stakeDrop";
import {BigDecimal} from "@graphprotocol/graph-ts";


let BIG_DECIMAL_1 = BigDecimal.fromString("1");
let BIG_DECIMAL_2 = BigDecimal.fromString("2");
let BIG_DECIMAL_500 = BigDecimal.fromString("500");
let BIG_DECIMAL_3000 = BigDecimal.fromString("3000");
let BIG_DECIMAL_MIN_STAKE = BigDecimal.fromString("70000")


// Calculate the square root of a BigDecimal using the Babylonian method.
// http://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method
// @param n - the number to compute the square root of
// @param g - the best guess so far (can omit from initial call)
// From: https://gist.github.com/joelpt/3824024
//
// Initially, I attempted to port BigInt.sqrt() from graph-ts to BigDecimal, but this
// implementation does not support values between 0 and 1.
function bigDecimalSqrt(n: BigDecimal, g: BigDecimal|null = null): BigDecimal {
  if (!g) {
    // Take an initial guess at the square root
    g = n.div(BIG_DECIMAL_2);
  }
  if (g == BIGDECIMAL_ZERO) {
    return BIGDECIMAL_ZERO;
  }
  let d = n.div(g!);
  let ng = (d.plus(g!)).div(BIG_DECIMAL_2)
  if (g == ng) {
    // The new guess is the same as the old guess; further guesses
    // can get no more accurate so we return this guess
    return g!;
  }
  // Recursively solve for closer and closer approximations of the square root
  return bigDecimalSqrt(n, ng);
}


export function updateStakedropRewardFormula(operator: Operator): void {
  let prevWeight = operator.stakedropRewardWeight;

  // =IF(B11>3000,2*SQRT(B11*3000)-3000,B11)
  operator.stakedropEthScore = operator.ethLocked.gt(BIG_DECIMAL_3000)
      ? bigDecimalSqrt(operator.ethLocked.times(BIG_DECIMAL_3000)).times(BIG_DECIMAL_2).minus(BIG_DECIMAL_3000)
      : operator.ethLocked;

  // This will start to be wrong once BIG_DECIMAL_MIN_STAKE changes. We might have to calculate the value for
  // all min stake values, or come up with a clever formula.
  // =IF(B11=0,0,1+MIN(C11/70000,SQRT(C11/(B11*500))))
  let boostFactor1 = operator.stakedAmount.div(BIG_DECIMAL_MIN_STAKE);
  let boostFactor2 = operator.ethLocked.equals(BIGDECIMAL_ZERO) ? BIGDECIMAL_ZERO : bigDecimalSqrt(operator.stakedAmount.div(operator.ethLocked.times(BIG_DECIMAL_500)));
  operator.stakedropBoost = BIG_DECIMAL_1.plus(boostFactor1.gt(boostFactor2) ? boostFactor2 : boostFactor1);
  operator.stakedropRewardWeight = operator.stakedropEthScore.times(operator.stakedropBoost);

  if (operator.stakedropRewardWeight.notEqual(prevWeight)) {
    let status = getStatus();
    status.totalRewardWeight = status.totalRewardWeight.minus(prevWeight).plus(operator.stakedropRewardWeight);
    status.save();
  }
}

export function getOrCreateOperator(address: Address): Operator {
  let member = Operator.load(address.toHexString());
  if (member == null) {
    member = new Operator(address.toHexString());
    member.address = address;
    member.totalKeepCount = 0;
    member.activeKeepCount = 0;
    member.ethLocked = BIGDECIMAL_ZERO;
    member.bonded = BIGDECIMAL_ZERO;
    member.unboundAvailable = BIGDECIMAL_ZERO;
    member.beaconGroupCount = 0;
    member.stakedAmount = BIGDECIMAL_ZERO;
    member.attributableFaultCount = 0;
    member.involvedInFaultCount = 0;
    member.totalFaultCount = 0;
    member.totalTBTCRewards = BIGINT_ZERO;
    member.tbtcFeesEarned = BIGINT_ZERO;
    member.totalETHRewards = BIGINT_ZERO;
    member.totalBeaconRewards = BIGINT_ZERO;
    member.stakedropBeaconRewardsDispensed = BIGINT_ZERO;
    member.stakedropECDSARewardsDispensed = BIGINT_ZERO;
    member.stakedropRewardsDispensed = BIGINT_ZERO;
    member.randomBeaconOperatorAuthorized = false;
    member.bondedECDSAKeepFactoryAuthorized = false;
    member.tbtcSystemSortitionPoolAuthorized = false;
    member.stakedropRewardWeight = BIGDECIMAL_ZERO;
    member.stakedropEthScore = BIGDECIMAL_ZERO;
    member.stakedropBoost = BIGDECIMAL_ZERO;
    updateStakedropRewardFormula(member!);
  }
  return member!;
}


export function getOrCreateUser(address: Address): User {
  let id = "u_" + address.toHexString();
  let user = User.load(id);
  if (user == null) {
    user = new User(id);
    user.address = address;
    user.numDepositsCreated = 0
    user.numDepositsRedeemed = 0
    user.numOwnDepositsRedeemed = 0
    user.numDepositsUnfunded = 0
  }
  return user!;
}

export function getStats(): StatsRecord {
  let stats = StatsRecord.load("current");
  if (stats == null) {
    stats = new StatsRecord("current")
    stats.availableToBeBonded = BIGDECIMAL_ZERO
    stats.totalBonded = BIGDECIMAL_ZERO;
    stats.totalBondsSeized = BIGDECIMAL_ZERO;
    stats.btcUnderDeposit = BIGINT_ZERO;
    stats.btcInActiveDeposits = BIGINT_ZERO;
    stats.tbtcFees = BIGINT_ZERO;
    stats.randomBeaconFees = BIGINT_ZERO;
    stats.totalGrantCount = 0;
    stats.totalGrantIssued = BIGINT_ZERO;
    stats.depositCount = 0;
    stats.totalStakedropBeaconRewards = BIGINT_ZERO;
    stats.totalStakedropECDSARewards = BIGINT_ZERO;
    stats.unallocatedStakedropBeaconRewards = BIGINT_ZERO;
    stats.unallocatedStakedropECDSARewards = BIGINT_ZERO;
    stats.dispensedStakedropBeaconRewards = BIGINT_ZERO;
    stats.dispensedStakedropECDSARewards = BIGINT_ZERO;
  }
  return stats!;
}

/**
 * The StatusRecord entity is a singleton. Return the existing one, or create it the first time.
 */
export function getStatus(): StatusRecord {
  let status = StatusRecord.load("current");
  if (status == null) {
    status = new StatusRecord("current")
    status.currentRequestedRelayEntry = null;
    status.remainingStakedropBeaconAllocation = BigInt.fromI32(BEACON_DISTRIBUTION);
    status.remainingStakedropECDSAAllocation = BigInt.fromI32(ECDSA_DISTRIBUTION);
    status.totalRewardWeight = BIGDECIMAL_ZERO;
  }
  return status!;
}