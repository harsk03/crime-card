//crimecard-backend\app\services\fileParser.js
const fs = require('fs');
const path = require('path');
const { PythonShell } = require('python-shell');

exports.extractTextFromFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    if (ext === '.txt') {
      return fs.promises.readFile(filePath, 'utf8');
    } else if (ext === '.pdf' || ext === '.docx') {
      // Use Python script to extract text
      const options = {
        mode: 'text',
        pythonPath: process.env.PYTHON_PATH || 'python3',
        pythonOptions: ['-u'], // unbuffered output
        scriptPath: path.join(__dirname),
        args: ['extract', filePath]
      };

      const results = await PythonShell.run('nlpService.py', options);
      return results.join('\n');
    } else {
      throw new Error('Unsupported file format');
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw error;
  }
};