{
  description = "The development environment for SvelteKit Adapter Bunny";

  outputs = { self, nixpkgs }:
    let pkgs = import nixpkgs { system = "x86_64-linux"; };
    in {
      devShell.x86_64-linux =
        pkgs.mkShell { buildInputs = with pkgs; [ nodejs deno ]; };
    };
}
