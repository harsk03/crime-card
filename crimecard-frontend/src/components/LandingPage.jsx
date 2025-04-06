import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiSearch, FiAlertTriangle, FiClock } from 'react-icons/fi';
import FeaturesSection from './FeaturesSection';
import HowItWorks from './HowItWorks';
import Testimonials from './Testimonials';
import logo from '../assets/images/logo.png';
import './../styles/main.css';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* <div className="crime-tape-decoration"></div> */}
            <h1 className="hero-title">
              <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '0.1rem' }}>
              <img
                src={logo}
                alt="Logo"
                style={{
                  width: '100px',
                  height: '100px',
                  transform: 'translateY(10px)' // pushes logo slightly down
                }}
              />
              
              <span className="title-highlight" style={{ fontSize: '3rem', marginRight: '0.4rem' }}>CRIME</span>
              
              <span className="card-font" style={{ fontSize: '3rem', position: 'relative', top: '5px' }}>CARD</span>
              </span>
            </h1>
            <p className="hero-subtitle">We read the scene, keep it clean.</p>
            <p className="hero-description">
              Transform lengthy crime reports into concise, visually striking profile cards in seconds. 
              The ultimate tool for law enforcement, journalists, and crime analysts.
            </p>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 2 }}
              className="hero-cta"
            >
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 8px 15px rgba(233, 69, 96, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary"
                onClick={() => navigate('/input')}
              >
                Generate CrimeCard <FiArrowRight />
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
        
        <motion.div 
          className="hero-image"
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 1.8 }}
        >
          <div className="crime-card-preview">
            <div className="preview-header">
              <span className="preview-badge">Homicide</span>
              <span className="preview-severity high">High Severity</span>
            </div>
            <div className="preview-content">
              <div className="preview-entity">
                <span>Victim:</span>
                <span>John Doe</span>
              </div>
              <div className="preview-entity">
                <span>Location:</span>
                <span>Downtown, NY</span>
              </div>
              <div className="preview-entity">
                <span>Weapon:</span>
                <span>Handgun</span>
              </div>
            </div>
            <div className="preview-footer">
              <span>Source: NYPD Bulletin</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stat-item">
          <motion.div 
            className="stat-icon"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <FiAlertTriangle />
          </motion.div>
          <h3>1000+</h3>
          <p>Crimes Analyzed</p>
        </div>
        <div className="stat-item">
          <motion.div 
            className="stat-icon"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <FiClock />
          </motion.div>
          <h3>90%</h3>
          <p>Time Saved</p>
        </div>
        <div className="stat-item">
          <motion.div 
            className="stat-icon"
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
          >
            <FiSearch />
          </motion.div>
          <h3>99%</h3>
          <p>Accuracy</p>
        </div>
      </section>

      {/* Features Section */}
      <FeaturesSection />

      {/* How It Works */}
      <HowItWorks />

      {/* Testimonials */}
      <Testimonials />

      {/* Final CTA */}
      <section className="final-cta">
        <h2>Ready to Transform Crime Reporting?</h2>
        <p>Join law enforcement agencies and journalists who save hours every day with CrimeCard</p>
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 8px 15px rgba(233, 69, 96, 0.3)" }}
          whileTap={{ scale: 0.98 }}
          className="btn-primary"
          onClick={() => navigate('/input')}
        >
          Get Started Now <FiArrowRight />
        </motion.button>
      </section>
    </div>
  );
};

export default LandingPage;