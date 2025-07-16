import { describe, it, expect, beforeEach } from 'vitest';
import { CategoryMapper } from './category-mapper.js';
import type { Category, CategoryGroup } from '../types/domain.js';

describe('CategoryMapper', () => {
  let mapper: CategoryMapper;
  let mockCategories: Category[];
  let mockCategoryGroups: CategoryGroup[];

  beforeEach(() => {
    mockCategories = [
      { id: 'cat1', name: 'Food', group_id: 'g1' },
      { id: 'cat2', name: 'Rent', group_id: 'g1' },
      { id: 'cat3', name: 'Salary', group_id: 'g2', is_income: true },
      { id: 'cat4', name: 'Bonus', group_id: 'g2', is_income: true },
      { id: 'cat5', name: 'Stocks', group_id: 'g3' },
      { id: 'cat6', name: '401k', group_id: 'g4' },
    ];

    mockCategoryGroups = [
      { id: 'g1', name: 'Living', is_income: false },
      { id: 'g2', name: 'Income', is_income: true },
      { id: 'g3', name: 'Investment', is_income: false },
      { id: 'g4', name: 'Savings', is_income: false },
    ];

    mapper = new CategoryMapper(mockCategories, mockCategoryGroups);
  });

  describe('constructor', () => {
    it('should initialize categoryNames mapping', () => {
      expect(mapper.categoryNames['cat1']).toBe('Food');
      expect(mapper.categoryNames['cat2']).toBe('Rent');
      expect(mapper.categoryNames['cat3']).toBe('Salary');
    });

    it('should initialize groupNames mapping', () => {
      expect(mapper.groupNames['g1']).toBe('Living');
      expect(mapper.groupNames['g2']).toBe('Income');
      expect(mapper.groupNames['g3']).toBe('Investment');
    });

    it('should initialize categoryToGroup mapping', () => {
      expect(mapper.categoryToGroup['cat1']).toEqual({
        id: 'g1',
        name: 'Living',
        isIncome: false,
        isSavingsOrInvestment: false,
      });

      expect(mapper.categoryToGroup['cat3']).toEqual({
        id: 'g2',
        name: 'Income',
        isIncome: true,
        isSavingsOrInvestment: false,
      });
    });

    it('should identify savings and investment categories', () => {
      expect(mapper.investmentCategories.has('cat5')).toBe(true); // Investment group
      expect(mapper.investmentCategories.has('cat6')).toBe(true); // Savings group
      expect(mapper.investmentCategories.has('cat1')).toBe(false); // Living group
    });

    it('should handle case insensitive investment/savings detection', () => {
      const mockCategoryGroupsWithCase = [
        { id: 'g1', name: 'INVESTMENT', is_income: false },
        { id: 'g2', name: 'Personal Savings', is_income: false },
        { id: 'g3', name: 'Regular Expenses', is_income: false },
      ];

      const mockCategoriesWithCase = [
        { id: 'cat1', name: 'Stocks', group_id: 'g1' },
        { id: 'cat2', name: 'Emergency Fund', group_id: 'g2' },
        { id: 'cat3', name: 'Food', group_id: 'g3' },
      ];

      const mapperWithCase = new CategoryMapper(mockCategoriesWithCase, mockCategoryGroupsWithCase);

      expect(mapperWithCase.investmentCategories.has('cat1')).toBe(true);
      expect(mapperWithCase.investmentCategories.has('cat2')).toBe(true);
      expect(mapperWithCase.investmentCategories.has('cat3')).toBe(false);
    });
  });

  describe('getCategoryName', () => {
    it('should return category name for valid category ID', () => {
      expect(mapper.getCategoryName('cat1')).toBe('Food');
      expect(mapper.getCategoryName('cat2')).toBe('Rent');
      expect(mapper.getCategoryName('cat3')).toBe('Salary');
    });

    it("should return 'Unknown Category' for invalid category ID", () => {
      expect(mapper.getCategoryName('invalid')).toBe('Unknown Category');
      expect(mapper.getCategoryName('')).toBe('Unknown Category');
    });
  });

  describe('getGroupInfo', () => {
    it('should return group info for valid category ID', () => {
      const groupInfo = mapper.getGroupInfo('cat1');
      expect(groupInfo).toEqual({
        id: 'g1',
        name: 'Living',
        isIncome: false,
        isSavingsOrInvestment: false,
      });
    });

    it('should return income group info for income category', () => {
      const groupInfo = mapper.getGroupInfo('cat3');
      expect(groupInfo).toEqual({
        id: 'g2',
        name: 'Income',
        isIncome: true,
        isSavingsOrInvestment: false,
      });
    });

    it('should return investment group info for investment category', () => {
      const groupInfo = mapper.getGroupInfo('cat5');
      expect(groupInfo).toEqual({
        id: 'g3',
        name: 'Investment',
        isIncome: false,
        isSavingsOrInvestment: true,
      });
    });

    it('should return undefined for invalid category ID', () => {
      expect(mapper.getGroupInfo('invalid')).toBeUndefined();
      expect(mapper.getGroupInfo('')).toBeUndefined();
    });
  });

  describe('isInvestmentCategory', () => {
    it('should return true for investment categories', () => {
      expect(mapper.isInvestmentCategory('cat5')).toBe(true); // Investment group
      expect(mapper.isInvestmentCategory('cat6')).toBe(true); // Savings group
    });

    it('should return false for non-investment categories', () => {
      expect(mapper.isInvestmentCategory('cat1')).toBe(false); // Living group
      expect(mapper.isInvestmentCategory('cat2')).toBe(false); // Living group
      expect(mapper.isInvestmentCategory('cat3')).toBe(false); // Income group
    });

    it('should return false for invalid category ID', () => {
      expect(mapper.isInvestmentCategory('invalid')).toBe(false);
      expect(mapper.isInvestmentCategory('')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty categories and groups', () => {
      const emptyMapper = new CategoryMapper([], []);

      expect(emptyMapper.getCategoryName('cat1')).toBe('Unknown Category');
      expect(emptyMapper.getGroupInfo('cat1')).toBeUndefined();
      expect(emptyMapper.isInvestmentCategory('cat1')).toBe(false);
    });

    it('should handle category without corresponding group', () => {
      const categoriesWithoutGroup = [{ id: 'cat1', name: 'Food', group_id: 'nonexistent' }];

      const mapperWithMissingGroup = new CategoryMapper(categoriesWithoutGroup, []);

      expect(mapperWithMissingGroup.getCategoryName('cat1')).toBe('Food');
      expect(mapperWithMissingGroup.getGroupInfo('cat1')).toEqual({
        id: 'nonexistent',
        name: 'Unknown Group',
        isIncome: false,
        isSavingsOrInvestment: false,
      });
    });

    it('should handle category marked as income but group not marked as income', () => {
      const conflictingCategories = [{ id: 'cat1', name: 'Bonus', group_id: 'g1', is_income: true }];

      const conflictingGroups = [{ id: 'g1', name: 'Living', is_income: false }];

      const conflictingMapper = new CategoryMapper(conflictingCategories, conflictingGroups);

      expect(conflictingMapper.getGroupInfo('cat1')).toEqual({
        id: 'g1',
        name: 'Living',
        isIncome: true, // Uses category's is_income flag
        isSavingsOrInvestment: false,
      });
    });
  });
});
