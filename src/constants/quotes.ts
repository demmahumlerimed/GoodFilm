export type MovieQuote = {
  quote: string;
  show: string;
  character: string;
};

export const MOVIE_QUOTES: MovieQuote[] = [
  { quote: "Here's looking at you, kid.", show: "Casablanca", character: "Rick Blaine" },
  { quote: "May the Force be with you.", show: "Star Wars", character: "Han Solo" },
  { quote: "I'm gonna make him an offer he can't refuse.", show: "The Godfather", character: "Don Corleone" },
  { quote: "After all, tomorrow is another day!", show: "Gone with the Wind", character: "Scarlett O'Hara" },
  { quote: "Houston, we have a problem.", show: "Apollo 13", character: "Jim Lovell" },
  { quote: "To infinity and beyond!", show: "Toy Story", character: "Buzz Lightyear" },
  { quote: "You can't handle the truth!", show: "A Few Good Men", character: "Col. Jessup" },
  { quote: "Life is like a box of chocolates.", show: "Forrest Gump", character: "Forrest Gump" },
  { quote: "I'll be back.", show: "The Terminator", character: "The Terminator" },
  { quote: "Why so serious?", show: "The Dark Knight", character: "The Joker" },
  { quote: "My precious.", show: "The Lord of the Rings", character: "Gollum" },
  { quote: "I see dead people.", show: "The Sixth Sense", character: "Cole Sear" },
  { quote: "Just keep swimming.", show: "Finding Nemo", character: "Dory" },
  { quote: "You talking to me?", show: "Taxi Driver", character: "Travis Bickle" },
  { quote: "E.T. phone home.", show: "E.T. the Extra-Terrestrial", character: "E.T." },
  { quote: "I am Groot.", show: "Guardians of the Galaxy", character: "Groot" },
  { quote: "Say hello to my little friend!", show: "Scarface", character: "Tony Montana" },
  { quote: "There's no place like home.", show: "The Wizard of Oz", character: "Dorothy" },
  { quote: "You shall not pass!", show: "The Lord of the Rings", character: "Gandalf" },
  { quote: "Elementary, my dear Watson.", show: "Sherlock Holmes", character: "Sherlock Holmes" },
];

export function getRandomMovieQuote(): MovieQuote {
  return MOVIE_QUOTES[Math.floor(Math.random() * MOVIE_QUOTES.length)];
}
