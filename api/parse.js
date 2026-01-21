const formidable = require('formidable');
const XLSX = require('xlsx');
const fs = require('fs');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const form = new formidable.IncomingForm();

        const [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) reject(err);
                else resolve([fields, files]);
            });
        });

        const file = files.file?.[0] || files.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const buffer = fs.readFileSync(file.filepath);
        const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

        // Parse Config sheet
        const config = {};
        if (workbook.SheetNames.includes('Config')) {
            const configSheet = workbook.Sheets['Config'];
            const configData = XLSX.utils.sheet_to_json(configSheet, { header: 1 });
            configData.slice(1).forEach(row => {
                if (row[0] && row[1] !== undefined) {
                    config[row[0]] = row[1];
                }
            });
        }

        // Parse Drug_Brand_Map for sort order
        const brandSortOrder = {};
        if (workbook.SheetNames.includes('Drug_Brand_Map')) {
            const mapSheet = workbook.Sheets['Drug_Brand_Map'];
            const mapData = XLSX.utils.sheet_to_json(mapSheet);
            mapData.forEach(row => {
                if (row.Brand_Name && row.Sort_Order) {
                    brandSortOrder[row.Brand_Name] = row.Sort_Order;
                }
            });
        }

        // Parse main data sheet
        const dataSheetName = workbook.SheetNames.includes('Clinical Trials Data')
            ? 'Clinical Trials Data'
            : workbook.SheetNames[0];

        const dataSheet = workbook.Sheets[dataSheetName];
        const rawData = XLSX.utils.sheet_to_json(dataSheet, { defval: '' });

        // Process studies
        const studies = rawData.map(row => ({
            Brand: row.Brand || '',
            Is_New_Study: parseBoolean(row.Is_New_Study),
            Updated_Fields: row.Updated_Fields || '',
            NCT_Number: row.NCT_Number || '',
            Study_Title: row.Study_Title || '',
            Study_URL: row.Study_URL || '',
            Phase: formatPhase(row.Phase, row.Study_Type),
            Study_Type: row.Study_Type || 'Interventional',
            Sponsor: row.Sponsor || '',
            Status: formatStatus(row.Status),
            Start_Date: formatDate(row.Start_Date),
            Primary_Completion_Date: formatDate(row.Primary_Completion_Date),
            Completion_Date: formatDate(row.Completion_Date),
            Results_First_Posted: formatDate(row.Results_First_Posted),
            Strategic_Implications: row.Strategic_Implications || '',
            _sortOrder: brandSortOrder[row.Brand] || 999
        })).filter(s => s.NCT_Number);

        // Sort by brand order
        studies.sort((a, b) => a._sortOrder - b._sortOrder);

        // Remove sort helper
        studies.forEach(s => delete s._sortOrder);

        // Calculate stats
        const brands = new Set(studies.map(s => s.Brand).filter(Boolean));
        const stats = {
            totalStudies: studies.length,
            newStudies: studies.filter(s => s.Is_New_Study).length,
            updatedStudies: studies.filter(s => s.Updated_Fields).length,
            brandCount: brands.size
        };

        return res.status(200).json({ config, studies, stats });

    } catch (error) {
        console.error('Parse error:', error);
        return res.status(500).json({ message: error.message || 'Failed to parse file' });
    }
};

function parseBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return Boolean(value);
}

function formatPhase(value, studyType) {
    // If no phase but observational study, return "Observational"
    if ((!value && value !== 0) || value === '') {
        if (studyType === 'Observational') {
            return 'Observational';
        }
        return '';
    }
    const str = String(value).replace(/\.0$/, '');
    return str;
}

function formatStatus(value) {
    if (!value) return '';
    let s = String(value);
    // Fix common formatting issues
    s = s.replace(/Active,\s*Not,\s*Recruiting/gi, 'Active, not recruiting');
    s = s.replace(/ACTIVE_NOT_RECRUITING/gi, 'Active, not recruiting');
    s = s.replace(/^RECRUITING$/i, 'Recruiting');
    s = s.replace(/^COMPLETED$/i, 'Completed');
    return s;
}

function formatDate(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Date) {
        const m = value.getMonth() + 1;
        const d = value.getDate();
        const y = value.getFullYear();
        return `${m}/${d}/${y}`;
    }
    return String(value);
}
