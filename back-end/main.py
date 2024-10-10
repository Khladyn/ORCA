from flask import Flask, request, jsonify
from flask_cors import CORS
from googletrans import Translator
from langdetect import detect
from spellchecker import SpellChecker
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, LSTM, Dense

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

if __name__ == '__main__':
    app.run(debug=True)



# Read conversations from the text file
# conversations_file = "dataset.txt"
# conversations = []
# with open(conversations_file, "r") as file:
#     for line in file:
#         question, answer = line.strip().split(";")
#         conversations.append((question, answer))

# # Create vocabulary from conversations
# vocab = set()
# for question, answer in conversations:
#     vocab.update(question.split())
#     vocab.update(answer.split())
# vocab = sorted(vocab)

# # Create word-to-index and index-to-word mappings
# word2idx = {word: idx for idx, word in enumerate(vocab)}
# idx2word = {idx: word for word, idx in word2idx.items()}

# # Convert conversations into sequences of indices
# def text_to_sequence(text):
#     return [word2idx[word] for word in text.split()]

# X = [text_to_sequence(question) for question, _ in conversations]
# Y = [text_to_sequence(answer) for _, answer in conversations]

# # Pad sequences to have the same length
# max_seq_length = max(max(len(x), len(y)) for x, y in zip(X, Y))
# X = tf.keras.preprocessing.sequence.pad_sequences(X, maxlen=max_seq_length, padding='post')
# Y = tf.keras.preprocessing.sequence.pad_sequences(Y, maxlen=max_seq_length, padding='post')

# # Define the model architecture
# model = Sequential([
#     Embedding(len(vocab), 128, input_length=max_seq_length),
#     LSTM(128),
#     Dense(len(vocab), activation='softmax')
# ])

# # Compile the model
# model.compile(optimizer='adam',
#               loss='sparse_categorical_crossentropy',
#               metrics=['accuracy'])

# # Train the model
# model.fit(X, Y, epochs=100)

# @app.route('/process', methods=['POST'])
# def generate_response():
#     if request.method == 'POST':
#         data = request.get_json()
#         input_text = data.get('input_text', '')

#         input_seq = text_to_sequence(input_text)
#         input_seq = tf.keras.preprocessing.sequence.pad_sequences([input_seq], maxlen=max_seq_length, padding='post')
#         predicted = model.predict(input_seq)[0]
#         predicted_word_idxs = tf.argmax(predicted, axis=1).numpy()
#         response = [idx2word[idx] for idx in predicted_word_idxs]

#         return jsonify({'response': response})

#     else:
#         return jsonify({'error': 'Only POST requests are allowed'})
