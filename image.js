class Image {
    constructor(image) {
        var canvas = document.createElement('canvas');
        image.crossOrigin = "Anonymous";
        canvas.width = image.width;
        canvas.height = image.height;
        this.canvas = canvas;
        let context = this.context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);

        let dpi = (this.canvas.width / (63.5 / 25.4));
        console.log(dpi);

        this.cornerSize = this.canvas.width / 21;
    }

    getDataUrl() {
        return this.canvas.toDataURL("image/png");
    }

    removeBackground() {
        var canvasWidth = this.canvas.width;
        var canvasHeight = this.canvas.height;

        var canvasData = this.context.getImageData(0, 0, canvasWidth, canvasHeight);

        let r2 = this.cornerSize * this.cornerSize + 2;

        let size = canvasWidth * canvasHeight * 4;

        let avgSize = Math.floor(this.cornerSize / 3);

        let avgColorTl = this.getAvgColor(canvasData, this.cornerSize - avgSize, this.cornerSize - avgSize, avgSize);
        let avgColorTr = this.getAvgColor(canvasData, canvasWidth - this.cornerSize + avgSize, this.cornerSize - avgSize, avgSize);
        let avgColorBl = this.getAvgColor(canvasData, this.cornerSize - avgSize, canvasHeight - this.cornerSize + avgSize, avgSize);
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
        canvasData.data
    }

    colorPixel(pixelPos, canvasData, color) {
        canvasData.data[pixelPos] = color[0];
        canvasData.data[pixelPos + 1] = color[1];
        canvasData.data[pixelPos + 2] = color[2];
        canvasData.data[pixelPos + 3] = color[3];
    }
}

export default Image;