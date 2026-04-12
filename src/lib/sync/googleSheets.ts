import { getValidAccessToken } from '@/lib/auth/google';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export interface SheetProperties {
  title: string;
  index: number;
  sheetId: number;
  gridProperties: {
    rowCount: number;
    columnCount: number;
  };
}

export interface Spreadsheet {
  spreadsheetId: string;
  properties: {
    title: string;
  };
  sheets: Array<{
    properties: SheetProperties;
  }>;
  spreadsheetUrl: string;
}

export class GoogleSheetsService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  static async forUser(userId: string): Promise<GoogleSheetsService> {
    const token = await getValidAccessToken(userId);
    return new GoogleSheetsService(token);
  }

  private async request(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Sheets API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  async createSpreadsheet(title: string): Promise<Spreadsheet> {
    const body = {
      properties: { title },
      sheets: [
        { properties: { title: 'Metadata' } },
        { properties: { title: 'Accounts' } },
        { properties: { title: 'Categories' } },
        { properties: { title: 'Transactions' } },
        { properties: { title: 'Transfers' } },
        { properties: { title: 'Labels' } },
      ],
    };

    return this.request(SHEETS_API_BASE, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getSpreadsheet(spreadsheetId: string): Promise<Spreadsheet> {
    return this.request(`${SHEETS_API_BASE}/${spreadsheetId}`);
  }

  async getValues(
    spreadsheetId: string,
    range: string
  ): Promise<string[][]> {
    const data = await this.request(
      `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}`
    );
    return data.values || [];
  }

  async updateValues(
    spreadsheetId: string,
    range: string,
    values: unknown[][]
  ): Promise<void> {
    await this.request(
      `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        body: JSON.stringify({ values }),
      }
    );
  }

  async clearRange(spreadsheetId: string, range: string): Promise<void> {
    await this.request(
      `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}:clear`,
      {
        method: 'POST',
      }
    );
  }

  async batchUpdate(
    spreadsheetId: string,
    requests: unknown[]
  ): Promise<void> {
    await this.request(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });
  }

  async appendValues(
    spreadsheetId: string,
    range: string,
    values: unknown[][]
  ): Promise<void> {
    await this.request(
      `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        body: JSON.stringify({ values }),
      }
    );
  }
}
