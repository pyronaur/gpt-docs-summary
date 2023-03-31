import { processGithubRepoMarkdown } from "./index";

const url = process.argv[2];

if (!url) {
	console.error("Please provide a GitHub URL as an argument.");
	process.exit(1);
}

processGithubRepoMarkdown({
	url: url,
	outputFile: "output.md",
	debug: true,
});