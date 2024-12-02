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
