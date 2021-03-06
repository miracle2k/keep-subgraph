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

export class GranteeReassignmentCancelled extends ethereum.Event {
  get params(): GranteeReassignmentCancelled__Params {
    return new GranteeReassignmentCancelled__Params(this);
  }
}

export class GranteeReassignmentCancelled__Params {
  _event: GranteeReassignmentCancelled;

  constructor(event: GranteeReassignmentCancelled) {
    this._event = event;
  }

  get cancelledRequestedGrantee(): Address {
    return this._event.parameters[0].value.toAddress();
  }
}

export class GranteeReassignmentChanged extends ethereum.Event {
  get params(): GranteeReassignmentChanged__Params {
    return new GranteeReassignmentChanged__Params(this);
  }
}

export class GranteeReassignmentChanged__Params {
  _event: GranteeReassignmentChanged;

  constructor(event: GranteeReassignmentChanged) {
    this._event = event;
  }

  get previouslyRequestedGrantee(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get newRequestedGrantee(): Address {
    return this._event.parameters[1].value.toAddress();
  }
}

export class GranteeReassignmentConfirmed extends ethereum.Event {
  get params(): GranteeReassignmentConfirmed__Params {
    return new GranteeReassignmentConfirmed__Params(this);
  }
}

export class GranteeReassignmentConfirmed__Params {
  _event: GranteeReassignmentConfirmed;

  constructor(event: GranteeReassignmentConfirmed) {
    this._event = event;
  }

  get oldGrantee(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get newGrantee(): Address {
    return this._event.parameters[1].value.toAddress();
  }
}

export class GranteeReassignmentRequested extends ethereum.Event {
  get params(): GranteeReassignmentRequested__Params {
    return new GranteeReassignmentRequested__Params(this);
  }
}

export class GranteeReassignmentRequested__Params {
  _event: GranteeReassignmentRequested;

  constructor(event: GranteeReassignmentRequested) {
    this._event = event;
  }

  get newGrantee(): Address {
    return this._event.parameters[0].value.toAddress();
  }
}

export class TokensWithdrawn extends ethereum.Event {
  get params(): TokensWithdrawn__Params {
    return new TokensWithdrawn__Params(this);
  }
}

export class TokensWithdrawn__Params {
  _event: TokensWithdrawn;

  constructor(event: TokensWithdrawn) {
    this._event = event;
  }

  get destination(): Address {
    return this._event.parameters[0].value.toAddress();
  }

  get amount(): BigInt {
    return this._event.parameters[1].value.toBigInt();
  }
}

export class ManagedGrant extends ethereum.SmartContract {
  static bind(address: Address): ManagedGrant {
    return new ManagedGrant("ManagedGrant", address);
  }

  grantId(): BigInt {
    let result = super.call("grantId", "grantId():(uint256)", []);

    return result[0].toBigInt();
  }

  try_grantId(): ethereum.CallResult<BigInt> {
    let result = super.tryCall("grantId", "grantId():(uint256)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toBigInt());
  }

  grantManager(): Address {
    let result = super.call("grantManager", "grantManager():(address)", []);

    return result[0].toAddress();
  }

  try_grantManager(): ethereum.CallResult<Address> {
    let result = super.tryCall("grantManager", "grantManager():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  grantee(): Address {
    let result = super.call("grantee", "grantee():(address)", []);

    return result[0].toAddress();
  }

  try_grantee(): ethereum.CallResult<Address> {
    let result = super.tryCall("grantee", "grantee():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  requestedNewGrantee(): Address {
    let result = super.call(
      "requestedNewGrantee",
      "requestedNewGrantee():(address)",
      []
    );

    return result[0].toAddress();
  }

  try_requestedNewGrantee(): ethereum.CallResult<Address> {
    let result = super.tryCall(
      "requestedNewGrantee",
      "requestedNewGrantee():(address)",
      []
    );
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  token(): Address {
    let result = super.call("token", "token():(address)", []);

    return result[0].toAddress();
  }

  try_token(): ethereum.CallResult<Address> {
    let result = super.tryCall("token", "token():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }

  tokenGrant(): Address {
    let result = super.call("tokenGrant", "tokenGrant():(address)", []);

    return result[0].toAddress();
  }

  try_tokenGrant(): ethereum.CallResult<Address> {
    let result = super.tryCall("tokenGrant", "tokenGrant():(address)", []);
    if (result.reverted) {
      return new ethereum.CallResult();
    }
    let value = result.value;
    return ethereum.CallResult.fromValue(value[0].toAddress());
  }
}

export class ConstructorCall extends ethereum.Call {
  get inputs(): ConstructorCall__Inputs {
    return new ConstructorCall__Inputs(this);
  }

  get outputs(): ConstructorCall__Outputs {
    return new ConstructorCall__Outputs(this);
  }
}

export class ConstructorCall__Inputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }

  get _tokenAddress(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _tokenGrant(): Address {
    return this._call.inputValues[1].value.toAddress();
  }

  get _grantManager(): Address {
    return this._call.inputValues[2].value.toAddress();
  }

  get _grantId(): BigInt {
    return this._call.inputValues[3].value.toBigInt();
  }

  get _grantee(): Address {
    return this._call.inputValues[4].value.toAddress();
  }
}

export class ConstructorCall__Outputs {
  _call: ConstructorCall;

  constructor(call: ConstructorCall) {
    this._call = call;
  }
}

export class CancelReassignmentRequestCall extends ethereum.Call {
  get inputs(): CancelReassignmentRequestCall__Inputs {
    return new CancelReassignmentRequestCall__Inputs(this);
  }

  get outputs(): CancelReassignmentRequestCall__Outputs {
    return new CancelReassignmentRequestCall__Outputs(this);
  }
}

export class CancelReassignmentRequestCall__Inputs {
  _call: CancelReassignmentRequestCall;

  constructor(call: CancelReassignmentRequestCall) {
    this._call = call;
  }
}

export class CancelReassignmentRequestCall__Outputs {
  _call: CancelReassignmentRequestCall;

  constructor(call: CancelReassignmentRequestCall) {
    this._call = call;
  }
}

export class CancelStakeCall extends ethereum.Call {
  get inputs(): CancelStakeCall__Inputs {
    return new CancelStakeCall__Inputs(this);
  }

  get outputs(): CancelStakeCall__Outputs {
    return new CancelStakeCall__Outputs(this);
  }
}

export class CancelStakeCall__Inputs {
  _call: CancelStakeCall;

  constructor(call: CancelStakeCall) {
    this._call = call;
  }

  get _operator(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class CancelStakeCall__Outputs {
  _call: CancelStakeCall;

  constructor(call: CancelStakeCall) {
    this._call = call;
  }
}

export class ChangeReassignmentRequestCall extends ethereum.Call {
  get inputs(): ChangeReassignmentRequestCall__Inputs {
    return new ChangeReassignmentRequestCall__Inputs(this);
  }

  get outputs(): ChangeReassignmentRequestCall__Outputs {
    return new ChangeReassignmentRequestCall__Outputs(this);
  }
}

export class ChangeReassignmentRequestCall__Inputs {
  _call: ChangeReassignmentRequestCall;

  constructor(call: ChangeReassignmentRequestCall) {
    this._call = call;
  }

  get _newGrantee(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class ChangeReassignmentRequestCall__Outputs {
  _call: ChangeReassignmentRequestCall;

  constructor(call: ChangeReassignmentRequestCall) {
    this._call = call;
  }
}

export class ConfirmGranteeReassignmentCall extends ethereum.Call {
  get inputs(): ConfirmGranteeReassignmentCall__Inputs {
    return new ConfirmGranteeReassignmentCall__Inputs(this);
  }

  get outputs(): ConfirmGranteeReassignmentCall__Outputs {
    return new ConfirmGranteeReassignmentCall__Outputs(this);
  }
}

export class ConfirmGranteeReassignmentCall__Inputs {
  _call: ConfirmGranteeReassignmentCall;

  constructor(call: ConfirmGranteeReassignmentCall) {
    this._call = call;
  }

  get _newGrantee(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class ConfirmGranteeReassignmentCall__Outputs {
  _call: ConfirmGranteeReassignmentCall;

  constructor(call: ConfirmGranteeReassignmentCall) {
    this._call = call;
  }
}

export class RecoverStakeCall extends ethereum.Call {
  get inputs(): RecoverStakeCall__Inputs {
    return new RecoverStakeCall__Inputs(this);
  }

  get outputs(): RecoverStakeCall__Outputs {
    return new RecoverStakeCall__Outputs(this);
  }
}

export class RecoverStakeCall__Inputs {
  _call: RecoverStakeCall;

  constructor(call: RecoverStakeCall) {
    this._call = call;
  }

  get _operator(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class RecoverStakeCall__Outputs {
  _call: RecoverStakeCall;

  constructor(call: RecoverStakeCall) {
    this._call = call;
  }
}

export class RequestGranteeReassignmentCall extends ethereum.Call {
  get inputs(): RequestGranteeReassignmentCall__Inputs {
    return new RequestGranteeReassignmentCall__Inputs(this);
  }

  get outputs(): RequestGranteeReassignmentCall__Outputs {
    return new RequestGranteeReassignmentCall__Outputs(this);
  }
}

export class RequestGranteeReassignmentCall__Inputs {
  _call: RequestGranteeReassignmentCall;

  constructor(call: RequestGranteeReassignmentCall) {
    this._call = call;
  }

  get _newGrantee(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class RequestGranteeReassignmentCall__Outputs {
  _call: RequestGranteeReassignmentCall;

  constructor(call: RequestGranteeReassignmentCall) {
    this._call = call;
  }
}

export class StakeCall extends ethereum.Call {
  get inputs(): StakeCall__Inputs {
    return new StakeCall__Inputs(this);
  }

  get outputs(): StakeCall__Outputs {
    return new StakeCall__Outputs(this);
  }
}

export class StakeCall__Inputs {
  _call: StakeCall;

  constructor(call: StakeCall) {
    this._call = call;
  }

  get _stakingContract(): Address {
    return this._call.inputValues[0].value.toAddress();
  }

  get _amount(): BigInt {
    return this._call.inputValues[1].value.toBigInt();
  }

  get _extraData(): Bytes {
    return this._call.inputValues[2].value.toBytes();
  }
}

export class StakeCall__Outputs {
  _call: StakeCall;

  constructor(call: StakeCall) {
    this._call = call;
  }
}

export class UndelegateCall extends ethereum.Call {
  get inputs(): UndelegateCall__Inputs {
    return new UndelegateCall__Inputs(this);
  }

  get outputs(): UndelegateCall__Outputs {
    return new UndelegateCall__Outputs(this);
  }
}

export class UndelegateCall__Inputs {
  _call: UndelegateCall;

  constructor(call: UndelegateCall) {
    this._call = call;
  }

  get _operator(): Address {
    return this._call.inputValues[0].value.toAddress();
  }
}

export class UndelegateCall__Outputs {
  _call: UndelegateCall;

  constructor(call: UndelegateCall) {
    this._call = call;
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
}

export class WithdrawCall__Outputs {
  _call: WithdrawCall;

  constructor(call: WithdrawCall) {
    this._call = call;
  }
}
