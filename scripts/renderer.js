const { stringify } = require("csv-stringify/sync");
const XLSX = require('xlsx');
const fs = require('fs-extra');
const { ipcRenderer } = require('electron');
const path = require('path');
const hacerHuecos = require('./scripts/hacer-huecos.js');
const { processSecuenciacionFile } = require('./scripts/generar-venta.js');
const { processAlquilerFile, getStoredStockName } = require('./scripts/generar-alquiler.js');

const themeToggle = document.getElementById('theme-toggle');
let isDarkTheme = false;

// Eventos principales
document.addEventListener('DOMContentLoaded', initializeApp);
document.getElementById('btn-hacer-huecos').addEventListener('click', loadHacerHuecos);
document.getElementById('btn-generar-venta').addEventListener('click', loadGenerarVenta);
document.getElementById('btn-generar-alquiler').addEventListener('click', loadGenerarAlquiler);
themeToggle.addEventListener('click', toggleTheme);

// Inicialización de la aplicación
function initializeApp() {
    loadSavedTheme();
    // Aquí puedes añadir más funciones de inicialización si es necesario
}

// Gestión del tema
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('darkTheme');
    if (savedTheme !== null) {
        isDarkTheme = JSON.parse(savedTheme);
        applyTheme();
    }
}

function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    applyTheme();
    localStorage.setItem('darkTheme', isDarkTheme);
}

function applyTheme() {
    document.body.classList.toggle('dark-theme', isDarkTheme);
    themeToggle.textContent = isDarkTheme ? 'Tema Claro' : 'Tema Oscuro';
}

// Funciones de carga de interfaz
function loadHacerHuecos() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <h2>Hacer Huecos</h2>
        <div class="file-input">
            <input type="file" id="stock-file" accept=".xlsx, .xls">
            <label for="stock-file">Seleccionar archivo de stock</label>
            <p id="stock-file-name"></p>
        </div>
        <div class="file-input">
            <input type="file" id="lost-file" accept=".xlsx,.xls">
            <label for="lost-file">Seleccionar archivo de chips perdidos</label>
            <p id="lost-file-name"></p>
        </div>
        <div class="process-button">
            <button id="process-btn">Procesar</button>
        </div>    
    `;

    document.getElementById('stock-file').addEventListener('change', updateFileName);
    document.getElementById('lost-file').addEventListener('change', updateFileName);
    document.getElementById('process-btn').addEventListener('click', processHuecos);
}

function loadGenerarVenta() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <h2>Generar archivos para Venta de chips Triton</h2>
        <div class="file-input">
            <input type="file" id="secuenciacion-file" accept=".xls, .xlsx">
            <label for="secuenciacion-file">Seleccionar archivo secuenciación</label>
            <p id="secuenciacion-file-name"></p>
        </div>
        <div class="input-group">
            <label for="extended-code">Código de secuenciación extendida (0-255):</label>
            <input type="number" id="extended-code" min="0" max="255">
        </div>
        <div class="input-group">
            <label for="adjustment">Ajuste (opcional):</label>
            <input type="number" id="adjustment" value="0">
        </div>
        <div class="process-button">
            <button id="generate-btn">Generar Archivos</button>
        </div>
        <div id="file-output"></div>    
    `;

    document.getElementById('secuenciacion-file').addEventListener('change', updateFileName);
    document.getElementById('generate-btn').addEventListener('click', processSecuenciacionFile);
}

async function loadGenerarAlquiler() {
    const contentArea = document.getElementById('content-area');
    const storedStockName = await getStoredStockName();

    contentArea.innerHTML = `
        <h2>Generar archivo para Alquiler de chips Triton</h2>
        <div class="file-input">
            <input type="file" id="stock-file" accept=".xlsx, .xls">
            <label for="stock-file">Seleccionar archivo de stock</label>
            <p id="stock-file-name">${storedStockName || 'No hay archivo cargado'}</p>
        </div>
        <div class="input-group">
            <label for="client-name">Empresa:</label>
            <input type="text" id="client-name">
        </div>
        <div id="ranges-container">
            <div class="range-input">
                <input type="number" class="range-start" placeholder="Inicio">
                <input type="number" class="range-end" placeholder="Fin">
            </div>
        </div>
        <button id="add-range-btn">Añadir rango</button>
        <div class="process-button">
            <button id="generate-btn">Generar Archivo</button>
        </div>
        <div id="file-output"></div>
    `;
    
    document.getElementById('stock-file').addEventListener('change', updateFileName);
    document.getElementById('add-range-btn').addEventListener('click', addRangeInput);
    document.getElementById('generate-btn').addEventListener('click', async () => {
        const stockFile = document.getElementById('stock-file').files[0];
        try {
            await processAlquilerFile(stockFile);
        } catch (error) {
            console.error('Error al procesar el archivo de alquiler:', error);
            alert('Error al procesar el archivo de alquiler: ' + error.message);
        }
    });
}

// Funciones auxiliares
function updateFileName(event) {
    const fileInput = event.target;
    const fileName = fileInput.files[0] ? fileInput.files[0].name : '';
    const fileNameElement = document.getElementById(`${fileInput.id}-name`);
    fileNameElement.textContent = fileName;
}

function addRangeInput() {
    const container = document.getElementById('ranges-container');
    const newRange = document.createElement('div');
    newRange.className = 'range-input';
    newRange.innerHTML = `
        <input type="number" class="range-start" placeholder="Inicio">
        <input type="number" class="range-end" placeholder="Fin">
    `;
    container.appendChild(newRange);
}

function processHuecos() {
    const stockFile = document.getElementById('stock-file').files[0];
    const lostFile = document.getElementById('lost-file').files[0];
    if (stockFile && lostFile) {
        hacerHuecos.processFiles(stockFile, lostFile);
    } else {
        alert('Por favor, selecciona ambos archivos.');
    }
}

// Función para resetear campos (si es necesaria)
function resetInputFields() {
    document.getElementById('secuenciacion-file').value = '';
    document.getElementById('secuenciacion-file-name').textContent = '';
    document.getElementById('extended-code').value = '';
    document.getElementById('adjustment').value = '0';
    document.getElementById('file-output').innerHTML = '';
}