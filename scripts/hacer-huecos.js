const { ipcRenderer } = require('electron');
const XLSX = require('xlsx');
const { stringify } = require("csv-stringify/sync");
const path = require('path');


async function processFiles(stockFile, lostFile) {
    console.log('processFiles llamado', stockFile, lostFile);
    // Aquí va la lógica de procesamiento
    // console.log('Procesando archivos: ', stockFile.name, lostFile.name);
    // alert(`Procesando archivos: \n${stockFile.name}\n${lostFile.name}`);
    try {
        // Leer archivos Excel
        const stockWorkbook = XLSX.read(await stockFile.arrayBuffer(), {type: 'buffer'});
        const lostWorkbook = XLSX.read(await lostFile.arrayBuffer(), {type: 'buffer'});
    
        // Obtener la primera hoja de cada libro
        const stockSheet = stockWorkbook.Sheets[stockWorkbook.SheetNames[0]];
        const lostSheet = lostWorkbook.Sheets[lostWorkbook.SheetNames[0]];

        // Convertir las hojas en arrays de objetos
        const stockData = XLSX.utils.sheet_to_json(stockSheet);
        const lostData = XLSX.utils.sheet_to_json(lostSheet);

        // Crear un mapa de Dorsal a EPC desde stockData
        const dorsalToEPC = new Map(stockData.map(row => [row.Dorsal.toString(), row.EPC]));

        // Generar datos de salida
        const outputData = lostData.map(row => {
            const dorsal = Object.values(row)[0].toString(); 
            return {
                Dorsal: dorsal,
                EPC: dorsalToEPC.get(dorsal) || ''
            };
        });

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
};

console.log('hacer-huecos.js cargado');

module.exports = {
    processFiles
};