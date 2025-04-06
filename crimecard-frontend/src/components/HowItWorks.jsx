import { motion } from 'framer-motion';
import { FiUpload, FiCpu, FiFileText, FiShare2 } from 'react-icons/fi';
import './../styles/main.css';

const HowItWorks = () => {
  const steps = [
    {
      icon: <FiUpload />,
      title: "Upload Report",
      description: "Paste text or upload crime report documents"
    },
    {
      icon: <FiCpu />,
      title: "AI Processing",
      description: "Our system analyzes and extracts key information"
    },
    {
      icon: <FiFileText />,
      title: "Get CrimeCard",
      description: "Receive a structured, visual crime profile"
    },
    {
      icon: <FiShare2 />,
      title: "Share & Save",
      description: "Export or save the card for future reference"
    }
  ];

  return (
    <section className="how-it-works">
      <div className="section-header">
        <h2>How CrimeCard Works</h2>
        <p>Transform unstructured reports in just 3 simple steps</p>
      </div>
      
      <div className="steps-container">
        {steps.map((step, index) => (
          <motion.div 
            key={index}
            className="step-card"
            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            viewport={{ once: true }}
          >
            <div className="step-number">{index + 1}</div>
            <div className="step-icon">{step.icon}</div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            
            {index < steps.length - 1 && (
              <div className="step-connector"></div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;