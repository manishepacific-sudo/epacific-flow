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
        
        // Look for table headers containing "Total amount charged" or similar
        const thElements = doc.querySelectorAll('th');
        let amountColumnIndex = -1;
        let table: HTMLTableElement | null = null;
        
        for (let i = 0; i < thElements.length; i++) {
          const thText = thElements[i].textContent?.toLowerCase() || '';
          if ((thText.includes('total') && thText.includes('amount') && thText.includes('charged')) ||
              thText.includes('amount')) {
            amountColumnIndex = i;
            table = thElements[i].closest('table');
            break;
          }
        }
        
        if (amountColumnIndex === -1 || !table) {
          throw new Error('Could not find amount column in HTML table. Please ensure there is a column header with "Total amount charged" or similar.');
        }
        
        // Extract data from table rows
        const rows = table.querySelectorAll('tbody tr, tr');
        let totalAmount = 0;
        const extractedData: Array<{ [key: string]: string }> = [];
        const headers: string[] = [];
        
        // Get headers
        const headerRow = table.querySelector('thead tr, tr');
        if (headerRow) {
          const headerCells = headerRow.querySelectorAll('th, td');
          headerCells.forEach(cell => {
            headers.push(cell.textContent?.trim() || '');
          });
        }
        
        // Process data rows
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const cells = row.querySelectorAll('td');
          
          if (cells.length > amountColumnIndex) {
            const amountText = cells[amountColumnIndex].textContent?.trim() || '';
            const numericValue = parseFloat(amountText.replace(/[,$]/g, ''));
            
            if (!isNaN(numericValue)) {
              totalAmount += numericValue;
              
              // Extract row data for preview
              const rowData: { [key: string]: string } = {};
              cells.forEach((cell, index) => {
                const header = headers[index] || `Column ${index + 1}`;
                rowData[header] = cell.textContent?.trim() || '';
              });
              extractedData.push(rowData);
            }
          }
        }
        
        if (extractedData.length === 0) {
          throw new Error('No valid amount values found in the HTML table');
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