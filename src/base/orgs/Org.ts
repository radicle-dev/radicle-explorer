import * as ethers from "ethers";
import type { TransactionResponse } from "@ethersproject/providers";
import { OperationType } from "@gnosis.pm/safe-core-sdk-types";

import { assert } from "@app/error";
import * as utils from "@app/utils";
import * as cache from "@app/cache";
import type { Safe } from "@app/utils";
import type { Config } from "@app/config";

export class Org {
  address: string;
  owner: string;
  name?: string | null;
  safe?: Safe | null;

  constructor(
    address: string,
    owner: string,
    name?: string | null,
    safe?: Safe | null,
  ) {
    assert(ethers.utils.isAddress(address), "address must be valid");

    this.address = address.toLowerCase(); // Don't store address checksum.
    this.owner = owner;
    this.name = name;
    this.safe = safe;
  }

  async setName(name: string, config: Config): Promise<TransactionResponse> {
    assert(config.signer);

    const org = new ethers.Contract(
      this.address,
      config.abi.org,
      config.signer,
    );
    return org.setName(name, config.provider.network.ensAddress, {
      gasLimit: 200_000,
    });
  }

  async setNameMultisig(name: string, config: Config): Promise<void> {
    assert(config.signer);
    assert(config.safe.client);

    const safeAddress = ethers.utils.getAddress(this.owner);
    const orgAddress = ethers.utils.getAddress(this.address);
    const org = new ethers.Contract(
      this.address,
      config.abi.org,
      config.signer,
    );
    const unsignedTx = await org.populateTransaction.setName(
      name,
      config.provider.network.ensAddress,
    );

    const txData = unsignedTx.data;
    if (!txData) {
      throw new Error(
        "Org::setNameMultisig: Could not generate transaction for `setName` call",
      );
    }

    const safeTx = {
      to: orgAddress,
      value: ethers.constants.Zero.toString(),
      data: txData,
      operation: OperationType.Call,
    };
    await utils.proposeSafeTransaction(safeTx, safeAddress, config);
  }

  async setOwner(
    address: string,
    config: Config,
  ): Promise<TransactionResponse> {
    assert(config.signer);

    const org = new ethers.Contract(
      this.address,
      config.abi.org,
      config.signer,
    );
    return org.setOwner(address);
  }

  async setOwnerMultisig(owner: string, config: Config): Promise<void> {
    assert(config.signer);
    assert(config.safe.client);

    const safeAddress = ethers.utils.getAddress(this.owner);
    const orgAddress = ethers.utils.getAddress(this.address);
    const org = new ethers.Contract(
      this.address,
      config.abi.org,
      config.signer,
    );
    const unsignedTx = await org.populateTransaction.setOwner(owner);

    const txData = unsignedTx.data;
    if (!txData) {
      throw new Error(
        "Org::setOwnerMultisig: Could not generate transaction for `setOwner` call",
      );
    }

    const safeTx = {
      to: orgAddress,
      value: ethers.constants.Zero.toString(),
      data: txData,
      operation: OperationType.Call,
    };
    await utils.proposeSafeTransaction(safeTx, safeAddress, config);
  }

  static async get(addressOrName: string, config: Config): Promise<Org | null> {
    const org = await getOrgContract(addressOrName, config);

    try {
      const [owner, resolved] = await resolveOrgOwner(org);

      // If what is resolved is not the same as the input, it's because we
      // were given a name.
      if (utils.isAddressEqual(addressOrName, resolved)) {
        return new Org(resolved, owner, null, null);
      } else {
        return new Org(resolved, owner, addressOrName, null);
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }
}

export const getOrgContract = cache.cached(
  async (addressOrName: string, config: Config) => {
    return new ethers.Contract(addressOrName, config.abi.org, config.provider);
  },
  addressOrName => addressOrName,
);

export const resolveOrgOwner = cache.cached(
  async (org: ethers.Contract) => {
    return await Promise.all([org.owner(), org.resolvedAddress]);
  },
  org => org.address,
);
