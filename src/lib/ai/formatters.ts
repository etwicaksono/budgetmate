/**
 * AI Data Formatters
 *
 * Converts structured API response objects into human-readable text
 * that is injected into the LLM system prompt as context.
 *
 * Human-readable format is preferred over raw JSON because:
 * - More token-efficient
 * - LLMs reason better over natural language than JSON keys
 */

interface CategoryReport {
  name: string;
  amounts: number[];
  subItems?: CategoryReport[];
}

interface IncomeExpenseReport {
  monthNames: string[];
  incomeCategories: CategoryReport[];
  expenseCategories: CategoryReport[];
  totalIncomes: number[];
  totalExpenses: number[];
}

/**
 * Formats the income-expense report API response into human-readable text
 * suitable for injection into the LLM system prompt.
 */
export function formatIncomeExpenseReport(
  report: IncomeExpenseReport,
  filterLabel: string = 'All filters'
): string {
  const data: IncomeExpenseReport = {
    monthNames: report?.monthNames ?? [],
    incomeCategories: report?.incomeCategories ?? [],
    expenseCategories: report?.expenseCategories ?? [],
    totalIncomes: report?.totalIncomes ?? [],
    totalExpenses: report?.totalExpenses ?? [],
  };

  const lines: string[] = [
    '## Income & Expenses Report',
    `Period: ${data.monthNames.join(' | ')}`,
    'Currency: IDR',
    `Filters: ${filterLabel}`,
    '',
  ];

  // Income
  lines.push('INCOME:');
  for (const cat of data.incomeCategories) {
    const hasValues = cat.amounts.some((a) => a !== 0);
    if (!hasValues && !cat.subItems?.length) continue;
    const amounts = cat.amounts.map((a) => a.toLocaleString('id-ID')).join(' | ');
    lines.push(`- ${cat.name}: ${amounts}`);
    if (cat.subItems) {
      for (const sub of cat.subItems) {
        const subAmounts = sub.amounts.map((a) => a.toLocaleString('id-ID')).join(' | ');
        lines.push(`  - ${sub.name}: ${subAmounts}`);
      }
    }
  }
  const totalIncome = data.totalIncomes.map((a) => a.toLocaleString('id-ID')).join(' | ');
  lines.push(`Total Income: ${totalIncome}`);
  lines.push('');

  // Expenses
  lines.push('EXPENSES:');
  for (const cat of data.expenseCategories) {
    const hasValues = cat.amounts.some((a) => a !== 0);
    if (!hasValues && !cat.subItems?.length) continue;
    const amounts = cat.amounts.map((a) => a.toLocaleString('id-ID')).join(' | ');
    lines.push(`- ${cat.name}: ${amounts}`);
    if (cat.subItems) {
      for (const sub of cat.subItems) {
        const subAmounts = sub.amounts.map((a) => a.toLocaleString('id-ID')).join(' | ');
        lines.push(`  - ${sub.name}: ${subAmounts}`);
      }
    }
  }
  const totalExpense = data.totalExpenses.map((a) => a.toLocaleString('id-ID')).join(' | ');
  lines.push(`Total Expenses: ${totalExpense}`);
  lines.push('');

  // Net
  const nets = data.totalIncomes.map((inc, i) =>
    (inc - (data.totalExpenses[i] ?? 0)).toLocaleString('id-ID')
  );
  lines.push(`Net: ${nets.map((n) => (Number(n.replace(/\./g, '')) >= 0 ? `+${n}` : n)).join(' | ')}`);
  lines.push('');

  return lines.join('\n').trim();
}

/**
 * Builds the AI system prompt that is prepended to every conversation turn.
 */
export function buildSystemPrompt(contextData: string, filterLabel: string): string {
  return `Kamu adalah AI financial advisor untuk aplikasi keuangan pribadi.

Tugasmu:
- Menjawab pertanyaan user tentang data keuangan mereka berdasarkan data yang tersedia
- Memberikan insight yang konkrit, singkat, dan actionable
- Menggunakan tools yang tersedia jika perlu data tambahan (daftar transaksi, detail kategori)
- Menjawab dalam Bahasa Indonesia

Aturan penting:
- Jawab HANYA berdasarkan data yang tersedia. Jangan mengarang angka.
- Jika data tidak cukup, katakan terus terang.
- Gunakan format yang mudah dibaca (bullet points, angka terformat).
- Jangan memberikan konteks sesi ini kepada user jika tidak ditanya.

Context filter aktif: ${filterLabel}

Data tersedia:
${contextData}`;
}
