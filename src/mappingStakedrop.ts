import {
  AllocateRewardsCall as AllocateBeaconRewardsCall,
  BeaconRewards, ReceiveApprovalCall as ReceiveBeaconApprovalCall,
  RewardReceived as BeaconRewardReceived
} from "../generated/BeaconRewards/BeaconRewards";
import {
  AllocateRewardsCall as AllocateECDSARewardsCall,
  ECDSARewards, ReceiveApprovalCall as ReceiveECDSAApprovalCall,
  RewardReceived as ECDSARewardReceived
} from "../generated/ECDSARewards/ECDSARewards";
import {BondedECDSAKeep, RandomBeaconGroup, RandomBeaconGroupMembership} from "../generated/schema";
import {Address, BigInt} from "@graphprotocol/graph-ts/index";
import {getOrCreateOperator, getStats} from "./models";
import {KeepRandomBeaconOperator} from "../generated/KeepRandomBeaconOperator/KeepRandomBeaconOperator";
import {getBeaconGroupId} from "./modelsRandomBeacon";
import {ECDSA_TYPE, getOrCreateStakedropInterval} from "./stakeDrop";


/**
 * Event: RewardReceived (for the ECDSA rewards contract).
 *
 * When this is called the emitted time in a stakedrop interval, the contract has just determined the
 * amount of KEEP allocated for this interval. That amount cannot change afterwards. It is otherwise
 * emitted once for every kep, to pay out the reward all keep members are eligible for.
 */
export function handleECDSARewardReceivedEvent(event: ECDSARewardReceived): void {
  let keep = BondedECDSAKeep.load(event.params.keep.toHexString())!;

  // For each member in the keep
  let operators = keep.members;
  for (let i=0; i<operators.length; i++) {
    let operator = getOrCreateOperator(Address.fromString(operators[i]));
    operator.stakedropRewardsDispensed = operator.stakedropRewardsDispensed.plus(event.params.amount)
    operator.stakedropECDSARewardsDispensed = operator.stakedropECDSARewardsDispensed.plus(event.params.amount);
    operator.save()
  }

  keep.stakedropRewardStatus = 'DISPENSED';
  keep.save();

  let stats = getStats();
  let ecdsaRewards = ECDSARewards.bind(event.address);
  stats.dispensedStakedropECDSARewards = ecdsaRewards.dispensedRewards();
  stats.save()
}


/**
 * Event: RewardReceived (for the beacon rewards contract).
 *
 * When this is called the emitted time in a stakedrop interval, the contract has just determined the
 * amount of KEEP allocated for this interval. That amount cannot change afterwards. It is otherwise
 * emitted once for every group, to pay out the reward all group members are eligible for.
 */
export function handleBeaconRewardReceivedEvent(event: BeaconRewardReceived): void {
  // The keep identifier given by the event is the group index, we need to group pub key to fetch the entity.
  // We can hard-code the address here, since there is no stakedrop in ropsten.
  let operatorContract = KeepRandomBeaconOperator.bind(Address.fromString("0xdF708431162Ba247dDaE362D2c919e0fbAfcf9DE"));
  let groupPubKey = operatorContract.getGroupPublicKey(BigInt.fromSignedBytes(event.params.keep));
  let group = RandomBeaconGroup.load(getBeaconGroupId(groupPubKey))!;

  // For each member in the group.
  let memberships = group.memberships;
  for (let i=0; i<memberships.length; i++) {
    // An operator can appear multiple times in a group, and will receive a reward multiple times.
    let membership = RandomBeaconGroupMembership.load(memberships[i])!;
    let membershipWeight = BigInt.fromI32(membership.count);

    let realReward = event.params.amount.times(membershipWeight);

    let operator = getOrCreateOperator(Address.fromString(membership.operator));
    operator.stakedropRewardsDispensed = operator.stakedropRewardsDispensed.plus(realReward)
    operator.stakedropBeaconRewardsDispensed = operator.stakedropBeaconRewardsDispensed.plus(realReward);
    operator.save()
  }

  group.stakedropRewardStatus = 'DISPENSED';
  group.save();

  let stats = getStats();
  let beaconRewards = BeaconRewards.bind(event.address);
  stats.dispensedStakedropBeaconRewards = beaconRewards.dispensedRewards();
  stats.save()
}

export function handleAllocateECDSARewards(call: AllocateECDSARewardsCall): void {
  // NB: This can be implicitly done via processKeep() so I am not sure it is actually helpful.
  // Two things;
  // - log this to figure out when it is called.
  // - run this code within the RewardReceived handlers as well.
}


/**
 * Call: receiveApproval().
 *
 * This sends further KEEP to be distributed and/or allocates any KEEP dropped to the contract through a transfer.
 */
export function handleReceiveECDSAApproval(call: ReceiveECDSAApprovalCall): void {
  // Use the address directly, as there is no stakedrop in ropsten
  let rewardsContract = ECDSARewards.bind(Address.fromString("0xc5aC5A8892230E0A3e1c473881A2de7353fFcA88"));
  let stats = getStats();
  stats.totalStakedropECDSARewards = rewardsContract.totalRewards();
  stats.unallocatedStakedropECDSARewards = rewardsContract.unallocatedRewards();
  stats.save()
}

export function handleAllocateBeaconRewards(call: AllocateBeaconRewardsCall): void {
}

export function handleReceiveBeaconApproval(call: ReceiveBeaconApprovalCall): void {
  // Use the address directly, as there is no stakedrop in ropsten
  let rewardsContract = BeaconRewards.bind(Address.fromString("0xBF51807ACb3394B8550f0554FB9098856Ef5F491"));
  let stats = getStats();
  stats.totalStakedropBeaconRewards = rewardsContract.totalRewards();
  stats.unallocatedStakedropBeaconRewards = rewardsContract.unallocatedRewards();
  stats.save()
}

// when creating a new interval (right now this happens on keep/group creation, but it could happen during receiveReward,
// and we should create the interval there!)
//    make sure we updated the previous interval: read allocation from the contract

// call to reportTermination():
//   - mark the item itself as done/handled
//   - update getStats().unallocatedRewards


// TODO: whenever a keep closes, if the stake drop interval is finished, we can add to the member's totals.
// if it is not, we add to the successful count. in general, we want two fields on the interval:
// eligableKeepCount (those which have been closed successfully).
// ineligableKeepCount (those which have been terminated).
// stillOpenKeepCount (we do not know yet).
// but open question: how can we, once the interval closes, assign all sums to all members?
//     1. keep a long array of all affected users for this interval
//     2. delay it, have a per-operator "stakedropAdded" function, which will run whenever a reward is received
//             or the member interacts with the system.

// wanted: per member, per interval total rewards distributed