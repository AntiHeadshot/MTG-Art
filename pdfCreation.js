import getSettings from './printSettings.js';
import blobStream from './wrapper/blobStream.js';
import getDataUrl from './image.js';
import CropMark from './cropmark.js';

let lastUrl;

class ImageDocument {
    constructor(options) {
        this.options = options;

        this.images = [];
    }

    addImage(count, image) {
        this.images.push({ count, image });
    }

    async create(updateCallback) {
        let settings = getSettings(this.options);

        const doc = settings.doc;

        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async resolve => {
            const stream = settings.doc.pipe(blobStream());
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
                    doc.addPage(settings.pageOptions);

                for (let y = 0, yPos = settings.marginY; y < settings.yCnt && imgNr < imageIds.length; y++, yPos += settings.mtgHeight + settings.cardMargin) {
                    for (let x = 0, xPos = settings.marginX; x < settings.xCnt && imgNr < imageIds.length; x++, xPos += settings.mtgWidth + settings.cardMargin, imgNr++) {
                        updateCallback((imgNr) / maxStep);

                        let image = imageIds[imgNr];
                        if (lastImage != image) {
                            dataUrl = await getDataUrl(image);
                            lastImage = image;
                        }
                        doc.image(dataUrl, xPos, yPos, { width: settings.mtgWidth, height: settings.mtgHeight });
                    }
                }

                let cl_2 = settings.cropMarkSize / 2;

                if (settings.cropMarkShape != CropMark.NONE)
                    for (let y = 0, yPos = settings.marginY; y <= settings.yCnt; y++, yPos += settings.mtgHeight + settings.cardMargin) {
                        for (let x = 0, xPos = settings.marginX; x <= settings.xCnt; x++, xPos += settings.mtgWidth + settings.cardMargin) {
                            {
                                switch (settings.cropMarkShape) {
                                    case CropMark.STAR:
                                        {
                                            let inset = cl_2 * .9;
                                            let insetO = cl_2 - inset;
                                            doc.path(`M ${xPos - cl_2},${yPos} `
                                                + `c ${inset},${insetO} ${inset},${insetO} ${cl_2},${cl_2} `
                                                + `c ${insetO},-${inset} ${insetO},-${inset} ${cl_2},-${cl_2} `
                                                + `c -${inset},-${insetO} -${inset},-${insetO} -${cl_2},-${cl_2} `
                                                + `c -${insetO},${inset} -${insetO},${inset} -${cl_2},${cl_2} `
                                            )
                                                .lineWidth(0)
                                                .fillColor(settings.cropMarkColor)
                                            doc.fill();
                                        }
                                        break;
                                    case CropMark.LINES:
                                    default:
                                        doc.lineCap('round')
                                            .lineWidth(settings.cropMarkWidth)
                                            .moveTo(xPos, yPos - settings.cropMarkSize).lineTo(xPos, yPos + settings.cropMarkSize)
                                            .moveTo(xPos - settings.cropMarkSize, yPos).lineTo(xPos + settings.cropMarkSize, yPos)
                                            .stroke(settings.cropMarkColor);
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

export { ImageDocument };

export default ImageDocument;