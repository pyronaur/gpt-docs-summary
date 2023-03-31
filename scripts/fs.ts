// /scripts/fs.ts

import { processText } from "../src/process";
import { FileSystemStrategy } from "../src/read-from-fs";

const localFile = process.argv[2];

processText({
  strategy: new FileSystemStrategy({ filePath: localFile }),
  outputFile: "output-second-pass.md",
  debug: true,
  targetWordsPerChunk: 1000,
  model: 'gpt-4'
});
