// Server-side source of truth for item prices.
// This MUST be kept in sync with the MENU array in index.html —
// the browser sends item ids and quantities, but the amount actually
// charged is always computed from THIS list, never from anything
// the browser sends. That's what stops someone from tampering with
// prices in their browser before checkout.

const MENU = [
  { id:'earl-grey-cheesecake', name:'Earl Grey Cheesecake', price:3.50 },
  { id:'tiramisu', name:'Tiramisu', price:3.50 },
  { id:'creme-brulee', name:'Crème Brûlée', price:3.50 },
  { id:'banana-bread', name:'Moist Banana Bread', price:2.00 },
  { id:'chocolate-cake', name:'Chocolate Cake', price:3.50 },
  { id:'salted-caramel-tart', name:'Salted Caramel Tart', price:3.50 },

  { id:'club-sandwich', name:'Club Sandwich', price:3.00 },
  { id:'smoked-turkey', name:'Smoked Turkey Sandwich', price:3.50 },
  { id:'avocado-tartine', name:'Avocado Tartine', price:3.00 },
  { id:'chorizo-focaccia', name:'Chorizo and Manchego Focaccia', price:3.25 },
  { id:'halloumi-sandwich', name:'Grilled Halloumi Sandwich', price:3.25 },
  { id:'smoked-salmon-bagel', name:'Smoked Salmon Bagel', price:3.25 },

  { id:'plain-croissant', name:'Plain Croissant', price:1.20 },
  { id:'almond-croissant', name:'Almond Croissant', price:1.65 },
  { id:'pain-au-chocolat', name:'Pain au Chocolat', price:1.65 },
  { id:'espresso-cookie', name:'Chocolate Espresso Cookie', price:1.50 },
  { id:'raspberry-mille-feuille', name:'Raspberry Mille Feuille', price:2.50 },
  { id:'cinnamon-bun', name:'Cinnamon Bun', price:2.00 },
  { id:'cardamom-bun', name:'Cardamom Bun', price:2.00 },
  { id:'canele', name:'Canelé', price:2.00 },

  { id:'espresso', name:'Espresso', price:1.10 },
  { id:'origin-espresso', name:'Origin of the Month Espresso', price:1.35 },
  { id:'americano', name:'Americano', price:1.30 },
  { id:'origin-americano', name:'Americano Origin of the Month', price:1.55 },
  { id:'cold-brew', name:'Cold Brew (Iced)', price:2.00 },
  { id:'chemex', name:'Chemex Filtered Coffee (Hot/Iced)', price:2.00 },
  { id:'world-chemex', name:'World Class Chemex (Hot/Iced)', price:4.00 },

  { id:'oolong', name:'Oolong Tea', price:2.50 },
  { id:'red-tea', name:'Red Tea (Hot/Iced)', price:2.00 },
  { id:'matcha-latte', name:'Matcha Latte (Hot/Iced)', price:2.20 },
  { id:'hojicha-latte', name:'Hojicha Latte (Hot/Iced)', price:2.20 },
  { id:'spiced-hojicha', name:'Spiced Hojicha Latte (Iced)', price:2.50 },

  { id:'alticcino', name:'Alticcino (Iced)', price:2.50 },
  { id:'cortado', name:'Cortado (Hot)', price:1.25 },
  { id:'origin-cortado', name:'Origin of the Month Cortado (Hot)', price:1.50 },
  { id:'strawberry-delight', name:'Strawberry Delight (Iced)', price:2.50 },
  { id:'flat-white', name:'Flat White (Hot/Iced)', price:1.85 },
  { id:'flat-white-origin', name:'Flat White Origin of the Month (Hot/Iced)', price:2.10 },
  { id:'pumpkin-latte', name:'Pumpkin Spiced Latte (Hot)', price:2.50 },
  { id:'mocha-latte', name:'Mocha Latte (Hot/Iced)', price:2.50 },
  { id:'hot-chocolate', name:'Hot Chocolate (Hot)', price:2.00 },

  { id:'the-marlon', name:'The Marlon', price:2.50 },
  { id:'the-veronica', name:'The Veronica', price:2.50 },

  { id:'the-zen', name:'The Zen', price:2.50 },
  { id:'mont-blanc', name:'Mont Blanc', price:2.50 },
  { id:'amber-flow', name:'Amber Flow', price:2.50 },
  { id:'disco-matcha', name:'Disco Matcha', price:2.50 },
];

function findItem(id) {
  return MENU.find((m) => m.id === id) || null;
}

module.exports = { MENU, findItem };
