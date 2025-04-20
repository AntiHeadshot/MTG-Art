import * as _ from 'https://cdn.jsdelivr.net/npm/pdfkit@0.16.0/js/pdfkit.standalone.js';
import getDataUrl from './image.js';
import CropMark from './cropmark.js';

let lastUrl;

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

    addImage(count, image) {
        this.images.push({ count, image });
    }

    async create(updateCallback) {
        const pageOptions = { size: this.pageFormat };

        const doc = new PDFDocument(pageOptions);

        const mmToPt = 2.8346456693;

        const cropMarkSize = this.cropMarkSize * .5 * mmToPt;

        const pageHeight = doc.page.height;
        const pageWidth = doc.page.width;

        const margin = this.borderMargin * mmToPt;
        const cardMargin = this.cardMargin * mmToPt;

        const mtgWidth = 63.5 * this.scaling * mmToPt;
        const mtgHeight = 88.9 * this.scaling * mmToPt;

        const adjustedMtgWidth = mtgWidth + cardMargin;
        const adjustedMtgHeight = mtgHeight + cardMargin;
        const xCnt = Math.floor((pageWidth - 2 * margin - mtgWidth) / adjustedMtgWidth) + 1;
        const yCnt = Math.floor((pageHeight - 2 * margin - mtgHeight) / adjustedMtgHeight) + 1;

        const marginX = (pageWidth - xCnt * adjustedMtgWidth + cardMargin) / 2;
        const marginY = (pageHeight - yCnt * adjustedMtgHeight + cardMargin) / 2;

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

            let imageIds = this.images.flatMap(img => Array(img.count).fill(img.image));
            var maxStep = imageIds.length;

            let lastImage = "";
            let dataUrl;

            while (imgNr < imageIds.length) {
                if (imgNr > 0)
                    doc.addPage(pageOptions);

                for (let y = 0, yPos = marginY; y < yCnt && imgNr < imageIds.length; y++, yPos += adjustedMtgHeight) {
                    for (let x = 0, xPos = marginX; x < xCnt && imgNr < imageIds.length; x++, xPos += adjustedMtgWidth, imgNr++) {
                        updateCallback((imgNr) / maxStep);

                        let image = imageIds[imgNr];
                        if (lastImage != image) {
                            dataUrl = await getDataUrl(image);
                            lastImage = image;
                        }
                        doc.image(dataUrl, xPos, yPos, { width: mtgWidth, height: mtgHeight });
                    }
                }

                let cl_2 = cropMarkSize / 2;

                if (this.cropMarkShape != CropMark.NONE)
                    for (let y = 0, yPos = marginY; y <= yCnt; y++, yPos += adjustedMtgHeight) {
                        for (let x = 0, xPos = marginX; x <= xCnt; x++, xPos += adjustedMtgWidth) {
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
                                            .moveTo(xPos, yPos - cropMarkSize).lineTo(xPos, yPos + cropMarkSize)
                                            .moveTo(xPos - cropMarkSize, yPos).lineTo(xPos + cropMarkSize, yPos)
                                            .stroke(this.cropMarkColor);
                                        break;
                                }
                            }
                        }
                    }
            }

            updateCallback(1);
            doc.end();
        });
    }
}

export { ImageDocument, CropMark };

export default ImageDocument;