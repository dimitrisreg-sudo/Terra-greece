export async function getElevation({ lat, lng }, signal) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(5)}&longitude=${lng.toFixed(5)}`,
    { signal }
  );
  if (!response.ok) throw new Error('Open-Meteo ' + response.status);
  const data = await response.json();
  return data.elevation?.[0];
}
