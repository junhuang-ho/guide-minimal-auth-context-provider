import { type Address } from "wagmi";
import { TRUNCATE_REGEX } from "~/constants/common";

export const truncateEthAddress = (address: Address) => {
  const match = address.match(TRUNCATE_REGEX);
  if (!match) return address;
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${match[1]}…${match[2]}`;
};
