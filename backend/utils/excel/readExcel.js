// readExcel.js
const ExcelJS = require('exceljs');
const fs = require('fs');

async function readExcel(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const data = {};

    workbook.eachSheet((worksheet, sheetId) => {
        data[worksheet.name] = [];
        worksheet.eachRow((row, rowNumber) => {
            // row.values is an array starting from index 1
            data[worksheet.name].push(row.values.slice(1));
        });
    });

    return data;
}

// Example usage:
(async () => {
    const filePath = './example.xlsx';
    if (fs.existsSync(filePath)) {
        const excelData = await readExcel(filePath);
        console.log(excelData);
    } else {
        console.log('File not found:', filePath);
    }
})();
