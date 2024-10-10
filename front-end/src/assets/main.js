import { ref } from 'vue'
import * as tf from '@tensorflow/tfjs'
import * as use from '@tensorflow-models/universal-sentence-encoder'
import { profanity } from '@2toad/profanity'
// import { CensorType } from '@2toad/profanity/dist/models'

// Initialize TensorFlow.js
tf.setBackend('webgl') // Set the backend (e.g., 'webgl' or 'cpu')
tf.ready() // Ensure TensorFlow.js is ready

// Define reactive variables
let userInput = ref('')
let botResponse = ref('')
let model: any
let modelLoaded = ref(false)
let timestamp: any
let isChatVisible = ref(false)
let feedbackVisible = ref(false)
let soundOn = ref(true)
let selectedRating = ref(0)
let showNewChatButton = ref(false)

let hasConsent = ref(false)
let consentData = ref({
  name: '',
  contactNumber: '',
  email: ''
})

let translateEnabled = ref(false)
let showTranslateSwitch = ref(false)

const handleConsentFormSubmit = () => {
  hasConsent.value = true
  console.log('Consent data:', consentData.value)
}

// Function to toggle chat visibility
const toggleChatVisibility = () => {
  isChatVisible.value = !isChatVisible.value
}

interface Message {
  text: string
  from: string
  timestamp: string
}

const minimizeChat = () => {
  isChatVisible.value = false
}

const closeChat = () => {
  messages.value = []
  hasConsent.value = false
  consentData.value = {
    name: '',
    contactNumber: '',
    email: ''
  }
  isChatVisible.value = false
  userInput.value = ''
  const inputElements = document.querySelectorAll('.inputContainer input, .inputContainer button')
  inputElements.forEach((element) => {
    const inputElement = element as HTMLInputElement | HTMLButtonElement
    inputElement.disabled = true
  })
}

let messages = ref<Message[]>([])

const playSoundNotification = () => {
  if (soundOn.value) {
    const audio = new Audio('../assets/bot-response.mp3')
    audio.play()
  }
}

const endChat = () => {
  messages.value = []

  const inputElements = document.querySelectorAll('.inputContainer input, .inputContainer button')
  inputElements.forEach((element) => {
    const inputElement = element as HTMLInputElement | HTMLButtonElement
    inputElement.disabled = true
  })

  feedbackVisible.value = true
}

// feedback link
const openFeedbackLink = () => {
  const feedbackUrl = 'https://bit.ly/rvtr'
  window.open(feedbackUrl, '_blank')
}

const rate = (rating: number) => {
  selectedRating.value = rating
}

const closeFeedbackModal = () => {
  feedbackVisible.value = false
  showNewChatButton.value = true
}

const restartChatbot = () => {
  messages.value = []
  selectedRating.value = 0
  feedbackVisible.value = false
  showNewChatButton.value = false
  isChatVisible.value = true
  userInput.value = ''
  hasConsent.value = false
  consentData.value = {
    name: '',
    contactNumber: '',
    email: ''
  }

  const inputElements = document.querySelectorAll('.inputContainer input, .inputContainer button')
  inputElements.forEach((element) => {
    const inputElement = element as HTMLInputElement | HTMLButtonElement
    inputElement.disabled = false
  })
}

//toggle sound
const toggleSound = () => {
  soundOn.value = !soundOn.value
}

//google translate
// const translateChat = () => {
//   const chatText = messages.value.map(message => message.text).join('\n');

//   // Open Google Translate with the chat text
//   const translateUrl = `https://translate.google.com/?text=${encodeURIComponent(chatText)}`;
//   window.open(translateUrl, '_blank');
// };

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
      speakText()
    }

    console.log(messages.value)
  } catch (error) {
    console.error('Error processing input:', error)
    botResponse.value = 'An error occurred while processing your input. Please try again.'
  }
}

const toggleTranslateSwitch = () => {
  showTranslateSwitch.value = !showTranslateSwitch.value
}

// timestamp
const formatTimestamp = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const sendMessage = () => {
  console.log('send message called: ', userInput.value)

  timestamp = formatTimestamp(new Date())
  let trimmedInput = userInput.value.trim()

  messages.value.push({
    text: profanity.exists(trimmedInput) ? profanity.censor(trimmedInput) : trimmedInput,
    from: 'user',
    timestamp: timestamp
  })

  processInput(trimmedInput)
  userInput.value = ''
}

let recordAudio = () => {
  function isSpeechRecognitionAvailable(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
  }

  if (isSpeechRecognitionAvailable()) {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    // Remove explicit language setting to auto-detect language
    // recognition.lang = 'en-US, fil-PH'

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      userInput.value = transcript
      console.log(userInput.value)
      sendMessage()
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
    }

    recognition.start()
  } else {
    console.error('Speech recognition not available in this browser.')
  }
}

// let recognition: any // Declare recognition globally

// let recordAudio = () => {
//   function isSpeechRecognitionAvailable(): boolean {
//     return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
//   }

//   if (isSpeechRecognitionAvailable()) {
//     const SpeechRecognition =
//       (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
//     recognition = new SpeechRecognition()

//     // Configure continuous mode
//     recognition.continuous = true
//     recognition.interimResults = true // Enable interim results to get immediate feedback

//     let finalTranscript = ''

//     // Event handler for speech recognition result
//     recognition.onresult = (event: any) => {
//       let interimTranscript = ''
//       for (let i = event.resultIndex; i < event.results.length; i++) {
//         const transcript = event.results[i][0].transcript
//         if (event.results[i].isFinal) {
//           finalTranscript += transcript + ' ' // Append to final transcript
//         } else {
//           interimTranscript += transcript // Store interim transcript
//         }
//       }
//       userInput.value = interimTranscript // Update user input with interim transcript
//       // Call sendMessage if there's no interim transcript
//       if (finalTranscript !== '') {
//         sendMessage()
//       }
//       console.log('FINAL: ', finalTranscript)
//       console.log(interimTranscript) // Log interim transcript
//     }

//     // Start recognition
//     recognition.start()

//     // Event handler for speech recognition error
//     recognition.onerror = (event: any) => {
//       console.error('Speech recognition error:', event.error)
//       recognition.stop() // Stop recognition on error
//     }
//   } else {
//     console.error('Speech recognition not available in this browser.')
//   }
// }

let speakText = () => {
  // if (recognition) {
  //   recognition.abort() // Abort speech recognition to prevent interference
  // }

  // Function to check if SpeechSynthesis is available
  function isSpeechSynthesisAvailable(): boolean {
    return 'speechSynthesis' in window
  }

  // Check if SpeechSynthesis is available
  if (isSpeechSynthesisAvailable()) {
    // Create a new SpeechSynthesisUtterance object with the text
    const utterance = new SpeechSynthesisUtterance(botResponse.value)

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 2) {
      utterance.voice = voices[0] // Set the voice to the third available voice
    } else {
      console.warn('Insufficient voices available.')
    }

    // Speak the text
    window.speechSynthesis.speak(utterance)
    // utterance.onend = () => {
    //   recordAudio()
    // }
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