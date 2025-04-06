const Crime = require('../models/Crime');
const { extractTextFromFile } = require('../services/fileParser');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 🔧 Function to run Python NLP script
const runNLP = (textToProcess) => {
  return new Promise((resolve, reject) => {
      const pyProcess = spawn('python', ['app/services/nlpService.py', 'process', textToProcess]);
      
      let output = '';
      let errorOutput = '';
      let hasCriticalError = false;

      pyProcess.stdout.on('data', (data) => {
          output += data.toString();
      });

      pyProcess.stderr.on('data', (data) => {
          const errorData = data.toString();
          errorOutput += errorData;
          
          // Check for critical errors (not just warnings)
          if (errorData.includes('Error') || 
              errorData.includes('Traceback') ||
              errorData.includes('Exception')) {
              hasCriticalError = true;
          }
      });

      pyProcess.on('close', (code) => {
          // Debug logging
          console.log('Python Process - Exit code:', code);
          console.log('Python Process - Output:', output);
          console.log('Python Process - Error Output:', errorOutput);
          
          if (code !== 0 || hasCriticalError) {
              return reject(new Error(`NLP processing failed: ${errorOutput || 'Unknown error'}`));
          }

          try {
              // Handle empty output
              if (!output.trim()) {
                  throw new Error('Python process returned empty output');
              }
              
              const result = JSON.parse(output);
              resolve(result);
          } catch (err) {
              reject(new Error(`Failed to parse NLP output: ${err.message}. Raw output: ${output}`));
          }
      });
  });
};

exports.processCrimeReport = async (req, res) => {
  try {
    let { inputMethod, source, crimeText, manualData } = req.body;
    let extractedText = '';
    let fileName = '';

    // Parse manualData if it's a string
    if (manualData && typeof manualData === 'string') {
      manualData = JSON.parse(manualData);
    }

    // Handle file upload if present
    if (req.file) {
      fileName = req.file.filename;
      extractedText = await extractTextFromFile(req.file.path);
    }

    // Prepare data for NLP processing
    let textToProcess = '';
    if (inputMethod === 'paste') {
      textToProcess = crimeText;
    } else if (inputMethod === 'upload') {
      textToProcess = extractedText;
    } else if (inputMethod === 'manual') {
      // Convert manual data to a text format for NLP
      textToProcess =
        `Crime Type: ${manualData.crimeType}\n` +
        `Victim: ${manualData.victim}\n` +
        `Suspect: ${manualData.suspect}\n` +
        `Location: ${manualData.location}\n` +
        `Date: ${manualData.date}\n` +
        `Weapon: ${manualData.weapon}\n` +
        `Description: ${manualData.description}`;
    }

    // Run Python NLP
    const nlpResults = await runNLP(textToProcess);

    // Create new crime record
    const newCrime = new Crime({
      inputMethod,
      source,
      rawText: inputMethod === 'paste' ? crimeText : undefined,
      manualData: inputMethod === 'manual' ? manualData : undefined,
      fileName: inputMethod === 'upload' ? fileName : undefined,
      extractedText: inputMethod === 'upload' ? extractedText : undefined,
      ...nlpResults
    });

    await newCrime.save();

    // Clean up uploaded file
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }

    res.status(201).json({
      success: true,
      data: newCrime,
      message: 'Crime report processed successfully'
    });
  } catch (error) {
    console.error('Error processing crime report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getCrimeReports = async (req, res) => {
  try {
    const crimes = await Crime.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: crimes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

exports.getCrimeReportById = async (req, res) => {
  try {
    const crime = await Crime.findById(req.params.id);
    if (!crime) {
      return res.status(404).json({
        success: false,
        error: 'Crime report not found'
      });
    }
    res.status(200).json({
      success: true,
      data: crime
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
