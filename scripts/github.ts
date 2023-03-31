// /scripts/github.ts

import { processText } from "../src/process";
import { GithubStrategy } from "../src/read-from-github";

const url = process.argv[2];

processText({
  strategy: new GithubStrategy({ url }),
  outputFile: "output.md",
  debug: true,
});
