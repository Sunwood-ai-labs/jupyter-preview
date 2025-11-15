// Initialize
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const notebookContent = document.getElementById('notebookContent');
const errorMessage = document.getElementById('errorMessage');
let ansi_up;

// Configure marked options
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false
});

// Event listeners
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

// Drag and drop handlers
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// Handle file processing
function handleFile(file) {
    if (!file.name.endsWith('.ipynb')) {
        showError('Please select a valid .ipynb file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const notebook = JSON.parse(e.target.result);
            renderNotebook(notebook);
            hideError();
            uploadArea.style.display = 'none';
            notebookContent.classList.remove('hidden');
        } catch (error) {
            showError('Error parsing notebook file: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Render the notebook
function renderNotebook(notebook) {
    notebookContent.innerHTML = '';

    const cells = notebook.cells || [];

    cells.forEach((cell, index) => {
        const cellElement = createCell(cell, index);
        notebookContent.appendChild(cellElement);
    });

    // Apply syntax highlighting
    Prism.highlightAll();
}

// Create a cell element
function createCell(cell, index) {
    const cellDiv = document.createElement('div');
    cellDiv.className = `cell ${cell.cell_type}-cell`;

    if (cell.cell_type === 'code') {
        cellDiv.appendChild(createCodeCell(cell, index));
    } else if (cell.cell_type === 'markdown') {
        cellDiv.appendChild(createMarkdownCell(cell));
    } else if (cell.cell_type === 'raw') {
        cellDiv.appendChild(createRawCell(cell, index));
    }

    return cellDiv;
}

// Create code cell
function createCodeCell(cell, index) {
    const container = document.createElement('div');

    // Cell header
    const header = document.createElement('div');
    header.className = 'cell-header';
    header.textContent = `In [${cell.execution_count || ' '}]:`;
    container.appendChild(header);

    // Code input
    const inputDiv = document.createElement('div');
    inputDiv.className = 'cell-input';

    const codeBlock = document.createElement('div');
    codeBlock.className = 'code-block';

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.className = 'language-python';
    code.textContent = Array.isArray(cell.source) ? cell.source.join('') : cell.source;

    pre.appendChild(code);
    codeBlock.appendChild(pre);
    inputDiv.appendChild(codeBlock);
    container.appendChild(inputDiv);

    // Cell outputs
    if (cell.outputs && cell.outputs.length > 0) {
        const outputsDiv = document.createElement('div');
        outputsDiv.className = 'cell-outputs';

        const outputHeader = document.createElement('div');
        outputHeader.className = 'cell-header';
        outputHeader.textContent = `Out[${cell.execution_count || ' '}]:`;
        outputsDiv.appendChild(outputHeader);

        cell.outputs.forEach(output => {
            const outputDiv = createOutput(output);
            if (outputDiv) {
                outputsDiv.appendChild(outputDiv);
            }
        });

        container.appendChild(outputsDiv);
    }

    return container;
}

// Create markdown cell
function createMarkdownCell(cell) {
    const container = document.createElement('div');
    container.className = 'markdown-content';

    const source = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
    container.innerHTML = marked.parse(source);

    return container;
}

// Create raw cell
function createRawCell(cell, index) {
    const container = document.createElement('div');

    const header = document.createElement('div');
    header.className = 'cell-header';
    header.textContent = 'Raw Cell:';
    container.appendChild(header);

    const pre = document.createElement('pre');
    pre.className = 'output-text';
    pre.textContent = Array.isArray(cell.source) ? cell.source.join('') : cell.source;

    const wrapper = document.createElement('div');
    wrapper.className = 'cell-output';
    wrapper.appendChild(pre);
    container.appendChild(wrapper);

    return container;
}

// Create output element
function createOutput(output) {
    const outputDiv = document.createElement('div');
    outputDiv.className = 'cell-output';

    if (output.output_type === 'stream') {
        const pre = document.createElement('pre');
        pre.className = 'output-text';
        const text = Array.isArray(output.text) ? output.text.join('') : output.text;
        pre.innerHTML = ansi_up ? ansi_up.ansi_to_html(text) : text;
        outputDiv.appendChild(pre);
    } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
        if (output.data) {
            outputDiv.appendChild(createOutputData(output.data));
        }
    } else if (output.output_type === 'error') {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'output-error';

        const errorText = document.createElement('pre');
        errorText.className = 'output-text';
        const traceback = output.traceback ? output.traceback.join('\n') : '';
        errorText.innerHTML = ansi_up ? ansi_up.ansi_to_html(traceback) : traceback;

        errorDiv.appendChild(errorText);
        outputDiv.appendChild(errorDiv);
    }

    return outputDiv;
}

// Create output data
function createOutputData(data) {
    const container = document.createElement('div');

    // Priority order for output formats
    if (data['text/html']) {
        const htmlDiv = document.createElement('div');
        htmlDiv.className = 'output-html';
        const htmlContent = Array.isArray(data['text/html'])
            ? data['text/html'].join('')
            : data['text/html'];
        htmlDiv.innerHTML = htmlContent;
        container.appendChild(htmlDiv);
    } else if (data['image/png']) {
        const img = document.createElement('img');
        img.className = 'output-image';
        img.src = 'data:image/png;base64,' + data['image/png'];
        container.appendChild(img);
    } else if (data['image/jpeg']) {
        const img = document.createElement('img');
        img.className = 'output-image';
        img.src = 'data:image/jpeg;base64,' + data['image/jpeg'];
        container.appendChild(img);
    } else if (data['image/svg+xml']) {
        const svgDiv = document.createElement('div');
        svgDiv.className = 'output-html';
        const svgContent = Array.isArray(data['image/svg+xml'])
            ? data['image/svg+xml'].join('')
            : data['image/svg+xml'];
        svgDiv.innerHTML = svgContent;
        container.appendChild(svgDiv);
    } else if (data['text/plain']) {
        const pre = document.createElement('pre');
        pre.className = 'output-text';
        const text = Array.isArray(data['text/plain'])
            ? data['text/plain'].join('')
            : data['text/plain'];
        pre.textContent = text;
        container.appendChild(pre);
    } else if (data['application/json']) {
        const pre = document.createElement('pre');
        pre.className = 'output-text';
        const jsonContent = typeof data['application/json'] === 'string'
            ? data['application/json']
            : JSON.stringify(data['application/json'], null, 2);
        pre.textContent = jsonContent;
        container.appendChild(pre);
    }

    return container;
}

// Error handling
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

// Load from URL parameter
window.addEventListener('DOMContentLoaded', () => {
    // Initialize AnsiUp after DOM is loaded
    if (typeof AnsiUp !== 'undefined') {
        ansi_up = new AnsiUp();
    } else {
        console.error('AnsiUp library not loaded');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const notebookUrl = urlParams.get('url');

    if (notebookUrl) {
        loadNotebookFromUrl(notebookUrl);
    }
});

// Load notebook from URL
async function loadNotebookFromUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch notebook');
        }
        const notebook = await response.json();
        renderNotebook(notebook);
        hideError();
        uploadArea.style.display = 'none';
        notebookContent.classList.remove('hidden');
    } catch (error) {
        showError('Error loading notebook from URL: ' + error.message);
    }
}
