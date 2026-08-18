// Curated Spanish/English vocabulary by subject, organized by level tier.
// Each entry: { es: "<spanish>", en: "<english>" }
//
// Progression: within a tier, words are split into "lessons" of LESSON_SIZE.
// Lesson 1 = first chunk, Lesson 2 = next chunk, etc. — so each lesson a
// learner advances to introduces brand-new words and phrases.

const LESSON_SIZE = 5;
// How many lessons each tier offers in the app. The first lessons use the
// curated words below; any beyond that are generated on demand by the AI
// (lib/llm.js), so the course keeps going and "covers the language."
const TOTAL_LESSONS_PER_TIER = 20;

const SUBJECTS = {
  numbers: {
    label: "Numbers",
    beginner: [
      { es: "uno", en: "one" },
      { es: "dos", en: "two" },
      { es: "tres", en: "three" },
      { es: "cuatro", en: "four" },
      { es: "cinco", en: "five" },
      { es: "seis", en: "six" },
      { es: "siete", en: "seven" },
      { es: "ocho", en: "eight" },
      { es: "nueve", en: "nine" },
      { es: "diez", en: "ten" },
    ],
    intermediate: [
      { es: "once", en: "eleven" },
      { es: "doce", en: "twelve" },
      { es: "quince", en: "fifteen" },
      { es: "veinte", en: "twenty" },
      { es: "treinta", en: "thirty" },
      { es: "cuarenta", en: "forty" },
      { es: "cincuenta", en: "fifty" },
      { es: "cien", en: "one hundred" },
      { es: "mil", en: "one thousand" },
    ],
    advanced: [
      { es: "primero", en: "first" },
      { es: "segundo", en: "second" },
      { es: "tercero", en: "third" },
      { es: "la mitad", en: "the half" },
      { es: "el doble", en: "the double" },
      { es: "¿cuántos hay?", en: "how many are there?" },
    ],
  },

  colors: {
    label: "Colors",
    beginner: [
      { es: "rojo", en: "red" },
      { es: "azul", en: "blue" },
      { es: "verde", en: "green" },
      { es: "amarillo", en: "yellow" },
      { es: "negro", en: "black" },
      { es: "blanco", en: "white" },
      { es: "rosa", en: "pink" },
      { es: "naranja", en: "orange" },
    ],
    intermediate: [
      { es: "morado", en: "purple" },
      { es: "gris", en: "gray" },
      { es: "café", en: "brown" },
      { es: "dorado", en: "golden" },
      { es: "plateado", en: "silver" },
      { es: "claro", en: "light" },
      { es: "oscuro", en: "dark" },
    ],
    advanced: [
      { es: "el color favorito", en: "the favorite color" },
      { es: "¿de qué color es?", en: "what color is it?" },
      { es: "brillante", en: "bright" },
      { es: "un tono suave", en: "a soft shade" },
    ],
  },

  greetings: {
    label: "Greetings & Conversation",
    beginner: [
      { es: "hola", en: "hello" },
      { es: "buenos días", en: "good morning" },
      { es: "buenas tardes", en: "good afternoon" },
      { es: "buenas noches", en: "good night" },
      { es: "¿cómo estás?", en: "how are you?" },
      { es: "muy bien", en: "very well" },
      { es: "gracias", en: "thank you" },
      { es: "por favor", en: "please" },
      { es: "de nada", en: "you're welcome" },
      { es: "adiós", en: "goodbye" },
    ],
    intermediate: [
      { es: "mucho gusto", en: "nice to meet you" },
      { es: "¿cómo te llamas?", en: "what is your name?" },
      { es: "me llamo...", en: "my name is..." },
      { es: "¿de dónde eres?", en: "where are you from?" },
      { es: "soy de...", en: "I am from..." },
      { es: "hasta luego", en: "see you later" },
      { es: "con permiso", en: "excuse me" },
      { es: "lo siento", en: "I'm sorry" },
    ],
    advanced: [
      { es: "¿qué has hecho hoy?", en: "what have you done today?" },
      { es: "encantado de conocerte", en: "delighted to meet you" },
      { es: "¿me puedes ayudar?", en: "can you help me?" },
      { es: "claro que sí", en: "of course" },
      { es: "¿qué me recomiendas?", en: "what do you recommend?" },
    ],
  },

  vacation: {
    label: "Vacation & Travel",
    beginner: [
      { es: "la playa", en: "the beach" },
      { es: "el hotel", en: "the hotel" },
      { es: "el avión", en: "the airplane" },
      { es: "la maleta", en: "the suitcase" },
      { es: "el pasaporte", en: "the passport" },
      { es: "el sol", en: "the sun" },
      { es: "el mar", en: "the sea" },
      { es: "el mapa", en: "the map" },
    ],
    intermediate: [
      { es: "¿dónde está el baño?", en: "where is the bathroom?" },
      { es: "la habitación", en: "the room" },
      { es: "el boleto", en: "the ticket" },
      { es: "la estación", en: "the station" },
      { es: "quiero reservar", en: "I want to book" },
      { es: "¿cuánto cuesta?", en: "how much is it?" },
    ],
    advanced: [
      { es: "he perdido mi vuelo", en: "I have missed my flight" },
      { es: "¿me recomienda un lugar?", en: "do you recommend a place?" },
      { es: "el equipaje de mano", en: "the carry-on luggage" },
      { es: "un viaje inolvidable", en: "an unforgettable trip" },
    ],
  },

  cooking: {
    label: "Cooking & Kitchen",
    beginner: [
      { es: "el agua", en: "the water" },
      { es: "el pan", en: "the bread" },
      { es: "la leche", en: "the milk" },
      { es: "el huevo", en: "the egg" },
      { es: "el arroz", en: "the rice" },
      { es: "la sal", en: "the salt" },
      { es: "el pollo", en: "the chicken" },
      { es: "la fruta", en: "the fruit" },
    ],
    intermediate: [
      { es: "cortar", en: "to cut" },
      { es: "hervir", en: "to boil" },
      { es: "freír", en: "to fry" },
      { es: "la sartén", en: "the frying pan" },
      { es: "una cucharada", en: "a spoonful" },
      { es: "está delicioso", en: "it is delicious" },
    ],
    advanced: [
      { es: "a fuego lento", en: "on low heat" },
      { es: "mezclar los ingredientes", en: "mix the ingredients" },
      { es: "¿cuál es la receta?", en: "what is the recipe?" },
      { es: "déjalo reposar", en: "let it rest" },
    ],
  },

  family: {
    label: "Family",
    beginner: [
      { es: "la madre", en: "the mother" },
      { es: "el padre", en: "the father" },
      { es: "el hermano", en: "the brother" },
      { es: "la hermana", en: "the sister" },
      { es: "el hijo", en: "the son" },
      { es: "la hija", en: "the daughter" },
      { es: "el abuelo", en: "the grandfather" },
      { es: "la abuela", en: "the grandmother" },
    ],
    intermediate: [
      { es: "los primos", en: "the cousins" },
      { es: "los tíos", en: "the aunts and uncles" },
      { es: "el esposo", en: "the husband" },
      { es: "la esposa", en: "the wife" },
      { es: "el bebé", en: "the baby" },
      { es: "toda la familia", en: "the whole family" },
    ],
    advanced: [
      { es: "nos reunimos los domingos", en: "we gather on Sundays" },
      { es: "se parece a su madre", en: "she looks like her mother" },
      { es: "una familia unida", en: "a close-knit family" },
    ],
  },

  days: {
    label: "Days & Time",
    beginner: [
      { es: "lunes", en: "Monday" },
      { es: "martes", en: "Tuesday" },
      { es: "miércoles", en: "Wednesday" },
      { es: "jueves", en: "Thursday" },
      { es: "viernes", en: "Friday" },
      { es: "sábado", en: "Saturday" },
      { es: "domingo", en: "Sunday" },
      { es: "hoy", en: "today" },
    ],
    intermediate: [
      { es: "mañana", en: "tomorrow" },
      { es: "ayer", en: "yesterday" },
      { es: "la semana", en: "the week" },
      { es: "el mes", en: "the month" },
      { es: "¿qué hora es?", en: "what time is it?" },
      { es: "es temprano", en: "it is early" },
    ],
    advanced: [
      { es: "la semana que viene", en: "next week" },
      { es: "a mediados de mes", en: "in the middle of the month" },
      { es: "todos los días", en: "every day" },
    ],
  },

  food: {
    label: "Food & Restaurant",
    beginner: [
      { es: "la manzana", en: "the apple" },
      { es: "el plátano", en: "the banana" },
      { es: "la carne", en: "the meat" },
      { es: "el pescado", en: "the fish" },
      { es: "el queso", en: "the cheese" },
      { es: "la sopa", en: "the soup" },
      { es: "la ensalada", en: "the salad" },
      { es: "el café", en: "the coffee" },
    ],
    intermediate: [
      { es: "el desayuno", en: "the breakfast" },
      { es: "el almuerzo", en: "the lunch" },
      { es: "la cena", en: "the dinner" },
      { es: "la cuenta, por favor", en: "the check, please" },
      { es: "el menú", en: "the menu" },
      { es: "tengo hambre", en: "I am hungry" },
    ],
    advanced: [
      { es: "quisiera ordenar", en: "I would like to order" },
      { es: "para llevar", en: "to go / takeout" },
      { es: "¿qué lleva este plato?", en: "what's in this dish?" },
      { es: "soy alérgico a...", en: "I am allergic to..." },
    ],
  },

  animals: {
    label: "Animals",
    beginner: [
      { es: "el perro", en: "the dog" },
      { es: "el gato", en: "the cat" },
      { es: "el pájaro", en: "the bird" },
      { es: "el pez", en: "the fish" },
      { es: "el caballo", en: "the horse" },
      { es: "la vaca", en: "the cow" },
      { es: "el conejo", en: "the rabbit" },
      { es: "el ratón", en: "the mouse" },
    ],
    intermediate: [
      { es: "el león", en: "the lion" },
      { es: "el elefante", en: "the elephant" },
      { es: "el oso", en: "the bear" },
      { es: "el mono", en: "the monkey" },
      { es: "la serpiente", en: "the snake" },
      { es: "la tortuga", en: "the turtle" },
    ],
    advanced: [
      { es: "el animal salvaje", en: "the wild animal" },
      { es: "la mascota", en: "the pet" },
      { es: "está en peligro", en: "it is endangered" },
    ],
  },

  body: {
    label: "Body & Health",
    beginner: [
      { es: "la cabeza", en: "the head" },
      { es: "la mano", en: "the hand" },
      { es: "el pie", en: "the foot" },
      { es: "el ojo", en: "the eye" },
      { es: "la boca", en: "the mouth" },
      { es: "la nariz", en: "the nose" },
      { es: "el brazo", en: "the arm" },
      { es: "la pierna", en: "the leg" },
    ],
    intermediate: [
      { es: "me duele la cabeza", en: "my head hurts" },
      { es: "estoy enfermo", en: "I am sick" },
      { es: "el médico", en: "the doctor" },
      { es: "la medicina", en: "the medicine" },
      { es: "necesito descansar", en: "I need to rest" },
    ],
    advanced: [
      { es: "tengo fiebre", en: "I have a fever" },
      { es: "me siento mejor", en: "I feel better" },
      { es: "una cita médica", en: "a doctor's appointment" },
    ],
  },

  clothing: {
    label: "Clothing",
    beginner: [
      { es: "la camisa", en: "the shirt" },
      { es: "los pantalones", en: "the pants" },
      { es: "los zapatos", en: "the shoes" },
      { es: "el vestido", en: "the dress" },
      { es: "el sombrero", en: "the hat" },
      { es: "la chaqueta", en: "the jacket" },
      { es: "los calcetines", en: "the socks" },
      { es: "la falda", en: "the skirt" },
    ],
    intermediate: [
      { es: "me queda bien", en: "it fits me well" },
      { es: "¿qué talla usas?", en: "what size do you wear?" },
      { es: "el probador", en: "the fitting room" },
      { es: "está de moda", en: "it is in style" },
    ],
    advanced: [
      { es: "me lo quiero probar", en: "I want to try it on" },
      { es: "es demasiado caro", en: "it is too expensive" },
    ],
  },

  weather: {
    label: "Weather",
    beginner: [
      { es: "hace sol", en: "it is sunny" },
      { es: "hace calor", en: "it is hot" },
      { es: "hace frío", en: "it is cold" },
      { es: "llueve", en: "it is raining" },
      { es: "nieva", en: "it is snowing" },
      { es: "hace viento", en: "it is windy" },
      { es: "está nublado", en: "it is cloudy" },
    ],
    intermediate: [
      { es: "la primavera", en: "the spring" },
      { es: "el verano", en: "the summer" },
      { es: "el otoño", en: "the autumn" },
      { es: "el invierno", en: "the winter" },
      { es: "la tormenta", en: "the storm" },
    ],
    advanced: [
      { es: "¿qué tiempo hace?", en: "what's the weather like?" },
      { es: "el pronóstico del tiempo", en: "the weather forecast" },
    ],
  },

  feelings: {
    label: "Feelings",
    beginner: [
      { es: "feliz", en: "happy" },
      { es: "triste", en: "sad" },
      { es: "cansado", en: "tired" },
      { es: "enojado", en: "angry" },
      { es: "contento", en: "content / glad" },
      { es: "asustado", en: "scared" },
      { es: "aburrido", en: "bored" },
      { es: "emocionado", en: "excited" },
    ],
    intermediate: [
      { es: "estoy nervioso", en: "I am nervous" },
      { es: "estoy orgulloso", en: "I am proud" },
      { es: "tengo miedo", en: "I am afraid" },
      { es: "me siento bien", en: "I feel good" },
    ],
    advanced: [
      { es: "estoy de buen humor", en: "I am in a good mood" },
      { es: "me da igual", en: "I don't mind / whatever" },
    ],
  },

  home: {
    label: "House & Home",
    beginner: [
      { es: "la casa", en: "the house" },
      { es: "la puerta", en: "the door" },
      { es: "la ventana", en: "the window" },
      { es: "la mesa", en: "the table" },
      { es: "la silla", en: "the chair" },
      { es: "la cama", en: "the bed" },
      { es: "la cocina", en: "the kitchen" },
      { es: "el baño", en: "the bathroom" },
    ],
    intermediate: [
      { es: "la sala", en: "the living room" },
      { es: "el dormitorio", en: "the bedroom" },
      { es: "el jardín", en: "the garden" },
      { es: "las llaves", en: "the keys" },
      { es: "la luz", en: "the light" },
    ],
    advanced: [
      { es: "limpiar la casa", en: "to clean the house" },
      { es: "está en el segundo piso", en: "it's on the second floor" },
    ],
  },

  directions: {
    label: "Getting Around",
    beginner: [
      { es: "izquierda", en: "left" },
      { es: "derecha", en: "right" },
      { es: "recto", en: "straight" },
      { es: "aquí", en: "here" },
      { es: "allí", en: "there" },
      { es: "cerca", en: "near" },
      { es: "lejos", en: "far" },
      { es: "la calle", en: "the street" },
    ],
    intermediate: [
      { es: "¿dónde está...?", en: "where is...?" },
      { es: "gira a la derecha", en: "turn right" },
      { es: "sigue recto", en: "go straight" },
      { es: "el semáforo", en: "the traffic light" },
      { es: "la esquina", en: "the corner" },
    ],
    advanced: [
      { es: "¿cómo llego a...?", en: "how do I get to...?" },
      { es: "está a dos cuadras", en: "it's two blocks away" },
    ],
  },

  shopping: {
    label: "Shopping & Money",
    beginner: [
      { es: "la tienda", en: "the store" },
      { es: "el dinero", en: "the money" },
      { es: "comprar", en: "to buy" },
      { es: "vender", en: "to sell" },
      { es: "el precio", en: "the price" },
      { es: "barato", en: "cheap" },
      { es: "caro", en: "expensive" },
    ],
    intermediate: [
      { es: "¿cuánto cuesta?", en: "how much does it cost?" },
      { es: "¿aceptan tarjeta?", en: "do you take cards?" },
      { es: "en efectivo", en: "in cash" },
      { es: "está en oferta", en: "it's on sale" },
    ],
    advanced: [
      { es: "¿me da un descuento?", en: "can you give me a discount?" },
      { es: "quisiera devolver esto", en: "I would like to return this" },
    ],
  },

  verbs: {
    label: "Common Verbs",
    beginner: [
      { es: "ser", en: "to be" },
      { es: "tener", en: "to have" },
      { es: "ir", en: "to go" },
      { es: "comer", en: "to eat" },
      { es: "beber", en: "to drink" },
      { es: "hablar", en: "to speak" },
      { es: "ver", en: "to see" },
      { es: "hacer", en: "to do / make" },
    ],
    intermediate: [
      { es: "quiero", en: "I want" },
      { es: "puedo", en: "I can" },
      { es: "necesito", en: "I need" },
      { es: "voy a...", en: "I am going to..." },
      { es: "me gusta", en: "I like" },
    ],
    advanced: [
      { es: "he terminado", en: "I have finished" },
      { es: "estaba pensando", en: "I was thinking" },
      { es: "podría ayudarte", en: "I could help you" },
    ],
  },

  pronouns: {
    label: "Pronouns",
    beginner: [
      { es: "yo", en: "I" },
      { es: "tú", en: "you" },
      { es: "él", en: "he" },
      { es: "ella", en: "she" },
      { es: "nosotros", en: "we" },
      { es: "ellos", en: "they" },
      { es: "ellas", en: "they (feminine)" },
      { es: "usted", en: "you (formal)" },
    ],
    intermediate: [
      { es: "me", en: "me" },
      { es: "te", en: "you (object)" },
      { es: "le", en: "to him / her" },
      { es: "nos", en: "us" },
      { es: "mi", en: "my" },
      { es: "tu", en: "your" },
    ],
    advanced: [
      { es: "nuestro", en: "our" },
      { es: "suyo", en: "his / hers" },
      { es: "conmigo", en: "with me" },
      { es: "¿quién eres tú?", en: "who are you?" },
    ],
  },

  questions: {
    label: "Question Words",
    beginner: [
      { es: "qué", en: "what" },
      { es: "quién", en: "who" },
      { es: "dónde", en: "where" },
      { es: "cuándo", en: "when" },
      { es: "por qué", en: "why" },
      { es: "cómo", en: "how" },
      { es: "cuál", en: "which" },
      { es: "cuánto", en: "how much" },
    ],
    intermediate: [
      { es: "¿qué es esto?", en: "what is this?" },
      { es: "¿dónde está?", en: "where is it?" },
      { es: "¿quién es?", en: "who is it?" },
      { es: "¿cómo se dice?", en: "how do you say?" },
      { es: "¿por qué no?", en: "why not?" },
      { es: "¿cuánto es?", en: "how much is it?" },
    ],
    advanced: [
      { es: "¿qué quieres decir?", en: "what do you mean?" },
      { es: "¿a qué hora?", en: "at what time?" },
      { es: "¿de quién es?", en: "whose is it?" },
      { es: "¿cuánto tiempo?", en: "how long?" },
    ],
  },

  descriptions: {
    label: "Descriptions",
    beginner: [
      { es: "grande", en: "big" },
      { es: "pequeño", en: "small" },
      { es: "bueno", en: "good" },
      { es: "malo", en: "bad" },
      { es: "nuevo", en: "new" },
      { es: "viejo", en: "old" },
      { es: "alto", en: "tall" },
      { es: "bajo", en: "short" },
    ],
    intermediate: [
      { es: "bonito", en: "pretty" },
      { es: "feo", en: "ugly" },
      { es: "fácil", en: "easy" },
      { es: "difícil", en: "difficult" },
      { es: "rápido", en: "fast" },
      { es: "lento", en: "slow" },
    ],
    advanced: [
      { es: "limpio", en: "clean" },
      { es: "sucio", en: "dirty" },
      { es: "fuerte", en: "strong" },
      { es: "lleno", en: "full" },
    ],
  },

  jobs: {
    label: "Jobs & Work",
    beginner: [
      { es: "el trabajo", en: "the job" },
      { es: "el maestro", en: "the teacher" },
      { es: "el doctor", en: "the doctor" },
      { es: "el policía", en: "the police officer" },
      { es: "el cocinero", en: "the cook" },
      { es: "el chofer", en: "the driver" },
      { es: "el jefe", en: "the boss" },
      { es: "la oficina", en: "the office" },
    ],
    intermediate: [
      { es: "el ingeniero", en: "the engineer" },
      { es: "el enfermero", en: "the nurse" },
      { es: "el bombero", en: "the firefighter" },
      { es: "el abogado", en: "the lawyer" },
      { es: "la reunión", en: "the meeting" },
      { es: "el sueldo", en: "the salary" },
    ],
    advanced: [
      { es: "¿en qué trabajas?", en: "what do you do for work?" },
      { es: "tengo una entrevista", en: "I have an interview" },
      { es: "trabajo desde casa", en: "I work from home" },
      { es: "el horario", en: "the schedule" },
    ],
  },

  school: {
    label: "School",
    beginner: [
      { es: "la escuela", en: "the school" },
      { es: "el libro", en: "the book" },
      { es: "el lápiz", en: "the pencil" },
      { es: "el papel", en: "the paper" },
      { es: "el estudiante", en: "the student" },
      { es: "la clase", en: "the class" },
      { es: "la maestra", en: "the teacher (f)" },
      { es: "aprender", en: "to learn" },
    ],
    intermediate: [
      { es: "la tarea", en: "the homework" },
      { es: "el examen", en: "the exam" },
      { es: "la pregunta", en: "the question" },
      { es: "la respuesta", en: "the answer" },
      { es: "estudiar", en: "to study" },
      { es: "escribir", en: "to write" },
    ],
    advanced: [
      { es: "sacar buena nota", en: "to get a good grade" },
      { es: "prestar atención", en: "to pay attention" },
      { es: "la biblioteca", en: "the library" },
      { es: "el recreo", en: "the recess" },
    ],
  },

  technology: {
    label: "Technology",
    beginner: [
      { es: "el teléfono", en: "the phone" },
      { es: "la computadora", en: "the computer" },
      { es: "el internet", en: "the internet" },
      { es: "la pantalla", en: "the screen" },
      { es: "el correo", en: "the email" },
      { es: "la contraseña", en: "the password" },
      { es: "la cámara", en: "the camera" },
      { es: "la aplicación", en: "the app" },
    ],
    intermediate: [
      { es: "enviar un mensaje", en: "to send a message" },
      { es: "la llamada", en: "the call" },
      { es: "cargar el teléfono", en: "to charge the phone" },
      { es: "la señal", en: "the signal" },
      { es: "descargar", en: "to download" },
      { es: "en línea", en: "online" },
    ],
    advanced: [
      { es: "se acabó la batería", en: "the battery died" },
      { es: "no hay señal", en: "there's no signal" },
      { es: "una videollamada", en: "a video call" },
      { es: "la red social", en: "the social network" },
    ],
  },

  hobbies: {
    label: "Hobbies & Sports",
    beginner: [
      { es: "el fútbol", en: "soccer" },
      { es: "la música", en: "music" },
      { es: "bailar", en: "to dance" },
      { es: "cantar", en: "to sing" },
      { es: "leer", en: "to read" },
      { es: "correr", en: "to run" },
      { es: "nadar", en: "to swim" },
      { es: "jugar", en: "to play" },
    ],
    intermediate: [
      { es: "el equipo", en: "the team" },
      { es: "el partido", en: "the match" },
      { es: "ganar", en: "to win" },
      { es: "perder", en: "to lose" },
      { es: "la pelota", en: "the ball" },
      { es: "pintar", en: "to paint" },
    ],
    advanced: [
      { es: "¿qué te gusta hacer?", en: "what do you like to do?" },
      { es: "en mi tiempo libre", en: "in my free time" },
      { es: "hago ejercicio", en: "I exercise" },
      { es: "soy aficionado", en: "I'm a fan" },
    ],
  },

  transportation: {
    label: "Transportation",
    beginner: [
      { es: "el coche", en: "the car" },
      { es: "el autobús", en: "the bus" },
      { es: "el tren", en: "the train" },
      { es: "el avión", en: "the airplane" },
      { es: "la bicicleta", en: "the bicycle" },
      { es: "el taxi", en: "the taxi" },
      { es: "el barco", en: "the boat" },
      { es: "la moto", en: "the motorcycle" },
    ],
    intermediate: [
      { es: "el metro", en: "the subway" },
      { es: "la estación", en: "the station" },
      { es: "el boleto", en: "the ticket" },
      { es: "subir", en: "to get on" },
      { es: "bajar", en: "to get off" },
      { es: "la parada", en: "the stop" },
    ],
    advanced: [
      { es: "¿a qué hora sale?", en: "what time does it leave?" },
      { es: "perdí el autobús", en: "I missed the bus" },
      { es: "el próximo tren", en: "the next train" },
      { es: "¿cuánto tarda?", en: "how long does it take?" },
    ],
  },

  places: {
    label: "Places in Town",
    beginner: [
      { es: "el banco", en: "the bank" },
      { es: "el hospital", en: "the hospital" },
      { es: "el parque", en: "the park" },
      { es: "el mercado", en: "the market" },
      { es: "la iglesia", en: "the church" },
      { es: "el restaurante", en: "the restaurant" },
      { es: "la farmacia", en: "the pharmacy" },
      { es: "el centro", en: "downtown" },
    ],
    intermediate: [
      { es: "el supermercado", en: "the supermarket" },
      { es: "la biblioteca", en: "the library" },
      { es: "el museo", en: "the museum" },
      { es: "el cine", en: "the movie theater" },
      { es: "la plaza", en: "the square" },
      { es: "el correo", en: "the post office" },
    ],
    advanced: [
      { es: "¿hay un banco cerca?", en: "is there a bank nearby?" },
      { es: "está en el centro", en: "it's downtown" },
      { es: "¿dónde queda?", en: "where is it located?" },
      { es: "al lado de", en: "next to" },
    ],
  },

  time: {
    label: "Telling Time",
    beginner: [
      { es: "la hora", en: "the hour" },
      { es: "el minuto", en: "the minute" },
      { es: "¿qué hora es?", en: "what time is it?" },
      { es: "es la una", en: "it's one o'clock" },
      { es: "son las dos", en: "it's two o'clock" },
      { es: "la mañana", en: "the morning" },
      { es: "la tarde", en: "the afternoon" },
      { es: "la noche", en: "the night" },
    ],
    intermediate: [
      { es: "y media", en: "half past" },
      { es: "y cuarto", en: "quarter past" },
      { es: "el mediodía", en: "noon" },
      { es: "la medianoche", en: "midnight" },
      { es: "temprano", en: "early" },
      { es: "tarde", en: "late" },
    ],
    advanced: [
      { es: "en punto", en: "on the dot" },
      { es: "a las tres de la tarde", en: "at three p.m." },
      { es: "dentro de una hora", en: "in an hour" },
      { es: "faltan diez minutos", en: "ten minutes to go" },
    ],
  },

  nature: {
    label: "Nature & Outdoors",
    beginner: [
      { es: "el árbol", en: "the tree" },
      { es: "la flor", en: "the flower" },
      { es: "el río", en: "the river" },
      { es: "la montaña", en: "the mountain" },
      { es: "el cielo", en: "the sky" },
      { es: "la luna", en: "the moon" },
      { es: "la estrella", en: "the star" },
      { es: "el campo", en: "the countryside" },
    ],
    intermediate: [
      { es: "el bosque", en: "the forest" },
      { es: "el lago", en: "the lake" },
      { es: "la hoja", en: "the leaf" },
      { es: "la roca", en: "the rock" },
      { es: "la isla", en: "the island" },
      { es: "la tierra", en: "the earth" },
    ],
    advanced: [
      { es: "el amanecer", en: "the sunrise" },
      { es: "el atardecer", en: "the sunset" },
      { es: "la naturaleza", en: "nature" },
      { es: "al aire libre", en: "outdoors" },
    ],
  },

  emergencies: {
    label: "Emergencies",
    beginner: [
      { es: "¡ayuda!", en: "help!" },
      { es: "la policía", en: "the police" },
      { es: "el hospital", en: "the hospital" },
      { es: "el doctor", en: "the doctor" },
      { es: "el fuego", en: "the fire" },
      { es: "¡cuidado!", en: "careful!" },
      { es: "la ambulancia", en: "the ambulance" },
      { es: "llamar", en: "to call" },
    ],
    intermediate: [
      { es: "necesito ayuda", en: "I need help" },
      { es: "es una emergencia", en: "it's an emergency" },
      { es: "estoy perdido", en: "I am lost" },
      { es: "¿dónde está el hospital?", en: "where is the hospital?" },
      { es: "un accidente", en: "an accident" },
      { es: "rápido", en: "quick" },
    ],
    advanced: [
      { es: "llame a la policía", en: "call the police" },
      { es: "necesito un médico", en: "I need a doctor" },
      { es: "¿está usted bien?", en: "are you okay?" },
      { es: "mantenga la calma", en: "stay calm" },
    ],
  },
};

function tierArray(subjectKey, tier) {
  const s = SUBJECTS[subjectKey];
  if (!s) return [];
  return s[tier] || [];
}

// Number of lessons available in a subject's tier.
function lessonCount(subjectKey, tier) {
  return Math.max(1, Math.ceil(tierArray(subjectKey, tier).length / LESSON_SIZE));
}

// Word pairs for a specific lesson (1-based) within a subject + tier.
function getLessonVocab(subjectKey, tier, lesson) {
  const arr = tierArray(subjectKey, tier);
  const i = Math.max(0, (Number(lesson) || 1) - 1);
  const chunk = arr.slice(i * LESSON_SIZE, i * LESSON_SIZE + LESSON_SIZE);
  return chunk.length ? chunk : arr.slice(0, LESSON_SIZE);
}

// All curated words for a subject+tier (used to tell the AI what NOT to repeat).
function tierWords(subjectKey, tier) {
  return tierArray(subjectKey, tier).map((w) => w.es);
}

// Full curriculum map for the app. Every tier advertises TOTAL_LESSONS_PER_TIER
// lessons; the early ones are curated, the rest are AI-generated on demand.
function getCurriculum() {
  return Object.keys(SUBJECTS).map((key) => ({
    key,
    label: SUBJECTS[key].label,
    lessons: {
      starter: TOTAL_LESSONS_PER_TIER,
      beginner: TOTAL_LESSONS_PER_TIER,
      intermediate: TOTAL_LESSONS_PER_TIER,
      advanced: TOTAL_LESSONS_PER_TIER,
    },
  }));
}

function listSubjects() {
  return Object.keys(SUBJECTS).map((key) => ({ key, label: SUBJECTS[key].label }));
}

module.exports = {
  SUBJECTS,
  LESSON_SIZE,
  TOTAL_LESSONS_PER_TIER,
  getLessonVocab,
  lessonCount,
  tierWords,
  getCurriculum,
  listSubjects,
};
