# SvetleKit Adapter Bunny

A SvelteKit adapter for deploying to Bunny.net Edge Scripting and Edge Storage.

## Bunny Edge Scripting and Storage

Bunny's edge scripting runtime is based on Deno isolates. This means that as long as your project is Deno compatible (minus a few platform limitations like filesystem access), your project can be bundled for their edge scripting platform!

## Why can't I use Adapter Deno?

Due to limitations outlined below, there are additional steps required to bundle a SvelteKit project for the Bunny Edge platform.

## Why not use Deno Deploy?

When investigating edge runtimes for our platforms, Deno Deploy was on our radar. We decided against it for the time being due to a decreasing number of Points of Processing (PoP). Bunny's pricing was much more competetive and offered a more complete platform. This comes at the cost of DX, which we hope to remedy with this adapter.

## Limitations

Currently, Bunny.net Edge Scripting has a few limitations. Server bundles must be a single file for the entire project. This means there is currently no way to use a `package.json` or `deno.json` file. Thankfully, Deno supports direct import satetments from npm, jsr, and urls like esm.sh. This means your project's dependencies must all be available to import via one of these methods. You can learn more about [Deno's support for remote imports here](https://docs.deno.com/runtime/fundamentals/modules/#importing-third-party-modules-and-libraries). For Bunny platform specific limitations, [you can find those here](https://docs.bunny.net/docs/edge-scripting-limits).

Edge scripting doesn't directly support static file bindings either, so they must be uploaded separately and reffered to. Thankfully, the adapter supports refrencing Bunny Edge storage volumes. The adapter also supports uploading both your compiled server bundle and static/client assets after build.
