// cli.ts
import { processText } from "./main";

const url = process.argv[2];
const localFile = process.argv[3];

processText({
  url: url,
  localFile: localFile,
  outputFile: "output.md",
  debug: true,
});
