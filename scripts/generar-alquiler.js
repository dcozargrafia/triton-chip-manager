const XLSX = require('xlsx');
const { stringify } = require("csv-stringify/sync");
const { ipcRenderer } = require('electron');
const path = require('path');

async function processAlquilerFile() {
    const stockFile = document.getElementById('stock-file').files[0];
    const clientName = document.getElementById('client-name').value;
    const ranges = getRanges();

    if (!stockFile) {
        alert('Por favor, selecciona un archivo de stock.');
        return;
    }

    if (!clientName) {
        alert('Por favor, introduce el nombre del cliente.');
        return;
    }

    if (ranges.length === 0) {
        alert('Por favor, introduce al menos un rango de chips.');
        return;
    }

    try {
        // Leer archivo Excel
        const workbook = XLSX.read(await stockFile.arrayBuffer(), {type: 'buffer'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Filtrar datos según los rangos
        const filteredData = data.filter(row => isInRanges(row.Chip, ranges));

        // Generar CSV
        const csv = stringify(filteredData, {
            header: true,
            columns: ['Chip', 'Codigo', 'CodigoExtendida'],
            delimiter: ';'
        });

        // Generar nombre de archivo sugerido
        const suggestedFileName = generateSuggestedFileName(clientName, ranges);

        // Guardar archivo
        const result = await ipcRenderer.invoke('save-file', csv, suggestedFileName);

        if (result.success) {
            alert(`Archivo CSV generado con éxito: ${result.filePath}`);
            document.getElementById('file-output').innerHTML = `
            <p>Archivo de alquiler generado con éxito:</p>
            <p>${result.filePath}</p>
            `;
        } else {
            alert('Error al guardar el archivo: ' + result.error);
        }
    } catch (error) {
        console.error('Error al procesar el archivo:', error);
        alert('Error al procesar el archivo: ' + error.message);
    }
}

function getRanges() {
    const rangeInputs = document.querySelectorAll('.range-input');
    return Array.from(rangeInputs).map(rangeInput => {
        const start = parseInt(rangeInput.querySelector('.range-start').value);
        const end = parseInt(rangeInput.querySelector('.range-end').value);
        return { start, end };
    }).filter(range => !isNaN(range.start) && !isNaN(range.end));
}

function isInRanges(chip, ranges) {
    return ranges.some(range => chip >= range.start && chip <= range.end);
}

function generateSuggestedFileName(clientName, ranges) {
    const date = new Date();
    const dateString = date.getFullYear().toString() +
                       (date.getMonth() + 1).toString().padStart(2, '0') +
                       date.getDate().toString().padStart(2, '0');
    
    const rangesString = ranges.map(range => `${range.start}-${range.end}`).join(' & ');
    
    return `${dateString} ${clientName} (${rangesString}).csv`;
}

module.exports = {
    processAlquilerFile
};