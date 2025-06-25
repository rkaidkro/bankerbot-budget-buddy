
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Transaction } from '@/types/transaction';
import { logger } from '@/components/LoggingPanel';
import { DateParser } from './dateParser';
import { ColumnDetector } from './columnDetector';

interface ParseResult {
  transactions: Transaction[];
  fileName: string;
  detectedColumns: string[];
}

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

export const parseCSV = (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    logger.info('Starting CSV parse', { fileName: file.name, fileSize: file.size });
    
    Papa.parse(file, {
      header: false, // Parse as arrays to get better control
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

          const rows = results.data as string[][];
          if (rows.length === 0) {
            throw new Error('No data found in CSV file');
          }

          // First row should be headers
          const headers = rows[0];
          const dataRows = rows.slice(1);
          
          logger.info('CSV headers detected', { headers });
          
          if (headers.length === 0) {
            throw new Error('No headers found in CSV file');
          }

          // Enhanced column detection with data analysis
          const columnMap = ColumnDetector.detectColumns(headers, dataRows.slice(0, 10));
          
          // Check if we found required columns
          if (columnMap.date === undefined && columnMap.amount === undefined) {
            logger.error('No date or amount columns detected');
            throw new Error('Could not detect date or amount columns. Please check your CSV format.');
          }

          const transactions: Transaction[] = [];
          const failedRows: any[] = [];

          dataRows.forEach((row, index) => {
            try {
              // Skip empty rows
              if (!row || row.every(val => !val || String(val).trim() === '')) {
                return;
              }

              // Parse date with enhanced logic
              let transactionDate = new Date();
              if (columnMap.date !== undefined) {
                const dateValue = row[columnMap.date];
                transactionDate = DateParser.parseDate(dateValue);
                
                // Log parsing issues for debugging
                if (String(dateValue).trim() && transactionDate.getTime() === new Date().getTime()) {
                  logger.warning('Date parsing fallback used', { 
                    originalValue: dateValue, 
                    rowIndex: index + 1,
                    columnIndex: columnMap.date 
                  });
                }
              }

              const transaction: Transaction = {
                id: Math.random().toString(36).substr(2, 9),
                date: transactionDate,
                amount: columnMap.amount !== undefined ? parseAmount(row[columnMap.amount]) : 0,
                description: columnMap.description !== undefined ? String(row[columnMap.description] || '') : `Transaction ${index + 1}`,
                account: columnMap.account !== undefined ? String(row[columnMap.account] || '') : file.name.replace(/\.[^/.]+$/, ''),
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
            failedRowCount: failedRows.length,
            columnMapping: columnMap
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
        const dataRows = jsonData.slice(1) as any[][];
        
        logger.info('XLS data extracted', { 
          headers, 
          rowCount: dataRows.length,
          sheetName: firstSheetName 
        });
        
        // Enhanced column detection
        const columnMap = ColumnDetector.detectColumns(headers, dataRows.slice(0, 10));
        
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

            // Enhanced date parsing
            let transactionDate = new Date();
            if (columnMap.date !== undefined) {
              const dateValue = row[columnMap.date];
              transactionDate = DateParser.parseDate(dateValue);
              
              if (String(dateValue).trim() && transactionDate.getTime() === new Date().getTime()) {
                logger.warning('XLS Date parsing fallback used', { 
                  originalValue: dateValue, 
                  rowIndex: index + 1,
                  columnIndex: columnMap.date 
                });
              }
            }

            const transaction: Transaction = {
              id: Math.random().toString(36).substr(2, 9),
              date: transactionDate,
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
          failedRowCount: failedRows.length,
          columnMapping: columnMap
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
