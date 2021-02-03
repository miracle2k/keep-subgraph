import { BigNumber, ethers } from "ethers";

export async function getAllOperators(block: number) {
  const provider = new ethers.providers.JsonRpcProvider(process.env["ETH_RPC"]);

  const TokenStakingAbi = [
    "event StakeDelegated(address indexed owner,address indexed operator)",
    "event StakeOwnershipTransferred(address indexed operator,address indexed newOwner)",
    "function ownerOf(address _operator) public view returns (address)",
  ];
  const TokenStaking = new ethers.Contract(
    "0x1293a54e160D1cd7075487898d65266081A15458",
    TokenStakingAbi,
    provider
  );
  const StakeDelegated = TokenStaking.filters.StakeDelegated();
  const operators = await TokenStaking.queryFilter(StakeDelegated, 0, block);
  const StakeOwnershipTransferred = TokenStaking.filters.StakeOwnershipTransferred();
  const ownerTransferredEvents = await TokenStaking.queryFilter(
    StakeOwnershipTransferred,
    0,
    block
  );

  const TokenGrantAbi = [
    "event TokenGrantStaked(uint256 indexed grantId, uint256 amount, address operator)",
    "function getGrant(uint256 _id) public view returns (uint256 amount,uint256 withdrawn,uint256 staked,uint256 revokedAmount,uint256 revokedAt,address grantee)",
  ];
  const TokenGrant = new ethers.Contract(
    "0x175989c71Fd023D580C65F5dC214002687ff88B7",
    TokenGrantAbi,
    provider
  );
  const tokenGrantsStaked = await TokenGrant.queryFilter(
    TokenGrant.filters.TokenGrantStaked(),
    0,
    block
  );

  const ManagedGrantAbi = [
    "event GranteeReassignmentConfirmed(address oldGrantee,address newGrantee)",
    "function grantee() public view returns (address)",
  ];

  return Promise.all(
    operators.map(async (op) => {
      const address = op.args!.operator as string;
      let [owner] = await TokenStaking.functions.ownerOf(address);
      if (owner !== op.args!.owner) {
        console.log(`owner of ${address} changed`);
      }

      const grantEvents = tokenGrantsStaked.filter(
        (event) => event.args!.operator === address
      );
      if (grantEvents.length > 0) {
        const grantId = grantEvents[0].args!.grantId;
        const { grantee } = await TokenGrant.functions.getGrant(grantId, {
          blockTag: block,
        });
        owner = grantee;
      }

      const ManagedGrant = new ethers.Contract(
        owner,
        ManagedGrantAbi,
        provider
      );
      try {
        const [grantee] = await ManagedGrant.functions.grantee({
          blockTag: block,
        });
        owner = grantee;
      } catch (e) {}

      return {
        owner,
        address,
        stakedAmount: "0",
      };
    })
  );
}
