import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FiActivity, FiSearch, FiDatabase } from 'react-icons/fi';
import './../styles/main.css';

const ProcessingScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Get crimeId from location state
    const crimeId = location.state?.crimeId;
    
    // Simulate processing time
    const timer = setTimeout(() => {
      // If we have a crimeId, navigate to the specific crimecard
      if (crimeId) {
        navigate(`/crimecard/${crimeId}`);
      } else {
        // Fallback to main crimecard route if no ID (this shouldn't happen in normal flow)
        console.warn('No crime ID found in state, navigating to default crimecard route');
        navigate('/crimecard');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, location]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="processing-container scanner-animation"
    >
      <div className="processing-content">
        {/* <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          style={{ fontSize: '3rem', marginBottom: 'rem' }}
        >
          <FiActivity />
        </motion.div> */}
        <h2>Analyzing Crime Report</h2>
        <p>Scanning evidence and extracting key information...</p>
        
        <div className="processing-steps">
          <div className="processing-step">
            <FiSearch className="step-icon" />
            <span>Identifying entities</span>
          </div>
          <div className="processing-step">
            <FiDatabase className="step-icon" />
            <span>Classifying crime type</span>
          </div>
          <div className="processing-step">
            <FiActivity className="step-icon" />
            <span>Calculating severity</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProcessingScreen;