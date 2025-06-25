
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Transaction, FileMapping } from '@/types/transaction';

const generateId = () => Math.random().toString(36).substr(2, 9);

const detectDateColumn = (headers: string[]): number => {
  const dateKeywords = ['date', 'transaction date', 'posting date', 'value date', 'created'];
  return headers.findIndex(header => 
    dateKeywords.some(keyword => 
      header.toLowerCase().includes(keyword.toLowerCase())
    )
  );
};

const detectAmountColumn = (headers: string[]): number => {
  const amountKeywords = ['amount', 'value', 'transaction amount', 'debit', 'credit', 'balance'];
  return headers.findIndex(header => 
    amountKeywords.some(keyword => 
      header.toLowerCase().includes(keyword.toLowerCase())
    )
  );
};

const detectDescriptionColumn = (headers: string[]): number => {
  const descKeywords = ['description', 'details', 'memo', 'reference', 'transaction details', 'payee'];
  return headers.findIndex(header => 
    descKeywords.some(keyword => 
      header.toLowerCase().includes(keyword.toLowerCase())
    )
  );
};

const detectAccountColumn = (headers: string[]): number => {
  const accountKeywords = ['account', 'card', 'account number', 'source'];
  return headers.findIndex(header => 
    accountKeywords.some(keyword => 
      header.toLowerCase().includes(keyword.toLowerCase())
    )
  );
};

const parseDate = (dateStr: string): Date => {
  // Try multiple date formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
    /(\d{1,2})-(\d{1,2})-(\d{4})/,   // DD-MM-YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const [, p1, p2, p3] = match;
      // Try different interpretations
      const date1 = new Date(parseInt(p3), parseInt(p1) - 1, parseInt(p2));
      const date2 = new Date(parseInt(p1), parseInt(p2) - 1, parseInt(p3));
      
      if (!isNaN(date1.getTime())) return date1;
      if (!isNaN(date2.getTime())) return date2;
    }
  }
  
  // Fallback to native Date parsing
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const parseAmount = (amountStr: string): number => {
  // Remove currency symbols and spaces, handle parentheses for negative
  const cleaned = amountStr.toString()
    .replace(/[$€£¥,\s]/g, '')
    .replace(/[()]/g, '');
  
  const isNegative = amountStr.includes('(') || amountStr.includes('-');
  const amount = parseFloat(cleaned) || 0;
  
  return isNegative ? -Math.abs(amount) : amount;
};

export const parseCSV = (file: File): Promise<FileMapping> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const data = results.data;
        
        const mapping: FileMapping = {
          fileName: file.name,
          headers,
          dateColumn: detectDateColumn(headers),
          amountColumn: detectAmountColumn(headers),
          descriptionColumn: detectDescriptionColumn(headers),
          accountColumn: detectAccountColumn(headers),
          previewData: data.slice(0, 5)
        };
        
        resolve(mapping);
      },
      error: (error) => reject(error)
    });
  });
};

export const parseXLS = (file: File): Promise<FileMapping> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          reject(new Error('Empty spreadsheet'));
          return;
        }
        
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1).map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = (row as any[])[index] || '';
          });
          return obj;
        });
        
        const mapping: FileMapping = {
          fileName: file.name,
          headers,
          dateColumn: detectDateColumn(headers),
          amountColumn: detectAmountColumn(headers),
          descriptionColumn: detectDescriptionColumn(headers),
          accountColumn: detectAccountColumn(headers),
          previewData: dataRows.slice(0, 5)
        };
        
        resolve(mapping);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const convertMappingToTransactions = (
  mapping: FileMapping,
  rawData: any[]
): Transaction[] => {
  const accountName = mapping.fileName.replace(/\.(csv|xls|xlsx)$/i, '');
  
  return rawData.map((row, index) => {
    const dateValue = mapping.dateColumn !== undefined ? row[mapping.headers[mapping.dateColumn]] : '';
    const amountValue = mapping.amountColumn !== undefined ? row[mapping.headers[mapping.amountColumn]] : '0';
    const descValue = mapping.descriptionColumn !== undefined ? row[mapping.headers[mapping.descriptionColumn]] : '';
    const accountValue = mapping.accountColumn !== undefined ? row[mapping.headers[mapping.accountColumn]] : accountName;
    
    return {
      id: generateId(),
      date: parseDate(dateValue),
      amount: parseAmount(amountValue),
      description: descValue || 'Unknown Transaction',
      account: accountValue || accountName,
      sourceFile: mapping.fileName
    };
  }).filter(t => t.date && !isNaN(t.amount));
};
