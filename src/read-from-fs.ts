// read-from-fs.ts

import fs from 'fs';
import { GPT_Summary_Config, summarize } from "./gpt-summarize";

interface Read_FS_Config {
  filePath: string;
  outputFile: string;
  gptConfig: GPT_Summary_Config;
}

export async function readFromFS(config: Read_FS_Config) {
  const { filePath, outputFile, gptConfig } = config;

  // Check if the file exists
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Processing file: ${filePath}`);

  // Read the file content
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  // Process the content with GPT
  const outputText = await summarize(fileContent, gptConfig);

  // Save the processed text to a file
  fs.writeFileSync(outputFile, outputText);
}
