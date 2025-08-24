// Use Deno's npm import syntax for external packages
import * as BunnySDK from "npm:@bunny.net/edgescript-sdk";
import * as BunnyStorageSDK from "npm:@bunny.net/storage-sdk";
import process from "node:process";
import { Server } from "./index.js";
import { manifest } from "./manifest.js";

// Create server instance with the manifest
const server = new Server(manifest);

const fileReader = (options) => {
  const { prefix, region, zone, key } = options;

  const storage = BunnyStorageSDK.zone.connect_with_accesskey(
    region,
    zone,
    key
  );

  return async (file) => {
    return await BunnyStorageSDK.file
      .download(storage, prefix + file)
      .catch((e) => {
        console.error(e);
        return null;
      });
  };
};

// Initialize the server
const initPromise = server.init({
  env: {},
  read: fileReader({
    prefix: process.env.BUNNY_ASSETS_PREFIX,
    region: process.env.BUNNY_ASSETS_REGION,
    zone: process.env.BUNNY_ASSETS_ZONE,
    key: process.env.BUNNY_ASSETS_KEY,
  }),
});

// Wrap the Server with BunnySDK
const wrappedServer = BunnySDK.net.http.serve(async (req) => {
  try {
    // Wait for server initialization
    await initPromise;

    // Handle the request and return the response
    return await server.respond(req);
  } catch (error) {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

// Export the wrapped server
export default wrappedServer;
