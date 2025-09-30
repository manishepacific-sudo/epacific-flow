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
        
        // Look for tables
        const tables = doc.querySelectorAll('table');
        console.log(`Found ${tables.length} tables in HTML`);
        
        if (tables.length === 0) {
          throw new Error('No tables found in the HTML file');
        }
        
        let totalAmount = 0;
        let extractedData: Array<{ [key: string]: string }> = [];
        let foundValidTable = false;
        
        // Check each table for the "Total amount charged" column
        for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
          const table = tables[tableIndex];
          console.log(`\n=== PROCESSING TABLE ${tableIndex} ===`);
          
          // Get all rows
          const rows = table.querySelectorAll('tr');
          console.log(`Table ${tableIndex} has ${rows.length} rows`);
          
          if (rows.length < 2) {
            console.log(`Table ${tableIndex}: Too few rows, skipping`);
            continue;
          }
          
          // Find header row and the "Total amount charged" column
          let headerRow: HTMLTableRowElement | null = null;
          let headers: string[] = [];
          let amountColumnIndex = -1;
          
          for (let rowIndex = 0; rowIndex < Math.min(rows.length, 3); rowIndex++) {
            const row = rows[rowIndex];
            const thCells = row.querySelectorAll('th');
            const tdCells = row.querySelectorAll('td');
            const cells = thCells.length > 0 ? thCells : tdCells;
            
            if (cells.length === 0) continue;
            
            const rowHeaders = Array.from(cells).map(cell => cell.textContent?.trim() || '');
            console.log(`Table ${tableIndex}, Row ${rowIndex}: Found ${rowHeaders.length} columns`);
            
            // Check if this row contains "Total amount charged"
            const totalAmountIndex = rowHeaders.findIndex(header => 
              header.toLowerCase().trim() === 'total amount charged'
            );
            
            if (totalAmountIndex !== -1) {
              console.log(`Found "Total amount charged" in table ${tableIndex}, row ${rowIndex}, column ${totalAmountIndex}`);
              headerRow = row;
              headers = rowHeaders;
              amountColumnIndex = totalAmountIndex;
              break;
            }
          }
          
          if (amountColumnIndex === -1) {
            console.log(`Table ${tableIndex}: No "Total amount charged" column found`);
            continue;
          }
          
          console.log(`Table ${tableIndex}: Processing data with amount column at index ${amountColumnIndex}`);
          console.log(`Table ${tableIndex}: Amount column header: "${headers[amountColumnIndex]}"`);
          
          // Process data rows
          let tableTotal = 0;
          const tableData: Array<{ [key: string]: string }> = [];
          
          for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            
            // Skip the header row
            if (row === headerRow) {
              console.log(`Table ${tableIndex}, Row ${rowIndex}: Skipping header row`);
              continue;
            }
            
            const cells = row.querySelectorAll('td');
            
            if (cells.length <= amountColumnIndex) {
              console.log(`Table ${tableIndex}, Row ${rowIndex}: Not enough cells (${cells.length} vs ${amountColumnIndex + 1}), skipping`);
              continue;
            }
            
            const amountText = cells[amountColumnIndex].textContent?.trim() || '';
            
            // Skip empty or header-like cells
            if (!amountText || 
                amountText.toLowerCase().includes('total') || 
                amountText.toLowerCase().includes('amount') || 
                amountText.toLowerCase().includes('charged')) {
              console.log(`Table ${tableIndex}, Row ${rowIndex}: Skipping header-like or empty cell: "${amountText}"`);
              continue;
            }
            
            // Parse amount
            const cleaned = amountText.replace(/[,$₹\s€£¥]/g, '');
            const numericValue = parseFloat(cleaned);
            
            if (!isNaN(numericValue) && numericValue >= 0) {
              console.log(`Table ${tableIndex}, Row ${rowIndex}: Adding amount "${amountText}" -> ${numericValue} to total`);
              tableTotal += numericValue;
              
              // Extract row data
              const rowData: { [key: string]: string } = {};
              cells.forEach((cell, cellIndex) => {
                const header = headers[cellIndex] || `Column ${cellIndex + 1}`;
                rowData[header] = cell.textContent?.trim() || '';
              });
              tableData.push(rowData);
            } else {
              console.log(`Table ${tableIndex}, Row ${rowIndex}: Invalid amount "${amountText}" (cleaned: "${cleaned}")`);
            }
          }
          
          if (tableData.length > 0) {
            console.log(`Table ${tableIndex}: Found ${tableData.length} valid rows with total amount: ${tableTotal}`);
            totalAmount = tableTotal;
            extractedData = tableData;
            foundValidTable = true;
            break;
          }
        }
        
        if (!foundValidTable) {
          throw new Error('Could not find a table with "Total amount charged" column and valid numeric data.');
        }
        
        console.log(`Final calculated total: ${totalAmount}`);
        
        resolve({
          amount: Math.round(totalAmount * 100) / 100,
          preview: extractedData.slice(0, 5),
          headers: extractedData.length > 0 ? Object.keys(extractedData[0]) : []
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