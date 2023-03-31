// main.ts
import { GPTApiHandlerConfig, OpenAI_Model } from "./gpt-summarize";
import { readFromGithub } from "./read-from-github";

interface MainConfig {
	url?: string;
	localFile?: string;
	systemInstruction?: string;
	model?: OpenAI_Model;
	outputFile?: string;
	targetWordsPerChunk?: number;
	debug?: boolean;
}

export async function processText(config: MainConfig) {
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
		url,
		localFile,
		systemInstruction = defaultSystemInstruction,
		model = "gpt-3.5-turbo",
		outputFile = "output.md",
		targetWordsPerChunk = 600,
		debug = false,
	} = config;

	const gptConfig: GPTApiHandlerConfig = {
		systemInstruction,
		model,
		targetWordsPerChunk,
		debug,
	};

	if (url) {
		await readFromGithub({ url, outputFile, gptConfig });
	} else if (localFile) {
		// Implement the local file processing here
	} else {
		console.error("Please provide either a GitHub URL or a local file path.");
		process.exit(1);
	}
}
