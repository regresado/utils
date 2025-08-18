# 🔧 Regreso Utils

[![npm](https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=fff)](https://www.npmjs.com/package/@regreso/utils)
![NodeJS](https://img.shields.io/badge/Node.js-6DA55F?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)

## 🤔 What is this?

Some neat little utilities relied upon by Regreso clients. Right now, these can be used to:

- Get metadata info about websites (for prefilling destination details automatically)
- AI-generate a list of practically-usable, relevant tags to describe a location based on metadata (supports provided, self-hostable AI instance URL)

## 🚀 Usage

Let's say you wanted to use this module in your own regreso client (or something entirely different), here's how:

- **SiteTagger(config)** - A class used to control AI-based website tagging behaviors.

  ```javascript
  import { SiteTagger } from "@regreso/utils";

  async function demo() {
    const tagger = new SiteTagger({
      maxTags: 3,
      aiInstance: "https://ai.hackclub.com",
      maxRetries: 2,
      requestDelay: 1000,
    });

    const demoSites = [
      {
        url: "https://github.com/microsoft/vscode",
        headline: "Visual Studio Code",
        description: "A lightweight but powerful source code editor",
      },
      {
        url: "https://css-tricks.com/snippets/css/a-guide-to-flexbox/",
        headline: "A Complete Guide to Flexbox",
        description: "CSS Flexbox layout guide with examples",
      },
    ];

    const result = await tagger.generateTags(demoSites[0]);

    if (result.success) {
      console.log(
        `tags: ${result.tags.join(", ")} in ${result.metadata?.processingTime} ms.`,
      );
    } else {
      console.log(`error: ${result.error}`);
    }

    const batchResults = await tagger.generateTagsBatch(demoSites);

    console.log(
      batchResults
        .filter((r) => r.result.success)
        .map((r) => `${r.headline}: [${r.result.tags.join(", ")}]`)
        .join("\n"),
    );
  }

  demo();
  ```

- **getWebDetails(url: String)** - Gets the web details scraped from meta tags of specified website's URL. Returns multiple versions if relevant (title, og:title, twitter:title to be specific)

  ```javascript
  import { getWebDetails } from "@regreso/utils";

  async function demo() {
    const webDetailsResult = await getWebDetails("fbi.gov");

    console.log({
      url: webDetailsResult.url, // with protocol appended if missing
      title:
        webDetailsResult.title[0] ??
        webDetailsResult.title[1] ??
        webDetailsResult.title[2],
      description:
        webDetailsResult.description[0] ??
        webDetailsResult.description[1] ??
        webDetailsResult.description[2],
    });
  }

  demo();
  ```

## ☑️ TODOs

- [x] Add site metadata scraping
- [x] Add AI-tagging
- [ ] Document package
  - [x] Basic Usage Demo
- [ ] Support scraping image metadata
