export interface Script {
  id: string;
  title: string;
  text: string;
  category: 'HIGH_FLUENCY' | 'MEDIUM_FLUENCY' | 'LOW_FLUENCY' | 'CLEAR_PRONUNCIATION' | 'UNCLEAR_PRONUNCIATION' | 'FAST_TEMPO' | 'MEDIUM_TEMPO' | 'SLOW_TEMPO';
  order: number;
}

export const scripts: Script[] = [
  // High Fluency Scripts
  {
    id: 'hf-1',
    title: 'Technology Impact',
    text: "Artificial intelligence has revolutionized numerous industries in the past decade.",
    category: 'HIGH_FLUENCY',
    order: 1
  },
  {
    id: 'hf-2',
    title: 'Natural Process',
    text: "The water cycle is a continuous process that sustains life on Earth.",
    category: 'HIGH_FLUENCY',
    order: 2
  },
  {
    id: 'hf-3',
    title: 'Personal Experience',
    text: "I remember my first day of college clearly. I woke up early, feeling a mixture of excitement and nervousness.",
    category: 'HIGH_FLUENCY',
    order: 3
  },

  // Medium Fluency Scripts
  {
    id: 'mf-1',
    title: 'Environmental Topic',
    text: "Renewable energy sources have become increasingly important in our fight against climate change.",
    category: 'MEDIUM_FLUENCY',
    order: 1
  },
  {
    id: 'mf-2',
    title: 'Local Changes',
    text: "My neighborhood has changed quite a bit over the past few years.",
    category: 'MEDIUM_FLUENCY',
    order: 2
  },
  {
    id: 'mf-3',
    title: 'Social Impact',
    text: "I think social media has both positive and negative effects on society.",
    category: 'MEDIUM_FLUENCY',
    order: 3
  },

  // Low Fluency Scripts
  {
    id: 'lf-1',
    title: 'Technical Concept',
    text: "Quantum computing leverages the principles of quantum mechanics, particularly superposition and entanglement, to perform computations.",
    category: 'LOW_FLUENCY',
    order: 1
  },
  {
    id: 'lf-2',
    title: 'Scientific Paradox',
    text: "The Fermi Paradox addresses the contradiction between the high probability of extraterrestrial civilizations existing and the lack of contact or evidence for such civilizations.",
    category: 'LOW_FLUENCY',
    order: 2
  },
  {
    id: 'lf-3',
    title: 'Philosophy',
    text: "The philosophical concept of determinism suggests that all events, including human cognition and action, are ultimately determined by previously existing causes rather than free will.",
    category: 'LOW_FLUENCY',
    order: 3
  },

  // Clear Pronunciation Scripts
  {
    id: 'cp-1',
    title: 'Clear Articulation',
    text: "The specificity of the Pacific Ocean makes it particularly magnificent.",
    category: 'CLEAR_PRONUNCIATION',
    order: 1
  },
  {
    id: 'cp-2',
    title: 'Human Rights',
    text: "Article 1: All human beings are born free and equal in dignity and rights.",
    category: 'CLEAR_PRONUNCIATION',
    order: 2
  },
  {
    id: 'cp-3',
    title: 'Scientific Terms',
    text: "The biodiversity of tropical rainforests contributes significantly to pharmaceutical development.",
    category: 'CLEAR_PRONUNCIATION',
    order: 3
  },

  // Unclear Pronunciation Scripts
  {
    id: 'up-1',
    title: 'Classic Tongue Twister',
    text: "She sells seashells by the seashore. The shells she sells are surely seashells.",
    category: 'UNCLEAR_PRONUNCIATION',
    order: 1
  },
  {
    id: 'up-2',
    title: 'Complex Words',
    text: "Rural juror truly endured furious injuries during the plural burial of the neural courier.",
    category: 'UNCLEAR_PRONUNCIATION',
    order: 2
  },
  {
    id: 'up-3',
    title: 'Consonant Clusters',
    text: "Strengths wrongfully stretched through twelfths of lengthy string.",
    category: 'UNCLEAR_PRONUNCIATION',
    order: 3
  },

  // Fast Tempo Scripts
  {
    id: 'ft-1',
    title: 'Breaking News',
    text: "Breaking news just coming in—severe weather warnings have been issued for the following counties: Riverside, Orange, and San Bernardino.",
    category: 'FAST_TEMPO',
    order: 1
  },
  {
    id: 'ft-2',
    title: 'Auction',
    text: "Next item up for bid is lot number forty-five, a nineteenth-century silver tea service, starting at five hundred dollars, do I hear five hundred? Five hundred from the gentleman in front, do I hear six hundred?",
    category: 'FAST_TEMPO',
    order: 2
  },
  {
    id: 'ft-3',
    title: 'Sports Play',
    text: "Johnson takes the ball down the court, passes to Williams at the three-point line, Williams fakes, drives to the basket, kicks it out to Rodriguez, Rodriguez for three—it's good!",
    category: 'FAST_TEMPO',
    order: 3
  },

  // Medium Tempo Scripts
  {
    id: 'mt-1',
    title: 'Museum Tour',
    text: "As we continue our tour of the museum, we're now entering the Renaissance gallery.",
    category: 'MEDIUM_TEMPO',
    order: 1
  },
  {
    id: 'mt-2',
    title: 'Cooking Instructions',
    text: "To prepare this dish, start by heating two tablespoons of olive oil in a large skillet over medium heat.",
    category: 'MEDIUM_TEMPO',
    order: 2
  },
  {
    id: 'mt-3',
    title: 'Speaker Introduction',
    text: "Today's speaker joined our company in 2015 after completing her master's degree in environmental engineering.",
    category: 'MEDIUM_TEMPO',
    order: 3
  },

  // Slow Tempo Scripts
  {
    id: 'st-1',
    title: 'Meditation',
    text: "Find a comfortable position... and gently close your eyes... Allow your attention to rest on your breathing... Notice the sensation of the breath... as it enters your body...",
    category: 'SLOW_TEMPO',
    order: 1
  },
  {
    id: 'st-2',
    title: 'Safety Instructions',
    text: "In the event of an emergency... remain calm... and locate the nearest exit... which may be behind you...",
    category: 'SLOW_TEMPO',
    order: 2
  },
  {
    id: 'st-3',
    title: 'Science Process',
    text: "The process of photosynthesis... converts light energy... into chemical energy... Plants use chlorophyll... a green pigment found in chloroplasts...",
    category: 'SLOW_TEMPO',
    order: 3
  }
]; 