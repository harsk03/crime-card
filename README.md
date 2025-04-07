# CrimeCard - Crime Report Analysis System

A comprehensive solution for automated crime report processing, analysis, and visualization.

## Overview

CrimeCard transforms unstructured crime reports into structured, analyzed data cards that highlight key information. The system leverages modern NLP techniques to extract entities, classify crimes, analyze severity, and generate concise summaries.

## Architecture

The system consists of three main components:

1. **Client Side (React)** - User interface for data input and visualization
2. **Server Side (Node.js)** - API handling, file processing, and database connectivity
3. **NLP Service (Python)** - Text analysis pipeline for processing crime reports

## Features

- **Multiple Input Methods**
  - Manual input form
  - Text paste functionality
  - File upload (PDF, DOCX, TXT)

- **Advanced NLP Processing**
  - Named entity recognition
  - Crime classification
  - Severity analysis
  - Summary generation

- **CrimeCard Visualization**
  - Crime profile cards
  - Entity relationship visualization
  - Export and sharing options

## Technology Stack

- **Frontend**: React, D3.js
- **Backend**: Express.js, Node.js
- **Database**: MongoDB
- **NLP**: spaCy, TensorFlow, T5
- **Deployment**: Docker, MongoDB Atlas

## Installation

### Prerequisites
- Node.js v16+
- Python 3.8+
- MongoDB

### Setup Instructions

1. Clone the repository
```bash
git clone https://github.com/yourusername/crimecard.git
cd crimecard
```

2. Install frontend dependencies
```bash
cd crimecard-frontend
npm install
```

3. Install backend dependencies
```bash
cd ../crimecard-backend
npm install

```

4. Set up Python environment for NLP service
```bash
//stay in crimecard-backend folder
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

5. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your MongoDB connection string and other settings
```

## Running the Application

1. Start MongoDB (if running locally)
```bash
mongod
```


2. Start the backend server
```bash
cd crimecard-backend
node server.js
```

3. Start the frontend client
```bash
cd crimecard-frontend
npm start
```

The application will be available at http://localhost:3000



## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- spaCy for providing excellent NLP tools
- MongoDB for database solutions
- The open-source community for various libraries used in this project
