// src/process.ts

import { GPT_Summary_Config, GPT_Models } from "./gpt-summarize";
import { ProcessingStrategy } from "./strategy";

interface ProcessConfig {
	strategy: ProcessingStrategy;
	systemInstruction?: string;
	model?: GPT_Models;
	outputFile?: string;
	targetWordsPerChunk?: number;
	debug?: boolean;
}

export async function processText(config: ProcessConfig) {
	const defaultSystemInstruction = [
		"Your task is to rewrite content for a prompt input to LLM. Reduce the given text as much as possible following the guidelines below:",
		"1. Focus on extracting code examples from the provided text and reduce the surrounding text or remove it entirely.",
		"2. Remove any unnecessary details.",
		"3. Remove any links, references to further reading, phrases that include recommendations and opinions.",
		"4. Remove any narration, only focus on dry facts. Bullet points are preferred.",
		"5. IMPORTANT: If there's nothing of value in the text, remove it entirely and return a single dash (-).",
		"6. Format text using markdown. Preserve all special characters within code examples in the output.",
	].join("\n");

	const {
		strategy,
		systemInstruction = defaultSystemInstruction,
		model = "gpt-3.5-turbo",
		outputFile = "output.md",
		targetWordsPerChunk = 600,
		debug = false,
	} = config;

	const gptConfig: GPT_Summary_Config = {
		systemInstruction,
		model,
		targetWordsPerChunk,
		debug,
	};

	await strategy.execute(outputFile, gptConfig);
}
