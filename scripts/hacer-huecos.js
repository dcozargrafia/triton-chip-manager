const { ipcRenderer } = require('electron');
const XLSX = require('xlsx');
const { stringify } = require("csv-stringify/sync");
const path = require('path');

async function processFiles(stockFile, lostFile) {
    console.log('processFiles llamado', stockFile, lostFile);
    try {
        // Leer archivos Excel
        const stockWorkbook = XLSX.read(await stockFile.arrayBuffer(), {type: 'buffer'});
        const lostWorkbook = XLSX.read(await lostFile.arrayBuffer(), {type: 'buffer'});
    
        // Obtener la primera hoja de cada libro
        const stockSheet = stockWorkbook.Sheets[stockWorkbook.SheetNames[0]];
        const lostSheet = lostWorkbook.Sheets[lostWorkbook.SheetNames[0]];

        // Convertir el archivo de stock a array de objetos (con encabezados)
        const stockData = XLSX.utils.sheet_to_json(stockSheet);

        // Convertir el archivo de chips perdidos a array de arrays (sin encabezados)
        const lostData = XLSX.utils.sheet_to_json(lostSheet, { header: 1, defval: '' });

        // Crear un mapa de Dorsal a EPC desde stockData
        const dorsalToEPC = new Map(stockData.map(row => [row.Dorsal.toString(), row.EPC]));

        // Generar datos de salida
        const outputData = lostData.map(row => {
            const dorsal = row[0].toString();
            return {
                Dorsal: dorsal,
                EPC: dorsalToEPC.get(dorsal) || ''
            };
        }).filter(row => row.Dorsal !== ''); // Filtrar filas vacías si las hay

        // Convertir a CSV
        const csv = stringify(outputData, {
            header: true,
            columns: ['Dorsal', 'EPC'],
            delimiter: ';' 
        });

        // Solicitar al proceso principal que guarde el archivo
        const result = await ipcRenderer.invoke('save-file', csv);
        if (result.success) {
            alert(`Archivo CSV generado con éxito: ${result.filePath}`);
        } else {
            alert('Error al guardar el archivo: ' + result.error);
        }
    } catch (error) {
        console.error('Error al procesar los archivos:', error);
        alert('Error al procesar los archivos: ' + error.message);
    }
}

console.log('hacer-huecos.js cargado');

module.exports = {
    processFiles
};