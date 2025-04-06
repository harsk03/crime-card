# crimecard-backend\app\services\nlpService.py
import sys
import json
import pdfplumber
import docx
import tensorflow as tf
from transformers import TFT5ForConditionalGeneration, T5Tokenizer
import spacy
from spacy.matcher import PhraseMatcher
import os
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

# Force CPU usage to avoid GPU-related issues
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# Modify your model loading code
try:
    # Load spaCy for entity extraction
    nlp = spacy.load("en_core_web_lg")
    tokenizer = T5Tokenizer.from_pretrained("t5-small")
    model = TFT5ForConditionalGeneration.from_pretrained("t5-small")
except Exception as e:
    print(f"Model loading failed: {str(e)}", file=sys.stderr)
    sys.exit(1)


# Crime type keywords
crime_keywords = {
    "theft": ["steal", "stole", "robbery", "burglary", "larceny", "shoplifting"],
    "assault": ["assault", "attack", "battery", "hit", "struck"],
    "homicide": ["murder", "kill", "homicide", "manslaughter"],
    "fraud": ["fraud", "scam", "embezzlement", "forgery"],
    "drug": ["drug", "narcotic", "cocaine", "heroin", "methamphetamine"]
}

# Weapon keywords
weapon_keywords = [
    "gun", "pistol", "revolver", "firearm", 
    "knife", "blade", "bat", "club",
    "acid", "poison", "rope"
]

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF files"""
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])
    return text

def extract_text_from_docx(docx_path):
    """Extract text from DOCX files"""
    doc = docx.Document(docx_path)
    return "\n".join([para.text for para in doc.paragraphs])

def extract_entities(text):
    """Enhanced entity extraction with verb detection"""
    doc = nlp(text)
    entities = {
        "persons": [],
        "locations": [],
        "dates": [],
        "weapons": [],
        "actions": []
    }
    
    
    # Named entities
    seen_locations = set()  # To track already seen locations
        
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            entities["persons"].append(ent.text)
        elif ent.label_ in ("GPE", "LOC"):
            loc = ent.text.strip()
            if loc and loc not in seen_locations:
                entities["locations"].append(loc)
                seen_locations.add(loc)
        elif ent.label_ == "DATE":
            # Only add if it's a proper date (not age or duration)
            if not any(char.isdigit() for char in ent.text) or \
               any(word in ent.text.lower() for word in ["year", "month", "day", "week", "hour"]):
                continue
            entities["dates"].append(ent.text)
    
    # Weapon detection
    weapon_patterns = [nlp(text) for text in weapon_keywords]
    matcher = PhraseMatcher(nlp.vocab)
    matcher.add("WEAPON", weapon_patterns)
    matches = matcher(doc)
    for _, start, end in matches:
        span = doc[start:end]
        if span.text.lower() not in entities["weapons"]:
            entities["weapons"].append(span.text)
    
    # Action verbs
    for token in doc:
        if token.pos_ == "VERB" and token.dep_ in ("ROOT", "acl"):
            entities["actions"].append(token.lemma_)
    
    return entities

def classify_crime(text):
    """Classify crime type with confidence score"""
    doc = nlp(text.lower())
    crime_scores = {crime: 0 for crime in crime_keywords}
    
    for crime, keywords in crime_keywords.items():
        for keyword in keywords:
            if keyword in text.lower():
                crime_scores[crime] += 1
    
    if not any(crime_scores.values()):
        return "other", 0.0
    
    predicted_crime = max(crime_scores.items(), key=lambda x: x[1])[0]
    confidence = crime_scores[predicted_crime] / len(crime_keywords[predicted_crime])
    return predicted_crime, min(1.0, confidence)

def calculate_severity(text):
    """Calculate severity score based on keywords"""
    severity_keywords = {
        "high": ["kill", "murder", "shoot", "stab", "rape", "hostage", "bomb"],
        "medium": ["attack", "assault", "rob", "threat", "steal", "harm"],
        "low": ["fraud", "scam", "shoplift", "vandalism", "trespass"]
    }
    
    severity_score = 0
    text_lower = text.lower()
    
    for level, keywords in severity_keywords.items():
        for keyword in keywords:
            if keyword in text_lower:
                severity_score += 3 if level == "high" else 2 if level == "medium" else 1
    
    return min(10, max(1, severity_score))

def generate_summary(text, max_length=150):
    """Generate summary using T5 model with fallback"""
    try:
        # Preprocess text
        clean_text = ' '.join(text.replace('\n', ' ').split())
        
        # Skip summarization for very short texts
        if len(clean_text.split()) < 20:
            return extractive_fallback(text)
            
        inputs = tokenizer.encode(
            "summarize: " + clean_text,
            return_tensors="tf",
            max_length=512,
            truncation=True
        )
        
        outputs = model.generate(
            inputs,
            max_length=max_length,
            min_length=30,
            length_penalty=2.0,
            num_beams=4,
            early_stopping=True
        )
        
        summary = tokenizer.decode(outputs[0], skip_special_tokens=True)
        return format_summary(summary)
        
    except Exception as e:
        print(f"Summarization error: {str(e)}")
        return extractive_fallback(text)

def format_summary(text):
    """Format summary text properly"""
    text = text.strip()
    if not text.endswith(('.', '!', '?')):
        text += '.'
    return text[0].upper() + text[1:]

def extractive_fallback(text):
    """Fallback extractive summarization"""
    doc = nlp(text)
    sentences = [sent.text for sent in doc.sents]
    return format_summary(" ".join(sentences[:3]))

def process_text(text):
    """Main processing function"""
    entities = extract_entities(text)
    crime_type, confidence = classify_crime(text)
    severity = calculate_severity(text)
    
    return {
        "entities": entities,
        "classification": crime_type,
        "confidence": float(confidence),
        "severityScore": severity,
        "summary": generate_summary(text, max_length=150),
        "headline": generate_summary(text, max_length=75)
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python nlpService.py <command> [args]")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "extract":
        file_path = sys.argv[2]
        try:
            if file_path.endswith('.pdf'):
                print(extract_text_from_pdf(file_path))
            elif file_path.endswith('.docx'):
                print(extract_text_from_docx(file_path))
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    print(f.read())
        except Exception as e:
            print(f"Error: {str(e)}", file=sys.stderr)
            sys.exit(1)
    
    elif command == "process":
        text = sys.argv[2] if len(sys.argv) > 2 else sys.stdin.read()
        try:
            result = process_text(text)
            print(json.dumps(result, indent=2))
        except Exception as e:
            print(f"Processing error: {str(e)}", file=sys.stderr)
            sys.exit(1)
    
    else:
        print(f"Unknown command: {command}", file=sys.stderr)
        sys.exit(1)