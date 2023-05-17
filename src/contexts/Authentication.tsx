import { SiweMessage } from "siwe";
import { Address, type Connector } from "wagmi";
import { ZeroDevWeb3Auth } from "@zerodevapp/web3auth";
import {
  readContract,
  writeContract,
  prepareWriteContract,
} from "wagmi/actions";

import {
  useState,
  useEffect,
  useContext,
  createContext,
  type ReactNode,
} from "react";
import { useSession, signIn, signOut, getCsrfToken } from "next-auth/react";
import { useAccount, useSignMessage, useConnect, useDisconnect } from "wagmi";

import { env } from "~/env.mjs";
import { truncateEthAddress } from "~/utils/common";
import { MUMBAI_DEPLOYER_ADDRESS } from "~/constants/common";

type OpenloginUserInfo = {
  aggregateVerifier: string;
  dappShare: string;
  email: string;
  idToken: string;
  name: string;
  oAuthAccessToken: string;
  oAuthIdToken: string;
  profileImage: string;
  typeOfLogin: string;
  verifier: string;
  verifierId: string;
};

export interface IAuthenticationContext {
  isConnected: boolean;
  isConnecting: boolean;
  connectors: Connector<any, any, any>[];
  activeConnector: Connector<any, any, any> | undefined;
  username: string | undefined;
  login: ((connector: Connector) => Promise<void>) | undefined;
  logout: (() => Promise<void>) | undefined;
}

export const AuthenticationContext = createContext<IAuthenticationContext>({
  isConnected: false,
  isConnecting: false,
  connectors: [],
  activeConnector: undefined,
  username: undefined,
  login: undefined,
  logout: undefined,
});

export const useAuthentication = (): IAuthenticationContext => {
  return useContext(AuthenticationContext);
};

const AuthenticationProvider = ({
  children,
}: //   session,
{
  children: ReactNode;
  //   session: Session | null;
}) => {
  const { data, status } = useSession(); // from data, can get id (address) from server side
  const {
    address: addressWallet,
    connector: activeConnector,
    isConnected: isAddressConnected,
    isConnecting: isAddressConnecting,
    isReconnecting: isAddressReconnecting,
  } = useAccount({
    // eslint-disable-next-line
    onDisconnect: async () => {
      // For security reasons we sign out the user when a wallet disconnects.
      await logout();
    },
  });

  const { signMessageAsync } = useSignMessage();

  const authIn = async (address: Address, chainId: number) => {
    try {
      const message = new SiweMessage({
        version: "1",
        address: address,
        chainId: chainId,
        nonce: await getCsrfToken(),
        statement: "Sign In With Ethereum.",
        domain: window.location.host,
        uri: window.location.origin,
      });
      const preparedMessage = message.prepareMessage();
      const signature = await signMessageAsync({
        message: preparedMessage,
      });
      await signIn("credentials", {
        message: JSON.stringify(message),
        redirect: false,
        signature,
        // callbackUrl,
      });
    } catch (error) {
      console.error("Failed to auth in");
      console.error(error);
    }
  };

  const authOut = async () => {
    if (status === "unauthenticated") return;
    try {
      await signOut({ redirect: false }); // callbackUrl: "/"
    } catch (error) {
      console.error("Failed to auth out");
      console.error(error);
    }
  };

  const addressApp = MUMBAI_DEPLOYER_ADDRESS; // TODO: replace

  const [isProcessingLogin, setIsProcessingLogin] = useState<boolean>(false);
  const { connectAsync, connectors } = useConnect({
    onSuccess: async (data) => {
      setIsProcessingLogin(true);

      const isDeployed = await readContract({
        address: addressApp,
        abi: ["function isDeployed(address _user) public view returns (bool)"],
        functionName: "isDeployed",
        args: [data.account],
      });

      if (!isDeployed) {
        try {
          const config = await prepareWriteContract({
            address: addressApp,
            abi: ["function deploy() external"],
            functionName: "deploy",
          });
          const { wait } = await writeContract(config); // TODO: watch out for https://github.com/spruceid/siwe/pull/153
          await wait();
          console.warn("ACCOUNT DEPLOYED");

          await authIn(data.account, data.chain.id);
        } catch (error) {
          console.error(error);
        }
      } else {
        await authIn(data.account, data.chain.id);
      }

      console.log("SIGNIN COMPLETE");
      setIsProcessingLogin(false);
    },
  });
  const { disconnectAsync } = useDisconnect({
    onSuccess: async () => {
      await authOut();
      console.log("SIGNOUT COMPLETE");
    },
  });

  const login = async (connector: Connector) => {
    try {
      await connectAsync({ connector });
    } catch (error) {
      console.error(error);
    }
  };
  const logout = async () => {
    try {
      await disconnectAsync();
    } catch (error) {
      console.error(error);
    }
  };

  const isConnecting =
    isAddressConnecting ||
    isAddressReconnecting ||
    status === "loading" ||
    isProcessingLogin;
  const isConnected = isAddressConnected && status === "authenticated";

  const [userData, setUserData] = useState<OpenloginUserInfo | undefined>(
    undefined
  );
  const username =
    userData?.name ??
    (addressWallet ? truncateEthAddress(addressWallet) : undefined);
  useEffect(() => {
    const getUserInfo = async () => {
      if (!addressWallet) return;

      // eslint-disable-next-line
      const zeroDevWeb3Auth = new ZeroDevWeb3Auth([
        env.NEXT_PUBLIC_ZERODEV_PROJECT_ID,
      ]);
      try {
        // eslint-disable-next-line
        const data = await zeroDevWeb3Auth.getUserInfo();
        setUserData(data as OpenloginUserInfo);
      } catch (error) {
        console.error("Error retrieving OpenLogin");
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    getUserInfo();
  }, [addressWallet]);

  // ENHANCE: when applicable, do logout on account/network change | ref: https://github.com/family/connectkit/blob/main/packages/connectkit/src/siwe/SIWEProvider.tsx#L24

  const contextProvider = {
    isConnected,
    isConnecting,
    connectors,
    activeConnector,
    username,
    login,
    logout,
  };

  return (
    <AuthenticationContext.Provider value={contextProvider}>
      {children}
    </AuthenticationContext.Provider>
  );
};

export default AuthenticationProvider;
// TODO: currently session remains even after page/tab closes/refresh - only way is to make session "expire" from server-side
