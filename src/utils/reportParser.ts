import Papa from 'papaparse';
import { ParsedReportData } from '@/types';

export const parseCSVReport = (file: File): Promise<ParsedReportData> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as Array<{ [key: string]: string }>;
          
          if (!data || data.length === 0) {
            throw new Error('No data found in CSV file');
          }

          // Find the column with "TOTAL_AMOUNT_CHARGED" or similar
          const headers = Object.keys(data[0]);
          const amountColumn = headers.find(header => 
            header.toLowerCase().includes('total') && 
            header.toLowerCase().includes('amount') &&
            header.toLowerCase().includes('charged')
          ) || headers.find(header => 
            header.toLowerCase().includes('amount')
          );

          if (!amountColumn) {
            throw new Error('Could not find amount column in CSV. Please ensure there is a column with "TOTAL_AMOUNT_CHARGED" or similar.');
          }

          // Calculate total amount
          let totalAmount = 0;
          const validRows = data.filter(row => {
            const value = row[amountColumn];
            if (!value || value.trim() === '') return false;
            
            const numericValue = parseFloat(value.replace(/[,$]/g, ''));
            if (!isNaN(numericValue)) {
              totalAmount += numericValue;
              return true;
            }
            return false;
          });

          if (validRows.length === 0) {
            throw new Error('No valid amount values found in the CSV file');
          }

          resolve({
            amount: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
            preview: data.slice(0, 5), // First 5 rows for preview
            headers: headers
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      }
    });
  });
};

export const parseHTMLReport = (file: File): Promise<ParsedReportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const htmlContent = e.target?.result as string;
        
        // Create a temporary DOM element to parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        
        // Look for tables first
        const tables = doc.querySelectorAll('table');
        
        if (tables.length === 0) {
          throw new Error('No tables found in the HTML file');
        }
        
        let bestMatch: {
          table: HTMLTableElement;
          amountColumnIndex: number;
          headers: string[];
        } | null = null;
        
        // Try each table to find one with amount data
        for (const table of Array.from(tables)) {
          const thElements = table.querySelectorAll('th');
          const headers: string[] = [];
          let amountColumnIndex = -1;
          
          // Get headers from th elements
          thElements.forEach((th, index) => {
            const headerText = th.textContent?.trim() || '';
            headers.push(headerText);
            console.log(`Header ${index}: "${headerText}"`);
          });
          
          // Find the exact "Total amount charged" column first
          headers.forEach((header, index) => {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('total') && 
                lowerHeader.includes('amount') && 
                lowerHeader.includes('charged')) {
              amountColumnIndex = index;
              console.log(`Found exact match for "Total amount charged" at index ${index}`);
            }
          });
          
          // If no exact match, look for other amount-related columns
          if (amountColumnIndex === -1) {
            headers.forEach((header, index) => {
              const lowerHeader = header.toLowerCase();
              if (lowerHeader.includes('amount') || 
                  lowerHeader.includes('total') || 
                  lowerHeader.includes('price') ||
                  lowerHeader.includes('cost') ||
                  lowerHeader.includes('value') ||
                  lowerHeader.includes('charged') ||
                  lowerHeader.includes('fee') ||
                  lowerHeader.includes('payment')) {
                amountColumnIndex = index;
                console.log(`Found fallback amount column "${header}" at index ${index}`);
              }
            });
          }
          
          // If no th elements, try first row td elements as headers
          if (headers.length === 0) {
            const firstRow = table.querySelector('tr');
            if (firstRow) {
              const cells = firstRow.querySelectorAll('td');
              cells.forEach((cell, index) => {
                const headerText = cell.textContent?.trim() || '';
                headers.push(headerText);
                console.log(`Header from first row ${index}: "${headerText}"`);
              });
              
              // Find the exact "Total amount charged" column first
              headers.forEach((header, index) => {
                const lowerHeader = header.toLowerCase();
                if (lowerHeader.includes('total') && 
                    lowerHeader.includes('amount') && 
                    lowerHeader.includes('charged')) {
                  amountColumnIndex = index;
                  console.log(`Found exact match for "Total amount charged" at index ${index}`);
                }
              });
              
              // If no exact match, look for other amount-related columns
              if (amountColumnIndex === -1) {
                headers.forEach((header, index) => {
                  const lowerHeader = header.toLowerCase();
                  if (lowerHeader.includes('amount') || 
                      lowerHeader.includes('total') || 
                      lowerHeader.includes('price') ||
                      lowerHeader.includes('cost') ||
                      lowerHeader.includes('value') ||
                      lowerHeader.includes('charged') ||
                      lowerHeader.includes('fee') ||
                      lowerHeader.includes('payment')) {
                    amountColumnIndex = index;
                    console.log(`Found fallback amount column "${header}" at index ${index}`);
                  }
                });
              }
            }
          }
          
          // If still no amount column found, try to find numeric data in any column
          if (amountColumnIndex === -1) {
            console.log('No amount column found by header, trying to find numeric columns...');
            const rows = table.querySelectorAll('tr');
            for (let colIndex = 0; colIndex < headers.length; colIndex++) {
              let numericCount = 0;
              let sampleValues = [];
              for (let rowIndex = 1; rowIndex < Math.min(rows.length, 6); rowIndex++) { // Check first 5 data rows
                const cells = rows[rowIndex].querySelectorAll('td');
                if (cells[colIndex]) {
                  const cellText = cells[colIndex].textContent?.trim() || '';
                  const cleaned = cellText.replace(/[,$₹\s€£¥]/g, '');
                  if (!isNaN(parseFloat(cleaned)) && cleaned.length > 0) {
                    numericCount++;
                    sampleValues.push(cellText);
                  }
                }
              }
              console.log(`Column ${colIndex} (${headers[colIndex]}): ${numericCount} numeric values, samples: ${sampleValues.slice(0,3).join(', ')}`);
              // If most values in this column are numeric, consider it as amount column
              if (numericCount >= Math.min(3, rows.length - 1)) {
                amountColumnIndex = colIndex;
                console.log(`Using column ${colIndex} as amount column based on numeric content`);
                break;
              }
            }
          }
          
          if (amountColumnIndex !== -1) {
            bestMatch = { table, amountColumnIndex, headers };
            break;
          }
        }
        
        if (!bestMatch) {
          throw new Error('Could not find a table with numeric amount data. Please ensure your HTML contains a table with monetary values.');
        }
        
        const { table, amountColumnIndex, headers } = bestMatch;
        
        // Extract data from table rows
        const rows = table.querySelectorAll('tr');
        let totalAmount = 0;
        const extractedData: Array<{ [key: string]: string }> = [];
        
        // Process data rows (skip header row)
        const startIndex = table.querySelector('thead') ? 0 : 1; // Skip first row if no thead
        
        console.log(`Processing HTML table with ${rows.length} rows, amount column index: ${amountColumnIndex}`);
        console.log(`Amount column header: ${headers[amountColumnIndex]}`);
        
        for (let i = startIndex; i < rows.length; i++) {
          const row = rows[i];
          const cells = row.querySelectorAll('td');
          
          // Skip rows that don't have enough cells or are header rows
          if (cells.length <= amountColumnIndex) continue;
          
          const amountText = cells[amountColumnIndex].textContent?.trim() || '';
          
          // Skip empty cells or cells that look like headers
          if (!amountText || amountText.toLowerCase().includes('total') || 
              amountText.toLowerCase().includes('amount') || 
              amountText.toLowerCase().includes('charged')) {
            continue;
          }
          
          // More flexible number extraction - handle various currency formats
          const cleaned = amountText.replace(/[,$₹\s€£¥]/g, '').replace(/[()]/g, '');
          const numericValue = parseFloat(cleaned);
          
          if (!isNaN(numericValue) && numericValue > 0) {
            console.log(`Adding amount: ${amountText} -> ${numericValue}`);
            totalAmount += numericValue;
            
            // Extract row data for preview
            const rowData: { [key: string]: string } = {};
            cells.forEach((cell, index) => {
              const header = headers[index] || `Column ${index + 1}`;
              rowData[header] = cell.textContent?.trim() || '';
            });
            extractedData.push(rowData);
          } else {
            console.log(`Skipping invalid amount: ${amountText}`);
          }
        }
        
        console.log(`Final calculated total: ${totalAmount}`);
        
        if (extractedData.length === 0) {
          throw new Error('No valid numeric amount values found in the HTML table. Please check that your table contains monetary data.');
        }
        
        resolve({
          amount: Math.round(totalAmount * 100) / 100,
          preview: extractedData.slice(0, 5),
          headers: headers
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read HTML file'));
    };
    
    reader.readAsText(file);
  });
};

export const parseReport = async (file: File): Promise<ParsedReportData> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  switch (fileExtension) {
    case 'csv':
      return parseCSVReport(file);
    case 'html':
    case 'htm':
      return parseHTMLReport(file);
    default:
      throw new Error('Unsupported file format. Please upload a CSV or HTML file.');
  }
};