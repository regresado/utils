import { parse } from "node-html-parser";

type WebDetailsResult = {
  url: string | undefined;
  title: (string | undefined)[];
  description: (string | undefined)[];
  error?: string;
};

export async function getWebDetails(url: string): Promise<WebDetailsResult> {
  const htmlResponse = await fetch(
    url.startsWith("http") ? url : "https://" + url,
    { signal: AbortSignal.timeout(1200) },
  )
    .then((res) => res.text())
    .catch((_err) => {
      return "Failed to fetch URL";
    });

  if (htmlResponse === "Failed to fetch URL") {
    return {
      error: htmlResponse,
      url: url.startsWith("http") ? url : "https://" + url,
      title: ["New Destination"],
      description: [""],
    };
  }

  const doc = parse(htmlResponse);
  const title = [
    doc.querySelector("title")?.text,
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content"),
    doc.querySelector('meta[name="twitter:title"]')?.getAttribute("content"),
  ];
  const description = [
    doc.querySelector('meta[name="description"]')?.getAttribute("content"),
    doc
      .querySelector('meta[property="og:description"]')
      ?.getAttribute("content"),
    doc
      .querySelector('meta[name="twitter:description"]')
      ?.getAttribute("content"),
  ];

  return {
    url: url.startsWith("http") ? url : "https://" + url,
    title,
    description,
  };
}
