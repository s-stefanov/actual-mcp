// ----------------------------
// RESPONSE UTILITIES
// ----------------------------

/**
 * Response content item types
 */
export type ContentItem = {
  type: string;
  text: string;
};

/**
 * Standard response structure
 */
export type Response = {
  isError: boolean;
  content: ContentItem[];
};

/**
 * Create a successful response
 * @param text - The text message
 * @returns A success response object
 */
export function success(text: string): Response {
  return {
    isError: false,
    content: [{ type: "text", text }],
  };
}

/**
 * Create a success response with structured content
 * @param content - Array of content items
 * @returns A success response object with provided content
 */
export function successWithContent(content: ContentItem[]): Response {
  return {
    isError: false,
    content,
  };
}

/**
 * Create an error response
 * @param message - The error message
 * @returns An error response object
 */
export function error(message: string): Response {
  return {
    isError: true,
    content: [{ type: "text", text: `Error: ${message}` }],
  };
}

/**
 * Create an error response from an Error object or any thrown value
 * @param err - The error object or value
 * @returns An error response object
 */
export function errorFromCatch(err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err);
  return error(message);
}
