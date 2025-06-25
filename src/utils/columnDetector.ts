
import { DateParser } from './dateParser';

interface ColumnMapping {
  date?: number;
  amount?: number;
  description?: number;
  account?: number;
}

export class ColumnDetector {
  // Enhanced patterns for better column detection
  private static patterns = {
    date: [
      /^(transaction\s*)?date$/i,
      /^(posting\s*|posted\s*)?date$/i,
      /^effective\s*date$/i,
      /^value\s*date$/i,
      /^settlement\s*date$/i,
      /^process\s*date$/i,
      /^date$/i,
      /^time$/i,
      /^timestamp$/i,
      /^when$/i,
      /^dated$/i,
    ],
    amount: [
      /^amount$/i,
      /^value$/i,
      /^sum$/i,
      /^total$/i,
      /^credit$/i,
      /^debit$/i,
      /^transaction\s*amount$/i,
      /^net\s*amount$/i,
      /^gross\s*amount$/i,
      /^balance$/i,
      /^money$/i,
      /^\$$/,
      /^aud$/i,
      /^usd$/i,
      /^gbp$/i,
      /^eur$/i,
    ],
    description: [
      /^description$/i,
      /^memo$/i,
      /^details$/i,
      /^transaction\s*details$/i,
      /^reference$/i,
      /^particulars$/i,
      /^narrative$/i,
      /^merchant$/i,
      /^payee$/i,
      /^vendor$/i,
      /^supplier$/i,
      /^comment$/i,
      /^note$/i,
      /^remarks$/i,
    ],
    account: [
      /^account$/i,
      /^acc\s*no$/i,
      /^account\s*number$/i,
      /^account\s*name$/i,
      /^bank$/i,
      /^institution$/i,
      /^source$/i,
      /^from$/i,
      /^to$/i,
    ]
  };

  static detectColumns(headers: string[], data: any[][] = []): ColumnMapping {
    console.log('Enhanced column detection starting', { headers });
    
    const columnMap: ColumnMapping = {};
    
    // First pass: exact pattern matching
    headers.forEach((header, index) => {
      const cleanHeader = header.trim().toLowerCase();
      
      for (const [field, patterns] of Object.entries(this.patterns)) {
        if (columnMap[field as keyof ColumnMapping] !== undefined) continue;
        
        for (const pattern of patterns) {
          if (pattern.test(cleanHeader)) {
            columnMap[field as keyof ColumnMapping] = index;
            console.log(`Detected ${field} column by pattern`, { header, index, cleanHeader, pattern: pattern.source });
            break;
          }
        }
      }
    });

    // Second pass: data analysis for missing columns
    if (data && data.length > 0) {
      // Analyze date columns if not found
      if (columnMap.date === undefined) {
        headers.forEach((header, index) => {
          const columnValues = data.map(row => row[index]).filter(v => v != null);
          if (DateParser.isLikelyDateColumn(columnValues)) {
            columnMap.date = index;
            console.log(`Detected date column by data analysis`, { header, index });
          }
        });
      }

      // Analyze amount columns if not found
      if (columnMap.amount === undefined) {
        headers.forEach((header, index) => {
          const columnValues = data.map(row => row[index]).filter(v => v != null);
          if (this.isLikelyAmountColumn(columnValues)) {
            columnMap.amount = index;
            console.log(`Detected amount column by data analysis`, { header, index });
          }
        });
      }
    }

    // Third pass: smart guessing based on position and content
    if (Object.keys(columnMap).length < 2) {
      this.smartGuess(headers, columnMap);
    }

    console.log('Column detection completed', { columnMap });
    return columnMap;
  }

  private static isLikelyAmountColumn(values: any[]): boolean {
    if (!values || values.length === 0) return false;
    
    let numericCount = 0;
    const sampleSize = Math.min(10, values.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const value = values[i];
      if (value == null) continue;
      
      const str = String(value).trim();
      if (!str) continue;
      
      // Check for currency symbols and numeric patterns
      if (/^[-+]?[\$£€¥₹]?\d{1,3}(,\d{3})*(\.\d{2})?[\$£€¥₹]?$/.test(str) ||
          /^[-+]?\d+(\.\d{1,2})?$/.test(str) ||
          /^\(\d+(\.\d{2})?\)$/.test(str)) { // Accounting format
        numericCount++;
      }
    }
    
    return numericCount / sampleSize > 0.8; // 80% should be numeric
  }

  private static smartGuess(headers: string[], columnMap: ColumnMapping) {
    console.log('Smart guessing missing columns');
    
    // Common patterns for guessing
    const likely = {
      date: headers.findIndex(h => /date|time|when|posted|on/i.test(h)),
      amount: headers.findIndex(h => /amount|total|value|sum|\$|money|credit|debit/i.test(h)),
      description: headers.findIndex(h => /desc|memo|detail|merchant|payee|reference|particular/i.test(h)),
      account: headers.findIndex(h => /account|acc|bank|source|from/i.test(h))
    };

    // Apply guesses for missing columns
    Object.entries(likely).forEach(([field, index]) => {
      if (index >= 0 && columnMap[field as keyof ColumnMapping] === undefined) {
        columnMap[field as keyof ColumnMapping] = index;
        console.log(`Smart guessed ${field} column`, { header: headers[index], index });
      }
    });
  }
}
