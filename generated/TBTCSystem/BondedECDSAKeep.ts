// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.

import {
  ethereum,
  JSONValue,
  TypedMap,
  Entity,
  Bytes,
  Address,
  BigInt
} from "@graphprotocol/graph-ts";

export class ConflictingPublicKeySubmitted extends ethereum.Event {
  get params(): ConflictingPublicKeySubmitted__Params {
    return new ConflictingPublicKeySubmitted__Params(this);
  }
}

export class ConflictingPublicKeySubmitted__Params {
  _event: ConflictingPublicKeySubmitted;

  constructor(event: ConflictingPublicKeySubmitted) {
    this._event = event;
  }

  get submittingMember(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get conflictingPublicKey(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }
}

export class ERC20RewardDistributed extends ethereum.Event {
  get params(): ERC20RewardDistributed__Params {
    return new ERC20RewardDistributed__Params(this);
  }
}

export class ERC20RewardDistributed__Params {
  _event: ERC20RewardDistributed;

  constructor(event: ERC20RewardDistributed) {
    this._event = event;
  }
}

export class ETHRewardDistributed extends ethereum.Event {
  get params(): ETHRewardDistributed__Params {
    return new ETHRewardDistributed__Params(this);
  }
}

export class ETHRewardDistributed__Params {
  _event: ETHRewardDistributed;

  constructor(event: ETHRewardDistributed) {
    this._event = event;
  }
}

export class KeepClosed extends ethereum.Event {
  get params(): KeepClosed__Params {
    return new KeepClosed__Params(this);
  }
}

export class KeepClosed__Params {
  _event: KeepClosed;

  constructor(event: KeepClosed) {
    this._event = event;
  }
}

export class KeepTerminated extends ethereum.Event {
  get params(): KeepTerminated__Params {
    return new KeepTerminated__Params(this);
  }
}

export class KeepTerminated__Params {
  _event: KeepTerminated;

  constructor(event: KeepTerminated) {
    this._event = event;
  }
}

export class PublicKeyPublished extends ethereum.Event {
  get params(): PublicKeyPublished__Params {
    return new PublicKeyPublished__Params(this);
  }
}

export class PublicKeyPublished__Params {
  _event: PublicKeyPublished;

  constructor(event: PublicKeyPublished) {
    this._event = event;
  }

  get publicKey(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }
}

export class SignatureRequested extends ethereum.Event {
  get params(): SignatureRequested__Params {
    return new SignatureRequested__Params(this);
  }
}

export class SignatureRequested__Params {
  _event: SignatureRequested;

  constructor(event: SignatureRequested) {
    this._event = event;
  }

  get digest(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }
}

export class SignatureSubmitted extends ethereum.Event {
  get params(): SignatureSubmitted__Params {
    return new SignatureSubmitted__Params(this);
  }
}

export class SignatureSubmitted__Params {
  _event: SignatureSubmitted;

  constructor(event: SignatureSubmitted) {
    this._event = event;
  }

  get digest(): Bytes {
    return this._event.parameters[0].value.toBytes();
  }

  get r(): Bytes {
    return this._event.parameters[1].value.toBytes();
  }

  get s(): Bytes {
    return this._event.parameters[2].value.toBytes();
  }

  get recoveryID(): i32 {
    return this._event.parameters[3].value.toI32();
  }
}

export class SlashingFailed extends ethereum.Event {
  get params(): SlashingFailed__Params {
    return new SlashingFailed__Params(this);
  }
}

export class SlashingFailed__Params {
  _event: SlashingFailed;

  constructor(event: SlashingFailed) {
    this._event = event;
  }
}

export class BondedECDSAKeep extends ethereum.SmartContract {
  static bind(address: Address): BondedECDSAKeep {
    return new BondedECDSAKeep("BondedECDSAKeep", address);
  }

  checkBondAmount(): BigInt {
    let result = super.call(
      "checkBondAmount",
      "checkBondAmount():(uint256)",
      []
    );

    return result[0].toBigInt();
  }

  try_checkBondAmount(): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "checkBondAmount",
      "checkBondAmount():(uint256)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  checkSignatureFraud(
    _v: i32,
    _r: Bytes,
    _s: Bytes,
    _signedDigest: Bytes,
    _preimage: Bytes
  ): boolean {
    let result = super.call(
      "checkSignatureFraud",
      "checkSignatureFraud(uint8,bytes32,bytes32,bytes32,bytes):(bool)",
      [
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(_v)),
        ethereum.Value.fromFixedBytes(_r),
        ethereum.Value.fromFixedBytes(_s),
        ethereum.Value.fromFixedBytes(_signedDigest),
        ethereum.Value.fromBytes(_preimage)
      ]
    );

    return result[0].toBoolean();
  }

  try_checkSignatureFraud(
    _v: i32,
    _r: Bytes,
    _s: Bytes,
    _signedDigest: Bytes,
    _preimage: Bytes
  ): ethereum.CallResult<boolean> {
    let result = super.tryCall(
      "checkSignatureFraud",
      "checkSignatureFraud(uint8,bytes32,bytes32,bytes32,bytes):(bool)",
      [
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(_v)),
        ethereum.Value.fromFixedBytes(_r),
        ethereum.Value.fromFixedBytes(_s),
        ethereum.Value.fromFixedBytes(_signedDigest),
        ethereum.Value.fromBytes(_preimage)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBoolean());
  }

  digest(): Bytes {
    let result = super.call("digest", "digest():(bytes32)", []);

    return result[0].toBytes();
  }

  try_digest(): ethereum.CallResult<Bytes> {
    let result = super.tryCall("digest", "digest():(bytes32)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBytes());
  }

  digests(param0: Bytes): BigInt {
    let result = super.call("digests", "digests(bytes32):(uint256)", [
      ethereum.Value.fromFixedBytes(param0)
    ]);

    return result[0].toBigInt();
  }

  try_digests(param0: Bytes): ethereum.CallResult<BigInt> {
    let result = super.tryCall("digests", "digests(bytes32):(uint256)", [
      ethereum.Value.fromFixedBytes(param0)
    ]);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  getMemberETHBalance(_member: Address): BigInt {
    let result = super.call(
      "getMemberETHBalance",
      "getMemberETHBalance(address):(uint256)",
      [ethereum.Value.fromAddress(_member)]
    );

    return result[0].toBigInt();
  }

  try_getMemberETHBalance(_member: Address): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "getMemberETHBalance",
      "getMemberETHBalance(address):(uint256)",
      [ethereum.Value.fromAddress(_member)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  getMembers(): Array<Address> {
    let result = super.call("getMembers", "getMembers():(address[])", []);

    return result[0].toAddressArray();
  }

  try_getMembers(): ethereum.CallResult<Array<Address>> {
    let result = super.tryCall("getMembers", "getMembers():(address[])", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddressArray());
  }

  getOpenedTimestamp(): BigInt {
    let result = super.call(
      "getOpenedTimestamp",
      "getOpenedTimestamp():(uint256)",
      []
    );

    return result[0].toBigInt();
  }

  try_getOpenedTimestamp(): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "getOpenedTimestamp",
      "getOpenedTimestamp():(uint256)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  getOwner(): Address {
    let result = super.call("getOwner", "getOwner():(address)", []);

    return result[0].toAddress();
  }

  try_getOwner(): ethereum.CallResult<Address> {
    let result = super.tryCall("getOwner", "getOwner():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  getPublicKey(): Bytes {
    let result = super.call("getPublicKey", "getPublicKey():(bytes)", []);

    return result[0].toBytes();
  }

  try_getPublicKey(): ethereum.CallResult<Bytes> {
    let result = super.tryCall("getPublicKey", "getPublicKey():(bytes)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBytes());
  }

  hasKeyGenerationTimedOut(): boolean {
    let result = super.call(
      "hasKeyGenerationTimedOut",
      "hasKeyGenerationTimedOut():(bool)",
      []
    );

    return result[0].toBoolean();
  }

  try_hasKeyGenerationTimedOut(): ethereum.CallResult<boolean> {
    let result = super.tryCall(
      "hasKeyGenerationTimedOut",
      "hasKeyGenerationTimedOut():(bool)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBoolean());
  }

  hasSigningTimedOut(): boolean {
    let result = super.call(
      "hasSigningTimedOut",
      "hasSigningTimedOut():(bool)",
      []
    );

    return result[0].toBoolean();
  }

  try_hasSigningTimedOut(): ethereum.CallResult<boolean> {
    let result = super.tryCall(
      "hasSigningTimedOut",
      "hasSigningTimedOut():(bool)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBoolean());
  }

  honestThreshold(): BigInt {
    let result = super.call(
      "honestThreshold",
      "honestThreshold():(uint256)",
      []
    );

    return result[0].toBigInt();
  }

  try_honestThreshold(): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "honestThreshold",
      "honestThreshold():(uint256)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  isActive(): boolean {
    let result = super.call("isActive", "isActive():(bool)", []);

    return result[0].toBoolean();
  }

  try_isActive(): ethereum.CallResult<boolean> {
    let result = super.tryCall("isActive", "isActive():(bool)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBoolean());
  }

  isAwaitingSignature(_digest: Bytes): boolean {
    let result = super.call(
      "isAwaitingSignature",
      "isAwaitingSignature(bytes32):(bool)",
      [ethereum.Value.fromFixedBytes(_digest)]
    );

    return result[0].toBoolean();
  }

  try_isAwaitingSignature(_digest: Bytes): ethereum.CallResult<boolean> {
    let result = super.tryCall(
      "isAwaitingSignature",
      "isAwaitingSignature(bytes32):(bool)",
      [ethereum.Value.fromFixedBytes(_digest)]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBoolean());
  }

  isClosed(): boolean {
    let result = super.call("isClosed", "isClosed():(bool)", []);

    return result[0].toBoolean();
  }

  try_isClosed(): ethereum.CallResult<boolean> {
    let result = super.tryCall("isClosed", "isClosed():(bool)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBoolean());
  }

  isTerminated(): boolean {
    let result = super.call("isTerminated", "isTerminated():(bool)", []);

    return result[0].toBoolean();
  }

  try_isTerminated(): ethereum.CallResult<boolean> {
    let result = super.tryCall("isTerminated", "isTerminated():(bool)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBoolean());
  }

  keyGenerationTimeout(): BigInt {
    let result = super.call(
      "keyGenerationTimeout",
      "keyGenerationTimeout():(uint256)",
      []
    );

    return result[0].toBigInt();
  }

  try_keyGenerationTimeout(): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "keyGenerationTimeout",
      "keyGenerationTimeout():(uint256)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  memberStake(): BigInt {
    let result = super.call("memberStake", "memberStake():(uint256)", []);

    return result[0].toBigInt();
  }

  try_memberStake(): ethereum.CallResult<BigInt> {
    let result = super.tryCall("memberStake", "memberStake():(uint256)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  signingTimeout(): BigInt {
    let result = super.call("signingTimeout", "signingTimeout():(uint256)", []);

    return result[0].toBigInt();
  }

  try_signingTimeout(): ethereum.CallResult<BigInt> {
    let result = super.tryCall(
      "signingTimeout",
      "signingTimeout():(uint256)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  submitSignatureFraud(
    _v: i32,
    _r: Bytes,
    _s: Bytes,
    _signedDigest: Bytes,
    _preimage: Bytes
  ): boolean {
    let result = super.call(
      "submitSignatureFraud",
      "submitSignatureFraud(uint8,bytes32,bytes32,bytes32,bytes):(bool)",
      [
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(_v)),
        ethereum.Value.fromFixedBytes(_r),
        ethereum.Value.fromFixedBytes(_s),
        ethereum.Value.fromFixedBytes(_signedDigest),
        ethereum.Value.fromBytes(_preimage)
      ]
    );

    return result[0].toBoolean();
  }

  try_submitSignatureFraud(
    _v: i32,
    _r: Bytes,
    _s: Bytes,
    _signedDigest: Bytes,
    _preimage: Bytes
  ): ethereum.CallResult<boolean> {
    let result = super.tryCall(
      "submitSignatureFraud",
      "submitSignatureFraud(uint8,bytes32,bytes32,bytes32,bytes):(bool)",
      [
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(_v)),
        ethereum.Value.fromFixedBytes(_r),
        ethereum.Value.fromFixedBytes(_s),
        ethereum.Value.fromFixedBytes(_signedDigest),
        ethereum.Value.fromBytes(_preimage)
      ]
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBoolean());
  }
}

export class CloseKeepCall extends ethereum.Call {
  get inputs(): CloseKeepCall__Inputs {
    return new CloseKeepCall__Inputs(this);
  }

  get outputs(): CloseKeepCall__Outputs {
    return new CloseKeepCall__Outputs(this);
  }
}

export class CloseKeepCall__Inputs {
  _call: CloseKeepCall;

  constructor(call: CloseKeepCall) {
    this._call = call;
  }
}

export class CloseKeepCall__Outputs {
  _call: CloseKeepCall;

  constructor(call: CloseKeepCall) {
    this._call = call;
  }
}

export class DistributeERC20RewardCall extends ethereum.Call {
  get inputs(): DistributeERC20RewardCall__Inputs {
    return new DistributeERC20RewardCall__Inputs(this);
  }

  get outputs(): DistributeERC20RewardCall__Outputs {
    return new DistributeERC20RewardCall__Outputs(this);
  }
}

export class DistributeERC20RewardCall__Inputs {
  _call: DistributeERC20RewardCall;

  constructor(call: DistributeERC20RewardCall) {
    this._call = call;
  }

  get _tokenAddress(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _value(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }
}

export class DistributeERC20RewardCall__Outputs {
  _call: DistributeERC20RewardCall;

  constructor(call: DistributeERC20RewardCall) {
    this._call = call;
  }
}

export class DistributeETHRewardCall extends ethereum.Call {
  get inputs(): DistributeETHRewardCall__Inputs {
    return new DistributeETHRewardCall__Inputs(this);
  }

  get outputs(): DistributeETHRewardCall__Outputs {
    return new DistributeETHRewardCall__Outputs(this);
  }
}

export class DistributeETHRewardCall__Inputs {
  _call: DistributeETHRewardCall;

  constructor(call: DistributeETHRewardCall) {
    this._call = call;
  }
}

export class DistributeETHRewardCall__Outputs {
  _call: DistributeETHRewardCall;

  constructor(call: DistributeETHRewardCall) {
    this._call = call;
  }
}

export class InitializeCall extends ethereum.Call {
  get inputs(): InitializeCall__Inputs {
    return new InitializeCall__Inputs(this);
  }

  get outputs(): InitializeCall__Outputs {
    return new InitializeCall__Outputs(this);
  }
}

export class InitializeCall__Inputs {
  _call: InitializeCall;

  constructor(call: InitializeCall) {
    this._call = call;
  }

  get _owner(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _members(): Array<Address> {
    return this._call.inputValues[1].value.toAddressArray();
  }

  get _honestThreshold(): BigInt {
    return this._call.inputValues[2].value.toBigInt();
  }

  get _memberStake(): BigInt {
    return this._call.inputValues[3].value.toBigInt();
  }

  get _stakeLockDuration(): BigInt {
    return this._call.inputValues[4].value.toBigInt();
  }

  get _tokenStaking(): Address {
    return this._call.inputValues[5].value.toAddress();
  }

  get _keepBonding(): Address {
    return this._call.inputValues[6].value.toAddress();
  }

  get _keepFactory(): Address {
    return this._call.inputValues[7].value.toAddress();
  }
}

export class InitializeCall__Outputs {
  _call: InitializeCall;

  constructor(call: InitializeCall) {
    this._call = call;
  }
}

export class ReturnPartialSignerBondsCall extends ethereum.Call {
  get inputs(): ReturnPartialSignerBondsCall__Inputs {
    return new ReturnPartialSignerBondsCall__Inputs(this);
  }

  get outputs(): ReturnPartialSignerBondsCall__Outputs {
    return new ReturnPartialSignerBondsCall__Outputs(this);
  }
}

export class ReturnPartialSignerBondsCall__Inputs {
  _call: ReturnPartialSignerBondsCall;

  constructor(call: ReturnPartialSignerBondsCall) {
    this._call = call;
  }
}

export class ReturnPartialSignerBondsCall__Outputs {
  _call: ReturnPartialSignerBondsCall;

  constructor(call: ReturnPartialSignerBondsCall) {
    this._call = call;
  }
}

export class SeizeSignerBondsCall extends ethereum.Call {
  get inputs(): SeizeSignerBondsCall__Inputs {
    return new SeizeSignerBondsCall__Inputs(this);
  }

  get outputs(): SeizeSignerBondsCall__Outputs {
    return new SeizeSignerBondsCall__Outputs(this);
  }
}

export class SeizeSignerBondsCall__Inputs {
  _call: SeizeSignerBondsCall;

  constructor(call: SeizeSignerBondsCall) {
    this._call = call;
  }
}

export class SeizeSignerBondsCall__Outputs {
  _call: SeizeSignerBondsCall;

  constructor(call: SeizeSignerBondsCall) {
    this._call = call;
  }
}

export class SignCall extends ethereum.Call {
  get inputs(): SignCall__Inputs {
    return new SignCall__Inputs(this);
  }

  get outputs(): SignCall__Outputs {
    return new SignCall__Outputs(this);
  }
}

export class SignCall__Inputs {
  _call: SignCall;

  constructor(call: SignCall) {
    this._call = call;
  }

  get _digest(): Bytes {
    return this._call.inputValues[0].value.toBytes();
  }
}

export class SignCall__Outputs {
  _call: SignCall;

  constructor(call: SignCall) {
    this._call = call;
  }
}

export class SubmitPublicKeyCall extends ethereum.Call {
  get inputs(): SubmitPublicKeyCall__Inputs {
    return new SubmitPublicKeyCall__Inputs(this);
  }

  get outputs(): SubmitPublicKeyCall__Outputs {
    return new SubmitPublicKeyCall__Outputs(this);
  }
}

export class SubmitPublicKeyCall__Inputs {
  _call: SubmitPublicKeyCall;

  constructor(call: SubmitPublicKeyCall) {
    this._call = call;
  }

  get _publicKey(): Bytes {
    return this._call.inputValues[0].value.toBytes();
  }
}

export class SubmitPublicKeyCall__Outputs {
  _call: SubmitPublicKeyCall;

  constructor(call: SubmitPublicKeyCall) {
    this._call = call;
  }
}

export class SubmitSignatureCall extends ethereum.Call {
  get inputs(): SubmitSignatureCall__Inputs {
    return new SubmitSignatureCall__Inputs(this);
  }

  get outputs(): SubmitSignatureCall__Outputs {
    return new SubmitSignatureCall__Outputs(this);
  }
}

export class SubmitSignatureCall__Inputs {
  _call: SubmitSignatureCall;

  constructor(call: SubmitSignatureCall) {
    this._call = call;
  }

  get _r(): Bytes {
    return this._call.inputValues[0].value.toBytes();
  }

  get _s(): Bytes {
    return this._call.inputValues[1].value.toBytes();
  }

  get _recoveryID(): i32 {
    return this._call.inputValues[2].value.toI32();
  }
}

export class SubmitSignatureCall__Outputs {
  _call: SubmitSignatureCall;

  constructor(call: SubmitSignatureCall) {
    this._call = call;
  }
}

export class SubmitSignatureFraudCall extends ethereum.Call {
  get inputs(): SubmitSignatureFraudCall__Inputs {
    return new SubmitSignatureFraudCall__Inputs(this);
  }

  get outputs(): SubmitSignatureFraudCall__Outputs {
    return new SubmitSignatureFraudCall__Outputs(this);
  }
}

export class SubmitSignatureFraudCall__Inputs {
  _call: SubmitSignatureFraudCall;

  constructor(call: SubmitSignatureFraudCall) {
    this._call = call;
  }

  get _v(): i32 {
    return this._call.inputValues[0].value.toI32();
  }

  get _r(): Bytes {
    return this._call.inputValues[1].value.toBytes();
  }

  get _s(): Bytes {
    return this._call.inputValues[2].value.toBytes();
  }

  get _signedDigest(): Bytes {
    return this._call.inputValues[3].value.toBytes();
  }

  get _preimage(): Bytes {
    return this._call.inputValues[4].value.toBytes();
  }
}

export class SubmitSignatureFraudCall__Outputs {
  _call: SubmitSignatureFraudCall;

  constructor(call: SubmitSignatureFraudCall) {
    this._call = call;
  }

  get _isFraud(): boolean {
    return this._call.outputValues[0].value.toBoolean();
  }
}

export class WithdrawCall extends ethereum.Call {
  get inputs(): WithdrawCall__Inputs {
    return new WithdrawCall__Inputs(this);
  }

  get outputs(): WithdrawCall__Outputs {
    return new WithdrawCall__Outputs(this);
  }
}

export class WithdrawCall__Inputs {
  _call: WithdrawCall;

  constructor(call: WithdrawCall) {
    this._call = call;
  }

  get _member(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class WithdrawCall__Outputs {
  _call: WithdrawCall;

  constructor(call: WithdrawCall) {
    this._call = call;
  }
}
