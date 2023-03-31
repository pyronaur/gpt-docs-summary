// src/read-from-github.ts

import { ProcessingStrategy } from "./strategy";
import { Octokit } from "@octokit/rest";
import { GPT_Summary_Config, summarize } from "./gpt-summarize.js";
import fs from 'fs';

export interface Read_Github_Config {
  url: string;
}

export class GithubStrategy implements ProcessingStrategy {
  constructor(private config: Read_Github_Config) {}

  async execute(outputFile: string, gptConfig: GPT_Summary_Config): Promise<void> {
    const { url } = this.config;

    const parsedUrl = new URL(url);
    const [, owner, repo, , ...pathParts] = parsedUrl.pathname.split("/");
    const path = pathParts.join("/");

    // Remove 'blob/master' from the path
    const pathWithoutBlobMaster = path.replace("master", "");

    // Fetch and process the markdown files
    await fetchMarkdownFiles(owner, repo, pathWithoutBlobMaster, outputFile, gptConfig);
  }
}

async function fetchMarkdownFiles(
  owner: string,
  repo: string,
  path: string,
  outputFile: string,
  gptConfig: GPT_Summary_Config
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
      await fetchMarkdownFiles(owner, repo, file.path, outputFile, gptConfig);
    } else if (file.name.endsWith(".md")) {
      console.log(`Processing file: ${file.name}`);
      const markdownResponse = await fetch(file.download_url as string);
      const markdownContent = await markdownResponse.text();
      const outputText = await summarize(markdownContent, gptConfig);

      // Save the processed text to a file
      fs.appendFileSync(outputFile, outputText);
    }
  }
}
