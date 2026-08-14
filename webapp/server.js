const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'names.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize names.json if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Endpoint to get all registered names
app.get('/api/names', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data file' });
        }
        res.json(JSON.parse(data));
    });
});

// Endpoint to register a new name
app.post('/api/names', (req, res) => {
    const { name } = req.body;
    
    if (!name || name.length < 4) {
        return res.status(400).json({ error: 'Name must be at least 4 characters long' });
    }

    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read data file' });
        }
        
        const names = JSON.parse(data);
        names.push({
            name,
            timestamp: new Date().toISOString()
        });
        
        fs.writeFile(DATA_FILE, JSON.stringify(names, null, 4), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to write data file' });
            }
            res.json({ success: true, message: 'Name registered successfully' });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
