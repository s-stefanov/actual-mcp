import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { FinancialInsightsArgs, BudgetReviewArgs } from "./types.js";
import { getDateRange } from "./utils.js";

export const promptsSchema = [
  {
    name: "financial-insights",
    description: "Generate financial insights and advice",
    arguments: [
      {
        name: "startDate",
        description: "Start date in YYYY-MM-DD format",
        required: false,
      },
      {
        name: "endDate",
        description: "End date in YYYY-MM-DD format",
        required: false,
      },
    ],
  },
  {
    name: "budget-review",
    description: "Review my budget and spending",
    arguments: [
      {
        name: "months",
        description: "Number of months to analyze",
        required: false,
      },
    ],
  },
];

const financialInsightsPrompt = (args: FinancialInsightsArgs) => {
  const { startDate, endDate } = args || {};
  const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

  return {
    description: `Financial insights and recommendations from ${start} to ${end}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please analyze my financial data and provide insights and recommendations. Focus on spending patterns, savings rate, and potential areas to optimize my budget. Analyze data from ${start} to ${end}.

You can use these tools to gather the data you need:
1. Use the spending-by-category tool to analyze my spending breakdown
2. Use the monthly-summary tool to get my income, expenses, and savings rate
3. Use the get-transactions tool to examine specific transactions if needed

Based on this analysis, please provide:
1. A summary of my financial situation
2. Key insights about my spending patterns
3. Areas where I might be overspending
4. Recommendations to improve my savings rate
5. Any other relevant financial advice
`,
        },
      },
    ],
  };
};

const budgetReviewPrompt = (args: BudgetReviewArgs) => {
  const { months = 3 } = args || {};

  return {
    description: `Budget review for the past ${months} months`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Please review my budget and spending for the past ${months} months. I'd like to understand how well I'm sticking to my budget and where I might be able to make adjustments.
    
    To gather this data:
    1. Use the spending-by-category tool to see my spending breakdown
    2. Use the monthly-summary tool to get my overall income and expenses
    3. Use the get-transactions tool if you need to look at specific transactions
    
    Please provide:
    1. An analysis of my top spending categories
    2. Whether my spending is consistent month-to-month
    3. Areas where I might be able to reduce spending
    4. Suggestions for realistic budget adjustments
    `,
        },
      },
    ],
  };
};

// ----------------------------
// PROMPTS
// ----------------------------

export const setupPrompts = (server: Server) => {
  /**
   * Handler for listing available prompts
   */
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: promptsSchema,
    };
  });

  /**
   * Handler for getting prompts
   */
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    try {
      const { name, arguments: promptArgs } = request.params;

      switch (name) {
        case "financial-insights": {
          return financialInsightsPrompt(promptArgs as FinancialInsightsArgs);
        }

        case "budget-review": {
          return budgetReviewPrompt(promptArgs as BudgetReviewArgs);
        }

        default:
          throw new Error(`Unknown prompt: ${name}`);
      }
    } catch (error) {
      console.error(`Error getting prompt ${request.params.name}:`, error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  });
};
