{
  description = "Radicle web frontend";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/release-25.11";
    flake-utils.url = "github:numtide/flake-utils";

    crane.url = "github:ipetkov/crane";

    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    crane,
    rust-overlay,
    ...
  }:
    {
      nixosModules.radicle-explorer = {
        config,
        lib,
        pkgs,
        ...
      }: {
        options.services.radicle-explorer.enable = lib.mkEnableOption "Local radicle web interface";
        config = lib.mkIf config.services.radicle-explorer.enable {
          services.nginx = {
            enable = true;
            virtualHosts.localhost = {
              listen = [
                {
                  addr = "127.0.0.1";
                  port = 4433;
                  ssl = false;
                }
              ];
              rejectSSL = true;
              locations = {
                "/" = {
                  index = "index.html";
                  root = self.packages.${pkgs.system}.radicle-explorer;
                  extraConfig = ''
                    try_files $uri $uri/ /index.html;
                  '';
                };
              };
            };
          };
        };
      };
    }
    // (flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;
        overlays = [(import rust-overlay)];
      };
      inherit (pkgs) lib;

      rustToolchain = pkgs.rust-bin.fromRustupToolchainFile ./radicle-httpd/rust-toolchain;
      craneLib = (crane.mkLib pkgs).overrideToolchain rustToolchain;
      basicArgs = {
        pname = "radicle-httpd";
        src = ./radicle-httpd;
        strictDeps = true;
      };
    in {
      formatter = pkgs.alejandra;

      checks = {
        radicle-explorer = self.packages.${system}.radicle-explorer.override {doCheck = true;};
        radicle-httpd = self.packages.${system}.radicle-httpd.overrideAttrs (_: {doCheck = true;});
      };

      packages = {
        default = self.packages.${system}.radicle-explorer;

        twemoji-assets = pkgs.fetchFromGitHub {
          owner = "twitter";
          repo = "twemoji";
          rev = "v14.0.2";
          hash = "sha256-YoOnZ5uVukzi/6bLi22Y8U5TpplPzB7ji42l+/ys5xI=";
        };

        radicle-explorer = pkgs.callPackage ({
          lib,
          buildNpmPackage,
          doCheck ? false,
        }:
          buildNpmPackage rec {
            pname = "radicle-explorer";
            version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
            src = ./.;
            npmDepsHash = "sha256-RC+QQXtvXC48uM0oOAFA0ni5AU/l9m8k1LgrxykSu5M=";
            postPatch = ''
              patchShebangs --build ./scripts
              mkdir -p "public/twemoji"
              cp -t public/twemoji -r -- ${self.packages.${system}.twemoji-assets}/assets/svg/*
              : >scripts/install-twemoji-assets
            '';
            dontConfigure = true;

            inherit doCheck;
            nativeCheckInputs = with pkgs; [
              which
              gitMinimal
            ];
            checkPhase = ''
              runHook preCheck
              bins=$(scripts/install-binaries -s)
              mkdir -p "$bins"
              cp -t "$bins" -- ${pkgs.radicle-node}/bin/* ${self.packages.${system}.radicle-httpd}/bin/*
              scripts/check
              {
                npm run test:unit
              } | tee /dev/null
              runHook postCheck
            '';

            installPhase = ''
              runHook preInstall
              mkdir -p "$out"
              cp -r -t "$out" build/*
              runHook postInstall
            '';
          }) {};

        radicle-httpd = craneLib.buildPackage (basicArgs
          // {
            inherit (craneLib.crateNameFromCargoToml {cargoToml = ./radicle-httpd + "/Cargo.toml";}) pname version;
            cargoArtifacts = craneLib.buildDepsOnly basicArgs;

            nativeBuildInputs = with pkgs;
              [
                git
                asciidoctor
                installShellFiles
              ]
              ++ lib.optionals pkgs.stdenv.isDarwin (with pkgs; [
                libiconv
                darwin.apple_sdk.frameworks.Security
              ]);

            env =
              {
                RADICLE_VERSION = "nix-" + (self.shortRev or self.dirtyShortRev or "unknown");
              }
              // (
                if self ? rev || self ? dirtyRev
                then {
                  GIT_HEAD = self.rev or self.dirtyRev;
                }
                else {}
              );

            cargoExtraArgs = "-p radicle-httpd";
            doCheck = false;
            postInstall = ''
              for page in radicle-httpd.1.adoc; do
                asciidoctor -d manpage -b manpage $page
                installManPage ''${page::-5}
              done
            '';
          });
      };

      devShells.default = pkgs.mkShell {
        packages = with pkgs; [
          cargo-watch
          nodejs_22
          radicle-node
          rust-analyzer
          rustToolchain
        ];
      };
    }));
}
