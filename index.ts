import { Octokit } from "@octokit/rest";
import { generateChatCompletion } from '@paperdave/openai';
import { Remarkable } from "remarkable";
import fs from "fs";
import chalk from "chalk";

type OpenAI_Model = 'gpt-4' | 'gpt-4-32k' | 'gpt-3.5-turbo';

interface ProcessGithubRepoMarkdownConfig {
	url: string;
	systemInstruction?: string;
	model?: OpenAI_Model;
	outputFile?: string;
	targetWordsPerChunk?: number;
	debug?: boolean;
}

export async function processGithubRepoMarkdown(config: ProcessGithubRepoMarkdownConfig) {
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
		systemInstruction = defaultSystemInstruction,
		model = "gpt-3.5-turbo",
		outputFile = "output.md",
		targetWordsPerChunk = 600,
		debug = false,
	} = config;

	const parsedUrl = new URL(url);
	const [, owner, repo, , ...pathParts] = parsedUrl.pathname.split("/");
	const path = pathParts.join("/");

	// Remove 'blob/master' from the path
	const pathWithoutBlobMaster = path.replace("master", "");

	// Fetch and process the markdown files
	await fetchMarkdownFiles(owner, repo, pathWithoutBlobMaster, systemInstruction, model, targetWordsPerChunk, outputFile, debug);
}

async function fetchMarkdownFiles(
	owner: string,
	repo: string,
	path: string,
	systemInstruction: string,
	model: OpenAI_Model,
	targetWordsPerChunk: number,
	outputFile: string,
	debug?: boolean
): Promise<void> {
	const octokit = new Octokit({
		auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
		fetch,
	});

	console.log("Fetching files from", path);

	const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
		owner,
		repo,
		path,
	});
	const files = response.data;

	// Check if files is an array
	if (!Array.isArray(files)) {
		console.log("Files is not an array");
		return;
	}

	for (const file of files) {
		if (file.type === "dir") {
			await fetchMarkdownFiles(owner, repo, file.path, systemInstruction, model, targetWordsPerChunk, outputFile, debug);
		} else if (file.name.endsWith(".md")) {
			console.log(chalk.bold(`Processing file: ${file.name}`));
			const markdownResponse = await fetch(file.download_url as string);
			const markdownContent = await markdownResponse.text();
			const outputText = await processMarkdown(markdownContent, systemInstruction, model, targetWordsPerChunk, debug);

			// Save the processed text to a file
			fs.appendFileSync(outputFile, outputText);
		}
	}
}

async function processMarkdown(
	markdown: string,
	systemInstruction: string,
	model: OpenAI_Model,
	targetWordsPerChunk: number,
	debug?: boolean
): Promise<string> {
	const chunks = splitMarkdown(markdown, targetWordsPerChunk);
	let outputText = "";
	let batchedChunks = "";
	let currentBatchWordCount = 0;

	console.log(`Processing ${chunks.length} chunks`);

	for (const [index, chunk] of chunks.entries()) {
		const chunkWordCount = wordCount(chunk);

		if (currentBatchWordCount + chunkWordCount <= targetWordsPerChunk) {
			batchedChunks += chunk + "\n";
			currentBatchWordCount += chunkWordCount;
		} else {
			console.log(chalk.blue(`Processing batched chunks (word count: ${currentBatchWordCount})`));
			const response = await createCompletion(batchedChunks, systemInstruction, model);

			if (debug) {
				console.log(`\nGPT Prompt\n: ${chalk.gray(batchedChunks)}`);
				console.log(`\nGPT Output\n: ${chalk.gray(response)}`);
			}

			outputText += response + "\n";

			// Start a new batch with the current chunk
			batchedChunks = chunk + "\n";
			currentBatchWordCount = chunkWordCount;
		}
	}

	// Process the remaining batched chunks
	if (batchedChunks) {
		console.log(chalk.blue(`Processing remaining batched chunks (word count: ${currentBatchWordCount})`));
		const response = await createCompletion(batchedChunks, systemInstruction, model);

		if (debug) {
			console.log(chalk.gray(`GPT Prompt: ${batchedChunks}`));
			console.log(chalk.gray(`GPT Output: ${response}`));
		}

		outputText += response + "\n";
	}

	return outputText;
}

function wordCount(str: string): number {
	return str.trim().split(/\s+/).length;
}

function splitMarkdown(markdown: string, targetWordsPerChunk: number): string[] {
	const md = new Remarkable();
	const tokens = md.parse(markdown, {});
  
	const chunks: string[] = [];
	let currentChunk = "";
	let inHeading = false;
	let inCodeBlock = false;
  
	for (const token of tokens) {
	  if (token.type === "heading_open") {
		if (currentChunk) {
		  chunks.push(currentChunk.trim());
		  currentChunk = "";
		}
		inHeading = true;
	  } else if (token.type === "heading_close") {
		inHeading = false;
		currentChunk += "\n";
	  } else if (token.type === "paragraph_open") {
		if (wordCount(currentChunk) >= targetWordsPerChunk) {
		  chunks.push(currentChunk.trim());
		  currentChunk = "";
		}
	  } else if (token.type === "paragraph_close") {
		currentChunk += "\n";
	  } else if (token.type === "fence") {
		if ('markup' in token && 'params' in token && 'content' in token) {
		  inCodeBlock = !inCodeBlock;
		  currentChunk += token.markup + token.params + "\n" + token.content;
		}
	  }
  
	  if (token.type === "inline" && 'content' in token) {
		if (inHeading && 'level' in token) {
		  currentChunk += `#`.repeat(token.level) + " ";
		}
		currentChunk += token.content;
	  }
	}
  
	if (currentChunk) {
	  chunks.push(currentChunk.trim());
	}
  
	return chunks;
  }
  

async function createCompletion(chunk: string, systemInstruction: string, model: OpenAI_Model) {
	const response = await generateChatCompletion({
		model: model,
		messages: [
			{
				'role': 'system',
				'content': systemInstruction,
			},
			{
				'role': 'user',
				'content': chunk,
			},
		],
		temperature: 0,
	});

	return response.content;
}
