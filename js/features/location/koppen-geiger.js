const RASTER = new URL('../../../data/koppen-geiger-1991-2020.png', import.meta.url);
const WIDTH = 1380;
const HEIGHT = 1080;
const WEST = 18.5;
const NORTH = 42.5;
const CELLS_PER_DEGREE = 120;
const classes = [
  null, 'Af', 'Am', 'Aw', 'BWh', 'BWk', 'BSh', 'BSk', 'Csa', 'Csb', 'Csc',
  'Cwa', 'Cwb', 'Cwc', 'Cfa', 'Cfb', 'Cfc', 'Dsa', 'Dsb', 'Dsc', 'Dsd',
  'Dwa', 'Dwb', 'Dwc', 'Dwd', 'Dfa', 'Dfb', 'Dfc', 'Dfd', 'ET', 'EF',
];
let rasterContext;

function loadRaster() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        if (image.naturalWidth !== WIDTH || image.naturalHeight !== HEIGHT) throw new Error('Unexpected Köppen–Geiger raster');
        const canvas = document.createElement('canvas');
        canvas.width = WIDTH;
        canvas.height = HEIGHT;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        resolve(context);
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => reject(new Error('Köppen–Geiger raster unavailable'));
    image.src = RASTER.href;
  });
}

export async function getClimateClass({ lat, lng }) {
  const x = Math.floor((lng - WEST) * CELLS_PER_DEGREE);
  const y = Math.floor((NORTH - lat) * CELLS_PER_DEGREE);
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return null;
  rasterContext ??= loadRaster().catch(error => {
    rasterContext = undefined;
    throw error;
  });
  const context = await rasterContext;
  const code = context.getImageData(x, y, 1, 1).data[0];
  return classes[code] ?? null;
}
