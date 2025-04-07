#crimecard-backend\app\services\nlpService.py
import sys
import json
import pdfplumber
import docx
import tensorflow as tf
from transformers import TFT5ForConditionalGeneration, T5Tokenizer
import spacy
from spacy.matcher import PhraseMatcher, Matcher
import os
import re
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

# Force CPU usage to avoid GPU-related issues
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

# Load models
try:
    # Load spaCy for entity extraction
    nlp = spacy.load("en_core_web_lg")
    tokenizer = T5Tokenizer.from_pretrained("t5-small")
    model = TFT5ForConditionalGeneration.from_pretrained("t5-small")
except Exception as e:
    print(f"Model loading failed: {str(e)}", file=sys.stderr)
    sys.exit(1)

# Crime type keywords with expanded vocabulary
crime_keywords = {
    "theft": ["steal", "stole", "robbery", "burglary", "larceny", "shoplifting", "theft", "stolen"],
    "assault": ["assault", "attack", "battery", "hit", "struck", "beaten", "beating"],
    "homicide": ["murder", "kill", "homicide", "manslaughter", "slain", "slaughter", "killed"],
    "fraud": ["fraud", "scam", "embezzlement", "forgery", "deceive", "cheat", "swindle"],
    "drug": ["drug", "narcotic", "cocaine", "heroin", "methamphetamine", "marijuana", "cannabis"],
    "acid_attack": ["acid", "burn", "chemical", "corrosive"],
    "kidnapping": ["kidnap", "abduct", "hostage", "ransom"],
    "sexual_assault": ["rape", "molest", "sexual assault", "sexually assaulted"]
}

# Weapon keywords
weapon_keywords = [
    "gun", "pistol", "revolver", "firearm", "rifle", "shotgun",
    "knife", "blade", "dagger", "machete", "sword", "kitchen knife",
    "bat", "club", "hammer", "rod", "pipe", "stick",
    "acid", "poison", "rope", "chemical", "explosive", "bomb"
]

# Law enforcement and authority patterns
authority_patterns = [
    "officer", "inspector", "detective", "police", "commissioner", 
    "dcp", "acp", "superintendent", "constable", "sergeant",
    "investigator", "sheriff", "deputy", "chief", "captain"
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
    """Enhanced entity extraction with relationship detection"""
    doc = nlp(text)
    entities = {
        "persons": [],
        "locations": [],
        "dates": [],
        "weapons": [],
        "actions": [],
        "victims": [],
        "suspects": [],
        "officers": [],
        "ages": {}  # Track ages associated with persons
    }
    
    # Track persons and their roles
    person_roles = {}  # person name -> "victim", "suspect", "officer"
    
    # Named entities
    seen_locations = set()  # To track already seen locations
    seen_persons = set()    # To track already seen persons
    
    # First pass: extract all named entities
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            full_name = ent.text.strip()
            if full_name and full_name not in seen_persons:
                entities["persons"].append(full_name)
                seen_persons.add(full_name)
                
                # Check for age in brackets or parentheses near the name
                name_span = doc[ent.start:ent.end]
                age_regex = r'(\(|\[|\s)(\d{1,2})(\)|\]|\s)'
                text_chunk = doc[max(0, ent.start-5):min(len(doc), ent.end+10)].text
                age_match = re.search(age_regex, text_chunk)
                if age_match:
                    entities["ages"][full_name] = age_match.group(2)
                
        elif ent.label_ in ("GPE", "LOC"):
            loc = ent.text.strip()
            if loc and loc not in seen_locations:
                entities["locations"].append(loc)
                seen_locations.add(loc)
        elif ent.label_ == "DATE":
            # Better date filtering
            date_text = ent.text.strip()
            if date_text and not any(word in date_text.lower() for word in ["year", "decade", "century"]):
                entities["dates"].append(date_text)
    
    # More comprehensive role-detection patterns
    victim_patterns = [
        # Direct victim mentions
        [{"LOWER": {"IN": ["victim", "victims"]}}, {"IS_PUNCT": True, "OP": "?"}, {"OP": "*", "POS": {"NOT_IN": ["VERB", "PUNCT"]}}, {"ENT_TYPE": "PERSON"}],
        # Victims as objects of violence
        [{"ENT_TYPE": "PERSON"}, {"OP": "*", "POS": {"NOT_IN": ["VERB"]}}, {"LEMMA": {"IN": ["found", "discover", "attack", "murder", "kill"]}}, {"POS": "ADP", "OP": "?"}],
        # Found or discovered as victims
        [{"LOWER": {"IN": ["found", "discovered", "identified", "known"]}}, {"LOWER": "as", "OP": "?"}, {"ENT_TYPE": "PERSON"}],
        # Detected by mentions of violence/death with persons
        [{"LEMMA": {"IN": ["stab", "murder", "kill", "attack"]}}, {"OP": "*", "LENGTH": {"<=": 5}}, {"ENT_TYPE": "PERSON"}],
        [{"ENT_TYPE": "PERSON"}, {"OP": "*", "LENGTH": {"<=": 5}}, {"LEMMA": {"IN": ["stab", "murder", "kill", "attack"]}}],
    ]
    
    suspect_patterns = [
        # Direct suspect mentions
        [{"LOWER": {"IN": ["suspect", "suspects", "accused", "perpetrator", "attacker"]}}, {"IS_PUNCT": True, "OP": "?"}, {"OP": "*", "POS": {"NOT_IN": ["VERB", "PUNCT"]}}, {"ENT_TYPE": "PERSON"}],
        # Subjects of arrest/detention
        [{"ENT_TYPE": "PERSON"}, {"OP": "*", "POS": {"NOT_IN": ["VERB"]}}, {"LEMMA": {"IN": ["arrest", "detain", "charge", "apprehend"]}}],
        # Persons detained or questioned
        [{"LEMMA": {"IN": ["detain", "question", "arrest"]}}, {"OP": "*", "LENGTH": {"<=": 5}}, {"ENT_TYPE": "PERSON"}],
        # Former associates with disputes
        [{"LOWER": {"IN": ["former", "ex"]}}, {"LOWER": {"IN": ["partner", "associate", "colleague"]}}, {"OP": "*", "LENGTH": {"<=": 5}}, {"ENT_TYPE": "PERSON"}]
    ]
    
    officer_patterns = [
        # Officers with titles
        [{"LOWER": {"IN": authority_patterns}}, {"IS_PUNCT": True, "OP": "?"}, {"OP": "*", "POS": {"NOT_IN": ["VERB", "PUNCT"]}}, {"ENT_TYPE": "PERSON"}],
        # Officers leading investigations
        [{"ENT_TYPE": "PERSON"}, {"OP": "*", "POS": {"NOT_IN": ["VERB"]}}, {"LEMMA": {"IN": ["lead", "investigate", "head", "supervise"]}}],
        # Officers with their titles directly before their names
        [{"LOWER": {"IN": authority_patterns}}, {"ENT_TYPE": "PERSON"}],
        # Officers who stated something
        [{"ENT_TYPE": "PERSON"}, {"OP": "*", "LENGTH": {"<=": 3}}, {"LEMMA": {"IN": ["state", "say", "mention", "report"]}}]
    ]
    
    # Create matchers for role identification
    victim_matcher = Matcher(nlp.vocab)
    victim_matcher.add("VICTIM", victim_patterns)
    
    suspect_matcher = Matcher(nlp.vocab)
    suspect_matcher.add("SUSPECT", suspect_patterns)
    
    officer_matcher = Matcher(nlp.vocab)
    officer_matcher.add("OFFICER", officer_patterns)
    
    # Find roles
    for matcher, role_type in [(victim_matcher, "victims"), (suspect_matcher, "suspects"), (officer_matcher, "officers")]:
        matches = matcher(doc)
        for match_id, start, end in matches:
            span = doc[start:end]
            for ent in span.ents:
                if ent.label_ == "PERSON" and ent.text not in entities[role_type]:
                    entities[role_type].append(ent.text)
    
    # Context-based role analysis - advanced pattern matching
    victim_keywords = ["victim", "victims", "killed", "murdered", "attacked", "assaulted", "injured", "dead", "deceased", "found dead"]
    suspect_keywords = ["suspect", "suspects", "accused", "perpetrator", "attacker", "arrested", "detained", "questioned"]
    officer_keywords = ["police", "officer", "investigator", "detective", "ACP", "DCP", "SI", "PI", "said", "stated", "according to", "leading"]
    
    # Special handling for title + person patterns (like "DCP Sudhir Joshi")
    for token in doc:
        if token.text.upper() in [title.upper() for title in authority_patterns]:
            # Look for a person entity following this title
            if token.i + 1 < len(doc) and doc[token.i+1].ent_type_ == "PERSON":
                if doc[token.i+1].text not in entities["officers"]:
                    entities["officers"].append(doc[token.i+1].text)
            # Look for a 2-token person name
            elif token.i + 2 < len(doc) and doc[token.i+1:token.i+3].text not in entities["officers"]:
                potential_name = doc[token.i+1:token.i+3].text
                if any(potential_name in person for person in entities["persons"]):
                    entities["officers"].append(potential_name)
    
    # Process sentences to extract additional context with improved heuristics
    for sent in doc.sents:
        sent_text = sent.text.lower()
        sent_doc = nlp(sent.text)
        
        # Murder/victim context
        if any(term in sent_text for term in ["murder", "killed", "dead", "deceased"]):
            for ent in sent.ents:
                if ent.label_ == "PERSON" and ent.text not in entities["victims"]:
                    # Check if the person occurs in a victim context
                    context = sent_text[max(0, sent_text.find(ent.text.lower())-50):sent_text.find(ent.text.lower())+50]
                    if any(vk in context for vk in victim_keywords):
                        entities["victims"].append(ent.text)
        
        # Special handling for "found by" pattern to avoid misclassifying finders as victims
        if "found by" in sent_text or "discovered by" in sent_text:
            for ent in sent.ents:
                if ent.label_ == "PERSON":
                    # Check if this person is the finder
                    finder_context = ["found by", "discovered by"]
                    for fc in finder_context:
                        if fc in sent_text and sent_text.find(fc) + len(fc) < sent_text.find(ent.text.lower()):
                            # This person is likely a finder, not a victim
                            if ent.text in entities["victims"] and "daughter" in sent_text:
                                entities["victims"].remove(ent.text)
        
        # Officer statements pattern
        if any(term in sent_text for term in ["said", "stated", "according to"]):
            for ent in sent.ents:
                if ent.label_ == "PERSON" and ent.text not in entities["officers"]:
                    for term in ["said", "stated", "according to"]:
                        if term in sent_text:
                            position = sent_text.find(term)
                            name_position = sent_text.find(ent.text.lower())
                            # If the name appears before the statement verb
                            if 0 <= name_position < position and position - name_position < 30:
                                # Check if the person has an authority title nearby
                                context = sent_text[max(0, name_position-20):name_position]
                                if any(title.lower() in context for title in authority_patterns):
                                    entities["officers"].append(ent.text)
        
        # Investigation leadership pattern
        if "lead" in sent_text or "leading" in sent_text or "heads" in sent_text:
            for ent in sent.ents:
                if ent.label_ == "PERSON" and ent.text not in entities["officers"]:
                    probe_terms = ["investigation", "probe", "case"]
                    if any(term in sent_text for term in probe_terms):
                        entities["officers"].append(ent.text)
        
        # Explicit suspect identification
        if "detained" in sent_text or "questioned" in sent_text or "arrested" in sent_text:
            for ent in sent.ents:
                if ent.label_ == "PERSON" and ent.text not in entities["suspects"]:
                    # Make sure they're not already identified as a victim or officer
                    if ent.text not in entities["victims"] and ent.text not in entities["officers"]:
                        entities["suspects"].append(ent.text)
    
    # Weapon detection with improved context
    weapon_matcher = PhraseMatcher(nlp.vocab)
    weapon_patterns = [nlp(w) for w in weapon_keywords]
    weapon_matcher.add("WEAPON", None, *weapon_patterns)
    matches = weapon_matcher(doc)
    for _, start, end in matches:
        span = doc[start:end]
        weapon_text = span.text.lower()
        
        # Check for weapon context
        for context in ["attacked with", "used", "wielding", "armed with"]:
            context_pos = text.lower().find(context)
            if context_pos != -1 and abs(context_pos - text.lower().find(weapon_text)) < 20:
                if weapon_text not in entities["weapons"]:
                    entities["weapons"].append(span.text)
                break
        
        # Add weapon if it's a definite weapon term
        if weapon_text in ["knife", "gun", "pistol", "sword", "blade"]:
            if weapon_text not in entities["weapons"]:
                entities["weapons"].append(span.text)
    
    # Special case for common weapon mentions
    if "stab" in text.lower() and "knife" not in entities["weapons"]:
        if "kitchen knife" in text.lower():
            entities["weapons"].append("kitchen knife")
        else:
            entities["weapons"].append("knife")
    
    # Post-processing: Clean family relationships and remove conflicts
    
    # 1. Identify family relationships to avoid misclassification
    family_terms = ["husband", "wife", "daughter", "son", "mother", "father", "sister", "brother", "spouse"]
    family_contexts = []
    
    for sent in doc.sents:
        sent_text = sent.text.lower()
        for term in family_terms:
            if term in sent_text:
                # Capture the context around the family term
                term_pos = sent_text.find(term)
                context = sent_text[max(0, term_pos-30):min(len(sent_text), term_pos+30)]
                family_contexts.append(context)
    
    # 2. Resolve victim-suspect conflicts with improved heuristics
    
    # If a person is both victim and suspect, resolve based on context
    for person in list(entities["persons"]):
        if person in entities["victims"] and person in entities["suspects"]:
            # Prefer victim status if they were explicitly killed/murdered
            murder_terms = ["killed", "murdered", "dead", "deceased", "stabbed"]
            murder_context = any(term in text.lower()[text.lower().find(person.lower())-50:text.lower().find(person.lower())+50] for term in murder_terms)
            
            if murder_context:
                if person in entities["suspects"]:
                    entities["suspects"].remove(person)
            # Otherwise, check for family relationships that might indicate victim status
            elif any(person.lower() in context for context in family_contexts):
                for context in family_contexts:
                    if person.lower() in context:
                        # If they're identified as a family member of someone who was attacked
                        family_position = context.find(person.lower())
                        for term in family_terms:
                            if term in context:
                                term_position = context.find(term)
                                # If the family term appears near their name
                                if abs(family_position - term_position) < 20:
                                    # They're likely a victim in a family context
                                    if person in entities["suspects"]:
                                        entities["suspects"].remove(person)
                                    break
    
    # 3. Handle couples and paired victims
    couples = []
    for i, person1 in enumerate(entities["persons"]):
        for person2 in entities["persons"][i+1:]:
            # Check if they appear together in the text
            if abs(text.lower().find(person1.lower()) - text.lower().find(person2.lower())) < 20:
                # And check if "and" or "&" or "," connects them
                middle_text = text[min(text.lower().find(person1.lower()), text.lower().find(person2.lower())):
                                   max(text.lower().find(person1.lower()), text.lower().find(person2.lower()))]
                if " and " in middle_text or "&" in middle_text or "," in middle_text:
                    couples.append((person1, person2))
    
    # If one person in a couple is a victim, likely both are
    for person1, person2 in couples:
        if person1 in entities["victims"] and person2 not in entities["victims"]:
            entities["victims"].append(person2)
        elif person2 in entities["victims"] and person1 not in entities["victims"]:
            entities["victims"].append(person1)
    
    # 4. Ensure officer is not mistakenly identified as suspect or victim
    for officer in list(entities["officers"]):
        if officer in entities["victims"]:
            entities["victims"].remove(officer)
        if officer in entities["suspects"]:
            entities["suspects"].remove(officer)
    
    # 5. Check for titles that indicate officer status
    for person in list(entities["persons"]):
        for title in ["DCP", "ACP", "Inspector", "Officer", "Detective"]:
            if title in person or person.startswith(title):
                if person not in entities["officers"]:
                    entities["officers"].append(person)
                # Remove the title-holding officer from other categories
                if person in entities["victims"]:
                    entities["victims"].remove(person)
                if person in entities["suspects"]:
                    entities["suspects"].remove(person)
    
    # Ensure no duplicates in final lists
    for category in ["victims", "suspects", "officers"]:
        entities[category] = list(set(entities[category]))
    
    return entities

def classify_crime(text, entities):
    """Classify crime type with improved confidence calculation"""
    doc = nlp(text.lower())
    crime_scores = {crime: 0 for crime in crime_keywords}
    
    # Check for explicit mentions of crime types
    direct_mentions = {
        "homicide": ["murder", "homicide", "killing", "killed", "murdered", "double homicide", "double murder"],
        "theft": ["theft", "robbery", "burglary", "stolen", "robbed"],
        "assault": ["assault", "attack", "battery", "beaten", "assaulted"],
        "fraud": ["fraud", "scam", "cheated", "swindled"],
        "drug": ["drug", "narcotics", "cocaine", "heroin", "marijuana"],
        "acid_attack": ["acid attack", "acid throwing", "chemical attack"],
        "kidnapping": ["kidnapping", "abduction", "kidnapped", "abducted"]
    }
    
    for crime, mentions in direct_mentions.items():
        for mention in mentions:
            if mention in text.lower():
                crime_scores[crime] += 3  # Higher weight for direct mentions
    
    # Keyword-based scoring
    for crime, keywords in crime_keywords.items():
        for keyword in keywords:
            if keyword in text.lower():
                crime_scores[crime] += 1
    
    # Context-based improvements
    if len(entities["victims"]) > 0:
        # Check for murder context with victims
        murder_context = any(term in text.lower() for term in ["kill", "killed", "murder", "murdered", "dead", "deceased"])
        if murder_context:
            crime_scores["homicide"] += 3
    
    # Look for definitive evidence of homicide
    definitive_homicide = any(term in text.lower() for term in ["brutally murdered", "found dead", "found murdered"])
    if definitive_homicide:
        crime_scores["homicide"] += 5
    
    # Multiple victims strongly suggests homicide when victims are "found"
    if len(entities["victims"]) > 1 and "found" in text.lower():
        crime_scores["homicide"] += 2
    
    # Weapon context for different crimes
    if entities.get("weapons"):
        for weapon in entities["weapons"]:
            weapon_lower = weapon.lower()
            if any(w in weapon_lower for w in ["gun", "pistol", "firearm", "rifle"]):
                crime_scores["homicide"] += 2
            elif any(w in weapon_lower for w in ["knife", "stab", "blade"]):
                crime_scores["homicide"] += 1
                crime_scores["assault"] += 1
            elif "acid" in weapon_lower:
                crime_scores["acid_attack"] += 5
    
    # If no clear crime type, use context clues
    if not any(crime_scores.values()):
        if "stab" in text.lower() or "knife" in text.lower():
            crime_scores["assault"] += 1
            if "dead" in text.lower() or "death" in text.lower():
                crime_scores["homicide"] += 2
        
        if "money" in text.lower() or "financial" in text.lower():
            crime_scores["fraud"] += 1
    
    if not any(crime_scores.values()):
        return "other", 0.0
    
    # Get the crime with the highest score
    predicted_crime = max(crime_scores.items(), key=lambda x: x[1])[0]
    
    # Calculate confidence based on ratio of this crime's score to all scores
    total_score = sum(crime_scores.values())
    confidence = crime_scores[predicted_crime] / total_score if total_score > 0 else 0
    
    return predicted_crime, min(1.0, confidence)

def calculate_severity(text, crime_type, entities):
    """Calculate severity score with improved context awareness"""
    # Base severity by crime type
    base_severity = {
        "homicide": 9,
        "assault": 6,
        "theft": 4,
        "fraud": 3,
        "drug": 5,
        "acid_attack": 8,
        "kidnapping": 8,
        "sexual_assault": 8,
        "other": 3
    }
    
    # Start with base score for the crime type
    severity_score = base_severity.get(crime_type, 3)
    
    # Adjust based on factors
    
    # Weapon presence and type
    weapon_severity = {
        "gun": 3,
        "firearm": 3,
        "pistol": 3,
        "rifle": 3,
        "knife": 2,
        "acid": 3,
        "bomb": 4,
        "explosive": 4
    }
    
    for weapon in entities["weapons"]:
        for key, value in weapon_severity.items():
            if key in weapon.lower():
                severity_score += value
                break
    
    # Number of victims
    if len(entities["victims"]) > 1:
        severity_score += min(len(entities["victims"]), 3)  # Up to +3 for multiple victims
    
    # Check for particularly violent keywords
    violence_keywords = {
        "brutally": 1.5,
        "horrific": 1.5,
        "gruesome": 1.5,
        "multiple stab": 2,
        "pool of blood": 1,
        "critical condition": 1.5,
        "severe injuries": 1
    }
    
    text_lower = text.lower()
    for keyword, boost in violence_keywords.items():
        if keyword in text_lower:
            severity_score += boost
    
    # Cap at 10
    return min(10, max(1, round(severity_score)))

def generate_summary(text, max_length=150):
    """Generate summary using T5 model with improved fallback"""
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
    """Improved fallback extractive summarization"""
    doc = nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents]
    
    # Score sentences by position and keyword significance
    sentence_scores = {}
    position_weight = 1.0
    
    important_words = ["murder", "killed", "attacked", "victim", "suspect", "arrested", 
                      "police", "homicide", "assault", "crime"]
    
    for i, sent in enumerate(sentences):
        # Position score (first sentences are more important)
        position_score = position_weight * (1.0 - i/len(sentences))
        
        # Keyword score
        keyword_score = sum(1 for word in important_words if word in sent.lower())
        
        # Length penalty (avoid very short sentences)
        length = len(sent.split())
        length_factor = min(1.0, length / 20)
        
        # Combine scores
        sentence_scores[sent] = position_score + keyword_score + length_factor
    
    # Get top sentences
    top_sentences = sorted(sentence_scores.items(), key=lambda x: x[1], reverse=True)[:3]
    
    # Sort by position in the original text
    original_order = sorted(top_sentences, key=lambda x: sentences.index(x[0]))
    
    return format_summary(" ".join([sent for sent, score in original_order]))

def process_text(text):
    """Enhanced main processing function"""
    # Extract entities with improved context understanding
    entities = extract_entities(text)
    
    # Classify crime type with entity information
    crime_type, confidence = classify_crime(text, entities)
    
    # Calculate severity score based on crime and entities
    severity = calculate_severity(text, crime_type, entities)
    
    # Generate summaries
    summary = generate_summary(text, max_length=150)
    headline = generate_summary(text, max_length=75)
    
    # Format the output
    result = {
        "entities": entities,
        "classification": crime_type,
        "confidence": float(confidence),
        "severityScore": severity,
        "summary": summary,
        "headline": headline
    }
    
    # Add detailed victim information if available
    if entities["victims"]:
        result["primary_victim"] = entities.get("victims", [])

    
    # Add primary suspect if available
    if entities["suspects"]:
        result["primary_suspect"] = entities["suspects"][0]
    
    # Add primary officer if available
    if entities["officers"]:
        result["assigned_officer"] = entities["officers"][0]
    
    # Add primary weapon if available
    if entities["weapons"]:
        result["weapon"] = entities["weapons"][0]
    
    # Add primary location if available
    if entities["locations"]:
        result["location"] = entities["locations"][0]
    
    # Add primary date if available
    if entities["dates"]:
        result["date"] = entities["dates"][0]
    
    return result

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