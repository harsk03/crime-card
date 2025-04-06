import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LandingPage from './components/LandingPage';
import InputForm from './components/InputForm';
import ProcessingScreen from './components/ProcessingScreen';
import CrimeCard from './components/CrimeCard';
import './styles/main.css';
import './styles/animations.css';
import './styles/theme.css';

function App() {
  return (
    <Router>
      <AnimatePresence mode='wait'>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/input" element={<InputForm />} />
          <Route path="/processing" element={<ProcessingScreen />} />
          <Route path="/crimecard/:id" element={<CrimeCard />} />
        </Routes>
      </AnimatePresence>
    </Router>
  );
}

export default App;