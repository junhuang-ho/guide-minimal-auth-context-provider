// import { useState } from "react";
// import {
//   useContractRead,
//   usePrepareContractWrite,
//   useContractWrite,
//   useAccount,
//   type Address,
// } from "wagmi";
// import { useWaitForAATransaction } from "@zerodevapp/wagmi";

// import { MUMBAI_DEPLOYER_ADDRESS } from "~/constants/common";

// const useDeployAccount = ({
//   onDeployed,
// }: {
//   onDeployed: () => Promise<void>;
// }) => {
//   const { address: addressWallet } = useAccount();

//   const addressApp = MUMBAI_DEPLOYER_ADDRESS; //
//   const isContractInteractionAllowed = addressWallet !== undefined;

//   const { data: isDeployed_ } = useContractRead({
//     address: addressApp,
//     abi: ["function isDeployed(address _user) public view returns (bool)"],
//     functionName: "isDeployed",
//     args: [addressWallet],
//     enabled: isContractInteractionAllowed,
//     watch: isContractInteractionAllowed, // && !isIdle,
//     select: (data) => {
//       if (!data) return;
//       return data as boolean;
//     },
//   });
//   const isDeployed = isDeployed_ !== undefined ? isDeployed_ : false;

//   const [isWriting, setIsWriting] = useState<boolean>(false);
//   const { config } = usePrepareContractWrite({
//     address: addressApp,
//     abi: ["function deploy() external"],
//     functionName: "deploy",
//     enabled: isContractInteractionAllowed,
//   });
//   const {
//     data,
//     isLoading: isLoading_,
//     writeAsync: deployAccount,
//   } = useContractWrite({
//     ...config,
//     onSuccess: () => {
//       setIsWriting(true);
//       console.warn("Deploying Account");
//     },
//   });
//   useWaitForAATransaction({
//     wait: data?.wait,
//     // eslint-disable-next-line
//     onSuccess: async (receipt) => {
//       console.warn("Account Deployment Complete");
//       await onDeployed?.();
//       setIsWriting(false);
//     },
//   });
//   const isPreparing = isDeployed_ === undefined || deployAccount === undefined;
//   const isProcessing = isLoading_ || isWriting;

//   return { isDeployed, isProcessing, isPreparing, deployAccount };
// };

// export default useDeployAccount;
