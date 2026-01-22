async function searchCity(content) {
  const API_KEY = process.env.NG_APP_GEOCODING_API_KEY;
  const geocodingUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(content)}&apiKey=${API_KEY}`;
  return fetch(geocodingUrl).then(response => response.json())
    .then(result => {
      let results = [];
      Object.values(result['features']).forEach((value) => {
        var obj = (value)['properties'];
        results.push({
          'city': obj['city'],
          'state': obj['state'],
          'country': obj['country'],
          'lon': obj['lon'],
          'lat': obj['lat']
          });
      });
      return results
    })
  .catch(error => console.log('error', error));
}

module.exports = { searchCity };