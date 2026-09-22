export type WordPair = {
  id: string;
  /** The secret word shown to civilians */
  word: string;
  /** The category shown to the imposter as their only clue */
  category: string;
  /** Kept optional for older cached/generated word lists. */
  hint?: string;
};

/** Bump this when the curated fallback or remote filtering changes. */
export const WORDS_VERSION = 5;

export const WORD_PAIRS: WordPair[] = [
  { id: "beach", word: "Beach", hint: "Island", category: "Places" },
  { id: "coffee", word: "Coffee", hint: "Tea", category: "Drinks" },
  { id: "dog", word: "Dog", hint: "Cat", category: "Animals" },
  { id: "pizza", word: "Pizza", hint: "Burger", category: "Food" },
  { id: "airplane", word: "Airplane", hint: "Helicopter", category: "Transport" },
  { id: "guitar", word: "Guitar", hint: "Drums", category: "Music" },
  { id: "hospital", word: "Hospital", hint: "Fire station", category: "Places" },
  { id: "football", word: "Football", hint: "Cricket", category: "Sports" },
  { id: "rain", word: "Rain", hint: "Fog", category: "Weather" },
  { id: "book", word: "Book", hint: "Magazine", category: "Objects" },
  { id: "cinema", word: "Cinema", hint: "Concert", category: "Places" },
  { id: "tiger", word: "Tiger", hint: "Leopard", category: "Animals" },
  { id: "mountain", word: "Mountain", hint: "Volcano", category: "Nature" },
  { id: "teacher", word: "Teacher", hint: "Coach", category: "Jobs" },
  { id: "wedding", word: "Wedding", hint: "Graduation", category: "Events" },
  { id: "phone", word: "Phone", hint: "Laptop", category: "Objects" },
  { id: "swimming", word: "Swimming", hint: "Rowing", category: "Sports" },
  { id: "chocolate", word: "Chocolate", hint: "Candy", category: "Food" },
  { id: "doctor", word: "Doctor", hint: "Dentist", category: "Jobs" },
  { id: "moon", word: "Moon", hint: "Mars", category: "Space" },
  { id: "bus", word: "Bus", hint: "Taxi", category: "Transport" },
  { id: "icecream", word: "Ice Cream", hint: "Cake", category: "Food" },
  { id: "elephant", word: "Elephant", hint: "Whale", category: "Animals" },
  { id: "library", word: "Library", hint: "Museum", category: "Places" },
  { id: "chef", word: "Chef", hint: "Baker", category: "Jobs" },
  { id: "birthday", word: "Birthday", hint: "Anniversary", category: "Events" },
  { id: "snow", word: "Snow", hint: "Hail", category: "Weather" },
  { id: "camera", word: "Camera", hint: "Binoculars", category: "Objects" },
  { id: "tennis", word: "Tennis", hint: "Badminton", category: "Sports" },
  { id: "sunset", word: "Sunset", hint: "Aurora", category: "Nature" },
  { id: "train", word: "Train", hint: "Ferry", category: "Transport" },
  { id: "piano", word: "Piano", hint: "Violin", category: "Music" },
];
