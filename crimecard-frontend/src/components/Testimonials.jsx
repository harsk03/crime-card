import { motion } from 'framer-motion';
import { FaQuoteLeft } from 'react-icons/fa';
import './../styles/main.css';

const Testimonials = () => {
  const testimonials = [
    {
      quote: "CrimeCard has revolutionized how our department handles reports. What used to take hours now takes minutes.",
      author: "Detective Sarah Johnson",
      role: "NYPD Major Case Squad"
    },
    {
      quote: "As a crime journalist, getting quick, accurate summaries is crucial. CrimeCard delivers every time.",
      author: "Michael Chen",
      role: "Investigative Reporter, Crime Daily"
    },
    {
      quote: "The severity scoring helps our team prioritize cases effectively. An indispensable tool for law enforcement.",
      author: "Captain David Rodriguez",
      role: "LAPD Robbery-Homicide Division"
    }
  ];

  return (
    <section className="testimonials-section">
      <div className="section-header">
        <h2>Trusted by Professionals</h2>
        <p>What our users say about CrimeCard</p>
      </div>
      
      <div className="testimonials-grid">
        {testimonials.map((testimonial, index) => (
          <motion.div 
            key={index}
            className="testimonial-card"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="quote-icon">
              <FaQuoteLeft />
            </div>
            <p className="testimonial-quote">"{testimonial.quote}"</p>
            <div className="testimonial-author">
              <h4>{testimonial.author}</h4>
              <p>{testimonial.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;