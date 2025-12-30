// writeExcel.js
const ExcelJS = require('exceljs');

async function writeExcel(filePath, sheetsData) {
    const workbook = new ExcelJS.Workbook();

    for (const [sheetName, rows] of Object.entries(sheetsData)) {
        const worksheet = workbook.addWorksheet(sheetName);
        rows.forEach(row => worksheet.addRow(row));
    }

    await workbook.xlsx.writeFile(filePath);
    console.log('File written:', filePath);
}

// Example usage:
(async () => {
    const data = {
        'Employees': [
            ['ID', 'Name', 'Email'],
            [1, 'Alice', 'alice@example.com'],
            [2, 'Bob', 'bob@example.com']
        ],
        'Departments': [
            ['ID', 'Dept Name'],
            [1, 'HR'],
            [2, 'Finance']
        ]
    };

    await writeExcel('./output.xlsx', data);
})();
