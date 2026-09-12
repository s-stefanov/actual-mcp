import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { GetPromptRequestSchema, ListPromptsRequestSchema, GetPromptResult } from '@modelcontextprotocol/sdk/types.js';
import { FinancialInsightsArgs, BudgetReviewArgs } from './types.js';
import { getDateRange } from './utils.js';

export const promptsSchema = [
  {
    name: 'financial-insights',
    description: 'Generate financial insights and advice',
    arguments: [
      {
        name: 'startDate',
        description: 'Start date in YYYY-MM-DD format',
        required: false,
      },
      {
        name: 'endDate',
        description: 'End date in YYYY-MM-DD format',
        required: false,
      },
    ],
  },
  {
    name: 'budget-review',
    description: 'Review my budget and spending',
    arguments: [
      {
        name: 'months',
        description: 'Number of months to analyze',
        required: false,
      },
    ],
  },
  {
    name: 'actual-cleanup',
    description: 'Analyze budget for cleanup opportunities',
  },
];

const financialInsightsPrompt = (args: FinancialInsightsArgs): GetPromptResult => {
  const { startDate, endDate } = args || {};
  const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

  return {
    description: `Financial insights and recommendations from ${start} to ${end}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please analyze my financial data and provide insights and recommendations. Focus on spending patterns, savings rate, and potential areas to optimize my budget. Analyze data from ${start} to ${end}.

Use the reports' income and expense classifications from Actual category-group metadata. Savings equals income minus expenses; use the reported savings rate.

You can use these tools to gather the data you need:
1. Use the spending-by-category tool to analyze my spending breakdown
2. Use the monthly-summary tool to get my income, expenses, and savings rate
3. Use the get-transactions tool to examine specific transactions if needed

Based on this analysis, please provide:
1. A summary of my financial situation, including savings
2. Key insights about my spending patterns
3. Areas where I might be overspending
4. Recommendations to optimize my budget while maintaining or increasing savings
5. Any other relevant financial advice
`,
        },
      },
    ],
  };
};

const budgetReviewPrompt = (args: BudgetReviewArgs): GetPromptResult => {
  const { months = 3 } = args || {};

  return {
    description: `Budget review for the past ${months} months`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please review my budget and spending for the past ${months} months. I'd like to understand how well I'm sticking to my budget and where I might be able to make adjustments.
    
Use the reports' income and expense classifications from Actual category-group metadata. Savings equals income minus expenses; use the reported savings rate.

To gather this data:
1. Use the spending-by-category tool to see my spending breakdown
2. Use the monthly-summary tool to get my overall income and expenses
3. Use the get-transactions tool if you need to look at specific transactions

Please provide:
1. An analysis of my top spending categories
2. Whether my spending is consistent month-to-month
3. My savings rate
4. Areas where I might be able to reduce discretionary spending
5. Suggestions for realistic budget adjustments to maximize savings
`,
        },
      },
    ],
  };
};

const actualCleanupPrompt = (): GetPromptResult => {
  return {
    description: 'Analyze budget for cleanup opportunities',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Please review my budget structure and suggest cleanup or maintenance actions. Focus on simplifying and organizing the following resources:

1. **Payees**: Identify potential duplicate payees (e.g., same name or same transfer account), payees that are no longer in use (not used in any transaction for 6+ months), or those with unclear names.

2. **Rules**: Look for transaction rules that are:
   - Not used (e.g., haven't matched any transactions recently)
   - Duplicates (identical or overlapping conditions and actions)
   - Possibly too broad or too specific to be useful

3. **Categories & Category Groups**:
   - Find empty categories or category groups
   - Highlight overlapping or unclear category names
   - Suggest merging or removing underused categories

4. **Optional - Accounts**: Suggest closing or archiving any inactive or zero-balance accounts that haven't been used recently.

You can use these tools to gather the necessary data:
- \`get-payees\`
- \`get-rules\`
- \`get-grouped-categories\`
- \`get-transactions\` (for checking recent activity)
- \`get-accounts\` (optional, for inactive accounts)

Please provide:
1. A list of cleanup suggestions with a short explanation for each
2. Group suggestions by type (payees, rules, categories, etc.)
3. Prioritize suggestions that will improve clarity, reduce clutter, or prevent confusion in future budgeting
4. Any additional advice to help maintain a tidy and understandable budget structure going forward
`,
        },
      },
    ],
  };
};

// ----------------------------
// PROMPTS
// ----------------------------

export const setupPrompts = (server: Server): void => {
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
        case 'financial-insights': {
          return financialInsightsPrompt(promptArgs as FinancialInsightsArgs);
        }

        case 'budget-review': {
          return budgetReviewPrompt(promptArgs as unknown as BudgetReviewArgs);
        }

        case 'actual-cleanup': {
          return actualCleanupPrompt();
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
