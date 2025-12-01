import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_I18N } from '../i18n';
import type { FilterFieldConfig } from '../types';
import {
  createFilter,
  createFilterGroup,
  flattenFields,
  getFieldsMap,
  getOperatorsForField,
} from '../filter-utils';

describe('filter-utils', () => {
  describe('flattenFields', () => {
    it('flattens nested groups and group-level fields', () => {
      const fields: FilterFieldConfig[] = [
        {
          key: 'status',
          label: 'Status',
          type: 'select',
        },
        {
          group: 'Meta',
          fields: [
            { key: 'tag', label: 'Tag', type: 'select' },
            { key: 'owner', label: 'Owner', type: 'text' },
          ],
        },
      ];

      const result = flattenFields(fields);
      expect(result).toHaveLength(3);
      expect(result.map((f) => f.key)).toEqual(['status', 'tag', 'owner']);
    });
  });

  describe('getFieldsMap', () => {
    it('maps keys to configurations and ignores group-only configs', () => {
      const fields: FilterFieldConfig[] = [
        { key: 'status', label: 'Status', type: 'select' },
        {
          group: 'Meta',
          fields: [{ key: 'owner', label: 'Owner', type: 'text' }],
        },
      ];

      const map = getFieldsMap(fields);
      expect(map.status?.label).toBe('Status');
      expect(map.owner?.label).toBe('Owner');
      expect(map.undefinedKey).toBeUndefined();
    });
  });

  describe('getOperatorsForField', () => {
    it('returns explicit operators when provided', () => {
      const field: FilterFieldConfig = {
        key: 'status',
        type: 'select',
        operators: [
          { value: 'custom', label: 'Custom' },
          { value: 'other', label: 'Other' },
        ],
      };

      const operators = getOperatorsForField(field, [], DEFAULT_I18N);
      expect(operators.map((op) => op.value)).toEqual(['custom', 'other']);
    });

    it('falls back to defaults based on field type and values', () => {
      const field: FilterFieldConfig = {
        key: 'status',
        type: 'select',
        options: [
          { label: 'Open', value: 'open' },
          { label: 'Closed', value: 'closed' },
        ],
      };

      const singleVal = getOperatorsForField(field, ['open'], DEFAULT_I18N);
      const multiVal = getOperatorsForField(field, ['open', 'closed'], DEFAULT_I18N);

      expect(singleVal.map((op) => op.value)).toContain('is');
      expect(multiVal[0].value).toBe('is_any_of');
    });
  });

  describe('createFilter', () => {
    const realNow = Date.now;
    const realRandom = Math.random;

    beforeEach(() => {
      Date.now = vi.fn(() => 123456789);
      Math.random = vi.fn(() => 0.42);
    });

    afterEach(() => {
      Date.now = realNow;
      Math.random = realRandom;
    });

    it('creates filter with deterministic id and defaults', () => {
      const filter = createFilter('status', undefined, ['open']);
      expect(filter).toEqual({
        id: '123456789-f4bipx4bi',
        field: 'status',
        operator: 'is',
        values: ['open'],
      });
    });
  });

  describe('createFilterGroup', () => {
    it('creates a group with provided fields and filters', () => {
      const fields: FilterFieldConfig[] = [{ key: 'status', label: 'Status', type: 'select' }];
      const group = createFilterGroup('basic', 'Basic', fields, [{ id: '1', field: 'status', operator: 'is', values: ['open'] }]);

      expect(group.id).toBe('basic');
      expect(group.label).toBe('Basic');
      expect(group.fields).toEqual(fields);
      expect(group.filters).toHaveLength(1);
    });
  });
});
