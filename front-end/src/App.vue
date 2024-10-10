<script setup lang="ts">
import { ref } from 'vue'
import { format } from 'date-fns';
import * as tf from '@tensorflow/tfjs'
import * as use from '@tensorflow-models/universal-sentence-encoder'
import { profanity } from '@2toad/profanity'
import { jsPDF } from 'jspdf';
import axios from 'axios'
import OpenAI from "openai";

const messages = ref<Message[]>([]);

const translateText = (text:string) => {
  // Return a promise that resolves when the translation is complete
  return new Promise((resolve, reject) => {
    axios
      .post('http://localhost:5000/translate', {
        text: text,
      })
      .then((response) => {
        console.log(response.data);
        translatedText = response.data.translated_text;
        timestamp = formatTimestamp(new Date());
        const index = messages.value.findIndex((message) => message.text === text);

        if (index > -1) {
          messages.value[index] = { text: translatedText, from: 'user', timestamp };
          console.log(messages);
        } else {
          console.error("Text cannot be found");
        }
        // Resolve the promise once translation is complete
        resolve(response);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        // Reject the promise if there is an error
        reject(error);
      });
  });
};

const generateResponse = (inputText: string) => {
  // Return a promise that resolves when the response is generated
  return new Promise((resolve, reject) => {
    isBotTyping.value = true;
    axios
      .post('http://localhost:5000/process', {
        input_text: inputText,
      })
      .then((response) => {
        console.log(response.data);
        const generatedResponse = response.data.response;
        
        // Resolve the promise with the generated response
        resolve(generatedResponse);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        // Reject the promise if there is an error
        reject(error);
      });
  });
};

//chatbox 
const isChatVisible = ref(false);

//modal
let showWelcomeModal = ref(true);
let showConsentForm = ref(false);
let feedbackVisible = ref(false)
let showNewChatButton = ref(false)
const showSettingsMenu = ref(false);

//user content and input data
let isBotTyping = ref<boolean>(false);
let hasConsent = ref(false); 
let consentData = ref({
  name: '',
  contactNumber: '',
  email: ''
})
const showEndChatModal = ref(false);

const showEndChatConfirmation = () => {
    showEndChatModal.value = true;
};

const cancelEndChat = () => {
    showEndChatModal.value = false;
};


const handleFAQButtonClick = (question: string) => {
    userInput.value = question;
    sendMessage();
};

const resetChatbotState = () => {
    isChatVisible.value = false;
    showWelcomeModal.value = true;
    showConsentForm.value = false;
    feedbackVisible.value = false;
    showNewChatButton.value = false;
    hasConsent.value = false;
    userInput.value = '';
    consentData.value = {
        name: '',
        contactNumber: '',
        email: ''
    };
    messages.value = [];
};

const faqButtonContainer = document.createElement('div');
    faqButtonContainer.className = 'faq-button-container';

    const faqQuestions = [
        'How do I register for classes?',
        'When is the deadline to drop a course?',
        'What is the process for changing my major?',
        'How do I request a transcript?',
        'Where can I find information about graduation requirements?'
    ];

    faqQuestions.forEach((question) => {
        const buttonElement = document.createElement('button');
        buttonElement.textContent = question;
        buttonElement.className = 'faq-button';
        buttonElement.onclick = () => handleFAQButtonClick(question);
        faqButtonContainer.appendChild(buttonElement);
      });

const liveSupportURL = "https://registrar.ust.edu.ph/contact";

const toggleSettingsMenu = () => {
  showSettingsMenu.value = !showSettingsMenu.value;
};

const chatState = ref<ChatState>({
    messages: [],
    userInput: '',
    isBotTyping: false
});

const handleChatbotButtonClick = () => {
    if (!isChatVisible.value) {
        isChatVisible.value = true;
        if (chatState.value) {
            messages.value = chatState.value.messages;
            userInput.value = chatState.value.userInput;
            isBotTyping.value = chatState.value.isBotTyping;
        }
    } else {
        window.open(liveSupportURL, '_blank');
    }
};

const handleStartChatClick = () => {
  showWelcomeModal.value = false;
  // isChatVisible.value = true;
  showConsentForm.value = true;
  hasConsent.value = false;
    userInput.value = '';
    consentData.value = {
        name: '',
        contactNumber: '',
        email: ''
    };
    messages.value = [];
};

const handleConsentFormSubmit = () => {

  const messageContainer = document.querySelector('.messageBox');
  appendFaq(messageContainer, faqButtonContainer);

  hasConsent.value = true
  showConsentForm.value = false;
  isChatVisible.value = true;
  const greetingMessage = `Greetings ${consentData.value.name}, How may I help you today? Below are the commonly asked question for the services provided of the Office of the Registrar. Kindly select one.`

  botResponse.value = greetingMessage
  timestamp = formatTimestamp(new Date())
  messages.value.push({ text: greetingMessage, from: 'bot', timestamp })

  if (soundOn.value) {
      const audio = new Audio('../assets/bot-response.mp3')
      audio.play()
      playSoundNotification()
      speakText(greetingMessage)
    }
};

function appendFaq(messageContainer: Element | null, faqButtonContainer: HTMLElement) {
  console.log(messages.value.length);
  if (messageContainer) {
    console.log("MESSAGE CONTAINER");
    if (messages.value.length < 1) {
      console.log("LESS THAN LENGHT");
      messageContainer.appendChild(faqButtonContainer);
    } else {
      console.log("else MESSAGE CONTAINER");
      // If there are more than 2 messages, remove faqButtonContainer
      if (faqButtonContainer.parentNode === messageContainer) {
        messageContainer.removeChild(faqButtonContainer);
      }
    }
  }
}



function generatePDF() {
    const doc = new jsPDF({
        orientation: 'p', // Portrait orientation
        unit: 'in', // Inch units
        format: [8.5, 11] // Letter size
    });

    // Set margins
    const margin = 1; // 1 inch
    const marginLeft = margin;
    const marginRight = doc.internal.pageSize.width - margin;
    const marginTop = margin;
    const marginBottom = doc.internal.pageSize.height - margin;

    // Set font size
    doc.setFontSize(12);

    // Initialize y position for the messages
    let y = marginTop; // Start from the top margin

    // Loop through messages array and add each message to the PDF
    messages.value.forEach(message => {
        // Set font style and color based on message sender
        if (message.from === 'user') {
            doc.setTextColor(0, 0, 255); // Blue color for user messages
        } else {
            doc.setTextColor(0, 0, 0); // Black color for bot messages
        }

        // Add timestamp
        doc.text(message.timestamp, marginLeft, y);

        // // Add sender's name
        // doc.text(`${message.from}:`, marginLeft + 1, y);

        // Wrap message text within paragraph
        const paragraph = doc.splitTextToSize(message.text, marginRight - marginLeft - 1);

        // Add wrapped text to PDF
        const textLines = doc.splitTextToSize(paragraph, marginRight - marginLeft - 1);
        textLines.forEach((line: any) => {
            doc.text(line, marginLeft + 1.5, y);
            y += doc.getTextDimensions(line).h / doc.internal.scaleFactor + 0.25; // Update y position for the next line
            if (y > marginBottom) {
                doc.addPage(); // Start a new page
                y = marginTop; // Reset y position to top margin
            }
        });

        // Add spacing between messages
        y += 0.25;

        // Check if content exceeds bottom margin
        if (y > marginBottom) {
            doc.addPage(); // Start a new page
            y = marginTop; // Reset y position to top margin
        }
    });

    // Save the PDF
    doc.save(`ORCA_CONVO_${consentData.value.name}.pdf`);
}

// Initialize TensorFlow.js
tf.setBackend('webgl') // Set the backend (e.g., 'webgl' or 'cpu')
tf.ready() // Ensure TensorFlow.js is ready

// Define reactive variables
let userInput = ref<string>('')
let botResponse = ref('')
let model: any
let modelLoaded = ref(false)
let timestamp: any
let soundOn = ref(true)
// let selectedRating = ref(0)
let messageBox = ref<HTMLElement | null>(null);

let translateEnabled = ref(false)
let showTranslateSwitch = ref(false)
let recognition: any
let utterance: any
let translatedText: string
profanity.addWords(['putangina', 'tangina', 'ulol', 'yawa', 'pisti', 'bobo', 'deputa', 'pokpok', 'gago', 'puta', 'gaga', 'siraulo', 'tanga']);

const endChat = () => {
  isChatVisible.value = true;
  feedbackVisible.value = true;
  showEndChatModal.value = false;
  messages.value = []

  const faqButtonContainer = document.querySelector('.faq-button-container');
    if (faqButtonContainer) {
        const faqButtonContainerElement = faqButtonContainer as HTMLElement;
        faqButtonContainerElement.style.display = 'none';
    }

  const inputElements = document.querySelectorAll('.inputContainer input, .inputContainer button')
  inputElements.forEach((element) => {
    const inputElement = element as HTMLInputElement | HTMLButtonElement
    inputElement.disabled = true
  })

}

const openFeedbackLink = () => {
  window.open('https://bit.ly/rvtr', '_blank');
}

const closeFeedbackModal = () => {
  feedbackVisible.value = false
  showNewChatButton.value = true
  showWelcomeModal.value = true;
}

const closeChat = () => {
  resetChatbotState();
};

interface Message {
  text: string;
  from: string;
  timestamp: string;
}

interface ChatState {
    messages: Message[];
    userInput: string;
    isBotTyping: boolean;
}

const minimizeChat = () => {
  chatState.value.messages = [...messages.value];
  chatState.value.userInput = userInput.value;
  chatState.value.isBotTyping = isBotTyping.value;
  isChatVisible.value = false;
};

const reopenChatbox = () => {
    messages.value = [...chatState.value.messages];
    userInput.value = chatState.value.userInput;
    isBotTyping.value = chatState.value.isBotTyping;
    isChatVisible.value = true;
};

const playSoundNotification = () => {
  if (soundOn.value) {
    const audio = new Audio('public/assets/bot-response.mp3')
    audio.play()
  }
}

  const inputElements = document.querySelectorAll('.inputContainer input, .inputContainer button')
  inputElements.forEach((element) => {
    const inputElement = element as HTMLInputElement | HTMLButtonElement
    inputElement.disabled = false
  })


//toggle sound
const toggleSound = () => {
  soundOn.value = !soundOn.value
  if (!soundOn.value && utterance) {
    window.speechSynthesis.cancel();
  }
}

// Function to handle user input and generate response
let processInput = async (input: string) => {
  if (!model) {
    botResponse.value = 'Model is not yet loaded. Please wait.'
    return
  }
  // Check if profanity exists in the user input and censor it if detected
  let containsProfanity = profanity.exists(input.trim())

  const inputObj = {
    queries: [containsProfanity ? 'profanity' : input.trim()],
    responses: Object.values(responses).flatMap((value) => value)
  }

  // Calculate the dot product of two vector arrays.
  const dotProduct = (xs: number[], ys: number[]): number | undefined => {
    const sum = (xs: number[]): number => (xs ? xs.reduce((a, b) => a + b, 0) : 0)

    return xs.length === ys.length
      ? sum(zipWith((a: number, b: number) => a * b, xs, ys))
      : undefined
  }

  // zipWith :: (a -> b -> c) -> [a] -> [b] -> [c]
  const zipWith = (f: Function, xs: any[], ys: any[]): any[] => {
    const ny = ys.length
    return (xs.length <= ny ? xs : xs.slice(0, ny)).map((x, i) => f(x, ys[i]))
  }

  try {
    const embeddings = await model.embed(inputObj)
    const embedQuery = embeddings['queryEmbedding'].arraySync()[0]
    const embedResponses = embeddings['responseEmbedding'].arraySync()
    let maxDotProduct = -Infinity
    let bestResponse = ''
    let bestResponseIndex = -1

    for (let i = 0; i < embedResponses.length; i++) {
      const dotProd = dotProduct(embedQuery, embedResponses[i])
      if (dotProd && dotProd > maxDotProduct) {
        maxDotProduct = dotProd
        bestResponseIndex = i
      }
    }

    bestResponse = inputObj.responses[bestResponseIndex]
    botResponse.value = bestResponse || 'I am not sure how to respond to that.'
    timestamp = formatTimestamp(new Date())
    messages.value.push({ text: botResponse.value, from: 'bot', timestamp })

    if (soundOn.value) {
      const audio = new Audio('../assets/bot-response.mp3')
      audio.play()
      playSoundNotification()
      // speakText()
    }

    console.log(messages.value)

  } catch (error) {
    console.error('Error processing input:', error)
    botResponse.value = 'An error occurred while processing your input. Please try again.'
  }
};

const toggleTranslateSwitch = () => {
  showTranslateSwitch.value = !showTranslateSwitch.value
}

// timestamp
const formatTimestamp = (date: Date): string => {
  return format(date, 'MM/dd/yy HH:mm');
}

const sendMessage = () => {
  console.log('send message called: ', userInput.value)
  const messageContainer = document.querySelector('.messageBox');
  appendFaq(messageContainer, faqButtonContainer);

  isBotTyping.value = true;
  timestamp = formatTimestamp(new Date())
  let trimmedInput = userInput.value.trim()

  // Call translateText and wait for it to finish using promises
  translateText(trimmedInput).then(() => {
  messages.value.push({
    text: profanity.exists(translatedText) ? profanity.censor(translatedText) : translatedText,
    from: 'user',
    timestamp: timestamp    
  });

  // Check if profanity exists in the user input and censor it if detected
  let containsProfanity = profanity.exists(trimmedInput)



  // After adding the user message, process the input
  // processInput(translatedText).then(() => {
  //   // After processing input, scroll to the bottom of the message box
  //   if (messageBox.value) {
  //     messageBox.value.scrollTop = messageBox.value.scrollHeight;
  //     isBotTyping.value = false;
  //   }
  // });

    // generateResponse(translatedText).then(() => {
  //   // After processing input, scroll to the bottom of the message box
  //   if (messageBox.value) {
  //     messageBox.value.scrollTop = messageBox.value.scrollHeight;
  //   }
  // });

  userInput.value = ''

});

}

let recordAudio = () => {
  function isSpeechRecognitionAvailable(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  }

  if (isSpeechRecognitionAvailable()) {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    recognition = new SpeechRecognition()

    // Dynamically set language based on the toggle switch state
    recognition.lang = translateEnabled.value ? 'fil-PH' : 'en-US'
    console.log(recognition.lang);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      userInput.value = transcript
      console.log(userInput.value)
      sendMessage()
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)

      // Add the chatbot's greeting message
      const greetingMessage = `I'm sorry I didn't catch that. Could you please repeat the question?`

      botResponse.value = greetingMessage
      timestamp = formatTimestamp(new Date())
      messages.value.push({ text: greetingMessage, from: 'bot', timestamp })
      // speakText(greetingMessage)
    }

    recognition.start()
  } else {
    console.error('Speech recognition not available in this browser.')
  }
}

function speakText(text: string) {
  // Function to check if SpeechSynthesis is available
  function isSpeechSynthesisAvailable(): boolean {
    return 'speechSynthesis' in window
  }

  // Check if SpeechSynthesis is available
  if (isSpeechSynthesisAvailable()) {
    // Create a new SpeechSynthesisUtterance object with the text
    utterance = new SpeechSynthesisUtterance(text); // Use the provided text

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 2) {
      utterance.voice = voices[0]
    } else {
      console.warn('Insufficient voices available.')
    }

    utterance.rate = 1.5;

  // Speak the text
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    // Cancel any ongoing or pending speech synthesis
    window.speechSynthesis.cancel();
  }
  window.speechSynthesis.speak(utterance);

  } else {
    console.error('Speech synthesis not available in this browser.')
  }
}

let responses: Record<any, any> = {
  hi: [
    'Hello! How can I assist you today?',
    'Hi there! What can I help you with?',
    'Greetings! How may I be of service to you?'
  ],
  'how are you': [
    'I am just a virtual assistant, but thank you for asking!',
    "As an AI, I don't have feelings, but I'm here to help!",
    "I'm here and ready to assist you!"
  ],
  bye: [
    'Goodbye! Have a great day!',
    'See you later! Take care!',
    'Farewell! Feel free to return anytime!'
  ],
  thanks: [
    "You're welcome! Feel free to ask if you need further assistance.",
    'No problem! Let me know if you need anything else.',
    "Glad I could help! Don't hesitate to reach out again."
  ],
  help: [
    "Sure, I'm here to help. What do you need assistance with?",
    'Of course! What can I assist you with today?',
    'Absolutely! How can I lend a hand?'
  ],
  yes: [
    'Great! What can I do for you?',
    'Awesome! How can I assist you further?',
    'Fantastic! What do you need help with?'
  ],
  no: [
    'No problem. Let me know if you change your mind.',
    "That's alright. I'm here if you need anything else.",
    'Okay, feel free to reach out if you need assistance later.'
  ],
  'good morning': [
    'Good morning! How can I assist you today?',
    'Morning! What can I help you with?',
    'Greetings! Ready to tackle the day?'
  ],
  'good night': [
    'Goodnight! Sweet dreams.',
    'Nighty night! Rest well!',
    'Sleep tight! See you tomorrow!'
  ],
  'how can i help': [
    'You can ask me anything!',
    "I'm here to assist you with whatever you need!",
    'Feel free to tell me what you require assistance with!'
  ],
  information: [
    'Sure, what information are you looking for?',
    'I can provide you with the information you need. What do you want to know?',
    'Information at your service! What do you need?'
  ],
  question: [
    'Feel free to ask any question you have.',
    "I'm here to answer any questions you may have!",
    "Ask away! I'm ready to assist."
  ],
  suggestion: [
    'I appreciate your suggestion. Please share it with me.',
    "Thank you for your suggestion! I'm listening.",
    'Suggestion noted! Feel free to share any ideas you have.'
  ],
  feedback: [
    'Your feedback is valuable to me. What would you like to share?',
    "I'm all ears for your feedback. Please let me know.",
    "Feedback is important! Tell me what's on your mind."
  ],
  error: [
    'Oops! Something went wrong. Please try again later.',
    'Oh no! An error occurred. Please try again later.',
    'Sorry, there seems to be an issue. Please try again later.'
  ],
  greeting: [
    'Hello! How can I assist you today?',
    'Greetings! What brings you here?',
    'Hi there! Ready to assist you!'
  ],
  clarification: [
    'Could you please provide more details?',
    'I could use some more information. Can you elaborate?',
    'I need more context. Can you clarify further?'
  ],
  confirmation: [
    'Got it! Is there anything else you need?',
    'Confirmed! Anything else I can assist you with?',
    'Acknowledged! Do you require any further assistance?'
  ],
  apology: [
    'I apologize for any inconvenience. How can I make it right?',
    'Sorry for the inconvenience. How can I assist you further?',
    'My apologies. How can I help resolve the issue?'
  ],
  query: [
    'Feel free to ask me any query you have.',
    "I'm here to help with any queries you may have!",
    "Ask me anything! I'm ready to answer your queries."
  ],
  profanity: [
    'Please be polite in your communication. Our university community values respect and professionalism in all interactions.',
    "We encourage respectful language in our conversations. Let's keep our discussions courteous and professional.",
    "I kindly ask that you refrain from using inappropriate language. Let's maintain a respectful and constructive dialogue."
  ],
  'how do I register for classes':
    "You can register for classes through our online portal or by visiting the registrar's office.",
  'when is the deadline to drop a course':
    'The deadline to drop a course varies depending on the semester. You can find the exact deadline on our academic calendar.',
  'what is the process for changing my major':
    'To change your major, you need to fill out a Change of Major form and meet with an academic advisor to discuss the requirements.',
  'how do I request a transcript':
    "You can request a transcript online through our student portal or by submitting a Transcript Request Form to the registrar's office.",
  'where can I find information about graduation requirements':
    'You can find information about graduation requirements in the university catalog or by speaking with an academic advisor.',
  'what is the procedure for withdrawing from the university':
    'To withdraw from the university, you need to fill out a Withdrawal Form and meet with a counselor to discuss the process and any implications.',
  'how do I apply for graduation':
    "You can apply for graduation through our online portal or by submitting a Graduation Application to the registrar's office.",
  'what is the process for requesting an official document':
    "To request an official document, such as a letter of enrollment or degree verification, you need to submit a Request for Official Document form to the registrar's office.",
  'where can I find information about tuition and fees':
    "You can find information about tuition and fees on our website or by contacting the Bursar's office.",
  'how do I update my personal information':
    "You can update your personal information, such as your address or phone number, through the student portal or by submitting a Change of Personal Information form to the registrar's office.",
  'what should I do if I have a hold on my account':
    "If you have a hold on your account, you should contact the registrar's office to determine the reason for the hold and the steps needed to resolve it.",
  'how do I request for Diploma':
    'You may request for a copy of your Diploma through the Office of the Registrar official website (https://registrar.ust.edu.ph) click services, or you may go to the Office of the Registrar, Main Building 2nd Floor every Mondays to Fridays 8:00 AM to 12:00 NN; 1:00 PM to 5:00 PM, Kindly take note that application of records required payment throught the Treasury Department that operated only until 11:00 AM in the moring and 4:00 PM in the afternoon.'
}

// Load the QnA model.
use
  .loadQnA()
  .then((loadedModel) => {
    model = loadedModel
    modelLoaded.value = true
  })
  .catch((error) => {
    console.error('Error loading QnA model:', error)
    modelLoaded.value = false
  })

// Debugging the state
console.log('Initial chat visibility:', isChatVisible.value);
console.log('Initial welcome page visibility:', showWelcomeModal.value);
console.log('Initial consent form visibility:', hasConsent.value);

</script>

<template>
  <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
  
  <body>
  <img src="../public/assets/or-bg.png" class="body-img" alt="Office of the Registrar Website">

  <button class="chatbotButton" @click="handleChatbotButtonClick" title="Contact Live Support">
      <img src="../public/assets/orca.png" alt="Chatbot Logo" />
    </button>

  <transition name="chatbox">
    <div class="chatbox-container" v-if="isChatVisible">
      <div class="container">
  
        <div class="chat-header">
          <h3>O R C A</h3>
  
          <div class="header-button-group">
            <button class="settings-button header-button" @click="toggleSettingsMenu">
              <span class="material-icons">settings</span>
            </button>

            <!-- Minimize button -->
            <button class="minimizeButton header-button" @click="minimizeChat">
              <span class="material-icons">remove</span>
            </button>

            <!-- Close button -->
            <button class="closeButton header-button" @click="closeChat">
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>

        <div v-if=isBotTyping class="loading-container">
          <img src="../public/assets/load1.gif" alt="loading..." class="typing-gif" />
        </div>
      
        <div class="messageBox" ref="messageBox">
        
          <!-- Welcome Modal -->
          <transition name="welcome-modal">
            <div v-if="showWelcomeModal" class="welcome-modal">
              <div class="welcome-modal-content">
                <h1>Welcome to ORCA!</h1>
                <p>I'm your virtual assistant. Let's get started!</p>
                <button
                  class="start-chat-button"
                  @click="handleStartChatClick"
              >
                  {{ showNewChatButton ? 'New Chat' : 'Start Chat' }}
              </button>
              </div>
            </div>
          </transition>

          <transition name="consent-form-slide-up-exit">
          <div v-if="showConsentForm" class="consent-form-container">
  
            <h2 class="consent-form-title">Consent Form</h2>
            <!-- Consent form -->
            <form @submit.prevent="handleConsentFormSubmit">
              <div class="form-group">
                <label for="name">Name:</label>
                <input type="text" v-model="consentData.name" id="name" required />
              </div>
              <div class="form-group">
                <label for="contactNumber">Contact Number:</label>
                <input type="tel" v-model="consentData.contactNumber" id="contactNumber" required />
              </div>
              <div class="form-group">
                <label for="email">Email:</label>
                <input type="email" v-model="consentData.email" id="email" required />
              </div>
              <div class="consent-message">
                <p>By using this platform, you agree to the collection and use of the information you provide. 
                  Your data may be processed to improve the chatbot's performance and your experience. 
                  Please contact support with any concerns.</p>
              </div>
              <div class="consent-button-container">
              <button type="submit" id="consent-trigger" class="consent-button">Submit</button>
            </div>
          </form>
          </div>
        </transition>
  
        <div v-for="(message, index) in messages" :key="index" :class="{ 'user-message': message.from === 'user', 'bot-message': message.from === 'bot' }">
              <div class="messageWrapper" :class="{ userMessageWrapper: message.from === 'user', chatbotMessageWrapper: message.from === 'bot' }">
                  <div :class="{ userMessageContent: message.from === 'user', chatbotMessageContent: message.from === 'bot' }">
                      {{ message.text }}
                      <div :class="{ userMessageTimestamp: message.from === 'user', chatbotMessageTimestamp: message.from === 'bot' }">
                          {{ message.timestamp }}
                      </div>
                  </div>
              </div>
          </div>
          <button v-if="messages.length > 0" class="end-chat-button" @click="showEndChatConfirmation">
              End Chat
          </button>
        </div>

          <!-- End chat confirmation modal -->
          <transition name="modal">
            <div v-if="showEndChatModal" class="modal-container">
                <div class="modal-content">
                    <button class="close-modal-button" @click="cancelEndChat">
                        <span class="material-icons">close</span>
                    </button>
                    <h2>Are you sure you want to end chat?</h2>
                    <div class="button-group">
                        <button class="proceed-button" @click="endChat">
                            Proceed
                        </button>
                        <button class="cancel-button" @click="cancelEndChat">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </transition>

        <transition name="modal">
        <div v-if="feedbackVisible" class="modal-container">
      <div class="modal-content">
  
        <button class="modal-close-button" @click="closeFeedbackModal">
              <span class="material-icons">close</span>
          </button>
  
          <p class="feedback-message">
              Kindly rate us and give us feedback on our service!
          </p>
          <button class="feedback-button" @click="openFeedbackLink">
              Feedback
          </button>
      </div>
      </div>
    </transition>
    
      <!-- <button v-if="showNewChatButton" class="new-chat-button" @click="restartChatbot">
      New Chat
      </button> -->

        <div class="inputContainer">
          <input
            class="messageInput"
            v-model="userInput"
            type="text"
            placeholder="Ask me anything..."
            @keyup.enter="sendMessage"
            :disabled="!modelLoaded || !hasConsent"
            :title="!hasConsent ? 'Kindly accomplish the Consent Form to proceed with using the chatbot' : ''"
            maxlength="500"
          />
          <button
          class="askButton"
          @click="sendMessage"
          :disabled="!modelLoaded || !hasConsent"
          :class="{ 'disabled-button': !modelLoaded || !hasConsent }"
          :title="!hasConsent ? 'Kindly accomplish the Consent Form to proceed with using the chatbot' : ''"
        >
        <span class="material-icons">send</span>
        </button>
        <button
          class="askButton"
          @click="recordAudio"
          :disabled="!modelLoaded || !hasConsent"
          :class="{ 'disabled-button': !modelLoaded || !hasConsent }"
          :title="!hasConsent ? 'Kindly accomplish the Consent Form to proceed with using the chatbot' : ''"
        >
        <span class="material-icons">mic</span>
        </button>
  
        </div>

      <!-- Settings menu -->
      <transition name="modal">
        <div v-if="showSettingsMenu" class="settings-modal">
          <div class="settings-modal-content">
            <button class="close-modal-button" @click="toggleSettingsMenu">
              <span class="material-icons">close</span>
            </button>

            <!-- Sound toggle -->
            <div class="setting-item" @click="toggleSound">
              <span class="material-icons">
                {{ soundOn ? 'volume_up' : 'volume_off' }}
              </span>
              <span>Sound</span>
            </div>

            <!-- Translation toggle -->
            <div class="setting-item">
              <div class="translation-container" @click="toggleTranslateSwitch">
              <span class="material-icons">public</span>
              <span>Translation</span>
            </div>

            <div v-if="showTranslateSwitch" class="translate-switch-container">
                <span> ENG </span>    
                <label class="switch">
                      <input type="checkbox" v-model="translateEnabled" />
                      <span class="slider round"></span>
                    </label>
                    <span> FIL </span>
                  </div>
              </div>
            <!-- Download report -->
            <div class="setting-item" @click="generatePDF">
              <span class="material-icons">download</span>
              <span>Download Report</span>
            </div>
          </div>
        </div>
      </transition>
    </div>
    </div>
  </transition>
</body>
  </template>
  
  
