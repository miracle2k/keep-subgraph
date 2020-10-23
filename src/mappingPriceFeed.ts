import {PriceFeed} from "../generated/schema";
import {LogMedianPrice} from "../generated/MedianETHBTC/MedianETHBTC";


export function handleLogMedianPrice(event: LogMedianPrice): void {
  let entity = new PriceFeed('0x81a679f98b63b3ddf2f17cb5619f4d6775b3c5ed')
  entity.val = event.params.val
  entity.age = event.params.age
  entity.timestamp = event.block.timestamp
  entity.blockNumber = event.block.number
  entity.transactionHash = event.transaction.hash
  entity.save()
}
