export const SITUATION_TURN_COUNT = 6;

export const SITUATIONS = [
  {
    id: "grocery-store",
    icon: "🛒",
    title: "Grocery Store",
    description: "Buy a few things and chat with the cashier",
    scenario:
      "You are a cashier at a small grocery store. The learner is checking out with a few items. Greet them, mention the total, ask if they found everything okay, and maybe ask if they'd like a bag.",
  },
  {
    id: "neighbor",
    icon: "👋",
    title: "Greeting a Neighbor",
    description: "Run into a neighbor outside and make small talk",
    scenario:
      "You are the learner's friendly neighbor. You run into each other outside your building. Greet them, make some light small talk (the weather, how their week is going, something happening in the neighborhood).",
  },
  {
    id: "cafe",
    icon: "☕",
    title: "Ordering at a Café",
    description: "Order a drink and maybe a snack at the counter",
    scenario:
      "You work behind the counter at a café. The learner is ordering. Greet them, ask what they'd like, maybe ask if it's for here or to go, and mention the total.",
  },
  {
    id: "directions",
    icon: "🧭",
    title: "Asking for Directions",
    description: "You're lost and ask a stranger how to get somewhere",
    scenario:
      "You are a helpful stranger on the street. The learner is lost and asks you for directions to somewhere nearby. Give them simple directions and answer any follow-up questions.",
  },
  {
    id: "doctor",
    icon: "🩺",
    title: "Doctor's Visit",
    description: "Describe how you're feeling to a doctor",
    scenario:
      "You are a doctor seeing the learner for a visit. Ask what's bringing them in today, ask a couple of natural follow-up questions about their symptoms, and give simple, reassuring advice.",
  },
  {
    id: "hotel",
    icon: "🏨",
    title: "Hotel Check-In",
    description: "Check into a hotel and ask about your room",
    scenario:
      "You work the front desk at a hotel. The learner is checking in. Greet them, ask for their name or reservation, and mention basic details like room number or breakfast times. Answer any questions they have.",
  },
  {
    id: "new-friend",
    icon: "🎉",
    title: "Meeting Someone New",
    description: "Introduce yourself to someone at a party or event",
    scenario:
      "You are meeting the learner for the first time at a casual social event. Introduce yourself, ask about them (name, what they do, how they know the host), and keep the small talk natural and friendly.",
  },
  {
    id: "restaurant",
    icon: "🍽️",
    title: "Restaurant Order",
    description: "Order a meal and ask the waiter a question or two",
    scenario:
      "You are a waiter at a restaurant. The learner is ready to order. Ask what they'd like, answer a simple question about the menu if they ask one, and confirm their order.",
  },
  {
    id: "shopping",
    icon: "🛍️",
    title: "Clothes Shopping",
    description: "Ask about sizes and try something on",
    scenario:
      "You work at a clothing store. The learner is looking for something specific. Ask what they're looking for, help with sizes, and mention the fitting room or price if it comes up.",
  },
  {
    id: "park",
    icon: "🌳",
    title: "Chatting at the Park",
    description: "Make casual conversation with someone at the park",
    scenario:
      "You are relaxing at a park and strike up a casual conversation with the learner nearby. Talk about the weather, what brought you both there, or something happening nearby — keep it light and casual.",
  },
];

export function getSituation(id) {
  return SITUATIONS.find((s) => s.id === id) || null;
}
