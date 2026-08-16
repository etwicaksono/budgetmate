import { buildDebtLabelWhereConditions } from '../debtLabelFilters';

describe('buildDebtLabelWhereConditions', () => {
  it('returns no conditions when neither list is provided', () => {
    expect(buildDebtLabelWhereConditions(null, null)).toEqual([]);
    expect(buildDebtLabelWhereConditions(undefined, undefined)).toEqual([]);
  });

  it('ignores empty strings and lists made only of separators', () => {
    expect(buildDebtLabelWhereConditions('', ',,')).toEqual([]);
  });

  it('matches debts carrying any of the included labels', () => {
    expect(buildDebtLabelWhereConditions('lbl1,lbl2', null)).toEqual([
      { labels: { some: { label_id: { in: ['lbl1', 'lbl2'] } } } }
    ]);
  });

  it('drops debts carrying any of the excluded labels', () => {
    expect(buildDebtLabelWhereConditions(null, 'lbl3')).toEqual([
      { labels: { none: { label_id: { in: ['lbl3'] } } } }
    ]);
  });

  it('keeps include and exclude as separate AND entries so neither overwrites the other', () => {
    expect(buildDebtLabelWhereConditions('lbl1', 'lbl2')).toEqual([
      { labels: { some: { label_id: { in: ['lbl1'] } } } },
      { labels: { none: { label_id: { in: ['lbl2'] } } } }
    ]);
  });

  it('caps each list at 50 entries', () => {
    const many = Array.from({ length: 60 }, (_, i) => `id${i}`).join(',');

    const [include, exclude] = buildDebtLabelWhereConditions(many, many) as Array<{
      labels: { some?: { label_id: { in: string[] } }; none?: { label_id: { in: string[] } } };
    }>;

    expect(include!.labels.some!.label_id.in).toHaveLength(50);
    expect(exclude!.labels.none!.label_id.in).toHaveLength(50);
  });
});
