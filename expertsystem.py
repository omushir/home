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