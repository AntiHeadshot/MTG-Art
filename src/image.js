import ImageCache from './imageCache.js';

let promisseCache = {};

async function getDataUrl(src) {
    if (promisseCache[src] == null) {
        return promisseCache[src] = new Image(src).getDataUrl(null, Image.removeBackground);
    }
    return promisseCache[src];
}

async function editImageBrightness(src, brightness) {
    return new Image(src, { nocache: true }).getDataUrl(Image.setBrightness, null, brightness);
}

class Image {
    constructor(src, params) {
        this.src = src;
        this.cache = !(params?.nocache === true);
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

    async getDataUrl(funcPre, funcPost, params) {
        this.dataUrl = null;
        if (this.cache)
            this.dataUrl = await ImageCache.getImage(this.src);

        if (this.dataUrl == null) {
            let imageElem = await this.loadImage();
            this.canvas = document.createElement('canvas');
            this.canvas.width = imageElem.width;
            this.canvas.height = imageElem.height;
            this.context = this.canvas.getContext("2d");

            if (funcPre)
                funcPre(this, params);
            this.context.drawImage(imageElem, 0, 0);
            if (funcPost)
                funcPost(this, params);

            this.dataUrl = this.canvas.toDataURL("image/png");

            if (this.cache)
                await ImageCache.storeImage(this.src, this.dataUrl);

            this.canvas = null;
            this.context = null;
        }

        return this.dataUrl;
    }

    static setBrightness(image, value) {
        image.context.filter = `brightness(${value}%)`;
    }

    static removeBackground(image, value) {
        var canvasWidth = image.canvas.width;
        var cornerSize = canvasWidth / 21;
        var canvasHeight = image.canvas.height;

        var canvasData = image.context.getImageData(0, 0, canvasWidth, canvasHeight);

        let r2 = cornerSize * cornerSize + 2;

        let size = canvasWidth * canvasHeight * 4;

        let avgSize = Math.floor(cornerSize / 3);

        let avgColorTl = image.getAvgColor(canvasData, cornerSize - 2 * avgSize, cornerSize - 2 * avgSize, avgSize);
        let avgColorTr = image.getAvgColor(canvasData, canvasWidth - cornerSize + avgSize, cornerSize - 2 * avgSize, avgSize);
        let avgColorBl = image.getAvgColor(canvasData, cornerSize - 2 * avgSize, canvasHeight - cornerSize + avgSize, avgSize);
        let avgColorBr = image.getAvgColor(canvasData, canvasWidth - cornerSize + avgSize, canvasHeight - cornerSize + avgSize, avgSize);

        for (let y = 0, yi = cornerSize; y < cornerSize; y++, yi--) {
            for (let x = 0, xi = cornerSize; x < cornerSize && (xi * xi + yi * yi) >= r2; x++, xi--) {
                let topLeft = (x + y * canvasWidth) * 4;
                let topRight = (canvasWidth - x + y * canvasWidth) * 4;

                image.colorPixel(topLeft, canvasData, avgColorTl);
                image.colorPixel(topRight, canvasData, avgColorTr);
                image.colorPixel((size - topRight), canvasData, avgColorBl);
                image.colorPixel((size - topLeft), canvasData, avgColorBr);
            }
        }

        image.context.putImageData(canvasData, 0, 0);
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

export { getDataUrl, editImageBrightness };