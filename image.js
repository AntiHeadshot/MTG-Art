import ImageCache from './imageCache.js';

let promisseCache = {};

async function getDataUrl(src) {
    let image = new Image(src);
    if (promisseCache[src] == null)
        return promisseCache[src] = image.getDataUrl();
    console.log("Image already loaded: " + src);
    return promisseCache[src];
}

class Image {
    constructor(src) {
        this.src = src;
    }

    loadImage() {
        return new Promise((resolve, reject) => {
            const img = document.createElement('img');
            img.crossOrigin = "Anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = this.src;
        });
    }

    async getDataUrl() {
        this.dataUrl = await ImageCache.getImage(this.src);
        if (this.dataUrl == null) {
            let imageElem = await this.loadImage();
            this.canvas = document.createElement('canvas');
            this.canvas.width = imageElem.width;
            this.canvas.height = imageElem.height;
            this.context = this.canvas.getContext("2d");
            this.context.drawImage(imageElem, 0, 0);

            this.cornerSize = this.canvas.width / 21;
            this.removeBackground();
            this.dataUrl = this.canvas.toDataURL("image/png");
            await ImageCache.storeImage(this.src, this.dataUrl);
        }

        return this.dataUrl;
    }

    removeBackground() {
        var canvasWidth = this.canvas.width;
        var canvasHeight = this.canvas.height;

        var canvasData = this.context.getImageData(0, 0, canvasWidth, canvasHeight);

        let r2 = this.cornerSize * this.cornerSize + 2;

        let size = canvasWidth * canvasHeight * 4;

        let avgSize = Math.floor(this.cornerSize / 3);

        let avgColorTl = this.getAvgColor(canvasData, this.cornerSize - 2 * avgSize, this.cornerSize - 2 * avgSize, avgSize);
        let avgColorTr = this.getAvgColor(canvasData, canvasWidth - this.cornerSize + avgSize, this.cornerSize - 2 * avgSize, avgSize);
        let avgColorBl = this.getAvgColor(canvasData, this.cornerSize - 2 * avgSize, canvasHeight - this.cornerSize + avgSize, avgSize);
        let avgColorBr = this.getAvgColor(canvasData, canvasWidth - this.cornerSize + avgSize, canvasHeight - this.cornerSize + avgSize, avgSize);

        for (let y = 0, yi = this.cornerSize; y < this.cornerSize; y++, yi--) {
            for (let x = 0, xi = this.cornerSize; x < this.cornerSize && (xi * xi + yi * yi) >= r2; x++, xi--) {
                let topLeft = (x + y * canvasWidth) * 4;
                let topRight = (canvasWidth - x + y * canvasWidth) * 4;

                this.colorPixel(topLeft, canvasData, avgColorTl);
                this.colorPixel(topRight, canvasData, avgColorTr);
                this.colorPixel((size - topRight), canvasData, avgColorBl);
                this.colorPixel((size - topLeft), canvasData, avgColorBr);
            }
        }

        this.context.putImageData(canvasData, 0, 0);
    }

    getAvgColor(canvasData, x, y, avgSize) {
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;

        let yOffset = (y * canvasData.width + x) * 4;
        let width4 = canvasData.width * 4

        for (let i = 0; i <= avgSize; i++, yOffset += width4) {
            for (let j = 0, pixelPos = yOffset; j <= avgSize; j++, pixelPos += 4) {
                r += canvasData.data[pixelPos];
                g += canvasData.data[pixelPos + 1];
                b += canvasData.data[pixelPos + 2];
                a += canvasData.data[pixelPos + 3];
                count++;
            }
        }

        return [Math.floor(r / count), Math.floor(g / count), Math.floor(b / count), Math.floor(a / count)];
    }

    colorPixel(pixelPos, canvasData, color) {
        canvasData.data[pixelPos] = color[0];
        canvasData.data[pixelPos + 1] = color[1];
        canvasData.data[pixelPos + 2] = color[2];
        canvasData.data[pixelPos + 3] = color[3];
    }
}

export default getDataUrl;