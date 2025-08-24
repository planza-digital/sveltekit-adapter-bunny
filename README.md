# SvetleKit Adapter Bunny

A SvelteKit adapter for deploying to Bunny.net Edge Scripting and Edge Storage.

## Bunny Edge Scripting and Storage

Bunny's edge scripting runtime is based on Deno isolates. This means that as long as your project is Deno compatible (minus a few platform limitations like filesystem access), your project can be bundled for their edge scripting platform!

## Usage

Using this adapter is just like any other, after adding to your project's dependencies it can be imported and used in `svelte.config.js`. In order to generate a server bundle that can access your static assets, the adapter needs information about the storage zone they will be kept on, such as the primary location and path to where they will be kept. By default, the bundled application will read these values from the environment variables at runtime.

```javascript
import adapter from "@planza-digital/sveltekit-adapter-bunny";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: { runes: true },
  kit: {
    adapter: adapter(),
  },
};

export default config;
```

```bash
# A subdirectory or path to where assets are located
BUNNY_ASSETS_PREFIX="deployment-x"
# The primary storage region for your assets. This is listed as the FTP hostname on the dashboard. (https://docs.bunny.net/reference/storage-api#storage-endpoints)
BUNNY_ASSETS_REGION="storage.bunnycdn.com"
# The name of the assets zone, which is the same as your FTP username. (https://docs.bunny.net/reference/storage-api#authentication)
BUNNY_ASSETS_ZONE="my-app-assets"
# Your access token, which is the same as your FTP password. It is reccomended to use your Read-Only password here. (https://docs.bunny.net/reference/storage-api#authentication)
BUNNY_ASSETS_KEY="00000000-0000-0000-000000000000-0000-0000"
```

If however you wish to bake these values into the final bundle at build time (akin to `$env/static/private`), you can pass them to the adapter and it will inject them directly into the final bundle. While there may be instances where you wish to use injected variables, it is reccomended to keep at least your token dynamic so you can replace it easily if you need to roll it over.

```javascript
import adapter from "@planza-digital/sveltekit-adapter-bunny";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  compilerOptions: { runes: true },
  kit: {
    adapter: adapter({
      assets: {
        prefix: "deployment-x",
        region: "storage.bunnycdn.com",
        zone: "my-app-assets",
        token: "00000000-0000-0000-000000000000-0000-0000",
      },
    }),
  },
};

export default config;
```

## Deployment

Since the services needed to host a SvelteKit app on Bunny are spread across multiple services, the adapter includes a deployment tool to upload the project's server bundle, static assets, and environment variables.

## Limitations

Currently, Bunny.net Edge Scripting has a few limitations. Server bundles must be a single file for the entire project. This means there is currently no way to use a `package.json` or `deno.json` file. Thankfully, Deno supports direct import satetments from npm, jsr, and urls like esm.sh. This means your project's dependencies must all be available to import via one of these methods. You can learn more about [Deno's support for remote imports here](https://docs.deno.com/runtime/fundamentals/modules/#importing-third-party-modules-and-libraries). For Bunny platform specific limitations, [you can find those here](https://docs.bunny.net/docs/edge-scripting-limits).

Edge scripting doesn't directly support static file bindings either, so they must be uploaded separately and reffered to. Thankfully, the adapter supports refrencing Bunny Edge storage volumes. The adapter also supports uploading both your compiled server bundle and static/client assets after build.

## FAQ

### Is this an official project?

No, we are not affiliated with Bunny, but we are their customers. Our hope is that by making our adapter open source we can increase platform adoption and help it improve.

### Cloudflare Workers is affordable and officially supported, why not use that instead?

This adapter is a part of our efforts to migrate away from Cloudflare Workers. Unfortunatley, our experience with them has been sub-par. Non-enterprise customers are the first to be de-prioritized when their network is experiencing high loads, which results in increased response times. For our edge computing needs, this has lead to response times that are significantly higher than if they were just served from the origin. This defeats the purpose of edge compute. Our focus is providing cutting edge solutions for business of all sizes, so they are no longer a good fit for our needs.

### Why not use Deno Deploy?

When investigating edge runtimes for our platforms, Deno Deploy was on our radar. We decided against it for the time being due to a decreasing number of Points of Processing (PoP). Bunny's pricing was much more competetive and offered a more complete platform. This comes at the cost of DX, which we hope to remedy with this adapter. You can read more about challenges with Deno Deploy on the [archived adapter project](https://github.com/dbushell/sveltekit-adapter-deno).

### Why can't I use Adapter Deno?

Due to limitations outlined above, there are additional steps required to bundle a SvelteKit project for the Bunny Edge platform.
