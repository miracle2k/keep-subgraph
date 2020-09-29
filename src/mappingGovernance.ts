import {
  AllowNewDepositsUpdated,
  CollateralizationThresholdsUpdated,
  CollateralizationThresholdsUpdateStarted,
  EthBtcPriceFeedAdded,
  EthBtcPriceFeedAdditionStarted, KeepFactoriesUpdated,
  KeepFactoriesUpdateStarted,
  LotSizesUpdated,
  LotSizesUpdateStarted,
  SignerFeeDivisorUpdated,
  SignerFeeDivisorUpdateStarted
} from "../generated/TBTCSystem/TBTCSystem";
import {Governance, GovernanceLogEntry, GovernanceChange} from "../generated/schema";
import { ethereum, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {getIDFromEvent} from "./utils";


function getGovernance(): Governance {
  let governance = Governance.load('GOVERNANCE');
  if (governance == null) {
    governance = new Governance('GOVERNANCE');

    // Initialize with the default values the first time
    governance.newDepositsAllowed = true;
    governance.lotSizes = [BigInt.fromI32(1000000), BigInt.fromI32(10000000), BigInt.fromI32(20000000), BigInt.fromI32(50000000), BigInt.fromI32(100000000)];
    governance.priceFeeds = [
        Bytes.fromHexString("0x81a679f98b63b3ddf2f17cb5619f4d6775b3c5ed") as Bytes
    ];
    governance.signerFeeDivisor = 2000;
    governance.initialCollateralizedPercent = 150;
    governance.severelyUndercollateralizedThresholdPercent = 110
    governance.undercollateralizedThresholdPercent = 125
    governance.factorySelector = Bytes.fromI32(0) as Bytes;
    governance.fullyBackedFactory = Bytes.fromI32(0) as Bytes;
    governance.keepStakedFactory = Bytes.fromHexString("0xA7d9E842EFB252389d613dA88EDa3731512e40bD") as Bytes;
  }
  return <Governance>governance;
}


// This is hardcoded into the contract
const GOVERNANCE_DELAY =  3600 * 48;  // 48 hours

function makeGovernanceChange(type: string, event: ethereum.Event): GovernanceChange {
  let change = new GovernanceChange(getIDFromEvent(event))
  change.type = type;
  change.requestedAt = event.block.timestamp;
  change.takesEffectAfter = event.block.timestamp.plus(BigInt.fromI32(GOVERNANCE_DELAY));
  change.requestBlock = event.block.number;
  change.requestTransactionHash = event.transaction.hash.toHexString()
  return change;
}

function finalizeGovernanceChange(changeId: string, event: ethereum.Event): GovernanceChange {
  let change = new GovernanceChange(changeId);
  change.finalizeBlock = event.block.number;
  change.finalizeTransactionHash = event.transaction.hash.toHexString();
  change.save()
  return change;
}

function makeLogEntry(event: ethereum.Event, type: string, isRequest: boolean, change: GovernanceChange): void {
  let log = new GovernanceLogEntry(getIDFromEvent(event));
  log.timestamp = event.block.timestamp;
  log.block = event.block.number;
  log.submitter = event.transaction.from;
  log.change = change.id;
  log.transactionHash = event.transaction.hash.toHexString();
  log.isRequest = isRequest
  log.save()
}

export function handleLotSizesUpdateStarted(event: LotSizesUpdateStarted): void {
  let change = makeGovernanceChange("LOT_SIZES", event);
  let gov = getGovernance();

  gov.pendingLotSizeChange = change.id;
  gov.save()

  change.newLotSizes = event.params._lotSizes;
  change.prevLotSizes = gov.lotSizes
  change.save()

  makeLogEntry(event, "LOT_SIZES", true, change);
}

export function handleLotSizesUpdated(event: LotSizesUpdated): void {
  let gov = getGovernance();
  let change = finalizeGovernanceChange(gov.pendingLotSizeChange!, event);

  gov.lotSizes = event.params._lotSizes;
  gov.pendingLotSizeChange = null;
  gov.save()

  makeLogEntry(event, "LOT_SIZES", false, change);
}

export function handleSignerFeeDivisorUpdateStarted(event: SignerFeeDivisorUpdateStarted): void {
  let gov = getGovernance();
  let change = makeGovernanceChange("SIGNER_FEE_DIVISOR", event);

  change.prevSignerFeeDivisor = gov.signerFeeDivisor;
  change.newSignerFeeDivisor = event.params._signerFeeDivisor;
  change.save()

  gov.pendingSignerFeeDivisorChange = change.id;
  gov.save()

  makeLogEntry(event, "SIGNER_FEE_DIVISOR", true, change);
}

export function handleSignerFeeDivisorUpdated(event: SignerFeeDivisorUpdated): void {
  let gov = getGovernance();
  let change = finalizeGovernanceChange(gov.pendingSignerFeeDivisorChange!, event);

  gov.signerFeeDivisor = event.params._signerFeeDivisor;
  gov.pendingSignerFeeDivisorChange = null;
  gov.save()

  makeLogEntry(event, "SIGNER_FEE_DIVISOR", false, change);

}

export function handleCollateralizationThresholdsUpdateStarted(event: CollateralizationThresholdsUpdateStarted): void {
  let gov = getGovernance();

  let change = makeGovernanceChange("COLLATERALIZATION_THRESHOLDS", event);
  change.newSeverelyUndercollateralizedThresholdPercent = event.params._severelyUndercollateralizedThresholdPercent;
  change.newUndercollateralizedThresholdPercent = event.params._undercollateralizedThresholdPercent;
  change.newInitialCollateralizedPercent = event.params._initialCollateralizedPercent;
  change.prevSeverelyUndercollateralizedThresholdPercent = gov.severelyUndercollateralizedThresholdPercent;
  change.prevUndercollateralizedThresholdPercent = gov.undercollateralizedThresholdPercent;
  change.prevInitialCollateralizedPercent = gov.initialCollateralizedPercent;
  change.save()

  gov.pendingCollateralizationThresholdsChange = change.id;
  gov.save()

  makeLogEntry(event, "COLLATERALIZATION_THRESHOLDS", true, change);
}

export function handleCollateralizationThresholdsUpdated(event: CollateralizationThresholdsUpdated): void {
  let gov = getGovernance();
  let change = finalizeGovernanceChange(gov.pendingCollateralizationThresholdsChange!, event);

  gov.severelyUndercollateralizedThresholdPercent = event.params._severelyUndercollateralizedThresholdPercent;
  gov.undercollateralizedThresholdPercent = event.params._undercollateralizedThresholdPercent;
  gov.initialCollateralizedPercent = event.params._initialCollateralizedPercent;
  gov.pendingCollateralizationThresholdsChange = null;
  gov.save()

  makeLogEntry(event, "COLLATERALIZATION_THRESHOLDS", false, change);
}

export function handleEthBtcPriceFeedAdditionStarted(event: EthBtcPriceFeedAdditionStarted): void {
  let gov = getGovernance();
  let change = makeGovernanceChange("ETH_BTC_PRICE_FEED_ADDITION", event);

  change.newPriceFeed = event.params._priceFeed
  change.save()

  gov.pendingPriceFeedAddition = change.id;
  gov.save()

  makeLogEntry(event, "ETH_BTC_PRICE_FEED_ADDITION", true, change);
}

export function handleEthBtcPriceFeedAdded(event: EthBtcPriceFeedAdded): void {
  let gov = getGovernance();
  let change = finalizeGovernanceChange(gov.pendingPriceFeedAddition!, event);

  gov.priceFeeds.push(event.params._priceFeed);
  gov.pendingPriceFeedAddition = null;
  gov.save()

  makeLogEntry(event, "ETH_BTC_PRICE_FEED_ADDITION", false, change);
}

export function handleKeepFactoriesUpdateStarted(event: KeepFactoriesUpdateStarted): void {
  let change = makeGovernanceChange("KEEP_FACTORIES", event);
  let gov = getGovernance();

  change.newFactorySelector = event.params._factorySelector;
  change.newFullyBackedFactory = event.params._fullyBackedFactory;
  change.newKeepStakedFactory = event.params._keepStakedFactory
  change.prevFactorySelector = gov.factorySelector;
  change.prevFullyBackedFactory = gov.fullyBackedFactory;
  change.prevKeepStakedFactory = gov.keepStakedFactory
  change.save();

  gov.pendingFactoriesChange = change.id;
  gov.save()

  makeLogEntry(event, "KEEP_FACTORIES", true, change);
}

export function handleKeepFactoriesUpdated(event: KeepFactoriesUpdated): void {
  let gov = getGovernance();
  gov.factorySelector = event.params._factorySelector;
  gov.fullyBackedFactory = event.params._fullyBackedFactory;
  gov.keepStakedFactory = event.params._keepStakedFactory;

  let change = finalizeGovernanceChange(gov.pendingFactoriesChange!, event);
  gov.pendingFactoriesChange = null;
  gov.save()

  makeLogEntry(event, "KEEP_FACTORIES", false, change);
}

export function handleAllowNewDepositsUpdated(event: AllowNewDepositsUpdated): void {
  let gov = getGovernance();
  gov.newDepositsAllowed = event.params._allowNewDeposits
  gov.save()
}