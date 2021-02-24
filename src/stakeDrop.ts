import {BigInt, ethereum} from "@graphprotocol/graph-ts/index";
import {StakedropInterval} from "../generated/schema";
import { BIGINT_ZERO } from "./constants";
import {getStatus} from "./models";


// From ECDSARewards.sol
const ECDSAWeights: i32[] = [
  4,
  8,
  10,
  12,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15,
  15
];

const totalRewards = [
  8000000,
  15360000,
  17664000,
  19077120,
  20984832,
  17837107,
  15161541,
  16887310,
  10954213,
  9311081,
  7914419,
  6727256,
  5718168,
  4860443,
  4131376,
  3511670,
  2984919,
  2537181,
  2156604,
  1833114,
  1558147,
  1324425,
  1125761,
  956897
]

let ecdsaFirstIntervalStart = BigInt.fromI32(1600041600);

// Since the contract is not live, we use the planned values.
const TOTAL_DISTRIBUTION = 200000000;
export const BEACON_DISTRIBUTION = (0.10 * TOTAL_DISTRIBUTION) as i32;
export const ECDSA_DISTRIBUTION = (0.90 * TOTAL_DISTRIBUTION) as i32;


// In solidity this is 30 days, which seems to be a set number of seconds
const SECONDS_DAY = 24 * 3600;
let termLength = BigInt.fromI32(30 * SECONDS_DAY);

// From BeaconRewards.sol
const BeaconWeights: i32[] = [
  4, 8, 10, 12, 15, 15,
  15, 15, 15, 15, 15, 15,
  15, 15, 15, 15, 15, 15,
  15, 15, 15, 15, 15, 15
];

// From BeaconRewards.sol
let beaconFirstIntervalStart = BigInt.fromI32(1600905600);


// Return the interval number the timestamp falls within. Start at index 0. -1 if no interval.
// From: Rewards.sol
function intervalOf(timestamp: BigInt, type: number): i32 {
  let programStart = type == 0 ? beaconFirstIntervalStart : ecdsaFirstIntervalStart;
  let maxIntervals = type == 0 ? BeaconWeights.length : ECDSAWeights.length;

  // Should not happen, but the solidity code counts those for the first interval.
  if (timestamp < programStart) {
    return 0;
  }

  let difference = timestamp.minus(programStart);
  let interval = difference.div(termLength).toI32();
  if (interval >= maxIntervals) {
    return -1;
  }
  return interval;
}

export const BEACON_TYPE = 0;
export const ECDSA_TYPE = 1;

/**
 * The Stakedrop is a program to incentivize the operation of nodes and providing bonding capacity.
 */
export function getOrCreateStakedropInterval(event: ethereum.Event, type: number): StakedropInterval|null {
  let idx = intervalOf(event.block.timestamp, type);
  if (idx == -1) {
    return null;
  }

  let id = 'sti-' + idx.toString();

  let interval = StakedropInterval.load(id);
  if (!interval) {
    interval = new StakedropInterval(id);
    interval.beaconGroupCount = 0;
    interval.keepCount = 0;
    interval.number = idx + 1;
    interval.beaconIntervalStart = beaconFirstIntervalStart.plus(termLength.times(BigInt.fromI32(idx)))
    interval.beaconIntervalEnd = beaconFirstIntervalStart.plus(termLength.times(BigInt.fromI32(idx+1)))
    interval.ecdsaIntervalStart = ecdsaFirstIntervalStart.plus(termLength.times(BigInt.fromI32(idx)))
    interval.ecdsaIntervalEnd = ecdsaFirstIntervalStart.plus(termLength.times(BigInt.fromI32(idx+1)))
  }

  // Initialize the allocation for this type/interval the first time it occurs.
  // TODO: This is not quite right, because we can only calculate this once we know the final keepCount.
  // So for now, assume that it will be reached.
  if (type == BEACON_TYPE && !interval.allocationBeacon) {
    if(idx<=1){
      let status = getStatus();
      let remainingAllocationBeacon = status.remainingStakedropBeaconAllocation;
      interval.allocationBeacon = adjustedAllocation(idx, 2, remainingAllocationBeacon, BEACON_TYPE)
      interval.save();
      status.remainingStakedropBeaconAllocation = remainingAllocationBeacon.minus(interval.allocationBeacon!);
    } else {
      interval.allocationBeacon = BIGINT_ZERO;
      interval.save();
    }
  }
  if (type == ECDSA_TYPE && !interval.allocationECDSA) {
    if(idx<=2){
      let status = getStatus();
      let remainingAllocationECDSA = status.remainingStakedropECDSAAllocation;
      interval.allocationECDSA = adjustedAllocation(idx, 1000, remainingAllocationECDSA, ECDSA_TYPE)
      interval.save();
      status.remainingStakedropECDSAAllocation = remainingAllocationECDSA.minus(interval.allocationECDSA!)
    } else {
      interval.allocationECDSA = BigInt.fromI32(totalRewards[idx]*0.9);
      interval.save();
    }
  }

  return interval;
}

// From BeaconRewards.sol
function baseAllocation(interval: i32, available: BigInt, type: number): BigInt {
  let weights = type == 0 ? BeaconWeights : ECDSAWeights;
  let weight = BigInt.fromI32(weights[interval]);
  return available.times(weight).div(BigInt.fromI32(100));
}

// From BeaconRewards.sol
function adjustedAllocation(interval: i32, keepCount: i32, available: BigInt, type: number): BigInt {
  let minimumCount = type == 0 ? 2 : 1000;
  let base = baseAllocation(interval, available, type);
  let keepCountBig = BigInt.fromI32(keepCount);
  let minimumCountBig = BigInt.fromI32(minimumCount);
  let adjustmentCount = keepCountBig.gt(minimumCountBig) ? keepCountBig : minimumCountBig;
  return base.times(keepCountBig).div(adjustmentCount)
}
