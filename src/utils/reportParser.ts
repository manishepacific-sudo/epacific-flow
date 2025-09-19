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
        
        console.log(`Found ${tables.length} tables in HTML`);
        
        if (tables.length === 0) {
          throw new Error('No tables found in the HTML file');
        }
        
        // Debug: log all table content first
        tables.forEach((table, tableIndex) => {
          console.log(`=== TABLE ${tableIndex} CONTENT ===`);
          const allRows = table.querySelectorAll('tr');
          allRows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td, th');
            const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim() || '');
            console.log(`Row ${rowIndex}: [${cellTexts.join(' | ')}]`);
          });
        });
        
        let bestMatch: {
          table: HTMLTableElement;
          amountColumnIndex: number;
          headers: string[];
        } | null = null;
        
        // Try each table to find one with amount data
        for (const table of Array.from(tables)) {
          console.log('=== Examining table ===');
          const allRows = table.querySelectorAll('tr');
          console.log(`Table has ${allRows.length} rows`);
          
          let headers: string[] = [];
          let amountColumnIndex = -1;
          let headerRowIndex = -1;
          
          // First, try to find headers in th elements
          const thElements = table.querySelectorAll('th');
          if (thElements.length > 0) {
            thElements.forEach((th, index) => {
              const headerText = th.textContent?.trim() || '';
              headers.push(headerText);
              console.log(`TH Header ${index}: "${headerText}"`);
            });
            headerRowIndex = 0;
          } else {
            // No th elements, examine all rows to find the header row
            console.log('No TH elements found, examining all rows for headers...');
            
            for (let rowIndex = 0; rowIndex < Math.min(allRows.length, 3); rowIndex++) {
              const row = allRows[rowIndex];
              const cells = row.querySelectorAll('td');
              const rowHeaders: string[] = [];
              
              console.log(`Row ${rowIndex} has ${cells.length} cells:`);
              cells.forEach((cell, cellIndex) => {
                const cellText = cell.textContent?.trim() || '';
                rowHeaders.push(cellText);
                console.log(`  Cell ${cellIndex}: "${cellText}"`);
              });
              
              // Check if this row contains "Total amount charged" or similar headers
              const hasAmountHeader = rowHeaders.some(header => {
                const lower = header.toLowerCase();
                return (lower.includes('total') && lower.includes('amount') && lower.includes('charged')) ||
                       lower.includes('amount') || lower.includes('total') || lower.includes('charged') ||
                       lower.includes('price') || lower.includes('cost') || lower.includes('fee');
              });
              
              if (hasAmountHeader) {
                headers = rowHeaders;
                headerRowIndex = rowIndex;
                console.log(`Found header row at index ${rowIndex}`);
                break;
              }
            }
            
            // If no headers found, use first row as headers
            if (headers.length === 0 && allRows.length > 0) {
              const firstRow = allRows[0];
              const cells = firstRow.querySelectorAll('td');
              cells.forEach((cell, index) => {
                const headerText = cell.textContent?.trim() || '';
                headers.push(headerText);
              });
              headerRowIndex = 0;
              console.log('Using first row as headers');
            }
          }
          
          // Now find the amount column in the headers
          console.log('Final headers:', headers);
          
          // First priority: exact match for "Total amount charged"
          headers.forEach((header, index) => {
            const lowerHeader = header.toLowerCase();
            if (lowerHeader.includes('total') && 
                lowerHeader.includes('amount') && 
                lowerHeader.includes('charged')) {
              amountColumnIndex = index;
              console.log(`Found exact match for "Total amount charged" at index ${index}: "${header}"`);
            }
          });
          
          // Second priority: any amount-related column
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
                console.log(`Found amount-related column "${header}" at index ${index}`);
              }
            });
          }
          
          // Last resort: find columns with mostly numeric data (but skip obvious date/ID columns)
          if (amountColumnIndex === -1 && headers.length > 0) {
            console.log('No amount column found by header, analyzing numeric content...');
            
            for (let colIndex = 0; colIndex < headers.length; colIndex++) {
              const header = headers[colIndex].toLowerCase();
              
              // Skip columns that are obviously not amounts
              if (header.includes('date') || header.includes('id') || header.includes('ref') ||
                  header.includes('time') || header.includes('desc') || header.includes('merchant')) {
                console.log(`Skipping column ${colIndex} (${headers[colIndex]}) - not amount-related`);
                continue;
              }
              
              let numericCount = 0;
              let totalValue = 0;
              const sampleValues: string[] = [];
              
              // Check data rows (skip header row)
              for (let rowIndex = headerRowIndex + 1; rowIndex < Math.min(allRows.length, headerRowIndex + 6); rowIndex++) {
                const cells = allRows[rowIndex].querySelectorAll('td');
                if (cells[colIndex]) {
                  const cellText = cells[colIndex].textContent?.trim() || '';
                  const cleaned = cellText.replace(/[,$₹\s€£¥]/g, '');
                  const numValue = parseFloat(cleaned);
                  
                  if (!isNaN(numValue) && numValue > 0) {
                    numericCount++;
                    totalValue += numValue;
                    sampleValues.push(cellText);
                  }
                }
              }
              
              console.log(`Column ${colIndex} (${headers[colIndex]}): ${numericCount} numeric values, total: ${totalValue}, samples: ${sampleValues.slice(0,3).join(', ')}`);
              
              // Only consider this column if it has meaningful amounts (not just small numbers like dates)
              if (numericCount >= 2 && totalValue > 100) { // Assume real amounts are > 100
                amountColumnIndex = colIndex;
                console.log(`Selected column ${colIndex} as amount column`);
                break;
              }
            }
          }
          
          if (amountColumnIndex !== -1) {
            bestMatch = { table, amountColumnIndex, headers };
            console.log(`Selected table with amount column at index ${amountColumnIndex}`);
            break;
          } else {
            console.log('No suitable amount column found in this table');
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