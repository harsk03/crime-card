import { motion } from 'framer-motion';
import { FiUser, FiMapPin, FiCalendar, FiActivity, FiDatabase, FiDownload } from 'react-icons/fi';
import './../styles/main.css';

const FeaturesSection = () => {
  const features = [
    {
      icon: <FiUser />,
      title: "Victim/Suspect ID",
      description: "Automatically identify key persons involved in the incident"
    },
    {
      icon: <FiMapPin />,
      title: "Location Mapping",
      description: "Pinpoint exact crime locations with geospatial data"
    },
    {
      icon: <FiCalendar />,
      title: "Timeline Extraction",
      description: "Capture critical dates and times from unstructured text"
    },
    {
      icon: <FiActivity />,
      title: "Severity Analysis",
      description: "AI-powered severity scoring for prioritization"
    },
    {
      icon: <FiDatabase />,
      title: "Database Integration",
      description: "Store and retrieve past cases with ease"
    },
    {
      icon: <FiDownload />,
      title: "Export Options",
      description: "Shareable cards in multiple formats"
    }
  ];

  return (
    <section className="features-section">
      <div className="section-header">
        <h2>Powerful Features</h2>
        <p>Everything you need for efficient crime report analysis</p>
      </div>
      
      <div className="features-grid">
        {features.map((feature, index) => (
          <motion.div 
            key={index}
            className="feature-card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0, 0, 0, 0.2)" }}
          >
            <div className="feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesSection;