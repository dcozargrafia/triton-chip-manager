const XLSX = require('xlsx');
const { stringify } = require("csv-stringify/sync");
const { ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Configuración y manejo de archivos
async function getStoredStockPath() {
    return path.join(os.homedir(), '.triton-chip-manager', 'stock_config.json');
}

async function getStoredStockName() {
    const configPath = await getStoredStockPath();
    try {
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        return config.stockFileName;
    } catch (error) {
        return null;
    }
}

async function storeStockFile(file) {
    const configPath = await getStoredStockPath();
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    
    // Guardar el archivo de stock
    const stockPath = path.join(path.dirname(configPath), file.name);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(stockPath, Buffer.from(arrayBuffer));
    
    // Guardar la configuración con el nombre del archivo
    const config = { stockFileName: file.name };
    await fs.writeFile(configPath, JSON.stringify(config));
}

async function loadStoredStock() {
    const configPath = await getStoredStockPath();
    try {
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        const stockPath = path.join(path.dirname(configPath), config.stockFileName);
        return await fs.readFile(stockPath);
    } catch (error) {
        return null;
    }
}

// Procesamiento de archivos de alquiler
async function processAlquilerFile(stockFile) {
    let stockData;
    const clientName = document.getElementById('client-name').value;
    const ranges = getRanges();

    if (!clientName) {
        alert('Por favor, introduce el nombre del cliente.');
        return;
    }

    if (ranges.length === 0) {
        alert('Por favor, introduce al menos un rango de chips.');
        return;
    }

    try {
        if (stockFile) {
            // Si se ha seleccionado un nuevo archivo, guardarlo
            await storeStockFile(stockFile);
            stockData = await stockFile.arrayBuffer();
        } else {
            // Si no se ha seleccionado un nuevo archivo, intentar cargar el almacenado
            stockData = await loadStoredStock();
            if (!stockData) {
                alert('No hay archivo de stock almacenado. Por favor, selecciona un archivo.');
                return;
            }
        }

        // Procesar el archivo Excel
        const workbook = XLSX.read(stockData, {type: 'buffer'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Filtrar datos según los rangos especificados
        const filteredData = data.filter(row => isInRanges(row.Chip, ranges));

        if (filteredData.length === 0) {
            alert('No se encontraron chips en los rangos especificados.');
            return;
        }

        // Generar CSV con los datos filtrados
        const csv = stringify(filteredData, {
            header: true,
            columns: ['Chip', 'Codigo', 'CodigoExtendida'],
            delimiter: ';'
        });

        // Generar nombre de archivo sugerido y guardar
        const suggestedFileName = generateSuggestedFileName(clientName, ranges);
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


// Funciones auxiliares

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
    processAlquilerFile,
    getStoredStockName
};