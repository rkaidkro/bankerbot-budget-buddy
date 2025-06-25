
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
      /^posted$/i,
      /^on$/i,
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
    
    // PRIORITY 1: Data content analysis (most reliable)
    if (data && data.length > 0) {
      console.log('Analyzing data content for column detection');
      
      // Analyze each column's data content
      const columnAnalysis = headers.map((header, index) => {
        const columnValues = data.slice(0, Math.min(10, data.length)).map(row => row[index]).filter(v => v != null);
        
        const isDateColumn = DateParser.isLikelyDateColumn(columnValues);
        const isAmountColumn = this.isLikelyAmountColumn(columnValues);
        const isDescriptionColumn = this.isLikelyDescriptionColumn(columnValues);
        
        console.log(`Column ${index} (${header}) analysis:`, {
          isDateColumn,
          isAmountColumn,
          isDescriptionColumn,
          sampleValues: columnValues.slice(0, 3)
        });
        
        return {
          index,
          header,
          isDateColumn,
          isAmountColumn,
          isDescriptionColumn,
          confidence: this.calculateConfidence(columnValues, header)
        };
      });
      
      // Find best date column based on data content
      const dateColumns = columnAnalysis
        .filter(col => col.isDateColumn)
        .sort((a, b) => b.confidence - a.confidence);
      
      if (dateColumns.length > 0) {
        columnMap.date = dateColumns[0].index;
        console.log(`Selected date column by data analysis`, { 
          header: dateColumns[0].header, 
          index: dateColumns[0].index,
          confidence: dateColumns[0].confidence
        });
      }
      
      // Find best amount column
      const amountColumns = columnAnalysis
        .filter(col => col.isAmountColumn)
        .sort((a, b) => b.confidence - a.confidence);
      
      if (amountColumns.length > 0) {
        columnMap.amount = amountColumns[0].index;
        console.log(`Selected amount column by data analysis`, { 
          header: amountColumns[0].header, 
          index: amountColumns[0].index 
        });
      }
      
      // Find best description column
      const descriptionColumns = columnAnalysis
        .filter(col => col.isDescriptionColumn && col.index !== columnMap.date && col.index !== columnMap.amount)
        .sort((a, b) => b.confidence - a.confidence);
      
      if (descriptionColumns.length > 0) {
        columnMap.description = descriptionColumns[0].index;
        console.log(`Selected description column by data analysis`, { 
          header: descriptionColumns[0].header, 
          index: descriptionColumns[0].index 
        });
      }
    }
    
    // PRIORITY 2: Header pattern matching (fallback)
    headers.forEach((header, index) => {
      const cleanHeader = header.trim().toLowerCase();
      
      for (const [field, patterns] of Object.entries(this.patterns)) {
        if (columnMap[field as keyof ColumnMapping] !== undefined) continue;
        
        for (const pattern of patterns) {
          if (pattern.test(cleanHeader)) {
            columnMap[field as keyof ColumnMapping] = index;
            console.log(`Detected ${field} column by pattern (fallback)`, { header, index, cleanHeader, pattern: pattern.source });
            break;
          }
        }
      }
    });

    // PRIORITY 3: Smart guessing based on position and content
    if (Object.keys(columnMap).length < 2) {
      this.smartGuess(headers, columnMap);
    }

    console.log('Column detection completed', { columnMap });
    return columnMap;
  }

  private static calculateConfidence(values: any[], header: string): number {
    let confidence = 0;
    
    // Base confidence on header name
    const headerLower = header.toLowerCase();
    if (headerLower.includes('date') || headerLower.includes('posted') || headerLower.includes('time')) {
      confidence += 30;
    }
    if (headerLower.includes('amount') || headerLower.includes('total') || headerLower.includes('value')) {
      confidence += 30;
    }
    if (headerLower.includes('description') || headerLower.includes('merchant') || headerLower.includes('memo')) {
      confidence += 30;
    }
    
    // Add confidence based on data content patterns
    if (values.length > 0) {
      const sampleSize = Math.min(5, values.length);
      let patternMatches = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const val = String(values[i] || '').trim();
        if (val) {
          // Date patterns
          if (DateParser.isLikelyDateColumn([val])) patternMatches += 20;
          // Amount patterns
          if (/^[-+]?[\$£€¥₹]?\d+[,.]?\d*[\$£€¥₹]?$/.test(val)) patternMatches += 20;
          // Description patterns (longer text)
          if (val.length > 10 && /[a-zA-Z]/.test(val)) patternMatches += 10;
        }
      }
      
      confidence += Math.min(patternMatches, 50);
    }
    
    return confidence;
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

  private static isLikelyDescriptionColumn(values: any[]): boolean {
    if (!values || values.length === 0) return false;
    
    let textCount = 0;
    const sampleSize = Math.min(10, values.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const value = values[i];
      if (value == null) continue;
      
      const str = String(value).trim();
      if (!str) continue;
      
      // Check for descriptive text patterns
      if (str.length > 5 && /[a-zA-Z]/.test(str) && 
          !DateParser.isLikelyDateColumn([str]) && 
          !/^[-+]?[\$£€¥₹]?\d+[,.]?\d*[\$£€¥₹]?$/.test(str)) {
        textCount++;
      }
    }
    
    return textCount / sampleSize > 0.6; // 60% should be descriptive text
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
