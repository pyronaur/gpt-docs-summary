// src/read-from-fs.ts

import { ProcessingStrategy } from "./strategy";
import fs from 'fs';
import { GPT_Summary_Config, summarize } from "./gpt-summarize";

export interface Read_FS_Config {
  filePath: string;
}

export class FileSystemStrategy implements ProcessingStrategy {
  constructor(private config: Read_FS_Config) {}

  async execute(outputFile: string, gptConfig: GPT_Summary_Config): Promise<void> {
    const { filePath } = this.config;

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
}
