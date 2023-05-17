import { type AppType } from "next/app";
import { type Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { api } from "~/utils/api";

import "~/styles/globals.css";

import { configureChains, createClient, WagmiConfig } from "wagmi";
import { polygon, polygonMumbai } from "wagmi/chains";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
// import { MetaMaskConnector } from "wagmi/connectors/metaMask";
// import { CoinbaseWalletConnector } from "wagmi/connectors/coinbaseWallet";
import { GoogleSocialWalletConnector } from "@zerodevapp/wagmi";

import { env } from "~/env.mjs";

import Hydration from "~/components/Hydration";
import AuthenticationProvider from "~/contexts/Authentication";

const ZERODEV_PROJECT_ID = env.NEXT_PUBLIC_ZERODEV_PROJECT_ID;

const { chains, provider, webSocketProvider } = configureChains(
  [
    polygonMumbai,
    // ...(addressWallet in env.NEXT_PUBLIC_DEV_ADDRESSES ? [goerli] : []),
  ],
  [
    alchemyProvider({
      apiKey: env.NEXT_PUBLIC_ALCHEMY_API_KEY_CLIENT,
    }),
    publicProvider(),
  ]
);

const googleConnector = new GoogleSocialWalletConnector({
  chains,
  options: {
    projectId: ZERODEV_PROJECT_ID,
  },
});
const wagmiConfig = createClient({
  autoConnect: false,
  connectors: [
    googleConnector,
    // new MetaMaskConnector({ chains }),
    // new CoinbaseWalletConnector({ chains, options: { appName: "test" } }),
  ],
  provider,
  webSocketProvider,
});

const App: AppType<{ session: Session | null }> = ({
  Component,
  pageProps: { session, ...pageProps },
}) => {
  return (
    <Hydration>
      <WagmiConfig client={wagmiConfig}>
        <SessionProvider
          session={session}
          refetchInterval={0} // no session polling
          //   refetchOnWindowFocus={false}
        >
          <AuthenticationProvider>
            <Component {...pageProps} />
          </AuthenticationProvider>
        </SessionProvider>
      </WagmiConfig>
    </Hydration>
  );
};

export default api.withTRPC(App);
