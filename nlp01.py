##Assignment No.01##
#Name:Rahane Shital Anna
##Roll No:48
#Batch:B3
#Title:"Text Pre-Processing using NLP operations:perform Tokenization
# Stop word removal,Lemmatization ,Part-of-Speech Tagging use any sample text"

#import libraries
import spacy

# Load the language model
nlp = spacy.load("en_core_web_sm")

# Define the input text with spaces between sentences
about_text = (
   "India is my country. "
   "Maharashtra is my state."
)

# 1. Tokenization:
about_doc = nlp(about_text)
print("1. Tokenization:")
for token in about_doc:
    print(token, token.idx)

# 2. Stop Words Removal:
about_doc = nlp(about_text)
print("\n2. Stop Words Removal:")
print([token for token in about_doc if not token.is_stop])

# 3. Lemmatization:
about_doc = nlp(about_text)
print("\n3. Lemmatization:")
for token in about_doc:
    if str(token) != str(token.lemma_):
        print(f"{str(token):>20} : {str(token.lemma_)}")

# 4. Part of Speech Tagging:
about_doc = nlp(about_text)
print("\n4. Part of Speech Tagging:")
for token in about_doc:
    print(
        f"""
TOKEN: {str(token)}
=====
TAG: {str(token.tag_):10} POS: {token.pos_}
EXPLANATION: {spacy.explain(token.tag_)}"""
    )


#----------output-------#
"""India 0
is 6
my 9
country 12
. 18
Maharashtra 20
is 32
my 35
state 38
. 43
[India, country, ., Maharashtra, state, .]
is : be
is : be
TOKEN: India
=====
TAG: NNP        POS: PROPN
EXPLANATION: noun, proper singular

TOKEN: is
=====
TAG: VBZ        POS: AUX
EXPLANATION: verb, 3rd person singular present

TOKEN: my
=====
TAG: PRP$       POS: DET
EXPLANATION: pronoun, possessive

TOKEN: country
=====
TAG: NN         POS: NOUN
EXPLANATION: noun, singular or mass

TOKEN: .
=====
TAG: .          POS: PUNCT
EXPLANATION: punctuation mark, sentence closer

TOKEN: Maharashtra
=====
TAG: NNP        POS: PROPN
EXPLANATION: noun, proper singular

TOKEN: is
=====
TAG: VBZ        POS: AUX
EXPLANATION: verb, 3rd person singular present

TOKEN: my
=====
TAG: PRP$       POS: DET
EXPLANATION: pronoun, possessive

TOKEN: state
=====
TAG: NN         POS: NOUN
EXPLANATION: noun, singular or mass

TOKEN: .
=====
TAG: .          POS: PUNCT
EXPLANATION: punctuation mark, sentence closer"""