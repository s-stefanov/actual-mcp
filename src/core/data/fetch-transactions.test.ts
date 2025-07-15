import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchTransactionsForAccount, fetchAllOnBudgetTransactions } from "./fetch-transactions.js";
import type { Account } from "../types/domain.js";

// CRITICAL: Mock before imports
vi.mock("../../actual-api.js", () => ({
  getTransactions: vi.fn(),
}));

import { getTransactions } from "../../actual-api.js";

describe("fetchTransactionsForAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return transactions for specific account", async () => {
    const mockTransactions = [
      { id: "1", account: "acc1", date: "2023-01-01", amount: -100, payee: "Store" },
      { id: "2", account: "acc1", date: "2023-01-02", amount: -50, payee: "Gas Station" },
    ];
    vi.mocked(getTransactions).mockResolvedValue(mockTransactions);

    const result = await fetchTransactionsForAccount("acc1", "2023-01-01", "2023-01-31");

    expect(result).toEqual(mockTransactions);
    expect(getTransactions).toHaveBeenCalledWith("acc1", "2023-01-01", "2023-01-31");
  });

  it("should handle API errors", async () => {
    vi.mocked(getTransactions).mockRejectedValue(new Error("Transactions API Error"));

    await expect(fetchTransactionsForAccount("acc1", "2023-01-01", "2023-01-31"))
      .rejects.toThrow("Transactions API Error");
    expect(getTransactions).toHaveBeenCalledWith("acc1", "2023-01-01", "2023-01-31");
  });

  it("should handle empty response", async () => {
    vi.mocked(getTransactions).mockResolvedValue([]);

    const result = await fetchTransactionsForAccount("acc1", "2023-01-01", "2023-01-31");

    expect(result).toEqual([]);
    expect(getTransactions).toHaveBeenCalledWith("acc1", "2023-01-01", "2023-01-31");
  });
});

describe("fetchAllOnBudgetTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return transactions for all on-budget accounts", async () => {
    const mockAccounts: Account[] = [
      { id: "acc1", name: "Checking", offbudget: false, closed: false },
      { id: "acc2", name: "Savings", offbudget: false, closed: false },
      { id: "acc3", name: "Credit Card", offbudget: true, closed: false }, // Should be excluded
      { id: "acc4", name: "Old Account", offbudget: false, closed: true }, // Should be excluded
    ];

    const mockTransactions1 = [
      { id: "1", account: "acc1", date: "2023-01-01", amount: -100 },
    ];
    const mockTransactions2 = [
      { id: "2", account: "acc2", date: "2023-01-01", amount: -50 },
    ];

    vi.mocked(getTransactions)
      .mockResolvedValueOnce(mockTransactions1)
      .mockResolvedValueOnce(mockTransactions2);

    const result = await fetchAllOnBudgetTransactions(mockAccounts, "2023-01-01", "2023-01-31");

    expect(result).toEqual([...mockTransactions1, ...mockTransactions2]);
    expect(getTransactions).toHaveBeenCalledTimes(2);
    expect(getTransactions).toHaveBeenCalledWith("acc1", "2023-01-01", "2023-01-31");
    expect(getTransactions).toHaveBeenCalledWith("acc2", "2023-01-01", "2023-01-31");
  });

  it("should handle empty accounts array", async () => {
    const result = await fetchAllOnBudgetTransactions([], "2023-01-01", "2023-01-31");

    expect(result).toEqual([]);
    expect(getTransactions).not.toHaveBeenCalled();
  });

  it("should handle accounts with no on-budget accounts", async () => {
    const mockAccounts: Account[] = [
      { id: "acc1", name: "Credit Card", offbudget: true, closed: false },
      { id: "acc2", name: "Old Account", offbudget: false, closed: true },
    ];

    const result = await fetchAllOnBudgetTransactions(mockAccounts, "2023-01-01", "2023-01-31");

    expect(result).toEqual([]);
    expect(getTransactions).not.toHaveBeenCalled();
  });

  it("should handle API errors for individual accounts", async () => {
    const mockAccounts: Account[] = [
      { id: "acc1", name: "Checking", offbudget: false, closed: false },
    ];

    vi.mocked(getTransactions).mockRejectedValue(new Error("Transaction API Error"));

    await expect(fetchAllOnBudgetTransactions(mockAccounts, "2023-01-01", "2023-01-31"))
      .rejects.toThrow("Transaction API Error");
    expect(getTransactions).toHaveBeenCalledWith("acc1", "2023-01-01", "2023-01-31");
  });
});