from flask import Flask, request, jsonify
from flask_cors import CORS
from googletrans import Translator
from langdetect import detect
from spellchecker import SpellChecker

app = Flask(__name__)
CORS(app)  # Allow CORS for all domains

translator = Translator()
spell = SpellChecker()

# Test updated main

# Check if endpoints are working
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({'status': 'Server is running'})

@app.route('/echo', methods=['GET'])
def echo():
    message = request.args.get('message', 'No message provided.')
    return jsonify({'echoed_message': message})

# Translate text
@app.route('/translate', methods=['POST'])
def translate_text():
    if request.method == 'POST':
        data = request.get_json()
        text = data.get('text', '')
        src_lang = 'tl'  # Default source language is Tagalog ('tl')
        dest_lang = 'en'  # Default destination language is English ('en')

        # Detect the language of the input text
        detected_language = detect(text)

        # Check if the text is already in English
        if detected_language != 'en':
            # If not in English, translate the text
            text = translator.translate(text, src=src_lang, dest=dest_lang).text

        # Correct typos in the input text
        corrected_text = correct_typos(text)
        
        return jsonify({'translated_text': corrected_text, 'detected_language': detected_language})

    else:
        # return jsonify({'translated_text': "error", 'detected_language': ""})
        return jsonify({'error': 'Only POST requests are allowed'})


def correct_typos(text):
    # Split the text into words
    words = text.split()

    # Correct spelling for each word
    corrected_words = []
    for word in words:
        corrected_word = spell.correction(word)
        if corrected_word is not None:
            corrected_words.append(corrected_word)
        else:
            corrected_words.append(word)  # If correction is None, keep the original word

    # Reconstruct the text with corrected words
    corrected_text = ' '.join(corrected_words)
    return corrected_text

# if __name__ == '__main__':
#     app.run(debug=True)
