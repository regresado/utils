export interface SiteInput {
  url?: string;
  headline?: string;
  description?: string;
}

export interface TaggerConfig {
  maxTags?: number;
  maxRetries?: number;
  requestDelay?: number;
}

export interface TagResult {
  tags: string[];
  success: boolean;
  error?: string;
  metadata?: {
    processingTime: number;
    retryCount: number;
  };
}

export interface BatchResult extends SiteInput {
  result: TagResult;
}

class PromptBuilder {
  static buildTaggingPrompt(site: SiteInput, maxTags: number): string {
    const urlDomain = site.url ? this.extractDomain(site.url) : null;

    const parts = [
      "You are an expert at creating broad, general bookmark tags for organizing web content into major categories.",
      "",
      `Generate exactly ${maxTags} GENERAL category tags for this bookmark. Think broad topics that would be useful for filtering large bookmark collections.`,
      "",
      "Focus on HIGH-LEVEL categories like:",
      "- Subject areas: javascript, python, politics, science, business, design",
      "- Content types: tutorial, documentation, news, tool, reference",
      "- Industries: finance, healthcare, education, entertainment",
      "",
    ];

    if (urlDomain) parts.push(`Domain: ${urlDomain}`);
    if (site.headline) parts.push(`Title: ${site.headline}`);
    if (site.description) parts.push(`Description: ${site.description}`);
    if (site.url) parts.push(`URL: ${site.url}`);

    parts.push(
      "",
      "CRITICAL RULES:",
      "- Return ONLY a comma-separated list of tags",
      "- Use single words when possible (javascript, politics, tutorial)",
      "- Think BROAD categories, not specific details",
      "- Avoid technical jargon - use common terms",
      '- NO meta tags like "think-okay" or processing artifacts',
      "- Make tags useful for filtering hundreds of bookmarks",
      "",
      "Tags:",
    );

    return parts.join("\n");
  }

  private static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return "";
    }
  }
}

export class SiteTagger {
  private readonly config: Required<TaggerConfig>;
  private readonly apiUrl = "https://ai.hackclub.com/chat/completions";
  private readonly model = "qwen/qwen3-32b";
  private readonly temperature = 0.3;

  constructor(config: TaggerConfig = {}) {
    this.config = {
      maxTags: config.maxTags || 4,
      maxRetries: config.maxRetries || 2,
      requestDelay: config.requestDelay || 1000,
    };
  }

  async generateTags(site: SiteInput): Promise<TagResult> {
    const startTime = Date.now();
    let retryCount = 0;

    try {
      if (!site.url && !site.headline && !site.description) {
        throw new Error(
          "At least one of url, headline, or description must be provided",
        );
      }

      const prompt = PromptBuilder.buildTaggingPrompt(
        site,
        this.config.maxTags,
      );
      const tags = await this.makeApiRequest(prompt, retryCount);

      return {
        tags,
        success: true,
        metadata: {
          processingTime: Date.now() - startTime,
          retryCount,
        },
      };
    } catch (error) {
      return {
        tags: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metadata: {
          processingTime: Date.now() - startTime,
          retryCount,
        },
      };
    }
  }

  private async makeApiRequest(
    prompt: string,
    retryCount: number,
  ): Promise<string[]> {
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(this.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            temperature: this.temperature,
            max_completion_tokens: 60,
            reasoning_effort: "none",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(
            `API request failed: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("No content received from API");
        }

        return this.parseTags(content);
      } catch (error) {
        if (attempt === this.config.maxRetries) {
          throw error;
        }

        await this.sleep(Math.pow(2, attempt) * 1000);
        retryCount++;
      }
    }

    throw new Error("Max retries exceeded");
  }

  private parseTags(content: string): string[] {
    const tags = content
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => this.normalizeTag(tag))
      .filter((tag) => tag.length > 0 && tag.length <= 30)
      .slice(0, this.config.maxTags);

    return [...new Set(tags)];
  }

  private normalizeTag(tag: string): string {
    return tag
      .toLowerCase()
      .replace(/^["']|["']$/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async generateTagsBatch(sites: SiteInput[]): Promise<BatchResult[]> {
    const results: BatchResult[] = [];

    for (let i = 0; i < sites.length; i++) {
      const site = sites[i];
      const result = await this.generateTags(site);

      results.push({
        ...site,
        result,
      });

      if (i < sites.length - 1) {
        await this.sleep(this.config.requestDelay);
      }
    }

    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getTagSuggestions(
    site: SiteInput,
    count: number = 8,
  ): Promise<string[]> {
    const tempTagger = new SiteTagger({ ...this.config, maxTags: count });
    const result = await tempTagger.generateTags(site);
    return result.tags;
  }
}

export default SiteTagger;
