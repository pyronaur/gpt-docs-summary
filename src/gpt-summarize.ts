// src/gpt-summarize.ts

import { generateChatCompletion } from '@paperdave/openai';

export type GPT_Models = 'gpt-4' | 'gpt-4-32k' | 'gpt-3.5-turbo';

export interface GPT_Summary_Config {
  systemInstruction: string;
  model: GPT_Models;
  targetWordsPerChunk: number;
  debug?: boolean;
}

export async function summarize(
  text: string,
  config: GPT_Summary_Config
): Promise<string> {
  const { systemInstruction, model, targetWordsPerChunk, debug } = config;
  const chunks = splitText(text, targetWordsPerChunk);
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
      console.log(`Processing batched chunks (word count: ${currentBatchWordCount})`);
      const response = await createCompletion(batchedChunks, systemInstruction, model);

      if (debug) {
        console.log(`\nGPT Prompt\n: ${batchedChunks}`);
        console.log(`\nGPT Output\n: ${response}`);
      }

      outputText += response + "\n";

      // Start a new batch with the current chunk
      batchedChunks = chunk + "\n";
      currentBatchWordCount = chunkWordCount;
    }
  }

  // Process the remaining batched chunks
  if (batchedChunks) {
    console.log(`Processing remaining batched chunks (word count: ${currentBatchWordCount})`);
    const response = await createCompletion(batchedChunks, systemInstruction, model);

    if (debug) {
      console.log(`GPT Prompt: ${batchedChunks}`);
      console.log(`GPT Output: ${response}`);
    }

    outputText += response + "\n";
  }

  return outputText;
}

function wordCount(str: string): number {
  return str.trim().split(/\s+/).length;
}

function splitText(text: string, targetWordsPerChunk: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  let currentChunk = "";

  for (const word of words) {
    currentChunk += word + " ";

    if (wordCount(currentChunk) >= targetWordsPerChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function createCompletion(chunk: string, systemInstruction: string, model: GPT_Models) {
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
