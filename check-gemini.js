
const API_KEY = 'AIzaSyCwqD_4CIyZefWas_PDvLRYFmPVVh8H1Ps';

async function checkModels() {
    const versions = ['v1', 'v1beta'];
    for (const v of versions) {
        console.log(`\n--- Checking ${v} ---`);
        try {
            const resp = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${API_KEY}`);
            const data = await resp.json();
            if (data.models) {
                console.log(`Found ${data.models.length} models`);
                const flash = data.models.find(m => m.name.includes('flash'));
                if (flash) {
                    console.log(`Found flash model: ${flash.name}`);
                } else {
                    console.log('No flash model found in list');
                    // Print first 5 models
                    console.log('Sample models:', data.models.slice(0, 5).map(m => m.name));
                }
            } else {
                console.log(`Error in ${v}:`, JSON.stringify(data));
            }
        } catch (e) {
            console.log(`Fetch error in ${v}:`, e.message);
        }
    }
}

checkModels();
