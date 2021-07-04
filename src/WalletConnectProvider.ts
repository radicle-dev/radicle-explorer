import EventEmitter from "eventemitter3";
import { JsonRpcProvider } from "@json-rpc-tools/provider";
import type {
  IConnector,
  IRpcConfig,
  IWCEthRpcConnectionOptions,
} from "@walletconnect/types";
import { getRpcUrl, signingMethods } from "@walletconnect/utils";
import { SignerConnection } from "@walletconnect/signer-connection";
import type {
  IEthereumProvider,
  ProviderAccounts,
  RequestArguments,
} from "eip1193-provider";

class WalletConnectEthereumProvider implements IEthereumProvider {
  public events: any = new EventEmitter();

  private rpc: IRpcConfig;
  private signer: JsonRpcProvider;
  private http: JsonRpcProvider | undefined;

  constructor(opts?: IWCEthRpcConnectionOptions) {
    this.rpc = { infuraId: opts?.infuraId, custom: opts?.rpc };
    this.signer = new JsonRpcProvider(new SignerConnection(opts));
    this.http = this.setHttpProvider(opts?.chainId || 1);
    this.registerEventListeners();
  }

  get connector(): IConnector {
    return (this.signer.connection as any).connector as IConnector;
  }

  public async request<T = unknown>(args: RequestArguments): Promise<T> {
    switch (args.method) {
      case "eth_requestAccounts":
        await this.connect();
        return (this.signer.connection as any).accounts;
      case "eth_accounts":
        return (this.signer.connection as any).accounts;
      case "eth_chainId":
        return (this.signer.connection as any).chainId;
      default:
        break;
    }
    if (signingMethods.includes(args.method)) {
      return this.signer.request(args);
    }
    if (typeof this.http === "undefined") {
      throw new Error(
        `Cannot request JSON-RPC method (${args.method}) without provided rpc url`
      );
    }
    return this.http.request(args);
  }

  public async enable(): Promise<ProviderAccounts> {
    const accounts = await this.request({ method: "eth_requestAccounts" });
    return accounts as ProviderAccounts;
  }

  public async connect(): Promise<void> {
    if (!this.signer.connection.connected) {
      await this.signer.connect();
    }
  }

  public async disconnect(): Promise<void> {
    if (this.signer.connection.connected) {
      await this.signer.disconnect();
    }
  }

  public on(event: any, listener: any): void {
    this.events.on(event, listener);
  }
  public once(event: string, listener: any): void {
    this.events.once(event, listener);
  }
  public removeListener(event: string, listener: any): void {
    this.events.removeListener(event, listener);
  }
  public off(event: string, listener: any): void {
    this.events.off(event, listener);
  }

  get isWalletConnect() {
    return true;
  }

  // ---------- Private ----------------------------------------------- //

  private registerEventListeners() {
    this.signer.connection.on("accountsChanged", (accounts: any) => {
      this.events.emit("accountsChanged", accounts);
    });
    this.signer.connection.on("chainChanged", (chainId: any) => {
      this.http = this.setHttpProvider(chainId);
      this.events.emit("chainChanged", chainId);
    });
  }

  private setHttpProvider(chainId: number): JsonRpcProvider | undefined {
    const rpcUrl = getRpcUrl(chainId, this.rpc);
    if (typeof rpcUrl === "undefined") return undefined;
    const http = new JsonRpcProvider(rpcUrl);
    return http;
  }
}

export default WalletConnectEthereumProvider;
