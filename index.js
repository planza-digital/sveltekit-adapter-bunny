import {
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  readdirSync,
  readFileSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { rollup } from "rollup";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { builtinModules } from "module";

const __dirname = dirname(fileURLToPath(import.meta.url));

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export default function customAdapter(options = {}) {
  const {
    serverFile = "index.js",
    clientDir = "client",
    externals = [],
    minify = false,
    sourcemap = false,
  } = options;

  // List of npm packages to externalize and use Deno's import syntax
  // Read project's package.json to get dependencies
  console.log("Reading project dependencies");
  const projectPackagePath = join(process.cwd(), "package.json");
  if (!existsSync(projectPackagePath)) {
    console.warn(
      "No package.json found for this project, all imports will be bundled..."
    );
  }

  const projectPackage = JSON.parse(readFileSync(projectPackagePath, "utf-8"));
  const npmPackages = [
    ...Object.keys(projectPackage.dependencies || {}),
    "@bunny.net/edgescript-sdk", // Always include Bunny SDK
  ];
  return {
    name: "sveltekit-adapter-bunny",

    async adapt(builder) {
      try {
        const outputDir = builder.getBuildDirectory("bunny.net");
        const clientOutputDir = join(outputDir, clientDir);

        // Clean output directories
        builder.rimraf(outputDir);

        // Create directories
        builder.mkdirp(outputDir);
        builder.mkdirp(clientOutputDir);

        // Build client files
        console.log("Building client bundle");
        await builder.writeClient(clientOutputDir);

        // Build server files
        console.log("Building server bundle");
        const serverTmpDir = join(outputDir, ".tmp");
        await builder.writeServer(serverTmpDir);

        // Create a wrapper file that imports the server and wraps it with BunnySDK
        console.log("Creating wrapper file");
        // Load wrapper code from file
        console.log("Loading wrapper code");
        const wrapperPath = join(__dirname, "src", "server.js");
        if (!existsSync(wrapperPath)) {
          throw new Error(`Wrapper file not found at: ${wrapperPath}`);
        }

        let wrapperCode = readFileSync(wrapperPath, "utf-8")
          .replace(/\.\/index\.js/g, join(serverTmpDir, "index.js"))
          .replace(/\.\/manifest\.js/g, join(serverTmpDir, "manifest.js"));

        console.log(wrapperCode);

        // Write the wrapper file to the temp directory
        const tempWrapperPath = join(serverTmpDir, "wrapper.js");
        writeFileSync(tempWrapperPath, wrapperCode);

        // Bundle everything together (wrapper + server code)
        console.log("Bundling everything with Rollup");

        // Create plugins array
        const plugins = [
          nodeResolve({
            preferBuiltins: true,
            exportConditions: ["node"],
            browser: false,
          }),
          commonjs({
            ignoreDynamicRequires: true,
          }),
          json(),
          // Plugin to add node: prefix to built-in modules
          {
            name: "node-prefix",
            resolveId(source) {
              // Add node: prefix to built-in modules
              if (
                builtinModules.includes(source) &&
                !source.startsWith("node:")
              ) {
                return `node:${source}`;
              }
              return null;
            },
          },
          // Plugin to convert npm imports to Deno's npm: syntax
          {
            name: "deno-npm-imports",
            resolveId(source) {
              // Check if this is one of our npm packages
              for (const pkg of npmPackages) {
                if (source === pkg || source.startsWith(`${pkg}/`)) {
                  return `npm:${source}`;
                }
              }
              return null;
            },
          },
        ];

        const bundle = await rollup({
          input: tempWrapperPath,
          plugins,
          external: (id) => {
            // Externalize Node.js built-in modules with node: prefix
            if (id.startsWith("node:")) {
              return true;
            }

            // Externalize npm packages using Deno's npm: syntax
            if (id.startsWith("npm:")) {
              return true;
            }

            // Externalize user-defined externals
            if (
              externals.includes(id) ||
              externals.some((pattern) =>
                typeof pattern === "string" ? id === pattern : pattern.test(id)
              )
            ) {
              return true;
            }

            // Bundle everything else
            return false;
          },
          // Enable tree shaking
          treeshake: {
            preset: "recommended",
            moduleSideEffects: "no-external",
            propertyReadSideEffects: false,
            tryCatchDeoptimization: false,
          },
        });

        // Generate the final bundled code
        await bundle.write({
          file: join(outputDir, serverFile),
          format: "esm",
          exports: "named",
          sourcemap,
          inlineDynamicImports: true,
          compact: minify,
          generatedCode: {
            constBindings: true,
          },
        });

        await bundle.close();

        // Copy prerendered pages
        console.log("Copying prerendered pages");
        const prerenderedPath = join(serverTmpDir, "prerendered");
        if (existsSync(prerenderedPath)) {
          copyDir(prerenderedPath, outputDir);
        }

        // Cleanup temporary directory
        builder.rimraf(serverTmpDir);

        console.log("Build complete!");
        console.log(`- Client files: ${clientDir}/`);
        console.log(`- Server bundle: ${serverFile}`);
        console.log(`- Output directory: ${outputDir}`);
        console.log(`- Using Deno npm imports for: ${npmPackages.join(", ")}`);
      } catch (error) {
        console.error(`Adapter error: ${error.message}`);
        if (error.stack) {
          console.error(error.stack);
        }
        throw error;
      }
    },
  };
}
