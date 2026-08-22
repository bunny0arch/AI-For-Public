export type CommunityPathway = {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  scope: string;
  summary: string;
  detail: string;
  starterPrompts: string[];
  greeting: string;
  image?: string;
  size: "wide" | "tall" | "standard" | "feature";
};

export const communityPathways: CommunityPathway[] = [
  {
    id: "farmers",
    number: "01",
    eyebrow: "Land & livelihood",
    title: "AI for Farmers",
    scope: "crop advisory, farming practices, crop symptoms and disease observations, weather-aware farm decisions, agri-market context, and farmer-relevant schemes or documentation",
    summary: "Crop decisions, disease signals and market context—made practical.",
    detail: "Bring a crop question, a photo observation, or a local price concern. Start with the decision in front of you.",
    starterPrompts: [
      "My chilli leaves are curling. What should I check first?",
      "What details should I compare before choosing a crop this season?",
      "Help me list the documents needed for farm support in my state.",
    ],
    greeting: "I’m here to help you work through the next farm decision. Tell me your crop, district, and what you are seeing—or ask in the language you use every day.",
    image: "/manus-storage/field-reference_86704408.jpg",
    size: "wide",
  },
  {
    id: "fishermen",
    number: "02",
    eyebrow: "Coast & safety",
    title: "AI for Fishermen",
    scope: "fishing livelihoods, sea and weather preparation, boat safety, fishing-zone decisions, catch planning, and fish market or supply-chain questions",
    summary: "Clearer choices around sea conditions, safety and catch planning.",
    detail: "Turn weather uncertainty and market pressure into a calmer pre-departure plan.",
    starterPrompts: [
      "What should I confirm before leaving for a coastal fishing trip?",
      "Help me make a safety checklist for a small fishing boat.",
      "How can I record catch and price information for a better selling decision?",
    ],
    greeting: "Let’s begin with safety and a clear plan. Tell me your coast, boat type, and what decision you need to make today.",
    image: "/manus-storage/fishing-harbor-replacement_9d45fa9a.jpg",
    size: "tall",
  },
  {
    id: "artisans",
    number: "03",
    eyebrow: "Craft & market",
    title: "AI for Artisans",
    scope: "traditional craft, small-scale production, product catalogues, pricing, market discovery, demand signals, and connecting producers with customers",
    summary: "Discover demand, describe products and make craft visible to new customers.",
    detail: "Shape a product story, pricing question or catalogue entry without losing the character of the work.",
    starterPrompts: [
      "Write a simple catalogue description for my handwoven stole.",
      "What information should I collect before setting a fair price?",
      "Help me identify a small online market plan for my craft.",
    ],
    greeting: "Your craft already has a story. Tell me what you make, who you hope to reach, and the business question you want to solve.",
    image: "/manus-storage/artisan-loom-replacement_c00969f9.jpg",
    size: "standard",
  },
  {
    id: "micro-entrepreneurs",
    number: "04",
    eyebrow: "Street economy",
    title: "AI for Micro-Entrepreneurs",
    scope: "street vending, micro-business demand, inventory, basic financial decisions, formal market access, and relevant business support",
    summary: "Plan stock, demand and money with less guesswork.",
    detail: "Start with a day’s sales, a product list or a cash-flow concern. The goal is a small next step, not a complicated model.",
    starterPrompts: [
      "Help me plan how much stock to buy for a busy weekend.",
      "What simple daily numbers should I write down for my stall?",
      "How can I compare two small business support options?",
    ],
    greeting: "Let’s make your next business decision clearer. What do you sell, and what are you deciding this week?",
    size: "standard",
  },
  {
    id: "public-services",
    number: "05",
    eyebrow: "Rights & access",
    title: "Accessible Public Services",
    scope: "welfare schemes, government services, official documentation, eligibility questions, application preparation, and navigating public-service processes",
    summary: "Find a path through welfare, documents and eligibility without the maze.",
    detail: "Use plain language to understand what a service asks for, what to prepare, and which office or portal to confirm with.",
    starterPrompts: [
      "What questions should I ask before applying for a welfare scheme?",
      "Help me make a document checklist for a government service.",
      "Explain eligibility requirements in simple language.",
    ],
    greeting: "I can help you break a public-service process into clear steps. Name the service and your state, and we’ll start with what is known.",
    size: "feature",
  },
  {
    id: "disabilities",
    number: "06",
    eyebrow: "Access & agency",
    title: "AI for Persons with Disabilities",
    scope: "accessibility, assistive communication, inclusive education, navigation, disability-inclusive employment, and daily autonomy",
    summary: "Tools and information designed around access, autonomy and opportunity.",
    detail: "Explore communication, learning, navigation or employment support with accessibility as the starting condition.",
    starterPrompts: [
      "Help me find an accessible way to organize study notes.",
      "What information should I check before applying for accessible employment?",
      "Can you simplify this instruction into short, clear steps?",
    ],
    greeting: "Tell me the task you want to make easier and any accessibility preference you would like me to respect. We can work one step at a time.",
    size: "standard",
  },
  {
    id: "education",
    number: "07",
    eyebrow: "Learning & futures",
    title: "Rural Education & Skills",
    scope: "personalized learning, multilingual educational help, study support, career guidance, skill development, and limited-resource learning pathways",
    summary: "Personalized learning, local-language support and realistic career pathways.",
    detail: "Create a study plan, understand a hard concept or map a skill goal around the resources you actually have.",
    starterPrompts: [
      "Make a one-week study plan for basic English practice.",
      "Explain this science topic in simple Hindi and English.",
      "What skills can I learn with a phone and two hours a day?",
    ],
    greeting: "I can help you learn in small, useful steps. What are you studying or hoping to learn next?",
    size: "standard",
  },
  {
    id: "climate",
    number: "08",
    eyebrow: "Climate & readiness",
    title: "Disaster Resilience",
    scope: "floods, droughts, extreme weather, household or community preparedness, response planning, and climate-related resilience",
    summary: "Prepare, respond and recover with community-scale clarity.",
    detail: "Make a local readiness list, explain an alert, or organize the information your household needs before a climate event.",
    starterPrompts: [
      "Help my family make a simple flood readiness checklist.",
      "What details should our community record after a drought warning?",
      "Explain this weather alert in plain language.",
    ],
    greeting: "Preparedness starts with clear information. Tell me what risk you are preparing for and what resources your household has available.",
    size: "tall",
  },
  {
    id: "open-field",
    number: "09",
    eyebrow: "The open field",
    title: "Your community, your challenge",
    scope: "community needs not covered by the other eight pathways, early-stage public-good problem framing, underserved groups, and measurable social-impact ideas",
    summary: "Name a need that deserves a more useful tool.",
    detail: "The strongest public-good ideas begin close to a lived problem. Start with who is underserved and the decision that could be made easier.",
    starterPrompts: [
      "Help me frame a community challenge clearly.",
      "What questions should I ask people before building an AI tool for them?",
      "Help me define a small, measurable public-good outcome.",
    ],
    greeting: "Tell me about the community you care about and the moment where information, access or confidence breaks down. We’ll shape a useful starting point.",
    size: "feature",
  },
];

export function getCommunityPathway(id: string): CommunityPathway | undefined {
  return communityPathways.find((pathway) => pathway.id === id);
}
