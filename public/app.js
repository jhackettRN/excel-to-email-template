// Clinical Trials Email Generator - Frontend Logic

const BRAND_ORDER = [
    'ILUMYA®',
    'Bimzelx®',
    'Cosentyx®',
    'Efleira®',
    'Omvoh®',
    'Otezla®',
    'Skyrizi®',
    'Sotyktu®',
    'Taltz®',
    'Tremfya®',
    'Sonelokimab',
    'Zasocitinib'
];

document.addEventListener('DOMContentLoaded', () => {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const uploadError = document.getElementById('uploadError');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const outputContainer = document.getElementById('outputContainer');
    const statsContainer = document.getElementById('stats');
    const emailPreview = document.getElementById('emailPreview');
    const copyBtn = document.getElementById('copyBtn');
    const copyHtmlBtn = document.getElementById('copyHtmlBtn');
    const copyFeedback = document.getElementById('copyFeedback');

    // Drag and drop handling
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) processFile(e.target.files[0]);
    });

    async function processFile(file) {
        if (!file.name.match(/\.xlsx?$/i)) {
            showError('Please upload an Excel file (.xlsx or .xls)');
            return;
        }

        fileInfo.textContent = `Selected: ${file.name}`;
        fileInfo.style.display = 'block';
        uploadError.style.display = 'none';
        loadingIndicator.style.display = 'flex';
        outputContainer.style.display = 'none';

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/parse', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to process file');
            }

            const data = await response.json();
            renderOutput(data);
        } catch (err) {
            showError(err.message);
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    function showError(message) {
        uploadError.textContent = message;
        uploadError.style.display = 'block';
    }

    function renderOutput(data) {
        const { config, studies, stats } = data;

        // Render stats
        statsContainer.innerHTML = `
            <div class="stat"><div class="stat-value">${stats.totalStudies}</div><div class="stat-label">Total Studies</div></div>
            <div class="stat"><div class="stat-value">${stats.newStudies}</div><div class="stat-label">New Studies</div></div>
            <div class="stat"><div class="stat-value">${stats.updatedStudies}</div><div class="stat-label">Updated Studies</div></div>
            <div class="stat"><div class="stat-value">${stats.brandCount}</div><div class="stat-label">Brands</div></div>
        `;

        // Generate email HTML
        const emailHtml = generateEmailHtml(config, studies);
        emailPreview.innerHTML = emailHtml;

        outputContainer.style.display = 'block';
    }

    function generateEmailHtml(config, studies) {
        const month = config.Report_Month || 'December';
        const year = config.Report_Year || '2025';
        const greeting = config.Greeting || 'Good afternoon Sun Pharma team,';
        const closing = config.Closing || 'Kind regards,';
        const clientProduct = config.Client_Product || 'ILUMYA®';

        // Group studies by brand
        const grouped = {};
        studies.forEach(s => {
            const brand = s.Brand || 'Other';
            if (!grouped[brand]) grouped[brand] = [];
            grouped[brand].push(s);
        });

        // Sort brands: client product first, then alphabetical
        const sortedBrands = Object.keys(grouped).sort((a, b) => {
            if (a === clientProduct) return -1;
            if (b === clientProduct) return 1;
            return a.localeCompare(b);
        });

        let html = `<p>${greeting}</p>
<p>&nbsp;</p>
<p>Please see below the studies listed on ClinicalTrials.gov that were updated in ${month} with strategic implications for ${clientProduct}. If you wish to obtain full details for these studies, please click on the NCT number, which will take you to the ClinicalTrials.gov page for that trial. The full search output is also attached for your review. Because of the large number of updates, the studies are organized by agent below.</p>
<p>&nbsp;</p>
<p><strong>Updated studies:</strong></p>
<p>&nbsp;</p>`;

        sortedBrands.forEach(brand => {
            html += `<p><strong>${brand}</strong></p>\n`;
            
            grouped[brand].forEach(study => {
                const newTag = study.Is_New_Study ? ' [new study]' : '';
                html += `<p>${study.Study_Title}${newTag}<br>`;
                html += `<a href="${study.Study_URL}">${study.NCT_Number}</a><br>`;
                
                if (study.Phase) {
                    html += `Phase: ${study.Phase}<br>`;
                }
                html += `Study sponsor: ${study.Sponsor}<br>`;
                html += `Study status: ${study.Status}<br>`;
                html += `Start date: ${study.Start_Date}<br>`;
                
                if (study.Primary_Completion_Date) {
                    const updatedPrimary = isFieldUpdated(study, 'Primary Completion Date') ? ' [updated in ' + month + ']' : '';
                    html += `Primary completion date: ${study.Primary_Completion_Date}${updatedPrimary}<br>`;
                }
                
                if (study.Completion_Date) {
                    const updatedCompletion = isFieldUpdated(study, 'Completion Date') ? ' [updated in ' + month + ']' : '';
                    html += `Completion date: ${study.Completion_Date}${updatedCompletion}<br>`;
                }
                
                if (study.Results_First_Posted) {
                    const updatedResults = isFieldUpdated(study, 'Results First Posted') ? ' [updated in ' + month + ']' : '';
                    html += `Results posted: ${study.Results_First_Posted}${updatedResults}<br>`;
                }
                
                if (study.Strategic_Implications) {
                    html += `Strategic implications: ${study.Strategic_Implications}`;
                }
                
                html += `</p>\n<p>&nbsp;</p>\n`;
            });
        });

        html += `<p>${closing}</p>`;

        return html;
    }

    function isFieldUpdated(study, fieldName) {
        if (!study.Updated_Fields) return false;
        return study.Updated_Fields.toLowerCase().includes(fieldName.toLowerCase());
    }

    // Copy functionality
    copyBtn.addEventListener('click', async () => {
        try {
            const htmlContent = emailPreview.innerHTML;
            const plainText = emailPreview.innerText;
            
            // Create a blob with HTML content for rich paste
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({
                'text/html': blob,
                'text/plain': new Blob([plainText], { type: 'text/plain' })
            });
            
            await navigator.clipboard.write([clipboardItem]);
            showCopyFeedback();
        } catch (err) {
            // Fallback for browsers that don't support ClipboardItem
            const range = document.createRange();
            range.selectNodeContents(emailPreview);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            document.execCommand('copy');
            selection.removeAllRanges();
            showCopyFeedback();
        }
    });

    copyHtmlBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(emailPreview.innerHTML);
            showCopyFeedback();
        } catch (err) {
            console.error('Copy failed:', err);
        }
    });

    function showCopyFeedback() {
        copyFeedback.style.display = 'block';
        setTimeout(() => { copyFeedback.style.display = 'none'; }, 2000);
    }
});
