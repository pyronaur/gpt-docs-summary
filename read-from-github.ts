// read-from-github.ts
import { Octokit } from "@octokit/rest";
import { GPTApiHandlerConfig, processTextWithGPT } from "./gpt-summarize.js";
import fs from 'fs';

interface GithubTextProviderConfig {
  url: string;
  outputFile: string;
  gptConfig: GPTApiHandlerConfig;
}

export async function readFromGithub(config: GithubTextProviderConfig) {
  const { url, outputFile, gptConfig } = config;

  const parsedUrl = new URL(url);
  const [, owner, repo, , ...pathParts] = parsedUrl.pathname.split("/");
  const path = pathParts.join("/");

  // Remove 'blob/master' from the path
  const pathWithoutBlobMaster = path.replace("master", "");

  // Fetch and process the markdown files
  await fetchMarkdownFiles(owner, repo, pathWithoutBlobMaster, outputFile, gptConfig);
}

async function fetchMarkdownFiles(
  owner: string,
  repo: string,
  path: string,
  outputFile: string,
  gptConfig: GPTApiHandlerConfig
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
      const outputText = await processTextWithGPT(markdownContent, gptConfig);

      // Save the processed text to a file
      fs.appendFileSync(outputFile, outputText);
    }
  }
}
