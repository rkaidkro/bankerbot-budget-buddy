
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Transaction } from '@/types/transaction';
import { logger } from '@/components/LoggingPanel';

interface ParseResult {
  transactions: Transaction[];
  fileName: string;
  detectedColumns: string[];
}

const detectColumns = (headers: string[]): { [key: string]: number } => {
  logger.info('Detecting columns from headers', { headers });
  
  const columnMap: { [key: string]: number } = {};
  
  // Common patterns for different fields
  const patterns = {
    date: /date|time|transaction.*date|posting.*date|effective.*date/i,
    amount: /amount|value|sum|total|credit|debit|transaction.*amount/i,
    description: /description|memo|details|transaction.*details|reference|particulars|narrative/i,
    account: /account|acc.*no|account.*number|account.*name/i
  };

  headers.forEach((header, index) => {
    const cleanHeader = header.trim().toLowerCase();
    
    for (const [field, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleanHeader) && !columnMap[field]) {
        columnMap[field] = index;
        logger.info(`Detected ${field} column`, { header, index, cleanHeader });
        break;
      }
    }
  });

  // If amount column not found, look for numeric columns
  if (columnMap.amount === undefined) {
    logger.warning('Amount column not found by pattern, will try to detect from data');
  }

  logger.info('Column mapping completed', { columnMap });
  return columnMap;
};

const parseAmount = (value: any): number => {
  if (typeof value === 'number') return value;
  
  const str = String(value || '').trim();
  if (!str) return 0;
  
  // Remove currency symbols and commas
  const cleaned = str.replace(/[$£€¥₹,\s]/g, '');
  
  // Handle parentheses as negative (accounting format)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    const num = parseFloat(cleaned.slice(1, -1));
    return isNaN(num) ? 0 : -num;
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const parseDate = (value: any): Date => {
  if (!value) return new Date();
  
  // Try different date formats
  const dateStr = String(value).trim();
  
  // Try parsing as-is first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try common formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,  // MM/DD/YYYY or DD/MM/YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
    /(\d{1,2})-(\d{1,2})-(\d{4})/,   // MM-DD-YYYY or DD-MM-YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
    }
  }
  
  logger.warning('Could not parse date, using current date', { originalValue: value, dateStr });
  return new Date();
};

export const parseCSV = (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    logger.info('Starting CSV parse', { fileName: file.name, fileSize: file.size });
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          logger.info('CSV parsing completed', { 
            rowCount: results.data.length, 
            errors: results.errors.length,
            meta: results.meta 
          });

          if (results.errors.length > 0) {
            logger.warning('CSV parsing errors detected', { errors: results.errors });
          }

          const headers = results.meta.fields || [];
          logger.info('CSV headers detected', { headers });
          
          if (headers.length === 0) {
            throw new Error('No headers found in CSV file');
          }

          const columnMap = detectColumns(headers);
          
          // Check if we found required columns
          if (columnMap.date === undefined && columnMap.amount === undefined) {
            logger.error('No date or amount columns detected');
            throw new Error('Could not detect date or amount columns. Please check your CSV format.');
          }

          const transactions: Transaction[] = [];
          const failedRows: any[] = [];

          (results.data as any[]).forEach((row, index) => {
            try {
              // Skip empty rows
              if (!row || Object.values(row).every(val => !val || String(val).trim() === '')) {
                return;
              }

              const transaction: Transaction = {
                id: Math.random().toString(36).substr(2, 9),
                date: columnMap.date !== undefined ? parseDate(row[headers[columnMap.date]]) : new Date(),
                amount: columnMap.amount !== undefined ? parseAmount(row[headers[columnMap.amount]]) : 0,
                description: columnMap.description !== undefined ? String(row[headers[columnMap.description]] || '') : `Transaction ${index + 1}`,
                account: columnMap.account !== undefined ? String(row[headers[columnMap.account]] || '') : file.name.replace(/\.[^/.]+$/, ''),
                sourceFile: file.name,
              };

              transactions.push(transaction);
            } catch (error) {
              logger.warning(`Failed to parse row ${index + 1}`, { row, error: error.message });
              failedRows.push({ rowIndex: index + 1, row, error: error.message });
            }
          });

          if (failedRows.length > 0) {
            logger.warning(`Failed to parse ${failedRows.length} rows`, { failedRows: failedRows.slice(0, 5) });
          }

          logger.success(`Successfully parsed ${transactions.length} transactions from CSV`, {
            fileName: file.name,
            transactionCount: transactions.length,
            failedRowCount: failedRows.length
          });

          resolve({
            transactions,
            fileName: file.name,
            detectedColumns: headers
          });
        } catch (error) {
          logger.error('Error processing CSV data', { error: error.message, fileName: file.name });
          reject(error);
        }
      },
      error: (error) => {
        logger.error('CSV parsing failed', { error: error.message, fileName: file.name });
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    });
  });
};

export const parseXLS = (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    logger.info('Starting XLS/XLSX parse', { fileName: file.name, fileSize: file.size });
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        logger.info('Workbook loaded', { sheetNames: workbook.SheetNames });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        if (!worksheet) {
          throw new Error('No worksheet found in file');
        }
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
          throw new Error('No data found in worksheet');
        }
        
        const headers = (jsonData[0] as string[]) || [];
        const dataRows = jsonData.slice(1);
        
        logger.info('XLS data extracted', { 
          headers, 
          rowCount: dataRows.length,
          sheetName: firstSheetName 
        });
        
        const columnMap = detectColumns(headers);
        
        if (columnMap.date === undefined && columnMap.amount === undefined) {
          logger.error('No date or amount columns detected in XLS');
          throw new Error('Could not detect date or amount columns. Please check your Excel format.');
        }

        const transactions: Transaction[] = [];
        const failedRows: any[] = [];

        dataRows.forEach((row: any[], index) => {
          try {
            if (!row || row.every(val => !val || String(val).trim() === '')) {
              return;
            }

            const transaction: Transaction = {
              id: Math.random().toString(36).substr(2, 9),
              date: columnMap.date !== undefined ? parseDate(row[columnMap.date]) : new Date(),
              amount: columnMap.amount !== undefined ? parseAmount(row[columnMap.amount]) : 0,
              description: columnMap.description !== undefined ? String(row[columnMap.description] || '') : `Transaction ${index + 1}`,
              account: columnMap.account !== undefined ? String(row[columnMap.account] || '') : file.name.replace(/\.[^/.]+$/, ''),
              sourceFile: file.name,
            };

            transactions.push(transaction);
          } catch (error) {
            logger.warning(`Failed to parse XLS row ${index + 1}`, { row, error: error.message });
            failedRows.push({ rowIndex: index + 1, row, error: error.message });
          }
        });

        if (failedRows.length > 0) {
          logger.warning(`Failed to parse ${failedRows.length} XLS rows`, { failedRows: failedRows.slice(0, 5) });
        }

        logger.success(`Successfully parsed ${transactions.length} transactions from XLS`, {
          fileName: file.name,
          transactionCount: transactions.length,
          failedRowCount: failedRows.length
        });

        resolve({
          transactions,
          fileName: file.name,
          detectedColumns: headers
        });
      } catch (error) {
        logger.error('Error processing XLS data', { error: error.message, fileName: file.name });
        reject(error);
      }
    };
    
    reader.onerror = () => {
      const error = 'Failed to read file';
      logger.error(error, { fileName: file.name });
      reject(new Error(error));
    };
    
    reader.readAsArrayBuffer(file);
  });
};

export const parseFile = async (file: File): Promise<ParseResult> => {
  logger.info('Starting file parse', { fileName: file.name, fileType: file.type, fileSize: file.size });
  
  const extension = file.name.toLowerCase().split('.').pop();
  
  try {
    let result: ParseResult;
    
    if (extension === 'csv' || file.type === 'text/csv') {
      result = await parseCSV(file);
    } else if (extension === 'xlsx' || extension === 'xls' || file.type.includes('spreadsheet')) {
      result = await parseXLS(file);
    } else {
      const error = `Unsupported file type: ${extension}. Please upload CSV or Excel files.`;
      logger.error(error, { fileName: file.name, extension, fileType: file.type });
      throw new Error(error);
    }
    
    logger.success('File parsing completed successfully', {
      fileName: file.name,
      transactionCount: result.transactions.length,
      detectedColumns: result.detectedColumns
    });
    
    return result;
  } catch (error) {
    logger.error('File parsing failed', { 
      fileName: file.name, 
      error: error.message,
      extension,
      fileType: file.type 
    });
    throw error;
  }
};
