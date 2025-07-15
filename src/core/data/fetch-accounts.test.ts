import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAllAccounts } from "./fetch-accounts.js";

// CRITICAL: Mock before imports
vi.mock("../../actual-api.js", () => ({
  getAccounts: vi.fn(),
}));

import { getAccounts } from "../../actual-api.js";

describe("fetchAllAccounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return accounts from API", async () => {
    const mockAccounts = [
      { id: "1", name: "Test Account", type: "checking", offbudget: false, closed: false },
      { id: "2", name: "Savings Account", type: "savings", offbudget: false, closed: false },
    ];
    vi.mocked(getAccounts).mockResolvedValue(mockAccounts);

    const result = await fetchAllAccounts();

    expect(result).toEqual(mockAccounts);
    expect(getAccounts).toHaveBeenCalledOnce();
  });

  it("should handle API errors", async () => {
    vi.mocked(getAccounts).mockRejectedValue(new Error("API Error"));

    await expect(fetchAllAccounts()).rejects.toThrow("API Error");
    expect(getAccounts).toHaveBeenCalledOnce();
  });

  it("should handle empty response", async () => {
    vi.mocked(getAccounts).mockResolvedValue([]);

    const result = await fetchAllAccounts();

    expect(result).toEqual([]);
    expect(getAccounts).toHaveBeenCalledOnce();
  });
});