// ----------------------------
// RESPONSE UTILITIES
// ----------------------------

/**
 * Standard MCP content item types
 */
export type ContentItem = {
  // Common properties
  type: string;

  // Content type-specific properties
  text?: string; // For text content
  mimeType?: string; // For media content
  blob?: string; // For binary content (base64 encoded)
  resource?: any; // For resource content
};

/**
 * Text content item (most common type)
 */
export interface TextContentItem extends ContentItem {
  type: "text";
  text: string;
}

/**
 * Standard MCP response structure
 */
export type Response = {
  isError?: boolean; // Optional error flag (true for errors)
  content: ContentItem[]; // Array of content items
};

/**
 * Create a successful plain text response
 * @param text - The text message
 * @returns A success response object with text content
 */
export function success(text: string): Response {
  return {
    content: [{ type: "text", text }],
  };
}

/**
 * Create a success response with structured content
 * @param content - Array of content items
 * @returns A success response object with provided content
 */
export function successWithContent(content: ContentItem): Response {
  return {
    content: [content],
  };
}

/**
 * Create a success response with JSON data
 * @param data - Any data object that can be JSON-stringified
 * @returns A success response with JSON data wrapped as a resource
 */
export function successWithJson<T>(data: T): Response {
  return {
    content: [
      {
        type: "resource",
        mimeType: "application/json",
        resource: data,
      },
    ],
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
