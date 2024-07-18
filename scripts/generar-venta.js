const { ipcRenderer } = require('electron');
const XLSX = require('xlsx');
const { stringify } = require("csv-stringify/sync");
const path = require('path');


async function processSecuenciacionFile() {
    const secuenciacionFile = document.getElementById('secuenciacion-file').files[0];
    const extendedCode = parseInt(document.getElementById('extended-code').value);

    if (!secuenciacionFile) {
        alert('Por favor, selecciona un archivo de secuenciación.');
        return;
    }

    if (isNaN(extendedCode) || extendedCode < 1 || extendedCode > 255) {
        alert('Por favor, introduce un código de secuenciación extendida válido (1-255).');
        return;;
    }

    try {
        // Leer el archivo Excel
        const workBook = XLSX.read(await secuenciacionFile.arrayBuffer(), {type: 'buffer'});
        const sheet = workBook.Sheets[workBook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        // Convertir el código extendido a hexadecimal de 2 cifras
        const extendedCodeHex = extendedCode.toString(16).padStart(2, '0').toUpperCase();

        // Modificar los EPC
        const modifiedData = data.map(row => ({
            Dorsal: row.Dorsal,
            EPC: modifyEPC(row.EPC, extendedCodeHex),
            Chip: row.Chip
        }));

        const adjustment = parseInt(document.getElementById('adjustment').value) || 0;
        const clientData = data.map(row => ({
            Chip: row.Dorsal,
            Codigo: row.Dorsal + adjustment,
            CodigoExtendida: (65536 * extendedCode) + row.Dorsal + adjustment
        }));

        // Generar CSV modificado para secuenciación
        const csvSecuenciacion = stringify(modifiedData, {
            header: true,
            columns: ['Dorsal', 'EPC', 'Chip'],
            delimiter: ';'
        });

        // Generar CSV para el cliente
        const csvCliente = stringify(clientData, {
            header: true,
            columns: ['Chip', 'Codigo', 'CodigoExtendida'],
            delimiter: ';'
        });

        // Generar nombres de archivo sugeridos
        const suggestedFileNameSecExt = generateSuggestedFileName(secuenciacionFile, extendedCode, 'SecExt');
        const suggestedFileNameCodExt = generateSuggestedFileName(secuenciacionFile, extendedCode, 'CodExt');

        // Guardar archivos
        const resultSecExt = await ipcRenderer.invoke('save-file', csvSecuenciacion, suggestedFileNameSecExt);
        const resultCodExt = await ipcRenderer.invoke('save-file', csvCliente, suggestedFileNameCodExt);

        if (resultSecExt.success && resultCodExt.success) {
            alert(`Archivos generados con éxito:\n1. ${path.basename(resultSecExt.filePath)}\n2. ${path.basename(resultCodExt.filePath)}`);
            document.getElementById('file-output').innerHTML = `
            <p>Archivos generados con éxito:</p>
            <p>1. ${resultSecExt.filePath}</p>
            <p>2. ${resultCodExt.filePath}</p>
            `;
            resetInputFields();
        } else {
            alert('Error al guardar los archivos.');
        }
    } catch (error) {
        console.error('Error al procesar el archivo:', error);
        alert('Error al procesar el archivo: ' + error.message);
    }
}


function modifyEPC(epc, extendedCodeHex) {
    return (epc.slice(0, -4) + extendedCodeHex + 'FF').toUpperCase();
}


function generateSuggestedFileName(inputFile, extendedCode, fileType) {
    const date = new Date();
    const dateString = date.getFullYear().toString() +
                       (date.getMonth() + 1).toString().padStart(2, '0') +
                       date.getDate().toString().padStart(2, '0');
    
    let companyName = 'Empresa';
    if (inputFile && inputFile.name) {
        const fileName = inputFile.name;
        const match = fileName.match(/\d+\s(.+)\.xlsx?/);
        if (match) {
            companyName = match[1];
        }
    }
    
    return `${dateString} ${companyName} ${fileType} ${extendedCode}.csv`;
};

module.exports = {
    processSecuenciacionFile,
}