
// Advanced date parsing utilities for various CSV formats
export class DateParser {
  // Common date patterns and their parsing functions
  private static patterns = [
    // ISO formats
    { regex: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/, format: 'iso' },
    { regex: /^\d{4}-\d{2}-\d{2}/, format: 'yyyy-mm-dd' },
    
    // US formats
    { regex: /^\d{1,2}\/\d{1,2}\/\d{4}/, format: 'mm/dd/yyyy' },
    { regex: /^\d{1,2}-\d{1,2}-\d{4}/, format: 'mm-dd-yyyy' },
    
    // AU/UK formats
    { regex: /^\d{1,2}\/\d{1,2}\/\d{4}/, format: 'dd/mm/yyyy' },
    { regex: /^\d{1,2}-\d{1,2}-\d{4}/, format: 'dd-mm-yyyy' },
    
    // Other common formats
    { regex: /^\d{2}\.\d{2}\.\d{4}/, format: 'dd.mm.yyyy' },
    { regex: /^\d{4}\.\d{2}\.\d{2}/, format: 'yyyy.mm.dd' },
    
    // Text months
    { regex: /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i, format: 'dd-mmm-yyyy' },
    { regex: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i, format: 'mmm-dd-yyyy' },
    
    // Excel serial dates (common in exports)
    { regex: /^\d{5}$/, format: 'excel-serial' },
    
    // Multi-column date formats (common in banking CSVs)
    { regex: /^\d{1,2}$/, format: 'day-only' },
    { regex: /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i, format: 'month-only' },
    { regex: /^\d{4}$/, format: 'year-only' },
  ];

  static parseDate(value: any): Date {
    if (!value) return new Date();
    
    // If already a Date object
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? new Date() : value;
    }

    const str = String(value).trim();
    if (!str) return new Date();

    // Try direct parsing first
    const directParse = new Date(str);
    if (!isNaN(directParse.getTime()) && directParse.getFullYear() > 1900) {
      return directParse;
    }

    // Try each pattern
    for (const pattern of this.patterns) {
      if (pattern.regex.test(str)) {
        const parsed = this.parseWithFormat(str, pattern.format);
        if (parsed && !isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }

    // Try common separators
    const separators = ['/', '-', '.', ' '];
    for (const sep of separators) {
      if (str.includes(sep)) {
        const parts = str.split(sep).map(p => p.trim());
        if (parts.length >= 3) {
          const parsed = this.tryDateParts(parts);
          if (parsed && !isNaN(parsed.getTime())) {
            return parsed;
          }
        }
      }
    }

    console.warn(`Could not parse date: "${str}"`);
    return new Date();
  }

  private static parseWithFormat(str: string, format: string): Date | null {
    try {
      switch (format) {
        case 'iso':
          return new Date(str);
        
        case 'yyyy-mm-dd':
          const [y1, m1, d1] = str.split('-').map(Number);
          return new Date(y1, m1 - 1, d1);
        
        case 'mm/dd/yyyy':
        case 'mm-dd-yyyy':
          const sep1 = str.includes('/') ? '/' : '-';
          const [m2, d2, y2] = str.split(sep1).map(Number);
          return new Date(y2, m2 - 1, d2);
        
        case 'dd/mm/yyyy':
        case 'dd-mm-yyyy':
          const sep2 = str.includes('/') ? '/' : '-';
          const [d3, m3, y3] = str.split(sep2).map(Number);
          return new Date(y3, m3 - 1, d3);
        
        case 'dd.mm.yyyy':
          const [d4, m4, y4] = str.split('.').map(Number);
          return new Date(y4, m4 - 1, d4);
        
        case 'yyyy.mm.dd':
          const [y5, m5, d5] = str.split('.').map(Number);
          return new Date(y5, m5 - 1, d5);
        
        case 'excel-serial':
          // Excel serial date (days since 1900-01-01)
          const serial = parseInt(str);
          const excelEpoch = new Date(1900, 0, 1);
          return new Date(excelEpoch.getTime() + (serial - 2) * 24 * 60 * 60 * 1000);
        
        default:
          return new Date(str);
      }
    } catch {
      return null;
    }
  }

  private static tryDateParts(parts: string[]): Date | null {
    const nums = parts.map(p => parseInt(p)).filter(n => !isNaN(n));
    if (nums.length < 3) return null;

    // Try different arrangements
    const arrangements = [
      [nums[2], nums[1] - 1, nums[0]], // yyyy, mm, dd
      [nums[2], nums[0] - 1, nums[1]], // yyyy, mm, dd
      [nums[0], nums[1] - 1, nums[2]], // yyyy, mm, dd (if first is year)
    ];

    for (const [year, month, day] of arrangements) {
      if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return null;
  }

  // Detect if a column likely contains dates
  static isLikelyDateColumn(values: any[]): boolean {
    if (!values || values.length === 0) return false;
    
    let dateCount = 0;
    const sampleSize = Math.min(10, values.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const value = values[i];
      if (!value) continue;
      
      const str = String(value).trim();
      if (!str) continue;
      
      // Skip obvious non-date patterns
      if (str.length > 50 || /^[a-zA-Z\s-]+$/.test(str)) continue;
      
      // Check if it matches common date patterns
      for (const pattern of this.patterns) {
        if (pattern.regex.test(str)) {
          dateCount++;
          break;
        }
      }
      
      // Also check if it parses as a valid date
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
        dateCount++;
      }
    }
    
    return dateCount / sampleSize > 0.7; // 70% of samples should be dates
  }

  // Handle multi-column date scenarios (e.g., separate day, month, year columns)
  static parseCombinedDate(dayValue: any, monthValue: any, yearValue?: any): Date {
    const day = parseInt(String(dayValue || '').trim());
    const month = this.parseMonth(monthValue);
    const year = yearValue ? parseInt(String(yearValue).trim()) : new Date().getFullYear();
    
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month - 1, day);
    }
    
    return new Date();
  }
  
  private static parseMonth(monthValue: any): number {
    const str = String(monthValue || '').trim().toLowerCase();
    
    // Numeric month
    const num = parseInt(str);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      return num;
    }
    
    // Month names
    const months = [
      'jan', 'feb', 'mar', 'apr', 'may', 'jun',
      'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
    ];
    
    for (let i = 0; i < months.length; i++) {
      if (str.startsWith(months[i])) {
        return i + 1;
      }
    }
    
    return NaN;
  }
}
