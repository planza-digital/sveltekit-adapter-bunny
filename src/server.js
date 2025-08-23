// Use Deno's npm import syntax for external packages
import * as BunnySDK from "npm:@bunny.net/edgescript-sdk";
import * as BunnyStorageSDK from "npm:@bunny.net/storage-sdk";
import { Server } from "./index.js";
import { manifest } from "./manifest.js";

// Create server instance with the manifest
const server = new Server(manifest);

const fileReader = (options) => {
  const { assetPath, region, zone, token } = options;

  const storage = BunnyStorageSDK.zone.connect_with_accesskey(
    region,
    zone,
    token
  );

  return async (file) => {
    return await BunnyStorageSDK.file
      .download(storage, assetPath + file)
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
    assetPath: "",
    region: BunnyStorageSDK.regions.StorageRegion.Falkenstein,
    zone: "storage-zone-name",
    token: "token",
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
