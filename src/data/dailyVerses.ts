export interface DailyVerse {
  reference: string;
  text: string;
  encouragement: string;
}

/** KJV (public domain) verses about staying in the Word, rotated one per day on the Today page. */
export const DAILY_VERSES: DailyVerse[] = [
  {
    reference: "Psalm 119:11",
    text: "Thy word have I hid in mine heart, that I might not sin against thee.",
    encouragement: "Every verse you hide in your heart today is one you can draw on tomorrow.",
  },
  {
    reference: "Joshua 1:8",
    text: "This book of the law shall not depart out of thy mouth; but thou shalt meditate therein day and night, that thou mayest observe to do according to all that is written therein: for then thou shalt make thy way prosperous, and then thou shalt have good success.",
    encouragement: "Day and night starts with a few minutes today.",
  },
  {
    reference: "Psalm 1:2",
    text: "But his delight is in the law of the LORD; and in his law doth he meditate day and night.",
    encouragement: "Meditation grows from small, steady habits. Take a moment with the Word today.",
  },
  {
    reference: "Psalm 119:105",
    text: "Thy word is a lamp unto my feet, and a light unto my path.",
    encouragement: "A lamp lights the next step. Let today's review light yours.",
  },
  {
    reference: "Matthew 4:4",
    text: "But he answered and said, It is written, Man shall not live by bread alone, but by every word that proceedeth out of the mouth of God.",
    encouragement: "You eat every day. Feed on the Word every day too.",
  },
  {
    reference: "Colossians 3:16",
    text: "Let the word of Christ dwell in you richly in all wisdom; teaching and admonishing one another in psalms and hymns and spiritual songs, singing with grace in your hearts to the Lord.",
    encouragement: "The Word dwells richly where it is welcomed daily.",
  },
  {
    reference: "Isaiah 40:8",
    text: "The grass withereth, the flower fadeth: but the word of our God shall stand for ever.",
    encouragement: "Time spent in the Word is never wasted. It lasts forever.",
  },
  {
    reference: "Lamentations 3:22-23",
    text: "It is of the LORD'S mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.",
    encouragement: "His mercies are new every morning, and so is today's chance to meet Him in the Word.",
  },
  {
    reference: "Psalm 119:97",
    text: "O how love I thy law! it is my meditation all the day.",
    encouragement: "Carry a verse with you today and return to it throughout the day.",
  },
  {
    reference: "James 1:22",
    text: "But be ye doers of the word, and not hearers only, deceiving your own selves.",
    encouragement: "Knowing the Word by heart helps you live it out when it counts.",
  },
];

/** Picks the same verse for the whole calendar day, moving to the next one at midnight. */
export function verseForDate(date: Date = new Date()): DailyVerse {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (24 * 60 * 60 * 1000),
  );
  return DAILY_VERSES[dayNumber % DAILY_VERSES.length];
}
