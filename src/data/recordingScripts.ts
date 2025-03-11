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
    title: 'Technology Description',
    text: "Artificial intelligence has revolutionized numerous industries in the past decade. From healthcare to transportation, AI algorithms now power critical systems that millions of people rely on daily. Machine learning, a subset of AI, uses neural networks to process vast amounts of data and identify patterns that humans might miss. As computing power increases and algorithms become more sophisticated, we can expect even more remarkable applications in the near future.",
    category: 'HIGH_FLUENCY',
    order: 1
  },
  {
    id: 'hf-2',
    title: 'Common Knowledge Explanation',
    text: "The water cycle is a continuous process that sustains life on Earth. It begins with evaporation, where water from oceans, lakes, and rivers turns into vapor due to solar energy. This vapor rises into the atmosphere and eventually condenses to form clouds. When the clouds become saturated, precipitation occurs as rain or snow, returning water to the Earth's surface. Some water flows into rivers and back to the oceans, while some seeps into the ground, completing the cycle.",
    category: 'HIGH_FLUENCY',
    order: 2
  },
  {
    id: 'hf-3',
    title: 'Familiar Narrative',
    text: "I remember my first day of college clearly. I woke up early, feeling a mixture of excitement and nervousness. The campus seemed enormous as I navigated between buildings, checking my schedule repeatedly to make sure I was heading to the right classroom. By lunchtime, I had already met several classmates who would eventually become close friends. Looking back, those initial anxieties quickly faded as I settled into campus life and embraced new opportunities.",
    category: 'HIGH_FLUENCY',
    order: 3
  },

  // Medium Fluency Scripts
  {
    id: 'mf-1',
    title: 'Moderate Complexity Topic',
    text: "Renewable energy sources have become increasingly important in our fight against climate change. Solar panels convert sunlight directly into electricity, while wind turbines harness the power of moving air. Hydroelectric dams generate power from flowing water, and geothermal systems tap into the Earth's natural heat. Each of these technologies has advantages and limitations, depending on geographic location and weather patterns.",
    category: 'MEDIUM_FLUENCY',
    order: 1
  },
  {
    id: 'mf-2',
    title: 'Everyday Description',
    text: "My neighborhood has changed quite a bit over the past few years. The old grocery store was replaced by a modern market with more organic options. Several new families have moved in, bringing children who now play in the previously quiet park. There's a coffee shop on the corner where people gather on weekend mornings. The community feels more vibrant now, though parking has become somewhat challenging during busy times.",
    category: 'MEDIUM_FLUENCY',
    order: 2
  },
  {
    id: 'mf-3',
    title: 'Opinion Piece',
    text: "I think social media has both positive and negative effects on society. On one hand, it connects people across great distances and provides platforms for important voices that might otherwise go unheard. On the other hand, it can contribute to anxiety, especially among younger users who may feel pressure to present perfect lives online. Finding a healthy balance is important, as is teaching digital literacy to new users.",
    category: 'MEDIUM_FLUENCY',
    order: 3
  },

  // Low Fluency Scripts
  {
    id: 'lf-1',
    title: 'Technical Jargon',
    text: "Quantum computing leverages the principles of quantum mechanics, particularly superposition and entanglement, to perform computations. Unlike classical bits that exist as either 0 or 1, quantum bits or qubits can exist in multiple states simultaneously. This property potentially allows quantum computers to solve certain complex problems exponentially faster than traditional computers. However, maintaining quantum coherence remains a significant technical challenge due to environmental interference.",
    category: 'LOW_FLUENCY',
    order: 1
  },
  {
    id: 'lf-2',
    title: 'Unfamiliar Concept',
    text: "The Fermi Paradox addresses the contradiction between the high probability of extraterrestrial civilizations existing and the lack of contact or evidence for such civilizations. Given the billions of stars in our galaxy alone, many with planets that could potentially support life, it seems statistically unlikely that Earth is the only planet where intelligent life evolved. Various hypotheses attempt to resolve this paradox, including the possibility that advanced civilizations inevitably destroy themselves or that interstellar travel is simply too difficult.",
    category: 'LOW_FLUENCY',
    order: 2
  },
  {
    id: 'lf-3',
    title: 'Abstract Reasoning',
    text: "The philosophical concept of determinism suggests that all events, including human cognition and action, are ultimately determined by previously existing causes rather than free will. This raises questions about moral responsibility and the nature of choice. If our decisions are merely the inevitable outcome of prior causes—genetics, upbringing, environmental factors—then can we truly be held accountable for our actions? Various philosophical traditions have grappled with this tension between determinism and free will.",
    category: 'LOW_FLUENCY',
    order: 3
  },

  // Clear Pronunciation Scripts
  {
    id: 'cp-1',
    title: 'Articulation Challenge',
    text: "The specificity of the Pacific Ocean makes it particularly magnificent. Six tourists enthusiastically watched the pharmaceutical researcher demonstrate revolutionary statistical analysis methods. The necessarily sophisticated equipment thoroughly measured the chrysanthemum's biochemistry. Approximately fifteen photographers simultaneously captured the extraordinary phenomenon.",
    category: 'CLEAR_PRONUNCIATION',
    order: 1
  },
  {
    id: 'cp-2',
    title: 'Precision Reading',
    text: "Please read the following text carefully, articulating each word precisely: Article 1: All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood. Article 2: Everyone is entitled to all the rights and freedoms set forth in this Declaration, without distinction of any kind, such as race, color, sex, language, religion, political or other opinion, national or social origin, property, birth or other status.",
    category: 'CLEAR_PRONUNCIATION',
    order: 2
  },
  {
    id: 'cp-3',
    title: 'Technical Terms',
    text: "The biodiversity of tropical rainforests contributes significantly to pharmaceutical development. Indigenous vegetation often contains unique chemical compounds with therapeutic properties. Anthropogenic activities have unfortunately accelerated deforestation, jeopardizing undiscovered medicinal resources. Conservation efforts necessitate international cooperation to establish sustainable environmental policies.",
    category: 'CLEAR_PRONUNCIATION',
    order: 3
  },

  // Unclear Pronunciation Scripts
  {
    id: 'up-1',
    title: 'Tongue Twisters',
    text: "She sells seashells by the seashore. The shells she sells are surely seashells. If she sells shells on the seashore, I'm sure she sells seashore shells. Peter Piper picked a peck of pickled peppers. How many pickled peppers did Peter Piper pick? How can a clam cram in a clean cream can?",
    category: 'UNCLEAR_PRONUNCIATION',
    order: 1
  },
  {
    id: 'up-2',
    title: 'Difficult Word Combinations',
    text: "Rural juror truly endured furious injuries during the plural burial of the neural courier. The auxiliary brewery's peculiar failure required premature restructuring through judicial regulatory measures. Entrepreneurial mirror manufacturers rarely clarify warranty particulars regarding moisture-related deterioration.",
    category: 'UNCLEAR_PRONUNCIATION',
    order: 2
  },
  {
    id: 'up-3',
    title: 'Consonant Clusters',
    text: "Strengths wrongfully stretched through twelfths of lengthy string. The sprightly sphinx mixed twelve batches with fresh crimps. Scripts drifted across desks prompting glimpses of complex texts structured with intricate contexts. Glimpsed through twisted vines, three thrones stood amongst shrubs.",
    category: 'UNCLEAR_PRONUNCIATION',
    order: 3
  },

  // Fast Tempo Scripts
  {
    id: 'ft-1',
    title: 'News Flash',
    text: "Breaking news just coming in—severe weather warnings have been issued for the following counties: Riverside, Orange, and San Bernardino. Residents should prepare for heavy rainfall and potential flooding in low-lying areas. Emergency services are on high alert and evacuation centers are being established at local schools and community centers. Stay tuned for more updates as this situation develops.",
    category: 'FAST_TEMPO',
    order: 1
  },
  {
    id: 'ft-2',
    title: 'Auction Scenario',
    text: "Next item up for bid is lot number forty-five, a nineteenth-century silver tea service, starting at five hundred dollars, do I hear five hundred? Five hundred from the gentleman in front, do I hear six hundred? Six hundred from the phone bidder, now seven hundred? Seven hundred from the lady in blue, eight hundred? Eight hundred from our online bidder, looking for nine hundred, nine hundred anywhere? Going once, going twice, sold to the online bidder for eight hundred dollars!",
    category: 'FAST_TEMPO',
    order: 2
  },
  {
    id: 'ft-3',
    title: 'Sports Commentary',
    text: "Johnson takes the ball down the court, passes to Williams at the three-point line, Williams fakes, drives to the basket, kicks it out to Rodriguez, Rodriguez for three—it's good! Twenty seconds remaining on the clock, team down by two points, Thompson brings it up, looking for an opening, passes to Jackson, back to Thompson, Thompson shoots from downtown—scores! What an incredible finish to this championship game!",
    category: 'FAST_TEMPO',
    order: 3
  },

  // Medium Tempo Scripts
  {
    id: 'mt-1',
    title: 'Informational Tour Guide',
    text: "As we continue our tour of the museum, we're now entering the Renaissance gallery. Notice the dramatic shift in painting techniques from the Medieval period we just saw. Artists during this time began using perspective to create depth, and their subjects became more realistic and humanistic. Take a moment to observe the famous portrait on the far wall, which demonstrates the era's focus on individual expression and accurate anatomical representation.",
    category: 'MEDIUM_TEMPO',
    order: 1
  },
  {
    id: 'mt-2',
    title: 'Recipe Instructions',
    text: "To prepare this dish, start by heating two tablespoons of olive oil in a large skillet over medium heat. When the oil is hot, add the diced onions and sauté until translucent, about four minutes. Add the minced garlic and cook for another thirty seconds, being careful not to burn it. Now incorporate the sliced mushrooms and cook until they release their moisture and begin to brown. Season with salt, pepper, and your favorite herbs.",
    category: 'MEDIUM_TEMPO',
    order: 2
  },
  {
    id: 'mt-3',
    title: 'Biographical Introduction',
    text: "Today's speaker joined our company in 2015 after completing her master's degree in environmental engineering. During her time with us, she has led several major sustainability initiatives, including our transition to renewable energy sources at three manufacturing facilities. Her team's innovative waste reduction program saved the company over $2 million last year while significantly decreasing our carbon footprint. Please join me in welcoming our Director of Sustainability.",
    category: 'MEDIUM_TEMPO',
    order: 3
  },

  // Slow Tempo Scripts
  {
    id: 'st-1',
    title: 'Meditation Guidance',
    text: "Find a comfortable position... and gently close your eyes... Allow your attention to rest on your breathing... Notice the sensation of the breath... as it enters your body... and as it leaves... There is no need to control the breath... simply observe its natural rhythm... With each exhalation... feel yourself releasing tension... becoming more relaxed... more at ease...",
    category: 'SLOW_TEMPO',
    order: 1
  },
  {
    id: 'st-2',
    title: 'Safety Instructions',
    text: "In the event of an emergency... remain calm... and locate the nearest exit... which may be behind you... If oxygen is needed... masks will drop from above your seat... Place the mask over your nose and mouth... and secure it with the elastic band... Be sure to adjust your own mask... before assisting others... If we need to evacuate... leave all belongings behind... and follow the illuminated path... to the nearest exit...",
    category: 'SLOW_TEMPO',
    order: 2
  },
  {
    id: 'st-3',
    title: 'Technical Explanation',
    text: "The process of photosynthesis... converts light energy... into chemical energy... Plants use chlorophyll... a green pigment found in chloroplasts... to capture sunlight... Water is absorbed through the roots... and carbon dioxide enters through tiny pores... called stomata... Through a series of chemical reactions... the plant produces glucose... and releases oxygen... This process... is essential for life on Earth...",
    category: 'SLOW_TEMPO',
    order: 3
  }
]; 