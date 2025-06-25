
export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  description: string;
  account: string;
  sourceFile: string;
  category?: string;
}

export interface FileMapping {
  fileName: string;
  headers?: string[];
  dateColumn?: number;
  amountColumn?: number;
  descriptionColumn?: number;
  accountColumn?: number;
  previewData?: any[];
  detectedColumns: string[];
  transactionCount: number;
}

export interface AccountSummary {
  account: string;
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
}
