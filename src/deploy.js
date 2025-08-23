import fs from "fs";
import path from "path";

const bunnyURLBase = "https://api.bunny.net";
const endpoints = {
  code: (id) => `${bunnyURLBase}/compute/script/${id}/code`,
  variables: (id) => `${bunnyURLBase}/compute/script/${id}/variables`,
  secrets: (id) => `${bunnyURLBase}/compute/script/${id}/secrets`,
};
const withAccessKey = (key) => {
  return (method, body = undefined) => ({
    method,
    body,
    duplex: "half",
    headers: {
      AccessKey: key,
      accept: "application/json",
      "content-type": "application/json",
    },
  });
};

async function* walk(dir) {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

export async function deployCode(opts) {
  const { id, key, secrets, variables } = opts;
  const options = withAccessKey(key);
  const url = endpoints.code(id);
  const code = fs
    .readFileSync(path.join(process.cwd(), ".svelte-kit/bunny.net/index.js"))
    .toString();
  fetch(url, options("POST", JSON.stringify({ code })))
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to upload script: Status ${r.status}`);
      console.log("[Uploading script...]");
    })
    .catch((err) => console.error(err));

  if (secrets) {
    const url = endpoints.secrets(id);
    Object.entries(secrets).forEach(([name, secret]) => {
      const opts = options("PUT", { name, secret });
      fetch(url, opts)
        .then((res) => res.json())
        .then((json) => console.log(json))
        .catch((err) => console.error(err));
    });
  }

  if (variables) {
    const url = endpoints.variables(id);
    Object.entries(secrets).forEach(([name, defaultValue]) => {
      const opts = options("PUT", { name, defaultValue });
      fetch(url, opts)
        .then((res) => res.json())
        .then((json) => console.log(json))
        .catch((err) => console.error(err));
    });
  }
}

export async function deployAssets(opts) {
  const { region, zone, key, prefix } = opts;
  const options = withAccessKey(key);

  const assetsPath = path.join(process.cwd(), ".svelte-kit/bunny.net/client");
  const uploads = new Map();

  for await (const filepath of walk(assetsPath)) {
    const stream = fs.createReadStream(filepath);
    const fragment = filepath.replace(assetsPath, "");
    uploads.set(fragment, stream);
  }

  const uploaded = [];
  const failed = [];
  const b = 10;
  let batch = [];
  for (const [stream, fragment] of uploads.entries()) {
    const url = `https://${region}/${zone}/${prefix}/${fragment}`;
    batch.push(
      fetch(url, options("PUT", stream))
        .then((resp) => {
          if (!resp.ok) {
            failed.push(fragment);
          } else {
            uploaded.push(fragment);
          }
          const u = uploaded.length;
          const f = failed.length;
          const r = uploads.size - (u + f);

          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(
            `[Uploading assets...] Batch Size: ${b} Done: ${u} Failed: ${f} Remaining: ${r}\r`
          );
        })
        .catch((e) => {
          console.error(e);
        })
    );

    if (batch.length === b) {
      await Promise.all(batch);
      batch = [];
    }
  }
  process.stdout.write("\n");
}
