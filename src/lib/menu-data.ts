export const partsMega = [
  {
    heading: "🔧 Engine & CVT",
    items: [
      { label: "Cylinder Block", href: "/products?category=engine" },
      { label: "Cylinder Head", href: "/products?category=engine" },
      { label: "Piston, Rings & Pin", href: "/products?category=engine" },
      { label: "Crankshaft", href: "/products?category=engine" },
      { label: "Camshaft & Valves", href: "/products?category=engine" },
      { label: "Timing Chain", href: "/products?category=engine" },
      { label: "Gaskets & Seals", href: "/products?category=engine" },
      { label: "Drive Belt & Variator", href: "/products?category=engine" },
    ],
  },
  {
    heading: "⚡ Electrical & Fuel",
    items: [
      { label: "Battery", href: "/products?category=electrical" },
      { label: "ECU / Wiring Loom", href: "/products?category=electrical" },
      { label: "Ignition Coil", href: "/products?category=electrical" },
      { label: "Starter Motor", href: "/products?category=electrical" },
      { label: "Regulator / Rectifier", href: "/products?category=electrical" },
      { label: "Fuel Pump & Injector", href: "/products?category=electrical" },
      { label: "Throttle Body", href: "/products?category=electrical" },
      { label: "Air Filter & Air Box", href: "/products?category=electrical" },
    ],
  },
  {
    heading: "🛑 Brakes & Wheels",
    items: [
      { label: "Brake Discs", href: "/products?category=brakes" },
      { label: "Brake Pads", href: "/products?category=brakes" },
      { label: "Brake Calipers", href: "/products?category=brakes" },
      { label: "Master Cylinder", href: "/products?category=brakes" },
      { label: "ABS Unit", href: "/products?category=brakes" },
      { label: "Tyres", href: "/products?category=tyres" },
      { label: "Wheel Bearings", href: "/products?category=tyres" },
    ],
  },
  {
    heading: "💡 Body, Lights & Suspension",
    items: [
      { label: "Headlight Unit", href: "/products?category=electrical" },
      { label: "Tail Light & Indicators", href: "/products?category=electrical" },
      { label: "Front Fairing", href: "/products?category=body" },
      { label: "Side & Rear Panels", href: "/products?category=body" },
      { label: "Full Body Kits", href: "/products?category=body" },
      { label: "Front Forks", href: "/products?category=suspension" },
      { label: "Rear Shock", href: "/products?category=suspension" },
    ],
  },
];

export const accessoriesMega = [
  {
    heading: "🪖 Rider & Safety",
    items: [
      { label: "Helmets", href: "/products" },
      { label: "Gloves & Jackets", href: "/products" },
      { label: "Rain Suits", href: "/products" },
      { label: "Crash Bars", href: "/products" },
      { label: "Disc Locks", href: "/products" },
      { label: "GPS Trackers", href: "/products" },
    ],
  },
  {
    heading: "📦 Storage & Touring",
    items: [
      { label: "Top Boxes 45–65L", href: "/products" },
      { label: "Delivery Boxes", href: "/products" },
      { label: "Rear Racks", href: "/products" },
      { label: "Side Panniers", href: "/products" },
      { label: "Phone Holders", href: "/products" },
      { label: "USB Chargers", href: "/products" },
    ],
  },
  {
    heading: "🏎️ Performance & Style",
    items: [
      { label: "Performance Exhausts", href: "/products" },
      { label: "Racing Variators", href: "/products" },
      { label: "Air Filter Upgrades", href: "/products" },
      { label: "LED & Aux Lights", href: "/products" },
      { label: "Body Wraps & Decals", href: "/products" },
      { label: "Custom Mirrors", href: "/products" },
    ],
  },
];

export const mobileGroups = [
  {
    icon: "🔧",
    title: "Engine & CVT",
    items: partsMega[0].items,
  },
  {
    icon: "⚡",
    title: "Electrical & Fuel",
    items: partsMega[1].items,
  },
  {
    icon: "🛑",
    title: "Brakes & Wheels",
    items: partsMega[2].items,
  },
  {
    icon: "💡",
    title: "Body, Lights & Suspension",
    items: partsMega[3].items,
  },
  {
    icon: "🪖",
    title: "Rider & Safety",
    items: accessoriesMega[0].items,
  },
  {
    icon: "📦",
    title: "Storage & Touring",
    items: accessoriesMega[1].items,
  },
  {
    icon: "🏎️",
    title: "Performance & Style",
    items: accessoriesMega[2].items,
  },
];
