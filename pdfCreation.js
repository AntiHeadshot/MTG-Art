import * as _ from 'https://cdn.jsdelivr.net/npm/pdfkit@0.16.0/js/pdfkit.standalone.js';
import * as _1 from 'https://cdn.jsdelivr.net/npm/blob-stream-browserify@0.1.3/index.js';
import Image from '/image.js';

let lastUrl;

let CropMark = Object.freeze({
    LINES: 'lines',
    STAR: 'star',
    NONE: 'none',
});

class ImageDocument {
    constructor(options) {
        this.scaling = options?.scaling || 1;
        this.cardMargin = options?.cardMargin || 0;
        this.borderMargin = options?.borderMargin || 5;
        this.pageFormat = options?.pageFormat || "A4";
        this.cropMarkShape = options?.cropMarkShape || CropMark.LINES;
        this.cropMarkColor = options?.cropMarkColor || 'white';
        this.cropMarkSize = options?.cropMarkSize || 5;
        this.cropMarkWidth = options?.cropMarkWidth || .5;

        this.images = [];
    }

    addImage(image) {
        this.images.push(image);
    }

    async create() {
        const pageOptions = { size: this.pageFormat };

        const doc = new PDFDocument(pageOptions);

        const mmToPt = 2.8346456693;

        const crossLength = this.crossSize * .5 * mmToPt;

        const pageHeight = doc.page.height;
        const pageWidth = doc.page.width;

        const margin = this.borderMargin * mmToPt;

        const mtgWidth = 63.5 * this.scaling * mmToPt;
        const mtgHeight = 88.9 * this.scaling * mmToPt;

        const xCnt = Math.floor((pageWidth - 2 * margin) / mtgWidth);
        const yCnt = Math.floor((pageHeight - 2 * margin) / mtgHeight);

        const marginX = (pageWidth - xCnt * mtgWidth) / 2;
        const marginY = (pageHeight - yCnt * mtgHeight) / 2;

        return new Promise(async resolve => {
            const stream = doc.pipe(blobStream());
            stream.on('finish', function () {
                const blob = stream.toBlob('application/pdf');
                const url = URL.createObjectURL(blob);

                if (lastUrl)
                    URL.revokeObjectURL(lastUrl);
                lastUrl = url;

                resolve(url);
            });

            var imgNr = 0;
            while (imgNr < this.images.length) {
                if (imgNr > 0)
                    doc.addPage(pageOptions);

                for (let y = 0, yPos = marginY; y < yCnt && imgNr < this.images.length; y++, yPos += mtgHeight) {
                    for (let x = 0, xPos = marginX; x < xCnt && imgNr < this.images.length; x++, xPos += mtgWidth, imgNr++) {
                        var image = new Image(await loadImage(this.images[imgNr]));
                        image.removeBackground();
                        var dataUrl = image.getDataUrl();

                        doc.image(dataUrl, xPos, yPos, { width: mtgWidth, height: mtgHeight });
                    }
                }

                let cl_2 = crossLength / 2;

                if (this.cropMarkShape != CropMark.NONE)
                    for (let y = 0, yPos = marginY; y <= yCnt; y++, yPos += mtgHeight) {
                        for (let x = 0, xPos = marginX; x <= xCnt; x++, xPos += mtgWidth) {
                            {
                                switch (this.cropMarkShape) {
                                    case CropMark.STAR:
                                        let inset = cl_2 * .9;
                                        let insetO = cl_2 - inset;
                                        doc.path(`M ${xPos - cl_2},${yPos} `
                                            + `c ${inset},${insetO} ${inset},${insetO} ${cl_2},${cl_2} `
                                            + `c ${insetO},-${inset} ${insetO},-${inset} ${cl_2},-${cl_2} `
                                            + `c -${inset},-${insetO} -${inset},-${insetO} -${cl_2},-${cl_2} `
                                            + `c -${insetO},${inset} -${insetO},${inset} -${cl_2},${cl_2} `
                                        )
                                            .lineWidth(0)
                                            .fillColor(this.cropMarkColor)
                                        doc.fill();
                                        break;
                                    case CropMark.LINES:
                                    default:
                                        doc.lineCap('round')
                                            .lineWidth(this.cropMarkWidth)
                                            .moveTo(xPos, yPos - crossLength).lineTo(xPos, yPos + crossLength)
                                            .moveTo(xPos - crossLength, yPos).lineTo(xPos + crossLength, yPos)
                                            .stroke(this.cropMarkColor);
                                        break;
                                }
                            }
                        }
                    }
            }
            doc.end();
        });
    }
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

export { ImageDocument, CropMark };

export default ImageDocument;