// =================== UPDATE ATTRACTION IMAGES ===================
// Run: node seeds/updateImages.js
require('dotenv').config();
const mongoose = require('mongoose');
const Attraction = require('../models/Attraction');

const DB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/travelnow';

const imageMap = {
  'The Great Pyramid of Giza': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kheops-Pyramid.jpg/1280px-Kheops-Pyramid.jpg',
  'Sphinx of Giza': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/The_Sphinx%2C_Giza%2C_Egypt.jpg/1200px-The_Sphinx%2C_Giza%2C_Egypt.jpg',
  'Grand Egyptian Museum': 'https://i0.wp.com/egypt-museum.com/wp-content/uploads/2025/11/gem-museum-1.jpg?ssl=1',
  'Saqqara Necropolis': 'https://egyptplanners.com/wp-content/uploads/2020/06/a-wonderful-view-of-the-step-pyramid-of-djoser-in-the-necropolis-of-saqqara.jpg',
  'Bent Pyramid of Dahshur': 'https://egymonuments.gov.eg//media/7226/g75a3113.jpg?anchor=center&mode=crop&width=1200&height=630&rnd=134192586690000000',
  'Memphis Open-Air Museum': 'https://airial.travel/_next/image?url=https%3A%2F%2Fmedia-cdn.tripadvisor.com%2Fmedia%2Fphoto-w%2F09%2F14%2F61%2F8c%2Fmemphis-museum.jpg&w=2048&q=75',
  'Black Desert Bahariya': 'https://d3rr2gvhjw0wwy.cloudfront.net/uploads/mandators/56119/cms/561582/940x500-1-50-1ddff8838c83329995d930bbc38736f4.jpg',

  'Egyptian Museum Cairo': 'https://www.pyramidsdaytour.com/wp-content/uploads/2023/01/egyptianmuseum-1.jpg',
  'Khan el-Khalili Bazaar': 'https://upload.wikimedia.org/wikipedia/commons/d/dc/The_Khan_el-Khalili_market_in_Cairo%2C_Egypt_%282743501345%29.jpg',
  'Al-Azhar Mosque': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ26_hJS75_HmIX50-TJZ-p5fkIQzfLcFw1Vw&s',
  'Citadel of Saladin': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Flickr_-_HuTect_ShOts_-_Citadel_of_Salah_El.Din_and_Masjid_Muhammad_Ali_%D9%82%D9%84%D8%B9%D8%A9_%D8%B5%D9%84%D8%A7%D8%AD_%D8%A7%D9%84%D8%AF%D9%8A%D9%86_%D8%A7%D9%84%D8%A3%D9%8A%D9%88%D8%A8%D9%8A_%D9%88%D9%85%D8%B3%D8%AC%D8%AF_%D9%85%D8%AD%D9%87%D8%AF_%D8%B9%D9%84%D9%8A_-_Cairo_-_Egypt_-_17_04_2010_%284%29.jpg',
  'Coptic Cairo': 'https://images.squarespace-cdn.com/content/v1/5f4ef170d347c007483edd76/9f7cac20-da8c-42a0-8b48-0fcf637c1913/Cairo-3953.jpg',
  'Sultan Hassan Mosque-Madrasa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Flickr_-_archer10_%28Dennis%29_-_Egypt-13A-061_%28cropped%29.jpg/1280px-Flickr_-_archer10_%28Dennis%29_-_Egypt-13A-061_%28cropped%29.jpg',
  'Ibn Tulun Mosque': 'https://res.cloudinary.com/ddjuftfy2/image/upload/f_webp,c_fill,q_auto/memphis/large/956210572_ibn-tulun-mosque.jpg',

  'Karnak Temple Complex': 'https://d3rr2gvhjw0wwy.cloudfront.net/uploads/mandators/49581/file-manager/karnak-temple.jpg',
  'Luxor Temple': 'https://www.pyramidsdaytour.com/wp-content/uploads/2025/07/Egypt-Luxor-Temple1-SH.jpg',
  'Valley of the Kings': 'https://cdn.britannica.com/59/25059-050-5E36B57C/tomb-Tutankhamun-Valley-of-the-Kings-Thebes.jpg',
  'Temple of Hatshepsut': 'https://www.egypttoursportal.com/images/2018/09/Queen-Hatshepsut-Temple-Egypt-Tours-Portal-1.jpg',
  'Colossi of Memnon': 'https://www.egypttoursportal.com/images/2025/06/Memnon-Egypt-Tours-Portal.jpg',
  'Luxor Museum': 'https://d3rr2gvhjw0wwy.cloudfront.net/uploads/mandators/49581/file-manager/the-luxor-museum-of-ancient-egyptian-art.jpg',
  'Abydos Temple of Seti I': 'https://upload.wikimedia.org/wikipedia/commons/3/33/AbydosFacade.jpg',

  'Abu Simbel Temples': 'https://www.swedishnomad.com/wp-content/images/2019/09/Abu-Simbel.jpg',
  'Philae Temple': 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Philae_Temple_R05.jpg',
  'Aswan High Dam': 'https://res.cloudinary.com/ddjuftfy2/image/upload/f_webp,c_fill,q_auto/memphis/large/1571362135_High%20Dam.jpg',
  'Nubian Village Aswan': 'https://media-cdn.tripadvisor.com/media/attractions-splice-spp-674x446/12/1b/61/53.jpg',
  'Lake Nasser': 'https://www.cleopatraegypttours.com/wp-content/uploads/2018/08/Lake-Nasser.png',

  'Bibliotheca Alexandrina': 'https://upload.wikimedia.org/wikipedia/commons/5/59/Bibliotiqa_Alexandria_9_edited.jpg',
  'Qaitbay Citadel': 'https://upload.wikimedia.org/wikipedia/commons/8/81/%D8%A7%D9%84%D9%82%D9%84%D8%B9%D8%A9_%D8%A7%D8%B3%D9%83%D9%86%D8%AF%D8%B1%D9%8A%D8%A9.jpg',
  'Montaza Palace Gardens': 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Lighthouse_beside_the_Montaza_garden_in_Alexandria.jpg',
  'Pompey\'s Pillar': 'https://www.flyingcarpettours.com/files/large/972435833-Pompeys-Pillar.jpg',
  'Alexandria National Museum': 'https://momaa.org/wp-content/uploads/2019/10/1003sa152pqrk4qdcC79D.png',

  'Hurghada Beaches': 'https://www.egyptsunmarine.com/storage/hurghada-islands.jpg',
  'Wadi El Gemal National Park': 'https://www.abughosoun.org/wp-content/uploads/2019/03/Wadi_el_Gemal_coast_49.jpg',

  'Ras Muhammad National Park': 'https://www.emperordivers.com/wp-content/uploads/2024/03/Jackfish-Alley-by-Scott-Johnson-1024x684.jpg',
  'Sharm el-Sheikh Naama Bay': 'https://cdn.alida.lv/storage/app/public/media/l/sharm-el-sheikh-naama-bay-hotel-resort-ex-tropitel-naama-bay-0.jpg',
  'Mount Sinai': 'https://ichef.bbci.co.uk/ace/standard/1248/cpsprodpb/0a21/live/b472bdb0-8b92-11f0-b247-1583156794c2.jpg',
  'Saint Catherine\'s Monastery': 'https://cdn.britannica.com/51/126951-050-19056A6C/St-Catherines-Monastery-Mount-Sinai-Egypt.jpg',
  'Dahab Blue Hole': 'https://soulofegypttravel.com/wp-content/uploads/2025/09/dahab-blue-hole-egypt-1.jpg',
  'Colored Canyon Sinai': 'https://www.tripsinegypt.com/wp-content/uploads/2023/03/colored-canyon-in-egypt-trips-in-egypt.jpg',

  'Marsa Matruh Beaches': 'https://sharmstation.it/wp-content/uploads/2022/01/ageeba-4748877_640.jpg',
  'Siwa Oasis': 'https://herasianadventures.com/wp-content/uploads/2025/06/best-things-to-do-in-Siwa-Oasis-egypt-4.jpg',
  'Temple of the Oracle Siwa': 'https://www.westerndeserttours.com/wp-content/uploads/Temple-of-the-Oracle-in-Siwa-Oasis-Sights-in-and-around-Siwa-Oasis.jpg',

  'Wadi El Hitan Whale Valley': 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Dorudon_atrox_fossil_at_Wadi_El-Hitan%2C_Egypt%2C_March_2008.jpg',
  'Lake Qarun Fayoum': 'https://res.cloudinary.com/ddjuftfy2/image/upload/f_webp,c_fill,q_auto/memphis/large/1096270045_qarun-lake-cover%20(1).jpg',

  'White Desert National Park': 'https://national-parks.org/wp-content/uploads/2024/02/White-Desert-National-Park.jpg',
  'Crystal Mountain': 'https://upload.wikimedia.org/wikipedia/commons/8/8d/Crystal-rock-hole.jpg',

  'Suez Canal Ismailia': 'https://cdn.britannica.com/90/5390-050-D179CC90/Cargo-ship-Suez-Canal-Egypt-Ismailia.jpg',
  'Ismailia Museum': 'https://english.ahram.org.eg/Media/News/2017/3/4/2017-636241919969244172-924.png',
  'Tell el-Amarna': 'https://www.egypttoursportal.com/images/2023/11/Tell-El-Amarna-Egypt-Tours-Portal.jpg',
  'Beni Hassan Tombs': 'https://upload.wikimedia.org/wikipedia/commons/0/09/Beni_Hassan_tomb_15_wrestling_detail.jpg',

  'Port Said Lighthouse': 'https://upload.wikimedia.org/wikipedia/commons/7/72/Egypt-IMG_0960.jpg'
};

const categoryFallback = {
  historical: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Kheops-Pyramid.jpg/1280px-Kheops-Pyramid.jpg',
  museums: 'https://images.unsplash.com/photo-1554889576-73e0d16a7aca?w=800&q=80',
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  natural: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80',
  adventure: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80',
  cultural: 'https://images.unsplash.com/photo-1572977730668-ef6dfc0af3a3?w=800&q=80',
  religious: 'https://images.unsplash.com/photo-1569396116180-210c182bedb8?w=800&q=80'
};

async function findCommonsImage(name) {
  const query = `${name} Egypt`;
  const endpoint = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo&iiprop=url&format=json&origin=*`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) return null;
    const data = await response.json();
    const page = Object.values(data.query?.pages || {})[0];
    return page?.imageinfo?.[0]?.url || null;
  } catch (_) {
    return null;
  }
}

mongoose.connect(DB_URI).then(async () => {
  console.log('✅ Connected to MongoDB');
  const attractions = await Attraction.find({});
  console.log(`📸 Updating images for ${attractions.length} attractions...`);

  let updated = 0;
  for (const att of attractions) {
    const img = await findCommonsImage(att.name) || imageMap[att.name] || att.images?.[0];
    if (!img) {
      console.log(`  ! No image found for ${att.name}`);
      continue;
    }
    await Attraction.findByIdAndUpdate(att._id, { images: [img] });
    console.log(`  ✓ ${att.name}`);
    updated++;
  }

  console.log(`\n✅ Updated ${updated} attractions with real images!`);
  mongoose.disconnect();
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
