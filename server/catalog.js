// Seed catalog is also used by explicitly labelled demo mode, never as a silent DB fallback.
export const catalog = [
  {
    id: "diagnosis",
    name: "Device diagnosis",
    category: "Essential",
    description: "A careful check-up and an honest repair plan.",
    pricePaise: 29900,
    durationMinutes: 30,
  },
  {
    id: "screen",
    name: "Screen repair",
    category: "Mobile",
    description: "Cracks happen. Bring your display back to life.",
    pricePaise: 149900,
    durationMinutes: 90,
  },
  {
    id: "battery",
    name: "Battery replacement",
    category: "Mobile",
    description: "More charge. More time. A fresh start.",
    pricePaise: 89900,
    durationMinutes: 60,
  },
  {
    id: "laptop",
    name: "Laptop tune-up",
    category: "Computer",
    description: "Clean, optimize, and make room for what’s next.",
    pricePaise: 79900,
    durationMinutes: 120,
  },
];
export const knowledge = [
  {
    title: "Swollen batteries",
    text: "If a battery is swollen or hot, stop using and charging the device. Do not puncture or open it. Arrange professional inspection.",
    tags: ["battery", "safety"],
  },
  {
    title: "Water exposure",
    text: "Disconnect power if safe. Do not charge a wet device or use heat. Arrange professional inspection. Back up data only after a technician confirms it is safe.",
    tags: ["water", "safety"],
  },
  {
    title: "Slow laptop",
    text: "Back up important files. Restart, check storage space, and install trusted system updates. A laptop tune-up includes cleaning and software checks.",
    tags: ["laptop", "performance"],
  },
  {
    title: "Repair process",
    text: "Choose a service, describe the device, and book a diagnosis. A technician confirms the plan. Track REQUESTED, CONFIRMED, IN_REPAIR, and READY updates. Prices shown are fixed booking fees in INR.",
    tags: ["booking", "payment"],
  },
];
