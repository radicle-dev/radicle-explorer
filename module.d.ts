declare const buildTimeConfig: {
  nodes: {
    requiredApiVersion: string;
    fallbackPublicExplorer: string;
    defaultHttpdPort: number;
    defaultLocalHttpdPort: number;
    defaultHttpdScheme: string;
  };
  source: {
    commitsPerPage: number;
  };
  deploymentId: string | null;
  reactions: string[];
  supportWebsite: string;
  preferredSeeds: BaseUrl[];
};
