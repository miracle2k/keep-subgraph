import {BeaconRewards, RewardReceived as BeaconRewardReceived} from "../generated/BeaconRewards/BeaconRewards";
import {ECDSARewards, RewardReceived as ECDSARewardReceived} from "../generated/ECDSARewards/ECDSARewards";
import {BondedECDSAKeep, RandomBeaconGroup, RandomBeaconGroupMembership} from "../generated/schema";
import {Address, BigInt} from "@graphprotocol/graph-ts/index";
import {getOrCreateOperator, getStats} from "./models";
import {KeepRandomBeaconOperator} from "../generated/KeepRandomBeaconOperator/KeepRandomBeaconOperator";
import {getBeaconGroupId} from "./modelsRandomBeacon";


/**
 * Event: RewardReceived (for the ECDSA rewards contract).
 *
 * When this is called the emitted time in a stakedrop interval, the contract has just determined the
 * amount of KEEP allocated for this interval. That amount cannot change afterwards. It is otherwise
 * emitted once for every kep, to pay out the reward all keep members are eligible for.
 */
function handleECDSARewardReceivedEvent(event: ECDSARewardReceived): void {
  let keep = BondedECDSAKeep.load(event.params.keep.toHexString())!;

  // For each member in the keep
  let operators = keep.members;
  for (let i=0; i<operators.length; i++) {
    let operator = getOrCreateOperator(Address.fromString(operators[i]));
    operator.stakedropRewardsDispensed = operator.stakedropRewardsDispensed.plus(event.params.amount)
    operator.stakedropECDSARewardsDispensed = operator.stakedropECDSARewardsDispensed.plus(event.params.amount);
    operator.save()
  }

  keep.stakedropRewardDispensed = true;
  keep.save();

  const stats = getStats();
  const ecdsaRewards = ECDSARewards.bind(event.address);
  stats.dispensedStakedropECDSARewards = ecdsaRewards.dispensedRewards();
}


/**
 * Event: RewardReceived (for the beacon rewards contract).
 *
 * When this is called the emitted time in a stakedrop interval, the contract has just determined the
 * amount of KEEP allocated for this interval. That amount cannot change afterwards. It is otherwise
 * emitted once for every group, to pay out the reward all group members are eligible for.
 */
function handleBeaconRewardReceivedEvent(event: BeaconRewardReceived): void {
  // The keep identifier given by the event is the group index, we need to group pub key to fetch the entity.
  // We can hard-code the address here, since there is no stakedrop in ropsten.
  let operatorContract = KeepRandomBeaconOperator.bind(Address.fromString("0xdF708431162Ba247dDaE362D2c919e0fbAfcf9DE"));
  const groupPubKey = operatorContract.getGroupPublicKey(event.params.keep.toU32());
  let group = RandomBeaconGroup.load(getBeaconGroupId(groupPubKey))!;

  // For each member in the group.
  let memberships = group.memberships;
  for (let i=0; i<memberships.length; i++) {
    // An operator can appear multiple times in a group, and will receive a reward multiple times.
    let membership = RandomBeaconGroupMembership.load(memberships[i])!;
    const membershipWeight = BigInt.fromI32(membership.count);

    const realReward = event.params.amount.times(membershipWeight);

    let operator = getOrCreateOperator(Address.fromString(membership.operator));
    operator.stakedropRewardsDispensed = operator.stakedropRewardsDispensed.plus(realReward)
    operator.stakedropBeaconRewardsDispensed = operator.stakedropBeaconRewardsDispensed.plus(realReward);
    operator.save()
  }

  group.stakedropRewardDispensed = true;
  group.save();

  const stats = getStats();
  const beaconRewards = BeaconRewards.bind(event.address);
  stats.dispensedStakedropBeaconRewards = beaconRewards.dispensedRewards();
}
