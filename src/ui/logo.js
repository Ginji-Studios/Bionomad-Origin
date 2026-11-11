// logotipo biodom+ in pixel art (bianco su trasparente: si colora con setTint)
const LOGOS = {
  // versione grande per i titoli: lettere alte quanto le maiuscole del titolo (25 px)
  logo_biodom_l: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH4AAAAcCAYAAACnHwvZAAAB9klEQVR4Xu2Z23LDIAxESyb//8vukBkymAp2l5upzXlrI2RJK2FC3M/mlhzHcYTEnHMuTfJ1y6w3kDfqjLsS8ram4QkMmXhf1MDqRYwb/0kMEX6zPu/1Q9wg0K5lfT5E+Ke+N/8Te6t/KEMmfjMXa4dF39b2xD+U08SXDgnKext1Ww6/TnkOQ+yzlB/LiBivgN7qa8VEpGKkf6uNYInbIjjjT4mxZrhq1iBo4WN63HqxYrATxvpTYH0yMTK+0rqya5TGCzjGeYmag0XNM0vJ1fiLQTmw5GJsjY9BFf808cxia2tm1gWsIjCFZ6bq283Gr1EpJTGuiBE1R5pTqw7yqZ4paunwln6W8+f/j5L1tJ4JUENYccQNhmK04rNyLtVVtWeQhfegZFlKyTLT21v00aB8VYFbdKgS3hJfBRVB2TVGwcbI2q1EtfCr0aP46D3L0ssPQ23e04SfWYwNZprwG53aaWaYJvzIJDY6J+GV7Vix7UmugZR4cra9mrOXn5G8rgqSFWrEPXVMKf8eMa7Kn63eJ4sSrv3+rH7vRHGkMPbIpjXGqwZJ5SO8FaxVIKspWhPNNRp7bWoJ1Tv2XLOgJlqZ7129L6B1/9s7eOs5HlREdKWpxt7bX26AVuW01SvT+7lwJn4MsVDXMfaMTYCxZWzYs8KK/AI1cZxE4vLgrwAAAABJRU5ErkJggg==",
  // ricavato dal logotipo ufficiale, ridotto a 20 px d'altezza senza sfumature:
  // si usa a scala 1 nelle barre e a scala intera (2, 3) per i titoli
  logo_biodom: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFwAAAAUCAYAAAAA5FpZAAABVUlEQVR4Xu2W6w7CIAxGndn7v7KGKQuSXg4UpjGcnxul7dcWuN0WU3i8qTe/T/G2UNlTIdLfbdu2Vp2yba99L9/yO4LV4RezR/ylqUjd1jMd/0Y5dSX193CHL7FfUB1CHb74pBRduxtPwaWRIFVbR0obZod7r4H8XxNdKiIZP82OYNl6DUTiJWssjkuPJCIJpRWE7ikJQG0z0hh71H5bfWp4BU2cHW4t9jrZupWt5OrJqBPXYpIE8mypqKSAWk7keEWvFBKEhCQY6QJy7Fhd5vktxdemVIvB29sDCd4jgCWsd5TQomR6upcyOhYsOIEmbh1BV+EdQbMYKvjC5xS8pztrWscvSsRfxDYC7vARBZHIiUcEoLazcmjhTl4g1k2uYSVn/UvMsv0Fjnd4Er18a0cCa9mr7szRtuV+JXQiZnAeKSQIsiYX0AtW24v4oLbSpJD9Z/IEPEkIY8kHmTcAAAAASUVORK5CYII="
};

export function loadLogos(scene) {
  const entries = Object.entries(LOGOS).filter(([key]) => !scene.textures.exists(key));
  return Promise.all(
    entries.map(
      ([key, data]) =>
        new Promise((resolve) => {
          const done = (added) => {
            if (added === key) {
              scene.textures.off("addtexture", done);
              resolve();
            }
          };
          scene.textures.on("addtexture", done);
          scene.textures.addBase64(key, data);
        })
    )
  );
}
