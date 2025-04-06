import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  FiShare2, 
  FiDownload, 
  FiSave, 
  FiArrowLeft, 
  FiMapPin, 
  FiCalendar, 
  FiUser, 
  FiAlertCircle, 
  FiLoader,
  
  FiCheck,
  FiFile
} from 'react-icons/fi';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './../styles/main.css';

const CrimeCard = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [crimeData, setCrimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const fetchCrimeData = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5000/api/crimes/${id}`);
        if (response.data.success) {
          setCrimeData(response.data.data);
          
          if (response.data.data.description) {
            setParsedData(parseDescriptionText(response.data.data.description));
          }
        } else {
          throw new Error(response.data.error || 'Failed to fetch crime data');
        }
      } catch (err) {
        console.error('Error fetching crime data:', err);
        setError(err.message || 'An error occurred while fetching the crime report');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCrimeData();
    } else {
      setError('No crime ID provided');
      setLoading(false);
    }
  }, [id]);

  const parseDescriptionText = (description) => {
    const data = {};
    
    const crimeTypeMatch = description.match(/Crime Type:\s*([^,\n]+)/i);
    const victimMatch = description.match(/Victim:\s*([^,\n]+)/i);
    const suspectMatch = description.match(/Suspect:\s*([^,\n]+)/i);
    const locationMatch = description.match(/Location:\s*([^,\n]+)/i);
    const dateMatch = description.match(/Date:\s*([^,\n]+)/i);
    const weaponMatch = description.match(/Weapon:\s*([^,\n]+)/i);
    
    if (crimeTypeMatch) data.crimeType = crimeTypeMatch[1].trim();
    if (victimMatch) data.victim = victimMatch[1].trim();
    if (suspectMatch) data.suspect = suspectMatch[1].trim();
    if (locationMatch) data.location = locationMatch[1].trim();
    if (dateMatch) data.date = dateMatch[1].trim();
    if (weaponMatch) data.weapon = weaponMatch[1].trim();
    
    return data;
  };

  const downloadAsImage = async () => {
    if (!cardRef.current || downloading) return;
    
    try {
      setDownloading(true);
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: true,
        backgroundColor: '#1a1a2e'
      });
      
      const link = document.createElement('a');
      link.download = `crimecard-${id || 'new'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating image:', err);
      setError('Failed to generate image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const downloadAsPDF = async () => {
    if (!cardRef.current || downloading) return;
    
    try {
      setDownloading(true);
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: true,
        backgroundColor: '#1a1a2e'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`crimecard-${id || 'new'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const shareCrimeCard = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `CrimeCard: ${crimeData?.classification || 'Crime Report'}`,
          text: crimeData?.summary || 'Crime report summary',
          url: window.location.href
        });
        return;
      }
      
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error sharing:', err);
      if (err.name !== 'AbortError') {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const saveToLocalStorage = () => {
    try {
      const savedCards = JSON.parse(localStorage.getItem('savedCrimeCards') || []);
      if (!savedCards.includes(id)) {
        savedCards.push(id);
        localStorage.setItem('savedCrimeCards', JSON.stringify(savedCards));
        alert('CrimeCard saved to your collection!');
      } else {
        alert('This CrimeCard is already saved!');
      }
    } catch (err) {
      console.error('Error saving card:', err);
      setError('Failed to save CrimeCard.');
    }
};
  const getSeverityClass = (score) => {
    if (!score && score !== 0) return 'medium';
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  };

  const formatSeverityScore = (score) => {
    if (!score && score !== 0) return 'N/A';
    return `${parseFloat(score).toFixed(1)}/10`;
  };

  const getFieldValue = (fieldName, defaultText = 'Not specified') => {
    if (crimeData[fieldName] && crimeData[fieldName] !== defaultText) {
      return crimeData[fieldName];
    }
    
    if (parsedData && parsedData[fieldName]) {
      return parsedData[fieldName];
    }
    
    if (fieldName === 'victim' || fieldName === 'suspect') {
      if (crimeData.entities?.persons?.length > 0) {
        const personIndex = fieldName === 'suspect' && crimeData.entities.persons.length > 1 ? 1 : 0;
        return crimeData.entities.persons[personIndex];
      }
    } else if (fieldName === 'location') {
      if (crimeData.entities?.locations?.length > 0) {
        return crimeData.entities.locations[0];
      }
    } else if (fieldName === 'date') {
      if (crimeData.entities?.dates?.length > 0) {
        return crimeData.entities.dates[0];
      }
      return crimeData.createdAt ? new Date(crimeData.createdAt).toLocaleString() : defaultText;
    } else if (fieldName === 'weapon') {
      if (crimeData.entities?.weapons?.length > 0) {
        return crimeData.entities.weapons[0];
      }
    }
    
    return defaultText;
  };

  const getCrimeType = () => {
    if (crimeData.crimeType) return crimeData.crimeType;
    if (parsedData?.crimeType) return parsedData.crimeType;
    if (crimeData.classification) {
      return crimeData.classification.charAt(0).toUpperCase() + crimeData.classification.slice(1);
    }
    return 'Unknown Crime Type';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <FiLoader size={40} />
        </motion.div>
        <p>Loading crime information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error</h3>
        <p>{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="back-btn"
        >
          <FiArrowLeft /> Back to Home
        </button>
      </div>
    );
  }

  if (!crimeData) {
    return (
      <div className="error-container">
        <h3>Crime report not found</h3>
        <button 
          onClick={() => navigate('/')}
          className="back-btn"
        >
          <FiArrowLeft /> Back to Home
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="crimecard-container"
    >
      <button 
        onClick={() => navigate('/')}
        className="back-btn"
      >
        <FiArrowLeft /> Back to Home
      </button>
      
      <motion.div 
        className="card crime-card"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        ref={cardRef}
      >
        <div className="crimecard-header">
          <div className="header-left">
            <span className="title-highlight" style={{ fontSize: '3rem', marginRight: '0.5rem' }}>CRIME</span>
            <span className="card-font" style={{ fontSize: '3rem', position: 'relative', top: '-4px' }}>PROFILE</span>
            <div className="case-number">Case #{crimeData.caseNumber || (crimeData._id ? crimeData._id.slice(-6).toUpperCase() : 'NEW')}</div>
          </div>
          <div className={`severity-badge ${getSeverityClass(crimeData.severityScore)}`}>
            <FiAlertCircle /> {crimeData.severity || getSeverityClass(crimeData.severityScore).toUpperCase()} RISK
          </div>
        </div>
        
        <div className="crimecard-body">
          <div className="crime-type-section">
            <h3>Category : {getCrimeType()}</h3>
            <div className="status-badge">{crimeData.status || 'Under Investigation'}</div>
          </div>
          
          <div className="crime-summary">
            <p>{crimeData.summary || crimeData.description || 'No summary available.'}</p>
          </div>
          
          <div className="crime-details-grid">
            <div className="detail-item">
              <div className="detail-icon">
                <FiUser />
              </div>
              <div className="detail-content">
                <h4>Victim</h4>
                <p>{getFieldValue('victim')}</p>
              </div>
            </div>
            
            <div className="detail-item">
              <div className="detail-icon">
                <FiUser />
              </div>
              <div className="detail-content">
                <h4>Suspect</h4>
                <p>{getFieldValue('suspect')}</p>
              </div>
            </div>
            
            <div className="detail-item">
              <div className="detail-icon">
                <FiMapPin />
              </div>
              <div className="detail-content">
                <h4>Location</h4>
                <p>{getFieldValue('location')}</p>
              </div>
            </div>
            
            <div className="detail-item">
              <div className="detail-icon">
                <FiCalendar />
              </div>
              <div className="detail-content">
                <h4>Date & Time</h4>
                <p>{getFieldValue('date')}</p>
              </div>
            </div>
          </div>
          
          <div className="additional-info">
            <div className="info-item">
              <h4>Weapon Used</h4>
              <p>{getFieldValue('weapon')}</p>
            </div>
            <div className="info-item">
              <h4>Assigned Officer</h4>
              <p>{crimeData.officer || 'Not assigned'}</p>
            </div>
            <div className="info-item">
              <h4>Severity Score</h4>
              <div className="severity-meter">
                <div 
                  className="meter-fill"
                  style={{ width: `${(crimeData.severityScore || 0) * 10}%` }}
                ></div>
                <span>{formatSeverityScore(crimeData.severityScore)}</span>
              </div>
            </div>
          </div>
          
          {crimeData.entities && (
            <div className="nlp-entities">
              <h4>Identified Entities</h4>
              <div className="entities-grid">
                {crimeData.entities.persons?.length > 0 && (
                  <div className="entity-group">
                    <h5>Persons</h5>
                    <ul>
                      {crimeData.entities.persons.map((person, idx) => (
                        <li key={`person-${idx}`}>{person}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {crimeData.entities.locations?.length > 0 && (
                  <div className="entity-group">
                    <h5>Locations</h5>
                    <ul>
                      {crimeData.entities.locations.map((location, idx) => (
                        <li key={`location-${idx}`}>{location}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {crimeData.entities.dates?.length > 0 && (
                  <div className="entity-group">
                    <h5>Dates</h5>
                    <ul>
                      {crimeData.entities.dates.map((date, idx) => (
                        <li key={`date-${idx}`}>{date}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {crimeData.entities.weapons?.length > 0 && (
                  <div className="entity-group">
                    <h5>Weapons</h5>
                    <ul>
                      {crimeData.entities.weapons.map((weapon, idx) => (
                        <li key={`weapon-${idx}`}>{weapon}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {crimeData.confidence !== undefined && (
            <div className="nlp-confidence">
              <h4>Classification Confidence</h4>
              <div className="confidence-meter">
                <div 
                  className="meter-fill"
                  style={{ width: `${(crimeData.confidence || 0) * 100}%` }}
                ></div>
                <span>{(crimeData.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="crimecard-footer">
          <div className="source-info">
          <span>Source: {crimeData.source || 'System Analysis'}</span><br />
            {crimeData.classification && (
              <span className="nlp-badge">AI Classified: {crimeData.classification}</span>
            )}
          </div>
        </div>
      </motion.div>

      <div className="floating-actions">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="action-btn floating-btn"
          onClick={shareCrimeCard}
          title="Share CrimeCard"
          disabled={downloading}
        >
          {copied ? <FiCheck /> : <FiShare2 />}
          <span className="tooltip">{copied ? 'Copied!' : 'Share'}</span>
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="action-btn floating-btn"
          onClick={downloadAsImage}
          title="Download as Image"
          disabled={downloading}
        >
          {downloading ? <FiLoader className="spin" /> : <FiDownload />}
          <span className="tooltip">Download Image</span>
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="action-btn floating-btn"
          onClick={downloadAsPDF}
          title="Download as PDF"
          disabled={downloading}
        >
          {downloading ? <FiLoader className="spin" /> : <FiFile />}
          <span className="tooltip">Download PDF</span>
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="action-btn floating-btn"
          onClick={saveToLocalStorage}
          title="Save CrimeCard"
          disabled={downloading}
        >
          <FiSave />
          <span className="tooltip">Save</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default CrimeCard;