/**
 * Migration 002: Beispieldaten laden
 * Erstellt eine typische Restaurant-Speisekarte mit Tischen.
 * Ausführen: npm run db:seed
 */

require('dotenv').config();
const { initDatabase } = require('../config/database');

const db = initDatabase();

const seed = db.transaction(() => {
  // ─── Vorhandene Daten löschen ───────────────────────
  db.exec(`
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM menu_items;
    DELETE FROM categories;
    DELETE FROM tables;
  `);

  // ─── Kategorien ─────────────────────────────────────
  const insertCategory = db.prepare(`
    INSERT INTO categories (name, sort_order, target, icon) VALUES (?, ?, ?, ?)
  `);

  const categories = [
    ['Vorspeisen', 1, 'kitchen', '🥗'],
    ['Suppen', 2, 'kitchen', '🍜'],
    ['Hauptgerichte', 3, 'kitchen', '🍽️'],
    ['Pasta & Risotto', 4, 'kitchen', '🍝'],
    ['Vom Grill', 5, 'kitchen', '🥩'],
    ['Beilagen', 6, 'kitchen', '🥔'],
    ['Desserts', 7, 'kitchen', '🍰'],
    ['Kindergerichte', 8, 'kitchen', '👶'],
    ['Alkoholfreie Getränke', 10, 'bar', '🥤'],
    ['Bier', 11, 'bar', '🍺'],
    ['Wein', 12, 'bar', '🍷'],
    ['Cocktails', 13, 'bar', '🍸'],
    ['Heißgetränke', 14, 'bar', '☕'],
  ];

  const categoryIds = {};
  for (const [name, sort, target, icon] of categories) {
    const result = insertCategory.run(name, sort, target, icon);
    categoryIds[name] = result.lastInsertRowid;
  }

  // ─── Menü-Einträge ─────────────────────────────────
  const insertItem = db.prepare(`
    INSERT INTO menu_items (category_id, name, description, price, preparation_time, allergens, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const items = [
    // Vorspeisen
    [categoryIds['Vorspeisen'], 'Bruschetta Classica', 'Geröstetes Ciabatta mit Tomaten, Basilikum, Knoblauch', 8.90, 10, 'Gluten', 1],
    [categoryIds['Vorspeisen'], 'Vitello Tonnato', 'Kalbfleisch mit Thunfischsauce und Kapern', 13.90, 12, null, 2],
    [categoryIds['Vorspeisen'], 'Carpaccio vom Rind', 'Mit Rucola, Parmesan und Trüffelöl', 14.50, 10, 'Laktose', 3],
    [categoryIds['Vorspeisen'], 'Gemischter Salat', 'Saisonale Blattsalate mit Hausdressing', 7.50, 5, null, 4],

    // Suppen
    [categoryIds['Suppen'], 'Tomatencremesuppe', 'Mit Basilikum und Croutons', 6.90, 8, 'Gluten, Laktose', 1],
    [categoryIds['Suppen'], 'Gulaschsuppe', 'Deftig nach Hausrezept', 8.50, 8, null, 2],
    [categoryIds['Suppen'], 'Tagessuppe', 'Fragen Sie Ihren Kellner', 6.50, 8, null, 3],

    // Hauptgerichte
    [categoryIds['Hauptgerichte'], 'Wiener Schnitzel', 'Vom Kalb, mit Preiselbeeren und Petersilienkartoffeln', 22.90, 20, 'Gluten, Ei', 1],
    [categoryIds['Hauptgerichte'], 'Zanderfilet', 'Auf Blattspinat mit Kartoffelpüree', 24.50, 20, 'Fisch, Laktose', 2],
    [categoryIds['Hauptgerichte'], 'Rinderroulade', 'Klassisch mit Rotkohl und Knödeln', 19.90, 25, 'Gluten', 3],
    [categoryIds['Hauptgerichte'], 'Hähnchenbrust', 'Gefüllt mit Spinat und Feta, Ofenkartoffeln', 17.90, 18, 'Laktose', 4],

    // Pasta & Risotto
    [categoryIds['Pasta & Risotto'], 'Spaghetti Bolognese', 'Hausgemachte Fleischsauce', 13.90, 15, 'Gluten', 1],
    [categoryIds['Pasta & Risotto'], 'Penne Arrabiata', 'Scharfe Tomatensauce (vegan)', 11.90, 12, 'Gluten', 2],
    [categoryIds['Pasta & Risotto'], 'Risotto mit Pilzen', 'Steinpilze und Parmesan', 15.90, 18, 'Laktose', 3],
    [categoryIds['Pasta & Risotto'], 'Tagliatelle Lachs', 'Räucherlachs in Sahnesauce', 16.90, 15, 'Gluten, Fisch, Laktose', 4],

    // Vom Grill
    [categoryIds['Vom Grill'], 'Rumpsteak 300g', 'Argentinisches Rind, medium rare', 29.90, 20, null, 1],
    [categoryIds['Vom Grill'], 'Spareribs', 'BBQ-mariniert mit Coleslaw', 21.90, 25, null, 2],
    [categoryIds['Vom Grill'], 'Lammkoteletts', 'Mit Rosmarin und Knoblauch', 26.90, 20, null, 3],

    // Beilagen
    [categoryIds['Beilagen'], 'Pommes Frites', null, 4.50, 8, null, 1],
    [categoryIds['Beilagen'], 'Kartoffelpüree', null, 4.50, 5, 'Laktose', 2],
    [categoryIds['Beilagen'], 'Gemischter Salat', null, 5.50, 5, null, 3],
    [categoryIds['Beilagen'], 'Ofenkartoffel', 'Mit Sauerrahm', 5.00, 10, 'Laktose', 4],
    [categoryIds['Beilagen'], 'Saisonales Gemüse', null, 5.50, 8, null, 5],

    // Desserts
    [categoryIds['Desserts'], 'Tiramisu', 'Hausgmacht, klassisch', 8.90, 5, 'Ei, Laktose, Gluten', 1],
    [categoryIds['Desserts'], 'Panna Cotta', 'Mit Beerensoße', 7.90, 5, 'Laktose', 2],
    [categoryIds['Desserts'], 'Schokoladenkuchen', 'Warm, mit Vanilleeis', 9.50, 8, 'Ei, Gluten, Laktose', 3],
    [categoryIds['Desserts'], 'Gemischtes Eis', '3 Kugeln nach Wahl', 6.50, 3, 'Laktose', 4],

    // Kindergerichte
    [categoryIds['Kindergerichte'], 'Chicken Nuggets', 'Mit Pommes und Ketchup', 8.90, 12, 'Gluten', 1],
    [categoryIds['Kindergerichte'], 'Mini-Schnitzel', 'Mit Pommes', 9.50, 15, 'Gluten, Ei', 2],
    [categoryIds['Kindergerichte'], 'Nudeln mit Tomatensoße', null, 6.90, 10, 'Gluten', 3],

    // Alkoholfreie Getränke
    [categoryIds['Alkoholfreie Getränke'], 'Mineralwasser 0,5l', 'Still oder sprudelnd', 3.50, 2, null, 1],
    [categoryIds['Alkoholfreie Getränke'], 'Coca-Cola 0,3l', null, 3.50, 2, null, 2],
    [categoryIds['Alkoholfreie Getränke'], 'Fanta / Sprite 0,3l', null, 3.50, 2, null, 3],
    [categoryIds['Alkoholfreie Getränke'], 'Apfelsaftschorle 0,4l', null, 3.90, 2, null, 4],
    [categoryIds['Alkoholfreie Getränke'], 'Frischer Orangensaft 0,3l', 'Frisch gepresst', 5.50, 3, null, 5],
    [categoryIds['Alkoholfreie Getränke'], 'Fritz-Kola 0,33l', null, 3.90, 2, null, 6],

    // Bier
    [categoryIds['Bier'], 'Pils vom Fass 0,3l', null, 3.80, 2, 'Gluten', 1],
    [categoryIds['Bier'], 'Pils vom Fass 0,5l', null, 4.80, 2, 'Gluten', 2],
    [categoryIds['Bier'], 'Weizenbier 0,5l', null, 4.90, 2, 'Gluten', 3],
    [categoryIds['Bier'], 'Alkoholfreies Bier 0,33l', null, 3.80, 2, 'Gluten', 4],
    [categoryIds['Bier'], 'Radler 0,5l', null, 4.50, 2, 'Gluten', 5],

    // Wein
    [categoryIds['Wein'], 'Hauswein Weiß 0,2l', 'Grauburgunder, trocken', 5.50, 2, 'Sulfite', 1],
    [categoryIds['Wein'], 'Hauswein Rot 0,2l', 'Dornfelder, halbtrocken', 5.50, 2, 'Sulfite', 2],
    [categoryIds['Wein'], 'Prosecco 0,1l', null, 4.90, 2, 'Sulfite', 3],
    [categoryIds['Wein'], 'Riesling 0,2l', 'Mosel, feinherb', 6.90, 2, 'Sulfite', 4],

    // Cocktails
    [categoryIds['Cocktails'], 'Aperol Spritz', null, 8.50, 5, 'Sulfite', 1],
    [categoryIds['Cocktails'], 'Hugo', 'Holunderblütensirup, Prosecco, Minze', 8.50, 5, 'Sulfite', 2],
    [categoryIds['Cocktails'], 'Mojito', null, 9.50, 5, null, 3],
    [categoryIds['Cocktails'], 'Gin Tonic', 'Mit Hendrick\'s Gin', 10.50, 3, null, 4],

    // Heißgetränke
    [categoryIds['Heißgetränke'], 'Kaffee', null, 3.20, 3, null, 1],
    [categoryIds['Heißgetränke'], 'Cappuccino', null, 3.80, 3, 'Laktose', 2],
    [categoryIds['Heißgetränke'], 'Espresso', null, 2.80, 2, null, 3],
    [categoryIds['Heißgetränke'], 'Latte Macchiato', null, 4.20, 3, 'Laktose', 4],
    [categoryIds['Heißgetränke'], 'Tee (diverse Sorten)', null, 3.50, 3, null, 5],
    [categoryIds['Heißgetränke'], 'Heiße Schokolade', 'Mit Sahne', 4.50, 4, 'Laktose', 6],
  ];

  for (const item of items) {
    insertItem.run(...item);
  }

  // ─── Tische ─────────────────────────────────────────
  const insertTable = db.prepare(`
    INSERT INTO tables (number, name, seats, zone) VALUES (?, ?, ?, ?)
  `);

  const tables = [
    [1, 'Fensterplatz 1', 2, 'window'],
    [2, 'Fensterplatz 2', 2, 'window'],
    [3, 'Fensterplatz 3', 4, 'window'],
    [4, 'Mitte 1', 4, 'main'],
    [5, 'Mitte 2', 4, 'main'],
    [6, 'Mitte 3', 6, 'main'],
    [7, 'Mitte 4', 6, 'main'],
    [8, 'Ecktisch 1', 4, 'corner'],
    [9, 'Ecktisch 2', 4, 'corner'],
    [10, 'Großer Tisch', 8, 'main'],
    [11, 'Terrasse 1', 4, 'terrace'],
    [12, 'Terrasse 2', 4, 'terrace'],
    [13, 'Terrasse 3', 6, 'terrace'],
    [14, 'Terrasse 4', 4, 'terrace'],
    [15, 'Bar-Platz 1', 2, 'bar'],
    [16, 'Bar-Platz 2', 2, 'bar'],
    [17, 'Separee', 8, 'private'],
    [18, 'Stammtisch', 10, 'main'],
    [19, 'Lounge 1', 4, 'lounge'],
    [20, 'Lounge 2', 6, 'lounge'],
  ];

  for (const table of tables) {
    insertTable.run(...table);
  }

  console.log(`✅ Seed-Daten geladen:`);
  console.log(`   📋 ${categories.length} Kategorien`);
  console.log(`   🍽️  ${items.length} Menü-Einträge`);
  console.log(`   🪑 ${tables.length} Tische`);
});

// Ausführen
try {
  seed();
} catch (error) {
  console.error('❌ Seed fehlgeschlagen:', error);
} finally {
  db.close();
}
