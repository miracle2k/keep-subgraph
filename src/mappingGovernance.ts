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
import {Governance, GovernanceLogEntry, PendingGovernanceChange} from "../generated/schema";
import { ethereum, BigInt, Bytes } from "@graphprotocol/graph-ts";
import {getIDFromEvent} from "./utils";


function getGovernance(): Governance {
  let governance = Governance.load('GOVERNANCE');
  if (governance == null) {
    governance = new Governance('GOVERNANCE');

    // Initialize with the default values the first time
    governance.newDepositsAllowed = true;
    governance.lotSizes = [];
    governance.factorySelector = Bytes.fromI32(0) as Bytes;
    governance.fullyBakedFactory = Bytes.fromI32(0) as Bytes;
    governance.keepStakedFactory = Bytes.fromHexString("0xA7d9E842EFB252389d613dA88EDa3731512e40bD") as Bytes;
  }
  return <Governance>governance;
}


// This is hardcoded into the contract
const GOVERNANCE_DELAY =  3600 * 48;  // 48 hours

function makePendingGovernanceChange(type: string, event: ethereum.Event): string {
  let change = new PendingGovernanceChange(getIDFromEvent(event))
  change.type = type;
  change.requestedAt = event.block.timestamp
  change.takesEffectAfter = event.block.timestamp.plus(new BigInt(GOVERNANCE_DELAY));
  change.requestBlock = event.block.number;
  change.requestTransactionHash = event.transaction.hash.toHexString()
  change.save();
  return change.id;
}

function finalizeGovernanceChange(changeId: string, event: ethereum.Event): void {
  let change = new PendingGovernanceChange(changeId);
  change.finalizeBlock = event.block.number;
  change.finalizeTransactionHash = event.transaction.hash.toHexString();
}

function makeLogEntry(event: ethereum.Event, type: string, isRequest: boolean): GovernanceLogEntry {
  let log = new GovernanceLogEntry(getIDFromEvent(event))
  log.type = type
  log.isRequest = isRequest
  return log
}

export function handleLotSizesUpdateStarted(event: LotSizesUpdateStarted): void {
  let gov = getGovernance();
  gov.pendingLotSizes = event.params._lotSizes;
  gov.pendingLotSizeChange = makePendingGovernanceChange("LOT_SIZES", event);
  gov.save()

  let log = makeLogEntry(event, "LOT_SIZES", true);
  log.newLotSizes = event.params._lotSizes;
  log.save()
}

export function handleLotSizesUpdated(event: LotSizesUpdated): void {
  let gov = getGovernance();
  finalizeGovernanceChange(gov.pendingLotSizeChange!, event);
  gov.lotSizes = event.params._lotSizes;
  gov.pendingLotSizes = null;
  gov.pendingLotSizeChange = null;
  gov.save()

  let log = makeLogEntry(event, "LOT_SIZES", false);
  log.newLotSizes = event.params._lotSizes;
  log.save()
}

export function handleSignerFeeDivisorUpdateStarted(event: SignerFeeDivisorUpdateStarted): void {
  // TODO:
}

export function handleSignerFeeDivisorUpdated(event: SignerFeeDivisorUpdated): void {
  // TODO:
}

export function handleCollateralizationThresholdsUpdateStarted(event: CollateralizationThresholdsUpdateStarted): void {
  // TODO:
}

export function handleCollateralizationThresholdsUpdated(event: CollateralizationThresholdsUpdated): void {
  // TODO:
}

export function handleEthBtcPriceFeedAdditionStarted(event: EthBtcPriceFeedAdditionStarted): void {
  // TODO:
}

export function handleEthBtcPriceFeedAdded(event: EthBtcPriceFeedAdded): void {
  // TODO:
}

export function handleKeepFactoriesUpdateStarted(event: KeepFactoriesUpdateStarted): void {
  let gov = getGovernance();
  gov.pendingFactorySelector = event.params._factorySelector;
  gov.pendingFullyBakedFactory = event.params._fullyBackedFactory;
  gov.pendingKeepStakedFactory = event.params._keepStakedFactory;
  gov.pendingLotSizeChange = makePendingGovernanceChange("KEEP_FACTORIES", event);
  gov.save()

  let log = makeLogEntry(event, "KEEP_FACTORIES", true);
  log.newFactorySelector = event.params._factorySelector;
  log.newFullyBakedFactory = event.params._fullyBackedFactory;
  log.newKeepStakedFactory = event.params._keepStakedFactory;
  log.save()
}

export function handleKeepFactoriesUpdated(event: KeepFactoriesUpdated): void {
  let gov = getGovernance();
  gov.factorySelector = event.params._factorySelector;
  gov.fullyBakedFactory = event.params._fullyBackedFactory;
  gov.keepStakedFactory = event.params._keepStakedFactory;
  gov.pendingFactorySelector = null;
  gov.pendingFullyBakedFactory = null;
  gov.pendingKeepStakedFactory = null;
  gov.pendingLotSizeChange = null;
  gov.save()

  let log = makeLogEntry(event, "KEEP_FACTORIES", false);
  log.newFactorySelector = event.params._factorySelector;
  log.newFullyBakedFactory = event.params._fullyBackedFactory;
  log.newKeepStakedFactory = event.params._keepStakedFactory;
  log.save()
}

export function handleAllowNewDepositsUpdated(event: AllowNewDepositsUpdated): void {
  let gov = getGovernance();
  gov.newDepositsAllowed = event.params._allowNewDeposits
  gov.save()
}