// ----------------------------
// RESPONSE UTILITIES
// ----------------------------

import { CallToolResult, TextContent, ImageContent, AudioContent } from '@modelcontextprotocol/sdk/types.js';

/**
 * Standard MCP content item types (union of all supported content types)
 */
export type ContentItem = TextContent | ImageContent | AudioContent;

/**
 * Text content item (most common type)
 */
export type TextContentItem = TextContent;

/**
 * Standard MCP response structure (compatible with CallToolResult)
 */
export type Response = CallToolResult;

/**
 * Create a successful plain text response
 * @param text - The text message
 * @returns A success response object with text content
 */
export function success(text: string): CallToolResult {
  return {
    content: [{ type: 'text', text }],
  };
}

/**
 * Create a success response with structured content
 * @param content - Array of content items
 * @returns A success response object with provided content
 */
export function successWithContent(content: ContentItem): CallToolResult {
  return {
    content: [content],
  };
}

/**
 * Create a success response with JSON data
 * @param data - Any data object that can be JSON-stringified
 * @returns A success response with JSON data wrapped as a resource
 */
export function successWithJson<T>(data: T): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data),
      },
    ],
  };
}

/**
 * Create an error response
 * @param message - The error message
 * @returns An error response object
 */
export function error(message: string): CallToolResult {
  return {
    isError: true,
    content: [{ type: 'text', text: `Error: ${message}` }],
  };
}

/**
 * Create an error response from an Error object or any thrown value
 * @param err - The error object or value
 * @returns An error response object
 */
export function errorFromCatch(err: unknown): CallToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return error(message);
}
