export interface Operator {
  address: string;
  owner: string;
  stakedAmount: string;
}

export type NoAmountOperator = Omit<Operator, "stakedAmount">;
