class ExpertSystem:
    def _init_(self):
        self.symptoms = []
        self.diseases = {
            "Flu": ["fever", "chills", "headache", "muscle aches"],
            "Cold": ["cough", "sore throat", "runny nose", "sneezing"],
            "Covid-19": ["fever", "cough", "shortness of breath", "loss of taste", "fatigue"]
        }

    def ask_symptoms(self):
        print("Please answer the following questions with yes or no:")
        if input("Do you have a fever? ").lower() == 'yes':
            self.symptoms.append('fever')
        if input("Do you have a cough? ").lower() == 'yes':
            self.symptoms.append('cough')
        if input("Do you have muscle aches? ").lower() == 'yes':
            self.symptoms.append('muscle aches')
        if input("Do you have a sore throat? ").lower() == 'yes':
            self.symptoms.append('sore throat')
        if input("Do you have a headache? ").lower() == 'yes':
            self.symptoms.append('headache')
        if input("Do you have shortness of breath? ").lower() == 'yes':
            self.symptoms.append('shortness of breath')
        if input("Do you have a runny nose? ").lower() == 'yes':
            self.symptoms.append('runny nose')
        if input("Do you feel fatigued or tired? ").lower() == 'yes':
            self.symptoms.append('fatigue')
        if input("Do you have loss of taste or smell? ").lower() == 'yes':
            self.symptoms.append('loss of taste')

    def diagnose(self):
        print("\nBased on your symptoms, the possible conditions are:")
        possible_diseases = []
        for disease, disease_symptoms in self.diseases.items():
            if all(symptom in self.symptoms for symptom in disease_symptoms):
                possible_diseases.append(disease)
        
        if possible_diseases:
            print(", ".join(possible_diseases))
        else:
            print("Sorry, no matching diseases found. You may need further consultation.")

# Create an expert system instance
expert_system = ExpertSystem()

# Ask the user for symptoms
expert_system.ask_symptoms()

# Diagnose the disease
expert_system.diagnose()


////////////

class ExpertSystem:
    def _init_(self):
        # Knowledge base: Diseases and their associated symptoms
        self.diseases = {
            "Flu": ["fever", "cough", "muscle aches", "fatigue"],
            "Cold": ["runny nose", "sneezing", "sore throat", "cough"],
            "Covid-19": ["fever", "cough", "shortness of breath", "loss of taste", "fatigue"],
            "Allergy": ["sneezing", "runny nose", "itchy eyes", "rash"]
        }
        self.user_symptoms = []

    def ask_questions(self):
        # Prompt the user for symptoms
        print("Answer the following questions with 'yes' or 'no':")
        symptom_list = {
            "fever": "Do you have a fever?",
            "cough": "Do you have a cough?",
            "muscle aches": "Do you have muscle aches?",
            "fatigue": "Do you feel fatigued or tired?",
            "runny nose": "Do you have a runny nose?",
            "sneezing": "Do you have sneezing?",
            "sore throat": "Do you have a sore throat?",
            "shortness of breath": "Do you have shortness of breath?",
            "loss of taste": "Do you have loss of taste or smell?",
            "itchy eyes": "Do you have itchy eyes?",
            "rash": "Do you have a rash?"
        }
        for symptom, question in symptom_list.items():
            answer = input(question + " ").strip().lower()
            if answer == 'yes':
                self.user_symptoms.append(symptom)

    def diagnose(self):
        # Determine potential diseases based on symptoms
        print("\nAnalyzing your symptoms...\n")
        potential_diseases = []

        for disease, symptoms in self.diseases.items():
            if any(symptom in self.user_symptoms for symptom in symptoms):
                potential_diseases.append(disease)

        # Display results
        if potential_diseases:
            print("Based on your symptoms, you might have:")
            for disease in potential_diseases:
                print(f"- {disease}")
        else:
            print("No matching conditions were found. Consider consulting a medical professional.")

    def run(self):
        # Start the expert system
        print("Welcome to the Medical Diagnosis Expert System!")
        self.ask_questions()
        self.diagnose()


# Run the expert system
if _name_ == "_main_":
    expert_system = ExpertSystem()
    expert_system.run()



//////////////

class CareerExpertSystem:
    def _init_(self):
        # Knowledge base: careers, required skills/interests, and weights
        self.careers = {
            "Software Engineer": {
                "skills": {"programming": 0.9, "problem-solving": 0.8, "algorithms": 0.8, "teamwork": 0.7},
                "interests": {"technology": 0.9, "coding": 0.9, "automation": 0.8}
            },
            "Data Scientist": {
                "skills": {"statistics": 0.9, "programming": 0.8, "data analysis": 0.9, "machine learning": 0.8},
                "interests": {"data": 0.9, "research": 0.8, "AI": 0.9}
            },
            "UI/UX Designer": {
                "skills": {"creativity": 0.9, "graphic design": 0.8, "user research": 0.9},
                "interests": {"design": 0.9, "user experience": 0.9, "aesthetics": 0.8}
            },
            "Marketing Specialist": {
                "skills": {"communication": 0.9, "creativity": 0.8, "strategic thinking": 0.9},
                "interests": {"marketing": 0.9, "business": 0.8, "strategy": 0.9}
            }
        }
        self.user_profile = {"skills": {}, "interests": {}}

    def ask_questions(self):
        # Ask user about skills
        print("Rate your proficiency in the following skills (0.1 to 1.0, or 0 if not applicable):")
        skills = {"programming", "problem-solving", "algorithms", "teamwork", "statistics", 
                  "data analysis", "machine learning", "creativity", "graphic design", "user research", 
                  "communication", "strategic thinking"}
        for skill in skills:
            try:
                level = float(input(f"{skill.capitalize()}: "))
                if level > 0:
                    self.user_profile["skills"][skill] = level
            except ValueError:
                print("Invalid input. Skipping this skill.")

        # Ask user about interests
        print("\nRate your interest in the following fields (0.1 to 1.0, or 0 if not applicable):")
        interests = {"technology", "coding", "automation", "data", "research", "AI", 
                     "design", "user experience", "aesthetics", "marketing", "business", "strategy"}
        for interest in interests:
            try:
                level = float(input(f"{interest.capitalize()}: "))
                if level > 0:
                    self.user_profile["interests"][interest] = level
            except ValueError:
                print("Invalid input. Skipping this interest.")

    def recommend_careers(self):
        # Calculate certainty factor for each career
        print("\nAnalyzing your profile...\n")
        career_scores = {}

        for career, criteria in self.careers.items():
            score = 0
            # Match skills
            for skill, weight in criteria["skills"].items():
                if skill in self.user_profile["skills"]:
                    score += self.user_profile["skills"][skill] * weight
            # Match interests
            for interest, weight in criteria["interests"].items():
                if interest in self.user_profile["interests"]:
                    score += self.user_profile["interests"][interest] * weight
            career_scores[career] = score

        # Sort careers by scores
        sorted_careers = sorted(career_scores.items(), key=lambda x: x[1], reverse=True)

        # Display recommendations
        print("Recommended Careers (based on your profile):")
        for career, score in sorted_careers:
            print(f"- {career}: {score:.2f} score")

    def run(self):
        print("Welcome to the Advanced Career Recommendation System!")
        self.ask_questions()
        self.recommend_careers()


# Run the expert system
if _name_ == "_main_":
    career_system = CareerExpertSystem()
    career_system.run()
