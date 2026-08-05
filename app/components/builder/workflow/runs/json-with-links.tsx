"use client";

import { isUrl } from "./utils";

export interface JsonWithLinksProps {
  data: unknown;
}

/**
 * Component to render JSON with clickable links
 */
export function JsonWithLinks({ data }: JsonWithLinksProps) {
  // Use regex to find and replace URLs in the JSON string
  const jsonString = JSON.stringify(data, null, 2);

  // Split by quoted strings to preserve structure
  const parts = jsonString.split(/("https?:\/\/[^"]+"|"[^"]*")/g);

  return (
    <>
      {parts.map((part) => {
        // Check if this part is a quoted URL string
        if (part.startsWith('"') && part.endsWith('"')) {
          const innerValue = part.slice(1, -1);
          if (isUrl(innerValue)) {
            return (
              <a
                className="text-orange-500 underline hover:text-orange-400"
                href={innerValue}
                key={innerValue}
                rel="noopener noreferrer"
                target="_blank"
              >
                {part}
              </a>
            );
          }
        }
        // For non-URL parts, just render as text (no key needed for text nodes)
        return part;
      })}
    </>
  );
}
