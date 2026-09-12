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
      { id: 'cat3', name: 'Salary', group_id: 'g2' },
      { id: 'cat4', name: 'Bonus', group_id: 'g2' },
    ];

    mockCategoryGroups = [
      { id: 'g1', name: 'Living', is_income: false },
      { id: 'g2', name: 'Income', is_income: true },
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
    });

    it('should initialize categoryToGroup mapping', () => {
      expect(mapper.categoryToGroup['cat1']).toEqual({
        id: 'g1',
        name: 'Living',
        isIncome: false,
      });

      expect(mapper.categoryToGroup['cat3']).toEqual({
        id: 'g2',
        name: 'Income',
        isIncome: true,
      });
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
      });
    });

    it('should use the group income flag when the category has no income flag', () => {
      const groupInfo = mapper.getGroupInfo('cat3');
      expect(groupInfo).toEqual({
        id: 'g2',
        name: 'Income',
        isIncome: true,
      });
    });

    it('should return undefined for invalid category ID', () => {
      expect(mapper.getGroupInfo('invalid')).toBeUndefined();
      expect(mapper.getGroupInfo('')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty categories and groups', () => {
      const emptyMapper = new CategoryMapper([], []);

      expect(emptyMapper.getCategoryName('cat1')).toBe('Unknown Category');
      expect(emptyMapper.getGroupInfo('cat1')).toBeUndefined();
    });

    it('should handle category without corresponding group', () => {
      const categoriesWithoutGroup = [{ id: 'cat1', name: 'Food', group_id: 'nonexistent' }];

      const mapperWithMissingGroup = new CategoryMapper(categoriesWithoutGroup, []);

      expect(mapperWithMissingGroup.getCategoryName('cat1')).toBe('Food');
      expect(mapperWithMissingGroup.getGroupInfo('cat1')).toEqual({
        id: 'nonexistent',
        name: 'Unknown Group',
        isIncome: false,
      });
    });

    it('should prefer the group income flag over a category income flag', () => {
      const conflictingCategories = [{ id: 'cat1', name: 'Bonus', group_id: 'g1', is_income: true }];

      const conflictingGroups = [{ id: 'g1', name: 'Living', is_income: false }];

      const conflictingMapper = new CategoryMapper(conflictingCategories, conflictingGroups);

      expect(conflictingMapper.getGroupInfo('cat1')).toEqual({
        id: 'g1',
        name: 'Living',
        isIncome: false,
      });
    });
  });
});
