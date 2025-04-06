import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiFileText, FiEdit2, FiX, FiArrowRight } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import './../styles/main.css';

const InputForm = () => {
  const navigate = useNavigate();
  const [inputMethod, setInputMethod] = useState('manual'); // 'manual', 'paste', or 'upload'
  const [crimeText, setCrimeText] = useState('');
  const [source, setSource] = useState('');
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Manual form fields
  const [manualData, setManualData] = useState({
    crimeType: '',
    victim: '',
    suspect: '',
    location: '',
    date: '',
    weapon: '',
    description: ''
  });

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1
  });

  const handleManualChange = (e) => {
    const { name, value } = e.target;
    setManualData(prev => ({
      ...prev,
      [name]: value
    }));
  };

// Updated handleSubmit function
const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);
  
  if (!source) {
    setError('Please provide a source for attribution');
    return;
  }

  if (inputMethod === 'paste' && !crimeText.trim()) {
    setError('Please paste a crime report or choose another input method');
    return;
  }

  if (inputMethod === 'upload' && !file) {
    setError('Please upload a file or choose another input method');
    return;
  }

  if (inputMethod === 'manual' && !manualData.crimeType) {
    setError('Please provide at least a crime type for manual entry');
    return;
  }

  setIsLoading(true);

  const formData = new FormData();
  formData.append('inputMethod', inputMethod);
  formData.append('source', source);
  
  if (inputMethod === 'paste') {
    formData.append('crimeText', crimeText);
  } else if (inputMethod === 'manual') {
    formData.append('manualData', JSON.stringify(manualData));
  } else if (inputMethod === 'upload' && file) {
    formData.append('file', file);
  }

  try {
    const response = await axios.post('http://localhost:5000/api/crimes', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const crimeId = response.data.data._id;
    // Navigate to processing with crimeId
    navigate('/processing', { state: { crimeId } });
  } catch (err) {
    setError(err.response?.data?.error || err.message || 'Failed to process crime report');
  } finally {
    setIsLoading(false);
  }
};

  const removeFile = () => {
    setFile(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="form-container"
    >
      <h2>Create CrimeCard</h2>
      <p>Choose your preferred method to input crime information</p>
      
      <form onSubmit={handleSubmit}>
        {/* Input Method Selector */}
        <div className="input-method-selector">
          <button
            type="button"
            className={`method-btn ${inputMethod === 'manual' ? 'active' : ''}`}
            onClick={() => setInputMethod('manual')}
          >
            <FiEdit2 /> Manual Entry
          </button>
          <button
            type="button"
            className={`method-btn ${inputMethod === 'paste' ? 'active' : ''}`}
            onClick={() => setInputMethod('paste')}
          >
            <FiFileText /> Paste Text
          </button>
          <button
            type="button"
            className={`method-btn ${inputMethod === 'upload' ? 'active' : ''}`}
            onClick={() => setInputMethod('upload')}
          >
            <FiUpload /> Upload File
          </button>
        </div>

        {/* Manual Input Form */}
        {inputMethod === 'manual' && (
          <div className="manual-form">
            <div className="form-row">
              <div className="form-group">
                <label>Crime Type*</label>
                <input
                  type="text"
                  name="crimeType"
                  value={manualData.crimeType}
                  onChange={handleManualChange}
                  className="input-field"
                  placeholder="e.g., Robbery, Homicide"
                  required
                />
              </div>
              <div className="form-group">
                <label>Victim</label>
                <input
                  type="text"
                  name="victim"
                  value={manualData.victim}
                  onChange={handleManualChange}
                  className="input-field"
                  placeholder="Victim name(s)"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Suspect</label>
                <input
                  type="text"
                  name="suspect"
                  value={manualData.suspect}
                  onChange={handleManualChange}
                  className="input-field"
                  placeholder="Suspect name(s) or description"
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={manualData.location}
                  onChange={handleManualChange}
                  className="input-field"
                  placeholder="Crime location"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date</label>
                <input
                  type="text"
                  name="date"
                  value={manualData.date}
                  onChange={handleManualChange}
                  className="input-field"
                  placeholder="Date or time of incident"
                />
              </div>
              <div className="form-group">
                <label>Weapon</label>
                <input
                  type="text"
                  name="weapon"
                  value={manualData.weapon}
                  onChange={handleManualChange}
                  className="input-field"
                  placeholder="Weapon used (if any)"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={manualData.description}
                onChange={handleManualChange}
                className="input-field"
                rows="4"
                placeholder="Detailed description of the crime..."
              />
            </div>
          </div>
        )}

        {/* Paste Text Input */}
        {inputMethod === 'paste' && (
          <div className="paste-form">
            <textarea
              className="input-field"
              rows="10"
              placeholder="Paste crime report here..."
              value={crimeText}
              onChange={(e) => setCrimeText(e.target.value)}
            />
          </div>
        )}

        {/* File Upload Input */}
        {inputMethod === 'upload' && (
          <div className="upload-form">
            {!file ? (
              <div 
                {...getRootProps()} 
                className={`dropzone ${isDragActive ? 'active' : ''}`}
              >
                <input {...getInputProps()} />
                <div className="upload-content">
                  <FiUpload className="upload-icon" />
                  <p>Drag & drop a crime report file here, or click to select</p>
                  <p className="file-types">Supported formats: .txt, .pdf, .docx</p>
                </div>
              </div>
            ) : (
              <div className="file-preview">
                <div className="file-info">
                  <FiFileText className="file-icon" />
                  <span>{file.name}</span>
                </div>
                <button 
                  type="button" 
                  onClick={removeFile}
                  className="remove-file-btn"
                >
                  <FiX />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Source Input (required for all methods) */}
        <div className="form-group">
          <label>Source/Courtesy*</label>
          <input
            type="text"
            className="input-field"
            placeholder="News source URL or name (required for attribution)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            required
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <FiX className="error-icon" /> {error}
          </div>
        )}

        {/* Submit Button */}
        <motion.button
          type="submit"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Generate CrimeCard'} 
          {!isLoading && <FiArrowRight className="btn-icon" />}
        </motion.button>
      </form>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </motion.div>
  );
};

export default InputForm;