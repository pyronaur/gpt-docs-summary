// src/strategy.ts

import { GPT_Summary_Config } from "./gpt-summarize";

export interface ProcessingStrategy {
	execute: (outputFile: string, gptConfig: GPT_Summary_Config) => Promise<void>;
}
