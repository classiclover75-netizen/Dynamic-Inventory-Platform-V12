import ExcelJS from 'exceljs';

self.onmessage = async (event: MessageEvent) => {
  const { type, file } = event.data;
  if (type === 'excel') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error("No worksheet found");
      }

      const headers: string[] = [];
      const rows: any[] = [];
      let headerRow = worksheet.getRow(1);
      
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber] = cell.text;
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowData: any = { _id: "import_" + Date.now() + "_" + rowNumber };
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            rowData[header] = cell.text;
          }
        });
        rows.push(rowData);
      });

      self.postMessage({
        type: 'success',
        headers: headers.filter(Boolean),
        rows,
        trimmedCount: 0
      });
    } catch (e: any) {
      self.postMessage({ type: 'error', error: e.message });
    }
  }
};
