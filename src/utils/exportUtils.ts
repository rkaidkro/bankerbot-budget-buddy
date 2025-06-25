
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Transaction } from '@/types/transaction';

export const exportToExcel = (transactions: Transaction[], filename: string = 'bankerbot-export.xlsx') => {
  const exportData = transactions.map(t => ({
    Date: t.date.toLocaleDateString(),
    Amount: t.amount,
    Description: t.description,
    Account: t.account,
    'Source File': t.sourceFile,
    Category: t.category || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  saveAs(data, filename);
};

export const importFromExcel = (file: File): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets['Transactions'];
        
        if (!worksheet) {
          reject(new Error('No Transactions sheet found'));
          return;
        }
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const transactions: Transaction[] = jsonData.map((row: any, index) => ({
          id: Math.random().toString(36).substr(2, 9),
          date: new Date(row.Date),
          amount: parseFloat(row.Amount) || 0,
          description: row.Description || '',
          account: row.Account || '',
          sourceFile: row['Source File'] || '',
          category: row.Category || undefined
        }));
        
        resolve(transactions);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};
