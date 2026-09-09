// =================== EGYPT ATTRACTIONS SEED ===================
// Run: node backend/seeds/egyptAttractions.js
require('dotenv').config();
const mongoose = require('mongoose');
const Attraction = require('../models/Attraction');

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travelnow';

const attractions = [
  // ===== GIZA =====
  {
    name: 'The Great Pyramid of Giza',
    category: 'historical',
    description: 'The oldest and largest of the three pyramids in the Giza pyramid complex, built as a tomb for Pharaoh Khufu around 2560 BC. One of the Seven Wonders of the Ancient World and the only one still largely intact.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kheops-Pyramid.jpg/1280px-Kheops-Pyramid.jpg'],
    location: 'Giza Plateau, Al Haram',
    governorate: 'Giza',
    coordinates: { lat: 29.9792, lng: 31.1342 },
    openingHours: '8:00 AM - 5:00 PM',
    prices: { egyptian: 100, foreigner: 360 },
    rating: 4.9, reviews: 125000, isActive: true
  },
  {
    name: 'Sphinx of Giza',
    category: 'historical',
    description: 'A limestone statue of a reclining sphinx with a human head and a lion body. Dating back to around 2500 BC, it is the oldest known monumental sculpture in Egypt and stands 20 meters tall.',
    images: ['https://res.cloudinary.com/ddjuftfy2/image/upload/f_webp,c_fill,q_auto/memphis/large/588275203_the-great-sphinx.webp'],
    location: 'Giza Plateau, Al Haram',
    governorate: 'Giza',
    coordinates: { lat: 29.9753, lng: 31.1376 },
    openingHours: '8:00 AM - 5:00 PM',
    prices: { egyptian: 60, foreigner: 200 },
    rating: 4.8, reviews: 98000, isActive: true
  },
  {
    name: 'Grand Egyptian Museum',
    category: 'museums',
    description: 'The world\'s largest archaeological museum, home to the complete Tutankhamun collection with over 5,000 artifacts. A state-of-the-art facility near the Giza Pyramids opened in 2023.',
    images: ['https://i0.wp.com/egypt-museum.com/wp-content/uploads/2025/11/gem-museum-1.jpg?ssl=1'],
    location: 'Kafr Nassar, Giza',
    governorate: 'Giza',
    coordinates: { lat: 29.9875, lng: 31.1134 },
    openingHours: '9:00 AM - 10:00 PM',
    prices: { egyptian: 150, foreigner: 500 },
    rating: 4.9, reviews: 42000, isActive: true
  },
  {
    name: 'Saqqara Necropolis',
    category: 'historical',
    description: 'A vast ancient burial ground with the Step Pyramid of Djoser, the world\'s oldest stone monument built in 2630 BC. Contains dozens of pyramids, mastabas, and the Serapeum with massive granite sarcophagi.',
    images: ['https://egyptplanners.com/wp-content/uploads/2020/06/a-wonderful-view-of-the-step-pyramid-of-djoser-in-the-necropolis-of-saqqara.jpg'],
    location: 'Saqqara Village, Giza',
    governorate: 'Giza',
    coordinates: { lat: 29.8713, lng: 31.2163 },
    openingHours: '8:00 AM - 5:00 PM',
    prices: { egyptian: 100, foreigner: 360 },
    rating: 4.7, reviews: 45000, isActive: true
  },
  {
    name: 'Bent Pyramid of Dahshur',
    category: 'historical',
    description: 'A unique ancient Egyptian pyramid built during the reign of Pharaoh Sneferu around 2600 BC. Features a distinctive bent profile due to a change in construction angle mid-build, and its interior is open to visitors.',
    images: ['https://egymonuments.gov.eg//media/7226/g75a3113.jpg?anchor=center&mode=crop&width=1200&height=630&rnd=134192586690000000'],
    location: 'Dahshur, Giza',
    governorate: 'Giza',
    coordinates: { lat: 29.7919, lng: 31.2092 },
    openingHours: '8:00 AM - 4:00 PM',
    prices: { egyptian: 40, foreigner: 120 },
    rating: 4.5, reviews: 19000, isActive: true
  },
  {
    name: 'Memphis Open-Air Museum',
    category: 'historical',
    description: 'The site of ancient Memphis, once the capital of ancient Egypt and one of the greatest cities of the ancient world. Features a massive 10-meter limestone statue of Ramesses II and the Alabaster Sphinx.',
    images: ['https://airial.travel/_next/image?url=https%3A%2F%2Fmedia-cdn.tripadvisor.com%2Fmedia%2Fphoto-w%2F09%2F14%2F61%2F8c%2Fmemphis-museum.jpg&w=2048&q=75'],
    location: 'Mit Rahina, Giza',
    governorate: 'Giza',
    coordinates: { lat: 29.8464, lng: 31.2519 },
    openingHours: '8:00 AM - 4:00 PM',
    prices: { egyptian: 40, foreigner: 120 },
    rating: 4.4, reviews: 28000, isActive: true
  },
  {
    name: 'Black Desert Bahariya',
    category: 'adventure',
    description: 'A volcanic landscape covered in black basalt rocks and powder created by ancient volcanic eruptions near Bahariya Oasis. Dramatic dark mountains contrast beautifully against the golden desert.',
    images: ['https://d3rr2gvhjw0wwy.cloudfront.net/uploads/mandators/56119/cms/561582/940x500-1-50-1ddff8838c83329995d930bbc38736f4.jpg'],
    location: 'Bahariya Oasis, Giza',
    governorate: 'Giza',
    coordinates: { lat: 28.3380, lng: 28.8700 },
    openingHours: 'Open 24 hours',
    prices: { egyptian: 20, foreigner: 50 },
    rating: 4.6, reviews: 22000, isActive: true
  },

  // ===== CAIRO =====
  {
    name: 'Egyptian Museum Cairo',
    category: 'museums',
    description: 'The largest collection of ancient Egyptian antiquities in the world, housing over 120,000 items including the treasures of Tutankhamun and royal mummies in the heart of Tahrir Square.',
    images: ['https://www.pyramidsdaytour.com/wp-content/uploads/2023/01/egyptianmuseum-1.jpg'],
    location: 'Tahrir Square, Downtown Cairo',
    governorate: 'Cairo',
    coordinates: { lat: 30.0478, lng: 31.2336 },
    openingHours: '9:00 AM - 5:00 PM',
    prices: { egyptian: 100, foreigner: 300 },
    rating: 4.7, reviews: 87000, isActive: true
  },
  {
    name: 'Khan el-Khalili Bazaar',
    category: 'cultural',
    description: 'A famous historic bazaar in the old Islamic quarter of Cairo dating back to 1382. One of the oldest trading centers in the world, filled with spices, jewelry, perfumes, and traditional crafts.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/d/dc/The_Khan_el-Khalili_market_in_Cairo%2C_Egypt_%282743501345%29.jpg'],
    location: 'Al-Gamaleya, Cairo',
    governorate: 'Cairo',
    coordinates: { lat: 30.0477, lng: 31.2622 },
    openingHours: '9:00 AM - 10:00 PM',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.6, reviews: 75000, isActive: true
  },
  {
    name: 'Al-Azhar Mosque',
    category: 'religious',
    description: 'One of the oldest universities in the world and a major Islamic mosque, founded in 970 AD. A spiritual and intellectual center of the Islamic world for over a thousand years.',
    images: ['https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ26_hJS75_HmIX50-TJZ-p5fkIQzfLcFw1Vw&s'],
    location: 'El-Darb El-Ahmar, Cairo',
    governorate: 'Cairo',
    coordinates: { lat: 30.0459, lng: 31.2627 },
    openingHours: '9:00 AM - 5:00 PM',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.7, reviews: 55000, isActive: true
  },
  {
    name: 'Citadel of Saladin',
    category: 'historical',
    description: 'A medieval Islamic fortification built by Salah ad-Din on Mokattam Hill. Served as the seat of Egyptian government for 700 years. Contains the Muhammad Ali Mosque and offers panoramic views of Cairo.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/9/93/Flickr_-_HuTect_ShOts_-_Citadel_of_Salah_El.Din_and_Masjid_Muhammad_Ali_%D9%82%D9%84%D8%B9%D8%A9_%D8%B5%D9%84%D8%A7%D8%AD_%D8%A7%D9%84%D8%AF%D9%8A%D9%86_%D8%A7%D9%84%D8%A3%D9%8A%D9%88%D8%A8%D9%8A_%D9%88%D9%85%D8%B3%D8%AC%D8%AF_%D9%85%D8%AD%D9%85%D8%AF_%D8%B9%D9%84%D9%8A_-_Cairo_-_Egypt_-_17_04_2010_%284%29.jpg'],
    location: 'Mokattam Hill, Cairo',
    governorate: 'Cairo',
    coordinates: { lat: 30.0288, lng: 31.2607 },
    openingHours: '8:00 AM - 5:00 PM',
    prices: { egyptian: 60, foreigner: 180 },
    rating: 4.6, reviews: 62000, isActive: true
  },
  {
    name: 'Coptic Cairo',
    category: 'religious',
    description: 'The oldest part of Cairo, home to early Christian churches including the Hanging Church, Babylon Fortress, and Ben Ezra Synagogue. A unique spiritual district where Jesus, Mary, and Joseph reportedly sheltered.',
    images: ['https://images.squarespace-cdn.com/content/v1/5f4ef170d347c007483edd76/9f7cac20-da8c-42a0-8b48-0fcf637c1913/Cairo-3953.jpg'],
    location: 'Old Cairo, Coptic Cairo',
    governorate: 'Cairo',
    coordinates: { lat: 30.0061, lng: 31.2310 },
    openingHours: '9:00 AM - 5:00 PM',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.5, reviews: 41000, isActive: true
  },
  {
    name: 'Sultan Hassan Mosque-Madrasa',
    category: 'religious',
    description: 'One of the largest and most impressive examples of Mamluk architecture in the world, built between 1356-1363. Its massive 68-meter portal is the tallest of any Islamic monument in Egypt.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Flickr_-_archer10_%28Dennis%29_-_Egypt-13A-061_%28cropped%29.jpg/1280px-Flickr_-_archer10_%28Dennis%29_-_Egypt-13A-061_%28cropped%29.jpg'],
    location: 'Salah Ad Din Square, Cairo',
    governorate: 'Cairo',
    coordinates: { lat: 30.0292, lng: 31.2573 },
    openingHours: '8:00 AM - 5:00 PM',
    prices: { egyptian: 40, foreigner: 100 },
    rating: 4.6, reviews: 31000, isActive: true
  },
  {
    name: 'Ibn Tulun Mosque',
    category: 'religious',
    description: 'The oldest mosque in Cairo still in its original form, built in 879 AD. Famous for its unique spiral minaret and vast open courtyard. A masterpiece of Abbasid architecture.',
    images: ['https://res.cloudinary.com/ddjuftfy2/image/upload/f_webp,c_fill,q_auto/memphis/large/956210572_ibn-tulun-mosque.jpg'],
    location: 'El-Sayeda Zainab, Cairo',
    governorate: 'Cairo',
    coordinates: { lat: 30.0268, lng: 31.2495 },
    openingHours: '8:00 AM - 4:00 PM',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.5, reviews: 22000, isActive: true
  },

  // ===== LUXOR =====
  {
    name: 'Karnak Temple Complex',
    category: 'historical',
    description: 'The largest religious structure ever built, covering 200 acres. Home to the Great Hypostyle Hall with 134 massive columns. Built over 2,000 years by successive pharaohs along the east bank of the Nile.',
    images: ['https://d3rr2gvhjw0wwy.cloudfront.net/uploads/mandators/49581/file-manager/karnak-temple.jpg'],
    location: 'El-Karnak, Luxor',
    governorate: 'Luxor',
    coordinates: { lat: 25.7188, lng: 32.6573 },
    openingHours: '6:00 AM - 5:30 PM',
    prices: { egyptian: 100, foreigner: 360 },
    rating: 4.9, reviews: 92000, isActive: true
  },
  {
    name: 'Luxor Temple',
    category: 'historical',
    description: 'A grand ancient temple on the east bank of the Nile built around 1400 BC by Amenhotep III. Famous for its beautiful nighttime illumination, Avenue of Sphinxes, and colossal statues of Ramesses II.',
    images: ['https://www.pyramidsdaytour.com/wp-content/uploads/2025/07/Egypt-Luxor-Temple1-SH.jpg'],
    location: 'Luxor City Center, Luxor',
    governorate: 'Luxor',
    coordinates: { lat: 25.6997, lng: 32.6392 },
    openingHours: '6:00 AM - 10:00 PM',
    prices: { egyptian: 100, foreigner: 360 },
    rating: 4.8, reviews: 78000, isActive: true
  },
  {
    name: 'Valley of the Kings',
    category: 'historical',
    description: 'The royal necropolis of New Kingdom pharaohs including Tutankhamun and Ramesses II. Over 63 tombs with stunning painted walls and hieroglyphics located in the Theban Hills on Luxor\'s west bank.',
    images: ['https://cdn.britannica.com/59/25059-050-5E36B57C/tomb-Tutankhamun-Valley-of-the-Kings-Thebes.jpg'],
    location: 'West Bank, Luxor',
    governorate: 'Luxor',
    coordinates: { lat: 25.7402, lng: 32.6014 },
    openingHours: '6:00 AM - 4:00 PM',
    prices: { egyptian: 100, foreigner: 360 },
    rating: 4.9, reviews: 105000, isActive: true
  },
  {
    name: 'Temple of Hatshepsut',
    category: 'historical',
    description: 'The mortuary temple of Egypt\'s greatest female Pharaoh, carved into the limestone cliffs at Deir el-Bahari. One of the most spectacular ancient buildings ever created with three colonnaded terraces.',
    images: ['https://www.egypttoursportal.com/images/2018/09/Queen-Hatshepsut-Temple-Egypt-Tours-Portal-1.jpg'],
    location: 'Deir el-Bahari, Luxor West Bank',
    governorate: 'Luxor',
    coordinates: { lat: 25.7379, lng: 32.6069 },
    openingHours: '6:00 AM - 5:00 PM',
    prices: { egyptian: 60, foreigner: 200 },
    rating: 4.8, reviews: 67000, isActive: true
  },
  {
    name: 'Colossi of Memnon',
    category: 'historical',
    description: 'Two massive stone statues of Pharaoh Amenhotep III standing 18 meters tall. These ancient guardians have stood for over 3,400 years and greet visitors entering Luxor\'s west bank.',
    images: ['https://www.egypttoursportal.com/images/2025/06/Memnon-Egypt-Tours-Portal.jpg'],
    location: 'West Bank, Luxor',
    governorate: 'Luxor',
    coordinates: { lat: 25.7206, lng: 32.6104 },
    openingHours: 'Open 24 hours',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.5, reviews: 52000, isActive: true
  },
  {
    name: 'Luxor Museum',
    category: 'museums',
    description: 'A world-class museum on the Nile corniche displaying exceptional artifacts from the Theban region, including royal mummies, beautiful statues, and treasures from the New Kingdom era.',
    images: ['https://d3rr2gvhjw0wwy.cloudfront.net/uploads/mandators/49581/file-manager/the-luxor-museum-of-ancient-egyptian-art.jpg'],
    location: 'Corniche El Nile, Luxor',
    governorate: 'Luxor',
    coordinates: { lat: 25.7057, lng: 32.6430 },
    openingHours: '9:00 AM - 1:00 PM & 4:00 PM - 9:00 PM',
    prices: { egyptian: 80, foreigner: 200 },
    rating: 4.6, reviews: 28000, isActive: true
  },
  {
    name: 'Abydos Temple of Seti I',
    category: 'historical',
    description: 'One of Egypt\'s most important religious sites, built by Seti I around 1280 BC. Contains the famous King List with 76 pharaohs\' names and has the most vividly colored wall paintings in all of Egypt.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/3/33/AbydosFacade.jpg'],
    location: 'El Araba El Madfuna, Sohag',
    governorate: 'Sohag',
    coordinates: { lat: 26.1849, lng: 31.9194 },
    openingHours: '8:00 AM - 4:00 PM',
    prices: { egyptian: 60, foreigner: 180 },
    rating: 4.7, reviews: 24000, isActive: true
  },

  // ===== ASWAN =====
  {
    name: 'Abu Simbel Temples',
    category: 'historical',
    description: 'Two massive rock temples built by Ramesses II in the 13th century BC. Famously relocated in the 1960s to save them from the Nile waters. Twice a year the sun illuminates the inner sanctuary\'s four statues.',
    images: ['https://www.swedishnomad.com/wp-content/images/2019/09/Abu-Simbel.jpg'],
    location: 'Abu Simbel Village, Aswan',
    governorate: 'Aswan',
    coordinates: { lat: 22.3372, lng: 31.6258 },
    openingHours: '5:00 AM - 6:00 PM',
    prices: { egyptian: 100, foreigner: 400 },
    rating: 4.9, reviews: 88000, isActive: true
  },
  {
    name: 'Philae Temple',
    category: 'historical',
    description: 'An ancient temple complex dedicated to the goddess Isis on Agilkia Island. Relocated from Philae Island to save it from Nile flooding. Night light-and-sound shows make it magical after dark.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/8/8d/Philae_Temple_R05.jpg'],
    location: 'Agilkia Island, Aswan',
    governorate: 'Aswan',
    coordinates: { lat: 24.0252, lng: 32.8843 },
    openingHours: '7:00 AM - 4:00 PM',
    prices: { egyptian: 100, foreigner: 360 },
    rating: 4.8, reviews: 61000, isActive: true
  },
  {
    name: 'Aswan High Dam',
    category: 'natural',
    description: 'One of the largest embankment dams in the world, built between 1960-1970. Creates Lake Nasser, the world\'s largest artificial lake. A feat of modern engineering offering spectacular views.',
    images: ['https://res.cloudinary.com/ddjuftfy2/image/upload/f_webp,c_fill,q_auto/memphis/large/1571362135_High%20Dam.jpg'],
    location: 'Aswan City, Aswan',
    governorate: 'Aswan',
    coordinates: { lat: 23.9700, lng: 32.8775 },
    openingHours: '7:00 AM - 5:00 PM',
    prices: { egyptian: 20, foreigner: 60 },
    rating: 4.4, reviews: 32000, isActive: true
  },
  {
    name: 'Nubian Village Aswan',
    category: 'cultural',
    description: 'Colorful and vibrant Nubian villages along the Nile with bright painted houses, warm hospitality, traditional crafts, crocodile farms, and unique Nubian culture dating back thousands of years.',
    images: ['https://media-cdn.tripadvisor.com/media/attractions-splice-spp-674x446/12/1b/61/53.jpg'],
    location: 'West Bank, Aswan',
    governorate: 'Aswan',
    coordinates: { lat: 24.0922, lng: 32.8731 },
    openingHours: 'Open daily',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.6, reviews: 38000, isActive: true
  },
  {
    name: 'Lake Nasser',
    category: 'natural',
    description: 'The world\'s largest man-made lake stretching 550 km along the Nile. Home to abundant Nile crocodiles and exceptional fishing. Cruise tours reveal submerged temples and stunning desert scenery.',
    images: ['https://www.cleopatraegypttours.com/wp-content/uploads/2018/08/Lake-Nasser.png'],
    location: 'South of Aswan',
    governorate: 'Aswan',
    coordinates: { lat: 23.0000, lng: 32.9000 },
    openingHours: 'Open 24 hours',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.6, reviews: 26000, isActive: true
  },

  // ===== ALEXANDRIA =====
  {
    name: 'Bibliotheca Alexandrina',
    category: 'cultural',
    description: 'A modern revival of the ancient Library of Alexandria, one of the most important cultural centers of the ancient world. This stunning contemporary building holds millions of books and hosts major international exhibitions.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/5/59/Bibliotiqa_Alexandria_9_edited.jpg'],
    location: 'El Shatby, Alexandria',
    governorate: 'Alexandria',
    coordinates: { lat: 31.2089, lng: 29.9092 },
    openingHours: '10:00 AM - 7:00 PM',
    prices: { egyptian: 50, foreigner: 100 },
    rating: 4.7, reviews: 45000, isActive: true
  },
  {
    name: 'Qaitbay Citadel',
    category: 'historical',
    description: 'A 15th-century defensive fortress built on the site of the Lighthouse of Alexandria, one of the Seven Wonders of the Ancient World. Offers stunning views of the Mediterranean Sea.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/8/81/%D8%A7%D9%84%D9%82%D9%84%D8%B9%D8%A9_%D8%A7%D8%B3%D9%83%D9%86%D8%AF%D8%B1%D9%8A%D8%A9.jpg'],
    location: 'Eastern Harbour, Alexandria',
    governorate: 'Alexandria',
    coordinates: { lat: 31.2139, lng: 29.8853 },
    openingHours: '9:00 AM - 4:00 PM',
    prices: { egyptian: 40, foreigner: 100 },
    rating: 4.6, reviews: 55000, isActive: true
  },
  {
    name: 'Montaza Palace Gardens',
    category: 'cultural',
    description: 'Beautiful Ottoman and Florentine style palace and gardens on the Mediterranean coast. Built by Khedive Abbas II, surrounded by lush gardens, private beaches, and royal pavilions.',
    images: ['https://res.cloudinary.com/ddjuftfy2/image/upload/f_webp,c_fill,q_auto/memphis/large/1647213057_Montazah%20palace.jpg'],
    location: 'Montaza, Alexandria',
    governorate: 'Alexandria',
    coordinates: { lat: 31.2898, lng: 30.0164 },
    openingHours: '8:00 AM - 6:00 PM',
    prices: { egyptian: 20, foreigner: 50 },
    rating: 4.5, reviews: 42000, isActive: true
  },
  {
    name: 'Pompey\'s Pillar',
    category: 'historical',
    description: 'A 30-meter tall Roman triumphal column, the tallest ancient monument in Egypt outside of Luxor and Aswan. Surrounded by ancient sphinx statues and the Serapeum catacombs.',
    images: ['https://www.flyingcarpettours.com/files/large/972435833-Pompeys-Pillar.jpg'],
    location: 'Karmouz, Alexandria',
    governorate: 'Alexandria',
    coordinates: { lat: 31.1965, lng: 29.8995 },
    openingHours: '9:00 AM - 4:00 PM',
    prices: { egyptian: 40, foreigner: 80 },
    rating: 4.3, reviews: 28000, isActive: true
  },
  {
    name: 'Alexandria National Museum',
    category: 'museums',
    description: 'Housed in a beautifully restored Italian-style palace, the museum displays thousands of artifacts spanning different eras of Alexandria\'s rich history from ancient pharaonic times to the modern era.',
    images: ['https://momaa.org/wp-content/uploads/2019/10/1003sa152pqrk4qdcC79D.png'],
    location: 'El Tariq Al Horeyya, Alexandria',
    governorate: 'Alexandria',
    coordinates: { lat: 31.2028, lng: 29.9104 },
    openingHours: '9:00 AM - 4:30 PM',
    prices: { egyptian: 50, foreigner: 100 },
    rating: 4.4, reviews: 18000, isActive: true
  },

  // ===== RED SEA =====
  {
    name: 'Hurghada Beaches',
    category: 'beach',
    description: 'World-famous Red Sea beaches with crystal-clear turquoise water, white sand, and vibrant coral reefs. Perfect for snorkeling, diving, kite surfing, and water sports year-round with stunning marine life.',
    images: ['https://www.egyptsunmarine.com/storage/hurghada-islands.jpg'],
    location: 'Hurghada City, Red Sea',
    governorate: 'Red Sea',
    coordinates: { lat: 27.2579, lng: 33.8116 },
    openingHours: 'Open 24 hours',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.7, reviews: 95000, isActive: true
  },
  {
    name: 'Wadi El Gemal National Park',
    category: 'natural',
    description: 'A pristine protected area on the Red Sea coast with spectacular coral reefs, mangroves, and diverse wildlife. One of Egypt\'s most biodiverse ecosystems, largely untouched by tourism.',
    images: ['https://www.abughosoun.org/wp-content/uploads/2019/03/Wadi_el_Gemal_coast_49.jpg'],
    location: 'Marsa Alam, Red Sea',
    governorate: 'Red Sea',
    coordinates: { lat: 24.7200, lng: 35.1500 },
    openingHours: '7:00 AM - 5:00 PM',
    prices: { egyptian: 30, foreigner: 80 },
    rating: 4.6, reviews: 14000, isActive: true
  },

  // ===== SOUTH SINAI =====
  {
    name: 'Ras Muhammad National Park',
    category: 'natural',
    description: 'Egypt\'s first national park with spectacular coral reefs and marine life at the southern tip of the Sinai Peninsula. Where the Gulf of Suez and Gulf of Aqaba meet — world-class diving and snorkeling.',
    images: ['https://www.emperordivers.com/wp-content/uploads/2024/03/Jackfish-Alley-by-Scott-Johnson-1024x684.jpg'],
    location: 'South Sinai, Sharm el-Sheikh',
    governorate: 'South Sinai',
    coordinates: { lat: 27.7326, lng: 34.2454 },
    openingHours: '8:00 AM - 5:00 PM',
    prices: { egyptian: 50, foreigner: 100 },
    rating: 4.8, reviews: 72000, isActive: true
  },
  {
    name: 'Sharm el-Sheikh Naama Bay',
    category: 'beach',
    description: 'The iconic heart of Sharm el-Sheikh, a stunning bay with world-class diving sites, luxurious resorts, and a vibrant waterfront promenade. Gateway to some of the best coral reefs on Earth.',
    images: ['https://cdn.alida.lv/storage/app/public/media/l/sharm-el-sheikh-naama-bay-hotel-resort-ex-tropitel-naama-bay-0.jpg'],
    location: 'Naama Bay, Sharm el-Sheikh',
    governorate: 'South Sinai',
    coordinates: { lat: 27.9158, lng: 34.3299 },
    openingHours: 'Open 24 hours',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.7, reviews: 88000, isActive: true
  },
  {
    name: 'Mount Sinai',
    category: 'religious',
    description: 'The sacred mountain where Moses received the Ten Commandments according to Abrahamic religions. Pilgrims and adventurers climb at night via the 3,750 Steps of Repentance to witness a spectacular sunrise.',
    images: ['https://ichef.bbci.co.uk/ace/standard/1248/cpsprodpb/0a21/live/b472bdb0-8b92-11f0-b247-1583156794c2.jpg'],
    location: 'Saint Catherine, South Sinai',
    governorate: 'South Sinai',
    coordinates: { lat: 28.5392, lng: 33.9753 },
    openingHours: 'Open 24 hours (climb at night)',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.9, reviews: 65000, isActive: true
  },
  {
    name: 'Saint Catherine\'s Monastery',
    category: 'religious',
    description: 'One of the oldest working Christian monasteries in the world, founded in 565 AD at the foot of Mount Sinai. Contains priceless Byzantine mosaics, ancient manuscripts, and the legendary site of the Burning Bush.',
    images: ['https://cdn.britannica.com/51/126951-050-19056A6C/St-Catherines-Monastery-Mount-Sinai-Egypt.jpg'],
    location: 'Saint Catherine, South Sinai',
    governorate: 'South Sinai',
    coordinates: { lat: 28.5561, lng: 33.9754 },
    openingHours: '9:00 AM - 12:00 PM (Mon-Thu, Sat)',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.8, reviews: 47000, isActive: true
  },
  {
    name: 'Dahab Blue Hole',
    category: 'adventure',
    description: 'One of the most famous dive sites in the world — a submarine sinkhole just off the coast of Dahab. Also popular for snorkeling and freediving. The laid-back Bedouin town of Dahab surrounds it.',
    images: ['https://soulofegypttravel.com/wp-content/uploads/2025/09/dahab-blue-hole-egypt-1.jpg'],
    location: 'Blue Hole Road, Dahab',
    governorate: 'South Sinai',
    coordinates: { lat: 28.5697, lng: 34.5390 },
    openingHours: 'Open 24 hours',
    prices: { egyptian: 30, foreigner: 60 },
    rating: 4.8, reviews: 41000, isActive: true
  },
  {
    name: 'Colored Canyon Sinai',
    category: 'natural',
    description: 'A breathtaking natural geological formation with multi-colored sandstone walls creating a narrow winding gorge. Layers of pink, red, yellow, and purple sandstone look like a painting splashed by nature.',
    images: ['https://www.tripsinegypt.com/wp-content/uploads/2023/03/colored-canyon-in-egypt-trips-in-egypt.jpg'],
    location: 'Nuweiba Road, South Sinai',
    governorate: 'South Sinai',
    coordinates: { lat: 29.1069, lng: 34.5000 },
    openingHours: '7:00 AM - 5:00 PM',
    prices: { egyptian: 40, foreigner: 80 },
    rating: 4.7, reviews: 29000, isActive: true
  },

  // ===== MATRUH =====
  {
    name: 'Marsa Matruh Beaches',
    category: 'beach',
    description: 'Crystal-clear turquoise lagoons and white sandy beaches on the Mediterranean coast. Cleopatra Beach has a stunning natural rock arch. Among the most beautiful and clean beaches in the entire Mediterranean.',
    images: ['https://sharmstation.it/wp-content/uploads/2022/01/ageeba-4748877_640.jpg'],
    location: 'Marsa Matruh City, Matruh',
    governorate: 'Matruh',
    coordinates: { lat: 31.3543, lng: 27.2373 },
    openingHours: 'Open 24 hours',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.6, reviews: 48000, isActive: true
  },
  {
    name: 'Siwa Oasis',
    category: 'natural',
    description: 'A remote magical oasis near the Libyan border famous for the Oracle Temple of Amun where Alexander the Great was proclaimed son of God in 331 BC. Known for salt lakes, hot springs, and ancient ruins.',
    images: ['https://herasianadventures.com/wp-content/uploads/2025/06/best-things-to-do-in-Siwa-Oasis-egypt-4.jpg'],
    location: 'Siwa, Matruh',
    governorate: 'Matruh',
    coordinates: { lat: 29.2030, lng: 25.5178 },
    openingHours: 'Open daily',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.8, reviews: 35000, isActive: true
  },
  {
    name: 'Temple of the Oracle Siwa',
    category: 'historical',
    description: 'The ancient Temple of Amun at Aghurmi in Siwa Oasis, where Alexander the Great consulted the famous oracle in 331 BC. The hilltop ruins offer panoramic views of the entire oasis.',
    images: ['https://www.westerndeserttours.com/wp-content/uploads/Temple-of-the-Oracle-in-Siwa-Oasis-Sights-in-and-around-Siwa-Oasis.jpg'],
    location: 'Aghurmi Village, Siwa',
    governorate: 'Matruh',
    coordinates: { lat: 29.2084, lng: 25.5282 },
    openingHours: '8:00 AM - 5:00 PM',
    prices: { egyptian: 30, foreigner: 60 },
    rating: 4.5, reviews: 18000, isActive: true
  },

  // ===== FAYOUM =====
  {
    name: 'Wadi El Hitan Whale Valley',
    category: 'natural',
    description: 'A UNESCO World Heritage Site containing hundreds of fossils of prehistoric whales from 40 million years ago. This remarkable desert valley documents the evolution of whales from land mammals to sea creatures.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/4/4a/Dorudon_atrox_fossil_at_Wadi_El-Hitan%2C_Egypt%2C_March_2008.jpg'],
    location: 'Faiyum Desert, Fayoum',
    governorate: 'Fayoum',
    coordinates: { lat: 29.2731, lng: 30.0260 },
    openingHours: '8:00 AM - 4:00 PM',
    prices: { egyptian: 40, foreigner: 100 },
    rating: 4.7, reviews: 25000, isActive: true
  },
  {
    name: 'Lake Qarun Fayoum',
    category: 'natural',
    description: 'One of Egypt\'s oldest lakes and a natural landmark of the Fayoum Oasis. A saltwater lake with diverse birdlife, ancient temples on its shores, and beautiful sunrise and sunset views.',
    images: ['https://res.cloudinary.com/ddjuftfy2/image/upload/f_webp,c_fill,q_auto/memphis/large/1096270045_qarun-lake-cover%20(1).jpg'],
    location: 'Fayoum Oasis, Fayoum',
    governorate: 'Fayoum',
    coordinates: { lat: 29.4760, lng: 30.5310 },
    openingHours: 'Open 24 hours',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.4, reviews: 22000, isActive: true
  },

  // ===== NEW VALLEY =====
  {
    name: 'White Desert National Park',
    category: 'natural',
    description: 'A surreal landscape of chalk-white rock formations shaped by wind into mushrooms and bizarre shapes. Camping under a sky full of stars in this alien landscape is one of Egypt\'s most unforgettable experiences.',
    images: ['https://national-parks.org/wp-content/uploads/2024/02/White-Desert-National-Park.jpg'],
    location: 'Farafra Oasis, New Valley',
    governorate: 'New Valley',
    coordinates: { lat: 27.2927, lng: 28.2700 },
    openingHours: 'Open 24 hours',
    prices: { egyptian: 30, foreigner: 60 },
    rating: 4.9, reviews: 38000, isActive: true
  },
  {
    name: 'Crystal Mountain',
    category: 'natural',
    description: 'A natural arch of quartz crystals rising from the desert floor, glittering spectacularly in the sunlight. This unique geological wonder in the Egyptian desert is called the world\'s greatest jewel.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/8/8d/Crystal-rock-hole.jpg'],
    location: 'Between Bahariya and Farafra',
    governorate: 'New Valley',
    coordinates: { lat: 27.6482, lng: 28.7014 },
    openingHours: 'Open 24 hours',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.5, reviews: 15000, isActive: true
  },

  // ===== ISMAILIA =====
  {
    name: 'Suez Canal Ismailia',
    category: 'cultural',
    description: 'One of the most important waterways in the world, connecting the Mediterranean Sea to the Red Sea. Opened in 1869, the canal revolutionized global trade. Spectacular to watch giant ships silently passing by.',
    images: ['https://cdn.britannica.com/90/5390-050-D179CC90/Cargo-ship-Suez-Canal-Egypt-Ismailia.jpg'],
    location: 'Ismailia, Suez Canal Zone',
    governorate: 'Ismailia',
    coordinates: { lat: 30.5965, lng: 32.2715 },
    openingHours: 'Open 24 hours',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.6, reviews: 58000, isActive: true
  },
  {
    name: 'Ismailia Museum',
    category: 'museums',
    description: 'A historic museum displaying ancient artifacts from the Suez Canal region, including pharaonic statues, Greco-Roman pieces, and artifacts from ancient Ismailia. The 1932 building is a landmark itself.',
    images: ['https://english.ahram.org.eg/Media/News/2017/3/4/2017-636241919969244172-924.png'],
    location: 'Mohamed Ali Quay, Ismailia',
    governorate: 'Ismailia',
    coordinates: { lat: 30.5872, lng: 32.2651 },
    openingHours: '9:00 AM - 4:00 PM',
    prices: { egyptian: 20, foreigner: 60 },
    rating: 4.2, reviews: 8000, isActive: true
  },

  // ===== MINYA =====
  {
    name: 'Tell el-Amarna',
    category: 'historical',
    description: 'The ancient city built by Pharaoh Akhenaten as his revolutionary new capital, home to the earliest known monotheistic religion. Ruins include royal tombs with unique Amarna-style art.',
    images: ['https://www.egypttoursportal.com/images/2023/11/Tell-El-Amarna-Egypt-Tours-Portal.jpg'],
    location: 'Mallawi, Minya',
    governorate: 'Minya',
    coordinates: { lat: 27.6451, lng: 30.8967 },
    openingHours: '7:00 AM - 4:00 PM',
    prices: { egyptian: 40, foreigner: 100 },
    rating: 4.5, reviews: 16000, isActive: true
  },
  {
    name: 'Beni Hassan Tombs',
    category: 'historical',
    description: 'A group of Middle Kingdom rock-cut tombs on the east bank of the Nile near Minya, dating from around 2000 BC. Features remarkably preserved wall paintings showing daily life, sports, and wrestling scenes.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/0/09/Beni_Hassan_tomb_15_wrestling_detail.jpg'],
    location: 'Abu Qurqas, Minya',
    governorate: 'Minya',
    coordinates: { lat: 27.9267, lng: 30.8835 },
    openingHours: '8:00 AM - 4:00 PM',
    prices: { egyptian: 40, foreigner: 100 },
    rating: 4.4, reviews: 12000, isActive: true
  },

  // ===== PORT SAID =====
  {
    name: 'Port Said Lighthouse',
    category: 'historical',
    description: 'A historic lighthouse at the northern entrance of the Suez Canal, one of Egypt\'s most recognizable landmarks. Built in 1869 for the opening of the Suez Canal and still operational today.',
    images: ['https://upload.wikimedia.org/wikipedia/commons/7/72/Egypt-IMG_0960.jpg'],
    location: 'Port Said Harbor, Port Said',
    governorate: 'Port Said',
    coordinates: { lat: 31.2553, lng: 32.3006 },
    openingHours: 'Open 24 hours (exterior)',
    prices: { egyptian: 0, foreigner: 0 },
    rating: 4.3, reviews: 18000, isActive: true
  }
];

async function seed() {
  try {
    await mongoose.connect(DB_URI);
    console.log('✅ Connected to MongoDB');

    const deleted = await Attraction.deleteMany({});
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing attractions`);

    const inserted = await Attraction.insertMany(attractions);
    console.log(`✅ Inserted ${inserted.length} Egyptian attractions!`);

    const categories = {};
    attractions.forEach(a => { categories[a.category] = (categories[a.category] || 0) + 1; });
    console.log('\n📊 Breakdown by category:');
    Object.entries(categories).forEach(([cat, count]) => console.log(`   ${cat}: ${count} places`));

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();           












