import fetch from "node-fetch";
export const getCoordinates = async (address, province) => {
  try {
    const fullAddress = `${address}, ${province}, South Africa`;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    console.log(
      "API KEY:",
      process.env.GOOGLE_MAPS_API_KEY ? " Found" : " MISSING",
    );
    console.log("Address received:", address, "| Province:", province);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    // If Google finds the exact spot, return math coordinates
    if (data.status === "OK" && data.results.length > 0) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
      };
    }
    console.warn(`Geocoding failed [${data.status}] for:`, fullAddress);
    return { lat: null, lng: null };
  } catch (error) {
    console.error("Google Geocoding Error:", error);
    return { lat: null, lng: null };
  }
};
