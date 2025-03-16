import api from "@actual-app/api";
import path from "path";
import { BudgetFile } from "./types.js";

const DEFAULT_DATA_DIR: string = path.resolve(process.env.HOME || process.env.USERPROFILE || ".", ".actual");

// API initialization state
let initialized: boolean = false;
let initializing: boolean = false;
let initializationError: Error | null = null;

/**
 * Initialize the Actual Budget API
 */
export async function initActualApi(): Promise<void> {
    if (initialized) return;
    if (initializing) {
      // Wait for initialization to complete if already in progress
      while (initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (initializationError) throw initializationError;
      return;
    }
  
    try {
      initializing = true;
      console.error("Initializing Actual Budget API...");
      await api.init({
        dataDir: process.env.ACTUAL_DATA_DIR || DEFAULT_DATA_DIR,
        serverURL: process.env.ACTUAL_SERVER_URL,
        password: process.env.ACTUAL_PASSWORD,
      });
  
      const budgets: BudgetFile[] = await api.getBudgets();
      if (!budgets || budgets.length === 0) {
        throw new Error("No budgets found. Please create a budget in Actual first.");
      }
  
      // Use specified budget or the first one
      const budgetId: string = process.env.ACTUAL_BUDGET_SYNC_ID || budgets[0].cloudFileId || budgets[0].id || '';
      console.error(`Loading budget: ${budgetId}`);
      await api.downloadBudget(budgetId);
      
      initialized = true;
      console.error("Actual Budget API initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Actual Budget API:", error);
      initializationError = error instanceof Error ? error : new Error(String(error));
      throw initializationError;
    } finally {
      initializing = false;
    }
  }