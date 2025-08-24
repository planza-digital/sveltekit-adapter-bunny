import { deployAssets, deployCode } from "./deploy";

deployCode({
  id: process.env.BUNNY_CODE_ID,
  key: process.env.BUNNY_CODE_KEY,
  secrets: {},
  variables: {},
}).then(() => {
  deployAssets({
    prefix: process.env.BUNNY_ASSETS_PREFIX,
    region: process.env.BUNNY_ASSETS_REGION,
    zone: process.env.BUNNY_ASSETS_ZONE,
    key: process.env.BUNNY_ASSETS_UPLOAD_KEY,
  });
});
